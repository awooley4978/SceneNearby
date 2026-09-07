// ── Account deletion (App Review requirement) ──
// Permanently deletes a signed-in user's account and all associated user data,
// server-side and (via the app) client-side:
//   - Turso `photo_submissions` rows tied to the user (submitter_uid = uid, or
//     legacy rows whose user_info is the account email)
//   - Cloudflare R2 objects for those submissions (source + approved public copy)
//   - Firestore: entitlements/{uid}, photos (userId), visitorTips (userId)
//
// Identity is verified with a Firebase ID token (Authorization: Bearer <idToken>)
// so only the account owner can trigger their own deletion. We intentionally do
// NOT add firebase-admin; the token is verified with WebCrypto against Google's
// securetoken JWKS (RS256).

import type { Router } from "./router";
import { runQuery, esc } from "./db";
import { deletePhoto } from "./r2";
import { getAccessToken, isFirestoreEnabled } from "./research/firestore";

const FIREBASE_PROJECT = "scenenearby";
const JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const R2_PUBLIC_PREFIX = "https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

interface Jwk {
  kty?: string;
  alg?: string;
  use?: string;
  kid?: string;
  n?: string;
  e?: string;
}

let jwksCache: { jwks: Jwk[]; fetchedAt: number } | null = null;

function b64urlToBytes(s: string): ArrayBuffer {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  return Uint8Array.from(Buffer.from(b64 + pad, "base64")).buffer;
}

function b64urlToString(s: string): string {
  return Buffer.from(b64urlToBytes(s)).toString("utf8");
}

async function fetchJwks(): Promise<Jwk[]> {
  if (jwksCache && jwksCache.fetchedAt > Date.now() - 60 * 60 * 1000) {
    return jwksCache.jwks;
  }
  const res = await fetch(JWKS_URL, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  const data = (await res.json()) as { keys?: Jwk[] };
  const keys = data.keys ?? [];
  jwksCache = { jwks: keys, fetchedAt: Date.now() };
  return keys;
}

async function importRsaPublicKey(jwk: Jwk): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    {
      kty: "RSA",
      n: jwk.n!,
      e: jwk.e!,
      alg: "RS256",
      use: "sig",
      key_ops: ["verify"],
      ext: true,
    },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

/**
 * Verify a Firebase ID token without firebase-admin. Returns the decoded claims
 * on success, throws on any failure.
 */
async function verifyIdToken(token: string): Promise<{ uid: string; email: string | null }> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("malformed token");
  const [headerPart, payloadPart, signaturePart] = parts;

  const header = JSON.parse(b64urlToString(headerPart)) as { alg?: string; kid?: string };
  if (header.alg !== "RS256" || !header.kid) throw new Error("unsupported token alg/kid");

  const jwks = await fetchJwks();
  const jwk = jwks.find((k) => k.kid === header.kid);
  if (!jwk) {
    // kid not in cache — force refetch once
    jwksCache = null;
    const refreshed = await fetchJwks();
    const retry = refreshed.find((k) => k.kid === header.kid);
    if (!retry) throw new Error("unknown token kid");
    return verifyIdTokenWithJwk(token, retry);
  }
  return verifyIdTokenWithJwk(token, jwk);
}

async function verifyIdTokenWithJwk(token: string, jwk: Jwk): Promise<{ uid: string; email: string | null }> {
  const parts = token.split(".");
  const signingInput = `${parts[0]}.${parts[1]}`;
  const signature = b64urlToBytes(parts[2]);

  const key = await importRsaPublicKey(jwk);
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    signature,
    new TextEncoder().encode(signingInput),
  );
  if (!valid) throw new Error("invalid signature");

  const claims = JSON.parse(b64urlToString(parts[1])) as {
    iss?: string;
    aud?: string;
    exp?: number;
    iat?: number;
    sub?: string;
    email?: string | null;
  };
  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT}`) throw new Error("bad iss");
  if (claims.aud !== FIREBASE_PROJECT) throw new Error("bad aud");
  if (typeof claims.exp !== "number" || claims.exp <= now) throw new Error("token expired");
  if (typeof claims.iat !== "number" || claims.iat > now) throw new Error("bad iat");
  if (!claims.sub) throw new Error("missing sub");

  return { uid: claims.sub, email: claims.email ?? null };
}

/** List the R2 keys to delete for a submission row. */
function r2KeysFor(row: { photo_path: string | null; photo_public_url: string | null }): string[] {
  const keys: string[] = [];
  if (row.photo_path) keys.push(row.photo_path);
  if (row.photo_public_url && row.photo_public_url.startsWith(R2_PUBLIC_PREFIX + "/")) {
    keys.push(row.photo_public_url.slice(R2_PUBLIC_PREFIX.length + 1));
  }
  return keys;
}

interface SubmissionRow {
  id: string;
  photo_path: string | null;
  photo_public_url: string | null;
}

/** Delete Turso photo_submissions rows for a user. Returns the deleted rows for R2 cleanup. */
async function deleteSubmissionsForUser(uid: string, email: string | null): Promise<SubmissionRow[]> {
  // Select first (we need photo_path / photo_public_url to clean R2).
  const conditions: string[] = [`submitter_uid = ${esc(uid)}`];
  if (email) conditions.push(`lower(user_info) = lower(${esc(email)})`);
  const where = conditions.join(" OR ");
  const rows = (await runQuery(
    `SELECT id, photo_path, photo_public_url FROM photo_submissions WHERE ${where}`,
  )) as SubmissionRow[];

  if (rows.length > 0) {
    const ids = rows.map((r) => esc(r.id)).join(", ");
    await runQuery(`DELETE FROM photo_submissions WHERE id IN (${ids})`);
  }
  return rows;
}

async function deleteFirestoreDoc(path: string): Promise<void> {
  const token = await getAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents${path}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Firestore DELETE ${path} → ${res.status} ${await res.text()}`);
  }
}

/**
 * Delete all docs in a Firestore collection whose `field` equals `value`,
 * using a structured query (runQuery). Used for `photos` (userId) and the
 * "tips" subcollection docs (userId). Set `collectionGroup = true` when the
 * docs live in subcollections (e.g. "tips" under visitorTips/{locationId}).
 */
async function deleteDocsWhere(
  collectionId: string,
  field: string,
  value: string,
  collectionGroup = false,
): Promise<void> {
  const token = await getAccessToken();
  const base = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;
  const runUrl = `${base}:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId, allDescendants: collectionGroup }],
      where: {
        fieldFilter: {
          field: { fieldPath: field },
          op: "EQUAL",
          value: { stringValue: value },
        },
      },
      select: { fields: [{ fieldPath: "__name__" }] },
    },
  };

  // Page through results until empty.
  let pageToken: string | undefined;
  for (;;) {
    const res = await fetch(runUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(pageToken ? { structuredQuery: body.structuredQuery, pageToken } : body),
    });
    if (!res.ok) throw new Error(`Firestore runQuery ${collectionId} → ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { document?: any[]; nextPageToken?: string };
    const docs = data.document ?? [];
    for (const d of docs) {
      const name: string = d.name ?? "";
      // name is "projects/<p>/databases/(default)/documents/<collection>/<id>"
      const docPath = name.substring(name.indexOf("/documents/") + "/documents".length);
      await deleteFirestoreDoc(docPath);
    }
    pageToken = data.nextPageToken;
    if (!pageToken || docs.length === 0) break;
  }
}

export function registerAccountDeletionRoutes(router: Router): void {
  router.post("/api/account/delete", async (req) => {
    try {
      const authz = req.headers.get("authorization") || "";
      const match = authz.match(/^Bearer\s+(.+)$/i);
      if (!match) {
        return json({ error: "Missing bearer token" }, 401);
      }

      let claims: { uid: string; email: string | null };
      try {
        claims = await verifyIdToken(match[1].trim());
      } catch (err) {
        console.warn("Account deletion — token verification failed:", err);
        return json({ error: "Invalid or expired session. Please sign in again." }, 401);
      }

      const { uid, email } = claims;

      // 1. Turso submissions + R2 objects
      let rows: SubmissionRow[] = [];
      try {
        rows = await deleteSubmissionsForUser(uid, email);
      } catch (err) {
        console.error("Account deletion — Turso delete failed:", err);
        return json({ error: "Could not delete your submissions. Please try again." }, 500);
      }
      for (const row of rows) {
        for (const key of r2KeysFor(row)) {
          try {
            await deletePhoto(key);
          } catch (err) {
            console.warn(`Account deletion — R2 delete failed for ${key}:`, err);
          }
        }
      }

      // 2. Firestore user data (best-effort; do not fail the whole request on a
      //    single collection error — but surface clearly if the service account
      //    is missing).
      if (!isFirestoreEnabled()) {
        console.warn("Account deletion — FIREBASE_SERVICE_ACCOUNT not configured; Firestore data NOT deleted");
      } else {
        const firestoreOps: Array<() => Promise<void>> = [
          () => deleteFirestoreDoc(`/entitlements/${uid}`),
          () => deleteDocsWhere("photos", "userId", uid),
          () => deleteDocsWhere("tips", "userId", uid, true),
        ];
        for (const op of firestoreOps) {
          try {
            await op();
          } catch (err) {
            console.warn("Account deletion — Firestore delete failed:", err);
          }
        }
      }

      // NOTE: worthItVotes/{uid} and visitTimes/{uid} are subcollections keyed
      // BY uid under locations/{locationId}/ — they are deleted client-side by
      // the app using the locationIds it knows from local state. The app also
      // calls user.delete() (Firebase Auth) and clears local storage/Keychain.

      return json({ success: true });
    } catch (err) {
      console.error("Account deletion error:", err);
      return json({ error: "Internal server error during account deletion" }, 500);
    }
  });
}

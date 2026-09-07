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
  return (await runQuery(
    `SELECT id, photo_path, photo_public_url FROM photo_submissions WHERE ${where}`,
  )) as SubmissionRow[];
}

/** Delete the Turso rows whose ids are in `rows` (must be run AFTER R2 cleanup succeeds). */
async function deleteSubmissionRows(rows: SubmissionRow[]): Promise<void> {
  if (rows.length === 0) return;
  const ids = rows.map((r) => esc(r.id)).join(", ");
  await runQuery(`DELETE FROM photo_submissions WHERE id IN (${ids})`);
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
 *
 * The REST `runQuery` endpoint streams results as a JSON ARRAY of
 * RunQueryResponse objects (each `{ document: { name, fields }, readTime }`),
 * NOT a `{ document: [...], nextPageToken }` envelope — parse accordingly so
 * photos and collection-group tips are actually enumerated and deleted.
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

  const res = await fetch(runUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Firestore runQuery ${collectionId} → ${res.status} ${await res.text()}`);

  const results = (await res.json()) as Array<{ document?: { name?: string } }>;
  for (const item of Array.isArray(results) ? results : []) {
    const name = item?.document?.name ?? "";
    if (!name) continue;
    // name is "projects/<p>/databases/(default)/documents/<collection>/<id>"
    const docPath = name.substring(name.indexOf("/documents/") + "/documents".length);
    await deleteFirestoreDoc(docPath);
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

      // Deletion is a single logical transaction: we must NOT claim success while
      // any attributable user data remains. Each subsystem deletes what it can and
      // reports failure; the response is `success: true` only when every subsystem
      // that could run actually completed (or had nothing to delete).
      const failures: string[] = [];

      // ── 1. R2 objects FIRST (retry-safe): delete the stored objects BEFORE the
      //    Turso reference row, so a transient R2 failure leaves the row intact and
      //    the next attempt can retry. Only once every object is gone do we drop the
      //    Turso rows (which are the only pointer back to the keys).
      let rows: SubmissionRow[] = [];
      try {
        rows = await deleteSubmissionsForUser(uid, email);
        for (const row of rows) {
          for (const key of r2KeysFor(row)) {
            await deletePhoto(key);
          }
        }
      } catch (err) {
        console.error("Account deletion — R2/Turso select failed:", err);
        failures.push("photos");
      }

      // ── 2. Turso rows (only after their R2 objects are gone).
      if (!failures.includes("photos")) {
        try {
          await deleteSubmissionRows(rows);
        } catch (err) {
          console.error("Account deletion — Turso delete failed:", err);
          failures.push("submissions");
        }
      }

      // ── 3. Firestore user data.
      if (!isFirestoreEnabled()) {
        console.warn("Account deletion — FIREBASE_SERVICE_ACCOUNT not configured; Firestore data NOT deleted");
        failures.push("firestore");
      } else {
        const firestoreOps: Array<{ name: string; run: () => Promise<void> }> = [
          { name: "entitlements", run: () => deleteFirestoreDoc(`/entitlements/${uid}`) },
          { name: "photos", run: () => deleteDocsWhere("photos", "userId", uid) },
          { name: "tips", run: () => deleteDocsWhere("tips", "userId", uid, true) },
        ];
        for (const op of firestoreOps) {
          try {
            await op.run();
          } catch (err) {
            console.warn(`Account deletion — Firestore ${op.name} delete failed:`, err);
            failures.push(op.name);
          }
        }
      }

      // NOTE: worthItVotes/{uid} and visitTimes/{uid} are subcollections keyed
      // BY uid under locations/{locationId}/ — they are deleted client-side by
      // the app using the locationIds it knows from local state (defense in
      // depth against the server's Firestore pass). The app also calls
      // user.delete() (Firebase Auth) and clears local storage/Keychain.

      if (failures.length > 0) {
        return json(
          { success: false, retryable: true, error: `Some data could not be deleted (${failures.join(", ")}). Please try again.` },
          502,
        );
      }
      return json({ success: true });
    } catch (err) {
      console.error("Account deletion error:", err);
      return json({ error: "Internal server error during account deletion" }, 500);
    }
  });
}

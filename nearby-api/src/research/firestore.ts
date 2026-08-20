// ── Firestore writer for research_* collections ──
// Server-side writes to Firestore require a service account (rules deny
// anonymous writes — verified 2026-08-15). This module reads
// FIREBASE_SERVICE_ACCOUNT (JSON) from env and talks to the Firestore REST API
// directly (no SDK dependency). When the env var is absent, isEnabled() is
// false and the worker runs in DRY-RUN mode (results logged, nothing written).
//
// Firestore REST:
//   PATCH /v1/projects/{project}/databases/(default)/documents/{collection}/{id}
//   body: { fields: { ... } }  (with a single update via .updateMask)
//   Auth: Bearer OAuth2 token minted from the service account (JWT -> token).

const FIREBASE_PROJECT = "scenenearby";

function sa(): any | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isFirestoreEnabled(): boolean {
  return !!sa();
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const creds = sa();
  if (!creds) throw new Error("FIREBASE_SERVICE_ACCOUNT not configured");
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) return cachedToken.token;

  // Build a JWT (RS256) for the OAuth2 token endpoint.
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: creds.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const signingInput = `${b64(header)}.${b64(claim)}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(creds.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signingInput));
  const assertion = `${signingInput}.${Buffer.from(sig).toString("base64url")}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) throw new Error(`Token mint failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: now + (data.expires_in || 3600) };
  return data.access_token;
}

function pemToDer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN (?:RSA )?PRIVATE KEY-----/, "")
    .replace(/-----END (?:RSA )?PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  return Uint8Array.from(Buffer.from(body, "base64")).buffer;
}

function toFields(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string") out[k] = { stringValue: v };
    else if (typeof v === "boolean") out[k] = { booleanValue: v };
    else if (typeof v === "number") out[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    else out[k] = { stringValue: JSON.stringify(v) };
  }
  return out;
}

async function firestoreFetch(path: string, init: RequestInit = {}): Promise<any> {
  const token = await getAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Firestore ${init.method ?? "GET"} ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

/** Write/merge a document in a research_* collection (idempotent setDoc-like). */
export async function writeResearchDoc(collection: string, id: string, data: Record<string, unknown>): Promise<void> {
  const fields = toFields(data);
  const path = `/${collection}/${id}?updateMask.fieldPaths=`;
  // PATCH with all fields in the mask.
  const mask = Object.keys(fields)
    .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join("&");
  await firestoreFetch(`/${collection}/${id}?${mask}`, {
    method: "PATCH",
    body: JSON.stringify({ fields }),
  });
  void path;
}

/** Read all docs in a research_* collection (for dedupe). */
export async function readResearchCollection(collection: string, limit = 500): Promise<Record<string, any>[]> {
  const data = await firestoreFetch(`/${collection}?pageSize=${Math.min(limit, 300)}`);
  const docs = data.documents ?? [];
  return docs.map((d: any) => {
    const out: Record<string, any> = { id: d.name.split("/").pop() };
    for (const [k, v] of Object.entries(d.fields ?? {})) {
      const fv = v as any;
      if (fv.stringValue !== undefined) {
        // writeResearchDoc serializes nested objects/arrays via JSON.stringify
        // (see toFields). Round-trip them back here so structures like the
        // R28 verification attestation (an object with a `fields` array) come
        // back as real objects/arrays instead of opaque JSON strings — the gate
        // reads verification.fields directly. Plain strings are left untouched.
        const raw = fv.stringValue;
        if (raw && (raw.startsWith("{") || raw.startsWith("["))) {
          try {
            out[k] = JSON.parse(raw);
            continue;
          } catch {
            /* not JSON — fall through to plain string */
          }
        }
        out[k] = raw;
      } else if (fv.booleanValue !== undefined) out[k] = fv.booleanValue;
      else if (fv.integerValue !== undefined) out[k] = Number(fv.integerValue);
      else if (fv.doubleValue !== undefined) out[k] = fv.doubleValue;
      else if (fv.arrayValue) out[k] = fv.arrayValue.values?.map((x: any) => x.stringValue ?? x) ?? [];
      else out[k] = fv;
    }
    return out;
  });
}

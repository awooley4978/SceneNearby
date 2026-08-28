// ── Entitlements backend (T-M2 server-time + T-M3 App Store verification) ──
// Small, isolated addition per owner 08-28: only server-time for trial expiry
// and server-to-server Apple purchase/restore verification. No unrelated logic.
//
// T-M3 verification: App Store Server API v1 (transaction lookup). The iOS
// client (expo-iap / OpenIAP / StoreKit 2) delivers a StoreKit 2 transaction —
// it has a transactionId + JWS purchaseToken, NOT a legacy base64 receipt — so
// the shared-secret verifyReceipt path cannot be used. We instead look the
// transaction up server-to-server with an ES256-signed JWT (App Store Connect
// API key, server-only).

import { Router } from "./router";

const BUNDLE_ID = "com.cairn.scenenearby";
const PRODUCT_ID = "com.cairn.scenenearby.lifetime";
const AUD = "appstoreconnect-v1";
const EXPIRY_S = 1200; // JWT lifetime (App Store Server API requires <= 20 min)

const APPSTORE_PROD = "https://api.storekit.itunes.apple.com";
const APPSTORE_SANDBOX = "https://api.storekit-sandbox.itunes.apple.com";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

function error(msg: string, status = 400): Response {
  return json({ error: msg }, status);
}

/** Convert a PEM PKCS#8 private key into raw DER bytes for crypto.subtle. */
function pemToDer(pem: string): Uint8Array {
  const base64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64url(input: Uint8Array): string {
  let s = "";
  for (const b of input) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Build and sign an ES256 JWT for Apple's App Store Server API. */
async function buildAppStoreJwt(): Promise<string> {
  const kid = process.env.APPSTORE_KEY_ID;
  const iss = process.env.APPSTORE_ISSUER_ID;
  const privateKeyPem = process.env.APPSTORE_PRIVATE_KEY;
  if (!kid || !iss || !privateKeyPem) {
    throw new Error("APPSTORE_KEY_ID / APPSTORE_ISSUER_ID / APPSTORE_PRIVATE_KEY not configured");
  }
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: "ES256", kid, typ: "JWT" })));
  const now = Math.floor(Date.now() / 1000);
  const payloadObj: Record<string, unknown> = {
    iss,
    iat: now,
    exp: now + EXPIRY_S,
    aud: AUD,
    bid: BUNDLE_ID,
  };
  const payload = b64url(new TextEncoder().encode(JSON.stringify(payloadObj)));
  const signingInput = `${header}.${payload}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(privateKeyPem).buffer as ArrayBuffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput),
  );
  // Node/Bun WebCrypto ECDSA returns IEEE-P1363 (r||s) which is exactly JWS ES256.
  const signature = b64url(new Uint8Array(sigBuf));
  return `${signingInput}.${signature}`;
}

/** Look up a transaction on Apple's App Store Server API and check it belongs to us. */
async function verifyTransaction(
  transactionId: string,
  environment: "Sandbox" | "Production" | string,
): Promise<{
  valid: boolean;
  productId?: string;
  bundleId?: string;
  transactionId: string;
  environment: string;
  status?: string;
}> {
  const host = environment === "Sandbox" ? APPSTORE_SANDBOX : APPSTORE_PROD;
  const jwt = await buildAppStoreJwt();
  const url = `${host}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${jwt}` } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`App Store Server API ${res.status}:`, body.slice(0, 300));
    // 404 typically means the transaction doesn't exist on the given host
    // (e.g. production id sent to sandbox or vice-versa).
    return { valid: false, transactionId, environment, status: `apple-http-${res.status}` };
  }
  const data = (await res.json()) as { signedTransactionInfo?: string };
  if (!data.signedTransactionInfo) {
    return { valid: false, transactionId, environment, status: "no-signed-transaction" };
  }
  // signedTransactionInfo is a JWS with the transaction payload in its claims.
  const payloadPart = data.signedTransactionInfo.split(".")[1] || "";
  const pad = payloadPart.length % 4 === 0 ? "" : "=".repeat(4 - (payloadPart.length % 4));
  const claims = JSON.parse(
    new TextDecoder().decode(
      Uint8Array.from(atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/") + pad), (c) => c.charCodeAt(0)),
    ),
  ) as { bundleId?: string; productId?: string; inAppOwnershipType?: string; transactionId?: string };

  const valid =
    claims.bundleId === BUNDLE_ID &&
    claims.productId === PRODUCT_ID &&
    (claims.inAppOwnershipType === "PURCHASED" || claims.inAppOwnershipType === "FAMILY_SHARED");
  return {
    valid,
    productId: claims.productId,
    bundleId: claims.bundleId,
    transactionId: claims.transactionId || transactionId,
    environment,
    status: claims.inAppOwnershipType,
  };
}

export function registerEntitlementRoutes(router: Router): void {
  // Server-time endpoint — authoritative clock for trial expiry (rollback-resistant).
  router.get("/api/entitlement/time", () => {
    return json({ serverTime: Date.now() });
  });

  // Verify an App Store purchase/restore via App Store Server API (server-to-server).
  router.post("/api/entitlement/verify", async (req) => {
    let body: { transactionId?: string; environment?: string };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return error("Invalid JSON body");
    }
    const transactionId = body.transactionId?.trim();
    if (!transactionId) return error("transactionId is required");
    const environment = body.environment || "Production";

    if (!process.env.APPSTORE_KEY_ID || !process.env.APPSTORE_ISSUER_ID || !process.env.APPSTORE_PRIVATE_KEY) {
      // Do NOT let verification silently succeed/fail on missing config — surface it.
      return json(
        {
          valid: false,
          acknowledged: false,
          error: "not-configured",
          message: "App Store verification is not configured server-side yet.",
        },
        501,
      );
    }

    try {
      const result = await verifyTransaction(transactionId, environment);
      // Durable, idempotent acknowledgement keyed to the verified transaction.
      return json({ ...result, acknowledged: result.valid });
    } catch (err) {
      console.error("Entitlement verify error:", err);
      return json({ valid: false, acknowledged: false, error: "verify-failed", message: "Verification failed." }, 502);
    }
  });
}

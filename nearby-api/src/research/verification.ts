// ── Candidate validation & verification ──
// Owner directive (2026-08-19): the research worker is CANDIDATE DISCOVERY ONLY,
// not a trusted source. Nothing produced by the worker is considered usable until
// it passes an explicit human verification attestation. This module:
//   1. Defines which fields require independent verification before an add.
//   2. Records a verification attestation (who, when, which fields, from what source).
//   3. Scores each candidate against the required-field gate so the Admin UI and the
//      add path can both tell "usable" from "still discovery".
//
// A candidate becomes "user-ready" ONLY through recordVerification() — a single
// one-click Approve is no longer sufficient. add-to-production.ts enforces this at
// the choke point (the only route into live `locations`).
import { readResearchCollection, writeResearchDoc, isFirestoreEnabled } from "./firestore";

export const ADMIN_EMAILS = ["awooley4978@gmail.com", "scenenearbysupport@gmail.com"];

/** The concrete fields that must be independently verified before a worker-produced
 *  candidate may be added to production. Scene description / fun fact / photos are
 *  secondary (can be empty and the card still works with fallbacks); the identity +
 *  placement of the location is what MUST NOT come from a single worker source. */
export const REQUIRED_VERIFIED_FIELDS = [
  "name",            // the place actually exists and is named this
  "movie_or_show",   // the film/show is real and actually filmed here
  "year",            // year matches the production
  "coordinates",     // the pin is correct AND this is genuinely the filming site
  "address",         // a real street/venue address exists for it
] as const;

export type VerifiedField = (typeof REQUIRED_VERIFIED_FIELDS)[number];

export interface VerificationAttestation {
  verified_by: string;      // admin email who independently verified
  verified_at: string;      // ISO timestamp
  fields: VerifiedField[];  // which required fields were confirmed
  source: string;           // what was used to verify (URL / "Street View" / "on-site")
  note?: string;
}

/** Read a single candidate by id from the research collection. */
export async function getCandidate(id: string): Promise<Record<string, any> | null> {
  if (!isFirestoreEnabled()) return null;
  const cands = (await readResearchCollection("research_candidates", 500)) as Record<string, any>[];
  return cands.find((c) => c.id === id) ?? null;
}

/** True when the candidate carries a valid verification attestation covering ALL
 *  required fields. This is the gate "is this candidate usable?" */
export function hasValidVerification(candidate: Record<string, any>): boolean {
  const v = candidate?.verification as VerificationAttestation | undefined;
  if (!v) return false;
  if (!ADMIN_EMAILS.includes(v.verified_by)) return false;
  if (!v.verified_at) return false;
  const fields = Array.isArray(v.fields) ? v.fields : [];
  return REQUIRED_VERIFIED_FIELDS.every((f) => fields.includes(f));
}

/** Field-by-field report so the Admin UI can show exactly what still needs verifying. */
export function verificationReport(candidate: Record<string, any>): {
  fields: { field: VerifiedField; verified: boolean }[];
  overall: boolean;
  attestation: VerificationAttestation | null;
} {
  const v = candidate?.verification as VerificationAttestation | undefined;
  const fields = REQUIRED_VERIFIED_FIELDS.map((field) => ({
    field,
    verified: !!v && Array.isArray(v.fields) && v.fields.includes(field),
  }));
  return {
    fields,
    overall: fields.every((f) => f.verified) && !!v && ADMIN_EMAILS.includes(v.verified_by),
    attestation: v ?? null,
  };
}

/** Record (or update) a verification attestation on a candidate. Admin-gated.
 *  Persists to Firestore when enabled; otherwise returns the in-memory result
 *  for dry-run. */
export async function recordVerification(
  candidateId: string,
  verifiedBy: string,
  fields: VerifiedField[],
  source: string,
  note?: string,
): Promise<VerificationAttestation> {
  if (!ADMIN_EMAILS.includes(verifiedBy)) {
    throw new Error("Not authorized: verified_by must be an admin email");
  }
  const missing = REQUIRED_VERIFIED_FIELDS.filter((f) => !fields.includes(f));
  if (missing.length > 0) {
    throw new Error(`Verification must cover all required fields. Missing: ${missing.join(", ")}`);
  }
  if (!source || source.trim().length < 3) {
    throw new Error("Verification requires a source (what was used to verify)");
  }
  const attestation: VerificationAttestation = {
    verified_by: verifiedBy,
    verified_at: new Date().toISOString(),
    fields: [...new Set(fields)].filter((f) => (REQUIRED_VERIFIED_FIELDS as readonly string[]).includes(f)) as VerifiedField[],
    source: source.trim(),
    ...(note ? { note: note.trim() } : {}),
  };

  if (!isFirestoreEnabled()) {
    // Dry-run: no Firestore — just return the attestation (caller logs it).
    return attestation;
  }

  const candidate = await getCandidate(candidateId);
  if (!candidate) throw new Error("Candidate not found in research_candidates");

  await writeResearchDoc("research_candidates", candidateId, {
    verification: JSON.parse(JSON.stringify(attestation)),
    verification_status: "verified",
    verified_by: verifiedBy,
    verified_at: attestation.verified_at,
    updated_at: attestation.verified_at,
  });

  return attestation;
}

/** Clear a verification attestation (used when a human wants to re-review). */
export async function clearVerification(
  candidateId: string,
  verifiedBy: string,
): Promise<void> {
  if (!ADMIN_EMAILS.includes(verifiedBy)) {
    throw new Error("Not authorized: verified_by must be an admin email");
  }
  if (!isFirestoreEnabled()) return;
  const now = new Date().toISOString();
  await writeResearchDoc("research_candidates", candidateId, {
    verification: null,
    verification_status: "needs_research",
    verified_by: null,
    verified_at: null,
    updated_at: now,
  });
}

// ── Dedupe + confidence ──
// Duplicate detection: vs production Turso locations (210) and vs existing
// research candidates (Firestore when enabled; else skipped gracefully).
// Duplicates are FLAGGED, never auto-deleted — the owner decides.
import { runQuery } from "../db";
import { isFirestoreEnabled, readResearchCollection } from "./firestore";
import type { CandidateDraft, ResearchCandidate, ResearchConfig } from "./types";

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function fuzzyEq(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  // token overlap >= 70%
  const ta = na.split(" ");
  const tb = nb.split(" ");
  const overlap = ta.filter((t) => tb.includes(t)).length;
  return overlap / Math.max(ta.length, tb.length) >= 0.7;
}

export interface ProductionLocationLite {
  id: string;
  movie_or_show: string;
  title: string;
  city: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
}

/** Load production locations for dedupe (title + address/name + pin). */
export async function loadProductionLocations(): Promise<ProductionLocationLite[]> {
  const rows = (await runQuery(
    `SELECT id, movie_or_show, title, city, address, latitude, longitude FROM locations`
  )) as ProductionLocationLite[];
  return rows;
}

/** Haversine distance in meters (used for pin-based dedupe). */
function distMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Same-movie pin match within ~200m = the same location under a different name
 *  (e.g. "Randolph Street Station" vs production "Millennium Station"). */
const PIN_DUP_METERS = 200;

/** Check one candidate against production. Returns production id if dup. */
export function findProductionDuplicate(
  candidate: Pick<CandidateDraft, "name" | "city" | "address" | "coords">,
  movieTitle: string,
  production: ProductionLocationLite[]
): string | null {
  for (const p of production) {
    if (!fuzzyEq(p.movie_or_show, movieTitle)) continue;
    const nameHit = fuzzyEq(p.title, candidate.name);
    const addrHit = candidate.address && fuzzyEq(p.address, candidate.address);
    const cityHit = candidate.city && fuzzyEq(p.city, candidate.city);
    if (nameHit || addrHit || (cityHit && candidate.address && fuzzyEq(p.address ?? "", candidate.address))) {
      return p.id;
    }
    // Pin-based: same movie, coords within 200m, candidate not region-level.
    if (
      candidate.coords?.lat &&
      candidate.coords?.lng &&
      p.latitude != null &&
      p.longitude != null &&
      distMeters(candidate.coords.lat, candidate.coords.lng, p.latitude, p.longitude) <= PIN_DUP_METERS
    ) {
      return p.id;
    }
  }
  return null;
}

/** Load existing research candidates (Firestore) for cross-candidate dedupe. */
export async function loadResearchCandidates(): Promise<ResearchCandidate[]> {
  if (!isFirestoreEnabled()) return [];
  try {
    return (await readResearchCollection("research_candidates")) as ResearchCandidate[];
  } catch {
    return [];
  }
}

export function findCandidateDuplicate(
  candidate: Pick<CandidateDraft, "name" | "city">,
  existing: ResearchCandidate[]
): string | null {
  for (const c of existing) {
    if (fuzzyEq(c.name, candidate.name) || (candidate.city && fuzzyEq(c.city, candidate.city) && fuzzyEq(c.name, candidate.name))) {
      return c.id;
    }
  }
  return null;
}

// ── Confidence (0-100, heuristic, no LLM) ──
export function computeConfidence(args: {
  sourceCount: number;
  hasStructuredSource: boolean;
  hasTrustedSource?: boolean;
  hasCoords: boolean;
  hasAddress: boolean;
  hasUsablePhoto: boolean;
  duplicate: boolean;
  regionLevel?: boolean;
}): number {
  let score = 20; // base: a mention exists
  score += Math.min(args.sourceCount * 12, 36); // up to +36 for independent sources
  if (args.hasStructuredSource) score += 10; // Wikidata P915 / Wikipedia filming section / trusted reference
  if (args.hasTrustedSource) score += 10; // owner-designated trusted reference that supports the place
  if (args.hasCoords) score += 12;
  if (args.hasAddress) score += 10;
  if (args.hasUsablePhoto) score += 8;
  if (args.duplicate) score -= 15; // likely same place as existing record
  if (args.regionLevel) score = Math.min(score, 55); // city/region lead: never ready_for_review (>=75)
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Maximum confidence a candidate can reach given only Stage-1 evidence (before
 * geocode/photo). The remaining steps can add at most coords(12)+address(10)+
 * photo(8) = 30, and duplicate/region caps only ever LOWER a score, so ignoring
 * them yields a valid upper bound. */
export function computeUpperBound(args: {
  sourceCount: number;
  hasStructuredSource: boolean;
  hasTrustedSource?: boolean;
}): number {
  return (
    20 +
    Math.min(args.sourceCount * 12, 36) +
    (args.hasStructuredSource ? 10 : 0) +
    (args.hasTrustedSource ? 10 : 0) +
    30
  );
}

/** Derive the three source-based scoring inputs from a candidate's mentions.
 * Distinct corroborating sources are counted by the candidate's URL-deduped
 * sources list; structured = Wikidata P915, a Wikipedia "Filming" section, or a
 * trusted reference (i.e. any curated/structured source — loose prose/IMDb are
 * not structured); trusted = an owner-designated reference page. */
export function candidateSourceMetrics(c: CandidateDraft): {
  sourceCount: number;
  hasStructuredSource: boolean;
  hasTrustedSource: boolean;
} {
  const sourceCount = c.sources.length;
  const hasStructuredSource = c.mentions.some(
    (m) =>
      m.sourceKind === "wikidata" ||
      m.sourceKind === "wikipedia-section" ||
      m.sourceKind === "trusted-reference"
  );
  const hasTrustedSource = c.mentions.some((m) => m.sourceKind === "trusted-reference");
  return { sourceCount, hasStructuredSource, hasTrustedSource };
}

/** City/region-level detection: name geocoded to its own top-level admin area
 * (e.g. "Los Angeles" -> "Los Angeles, Los Angeles County, California"), and the
 * name itself is not a specific venue. Such candidates are LEADS for deeper
 * research, never ready-to-review locations. */
export function isRegionLevel(c: Pick<CandidateDraft, "name" | "address" | "coords">): boolean {
  if (!c.coords) return false;
  if (VENUE_WORDS.test(c.name)) return false;
  const addr = (c.address ?? "").toLowerCase();
  const name = c.name.toLowerCase();
  const first = addr.split(",")[0].trim();
  if (first !== name) return false;
  return /county|township|state|province|region|country|united states|china|canada|united kingdom|australia|india|japan|germany|france|spain|italy|mexico|brazil|russia|england|scotland|wales|ireland|netherlands|belgium|switzerland|austria|sweden|norway|denmark|finland|poland|ukraine|turkey|israel|uae|singapore|malaysia|thailand|vietnam|philippines|indonesia|south africa|egypt|nigeria|argentina|chile|colombia|peru/.test(addr);
}

const VENUE_WORDS =
  /\b(center|centre|building|bridge|pier|station|hotel|theatre|theater|arena|stadium|tower|hall|house|park|street|avenue|road|drive|boulevard|plaza|square|factory|studio(s)?|office|post office|courthouse|tunnel|airport|museum|library|church|cathedral|temple|mosque|mall|market|dock|harbou?r|plant|mill|warehouse|depot|terminal|loop|district|university|school|hospital|club|castle|palace|monastery|abbey|garden|island|beach|bay|lake|river|canyon|mountain|peak|valley|highway|freeway|interstate)\b/i;

export function photoUsable(p: { photo_use_status: string } | undefined): boolean {
  return !!p && (p.photo_use_status === "verified_reusable" || p.photo_use_status === "permission_required");
}

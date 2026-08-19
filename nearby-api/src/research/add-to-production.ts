// ── Add approved research candidate → production locations ──
// The EXPLICIT owner action. Two phases:
//   1) preview  — returns the exact production field mapping + live duplicate
//      scan against Turso. NO writes.
//   2) add      — re-validates everything, and if a possible duplicate exists
//      it STOPS and returns the match(es); the owner must pass force=true to
//      write anyway. Writes `locations` with provenance (source='research',
//      added_at, approved_by, research_candidate_id) and flags the candidate
//      in Firestore so it can't be added twice. Research record is retained
//      (never deleted) as the audit trail.
import { runQuery, esc } from "../db";
import { readResearchCollection, writeResearchDoc, isFirestoreEnabled } from "./firestore";

export const ADMIN_EMAILS = ["awooley4978@gmail.com", "scenenearbysupport@gmail.com"];
export const LOCATION_CATEGORIES = ["drama", "comedy", "sciFi", "action", "romance", "horror"];

export interface ProductionPreview {
  locationId: string;          // proposed id
  title: string;
  movieOrShow: string;
  year: number;
  isMovie: boolean;            // true = movie, false = show
  category: string;
  city: string;                // metro grouping
  country: string;
  address: string;
  latitude: number;
  longitude: number;
  sceneDescription: string;
  funFact: string;
  actors: string[];
  imageUrl: string | null;     // selected Commons photo URL
  photoMeta: { license: string | null; creator: string | null; sourceUrl: string | null } | null;
  sourceCount: number;         // research sources retained for provenance
  warnings: string[];
  candidateId: string;
}

export interface DuplicateMatch {
  id: string;
  title: string;
  movieOrShow: string;
  city: string;
  address: string;
  confidence: "high" | "possible";
  reasons: string[];
}

export interface AddResult extends ProductionPreview {
  addedAt: string;
  source: "research";
  approvedBy: string;
}

// ── Helpers ──
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

/** Best-effort city/country from candidate fields or the Nominatim address. */
function deriveCityCountry(candidate: Record<string, any>): { city: string; country: string } {
  const addr = String(candidate.proposed_address ?? "").trim();
  const parts = addr.split(",").map((s: string) => s.trim()).filter(Boolean);
  const city = String(candidate.city ?? "").trim() || (parts[0] ?? "");
  let country = String(candidate.country ?? "").trim();
  if (!country && parts.length > 1) {
    const last = parts[parts.length - 1];
    if (!/^\d{4,6}$/.test(last) && !/^[A-Z]{2}$/.test(last)) country = last;
    else if (parts.length > 2 && !/^\d{4,6}$/.test(parts[parts.length - 2])) country = parts[parts.length - 2];
  }
  return { city, country };
}

/** Next id for a city prefix: {prefix}-{NNN}, e.g. atl-211, edm-002. */
async function nextLocationId(prefix: string): Promise<string> {
  const safePrefix = (prefix || "loc").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4) || "loc";
  const rows = (await runQuery(
    `SELECT id FROM locations WHERE id LIKE ${esc(`${safePrefix}-%`)}`
  )) as { id: string }[];
  let max = 0;
  for (const r of rows) {
    const m = /-(\d+)[a-z]?$/.exec(r.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${safePrefix}-${String(max + 1).padStart(3, "0")}`;
}

/** Live duplicate scan against production Turso. */
async function findDuplicates(preview: ProductionPreview): Promise<DuplicateMatch[]> {
  const titleNorm = norm(preview.title);
  const movieNorm = norm(preview.movieOrShow);
  const rows = (await runQuery(
    `SELECT id, title, movie_or_show, city, address FROM locations WHERE added_at IS NOT NULL OR source IS NOT NULL`
  )) as { id: string; title: string; movie_or_show: string; city: string; address: string }[];
  const matches: DuplicateMatch[] = [];
  for (const r of rows) {
    const reasons: string[] = [];
    const tNorm = norm(r.title);
    const mNorm = norm(r.movie_or_show);
    if (tNorm === titleNorm && mNorm === movieNorm) reasons.push("same name and same movie/show");
    else if (tNorm === titleNorm) reasons.push("same name (different movie/show)");
    else if (mNorm === movieNorm && (tNorm.includes(titleNorm) || titleNorm.includes(tNorm)) && titleNorm.length >= 4)
      reasons.push("similar name within same movie/show");
    if (reasons.length === 0) continue;
    matches.push({
      id: r.id,
      title: r.title,
      movieOrShow: r.movie_or_show,
      city: r.city ?? "",
      address: r.address ?? "",
      confidence: tNorm === titleNorm && mNorm === movieNorm ? "high" : "possible",
      reasons,
    });
  }
  return matches.slice(0, 10);
}

async function buildPreview(
  candidateId: string,
  category: string,
): Promise<ProductionPreview> {
  if (!isFirestoreEnabled()) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT not configured — cannot read candidates");
  }
  const cands = (await readResearchCollection("research_candidates", 500)) as Record<string, any>[];
  const candidate = cands.find((c) => c.id === candidateId);
  if (!candidate) throw new Error("Candidate not found in research_candidates");

  const lat = Number(candidate.latitude ?? 0);
  const lng = Number(candidate.longitude ?? 0);
  const { city, country } = deriveCityCountry(candidate);

  // Movie type → is_movie.
  let typeIsMovie = 0;
  const movieId = String(candidate.movie_id ?? "");
  if (movieId) {
    const movies = (await readResearchCollection("research_movies", 100)) as Record<string, any>[];
    const movie = movies.find((m) => m.id === movieId);
    if (movie) typeIsMovie = movie.type === "movie" ? 1 : 0;
  }

  // Selected photo: first verified_reusable Commons photo (attribution preserved in meta).
  const photos = (await readResearchCollection("research_photo_candidates", 500)) as Record<string, any>[];
  const candPhotos = photos.filter((p) => p.candidate_id === candidateId);
  const best = candPhotos.find((p) => p.photo_use_status === "verified_reusable")
    ?? candPhotos.find((p) => p.photo_use_status === "permission_required")
    ?? candPhotos[0];
  const photoMeta = best
    ? { license: best.license ?? null, creator: best.creator ?? null, sourceUrl: best.source_url ?? null }
    : null;

  // Research sources retained for provenance (never deleted).
  const sources = (await readResearchCollection("research_sources", 500)) as Record<string, any>[];
  const sourceCount = sources.filter((s) => s.candidate_id === candidateId).length;

  const warnings: string[] = [];
  if (!String(candidate.scene_description ?? "").trim()) warnings.push("scene_description is empty — card will show blank prose");
  if (!String(candidate.fun_fact ?? "").trim()) warnings.push("fun_fact is empty — card will show blank trivia");
  if (!city) warnings.push("city could not be derived — metro grouping will be empty");
  if (!country) warnings.push("country could not be derived");
  if (typeIsMovie === 0 && !movieId) warnings.push("movie type unknown — defaults to TV show");
  if (!best) warnings.push("no reusable photo found — card will use the app's fallback image");

  return {
    locationId: await nextLocationId(city),
    title: String(candidate.name ?? ""),
    movieOrShow: String(candidate.movie_or_show ?? ""),
    year: Number(candidate.year ?? 0),
    isMovie: typeIsMovie === 1,
    category,
    city,
    country,
    address: String(candidate.proposed_address ?? ""),
    latitude: lat,
    longitude: lng,
    sceneDescription: String(candidate.scene_description ?? ""),
    funFact: String(candidate.fun_fact ?? ""),
    actors: [],
    imageUrl: best?.url ?? null,
    photoMeta,
    sourceCount,
    warnings,
    candidateId,
  };
}

/** Phase 1 — read-only preview: fields + live duplicate scan. No writes. */
export async function previewCandidate(
  candidateId: string,
  approvedBy: string,
  category = "drama",
): Promise<{ preview: ProductionPreview; duplicates: DuplicateMatch[] }> {
  if (!ADMIN_EMAILS.includes(approvedBy)) {
    throw new Error("Not authorized: approved_by must be an admin email");
  }
  if (!LOCATION_CATEGORIES.includes(category)) {
    throw new Error(`category must be one of: ${LOCATION_CATEGORIES.join(", ")}`);
  }
  const cands = (await readResearchCollection("research_candidates", 500)) as Record<string, any>[];
  const candidate = cands.find((c) => c.id === candidateId);
  if (!candidate) throw new Error("Candidate not found in research_candidates");
  if (candidate.verification_status !== "approved") {
    throw new Error(`Candidate is '${candidate.verification_status}' — only approved candidates can be added`);
  }
  const preview = await buildPreview(candidateId, category);
  const duplicates = await findDuplicates(preview);
  return { preview, duplicates };
}

/** Phase 2 — explicit write. Stops on duplicate unless force=true. */
export async function addCandidateToProduction(
  candidateId: string,
  approvedBy: string,
  category = "drama",
  force = false,
): Promise<AddResult> {
  if (!ADMIN_EMAILS.includes(approvedBy)) {
    throw new Error("Not authorized: approved_by must be an admin email");
  }
  if (!LOCATION_CATEGORIES.includes(category)) {
    throw new Error(`category must be one of: ${LOCATION_CATEGORIES.join(", ")}`);
  }
  const cands = (await readResearchCollection("research_candidates", 500)) as Record<string, any>[];
  const candidate = cands.find((c) => c.id === candidateId);
  if (!candidate) throw new Error("Candidate not found in research_candidates");
  if (candidate.verification_status !== "approved") {
    throw new Error(`Candidate is '${candidate.verification_status}' — only approved candidates can be added`);
  }
  if (candidate.region_level === true) {
    throw new Error("Region-level candidates cannot be added — they are not specific filming locations");
  }
  const lat = Number(candidate.latitude ?? 0);
  const lng = Number(candidate.longitude ?? 0);
  if (!lat || !lng) {
    throw new Error("Candidate has no pinned coordinates (NO-PIN) — geocode it first");
  }
  if (candidate.added_to_production) {
    throw new Error(`Already added to production as ${candidate.production_location_id ?? "?"}`);
  }

  const preview = await buildPreview(candidateId, category);
  const duplicates = await findDuplicates(preview);
  if (duplicates.length > 0 && !force) {
    const err = new Error("Possible duplicate(s) found in production — add stopped for review") as Error & { duplicates?: DuplicateMatch[] };
    err.duplicates = duplicates;
    throw err;
  }

  const addedAt = new Date().toISOString();
  const sql = `INSERT INTO locations (
    id, title, movie_or_show, year, category, latitude, longitude, address, city, country,
    scene_description, fun_fact, quote, quote_attribution, then_and_now, is_movie, image_url,
    focal_point_x, focal_point_y, remote_destination_json, actors_json, estimated_visit_time,
    worth_it_percentage, worth_it_votes, added_at, source, approved_by, research_candidate_id
  ) VALUES (
    ${esc(preview.locationId)}, ${esc(preview.title)}, ${esc(preview.movieOrShow)}, ${preview.year},
    ${esc(category)}, ${lat}, ${lng}, ${esc(preview.address)}, ${esc(preview.city)}, ${esc(preview.country)},
    ${esc(preview.sceneDescription)}, ${esc(preview.funFact)}, NULL, NULL, NULL, ${preview.isMovie ? 1 : 0}, ${esc(preview.imageUrl)},
    NULL, NULL, NULL, '[]', NULL, NULL, NULL,
    ${esc(addedAt)}, 'research', ${esc(approvedBy)}, ${esc(candidateId)}
  )`;
  await runQuery(sql);

  // Mark the candidate as added (provenance on the research side too). The
  // candidate + sources + photos are RETAINED — this is the audit trail.
  try {
    await writeResearchDoc("research_candidates", candidateId, {
      added_to_production: true,
      production_location_id: preview.locationId,
      added_at: addedAt,
      approved_by: approvedBy,
      updated_at: addedAt,
    });
  } catch (err) {
    console.warn("[research-add] candidate flag failed (location WAS inserted):", err);
    preview.warnings.push("location inserted but candidate flag failed — check Firestore");
  }

  return { ...preview, addedAt, source: "research", approvedBy };
}

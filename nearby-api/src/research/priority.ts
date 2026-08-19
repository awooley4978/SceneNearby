// ── Priority Requests (override queue) ──
// Owner-directed (2026-08-17): a queue of requested movies/cities/states/provinces
// that the research worker checks BEFORE normal queued jobs. While any request is
// open/in_progress the worker pauses normal content generation and works the
// highest-priority request until its minimum coverage target is met, then moves
// to the next, then resumes the normal backlog.
//
// Semantics:
//   - kind: 'movie' | 'city' | 'state' | 'province'
//   - coverage target = number of research candidates PRODUCED for the request
//     (the pipeline never writes production; "Add to Scene Nearby" stays an
//     explicit owner action — the existing guardrail).
//   - repeated requests (same kind+value) raise priority and request_count, and
//     reopen a completed request.
//   - status: open -> in_progress (claimed by worker) -> completed | blocked
//     (blocked = region film list exhausted before target; admin can reopen).
//   - single-flight: the worker's `running` flag + the open->in_progress claim
//     keep one pass in flight.
import { runQuery, esc } from "../db";
import { resolveTitle, mentionsFromResolved, isVenueName, isProseFragment } from "./discovery";
import { geocode } from "./nominatim";
import { findCommonsPhotos } from "./commons";
import {
  loadProductionLocations,
  findProductionDuplicate,
  loadResearchCandidates,
  findCandidateDuplicate,
  computeConfidence,
  isRegionLevel,
  photoUsable,
} from "./dedupe";
import { isFirestoreEnabled, writeResearchDoc } from "./firestore";
import { getDailyJobCount, incrementDailyJobCount } from "./config";
import type { CandidateDraft, ResearchConfig, ResearchPhotoCandidate, ResearchSource, RawLocationMention } from "./types";

const TABLE = "priority_requests";

export type PriorityKind = "movie" | "city" | "state" | "province";
export type PriorityStatus = "open" | "in_progress" | "completed" | "blocked";

export interface PriorityRequest {
  id: string;
  kind: PriorityKind;
  value: string;
  priority: number;
  request_count: number;
  target: number;
  status: PriorityStatus;
  candidates_produced: number;
  films_list_json: string | null;
  films_done: number;
  last_error: string | null;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  created_by: string;
  /** How completion happened: 'auto' = coverage target reached by the worker;
   *  'manual' = admin hit "Mark done" (does NOT imply the target was achieved). */
  completion_type: "auto" | "manual" | null;
}

// 50 US states + DC abbreviations (used to validate geocoded pins vs the requested state).
const STATE_ABBREV: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO",
  connecticut: "CT", delaware: "DE", "district of columbia": "DC", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS",
  kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD", massachusetts: "MA",
  michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT",
  nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM",
  "new york": "NY", "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
  oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
};

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "item";
}

async function ensureTable(): Promise<void> {
  await runQuery(
    `CREATE TABLE IF NOT EXISTS ${TABLE} (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      value TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 1,
      request_count INTEGER NOT NULL DEFAULT 1,
      target INTEGER NOT NULL DEFAULT 10,
      status TEXT NOT NULL DEFAULT 'open',
      candidates_produced INTEGER NOT NULL DEFAULT 0,
      films_list_json TEXT,
      films_done INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      last_run_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      created_by TEXT NOT NULL DEFAULT 'admin',
      completion_type TEXT
    )`
  );
  // Migration: add completion_type if the table predates it (safe to ignore if present).
  try {
    await runQuery(`ALTER TABLE ${TABLE} ADD COLUMN completion_type TEXT`);
  } catch {
    /* column already exists */
  }
}

function rowToPr(row: Record<string, unknown>): PriorityRequest {
  return {
    id: String(row.id),
    kind: row.kind as PriorityKind,
    value: String(row.value),
    priority: Number(row.priority ?? 1),
    request_count: Number(row.request_count ?? 1),
    target: Number(row.target ?? 10),
    status: row.status as PriorityStatus,
    candidates_produced: Number(row.candidates_produced ?? 0),
    films_list_json: row.films_list_json ? String(row.films_list_json) : null,
    films_done: Number(row.films_done ?? 0),
    last_error: row.last_error ? String(row.last_error) : null,
    last_run_at: row.last_run_at ? String(row.last_run_at) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    completed_at: row.completed_at ? String(row.completed_at) : null,
    created_by: String(row.created_by ?? "admin"),
    completion_type:
      row.completion_type === "manual" || row.completion_type === "auto" ? (row.completion_type as "auto" | "manual") : null,
  };
}

// ── CRUD ──
export async function listPriorityRequests(): Promise<PriorityRequest[]> {
  await ensureTable();
  const rows = (await runQuery(
    `SELECT * FROM ${TABLE} ORDER BY status IN ('in_progress','open') DESC, priority DESC, created_at ASC`
  )) as Record<string, unknown>[];
  return rows.map(rowToPr);
}

export async function getPriorityRequest(id: string): Promise<PriorityRequest | null> {
  await ensureTable();
  const rows = (await runQuery(
    `SELECT * FROM ${TABLE} WHERE id = ${esc(id)}`
  )) as Record<string, unknown>[];
  return rows.length > 0 ? rowToPr(rows[0]) : null;
}

/** Create a request, or treat it as a REPEAT (count+1, priority+1, reopen). */
export async function createPriorityRequest(input: {
  kind: PriorityKind;
  value: string;
  priority?: number;
  target?: number;
  created_by?: string;
}): Promise<{ created: boolean; request: PriorityRequest }> {
  await ensureTable();
  const kind = input.kind;
  const value = input.value.trim();
  const valueLower = value.toLowerCase();
  const rows = (await runQuery(`SELECT * FROM ${TABLE}`)) as Record<string, unknown>[];
  const existing = rows.find((r) => String(r.kind) === kind && String(r.value).toLowerCase() === valueLower);
  if (existing) {
    // Repeated request: raise priority + count, reopen completed/blocked rows.
    const now = new Date().toISOString();
    await runQuery(
      `UPDATE ${TABLE} SET request_count = request_count + 1, priority = priority + 1,
       status = 'open', completed_at = NULL, completion_type = NULL, updated_at = ${esc(now)} WHERE id = ${esc(String(existing.id))}`
    );
    const request = await getPriorityRequest(String(existing.id));
    return { created: false, request: request! };
  }
  const id = `${kind}-${slugify(value)}`;
  const now = new Date().toISOString();
  const priority = Math.max(1, Number(input.priority) || 1);
  const target = Math.max(1, Number(input.target) || 10);
  await runQuery(
    `INSERT INTO ${TABLE} (id, kind, value, priority, request_count, target, status, candidates_produced, films_done, created_at, updated_at, created_by)
     VALUES (${esc(id)}, ${esc(kind)}, ${esc(value)}, ${priority}, 1, ${target}, 'open', 0, 0, ${esc(now)}, ${esc(now)}, ${esc(input.created_by ?? "admin")})`
  );
  const request = await getPriorityRequest(id);
  return { created: true, request: request! };
}

export async function incrementPriorityRequest(id: string): Promise<PriorityRequest | null> {
  await ensureTable();
  const pr = await getPriorityRequest(id);
  if (!pr) return null;
  const now = new Date().toISOString();
  await runQuery(
    `UPDATE ${TABLE} SET request_count = request_count + 1, priority = priority + 1,
     status = 'open', completed_at = NULL, completion_type = NULL, updated_at = ${esc(now)} WHERE id = ${esc(id)}`
  );
  return getPriorityRequest(id);
}

export async function updatePriorityRequest(
  id: string,
  patch: { status?: PriorityStatus; priority?: number; target?: number }
): Promise<PriorityRequest | null> {
  await ensureTable();
  const pr = await getPriorityRequest(id);
  if (!pr) return null;
  const sets: string[] = [`updated_at = ${esc(new Date().toISOString())}`];
  if (patch.status !== undefined) {
    sets.push(`status = ${esc(patch.status)}`);
    if (patch.status === "open" || patch.status === "in_progress") {
      sets.push(`completed_at = NULL`);
      sets.push(`completion_type = NULL`);
    }
    if (patch.status === "completed") {
      sets.push(`completed_at = ${esc(new Date().toISOString())}`);
      // Admin "Mark done" is a MANUAL completion — it never claims the coverage
      // target was reached. completion_type distinguishes it from auto-complete.
      sets.push(`completion_type = 'manual'`);
    }
    if (patch.status === "blocked") sets.push(`completion_type = NULL`);
  }
  if (patch.priority !== undefined && Number.isInteger(patch.priority)) {
    sets.push(`priority = ${Math.max(1, patch.priority)}`);
  }
  if (patch.target !== undefined && Number.isInteger(patch.target)) {
    sets.push(`target = ${Math.max(1, patch.target)}`);
  }
  await runQuery(`UPDATE ${TABLE} SET ${sets.join(", ")} WHERE id = ${esc(id)}`);
  return getPriorityRequest(id);
}

export async function deletePriorityRequest(id: string): Promise<boolean> {
  await ensureTable();
  await runQuery(`DELETE FROM ${TABLE} WHERE id = ${esc(id)}`);
  return (await getPriorityRequest(id)) === null;
}

/** Worker claim: top open/in_progress request (priority desc, oldest first).
 *  open->in_progress uses a conditional UPDATE + re-read so two hosts (sandbox
 *  rollback mirror + Fly) can never BOTH start the same request in one tick. */
export async function claimNextPriorityRequest(): Promise<PriorityRequest | null> {
  await ensureTable();
  const rows = (await runQuery(
    `SELECT * FROM ${TABLE} WHERE status IN ('open','in_progress') ORDER BY priority DESC, created_at ASC LIMIT 1`
  )) as Record<string, unknown>[];
  if (rows.length === 0) return null;
  const pr = rowToPr(rows[0]);
  if (pr.status === "open") {
    const now = new Date().toISOString();
    await runQuery(
      `UPDATE ${TABLE} SET status = 'in_progress', updated_at = ${esc(now)} WHERE id = ${esc(pr.id)} AND status = 'open'`
    );
    const after = await getPriorityRequest(pr.id);
    // Lost the claim (other host flipped it first) or a stale read — skip.
    if (!after || after.status !== "in_progress" || after.updated_at !== now) return null;
    return after;
  }
  return pr; // in_progress: keep working it (candidate IDs are deterministic, so
  // concurrent passes across hosts write identical docs — no duplicate candidates).
}

// ── Region -> film discovery (Wikipedia category members) ──
async function discoverRegionFilms(kind: PriorityKind, value: string): Promise<string[]> {
  const cats =
    kind === "state" || kind === "province"
      ? [`Category:Films shot in ${value}`, `Category:Films set in ${value}`]
      : [`Category:Films shot in ${value}`, `Category:Films set in ${value}`];
  for (const cat of cats) {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent(
      cat
    )}&cmlimit=50&format=json&formatversion=2`;
    const res = await fetch(url, { headers: { "User-Agent": "SceneNearbyResearch/1.0 (research pipeline; contact: scenenearbysupport@gmail.com)" } });
    if (!res.ok) continue;
    const data = (await res.json()) as { query?: { categorymembers?: { title: string }[] } };
    const members = data.query?.categorymembers ?? [];
    const titles = members
      .filter((m) => !m.title.startsWith("Category:"))
      .map((m) => m.title)
      .filter((t) => /\((\d{4}|TV|film|series)/i.test(t) || !t.includes("("));
    if (titles.length > 0) return titles;
  }
  return [];
}

function parseFilmTitle(title: string): { title: string; year: number; type: "movie" | "show" } {
  const m = title.match(/\((\d{4})(?: film| television film| TV miniseries| miniseries| TV series| series)?\)$/i);
  const year = m ? parseInt(m[1], 10) : 0;
  const type: "movie" | "show" = /series|miniseries|TV film/i.test(title) ? "show" : "movie";
  return { title: title.replace(/\s*\(\d{4}.*\)$/i, "").trim(), year, type };
}

// ── Candidate pipeline (tailored for priority work; the normal job pipeline in
//    worker.ts is untouched — this module never writes research_jobs) ──
function normalizeMentions(mentions: RawLocationMention[]): CandidateDraft[] {
  const byName = new Map<string, CandidateDraft>();
  for (const m of mentions) {
    const key = m.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key || key.length < 2) continue;
    let c = byName.get(key);
    if (!c) {
      c = {
        name: m.name,
        mentions: [],
        coords: m.coords,
        address: m.addressHint,
        city: m.cityHint,
        country: m.countryHint,
        confidence: 0,
        sources: [],
        photos: [],
      };
      byName.set(key, c);
    }
    c.mentions.push(m);
    if (m.sourceUrl && !c.sources.some((s) => s.url === m.sourceUrl)) {
      c.sources.push({ url: m.sourceUrl, title: m.sourceTitle, kind: m.sourceKind, note: m.note } as ResearchSource);
    }
    if (!c.address && m.addressHint) c.address = m.addressHint;
    if (!c.coords && m.coords) c.coords = m.coords;
  }
  return [...byName.values()];
}

function coordsMatchRegion(display: string, address: string | undefined, city: string | undefined, region: string): boolean {
  const hay = `${display} ${address ?? ""} ${city ?? ""}`.toLowerCase();
  const v = region.toLowerCase();
  if (hay.includes(v)) return true;
  const abbrev = STATE_ABBREV[v];
  if (abbrev && new RegExp(`\\b${abbrev.toLowerCase()}\\b`).test(hay)) return true;
  return false;
}

async function runFilmPipeline(
  film: { title: string; year: number; type: "movie" | "show" },
  pr: PriorityRequest,
  cfg: ResearchConfig,
  regionContext: string | null
): Promise<number> {
  const resolved = await resolveTitle(film.title, film.year, film.type);
  if (!resolved.wikidataId && resolved.filmingLocations.length === 0) {
    console.log(`[priority-worker] ${pr.id}: could not resolve "${film.title}"`);
    return 0;
  }
  let mentions = mentionsFromResolved(resolved).slice(0, cfg.wikipedia_max_candidates);
  mentions = mentions.filter((m) => !isProseFragment(m.name));
  const candidates = normalizeMentions(mentions);

  // Geocode (bounded); venue names get "<name>, <region>" context first.
  let geocoded = 0;
  const displayByCand = new Map<CandidateDraft, string>();
  for (const c of candidates) {
    if (geocoded >= cfg.max_geocode_attempts_per_job) break;
    if (c.coords?.lat && c.coords?.lng) continue;
    const plain = [c.address, c.city, c.name].filter(Boolean).join(", ");
    const variants: string[] = [];
    if (regionContext && isVenueName(c.name)) variants.push(`${c.name}, ${regionContext}`);
    variants.push(plain);
    for (const q of [...new Set(variants)]) {
      const geo = await geocode(q, cfg);
      if (geo) {
        c.coords = { lat: geo.lat, lng: geo.lng };
        displayByCand.set(c, geo.displayName ?? "");
        if (!c.address && geo.displayName) c.address = geo.displayName;
        geocoded++;
        break;
      }
    }
  }

  // Region gate for state/province/city requests: a pin outside the requested
  // region keeps its address but drops coords (needs_research), never deleted.
  if (regionContext) {
    for (const c of candidates) {
      if (c.coords && !coordsMatchRegion(displayByCand.get(c) ?? "", c.address, c.city, regionContext)) {
        c.geocodeContextMismatch = true;
        c.coords = undefined;
        c.researchNote = `Pin fell outside requested region "${regionContext}" — coords dropped, needs research.`;
      }
    }
  }

  const leads = candidates.filter((c) => isRegionLevel(c));
  const specific = candidates.filter((c) => !isRegionLevel(c));

  // Photos (Commons, bounded).
  for (const c of specific) {
    c.photos = (await findCommonsPhotos(c.name, cfg)).slice(0, cfg.max_photos_per_candidate);
  }

  // Dedupe vs production + existing candidates.
  const production = await loadProductionLocations();
  const existing = await loadResearchCandidates();
  let dups = 0;
  for (const c of specific) {
    const confArgs = {
      sourceCount: c.mentions.length,
      hasStructuredSource: true,
      hasCoords: !!c.coords,
      hasAddress: !!c.address,
      hasUsablePhoto: photoUsable(c.photos[0]),
      duplicate: false,
      regionLevel: false,
    };
    const prodDup = findProductionDuplicate(c, resolved.title, production);
    if (prodDup) {
      c.duplicateOfProduction = prodDup;
      c.confidence = computeConfidence({ ...confArgs, duplicate: true });
      dups++;
      continue;
    }
    const candDup = findCandidateDuplicate(c, existing);
    if (candDup) {
      c.duplicateOfCandidate = candDup;
      c.confidence = computeConfidence({ ...confArgs, duplicate: true });
      dups++;
      continue;
    }
    c.confidence = computeConfidence(confArgs);
  }

  const res = await writePriorityCandidates(pr, resolved, specific);
  console.log(
    `[priority-worker] ${pr.id} "${resolved.title}" (${resolved.year}): ${specific.length} specific + ${leads.length} leads, ${dups} dups, ${res.written} written (${res.inTarget} in-target)`
  );
  // Coverage for geographic requests = usable, in-target (pinned) candidates only.
  // Incidental out-of-region / unpinned discoveries are still written (preserved),
  // but they do NOT count toward this request's coverage or completion.
  return regionContext ? res.inTarget : res.written;
}

async function writePriorityCandidates(
  pr: PriorityRequest,
  resolved: { title: string; year: number; type: string },
  candidates: CandidateDraft[]
): Promise<{ written: number; inTarget: number }> {
  const enabled = isFirestoreEnabled();
  const movieId = `pr-${pr.id}-${slugify(resolved.title)}`;
  const now = new Date().toISOString();
  if (enabled) {
    try {
      await writeResearchDoc("research_movies", movieId, {
        id: movieId,
        title: resolved.title,
        year: resolved.year,
        type: resolved.type,
        priority_request_id: pr.id,
        priority_kind: pr.kind,
        priority_value: pr.value,
        created_at: now,
      });
    } catch (err) {
      console.warn("[priority-worker] movie upsert failed:", err instanceof Error ? err.message : err);
    }
  }
  let written = 0;
  let inTarget = 0;
  for (const c of candidates) {
    const candId = `${movieId}-${c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40)}`;
    if (c.duplicateOfProduction || c.duplicateOfCandidate) {
      if (!enabled) {
        console.log(
          `[priority-worker][dry-run][duplicate-skipped] candidate: ${JSON.stringify({
            candidate: { id: candId, movie_id: movieId, name: c.name, movie_or_show: resolved.title, year: resolved.year, proposed_address: c.address ?? "", latitude: c.coords?.lat ?? 0, longitude: c.coords?.lng ?? 0, confidence: c.confidence, verification_status: "needs_research", region_level: false, research_notes: c.duplicateOfProduction ? `DUPLICATE of production location ${c.duplicateOfProduction}` : `DUPLICATE of existing research candidate ${c.duplicateOfCandidate}` },
            sources: c.sources,
            photos: c.photos,
          })}`
        );
      }
      continue;
    }
    // inRegion: the candidate belongs to the requested geography (pinned inside it,
    // or an unpinned in-region lead). Out-of-region pins were flagged by the gate.
    const inRegion = !c.geocodeContextMismatch;
    // Usable/in-target = pinned AND in-region. Genuine in-region leads without a
    // usable pin are preserved as Needs Research but never count as coverage.
    const hasPin = !!(c.coords?.lat && c.coords?.lng);
    const cand: Record<string, unknown> = {
      id: candId,
      movie_id: movieId,
      name: c.name,
      movie_or_show: resolved.title,
      year: resolved.year,
      city: c.city ?? "",
      country: c.country ?? "",
      proposed_address: c.address ?? "",
      latitude: c.coords?.lat ?? 0,
      longitude: c.coords?.lng ?? 0,
      scene_description: "",
      fun_fact: "",
      episode: null,
      confidence: c.confidence,
      // VALIDATION (owner directive 2026-08-19): worker = discovery only. Never
      // self-grades ready. Usable only via human verification attestation before add.
      verification_status: "needs_research",
      research_notes: c.researchNote
        ? c.researchNote
        : `Priority request "${pr.value}" (${pr.kind}). Auto-discovered via Wikipedia/Wikidata P915 + Nominatim + Commons. Sources: ${c.sources.length}, photos: ${c.photos.length}.`,
      region_level: false,
      // Incidental out-of-region discoveries stay in the research pipeline under
      // their OWN geography — they are never attributed to this request.
      ...(inRegion
        ? { priority_request_id: pr.id, priority_kind: pr.kind, priority_value: pr.value }
        : {}),
      created_at: now,
      updated_at: now,
    };
    const sources: ResearchSource[] = c.sources.map((s, i) => ({ ...s, id: `${candId}-src-${i}`, candidate_id: candId }));
    const photos: ResearchPhotoCandidate[] = c.photos.map((p, i) => ({ ...p, id: `${candId}-photo-${i}`, candidate_id: candId }));
    if (enabled) {
      try {
        await writeResearchDoc("research_candidates", candId, { ...cand });
        for (const s of sources) await writeResearchDoc("research_sources", s.id, { ...s });
        for (const p of photos) await writeResearchDoc("research_photo_candidates", p.id, { ...p });
      } catch (err) {
        console.warn(`[priority-worker] write candidate ${candId} failed:`, err instanceof Error ? err.message : err);
        continue;
      }
    } else {
      console.log(`[priority-worker][dry-run] candidate: ${JSON.stringify({ candidate: cand, sources, photos })}`);
    }
    written++;
    if (inRegion && hasPin) inTarget++;
  }
  return { written, inTarget };
}

// ── Worker pass ──
async function touch(id: string, fields: Record<string, string | number | null>): Promise<void> {
  const sets = Object.entries(fields)
    .map(([k, v]) => `${k} = ${v === null ? "NULL" : typeof v === "number" ? v : esc(String(v))}`)
    .join(", ");
  await runQuery(`UPDATE ${TABLE} SET ${sets}, updated_at = ${esc(new Date().toISOString())} WHERE id = ${esc(id)}`);
}

/**
 * One worker pass for a priority request. Returns { added, filmsProcessed }.
 * Marks the request completed when candidates_produced >= target; blocked when
 * a region's film list is exhausted below target (admin can reopen).
 */
export async function runPriorityPass(
  pr: PriorityRequest,
  cfg: ResearchConfig
): Promise<{ added: number; filmsProcessed: number }> {
  if (!isFirestoreEnabled()) {
    await touch(pr.id, {
      last_error: "FIREBASE_SERVICE_ACCOUNT not configured on this host — priority generation is dry-run only; set the secret on the live host.",
      last_run_at: new Date().toISOString(),
    });
    return { added: 0, filmsProcessed: 0 };
  }
  const today = await getDailyJobCount();
  if (today.count > cfg.max_jobs_per_day) {
    await touch(pr.id, { last_error: `Daily job budget exceeded (${today.count}/${cfg.max_jobs_per_day}) — priority pass skipped`, last_run_at: new Date().toISOString() });
    return { added: 0, filmsProcessed: 0 };
  }
  await incrementDailyJobCount();

  const timeoutMs = Math.max(10_000, cfg.priority_pass_timeout_ms);
  let settled = false;
  const timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    void touch(pr.id, { last_error: `Priority pass timed out after ${Math.round(timeoutMs / 1000)}s`, last_run_at: new Date().toISOString() });
  }, timeoutMs);

  try {
    if (pr.kind === "movie") {
      const added = await runFilmPipeline({ title: pr.value, year: 0, type: "movie" }, pr, cfg, null);
      const total = pr.candidates_produced + added;
      if (total >= pr.target) {
        await touch(pr.id, { candidates_produced: total, films_done: pr.films_done + 1, last_error: null, last_run_at: new Date().toISOString(), status: "completed", completion_type: "auto", completed_at: new Date().toISOString() });
      } else {
        await touch(pr.id, { candidates_produced: total, films_done: pr.films_done + 1, last_error: null, last_run_at: new Date().toISOString() });
      }
      return { added, filmsProcessed: 1 };
    }

    // Region kind: work the film list in batches.
    let films: string[] = [];
    if (pr.films_list_json) {
      try {
        films = JSON.parse(pr.films_list_json);
      } catch {
        films = [];
      }
    }
    if (films.length === 0) {
      films = await discoverRegionFilms(pr.kind, pr.value);
      await touch(pr.id, { films_list_json: JSON.stringify(films) });
    }
    const startIdx = pr.films_done;
    const batch = films.slice(startIdx, startIdx + cfg.priority_films_per_pass);
    if (batch.length === 0) {
      await touch(pr.id, {
        status: "blocked",
        last_error: `Film list exhausted after ${pr.films_done} films — target ${pr.target} not reached (${pr.candidates_produced} candidates produced). Reopen or raise target after more films are listed.`,
        last_run_at: new Date().toISOString(),
      });
      return { added: 0, filmsProcessed: 0 };
    }
    let added = 0;
    for (const filmTitle of batch) {
      const film = parseFilmTitle(filmTitle);
      added += await runFilmPipeline(film, pr, cfg, pr.value);
    }
    const total = pr.candidates_produced + added;
    const filmsDone = startIdx + batch.length;
    if (total >= pr.target) {
      await touch(pr.id, { candidates_produced: total, films_done: filmsDone, last_error: null, last_run_at: new Date().toISOString(), status: "completed", completion_type: "auto", completed_at: new Date().toISOString() });
    } else {
      await touch(pr.id, { candidates_produced: total, films_done: filmsDone, last_error: null, last_run_at: new Date().toISOString() });
    }
    return { added, filmsProcessed: batch.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await touch(pr.id, { last_error: msg, last_run_at: new Date().toISOString() });
    console.error(`[priority-worker] ${pr.id} pass failed:`, msg);
    return { added: 0, filmsProcessed: 0 };
  } finally {
    settled = true;
    clearTimeout(timer);
  }
}

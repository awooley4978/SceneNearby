// ── Research worker (job runner) ──
// Runs inside the Fly API app as a module with a poll loop. NEVER self-enqueues.
// Only processes research_jobs with status 'queued' (single-flight: the
// queued->running transition is the lock). When the queue is empty it makes
// zero external calls.
//
// Job pipeline: resolve metadata (Wikipedia/Wikidata) -> raw mentions ->
// normalize/dedupe within job -> geocode (Nominatim) -> photos (Commons) ->
// dedupe vs production + existing candidates -> write candidates/sources/photos
// to Firestore research_* (when FIREBASE_SERVICE_ACCOUNT present) or log
// dry-run results.
import { claimNextJob, getJob, updateJobStatus } from "./jobs";
import { getResearchConfig, incrementDailyJobCount, getDailyJobCount } from "./config";
import { claimNextPriorityRequest, runPriorityPass } from "./priority";
import { resolveTitle, mentionsFromResolved, isVenueName, isProseFragment } from "./discovery";
import { geocode } from "./nominatim";
import { findCommonsPhotos } from "./commons";
import {
  loadProductionLocations,
  loadResearchCandidates,
  findProductionDuplicate,
  findCandidateDuplicate,
  computeConfidence,
  isRegionLevel,
} from "./dedupe";
import {
  isFirestoreEnabled,
  writeResearchDoc,
} from "./firestore";
import { randomUUID } from "node:crypto";
import type {
  CandidateDraft,
  ResearchCandidate,
  ResearchConfig,
  ResearchPhotoCandidate,
  ResearchSource,
  RawLocationMention,
} from "./types";

let running = false;
let lastPollAt = 0;
let startedAt = 0;

/** Generic admin-area words that must NOT become region-context tokens
 *  ("united states", "county" alone, etc.). */
const GENERIC_REGION = /^(united states|usa|u\.?s\.?a?|county|state|province|region|england|scotland|wales|ireland|china|canada|mexico|australia|new zealand|india|japan|germany|france|spain|italy|uk|gb|great britain|north america|europe|asia|africa|south america|antarctica|oceania)$/;

export function researchWorkerStatus(): { running: boolean; lastPollAt: number; startedAt: number } {
  return { running, lastPollAt, startedAt };
}

/** Poll loop — one job at a time. Priority Requests sit ABOVE normal work:
 *  while any request is open/in_progress, the worker pauses the normal backlog
 *  and works the highest-priority request until its coverage target is met,
 *  then the next, then resumes normal queued jobs. */
export async function researchWorkerTick(): Promise<{ handled: boolean; jobId?: string; priority?: boolean }> {
  lastPollAt = Date.now();
  if (running) return { handled: false }; // single-flight: a job is already in progress

  const cfg = await getResearchConfig();
  if (cfg.pause_research) return { handled: false }; // kill switch

  // Override queue first: any open/in_progress priority request preempts normal jobs.
  const pr = await claimNextPriorityRequest();
  if (pr) {
    running = true;
    try {
      await runPriorityPass(pr, cfg);
      return { handled: true, jobId: pr.id, priority: true };
    } finally {
      running = false;
    }
  }

  const job = await claimNextJob();
  if (!job) return { handled: false };

  running = true;
  try {
    await runJob(job.id, cfg);
    return { handled: true, jobId: job.id };
  } finally {
    running = false;
  }
}

/** Start the poll loop (called once from server.ts). */
export function startResearchWorker(intervalMs = 60_000): void {
  if (startedAt) return;
  startedAt = Date.now();
  const loop = async () => {
    try {
      const cfg = await getResearchConfig();
      const gap = Math.max(5_000, cfg.poll_interval_ms || intervalMs);
      await researchWorkerTick();
      setTimeout(loop, gap);
    } catch (err) {
      console.error("[research-worker] poll error:", err);
      setTimeout(loop, 15_000);
    }
  };
  loop();
  console.log("[research-worker] started (poll loop active)");
}

// ── Per-job pipeline ──
async function runJob(jobId: string, cfg: ResearchConfig): Promise<void> {
  const job = await getJob(jobId);
  if (!job) return;

  // Daily budget check (only for real jobs; dry-run exempt).
  if (!job.dry_run) {
    const today = await getDailyJobCount();
    // count incremented at enqueue time by the API; double-check here
    if (today.count > cfg.max_jobs_per_day) {
      await updateJobStatus(jobId, "failed", { error: `Daily job budget exceeded (${today.count}/${cfg.max_jobs_per_day})` });
      return;
    }
    // Real jobs write candidates to Firestore. If the service account is not
    // configured, fail loudly instead of "completing" a job that wrote nothing.
    if (!isFirestoreEnabled()) {
      await updateJobStatus(jobId, "failed", {
        error: "FIREBASE_SERVICE_ACCOUNT is not configured on this host — real research jobs write candidates to Firestore. Set the secret (and re-deploy) before queueing real jobs. Dry-run jobs are unaffected.",
      });
      return;
    }
  }

  const timeoutMs = Math.max(10_000, cfg.job_timeout_ms);
  const timer = setTimeout(() => {
    void updateJobStatus(jobId, "failed", { error: `Job timed out after ${Math.round(timeoutMs / 1000)}s` });
  }, timeoutMs);

  try {
    console.log(`[research-worker] job ${jobId}: resolving metadata`);
    const resolved = await resolveTitle(job.movie_title, job.year, job.type);
    if (!resolved.wikidataId && resolved.filmingLocations.length === 0) {
      throw new Error(`Could not resolve "${job.movie_title} (${job.year})" to a Wikipedia/Wikidata record`);
    }

    // 1. Raw mentions
    let mentions = mentionsFromResolved(resolved);
    mentions = mentions.slice(0, cfg.wikipedia_max_candidates);

    // 1b. Prose guard: sentence fragments NEVER enter the candidate pipeline.
    const proseRejected: string[] = [];
    mentions = mentions.filter((m) => {
      if (isProseFragment(m.name)) {
        proseRejected.push(m.name);
        return false;
      }
      return true;
    });

    // 2. Normalize within job (same place from multiple sources -> one candidate)
    const candidates = normalizeMentions(mentions, resolved, jobId);

    // 3. Geocode each candidate lacking coords (bounded).
    //    For VENUE names ("Navy Pier", "Wacker Drive") try "<name>, <city-context>"
    //    (from section titles like "Filming in Chicago") first — fixes ambiguous
    //    pins (Navy Pier -> San Diego vs Chicago). BARE city names ("Los Angeles",
    //    "Hong Kong") geocode plain, so appending context can't hijack them to a
    //    wrong city ("Los Angeles, Chicago" -> Los Ángeles, Chile).
    let geocoded = 0;
    const contexts = resolved.filmingContexts ?? [];
    const ctxLower = contexts.map((c) => c.toLowerCase());
    for (const c of candidates) {
      if (geocoded >= cfg.max_geocode_attempts_per_job) break;
      if (c.coords && c.coords.lat && c.coords.lng) continue;
      const plain = [c.address, c.city, c.name].filter(Boolean).join(", ");
      const variants: string[] = [];
      if (isVenueName(c.name)) {
        for (const ctx of contexts) {
          const q = `${c.name}, ${ctx}`;
          if (q.toLowerCase() !== plain.toLowerCase()) variants.push(q);
        }
      }
      variants.push(plain);
      let geo: Awaited<ReturnType<typeof geocode>> = null;
      for (const q of [...new Set(variants)]) {
        geo = await geocode(q, cfg);
        if (geo) {
          c.coords = { lat: geo.lat, lng: geo.lng };
          if (!c.address && geo.displayName) c.address = geo.displayName;
          geocoded++;
          break;
        }
      }
    }

    // 3b. Region-level detection: cities/regions are LEADS, never candidates.
    // (e.g. "Los Angeles" geocoded to its own county-level area, no venue word.)
    // They are surfaced in the job output for deeper research but are NOT
    // written to research_candidates and never appear ready-for-review.
    for (const c of candidates) {
      c.regionLevel = isRegionLevel(c);
    }
    const leads = candidates.filter((c) => c.regionLevel);
    const specific = candidates.filter((c) => !c.regionLevel);

    // 3c. Region-context gate (post-geocode): a venue pin must land inside a
    // filming region named by the article — section-title contexts ("Filming in
    // Chicago") OR the admin-area tokens of the region-level leads ("Atlanta,
    // Fulton County, Georgia, United States" -> "georgia"). This catches
    // wrong-city pins even when the article's section titles carry no city
    // (Stranger Things: "Patrick Henry High School" -> Virginia, "Long Island"
    // -> New York, when the show filmed in Georgia/New Mexico/Lithuania).
    const regionTokens = new Set<string>();
    for (const lead of leads) {
      const name = (lead.name ?? "").trim().toLowerCase();
      if (name.length >= 4 && !GENERIC_REGION.test(name)) regionTokens.add(name);
      const parts = (lead.address ?? "")
        .toLowerCase()
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length >= 4);
      if (parts.length >= 2 && !GENERIC_REGION.test(parts[parts.length - 2])) {
        regionTokens.add(parts[parts.length - 2]); // state/province/region component
      }
    }
    let contextMismatches = 0;
    for (const c of specific) {
      if (!c.coords) continue;
      const addr = (c.address ?? "").toLowerCase();
      const inSection = contexts.some((x) => addr.includes(x.toLowerCase()));
      const inRegion = [...regionTokens].some((t) => addr.includes(t));
      if (!inSection && !inRegion) {
        c.address = c.address; // keep raw hit visible
        c.geocodeContextMismatch = true;
        c.researchNote = `Geocode context mismatch: Nominatim returned "${c.address}" which is outside the article's filming regions (${[...regionTokens].slice(0, 6).join(", ") || "none"}). Pin NOT set — needs manual placement.`;
        c.coords = undefined;
        contextMismatches++;
      }
    }

    // Log region-level leads (dry-run output only; nothing written anywhere).
    for (const lead of leads) {
      const leadConf = computeConfidence({
        sourceCount: lead.mentions.length,
        hasStructuredSource: true,
        hasCoords: !!lead.coords,
        hasAddress: !!lead.address,
        hasUsablePhoto: false,
        duplicate: false,
        regionLevel: true,
      });
      console.log(
        `[research-worker][dry-run][region-lead] candidate: ${JSON.stringify({
          candidate: {
            id: `${jobId}-lead-${lead.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40)}`,
            movie_id: jobId,
            name: lead.name,
            movie_or_show: resolved.title,
            year: resolved.year,
            proposed_address: lead.address ?? "",
            latitude: lead.coords?.lat ?? 0,
            longitude: lead.coords?.lng ?? 0,
            confidence: leadConf,
            verification_status: "needs_research",
            region_level: true,
            research_notes: "Region-level lead (city/area, not a specific venue) — use as a lead for deeper research, never ready-for-review.",
          },
          sources: lead.sources,
        })}`
      );
    }

    // 4. Photos (Commons) — bounded per candidate (specific candidates only)
    let photosFound = 0;
    for (const c of specific) {
      const photos = await findCommonsPhotos(c.name, cfg);
      c.photos = photos.slice(0, cfg.max_photos_per_candidate);
      photosFound += c.photos.length;
    }

    // 5. Dedupe vs production + existing candidates (specific only)
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

    // 6. Write results (specific candidates only; leads were logged above)
    const candidatesAdded = await writeCandidates(jobId, job, resolved, specific);

    await updateJobStatus(jobId, "completed", {
      stats: {
        candidates_found: candidates.length,
        region_leads: leads.length,
        prose_rejected: proseRejected.length,
        context_mismatches: contextMismatches,
        candidates_added: candidatesAdded,
        duplicates_skipped: dups,
        geocoded,
        photos_found: photosFound,
        sources_count: candidates.reduce((n, c) => n + c.sources.length, 0),
      },
    });
    console.log(`[research-worker] job ${jobId} done: ${specific.length} specific + ${leads.length} leads (${proseRejected.length} prose rejected, ${contextMismatches} context-mismatch), ${dups} dups, ${photosFound} photos`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await updateJobStatus(jobId, "failed", { error: msg });
    console.error(`[research-worker] job ${jobId} failed:`, msg);
  } finally {
    clearTimeout(timer);
  }
}

/** Group raw mentions by normalized name; merge sources/coords/address hints. */
function normalizeMentions(
  mentions: RawLocationMention[],
  resolved: { title: string; year: number; type: string },
  jobId: string
): CandidateDraft[] {
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
    if (m.coords && !c.coords) c.coords = m.coords;
    if (m.addressHint && !c.address) c.address = m.addressHint;
    if (m.cityHint && !c.city) c.city = m.cityHint;
    if (m.countryHint && !c.country) c.country = m.countryHint;
    if (!c.sources.some((s) => s.url === m.sourceUrl)) {
      c.sources.push({
        id: `src-${randomUUID().slice(0, 8)}`,
        candidate_id: "",
        url: m.sourceUrl,
        title: m.sourceTitle,
        kind: m.sourceKind,
        note: m.note,
        accessed_at: new Date().toISOString(),
      } as ResearchSource);
    }
  }
  return [...byName.values()].slice(0, 25);
}

async function writeCandidates(
  jobId: string,
  job: { movie_title: string; year: number; type: string },
  resolved: { title: string; year: number; type: string },
  candidates: CandidateDraft[]
): Promise<number> {
  const enabled = isFirestoreEnabled();
  const movieId = jobId;
  const now = new Date().toISOString();

  // Ensure research_movies has the movie.
  if (enabled) {
    try {
      await writeResearchDoc("research_movies", movieId, {
        id: movieId,
        title: resolved.title,
        year: resolved.year,
        type: job.type,
        created_at: now,
      });
    } catch (err) {
      console.warn("[research-worker] movie upsert failed:", err instanceof Error ? err.message : err);
    }
  }

  let added = 0;
  for (const c of candidates) {
    const candId = `${movieId}-${c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40)}`;
    if (c.duplicateOfProduction || c.duplicateOfCandidate) {
      // Flagged, not written — but in dry-run the owner needs to SEE the match.
      if (!enabled) {
        console.log(
          `[research-worker][dry-run][duplicate-skipped] candidate: ${JSON.stringify({
            candidate: { id: candId, movie_id: movieId, name: c.name, movie_or_show: resolved.title, year: resolved.year, proposed_address: c.address ?? "", latitude: c.coords?.lat ?? 0, longitude: c.coords?.lng ?? 0, confidence: c.confidence, verification_status: "needs_research", region_level: c.regionLevel ?? false, research_notes: c.duplicateOfProduction ? `DUPLICATE of production location ${c.duplicateOfProduction}` : `DUPLICATE of existing research candidate ${c.duplicateOfCandidate}` },
            sources: c.sources,
            photos: c.photos,
          })}`
        );
      }
      continue;
    }
    const cand: ResearchCandidate = {
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
      // VALIDATION (owner directive 2026-08-19): the worker is CANDIDATE DISCOVERY
      // ONLY — it never self-grades a candidate as ready. All auto-discovered
      // candidates start as needs_research; they become usable only through an
      // explicit human verification attestation (verification.ts) before add.
      verification_status: "needs_research",
      research_notes: c.researchNote
        ? c.researchNote
        : `Auto-discovered via Wikipedia/Wikidata P915 + Nominatim + Commons. Sources: ${c.sources.length}, photos: ${c.photos.length}.`,
      region_level: c.regionLevel ?? false,
      created_at: now,
      updated_at: now,
    };
    const sources: ResearchSource[] = c.sources.map((s, i) => ({
      ...s,
      id: `${candId}-src-${i}`,
      candidate_id: candId,
    }));
    const photos: ResearchPhotoCandidate[] = c.photos.map((p, i) => ({
      ...p,
      id: `${candId}-photo-${i}`,
      candidate_id: candId,
    }));

    if (enabled) {
      try {
        await writeResearchDoc("research_candidates", candId, { ...cand });
        for (const s of sources) await writeResearchDoc("research_sources", s.id, { ...s });
        for (const p of photos) await writeResearchDoc("research_photo_candidates", p.id, { ...p });
      } catch (err) {
        console.warn(`[research-worker] write candidate ${candId} failed:`, err instanceof Error ? err.message : err);
        continue;
      }
    } else {
      // Dry-run: log full result (nothing written anywhere).
      console.log(`[research-worker][dry-run] candidate: ${JSON.stringify({ candidate: cand, sources, photos })}`);
    }
    added++;
  }
  return added;
}

function photoUsable(p: ResearchPhotoCandidate | undefined): boolean {
  return !!p && (p.photo_use_status === "verified_reusable" || p.photo_use_status === "permission_required");
}

export type { ResearchConfig };

// ── Research admin API routes ──
// Endpoints for the Admin UI (web + in-app) to queue jobs, view jobs, adjust
// server-side config, pause/cancel, and run a dry-run job.
import type { Router } from "../router";
import {
  createJob,
  listJobs,
  getJob,
  cancelJob,
  jobExists,
} from "./jobs";
import {
  getResearchConfig,
  updateResearchConfig,
  incrementDailyJobCount,
  getDailyJobCount,
} from "./config";
import { researchWorkerStatus, researchWorkerTick } from "./worker";
import { isFirestoreEnabled } from "./firestore";
import { addCandidateToProduction, previewCandidate } from "./add-to-production";
import { recordVerification, clearVerification, verificationReport, REQUIRED_VERIFIED_FIELDS, getCandidate } from "./verification";
import {
  listPriorityRequests,
  createPriorityRequest,
  incrementPriorityRequest,
  updatePriorityRequest,
  deletePriorityRequest,
} from "./priority";
import type { ResearchJob } from "./types";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
function error(msg: string, status = 400): Response {
  return json({ error: msg }, status);
}

async function readJson(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function validateTitleYear(body: any): { movie_title: string; year: number; type: "movie" | "show" } | null {
  const title = typeof body?.movie_title === "string" ? body.movie_title.trim() : "";
  const year = Number(body?.year);
  const type = body?.type === "show" ? "show" : "movie";
  if (!title || title.length < 2 || title.length > 120) return null;
  if (!Number.isInteger(year) || year < 1888 || year > new Date().getFullYear() + 2) return null;
  return { movie_title: title, year, type };
}

export function registerResearchRoutes(router: Router): void {
  // ── Config ──
  router.get("/api/research/config", async () => {
    const cfg = await getResearchConfig();
    const daily = await getDailyJobCount();
    return json({ config: cfg, daily, firestore_writes: isFirestoreEnabled() });
  });

  router.put("/api/research/config", async (req) => {
    const body = await readJson(req);
    if (!body || typeof body !== "object") return error("Invalid config payload");
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (typeof v === "number" || typeof v === "boolean") patch[k] = v;
    }
    try {
      const cfg = await updateResearchConfig(patch as any);
      return json({ config: cfg });
    } catch (err) {
      return error(err instanceof Error ? err.message : "Config update failed");
    }
  });

  // ── Jobs ──
  router.get("/api/research/jobs", async (req) => {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit") ?? "50");
    const jobs = await listJobs(limit);
    const cfg = await getResearchConfig();
    const daily = await getDailyJobCount();
    return json({ jobs, worker: researchWorkerStatus(), config: cfg, daily });
  });

  router.post("/api/research/jobs", async (req) => {
    const body = await readJson(req);
    const v = validateTitleYear(body);
    if (!v) return error("Provide movie_title (2-120 chars) and a valid year");
    const dryRun = body?.dry_run === true;
    if (await jobExists(`${v.movie_title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${v.year}`)) {
      return error("A job for this title+year already exists (queued/running/completed/failed)");
    }
    if (!dryRun) {
      const cfg = await getResearchConfig();
      const count = await incrementDailyJobCount();
      if (count > cfg.max_jobs_per_day) {
        return error(`Daily job budget exceeded (${count}/${cfg.max_jobs_per_day})`);
      }
    }
    const job: ResearchJob = await createJob({
      movie_title: v.movie_title,
      year: v.year,
      type: v.type,
      created_by: typeof body?.created_by === "string" ? body.created_by : "admin",
      dry_run: dryRun,
    });
    return json({ job }, 201);
  });

  router.get("/api/research/jobs/:id", async (req, params) => {
    const job = await getJob(params.id);
    if (!job) return error("Job not found", 404);
    return json({ job });
  });

  router.post("/api/research/jobs/:id/cancel", async (req, params) => {
    const ok = await cancelJob(params.id);
    if (!ok) return error("Job not found or already finished", 404);
    return json({ ok: true });
  });

  // ── Worker controls ──
  router.post("/api/research/tick", async () => {
    const result = await researchWorkerTick();
    return json({ ...result, worker: researchWorkerStatus() });
  });

  router.post("/api/research/pause", async (req) => {
    const body = await readJson(req);
    await updateResearchConfig({ pause_research: body?.pause === true });
    return json({ config: await getResearchConfig() });
  });
  // ── Verification (owner directive 2026-08-19) ──
  // The worker is candidate discovery ONLY. A candidate becomes usable only after an
  // explicit human verification attestation covering the required fields. These
  // endpoints record / clear / inspect that attestation.
  //
  // Read-only field-by-field gate report for a candidate.
  router.get("/api/research/candidates/:id/verification", async (req, params) => {
    const cand = await getCandidate(params.id);
    if (!cand) return error("Candidate not found", 404);
    return json({
      candidate_id: params.id,
      required_fields: REQUIRED_VERIFIED_FIELDS,
      report: verificationReport(cand),
    });
  });
  // Record a verification attestation (admin-gated, requires all required fields + a source).
  router.post("/api/research/candidates/:id/verify", async (req, params) => {
    const body = await readJson(req);
    const verifiedBy = typeof body?.verified_by === "string" ? body.verified_by.trim() : "";
    const source = typeof body?.source === "string" ? body.source.trim() : "";
    const note = typeof body?.note === "string" ? body.note : undefined;
    let fields: string[] = [];
    if (Array.isArray(body?.fields)) {
      fields = (body.fields as unknown[]).filter((f): f is string => typeof f === "string");
    }
    if (!verifiedBy) return error("verified_by (admin email) is required");
    try {
      const attestation = await recordVerification(params.id, verifiedBy, fields as any, source, note);
      return json({ ok: true, verification: attestation, candidate_id: params.id }, 200);
    } catch (err) {
      return error(err instanceof Error ? err.message : "Verify failed", /not authorized/i.test(err instanceof Error ? err.message : "") ? 403 : 409);
    }
  });
  // Clear a verification attestation (re-open the candidate for review).
  router.post("/api/research/candidates/:id/unverify", async (req, params) => {
    const body = await readJson(req);
    const verifiedBy = typeof body?.verified_by === "string" ? body.verified_by.trim() : "";
    if (!verifiedBy) return error("verified_by (admin email) is required");
    try {
      await clearVerification(params.id, verifiedBy);
      return json({ ok: true });
    } catch (err) {
      return error(err instanceof Error ? err.message : "Unverify failed", 403);
    }
  });
  // ── Add approved candidate → production (EXPLICIT owner action) ──
  // Phase 1: read-only preview — production fields + live duplicate scan. NO writes.
  router.post("/api/research/candidates/:id/preview", async (req, params) => {
    const body = await readJson(req);
    const approvedBy = typeof body?.approved_by === "string" ? body.approved_by.trim() : "";
    const category = typeof body?.category === "string" ? body.category : "drama";
    if (!approvedBy) return error("approved_by (admin email) is required");
    try {
      const { preview, duplicates } = await previewCandidate(params.id, approvedBy, category);
      return json({ preview, duplicates });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Preview failed";
      const status = /not authorized/i.test(msg) ? 403 : /not found/i.test(msg) ? 404 : 409;
      return error(msg, status);
    }
  });
  // Phase 2: explicit write. Stops on possible duplicate unless force=true.
  router.post("/api/research/candidates/:id/add", async (req, params) => {
    const body = await readJson(req);
    const approvedBy = typeof body?.approved_by === "string" ? body.approved_by.trim() : "";
    const category = typeof body?.category === "string" ? body.category : "drama";
    const force = body?.force === true;
    if (!approvedBy) return error("approved_by (admin email) is required");
    try {
      const result = await addCandidateToProduction(params.id, approvedBy, category, force);
      return json({ ok: true, location: result }, 201);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Add failed";
      if (err && typeof err === "object" && "duplicates" in err) {
        // Possible duplicate(s) — stop and show the match(es).
        return json({ error: msg, duplicates: (err as any).duplicates }, 409);
      }
      const status = /not authorized/i.test(msg) ? 403 : /not found/i.test(msg) ? 404 : 409;
      return error(msg, status);
    }
  });
  // ── Priority Requests (override queue) ──
  // Sits ABOVE the normal research backlog: while any request is open or
  // in_progress the worker pauses normal jobs and works the highest-priority
  // request until its minimum coverage target is met, then the next, then
  // resumes the normal backlog. Repeated requests raise priority + count.
  router.get("/api/priority-requests", async () => {
    const requests = await listPriorityRequests();
    const cfg = await getResearchConfig();
    return json({
      requests,
      config: {
        priority_default_target: cfg.priority_default_target,
        priority_films_per_pass: cfg.priority_films_per_pass,
        max_jobs_per_day: cfg.max_jobs_per_day,
      },
      worker: researchWorkerStatus(),
      firestore_writes: isFirestoreEnabled(),
    });
  });
  router.post("/api/priority-requests", async (req) => {
    const body = await readJson(req);
    const kind = body?.kind;
    const value = typeof body?.value === "string" ? body.value.trim() : "";
    const createdBy = typeof body?.created_by === "string" ? body.created_by.trim() : "";
    if (!["movie", "city", "state", "province"].includes(kind)) {
      return error("kind must be one of: movie, city, state, province");
    }
    if (value.length < 2 || value.length > 120) return error("value is required (2–120 characters)");
    if (!createdBy) return error("created_by (admin email) is required");
    const priority = body?.priority !== undefined ? Number(body.priority) : undefined;
    const target = body?.target !== undefined ? Number(body.target) : undefined;
    try {
      const result = await createPriorityRequest({ kind, value, priority, target, created_by: createdBy });
      return json({ ok: true, created: result.created, request: result.request }, result.created ? 201 : 200);
    } catch (err) {
      return error(err instanceof Error ? err.message : "Create failed");
    }
  });
  // Repeated request: +1 request count, +1 priority, reopens completed/blocked.
  router.post("/api/priority-requests/:id/request", async (req, params) => {
    const body = await readJson(req);
    const createdBy = typeof body?.created_by === "string" ? body.created_by.trim() : "";
    if (!createdBy) return error("created_by (admin email) is required");
    const request = await incrementPriorityRequest(params.id);
    if (!request) return error("Priority request not found", 404);
    return json({ ok: true, request });
  });
  // Update status (open/in_progress/completed/blocked), priority, or target.
  router.put("/api/priority-requests/:id", async (req, params) => {
    const body = await readJson(req);
    const createdBy = typeof body?.created_by === "string" ? body.created_by.trim() : "";
    if (!createdBy) return error("created_by (admin email) is required");
    const patch: { status?: "open" | "in_progress" | "completed" | "blocked"; priority?: number; target?: number } = {};
    if (body?.status !== undefined) {
      if (!["open", "in_progress", "completed", "blocked"].includes(body.status)) {
        return error("status must be one of: open, in_progress, completed, blocked");
      }
      patch.status = body.status;
    }
    if (body?.priority !== undefined) patch.priority = Number(body.priority);
    if (body?.target !== undefined) patch.target = Number(body.target);
    try {
      const request = await updatePriorityRequest(params.id, patch);
      if (!request) return error("Priority request not found", 404);
      return json({ ok: true, request });
    } catch (err) {
      return error(err instanceof Error ? err.message : "Update failed");
    }
  });
  router.delete("/api/priority-requests/:id", async (req, params) => {
    const body = await readJson(req);
    const createdBy = typeof body?.created_by === "string" ? body.created_by.trim() : "";
    if (!createdBy) return error("created_by (admin email) is required");
    const ok = await deletePriorityRequest(params.id);
    if (!ok) return error("Priority request not found", 404);
    return json({ ok: true });
  });
}

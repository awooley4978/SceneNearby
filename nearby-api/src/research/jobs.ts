// ── Research job store (Turso) ──
// Jobs live in Turso `research_jobs` so the worker can claim/update them
// server-side without a Firestore credential. When FIREBASE_SERVICE_ACCOUNT is
// present, results are ALSO written to Firestore research_* collections; the
// queue itself is Turso-owned (the Admin API reads/writes through this store).
import { runQuery } from "../db";
import type { MovieType, ResearchJob, ResearchJobStats } from "./types";

const TABLE = "research_jobs";

function esc(val: string | null | undefined): string {
  if (val == null) return "NULL";
  return `'${val.replace(/'/g, "''")}'`;
}

const EMPTY_STATS: ResearchJobStats = {
  candidates_found: 0,
  candidates_added: 0,
  duplicates_skipped: 0,
  geocoded: 0,
  photos_found: 0,
  sources_count: 0,
  region_leads: 0,
  prose_rejected: 0,
  context_mismatches: 0,
};

export function slugify(title: string, year: number): string {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${year}`;
}

async function ensureTable(): Promise<void> {
  await runQuery(
    `CREATE TABLE IF NOT EXISTS ${TABLE} (
      id TEXT PRIMARY KEY,
      movie_title TEXT NOT NULL,
      year INTEGER NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      stats_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      started_at TEXT,
      finished_at TEXT,
      created_by TEXT NOT NULL,
      dry_run INTEGER NOT NULL DEFAULT 0
    )`
  );
}

function rowToJob(row: Record<string, unknown>): ResearchJob {
  return {
    id: String(row.id),
    movie_title: String(row.movie_title),
    year: Number(row.year),
    type: String(row.type) as MovieType,
    status: String(row.status) as ResearchJob["status"],
    attempts: Number(row.attempts ?? 0),
    error: row.error ? String(row.error) : null,
    stats: { ...EMPTY_STATS, ...(JSON.parse(String(row.stats_json)) as ResearchJobStats) },
    created_at: String(row.created_at),
    started_at: row.started_at ? String(row.started_at) : null,
    finished_at: row.finished_at ? String(row.finished_at) : null,
    created_by: String(row.created_by),
    dry_run: Number(row.dry_run ?? 0) === 1,
  };
}

export async function createJob(input: {
  movie_title: string;
  year: number;
  type: MovieType;
  created_by: string;
  dry_run?: boolean;
}): Promise<ResearchJob> {
  await ensureTable();
  const id = slugify(input.movie_title, input.year);
  const now = new Date().toISOString();
  await runQuery(
    `INSERT INTO ${TABLE} (id, movie_title, year, type, status, attempts, error, stats_json, created_at, started_at, finished_at, created_by, dry_run)
     VALUES (${esc(id)}, ${esc(input.movie_title)}, ${input.year}, ${esc(input.type)}, 'queued', 0, NULL, ${esc(JSON.stringify(EMPTY_STATS))}, ${esc(now)}, NULL, NULL, ${esc(input.created_by)}, ${input.dry_run ? 1 : 0})`
  );
  return {
    id,
    movie_title: input.movie_title,
    year: input.year,
    type: input.type,
    status: "queued",
    attempts: 0,
    error: null,
    stats: { ...EMPTY_STATS },
    created_at: now,
    started_at: null,
    finished_at: null,
    created_by: input.created_by,
    dry_run: !!input.dry_run,
  };
}

export async function jobExists(id: string): Promise<boolean> {
  await ensureTable();
  const rows = (await runQuery(`SELECT id FROM ${TABLE} WHERE id = ${esc(id)}`)) as { id: string }[];
  return rows.length > 0;
}

export async function getJob(id: string): Promise<ResearchJob | null> {
  await ensureTable();
  const rows = (await runQuery(`SELECT * FROM ${TABLE} WHERE id = ${esc(id)}`)) as Record<string, unknown>[];
  return rows.length > 0 ? rowToJob(rows[0]) : null;
}

export async function listJobs(limit = 50): Promise<ResearchJob[]> {
  await ensureTable();
  const rows = (await runQuery(
    `SELECT * FROM ${TABLE} ORDER BY created_at DESC LIMIT ${Math.min(Math.max(limit, 1), 200)}`
  )) as Record<string, unknown>[];
  return rows.map(rowToJob);
}

/** Claim the next queued job for processing (single-flight lock). */
export async function claimNextJob(): Promise<ResearchJob | null> {
  await ensureTable();
  // Pick the oldest queued job, transition queued -> running. The conditional
  // UPDATE (WHERE status = 'queued') is the lock: only ONE worker's UPDATE can
  // win, because the winner flips the status first. The loser's UPDATE matches
  // 0 rows, so the row keeps the winner's started_at/attempts — verified below.
  const rows = (await runQuery(
    `SELECT * FROM ${TABLE} WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1`
  )) as Record<string, unknown>[];
  if (rows.length === 0) return null;
  const job = rowToJob(rows[0]);
  const now = new Date().toISOString();
  await runQuery(
    `UPDATE ${TABLE} SET status = 'running', started_at = ${esc(now)}, attempts = attempts + 1 WHERE id = ${esc(job.id)} AND status = 'queued'`
  );
  // Verify we actually won the claim: the row must show OUR started_at and an
  // incremented attempts. If another worker claimed it first (their UPDATE won),
  // started_at will differ and we return null — no double-processing.
  const after = await getJob(job.id);
  if (!after || after.started_at !== now || after.attempts !== job.attempts + 1) {
    return null;
  }
  return after;
}

export async function updateJobStatus(
  id: string,
  status: ResearchJob["status"],
  patch?: { error?: string | null; stats?: Partial<ResearchJobStats> }
): Promise<void> {
  await ensureTable();
  const sets: string[] = [`status = ${esc(status)}`];
  if (status === "completed" || status === "failed" || status === "cancelled") {
    sets.push(`finished_at = ${esc(new Date().toISOString())}`);
  }
  if (patch?.error !== undefined) sets.push(`error = ${esc(patch.error)}`);
  if (patch?.stats) {
    const cur = await getJob(id);
    const merged = { ...(cur?.stats ?? EMPTY_STATS), ...patch.stats };
    sets.push(`stats_json = ${esc(JSON.stringify(merged))}`);
  }
  await runQuery(`UPDATE ${TABLE} SET ${sets.join(", ")} WHERE id = ${esc(id)}`);
}

export async function cancelJob(id: string): Promise<boolean> {
  await ensureTable();
  await runQuery(
    `UPDATE ${TABLE} SET status = 'cancelled', finished_at = ${esc(new Date().toISOString())} WHERE id = ${esc(id)} AND status IN ('queued', 'running')`
  );
  const job = await getJob(id);
  return job?.status === "cancelled";
}

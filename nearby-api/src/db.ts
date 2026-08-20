// ── Database wrapper ──
// Two transport strategies, selected by env:
//   DB_DRIVER=libsql  → direct Turso connection via @libsql/client (cloud hosts).
//   (unset)           → team-db CLI (pull/execute/push sync) — sandbox default.
// Both talk to the SAME Turso database; SQL and result shapes are identical.
import { execSync } from "node:child_process";
import { createClient } from "@libsql/client";
import type { PhotoSubmission, LocationRecord } from "./types";

const TEAM_DB = "/usr/local/bin/team-db";
const USE_LIBSQL = process.env.DB_DRIVER === "libsql" && !!process.env.TEAM_DB_URL;

let libsqlClient: ReturnType<typeof createClient> | null = null;
function getLibsql() {
  if (!libsqlClient) {
    libsqlClient = createClient({
      url: process.env.TEAM_DB_URL as string,
      authToken: process.env.TEAM_DB_AUTH_TOKEN,
    });
  }
  return libsqlClient;
}

// libsql may return BigInt for large integers and ArrayBuffer for blobs;
// normalize to plain JSON values like the team-db CLI output.
function toJsonSafe(value: unknown): unknown {
  if (typeof value === "bigint") return Number(value);
  if (value instanceof ArrayBuffer) return new TextDecoder().decode(value);
  if (Array.isArray(value)) return value.map(toJsonSafe);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = toJsonSafe(v);
    return out;
  }
  return value;
}

export function esc(val: string | null | undefined): string {
  if (val == null) return "NULL";
  return `'${val.replace(/'/g, "''")}'`;
}

function escLiteral(val: string): string {
  return val.replace(/'/g, "''");
}

export async function runQuery(sql: string): Promise<unknown[]> {
  try {
    // Replace newlines with spaces for single-line shell execution
    const cleanSql = sql.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    if (USE_LIBSQL) {
      const res = await getLibsql().execute(cleanSql);
      return res.rows.map((row) => toJsonSafe(row) as Record<string, unknown>);
    }
    const output = execSync(`${TEAM_DB} "${cleanSql.replace(/"/g, '\\"')}"`, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
      env: {
        ...process.env,
        TEAM_DB_URL: process.env.TEAM_DB_URL,
        TEAM_DB_AUTH_TOKEN: process.env.TEAM_DB_AUTH_TOKEN,
      },
    });
    return JSON.parse(output.trim());
  } catch (err) {
    console.error("DB query error:", err);
    throw err;
  }
}

// ── Query helpers ──
export async function getSubmission(id: string): Promise<PhotoSubmission | null> {
  const rows = (await runQuery(
    `SELECT * FROM photo_submissions WHERE id = ${esc(id)}`
  )) as PhotoSubmission[];
  return rows.length > 0 ? rows[0] : null;
}

export async function getSubmissions(status?: string, appName?: string): Promise<PhotoSubmission[]> {
  const conditions: string[] = [];
  if (status) conditions.push(`status = ${esc(status)}`);
  if (appName) conditions.push(`app_name = ${esc(appName)}`);
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return (await runQuery(
    `SELECT * FROM photo_submissions ${where} ORDER BY submitted_at DESC LIMIT 100`
  )) as PhotoSubmission[];
}

export async function getApprovedSubmissions(): Promise<PhotoSubmission[]> {
  return (await runQuery(
    "SELECT * FROM photo_submissions WHERE status = 'approved' ORDER BY submitted_at DESC"
  )) as PhotoSubmission[];
}

export async function getApprovedByLocation(locationId: string): Promise<PhotoSubmission[]> {
  return (await runQuery(
    `SELECT * FROM photo_submissions WHERE status = 'approved' AND location_id = ${esc(locationId)} ORDER BY submitted_at DESC`
  )) as PhotoSubmission[];
}

export async function insertSubmission(sub: PhotoSubmission): Promise<void> {
  const { id, app_name, location_id, location_name, user_info, photo_path, comment, submitted_at, status } = sub;
  const sql = `INSERT INTO photo_submissions (id, app_name, location_id, location_name, user_info, photo_path, comment, submitted_at, status) VALUES (${esc(id)}, ${esc(app_name)}, ${esc(location_id)}, ${esc(location_name)}, ${esc(user_info)}, ${esc(photo_path)}, ${esc(comment)}, ${esc(submitted_at)}, ${esc(status)})`;
  await runQuery(sql);
}

/**
 * Insert a guided community contribution (photo -> movie/show -> filming
 * location -> description). Every contribution is stored pending-only here and
 * flows through admin moderation; nothing in this table auto-publishes. All new
 * columns are additive and nullable-safe.
 */
export async function insertContribution(sub: PhotoSubmission): Promise<void> {
  const sql = `INSERT INTO photo_submissions (
    id, app_name, location_id, location_name, user_info, photo_path, photo_public_url,
    comment, description, submitted_at, reviewed_by, reviewed_at, status,
    movie_or_show, proposed_movie_json, proposed_location_json,
    submitter_uid, display_name, allow_public_credit, rights_confirmed,
    photo_kind, source_evidence, source, featured
  ) VALUES (
    ${esc(sub.id)}, ${esc(sub.app_name)}, ${esc(sub.location_id ?? "unknown")}, ${esc(sub.location_name ?? "Unknown location")},
    ${esc(sub.user_info ?? null)}, ${esc(sub.photo_path)}, NULL,
    ${esc(sub.comment ?? null)}, ${esc(sub.description ?? null)}, ${esc(sub.submitted_at)}, NULL, NULL,
    ${esc(sub.status)},
    ${esc(sub.movie_or_show ?? null)}, ${esc(sub.proposed_movie_json ?? null)}, ${esc(sub.proposed_location_json ?? null)},
    ${esc(sub.submitter_uid ?? null)}, ${esc(sub.display_name ?? null)}, ${sub.allow_public_credit == null ? 1 : sub.allow_public_credit},
    ${sub.rights_confirmed ? 1 : 0}, ${esc(sub.photo_kind ?? "community")}, ${esc(sub.source_evidence ?? null)},
    ${esc(sub.source ?? "community")}, 0
  )`;
  await runQuery(sql);
}

/** Latest approved community photos (for the approved gallery). */
export async function getApprovedCommunityPhotos(limit = 100): Promise<PhotoSubmission[]> {
  return (await runQuery(
    `SELECT * FROM photo_submissions WHERE status = 'approved' ORDER BY submitted_at DESC LIMIT ${Math.max(1, Math.min(500, limit))}`
  )) as PhotoSubmission[];
}

/** Approved community photos tied to a single location (for its community gallery). */
export async function getApprovedCommunityByLocation(locationId: string): Promise<PhotoSubmission[]> {
  return (await runQuery(
    `SELECT * FROM photo_submissions WHERE status = 'approved' AND location_id = ${esc(locationId)} ORDER BY COALESCE(featured,0) DESC, submitted_at DESC`
  )) as PhotoSubmission[];
}

/** The currently-featured community photo for a location (0 or 1). */
export async function getFeaturedByLocation(locationId: string): Promise<PhotoSubmission | null> {
  const rows = (await runQuery(
    `SELECT * FROM photo_submissions WHERE status = 'approved' AND location_id = ${esc(locationId)} AND featured = 1 ORDER BY featured_at DESC LIMIT 1`
  )) as PhotoSubmission[];
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Set/unset the featured community photo for a location. Selecting a new
 * featured photo clears any previous one for that location first (the previous
 * photo stays approved in the gallery — it is never deleted or un-attributed).
 */
export async function setFeatured(locationId: string, submissionId: string | null, featuredBy: string): Promise<void> {
  // Clear any existing featured photo for this location (reversible; photo stays in gallery).
  await runQuery(
    `UPDATE photo_submissions SET featured = 0, featured_at = NULL WHERE location_id = ${esc(locationId)} AND featured = 1`
  );
  if (submissionId) {
    const now = new Date().toISOString();
    await runQuery(
      `UPDATE photo_submissions SET featured = 1, featured_at = ${esc(now)} WHERE id = ${esc(submissionId)} AND location_id = ${esc(locationId)}`
    );
  }
}

export async function approveSubmission(id: string, reviewedBy: string, publicUrl: string): Promise<void> {
  const now = new Date().toISOString();
  await runQuery(
    `UPDATE photo_submissions SET status = 'approved', reviewed_by = ${esc(reviewedBy)}, reviewed_at = ${esc(now)}, photo_public_url = ${esc(publicUrl)} WHERE id = ${esc(id)}`
  );
}

export async function rejectSubmission(id: string, reviewedBy: string, reason: string, note: string | null): Promise<void> {
  const now = new Date().toISOString();
  await runQuery(
    `UPDATE photo_submissions SET status = 'rejected', reviewed_by = ${esc(reviewedBy)}, reviewed_at = ${esc(now)}, rejection_reason = ${esc(reason)}, rejection_note = ${esc(note)} WHERE id = ${esc(id)}`
  );
}

/** Record whether/who a rejection email was attempted for. */
export async function markRejectionEmail(id: string, sent: boolean, emailTo: string | null): Promise<void> {
  await runQuery(
    `UPDATE photo_submissions SET rejection_email_sent = ${sent ? 1 : 0}, rejection_email_to = ${esc(emailTo)} WHERE id = ${esc(id)}`
  );
}

export async function getSubmissionCount(): Promise<number> {
  const rows = (await runQuery("SELECT COUNT(*) as cnt FROM photo_submissions")) as { cnt: number }[];
  return rows[0]?.cnt ?? 0;
}

export async function getPendingCount(): Promise<number> {
  const rows = (await runQuery("SELECT COUNT(*) as cnt FROM photo_submissions WHERE status = 'pending'")) as { cnt: number }[];
  return rows[0]?.cnt ?? 0;
}

// ── Location queries ──

export async function getLocations(limit = 50, offset = 0): Promise<LocationRecord[]> {
  return (await runQuery(
    `SELECT * FROM locations ORDER BY city, movie_or_show LIMIT ${Number(limit)} OFFSET ${Number(offset)}`
  )) as LocationRecord[];
}

export async function getLocationById(id: string): Promise<LocationRecord | null> {
  const rows = (await runQuery(
    `SELECT * FROM locations WHERE id = ${esc(id)}`
  )) as LocationRecord[];
  return rows.length > 0 ? rows[0] : null;
}

export async function getLocationsByCity(city: string): Promise<LocationRecord[]> {
  return (await runQuery(
    `SELECT * FROM locations WHERE city = ${esc(city)} ORDER BY movie_or_show, title`
  )) as LocationRecord[];
}

export async function getLocationsNearby(lat: number, lng: number, radiusMiles = 5): Promise<LocationRecord[]> {
  const sql = `
    SELECT *,
      (3959 * acos(
        cos(radians(${lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${lng})) +
        sin(radians(${lat})) * sin(radians(latitude))
      )) AS distance
    FROM locations
    WHERE distance < ${radiusMiles}
    ORDER BY distance
  `;
  return (await runQuery(sql)) as LocationRecord[];
}

export async function searchLocations(query: string, searchType = "all"): Promise<LocationRecord[]> {
  const q = escLiteral(query);
  const likeClause = `(movie_or_show LIKE '%${q}%' OR title LIKE '%${q}%')`;

  let where: string;
  switch (searchType) {
    case "movie":
      where = `movie_or_show LIKE '%${q}%'`;
      break;
    case "actor":
      // Search inside actors_json using LIKE on the raw JSON string
      where = `actors_json LIKE '%${q}%'`;
      break;
    case "all":
    default:
      where = `${likeClause} OR actors_json LIKE '%${q}%'`;
      break;
  }

  return (await runQuery(
    `SELECT * FROM locations WHERE ${where} ORDER BY movie_or_show, title LIMIT 100`
  )) as LocationRecord[];
}

export async function getRecentLocations(hours = 120): Promise<LocationRecord[]> {
  const h = Number(hours);
  const safeHours = Number.isFinite(h) && h > 0 && h <= 24 * 365 ? h : 120;
  return (await runQuery(
    `SELECT * FROM locations
     WHERE added_at IS NOT NULL
       AND added_at >= strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-${safeHours} hours')
     ORDER BY added_at DESC
     LIMIT 100`
  )) as LocationRecord[];
}

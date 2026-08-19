// ── Research config store ──
// Lives in Turso table `research_config` (key/value) so caps can be changed
// server-side WITHOUT an app build. The worker reads this at each poll; the
// Admin API exposes GET/PUT /api/research/config.
import { runQuery } from "../db";
import { DEFAULT_CONFIG, type ResearchConfig } from "./types";

const TABLE = "research_config";

function esc(val: string | null | undefined): string {
  if (val == null) return "NULL";
  return `'${val.replace(/'/g, "''")}'`;
}

async function ensureTable(): Promise<void> {
  await runQuery(
    `CREATE TABLE IF NOT EXISTS ${TABLE} (key TEXT PRIMARY KEY, value TEXT NOT NULL)`
  );
}

export async function getResearchConfig(): Promise<ResearchConfig> {
  await ensureTable();
  const rows = (await runQuery(`SELECT key, value FROM ${TABLE}`)) as {
    key: string;
    value: string;
  }[];
  const stored: Record<string, string> = {};
  for (const r of rows) stored[r.key] = r.value;
  const cfg: ResearchConfig = { ...DEFAULT_CONFIG };
  for (const k of Object.keys(DEFAULT_CONFIG) as (keyof ResearchConfig)[]) {
    const v = stored[k];
    if (v !== undefined) {
      if (typeof DEFAULT_CONFIG[k] === "boolean") {
        (cfg as unknown as Record<string, unknown>)[k] = v === "true" || v === "1";
      } else {
        const n = Number(v);
        if (Number.isFinite(n)) (cfg as unknown as Record<string, unknown>)[k] = n;
      }
    }
  }
  return cfg;
}

export async function setResearchConfigKey(key: string, value: string): Promise<void> {
  await ensureTable();
  if (!(key in DEFAULT_CONFIG)) {
    throw new Error(`Unknown research config key: ${key}`);
  }
  await runQuery(
    `INSERT INTO ${TABLE} (key, value) VALUES (${esc(key)}, ${esc(value)}) ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  );
}

export async function updateResearchConfig(patch: Partial<ResearchConfig>): Promise<ResearchConfig> {
  for (const [k, v] of Object.entries(patch)) {
    if (k in DEFAULT_CONFIG && v !== undefined) {
      await setResearchConfigKey(k, String(v));
    }
  }
  return getResearchConfig();
}

// ── Daily job budget counter ──
export async function incrementDailyJobCount(): Promise<number> {
  await ensureTable();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const rows = (await runQuery(
    `SELECT value FROM ${TABLE} WHERE key = 'daily_job_count'`
  )) as { value: string }[];
  const raw = rows[0]?.value;
  let date = "";
  let count = 0;
  if (raw) {
    const [d, c] = raw.split("|");
    date = d;
    count = parseInt(c || "0", 10);
  }
  if (date !== today) {
    count = 0;
    date = today;
  }
  count += 1;
  await runQuery(
    `INSERT INTO ${TABLE} (key, value) VALUES ('daily_job_count', ${esc(`${date}|${count}`)}) ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  );
  return count;
}

export async function getDailyJobCount(): Promise<{ date: string; count: number }> {
  await ensureTable();
  const today = new Date().toISOString().slice(0, 10);
  const rows = (await runQuery(
    `SELECT value FROM ${TABLE} WHERE key = 'daily_job_count'`
  )) as { value: string }[];
  const raw = rows[0]?.value;
  if (raw) {
    const [d, c] = raw.split("|");
    if (d === today) return { date: d, count: parseInt(c || "0", 10) };
  }
  return { date: today, count: 0 };
}

// ── Geocode cache (avoid re-hitting Nominatim for repeat addresses) ──
export async function getGeocodeCache(query: string): Promise<{ lat: number; lng: number; displayName: string } | null> {
  await runQuery(
    `CREATE TABLE IF NOT EXISTS research_geocode_cache (query TEXT PRIMARY KEY, lat REAL NOT NULL, lng REAL NOT NULL, display_name TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL)`
  );
  const rows = (await runQuery(
    `SELECT lat, lng, display_name FROM research_geocode_cache WHERE query = ${esc(query)}`
  )) as { lat: number; lng: number; display_name: string }[];
  return rows.length > 0 ? { lat: rows[0].lat, lng: rows[0].lng, displayName: rows[0].display_name } : null;
}

export async function setGeocodeCache(query: string, lat: number, lng: number, displayName: string): Promise<void> {
  await runQuery(
    `CREATE TABLE IF NOT EXISTS research_geocode_cache (query TEXT PRIMARY KEY, lat REAL NOT NULL, lng REAL NOT NULL, display_name TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL)`
  );
  const now = new Date().toISOString();
  await runQuery(
    `INSERT INTO research_geocode_cache (query, lat, lng, display_name, created_at) VALUES (${esc(query)}, ${lat}, ${lng}, ${esc(displayName)}, ${esc(now)}) ON CONFLICT(query) DO UPDATE SET lat = excluded.lat, lng = excluded.lng, display_name = excluded.display_name`
  );
}

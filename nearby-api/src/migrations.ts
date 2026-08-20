// ── Additive schema migrations ──
// All migrations here are ADDITIVE and idempotent: they only add columns/tables
// that don't yet exist, and never modify or drop existing data. Run once at
// server boot (and safe to run on every boot — ALTER ... ADD COLUMN is guarded
// by a pragma table_info check so re-runs are no-ops).
import { runQuery } from "./db";

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = (await runQuery(
    `SELECT name FROM pragma_table_info('${table}')`
  )) as { name: string }[];
  return rows.some((r) => r.name === column);
}

async function addColumn(
  table: string,
  column: string,
  definition: string
): Promise<void> {
  if (await columnExists(table, column)) return;
  try {
    await runQuery(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch (err: unknown) {
    // Defensive: two boots can race an ALTER (watchdog + manual launch share the
    // sandbox). If the column already landed, treat it as a no-op.
    const msg = err instanceof Error ? String(err.message) : String(err);
    if (/duplicate column name/i.test(msg)) return;
    throw err;
  }
}

/**
 * Extend the community-photo submission model with the guided contribution
 * flow fields (photo -> movie/show -> filming location -> description).
 * All additive; existing submissions keep working unchanged.
 */
export async function runMigrations(): Promise<void> {
  // ── photo_submissions: guided-contribution fields ──
  // movie/show resolution: the user picked an existing title OR proposed a new one
  await addColumn(
    "photo_submissions",
    "movie_or_show",
    "TEXT"
  );
  await addColumn(
    "photo_submissions",
    "proposed_movie_json",
    "TEXT"
  );
  // filming location resolution: the user picked an existing location OR proposed a new one
  await addColumn(
    "photo_submissions",
    "proposed_location_json",
    "TEXT"
  );
  // short description/caption ("Tell us about this spot")
  await addColumn("photo_submissions", "description", "TEXT");
  // public attribution + account identity (never expose email on the app)
  await addColumn(
    "photo_submissions",
    "submitter_uid",
    "TEXT"
  );
  await addColumn(
    "photo_submissions",
    "display_name",
    "TEXT"
  );
  await addColumn(
    "photo_submissions",
    "allow_public_credit",
    "INTEGER NOT NULL DEFAULT 1"
  );
  // rights affirmation ("I took this photo or have permission to share it")
  await addColumn(
    "photo_submissions",
    "rights_confirmed",
    "INTEGER NOT NULL DEFAULT 0"
  );
  // All community submissions are pending-only; admin approval flips status.
  // photo_kind distinguishes community vs official/studio imagery on approval.
  await addColumn(
    "photo_submissions",
    "photo_kind",
    "TEXT NOT NULL DEFAULT 'community'"
  );
  // featured flag (admin-controlled, reversible, one per location) + sort order
  await addColumn(
    "photo_submissions",
    "featured",
    "INTEGER NOT NULL DEFAULT 0"
  );
  await addColumn(
    "photo_submissions",
    "featured_at",
    "TEXT"
  );
  // Provenance / audit
  await addColumn(
    "photo_submissions",
    "source_evidence",
    "TEXT"
  );
  await addColumn(
    "photo_submissions",
    "source",
    "TEXT NOT NULL DEFAULT 'community'"
  );
}

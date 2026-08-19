// ── ONE-TIME RECOMPUTE of Priority Request coverage/status ──
// Run with DRY=1 (default, no writes) to preview, then DRY=0 to apply.
//
// For each geographic priority request (state/city/province), coverage now counts
// ONLY usable, in-target (pinned-in-region) candidates. This migration:
//   - Recomputes candidates_produced from the CURRENT Firestore candidates.
//   - Out-of-region incidental discoveries: strip the priority_request_id tag
//     (dissociate from the originating request) but keep the candidate + its real
//     geography in the research pipeline (never deleted, never duplicated).
//   - Genuine in-state leads without a usable pin: keep the tag, mark
//     verification_status = needs_research (findable/resolvable, not coverage).
//   - Sets status: completed(auto) if in-target >= target; blocked if the region
//     film list is exhausted below target; else open (worker resumes).
//   - Records completion_type ('auto' | 'manual' | NULL) on the request.
import { runQuery } from "./src/db";

const APPLY = process.env.DRY === "0";
const NOOP = (m: string) => console.log((APPLY ? "APPLY " : "DRY   ") + m);

// Abuse the server's Firestore credential from our own process env (already set).
const { readResearchCollection, writeResearchDoc } = await import("./src/research/firestore.ts");

const cands = await readResearchCollection("research_candidates", 500);
// Ensure completion_type column exists (existing tables predate it).
try { await runQuery("ALTER TABLE priority_requests ADD COLUMN completion_type TEXT"); } catch { /* exists */ }
const rows = (await runQuery("SELECT * FROM priority_requests")) as Record<string, unknown>[];

const isGeo = (kind: string) => kind === "state" || kind === "city" || kind === "province";

for (const row of rows) {
  const id = String(row.id);
  const kind = String(row.kind);
  const target = Number(row.target ?? 10);
  const filmsDone = Number(row.films_done ?? 0);
  let filmsListLen = 0;
  try { filmsListLen = JSON.parse(String(row.films_list_json ?? "[]")).length; } catch { filmsListLen = 0; }

  const tagged = cands.filter((c) => c.priority_request_id === id);

  if (!isGeo(kind)) {
    // Non-geographic (movie) request: coverage = all produced candidates (no region gate).
    const produced = tagged.length;
    NOOP(`${id}: (${kind}) tagged=${produced} target=${target} ${produced >= target ? "→ completed(auto)" : filmsDone >= filmsListLen ? "→ blocked" : "→ open"}`);
    continue;
  }

  let inTarget = 0;
  let outTarget = 0;
  let unpinnedLead = 0;
  const firestoreWrites: { id: string; data: Record<string, unknown>; reason: string }[] = [];

  for (const c of tagged) {
    const hasCoords = Number(c.latitude) !== 0 && Number(c.longitude) !== 0;
    const mismatch = String(c.research_notes ?? "").includes("Pin fell outside requested region");
    if (hasCoords) {
      inTarget++;
    } else if (mismatch) {
      outTarget++;
      firestoreWrites.push({
        id: c.id,
        data: { priority_request_id: "", priority_kind: "", priority_value: "" },
        reason: `out-of-region (${c.name}) — dissociated from ${id}, preserved`,
      });
    } else {
      unpinnedLead++;
      firestoreWrites.push({
        id: c.id,
        data: { verification_status: "needs_research" },
        reason: `in-state unpinned lead (${c.name}) — kept under ${id} as Needs Research`,
      });
    }
  }

  const exhausted = filmsDone >= filmsListLen && filmsListLen > 0;
  let newStatus: string;
  let completionType: string | null;
  if (inTarget >= target) { newStatus = "completed"; completionType = "auto"; }
  else if (exhausted) { newStatus = "blocked"; completionType = null; }
  else { newStatus = "open"; completionType = null; }

  console.log("");
  NOOP(`${id} :: in-target=${inTarget} out-of-region=${outTarget} in-state-unpinned-leads=${unpinnedLead} :: candidates_produced ${row.candidates_produced} -> ${inTarget}, target=${target}`);
  NOOP(`  status ${row.status} -> ${newStatus} (completion_type=${completionType ?? "NULL"}), films ${filmsDone}/${filmsListLen} exhausted=${exhausted}`);
  for (const w of firestoreWrites) NOOP(`  firestore ${w.id}: ${w.reason}`);

  if (!APPLY) continue;

  // Update Firestore candidate docs.
  const writeErrors: string[] = [];
  for (const w of firestoreWrites) {
    try {
      await writeResearchDoc("research_candidates", w.id, w.data);
    } catch (e) {
      writeErrors.push(`${w.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (writeErrors.length) console.error("  Firestore write errors:", writeErrors.join("; "));

  // Update the Turso priority_requests row.
  const now = new Date().toISOString();
  const sets = [
    `candidates_produced = ${inTarget}`,
    `status = '${newStatus}'`,
    `completion_type = ${completionType ? `'${completionType}'` : "NULL"}`,
    `completed_at = ${newStatus === "completed" ? `'${now}'` : "NULL"}`,
    `last_error = NULL`,
    `updated_at = '${now}'`,
  ];
  await runQuery(`UPDATE priority_requests SET ${sets.join(", ")} WHERE id = '${id.replace(/'/g, "''")}'`);
  NOOP(`  turso updated: ${id}`);
}

console.log("");
console.log(APPLY ? "APPLIED." : "DRY RUN (no writes). Set DRY=0 to apply.");

// ── Seed Data ──
// Populates the photo_submissions table with sample data for testing.
import { execSync } from "node:child_process";

const TEAM_DB = "/usr/local/bin/team-db";

function run(sql: string) {
  try {
    execSync(`${TEAM_DB} "${sql.replace(/"/g, '\\"')}"`, { encoding: "utf-8" });
  } catch (err) {
    console.error("Seed error:", err);
  }
}

function esc(val: string | null | undefined): string {
  if (val == null) return "NULL";
  return `'${val.replace(/'/g, "''")}'`;
}

const submissions = [
  {
    id: "demo-001",
    app_name: "Scene Nearby",
    location_id: "dal-001",
    location_name: "Texas Theatre",
    user_info: "cinephile_jane",
    photo_path: "submissions/Scene Nearby/dal-001_demo1.jpg",
    comment: "The marquee looks amazing at sunset!",
    status: "pending",
  },
  {
    id: "demo-002",
    app_name: "Scene Nearby",
    location_id: "nyc-001",
    location_name: "Empire State Building",
    user_info: "nyc_shooter",
    photo_path: "submissions/Scene Nearby/nyc-001_demo2.jpg",
    comment: "Classic angle from 5th Ave",
    status: "approved",
  },
  {
    id: "demo-003",
    app_name: "Scene Nearby",
    location_id: "syd-005",
    location_name: "Sydney Harbour Bridge",
    user_info: "ozzie_films",
    photo_path: "submissions/Scene Nearby/syd-005_demo3.jpg",
    comment: "The bridge from the Opera House steps",
    status: "needs_review",
  },
  {
    id: "demo-004",
    app_name: "Music Nearby",
    location_id: "ms-001",
    location_name: "Paisley Park",
    user_info: "purple_rain",
    photo_path: "submissions/Music Nearby/ms-001_demo4.jpg",
    comment: "Prince's legacy lives here",
    status: "pending",
  },
];

const now = new Date().toISOString();

for (const sub of submissions) {
  const sql = `INSERT OR IGNORE INTO photo_submissions (id, app_name, location_id, location_name, user_info, photo_path, comment, submitted_at, status) VALUES (${esc(sub.id)}, ${esc(sub.app_name)}, ${esc(sub.location_id)}, ${esc(sub.location_name)}, ${esc(sub.user_info)}, ${esc(sub.photo_path)}, ${esc(sub.comment)}, ${esc(now)}, ${esc(sub.status)})`;
  run(sql);
}

console.log(`Seeded ${submissions.length} sample submissions`);
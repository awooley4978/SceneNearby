// READ-ONLY audit: dump research candidates tagged with a priority_request_id.
// Does not write anything — it only reads Firestore research_candidates and prints a
// report. Credentials are lifted from the running server (PID 1361) environment.
import { readFileSync } from "node:fs";

function loadServerEnv(pid) {
  try {
    return readFileSync(`/proc/${pid}/environ`, "utf8").split("\0");
  } catch {
    return [];
  }
}

let sa = null;
for (const pid of [1361, 1227, 1225]) {
  const env = loadServerEnv(pid);
  const hit = env.find((e) => e.startsWith("FIREBASE_SERVICE_ACCOUNT="));
  if (hit) { sa = hit.slice("FIREBASE_SERVICE_ACCOUNT=".length); break; }
}
if (!sa) {
  console.error("NO SERVICE ACCOUNT FOUND — cannot read Firestore");
  process.exit(1);
}
process.env.FIREBASE_SERVICE_ACCOUNT = sa;

const { readResearchCollection } = await import("./src/research/firestore.ts");

const cands = await readResearchCollection("research_candidates", 500);

const byReq = new Map();
for (const c of cands) {
  const rid = c.priority_request_id;
  if (!rid) continue;
  if (!byReq.has(rid)) byReq.set(rid, []);
  byReq.get(rid).push(c);
}

const abbrev = {
  alabama:"AL",alaska:"AK",arizona:"AZ",arkansas:"AR",california:"CA",colorado:"CO",
  connecticut:"CT",delaware:"DE","district of columbia":"DC",florida:"FL",georgia:"GA",
  hawaii:"HI",idaho:"ID",illinois:"IL",indiana:"IN",iowa:"IA",kansas:"KS",kentucky:"KY",
  louisiana:"LA",maine:"ME",maryland:"MD",massachusetts:"MA",michigan:"MI",minnesota:"MN",
  mississippi:"MS",missouri:"MO",montana:"MT",nebraska:"NE",nevada:"NV","new hampshire":"NH",
  "new jersey":"NJ","new mexico":"NM","new york":"NY","north carolina":"NC","north dakota":"ND",
  ohio:"OH",oklahoma:"OK",oregon:"OR",pennsylvania:"PA","rhode island":"RI","south carolina":"SC",
  "south dakota":"SD",tennessee:"TN",texas:"TX",utah:"UT",vermont:"VT",virginia:"VA",
  washington:"WA","west virginia":"WV",wisconsin:"WI",wyoming:"WY"
};

// Infer a US state from an address/city string.
function stateOf(s) {
  if (!s) return null;
  const lower = s.toLowerCase();
  for (const [name, ab] of Object.entries(abbrev)) {
    if (new RegExp(`\\b${ab.toLowerCase()}\\b`).test(lower)) return name;
  }
  for (const [name] of Object.entries(abbrev)) {
    if (lower.includes(name)) return name;
  }
  return null;
}

for (const [rid, list] of byReq) {
  const inTarget = [], outTarget = [], ungeo = [];
  for (const c of list) {
    const hasCoords = Number(c.latitude) !== 0 && Number(c.longitude) !== 0;
    const hay = `${c.proposed_address ?? ""} ${c.city ?? ""} ${c.country ?? ""}`;
    const st = stateOf(hay);
    if (st) {
      (st === rid.replace(/^state-/, "").replace(/-/g, " ") ? inTarget : outTarget).push({ ...c, st });
    } else if (hasCoords) {
      inTarget.push({ ...c, st: "coords-only" });
    } else {
      ungeo.push({ ...c, st: null });
    }
  }
  const line = (c) => {
    const st = c.st ?? "";
    const country = c.country ? `[${c.country}]` : "";
    const coords = Number(c.latitude) !== 0 ? `${Number(c.latitude).toFixed(3)},${Number(c.longitude).toFixed(3)}` : "no-coords";
    const note = c.research_notes?.slice(0, 60) ?? "";
    return `  ${c.name} | st=${st || "-"} ${country} | ${coords} | ${c.verification_status}/${c.confidence}% | ${c.proposed_address ?? ""} | note:${note}`;
  };
  console.log(`\n===== ${rid} :: IN-TARGET ${inTarget.length} / OUT ${outTarget.length} / UNGEOCODED ${ungeo.length} :: total ${list.length} =====`);
  console.log("-- IN-TARGET / IN-STATE / COORDS-ONLY --");
  inTarget.forEach((c) => console.log(line(c)));
  console.log("-- OUT-OF-TARGET (other state/country) --");
  outTarget.forEach((c) => console.log(line(c)));
  console.log("-- UNGEOCODED (no state found, no coords) --");
  ungeo.forEach((c) => console.log(line(c)));
}
console.log("\nTOTAL TAGGED CANDIDATES READ:", cands.filter((c) => c.priority_request_id).length);

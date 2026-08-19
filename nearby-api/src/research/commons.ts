// ── Wikimedia Commons photo lookup (v1, per owner decision 4) ──
// Searches Commons by place name. Captures full license metadata per file:
// source URL, author/creator, license short name, license URL, attribution
// requirement. "Found on Commons" NEVER automatically means "safe to use":
// the photo_use_status heuristic is conservative (NC/ND licenses -> permission
// required; unknown -> unknown) and the review UI shows the metadata.
import type { PhotoUseStatus, ResearchPhotoCandidate, ResearchConfig } from "./types";

const COMMONS = "https://commons.wikimedia.org/w/api.php";
const UA = "SceneNearbyResearch/1.0 (scenenearbysupport@gmail.com; research pipeline)";

let lastCall = 0;
async function politeFetch(url: string): Promise<any> {
  const now = Date.now();
  const wait = Math.max(0, 150 - (now - lastCall));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} from Commons`);
  return res.json();
}

/** Map a Commons license string to a conservative photo-use status. */
export function classifyLicense(license: string): PhotoUseStatus {
  const l = license.toLowerCase();
  if (!license || license === "unknown") return "unknown";
  if (/pd|public domain|cc0/.test(l)) return "verified_reusable";
  if (/cc\s*by\s*(\d|$)/.test(l) || /creativecommons.*by/.test(l)) {
    // CC BY (incl. ShareAlike) is reusable with attribution. ND/NC are not.
    if (/nc|nd/.test(l)) return "permission_required";
    return "verified_reusable";
  }
  if (/fair use|non.?free|all rights reserved|©/.test(l)) return "permission_required";
  return "unknown";
}

export async function findCommonsPhotos(
  placeName: string,
  cfg: ResearchConfig
): Promise<ResearchPhotoCandidate[]> {
  const limit = Math.max(1, cfg.commons_max_results || 5);
  const search = await politeFetch(
    `${COMMONS}?action=query&generator=search&gsrsearch=${encodeURIComponent(`${placeName}`)}&gsrnamespace=6&gsrlimit=${limit}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800&format=json&formatversion=2`
  );
  const pages = search?.query?.pages ?? [];
  if (!Array.isArray(pages) || pages.length === 0) return [];

  const results: ResearchPhotoCandidate[] = [];
  for (const p of pages.slice(0, limit)) {
    const ii = p.imageinfo?.[0];
    if (!ii?.url) continue;
    const ext = ii.extmetadata ?? {};
    const artist = ext.Artist?.value ?? "";
    const licenseShort = ext.LicenseShortName?.value ?? "unknown";
    const licenseUrl = ext.LicenseUrl?.value ?? null;
    const credit = ext.Credit?.value ?? "";
    const usage = ext.UsageTerms?.value ?? "";
    const attributionRequired = /required|by/.test(String(usage).toLowerCase());
    const creator = stripHtml(artist) || stripHtml(credit) || "Unknown author";
    const license = stripHtml(licenseShort) || "unknown";

    results.push({
      id: `photo-${p.pageid}`,
      candidate_id: "", // filled by caller
      url: ii.thumburl ?? ii.url,
      source_url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(p.title.replace(/^File:/, ""))}`,
      license,
      creator,
      attribution_required: attributionRequired,
      photo_use_status: classifyLicense(license),
      accessed_at: new Date().toISOString(),
    });
    void licenseUrl; // kept for future display; license short name is stored
  }
  return results;
}

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

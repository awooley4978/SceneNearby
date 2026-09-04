// ── Trusted reference sources ──
// Owner-designated (2026-09-02) authoritative filming-location references:
//   - Atlas of Wonders                      — atlasofwonders.com
//   - The Worldwide Guide to Movie Locations — movie-locations.com
//
// The +10 trusted-source confidence signal is awarded ONLY when a page on one of
// these sites specifically identifies a physical filming location for the title
// being researched. A domain appearing somewhere is NOT enough: the page must be
// about the title AND the page's location text must mention the specific place.
// IMDb (or any other domain) never earns the trusted bonus.
import type { RawLocationMention } from "./types";

const UA = "SceneNearbyResearch/1.0 (scenenearbysupport@gmail.com; research pipeline)";

export interface TrustedMatch {
  /** The canonical page URL on the trusted site for this title. */
  pageUrl: string;
  /** Normalized location names corroborated by that page for this title. */
  locations: string[];
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

let lastCall = 0;
async function politeFetch(url: string): Promise<string | null> {
  const now = Date.now();
  const wait = Math.max(0, 250 - (now - lastCall));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Fuzzy title match: normalized equality, containment, or >=80% token overlap. */
function titleMatches(titleA: string, titleB: string): boolean {
  const a = norm(titleA);
  const b = norm(titleB);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const ta = a.split(" ");
  const tb = b.split(" ");
  const overlap = ta.filter((t) => tb.includes(t)).length;
  return overlap / Math.max(ta.length, tb.length) >= 0.8;
}

// ── Atlas of Wonders (Blogger JSON search feed) ──
async function fetchAtlas(title: string): Promise<TrustedMatch | null> {
  const url = `https://www.atlasofwonders.com/feeds/posts/default?q=${encodeURIComponent(
    title
  )}&alt=json&max-results=3`;
  const raw = await politeFetch(url);
  if (!raw) return null;
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  const entries: any[] = data?.feed?.entry ?? [];
  for (const e of entries) {
    const t = typeof e?.title?.$t === "string" ? decodeEntities(e.title.$t) : "";
    const link = Array.isArray(e?.link)
      ? e.link.find((l: any) => l?.rel === "alternate")?.href
      : undefined;
    if (!t || !link) continue;
    // AOW titles read "Where was <Title> filmed? ...". Match against the bare
    // title to avoid false positives on recommendations for other productions.
    if (!titleMatches(t.replace(/^where\s+was\s+/i, ""), title) && !titleMatches(t, title)) continue;
    const content = typeof e?.content?.$t === "string" ? e.content.$t : "";
    const text = stripHtml(decodeEntities(content));
    // Extract likely venue names (capitalized runs ending in a place suffix).
    const locations = extractVenueNames(text);
    if (locations.length > 0) return { pageUrl: link, locations };
  }
  return null;
}

// ── The Worldwide Guide to Movie Locations (letter index -> film page) ──
async function fetchMovieLocations(title: string): Promise<TrustedMatch | null> {
  const first = title.trim().replace(/^(the|a|an)\s+/i, "").charAt(0).toLowerCase() || "0";
  const letter = /[a-z]/.test(first) ? first : "0";
  const indexUrl = `https://www.movie-locations.com/movies/${letter}/${letter}-movies.php`;
  const indexRaw = await politeFetch(indexUrl);
  if (!indexRaw) return null;

  // Map slug -> anchor text from the letter index.
  const candidates: { href: string; text: string }[] = [];
  const anchorRe = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(indexRaw)) !== null) {
    const href = m[1];
    const text = decodeEntities(stripHtml(m[2])).trim();
    // Film links on the letter index are bare relative hrefs ("Dark-Knight.php"),
    // not "movies/d/Dark-Knight.php". Nav/index links carry a "/" and are excluded.
    if (!/^[^/]+\.php$/i.test(href)) continue;
    if (/[a-z0-9]-movies\.php$/i.test(href)) continue; // skip the index itself
    candidates.push({ href, text });
  }

  // Prefer an anchor-text title match; fall back to slug match.
  let pagePath: string | null = null;
  for (const c of candidates) {
    if (c.text && titleMatches(c.text, title)) {
      pagePath = c.href;
      break;
    }
  }
  if (!pagePath) {
    const slug = slugify(title);
    for (const c of candidates) {
      const last = c.href.split("/").pop() ?? "";
      const slugNoExt = last.replace(/\.php$/i, "");
      if (slugNoExt === slug || titleMatches(slugNoExt.replace(/-/g, " "), title)) {
        pagePath = c.href;
        break;
      }
    }
  }
  if (!pagePath) return null;

  const pageUrl = pagePath.startsWith("http")
    ? pagePath
    : `https://www.movie-locations.com/movies/${letter}/${pagePath.replace(/^\//, "")}`;
  const pageRaw = await politeFetch(pageUrl);
  if (!pageRaw) return null;

  // Page body text; confirm it is about the title, then extract venue names.
  const text = stripHtml(pageRaw);
  if (!titleMatches(extractPageTitle(pageRaw) || "", title) && !text.toLowerCase().includes(norm(title))) {
    return null;
  }
  const locations = extractVenueNames(text);
  if (locations.length === 0) return null;
  return { pageUrl, locations };
}

function extractPageTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(stripHtml(m[1])) : "";
}

const PLACE_SUFFIX =
  /(?:Center|Centre|Building|Bridge|Pier|Station|Hotel|Theatre|Theater|Arena|Stadium|Tower|Hall|House|Park|Street|Avenue|Road|Drive|Boulevard|Blvd|Plaza|Square|Factory|Studios?|Offices?|Post Office|Courthouse|Tunnel|Airport|Museum|Library|Church|Cathedral|Temple|Mosque|Mall|Market|Docks?|Harbou?r|Plant|Mill|Warehouse|Depot|Terminal|Loop|District|University|School|Hospital|Club|Castle|Palace|Monastery|Abbey|Garden|Gardens|Island|Beach|Bay|Lake|River|Canyon|Mountain|Peak|Valley|Highway|Freeway|Interstate|Creek|Trail|Field|Farm|Ranch|Peninsula|Cliff|Falls|Springs|Mills|Gardens)$/;

/** Best-effort venue-name extraction from free text. Capitalized 2-5 word runs
 * ending in a venue suffix. Used only to CORROBORATE an existing candidate name,
 * never to mint new candidates. */
function extractVenueNames(text: string): string[] {
  const out = new Set<string>();
  const re = /\b([A-Z][a-zA-Z0-9'&.\-]*(?:\s+[A-Z][a-zA-Z0-9'&.\-]*){0,4}\s+(?:Center|Centre|Building|Bridge|Pier|Station|Hotel|Theatre|Theater|Arena|Stadium|Tower|Hall|House|Park|Street|Avenue|Road|Drive|Boulevard|Blvd|Plaza|Square|Factory|Studios?|Offices?|Post Office|Courthouse|Tunnel|Airport|Museum|Library|Church|Cathedral|Temple|Mosque|Mall|Market|Docks?|Harbou?r|Plant|Mill|Warehouse|Depot|Terminal|Loop|District|University|School|Hospital|Club|Castle|Palace|Monastery|Abbey|Garden|Gardens|Island|Beach|Bay|Lake|River|Canyon|Mountain|Peak|Valley|Highway|Freeway|Interstate|Creek|Trail|Field|Farm|Ranch|Peninsula|Cliff|Falls|Springs|Mills))\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const name = m[1].trim();
    if (name.length >= 3 && name.length <= 60 && PLACE_SUFFIX.test(name)) out.add(name);
  }
  return [...out];
}

/** Query both trusted sites for the title and return any matches. */
export async function queryTrustedSources(title: string): Promise<TrustedMatch[]> {
  const [a, m] = await Promise.all([fetchAtlas(title), fetchMovieLocations(title)]);
  return [a, m].filter((x): x is TrustedMatch => x !== null);
}

/** Build trusted-reference mentions from the trusted pages. Each trusted page
 * contributes a distinct mention per location it names for this title, so a
 * location found only on a trusted site becomes a minted candidate, and one also
 * found on Wikipedia/Wikidata merges into a single candidate with multiple
 * corroborating sources. */
export function trustedMentionsFromMatches(matches: TrustedMatch[]): RawLocationMention[] {
  const out: RawLocationMention[] = [];
  const seen = new Set<string>();
  for (const match of matches) {
    for (const loc of match.locations) {
      const key = `${match.pageUrl}::${norm(loc)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        name: loc,
        sourceUrl: match.pageUrl,
        sourceTitle: "Trusted filming-location reference",
        sourceKind: "trusted-reference",
        note: `Trusted reference names "${loc}" for this title.`,
      });
    }
  }
  return out;
}

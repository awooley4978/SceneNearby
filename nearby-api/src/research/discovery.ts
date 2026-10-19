// ── Metadata + candidate discovery: Wikipedia + Wikidata (NO TMDB) ──
// Uses only keyless, commercial-safe sources:
//   - Wikipedia (MediaWiki API) — "Filming locations" sections, infoboxes
//   - Wikidata (wbgetentities + SPARQL-ish P915 query) — filming locations
// Politeness: one request at a time, ~200ms gap, identifying UA, max 25 raw
// mentions per job (config.wikipedia_max_candidates).
import type { MovieType, RawLocationMention } from "./types";

const UA = "SceneNearbyResearch/1.0 (scenenearbysupport@gmail.com; research pipeline)";
const EN_WIKI = "https://en.wikipedia.org/w/api.php";
const WIKIDATA = "https://www.wikidata.org/w/api.php";

let lastCall = 0;
async function politeFetch(url: string): Promise<any> {
  const now = Date.now();
  const wait = Math.max(0, 200 - (now - lastCall));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url.split("?")[0]}`);
  return res.json();
}

export interface ResolvedTitle {
  title: string;
  year: number;
  type: MovieType;
  wikipediaTitle: string | null;
  wikipediaUrl: string | null;
  wikidataId: string | null;
  cast: string[];
  director: string | null;
  plot: string | null;
  filmingLocations: string[];
  /** Per-location source provenance: which of wikidata vs wikipedia-section
   *  supplied each filming location (for distinct-source counting). */
  locationSources: { name: string; kind: "wikidata" | "wikipedia-section" }[];
  /** City/region context from section titles ("Filming in Chicago" -> ["Chicago"]). */
  filmingContexts: string[];
}

/** Resolve a title+year to Wikipedia/Wikidata with metadata. */
export async function resolveTitle(title: string, year: number, type: MovieType): Promise<ResolvedTitle> {
  const out: ResolvedTitle = {
    title,
    year,
    type,
    wikipediaTitle: null,
    wikipediaUrl: null,
    wikidataId: null,
    cast: [],
    director: null,
    plot: null,
    filmingLocations: [],
    locationSources: [],
    filmingContexts: [],
  };

  const wikidataLocations: string[] = [];
  const wikipediaLocations: string[] = [];

  // 1. Search Wikipedia for the title (+year when present).
  const searchQuery = `${title}${year ? ` ${year}` : ""} ${type === "show" ? "TV series" : "film"}`;
  const search = await politeFetch(
    `${EN_WIKI}?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&srlimit=5&format=json&formatversion=2`
  );
  const hits = search?.query?.search ?? [];
  if (hits.length === 0) return out;

  // Prefer a hit whose title contains the year (disambiguation safety).
  let best = hits[0];
  for (const h of hits) {
    if (String(year) && h.title.includes(String(year))) {
      best = h;
      break;
    }
  }
  out.wikipediaTitle = best.title;
  out.wikipediaUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(best.title.replace(/ /g, "_"))}`;

  // 2. Pageprops -> Wikidata id + categories (type check).
  const props = await politeFetch(
    `${EN_WIKI}?action=query&prop=pageprops|categories&titles=${encodeURIComponent(best.title)}&format=json&formatversion=2&cllimit=50`
  );
  const page = props?.query?.pages?.[0];
  const wdId = page?.pageprops?.wikibase_item ?? null;
  out.wikidataId = wdId;

  // 3. Wikidata entity: P31 (instance of), P161 (cast), P57 (director), P915 (filming location), P577 (date).
  if (wdId) {
    const ent = await politeFetch(
      `${WIKIDATA}?action=wbgetentities&ids=${wdId}&props=claims|labels|sitelinks&format=json&languages=en`
    );
    const claims = ent?.entities?.[wdId]?.claims ?? {};
    const enLabel = (q: string): string => {
      const c = claims?.[q];
      if (!c) return "";
      const first = c[0]?.mainsnak?.datavalue?.value;
      if (typeof first === "string") return first;
      if (typeof first?.id === "string") return first.id; // entity id; label resolved later
      return "";
    };
    // P577 publication date -> year sanity
    const pubDate = enLabel("P577");
    if (pubDate && /\d{4}/.test(pubDate)) {
      const pubYear = parseInt(pubDate.match(/\d{4}/)![0], 10);
      if (year === 0) out.year = pubYear;
    }
    // P161 cast (entities) -> resolve labels via batch
    const castIds: string[] = [];
    for (const c of claims["P161"] ?? []) {
      const v = c?.mainsnak?.datavalue?.value;
      if (v?.id) castIds.push(v.id);
    }
    const dirVal = claims["P57"]?.[0]?.mainsnak?.datavalue?.value;
    if (dirVal?.id) castIds.push(dirVal.id); // resolve director alongside cast
    // P915 filming locations (entities)
    const filmIds: string[] = [];
    for (const c of claims["P915"] ?? []) {
      const v = c?.mainsnak?.datavalue?.value;
      if (v?.id) filmIds.push(v.id);
    }
    // Resolve entity ids -> English labels
    const labels = await resolveLabels([...new Set(castIds.concat(filmIds))]);
    for (const id of castIds) {
      const nm = labels.get(id);
      if (nm && nm !== id) {
        if (dirVal?.id === id) out.director = nm;
        else out.cast.push(nm);
      }
    }
    out.cast = out.cast.slice(0, 12);
    for (const id of filmIds) {
      const nm = labels.get(id);
      if (nm && nm !== id) wikidataLocations.push(nm);
    }
    // P364 / P921? plot comes from Wikipedia extract instead (below).
  }

  // 3b. Wikipedia intro extract (short plot summary).
  const extract = await politeFetch(
    `${EN_WIKI}?action=query&prop=extracts&explaintext=1&exintro=1&titles=${encodeURIComponent(best.title)}&format=json&formatversion=2`
  );
  const exPage = extract?.query?.pages?.[0];
  if (exPage?.extract) out.plot = exPage.extract.slice(0, 1500);

  // 4. Wikipedia "Filming locations" / "Filming" section (bullet parse, link-aware).
  const sections = await politeFetch(
    `${EN_WIKI}?action=parse&prop=sections&page=${encodeURIComponent(best.title)}&format=json&formatversion=2`
  );
  const secList = sections?.parse?.sections ?? [];
  // Capture city/region context from ALL filming-ish section titles
  // ("Filming in Chicago" -> "Chicago"; "Filming in England and Hong Kong" -> "England","Hong Kong").
  for (const s of secList) {
    const title = s.line;
    const m = title.match(/^filming\s+(?:locations?\s+)?(?:in|at|around|near|on)\s+(.+)$/i);
    if (!m) continue;
    for (const part of m[1].split(/\s+(?:and|&|,)\s+/i)) {
      const ctx = part.replace(/[()[\]{}]/g, "").trim();
      if (ctx && ctx.length >= 2 && ctx.length <= 40) out.filmingContexts.push(ctx);
    }
  }
  out.filmingContexts = [...new Set(out.filmingContexts)].slice(0, 6);
  const filmSec = pickFilmingSection(secList);
  if (filmSec) {
    const secText = await politeFetch(
      `${EN_WIKI}?action=parse&prop=wikitext&page=${encodeURIComponent(best.title)}&section=${filmSec.index}&format=json&formatversion=2`
    );
    const wikitext = secText?.parse?.wikitext ?? "";
    for (const place of extractFilmingPlaces(wikitext)) wikipediaLocations.push(place);
  }

  // Preserve source provenance for distinct-source counting while exposing a
  // merged, deduped list for callers' "did we find any locations?" check.
  out.filmingLocations = [...new Set([...wikidataLocations, ...wikipediaLocations].filter(Boolean))].slice(0, 25);
  for (const name of wikidataLocations) {
    if (name && !out.locationSources.some((s) => s.name === name && s.kind === "wikidata")) {
      out.locationSources.push({ name, kind: "wikidata" });
    }
  }
  for (const name of wikipediaLocations) {
    if (name && !out.locationSources.some((s) => s.name === name && s.kind === "wikipedia-section")) {
      out.locationSources.push({ name, kind: "wikipedia-section" });
    }
  }
  return out;
}

/**
 * Choose the best section for filming locations.
 * Scoring: "Filming locations" > "Filming" / "Locations" > "Production" (fallback).
 * Returns null when nothing plausible exists.
 */
function pickFilmingSection(secList: Array<{ index: string; line: string }>): { index: string; line: string } | null {
  let best: { index: string; line: string } | null = null;
  let bestScore = 0;
  for (const s of secList) {
    const title = s.line;
    let score = 0;
    if (/filming locations?/i.test(title)) score = 5;
    else if (/^filming\b/i.test(title)) score = 4; // "Filming", "Filming in Chicago", "Filming in England and Hong Kong"
    else if (/locations?/i.test(title)) score = 3;
    else if (/production/i.test(title)) score = 1; // last-resort fallback only
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return bestScore >= 3 ? best : null; // require at least a locations/filming section
}

/**
 * Extract specific place names from a filming-locations section's wikitext.
 * Strategy (most specific first):
 *   1. Wiki-linked place names — editors link the actual location, so links
 *      are the strongest signal ("[[Old Chicago Main Post Office]]").
 *      In BULLETS, any place-ish link is accepted; in PROSE, only links whose
 *      name ends in a venue suffix ("Navy Pier", "Wacker Drive",
 *      "One Illinois Center") — this rejects people and media titles.
 *   2. Named-place phrase in unlinked bullets ("One Illinois Center").
 * Prose sentences, image captions, people, and media titles are dropped.
 */
export function extractFilmingPlaces(wikitext: string): string[] {
  const places: string[] = [];
  const lines = wikitext.split(/\n+/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || /^[|{=!]/.test(line)) continue; // tables, templates, headers

    const body = line
      .replace(/^[*#:]+/, "")
      .replace(/<ref[^>]*>.*?<\/ref>/g, "") // drop refs
      .replace(/<ref[^>]*\/>/g, "")
      .replace(/\{\{[^{}]*\}\}/g, "") // drop templates
      .replace(/''+/g, "")
      .trim();
    if (!body) continue;

    const isBullet = /^[*#:]/ .test(line);
    const linked = extractWikilinkPlaces(body, isBullet);
    if (linked.length > 0) {
      for (const l of linked) places.push(l);
      continue;
    }

    // Unlinked bullet: pull a named-place phrase (e.g. "One Illinois Center").
    if (isBullet) {
      const named = namedPlacePhrase(body);
      if (named) places.push(named);
    }
  }
  return [...new Set(places)];
}

const NON_PLACE_DISAMBIG =
  /\((?:film|television series|TV series|TV program|television program|novel|album|song|soundtrack|character|video game|book|play|musical|comics?|franchise|series|episode|magazine|newspaper|company|band|game|film series|short film|documentary|episode|season)\)/i;

/** Suffixes that mark a wiki-link target as a real venue/place. */
const PLACE_SUFFIX =
  /(?:Center|Centre|Building|Bridge|Pier|Station|Hotel|Theatre|Theater|Arena|Stadium|Tower|Hall|House|Park|Street|Avenue|Road|Drive|Boulevard|Blvd|Plaza|Square|Factory|Studios?|Offices?|Post Office|Courthouse|Tunnel|Airport|Museum|Library|Church|Cathedral|Temple|Mosque|Mall|Market|Docks?|Harbou?r|Plant|Mill|Warehouse|Depot|Terminal|Loop|District|University|School|Hospital|Club|Castle|Palace|Monastery|Abbey|Garden|Island|Beach|Bay|Lake|River|Canyon|Mountain|Peak|Valley|Highway|Freeway|Interstate|Creek|Trail|Field|Farm|Ranch|Peninsula|Cliff|Falls|Springs|Mills|Gardens)$/i;

/** True when the name looks like a specific venue (has a venue suffix). */
export function isVenueName(name: string): boolean {
  return PLACE_SUFFIX.test(name.trim());
}

/** Words/phrases that mark a string as prose rather than a place name.
 *  Applied at the candidate-pipeline entry so fragments like
 *  "principal photography took place at" never become candidates. */
const PROSE_FRAGMENT =
  /\b(?:was|were|filmed|shot|took|takes|took place|takes place|scenes?|sequences?|footage|production|principal photography|mostly|partly|portions?|sections?|segments?|features?|featuring|includes?|including|during|while|where|which|after|before|along|across|between|among|over|under|near|around|outside|inside|onto|into|from the|on the|in the|at the|used (?:for|as)|served as|doubled for|stood in|was built|was constructed)\b/i;

/** True when the string reads like a sentence fragment, not a place name. */
export function isProseFragment(name: string): boolean {
  const n = name.trim();
  if (!n || n.length < 2) return true;
  if (/[.!?]$/.test(n)) return true; // ends like a sentence
  if (/, (?:the|a|an|which|where|with|for|from|and|while)\b/.test(n)) return true; // clause, not a name
  return PROSE_FRAGMENT.test(n);
}

/** Extract wiki-link targets that plausibly name a place. */
function extractWikilinkPlaces(body: string, isBullet: boolean): string[] {
  const out: string[] = [];
  const re = /\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    let target = m[1].trim();
    if (!target || target.length < 3 || target.length > 90) continue;
    if (/^(?:File|Image|Category|Wikipedia|Help|Template):/i.test(target)) continue;
    if (NON_PLACE_DISAMBIG.test(target)) continue;
    // Prefer the display text ("[[Illinois Center|One Illinois Center]]" -> "One Illinois Center").
    let name = m[2] ? m[2].trim() : target;
    name = name.replace(/\s*\([^)]*\)\s*$/, "").trim(); // strip trailing disambiguation
    if (!name) continue;
    if (name.length < 3) continue;
    // In prose, require a venue suffix to reject people/media titles
    // ("[[Ledger]]", "[[Principal photography]]", "[[The Prestige]]").
    if (!isBullet && !PLACE_SUFFIX.test(name)) continue;
    out.push(name);
  }
  return out;
}

/** Named-place phrase from an unlinked bullet (e.g. "the lobby of One Illinois Center"). */
function namedPlacePhrase(body: string): string | null {
  // Strip leading sentence filler common in filming bullets.
  const cleaned = body
    .replace(/^(?:filming|principal photography|the (?:first|main|opening|final)|much of|parts of|scenes?|sequences?|footage|interiors?|exteriors?)\b.*?(?:took place|was filmed|were filmed|was shot|were shot|takes place|occurs?|is set|was set|were set|used|features?|includes?|also)\s+(?:at|in|inside|outside|near|around|on)\s+(?:the\s+)?/i, "")
    .trim();
  const m = cleaned.match(/^([A-Z][A-Za-z0-9 .'&’-]*(?:(?:Center|Centre|Building|Bridge|Pier|Station|Hotel|Theatre|Theater|Arena|Stadium|Tower|Hall|House|Park|Street|Avenue|Road|Drive|Boulevard|Blvd|Plaza|Square|Factory|Studios?|Offices?|Post Office|Courthouse|Tunnel|Airport|Museum|Library|Church|Cathedral|Temple|Mosque|Mall|Market|Docks?|Harbou?r|Plant|Mill|Warehouse|Depot|Terminal|Loop|District|University|School|Hospital|Club|Castle|Palace|Monastery|Abbey|Garden|Gardens|Island|Beach|Bay|Lake|River|Canyon|Mountain|Peak|Valley|Highway|Freeway|Interstate|Station|Center|Centre)))/i);
  if (m && m[1].length >= 3 && m[1].length <= 60) return m[1].trim();
  return null;
}

/** Resolve Wikidata entity ids -> English labels (batched, one call). */
export async function resolveLabels(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const batch = ids.slice(0, 50);
  const ent = await politeFetch(
    `${WIKIDATA}?action=wbgetentities&ids=${batch.join("|")}&props=labels&format=json&languages=en`
  );
  for (const id of batch) {
    const label = ent?.entities?.[id]?.labels?.en?.value;
    map.set(id, label ?? id);
  }
  return map;
}

/** Build raw mentions from a resolved title for candidate normalization. */
export function mentionsFromResolved(res: ResolvedTitle): RawLocationMention[] {
  const mentions: RawLocationMention[] = [];
  const entries =
    res.locationSources.length > 0
      ? res.locationSources
      : res.filmingLocations.map((name) => ({ name, kind: "wikipedia-section" as const }));
  for (const e of entries) {
    const isWikiData = e.kind === "wikidata";
    mentions.push({
      name: e.name,
      sourceUrl: isWikiData
        ? `https://www.wikidata.org/wiki/${res.wikidataId ?? ""}`
        : res.wikipediaUrl ?? "",
      sourceTitle: isWikiData ? "Wikidata" : res.wikipediaTitle ?? res.title,
      sourceKind: e.kind,
      note: isWikiData
        ? "Filming location (Wikidata P915)"
        : "Filming locations (Wikipedia section)",
    });
  }
  return mentions;
}

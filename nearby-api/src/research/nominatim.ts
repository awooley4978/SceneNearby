// ── Nominatim geocoder (v1, per owner decision 1) ──
// Strict public-policy compliance:
//   - max 1 request/second (global throttle, config.nominatim_max_rps)
//   - identifying User-Agent
//   - attribution: results carry osm_type/id so UI can credit OSM
//   - caching in Turso (research_geocode_cache) so repeat addresses never re-hit
//   - no bulk: called only per-candidate within a job, bounded by
//     max_geocode_attempts_per_job
import { getGeocodeCache, setGeocodeCache } from "./config";
import type { ResearchConfig } from "./types";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const UA = "SceneNearbyResearch/1.0 (scenenearbysupport@gmail.com; filming-location lookup)";

let lastCall = 0;

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  osmType: string | null;
  osmId: number | null;
  cached: boolean;
}

export async function geocode(
  query: string,
  cfg: ResearchConfig
): Promise<GeocodeResult | null> {
  const clean = query.trim();
  if (!clean) return null;

  const cached = await getGeocodeCache(clean);
  if (cached) {
    return {
      lat: cached.lat,
      lng: cached.lng,
      displayName: cached.displayName || clean,
      osmType: null,
      osmId: null,
      cached: true,
    };
  }

  // Global 1 req/s throttle (shared across all geocoding in this process).
  const rps = Math.max(1, cfg.nominatim_max_rps || 1);
  const minGap = Math.floor(1000 / rps);
  const now = Date.now();
  const wait = Math.max(0, minGap - (now - lastCall));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();

  const url = `${NOMINATIM}?q=${encodeURIComponent(clean)}&format=json&limit=1&addressdetails=0&accept-language=en`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (res.status === 429) {
    // Back off 2s and retry once — policy requires not hammering.
    await new Promise((r) => setTimeout(r, 2000));
    lastCall = Date.now();
    const retry = await fetch(url, { headers: { "User-Agent": UA } });
    if (!retry.ok) return null;
    const rows = (await retry.json()) as Array<Record<string, unknown>>;
    return parseRows(rows, clean, cfg);
  }
  if (!res.ok) return null;
  const rows = (await res.json()) as Array<Record<string, unknown>>;
  return parseRows(rows, clean, cfg);
}

function parseRows(rows: Array<Record<string, unknown>>, clean: string, cfg: ResearchConfig): GeocodeResult | null {
  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  const lat = Number(r.lat);
  const lng = Number(r.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const displayName = String(r.display_name ?? clean);
  void setGeocodeCache(clean, lat, lng, displayName); // fire-and-forget; failures are non-fatal
  return {
    lat,
    lng,
    displayName,
    osmType: r.osm_type ? String(r.osm_type) : null,
    osmId: r.osm_id ? Number(r.osm_id) : null,
    cached: false,
  };
}

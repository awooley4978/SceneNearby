import type { FilmingLocation } from '../models';

/**
 * Render-time grouping of locations by PHYSICAL PLACE (place-centric browsing
 * surfaces only — Discover feed and Map list). This is presentation logic only:
 * it never mutates, merges, or deletes the underlying records.
 *
 * Two records are treated as the same physical place when BOTH:
 *   · their normalized `title`s are equal (trimmed, lowercased, whitespace
 *     collapsed), AND
 *   · their coordinates round to ~4 decimal places (~11 m) — matching how the
 *     actual dataset stores co-located records (e.g. Trafalgar Square's six
 *     film records all share 51.5079,-0.1281).
 *
 * Requiring both prevents over-merging two genuinely different places that
 * happen to share a name (different cities) or that sit a block apart.
 *
 * Primary selection is fully deterministic and editorial-free: the record with
 * the SMALLEST stable `id` in the group. No popularity score, no ranking.
 */
export interface LocationGroup {
  primary: FilmingLocation;
  others: FilmingLocation[];
}

function normalizeTitle(title?: string): string {
  return (title || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function groupLocationsByPlace<T extends FilmingLocation>(
  locations: T[],
): LocationGroup[] {
  const buckets = new Map<string, T[]>();
  for (const loc of locations) {
    const key = `${normalizeTitle(loc.title)}|${loc.latitude.toFixed(4)}|${loc.longitude.toFixed(4)}`;
    const arr = buckets.get(key);
    if (arr) {
      arr.push(loc);
    } else {
      buckets.set(key, [loc]);
    }
  }
  const groups: LocationGroup[] = [];
  for (const bucket of buckets.values()) {
    const sorted = [...bucket].sort((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
    );
    groups.push({ primary: sorted[0], others: sorted.slice(1) });
  }
  return groups;
}

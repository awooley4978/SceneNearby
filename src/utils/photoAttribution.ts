// ── Photo attribution (app) ────────────────────────────────────────────────
// Mirrors the backend `PhotoAttribution` shape returned on ApiLocation as
// `photoAttribution`. Renders compactly and links the license to its official
// page per-photo (never one hard-coded URL).

export interface PhotoAttributionData {
  photographer: string | null;
  license: string | null; // e.g. "CC BY-SA 4.0"
  licenseUrl: string | null; // official license page (preferred; fall back to map)
  sourceUrl: string | null; // original photo page (internal, not shown)
  modified: string | null; // "cropped" | "edited" | ... when license requires disclosure
}

const CC_PATHS: Record<string, string> = {
  by: 'by',
  'by-sa': 'by-sa',
  'by-nc': 'by-nc',
  'by-nc-sa': 'by-nc-sa',
  'by-nd': 'by-nd',
  'by-nc-nd': 'by-nc-nd',
};

/**
 * Official license page for a Creative Commons short license name.
 *   "CC BY-SA 4.0" -> https://creativecommons.org/licenses/by-sa/4.0/
 *   "CC0 1.0"      -> https://creativecommons.org/publicdomain/zero/1.0/
 * Prefers the stored URL; otherwise derives per license (never one URL for
 * all). Unknown licenses return null (no invented URL).
 */
export function licenseUrlFor(
  license: string | null | undefined,
  storedUrl?: string | null,
): string | null {
  if (storedUrl) return storedUrl;
  if (!license) return null;
  const name = String(license).trim();
  const upper = name.toUpperCase();

  if (upper.includes('CC0') || upper.includes('PUBLIC DOMAIN') || upper.includes('PDM')) {
    const m = name.match(/(\d)[.](\d)/);
    const ver = m ? `${m[1]}.${m[2]}` : '1.0';
    return `https://creativecommons.org/publicdomain/zero/${ver}/`;
  }

  const lower = name.toLowerCase();
  const code = (lower.match(/(by[ -]?[a-z0-9-]*)/) || [])[1];
  if (!code) return null;
  const path = CC_PATHS[code.replace(/\s+/g, '-')] || CC_PATHS[code];
  if (!path) return null;

  const m = name.match(/(\d)[.](\d)/);
  const ver = m ? `${m[1]}.${m[2]}` : '4.0';
  return `https://creativecommons.org/licenses/${path}/${ver}/`;
}

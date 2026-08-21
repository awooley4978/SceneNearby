// ── Photo attribution helpers ──
// Attribution/license metadata is stored per photo/location in
// `photo_attribution_json` and serialized to the app as `photoAttribution`.
// The UI renders a compact line ("Photo: <name> · <license>") and makes the
// license name tappable, linking to that photo's official license page.

export interface PhotoAttribution {
  photographer: string | null;
  license: string | null;     // short display name, e.g. "CC BY-SA 4.0"
  licenseUrl: string | null;  // official license page (preferred; fall back to map)
  sourceUrl: string | null;   // original photo page (internal/provenance, not shown)
  modified: string | null;    // "cropped" | "edited" | ... when license requires disclosure
}

/** Parse a stored photo_attribution_json blob defensively. */
export function parsePhotoAttribution(json: string | null): PhotoAttribution | null {
  if (!json) return null;
  try {
    const v = JSON.parse(json);
    if (!v || typeof v !== "object") return null;
    return {
      photographer: v.photographer ?? null,
      license: v.license ?? null,
      licenseUrl: v.licenseUrl ?? null,
      sourceUrl: v.sourceUrl ?? null,
      modified: v.modified ?? null,
    };
  } catch {
    return null;
  }
}

// Creative Commons license path for a given license code (no version).
const CC_PATHS: Record<string, string> = {
  by: "by",
  "by-sa": "by-sa",
  "by-nc": "by-nc",
  "by-nc-sa": "by-nc-sa",
  "by-nd": "by-nd",
  "by-nc-nd": "by-nc-nd",
};

/**
 * Official license page for a Creative Commons license short name, e.g.
 *   "CC BY-SA 4.0" -> https://creativecommons.org/licenses/by-sa/4.0/
 *   "CC0 1.0"      -> https://creativecommons.org/publicdomain/zero/1.0/
 *   "CC BY 3.0"    -> https://creativecommons.org/licenses/by/3.0/
 * Returns the stored URL if provided, otherwise derives per license (never one
 * URL for all photos). Unrecognized licenses return null (no invented URL).
 */
export function licenseUrlFor(
  license: string | null | undefined,
  storedUrl?: string | null,
): string | null {
  if (storedUrl) return storedUrl;
  if (!license) return null;
  const name = String(license).trim();
  const upper = name.toUpperCase();

  // Public domain / CC0.
  if (upper.includes("CC0") || upper.includes("PUBLIC DOMAIN") || upper.includes("PDM")) {
    const m = name.match(/(\d)[.](\d)/);
    const ver = m ? `${m[1]}.${m[2]}` : "1.0";
    return `https://creativecommons.org/publicdomain/zero/${ver}/`;
  }

  // Extract the license code ("by-sa", "by-nc-sa", "by", ...) and version.
  const lower = name.toLowerCase();
  const code = (lower.match(/(by[ -]?[a-z0-9-]*)/) || [])[1];
  if (!code) return null;
  const path = CC_PATHS[code.replace(/\s+/g, "-")] || CC_PATHS[code];
  if (!path) return null;

  const m = name.match(/(\d)[.](\d)/);
  const ver = m ? `${m[1]}.${m[2]}` : "4.0";
  return `https://creativecommons.org/licenses/${path}/${ver}/`;
}

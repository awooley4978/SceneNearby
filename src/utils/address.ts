// ── Card address formatting ────────────────────────────────────────────────
// Formats a location's raw address into the card's two-line destination:
//   line 1: street / physical destination address
//   line 2: actual city, state/province, ZIP/postal code where available
//
// The DB stores most of the address as a single `address` string with the
// city/state/ZIP EMBEDDED (e.g. "205 E Houston St, New York, NY 10002",
// "1 AT&T Way, Arlington, TX 76011", "3476 NM-47, Los Lunas, NM") while the
// `city` column holds the app's broader destination/metro grouping (e.g.
// "Dallas" for a location physically in Arlington). This parser extracts the
// embedded physical city/state/ZIP and only falls back to the `city` field
// when the address string carries no address components (venue-only rows).

const STREET_TOKEN_RE =
  /\b(St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Dr|Drive|Ln|Lane|Way|Pl|Place|Ct|Court|Sq|Square|Park|Campus|Entrance|Gate|Area|Valley|Bay|Lake|Subway|Access|Walk|Level|Plaza|Mall|Center|Centre|Station|Airport|Island|Hill|Point|Beach|Museum|Theatre|Theater|Hotel|Inn|Farm|Ranch|Tower|Bridge|Pier|Wharf|Parkway|Freeway|Hwy|Highway|Exit|Stadium|Arena)\b/i;
const STATE_RE = /^[A-Z]{2}$/;
const ZIP5_RE = /^\d{5}(?:-\d{4})?$/;
const STATE_ZIP_RE = /^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/;
// "City 1234" — NZ-style postcode trailing the city in one token ("Hahei 3591")
const CITY_ZIP_RE = /^([A-Za-z .'-]+?)\s+(\d{3,5})$/;

export interface CardAddress {
  line1: string;
  line2: string;
}

function isCityLike(tok: string): boolean {
  if (!/^[A-Z][A-Za-z .'-]{1,40}$/.test(tok)) return false; // no digits/punct
  if (/\d/.test(tok)) return false;
  if (STREET_TOKEN_RE.test(tok)) return false; // street/venue keywords
  return tok.split(' ').length <= 3;
}

function joinParts(parts: Array<string | undefined>): string {
  return parts.map(s => (s || '').trim()).filter(Boolean).join(', ');
}

export function formatCardAddress(address: string, city: string, country: string): CardAddress {
  // DB stores literal "\n" sequences in some multi-line addresses — normalize
  const addr = (address || '').replace(/\\n/g, '\n').trim();
  const line1 = addr.split(/[\n,]/)[0].trim() || '';
  if (!addr) {
    const fallback = country && country !== 'USA' ? joinParts([city, country]) : city || '';
    return { line1: '', line2: fallback };
  }
  const tokens = addr.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
  const last = tokens[tokens.length - 1] || '';
  const prev = tokens[tokens.length - 2] || '';
  const cityTok = tokens[tokens.length - 3] || '';

  // "…, Arlington, TX 76011" — city, state, ZIP (no comma between ST and ZIP)
  const m = STATE_ZIP_RE.exec(last);
  if (m) return { line1: line1 || prev, line2: `${prev}, ${m[1]} ${m[2]}` };
  // "…, New York, NY, 10002"
  if (ZIP5_RE.test(last) && STATE_RE.test(prev)) {
    return { line1: line1 || cityTok, line2: `${cityTok}, ${prev} ${last}` };
  }
  // "…, City, 10002" (ZIP without state)
  if (ZIP5_RE.test(last)) return { line1: line1 || prev, line2: joinParts([prev, last]) };
  // "…, Los Lunas, NM"
  if (STATE_RE.test(last) && tokens.length >= 2) {
    return { line1: line1 || prev, line2: joinParts([prev, last]) };
  }
  // "…, Hahei 3591" → keep the physical city, drop the trailing postcode
  const cz = CITY_ZIP_RE.exec(last);
  if (cz && !/\d/.test(cz[1])) {
    return { line1: line1 || cz[1], line2: `${cz[1]} ${cz[2]}` };
  }
  // "…, Arlington" / "…, Parker" — embedded physical city, no state/ZIP
  if (tokens.length >= 2 && isCityLike(last)) {
    return { line1: line1 || prev, line2: last };
  }
  // No address components in the string → fall back to the app's city field
  const fallback = country && country !== 'USA' ? joinParts([city, country]) : city || '';
  return { line1: line1 || addr, line2: fallback };
}

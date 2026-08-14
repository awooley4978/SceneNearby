/**
 * Verifies the card address pipeline against the PUBLIC staging URL:
 *   - formatCardAddress (src/utils/address.ts, verbatim copy) applied to all 210
 *     live records — AT&T Stadium must render EXACTLY:
 *         line1: "1 AT&T Way"
 *         line2: "Arlington, TX 76011"
 *   - prints coverage: records with embedded "City, ST ZIP" / "City, ST" /
 *     embedded physical city / fallback to the metro city field.
 *
 * Run:  EXPO_PUBLIC_API_URL=https://b118a520627ac1a10a1362a93ff3b3f5.ctonew.app bun run repro-address.ts
 */
import { apiClient } from '../src/services/api';

// ── Verbatim copy of formatCardAddress from src/utils/address.ts ──
const STREET_TOKEN_RE =
  /\b(St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Dr|Drive|Ln|Lane|Way|Pl|Place|Ct|Court|Sq|Square|Park|Campus|Entrance|Gate|Area|Valley|Bay|Lake|Subway|Access|Walk|Level|Plaza|Mall|Center|Centre|Station|Airport|Island|Hill|Point|Beach|Museum|Theatre|Theater|Hotel|Inn|Farm|Ranch|Tower|Bridge|Pier|Wharf|Parkway|Freeway|Hwy|Highway|Exit|Stadium|Arena)\b/i;
const STATE_RE = /^[A-Z]{2}$/;
const ZIP5_RE = /^\d{5}(?:-\d{4})?$/;
const STATE_ZIP_RE = /^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/;
const CITY_ZIP_RE = /^([A-Za-z .'-]+?)\s+(\d{3,5})$/;
function isCityLike(tok: string): boolean {
  if (!/^[A-Z][A-Za-z .'-]{1,40}$/.test(tok)) return false;
  if (/\d/.test(tok)) return false;
  if (STREET_TOKEN_RE.test(tok)) return false;
  return tok.split(' ').length <= 3;
}
function joinParts(parts: Array<string | undefined>): string {
  return parts.map(s => (s || '').trim()).filter(Boolean).join(', ');
}
function formatCardAddress(address: string, city: string, country: string): { line1: string; line2: string } {
  const addr = (address || '').replace(/\\n/g, '\n').trim();
  const line1 = addr.split(/[\n,]/)[0].trim() || '';
  if (!addr) {
    return { line1: '', line2: country && country !== 'USA' ? joinParts([city, country]) : city || '' };
  }
  const tokens = addr.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
  const last = tokens[tokens.length - 1] || '';
  const prev = tokens[tokens.length - 2] || '';
  const cityTok = tokens[tokens.length - 3] || '';
  const m = STATE_ZIP_RE.exec(last);
  if (m) return { line1: line1 || prev, line2: `${prev}, ${m[1]} ${m[2]}` };
  if (ZIP5_RE.test(last) && STATE_RE.test(prev)) {
    return { line1: line1 || cityTok, line2: `${cityTok}, ${prev} ${last}` };
  }
  if (ZIP5_RE.test(last)) return { line1: line1 || prev, line2: joinParts([prev, last]) };
  if (STATE_RE.test(last) && tokens.length >= 2) {
    return { line1: line1 || prev, line2: joinParts([prev, last]) };
  }
  const cz = CITY_ZIP_RE.exec(last);
  if (cz && !/\d/.test(cz[1])) {
    return { line1: line1 || cz[1], line2: `${cz[1]} ${cz[2]}` };
  }
  if (tokens.length >= 2 && isCityLike(last)) {
    return { line1: line1 || prev, line2: last };
  }
  return { line1: line1 || addr, line2: country && country !== 'USA' ? joinParts([city, country]) : city || '' };
}

const FAIL: string[] = [];
const pass = (ok: boolean, label: string, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) FAIL.push(label);
};

(async () => {
  const raw: any[] = await apiClient.getAllLocations();

  const coverage = { full: 0, stateOnly: 0, embeddedCity: 0, fallback: 0 };
  const fmt = (l: any) => formatCardAddress(l.address || '', l.city || '', l.country || '');

  const dal = raw.find(l => l.id === 'dal-004')!;
  const dalAddr = fmt(dal);
  pass(dalAddr.line1 === '1 AT&T Way' && dalAddr.line2 === 'Arlington, TX 76011',
    'AT&T Stadium renders EXACTLY "1 AT&T Way" / "Arlington, TX 76011"',
    `got "${dalAddr.line1}" / "${dalAddr.line2}" (city field is still "${dal.city}" — not used)`);

  for (const l of raw) {
    const a = fmt(l);
    if (a.line2.includes(',') && /\d{5}/.test(a.line2)) coverage.full++;
    else if (a.line2.includes(',') && /, [A-Z]{2}$/.test(a.line2)) coverage.stateOnly++;
    else if (a.line2 && a.line2 !== l.city) coverage.embeddedCity++;
    else coverage.fallback++;
  }
  console.log(`coverage: full "City, ST ZIP"=${coverage.full} | "City, ST"=${coverage.stateOnly} | embedded physical city=${coverage.embeddedCity} | metro-city fallback=${coverage.fallback}`);

  // Spot checks
  const cases: Array<[string, string, string]> = [
    ['abq-001', '3476 NM-47', 'Los Lunas, NM'],
    ['nyc-002', '205 E Houston St', 'New York, NY 10002'],
    ['dal-001', 'Dealey Plaza', 'Dallas'],
    ['dal-002', undefined as any, 'Parker'],
    ['nyc-001', 'Bow Bridge', 'New York City'],
    ['ldn-001', undefined as any, 'London, UK'],
  ];
  for (const [id, line1, line2] of cases) {
    const l = raw.find(r => r.id === id)!;
    const a = fmt(l);
    const ok1 = !line1 || a.line1 === line1;
    const ok2 = a.line2 === line2;
    pass(ok1 && ok2, `${id} → "${a.line1}" / "${a.line2}"`, `expected "${line1 || '?'}" / "${line2}"`);
  }

  console.log(FAIL.length === 0 ? '\nALL ADDRESS CHECKS PASSED' : `\n${FAIL.length} FAILED: ${FAIL.join('; ')}`);
  process.exit(FAIL.length === 0 ? 0 : 1);
})();

/**
 * RUNTIME regression test for the category-normalization crash:
 *   "Something went wrong — Property 'LocationCategory' doesn't exist"
 *
 * The crash was a type-only import (`import type { LocationCategory }`)
 * used in a VALUE position inside normalizeCategory(). `import type` is
 * erased at runtime, so `LocationCategory.drama` threw the moment the
 * first API location was mapped after mount. tsc never ran on that batch
 * (workspace node_modules absent), and the older repro scripts re-implemented
 * normalizeCategory locally instead of executing the real module.
 *
 * This script executes the REAL hooks.ts module code (only diff: an appended
 * export line for the module-private functions) and runs the exact crash
 * path: API payload -> toFilmingLocation -> normalizeCategory -> enum value.
 *
 * Run: cd <repo> && bun run scripts/repro-category-runtime.ts
 */
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const srcDir = path.dirname(fileURLToPath(import.meta.url));
const hooksPath = path.join(srcDir, '..', 'src', 'services', 'hooks.ts');
const exposedPath = path.join(srcDir, '..', 'src', 'services', 'hooks.exposed.ts');

const source = readFileSync(hooksPath, 'utf8');
// The ONLY change: expose the private functions so the real runtime code runs.
writeFileSync(exposedPath, source + '\n\nexport { toFilmingLocation, normalizeCategory };\n');

let fail = 0;
const pass = (ok: boolean, label: string, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) fail++;
};

try {
  const mod = await import('../src/services/hooks.exposed.ts');
  const { toFilmingLocation, normalizeCategory } = mod as any;

  // 1. normalizeCategory maps every API slug to the canonical enum value
  const cases: Array<[string, string]> = [
    ['drama', 'Drama'],
    ['comedy', 'Comedy'],
    ['scifi', 'Sci-Fi'],
    ['sci-fi', 'Sci-Fi'],
    ['sciFi', 'Sci-Fi'],
    ['action', 'Action'],
    ['romance', 'Romance'],
    ['horror', 'Horror'],
  ];
  for (const [slug, want] of cases) {
    pass(normalizeCategory(slug) === want, `normalizeCategory('${slug}') === '${want}'`, `got '${normalizeCategory(slug)}'`);
  }

  // 2. Full mapping path: summary payload -> FilmingLocation with resolvable color
  const { categoryColors } = await import('../src/models/index.ts');
  const sample = {
    id: 'dal-004', title: 'AT&T Stadium', movieOrShow: 'Entourage', year: 2010,
    category: 'comedy', city: 'Dallas', country: 'USA', latitude: 32.7473,
    longitude: -97.0945, address: '1 AT&T Way, Arlington, TX 76011', isMovie: false,
  };
  const loc = toFilmingLocation(sample);
  pass(loc.category === 'Comedy', 'toFilmingLocation maps category comedy -> "Comedy"', `got '${loc.category}'`);
  pass(categoryColors[loc.category as keyof typeof categoryColors] === '#EAB308',
    'categoryColors["Comedy"] resolves (#EAB308)');
  pass(categoryColors[toFilmingLocation({ ...sample, category: 'sciFi' }).category as keyof typeof categoryColors] === '#06B6D4',
    'categoryColors["Sci-Fi"] resolves (#06B6D4)');
  pass(categoryColors[toFilmingLocation({ ...sample, category: 'action' }).category as keyof typeof categoryColors] === '#EF4444',
    'categoryColors["Action"] resolves (#EF4444)');

  // 3. The module itself initializes (importing hooks.exposed ran its top level)
  console.log('module init: hooks.ts (real code) imported and executed OK');
} finally {
  if (existsSync(exposedPath)) unlinkSync(exposedPath);
}

console.log(fail === 0 ? '\nALL CATEGORY RUNTIME CHECKS PASSED' : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);

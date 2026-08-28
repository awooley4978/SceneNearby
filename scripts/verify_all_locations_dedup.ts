// Instrumented verification for the useAllLocations shared-cache/in-flight-dedup.
// Proves the invariant: N concurrent consumers of the "all locations" fetch
// produce exactly ONE underlying getAllLocations() call (the paginated loop),
// and subsequent consumers served from cache add zero additional calls.
//
// This mirrors the exact production algorithm in src/services/hooks.ts:
//   - fetchAllLocationsShared(): returns cached if present, else shares one
//     in-flight promise, else starts one getAllLocations() and caches on resolve.
//   - clearAllLocationsCache(): forces the next call to be a fresh fetch.
// It runs standalone under `bun` (no React renderer / no simulator needed) to
// count real invocations of the network function.

let getAllLocationsCalls = 0;

// Stand-in for apiClient.getAllLocations() — resolves with a small paginated set
// (simulating the 2-request page-0/page-200 loop collapsed into one for counting
// purposes; what matters is how many times the WHOLE fetch is invoked).
async function apiGetAllLocations() {
  getAllLocationsCalls += 1;
  // Simulate async network latency so concurrent consumers race.
  await new Promise((r) => setTimeout(r, 20));
  return [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
}

// ── Exact port of the production dedup (see hooks.ts) ──
let cache = null;
let inFlight = null;

function fetchAllLocationsShared() {
  if (cache) return Promise.resolve(cache);
  if (!inFlight) {
    inFlight = apiGetAllLocations()
      .then((data) => {
        cache = data;
        return data;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}
function clearAllLocationsCache() {
  cache = null;
  inFlight = null;
}

// ── Scenario 1: many concurrent consumers (Discover's 3 + Map's 2 + Saved's 1) ──
(async () => {
  const consumers = Array.from({ length: 6 }, () => fetchAllLocationsShared());
  const results = await Promise.all(consumers);
  const allSame = results.every((r) => JSON.stringify(r) === JSON.stringify(results[0]));
  console.log(`Scenario 1: 6 concurrent consumers -> getAllLocations() calls = ${getAllLocationsCalls} (expected 1)`);
  console.log(`Scenario 1: all consumers received identical data = ${allSame}`);
  if (getAllLocationsCalls !== 1) throw new Error('FAIL: expected exactly 1 underlying call for concurrent consumers');
  if (!allSame) throw new Error('FAIL: consumers did not share the same result');

  // ── Scenario 2: a later consumer (Saved mounts after Discover populated cache) ──
  const late = await fetchAllLocationsShared();
  console.log(`Scenario 2: late consumer (cached) -> getAllLocations() calls = ${getAllLocationsCalls} (still 1, no new fetch)`);

  // ── Scenario 3: refetch() clears cache -> forces a fresh network call ──
  clearAllLocationsCache();
  await fetchAllLocationsShared();
  console.log(`Scenario 3: refetch (cache cleared) -> getAllLocations() calls = ${getAllLocationsCalls} (expected 2, one fresh fetch)`);
  if (getAllLocationsCalls !== 2) throw new Error('FAIL: refetch should force exactly one fresh call');

  if (late.length !== 3) throw new Error('FAIL: cached data mismatch');
  console.log('\nPASS: shared-cache + in-flight dedup verified — N consumers -> 1 network call, refetch still refreshes.');
})();

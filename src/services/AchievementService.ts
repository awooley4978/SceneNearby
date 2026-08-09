import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../models';
// API migration: use apiClient from '../services/api' instead
import { apiClient } from '../services/api';
import { getVisitedIds } from './VisitedService';

// Stub: movieGroupByTitle was from sampleData, now needs API data
// Returns null until we can compute from fetched locations
function movieGroupByTitle(_title: string): any | null {
  return null; // TODO: Implement with allLocations from API
}

// ── Public Types ──

/** Per-movie progress snapshot — computed dynamically from visited locations */
export interface MovieProgress {
  movieTitle: string;
  visitedCount: number;
  totalCount: number;
  isComplete: boolean;
  previouslyComplete: boolean;
  locationIds: string[];
  visitedIds: string[];
}

/** Persisted record that a movie was completed */
export interface CompletionSnapshot {
  movieTitle: string;
  totalCount: number;
  completedAt: number;
}

/** V2-ready: enriched snapshot with metadata for Completed Collections page */
export interface CompletedMovie {
  movieTitle: string;
  totalCount: number;
  completedAt: number;
  category: string;
  year: number;
  isMovie: boolean;
}

// ── Internal helpers ──

function groupLocationsByMovie(): Map<string, { ids: string[]; total: number }> {
  const map = new Map<string, { ids: string[]; total: number }>();
  for (const loc of allLocations) {
    const movie = loc.movieOrShow;
    if (!map.has(movie)) {
      map.set(movie, { ids: [], total: 0 });
    }
    const entry = map.get(movie)!;
    entry.ids.push(loc.id);
    entry.total++;
  }
  return map;
}

// ── Progress (computed dynamically from visited IDs) ──

/** Calculate progress for every movie — always reflects current visited state */
export async function getAllMovieProgress(): Promise<MovieProgress[]> {
  const visited = await getVisitedIds();
  const snapshots = await getCompletionSnapshots();
  const movieMap = groupLocationsByMovie();
  const results: MovieProgress[] = [];

  for (const [movieTitle, { ids, total }] of movieMap) {
    const visitedIds = ids.filter((id) => visited.has(id));
    const visitedCount = visitedIds.length;
    const isComplete = visitedCount >= total;
    const snapshot = snapshots.find((s) => s.movieTitle === movieTitle);
    const previouslyComplete = snapshot !== undefined;

    results.push({
      movieTitle,
      visitedCount,
      totalCount: total,
      isComplete,
      previouslyComplete: previouslyComplete && !isComplete,
      locationIds: ids,
      visitedIds,
    });
  }

  // Completed first, then by progress %
  results.sort((a, b) => {
    if (a.isComplete && !b.isComplete) return -1;
    if (!a.isComplete && b.isComplete) return 1;
    const pctA = a.visitedCount / a.totalCount;
    const pctB = b.visitedCount / b.totalCount;
    return pctB - pctA;
  });

  return results;
}

/** Get progress for a single movie */
export async function getMovieProgress(movieTitle: string): Promise<MovieProgress | null> {
  const all = await getAllMovieProgress();
  return all.find((p) => p.movieTitle === movieTitle) ?? null;
}

// ── Completion Snapshots (persisted — survives app restarts) ──

/** Public — V2 Completed Collections page queries this directly */
export async function getCompletionSnapshots(): Promise<CompletionSnapshot[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.COMPLETION_SNAPSHOTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveCompletionSnapshot(snapshot: CompletionSnapshot): Promise<void> {
  const existing = await getCompletionSnapshots();
  const idx = existing.findIndex((s) => s.movieTitle === snapshot.movieTitle);
  if (idx >= 0) {
    existing[idx] = snapshot;
  } else {
    existing.push(snapshot);
  }
  await AsyncStorage.setItem(STORAGE_KEYS.COMPLETION_SNAPSHOTS, JSON.stringify(existing));
}

async function removeCompletionSnapshot(movieTitle: string): Promise<void> {
  const existing = await getCompletionSnapshots();
  const filtered = existing.filter((s) => s.movieTitle !== movieTitle);
  await AsyncStorage.setItem(STORAGE_KEYS.COMPLETION_SNAPSHOTS, JSON.stringify(filtered));
}

// ── V2 Query Functions ──

/** V2-ready: all completed movies enriched with metadata, newest first */
export async function getCompletedMovies(): Promise<CompletedMovie[]> {
  const snapshots = await getCompletionSnapshots();
  return snapshots
    .map((s) => {
      const group = movieGroupByTitle(s.movieTitle);
      return {
        movieTitle: s.movieTitle,
        totalCount: s.totalCount,
        completedAt: s.completedAt,
        category: group?.category ?? 'Unknown',
        year: group?.year ?? 0,
        isMovie: group?.isMovie ?? true,
      };
    })
    .sort((a, b) => b.completedAt - a.completedAt);
}

/** V2-ready: movies started but not completed, sorted by progress desc */
export async function getMoviesInProgress(): Promise<MovieProgress[]> {
  const all = await getAllMovieProgress();
  return all
    .filter((p) => p.visitedCount > 0 && !p.isComplete)
    .sort((a, b) => {
      const pctA = a.visitedCount / a.totalCount;
      const pctB = b.visitedCount / b.totalCount;
      return pctB - pctA;
    });
}

/** V2-ready: header stats for Completed Collections */
export async function getCollectionStats(): Promise<{
  completedCount: number;
  inProgressCount: number;
  totalLocationsVisited: number;
  totalMovies: number;
}> {
  const all = await getAllMovieProgress();
  const visited = await getVisitedIds();
  return {
    completedCount: all.filter((p) => p.isComplete && p.totalCount >= 3).length,
    inProgressCount: all.filter((p) => p.visitedCount > 0 && !p.isComplete).length,
    totalLocationsVisited: visited.size,
    totalMovies: all.length,
  };
}

// ── Completion Detection (call after markVisited) ──

/**
 * Detects newly-completed movies and regressions (when new locations break a completion).
 * Writes/updates completion snapshots automatically.
 * Returns { justCompleted, regressions } for the caller to react to.
 */
export async function detectCompletionChanges(): Promise<{
  justCompleted: string[];
  regressions: string[];
}> {
  const progress = await getAllMovieProgress();
  const snapshots = await getCompletionSnapshots();

  const justCompleted: string[] = [];
  const regressions: string[] = [];

  for (const p of progress) {
    const snapshot = snapshots.find((s) => s.movieTitle === p.movieTitle);

    if (p.isComplete && !snapshot) {
      justCompleted.push(p.movieTitle);
      await saveCompletionSnapshot({
        movieTitle: p.movieTitle,
        totalCount: p.totalCount,
        completedAt: Date.now(),
      });
    } else if (!p.isComplete && snapshot) {
      regressions.push(p.movieTitle);
      await removeCompletionSnapshot(p.movieTitle);
    } else if (p.isComplete && snapshot && p.totalCount > snapshot.totalCount) {
      await saveCompletionSnapshot({
        movieTitle: p.movieTitle,
        totalCount: p.totalCount,
        completedAt: snapshot.completedAt,
      });
    }
  }

  return { justCompleted, regressions };
}

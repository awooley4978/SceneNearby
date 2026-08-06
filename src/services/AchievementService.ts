import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../models';
import { allLocations, movieGroupByTitle } from '../data/sampleData';
import { getVisitedIds } from './VisitedService';

// ── Types ──

export interface MovieProgress {
  movieTitle: string;
  visitedCount: number;
  totalCount: number;
  isComplete: boolean;
  previouslyComplete: boolean; // was complete before new locations were added?
  locationIds: string[];
  visitedIds: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  earnedAt: number; // timestamp
  movieTitle?: string; // for movie-specific achievements
  isNew?: boolean; // just earned this session
}

export interface CompletionSnapshot {
  movieTitle: string;
  totalCount: number;
  completedAt: number; // timestamp
}

// ── Progress Calculation ──

/** Group all locations by movie title */
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

/** Calculate progress for every movie */
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
    // Previously complete if there's a snapshot AND it was completed at some point
    const previouslyComplete = snapshot !== undefined;
    // But if visitedCount still equals total, it's still complete
    // If visitedCount < total but previouslyComplete, it means new locations broke completion

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

  // Sort: completed first, then by progress % desc
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

// ── Completion Snapshots ──

async function getCompletionSnapshots(): Promise<CompletionSnapshot[]> {
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

/** Remove a snapshot if the movie is no longer complete */
async function removeCompletionSnapshot(movieTitle: string): Promise<void> {
  const existing = await getCompletionSnapshots();
  const filtered = existing.filter((s) => s.movieTitle !== movieTitle);
  await AsyncStorage.setItem(STORAGE_KEYS.COMPLETION_SNAPSHOTS, JSON.stringify(filtered));
}

// ── Achievement System ──

export async function getAchievements(): Promise<Achievement[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveAchievements(achievements: Achievement[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
}

/** Award an achievement if not already earned. Returns the achievement (with isNew=true) or null. */
async function awardAchievement(
  id: string,
  title: string,
  description: string,
  emoji: string,
  movieTitle?: string,
): Promise<Achievement | null> {
  const existing = await getAchievements();
  if (existing.some((a) => a.id === id)) return null; // already earned

  const achievement: Achievement = {
    id,
    title,
    description,
    emoji,
    earnedAt: Date.now(),
    movieTitle,
    isNew: true,
  };

  existing.push(achievement);
  await saveAchievements(existing);
  return achievement;
}

/** Mark all achievements as seen (clear isNew flag) */
export async function markAchievementsSeen(): Promise<void> {
  const existing = await getAchievements();
  const updated = existing.map((a) => ({ ...a, isNew: false }));
  await saveAchievements(updated);
}

/** Check and award achievements after a visit. Returns any newly earned achievements. */
export async function checkAchievements(): Promise<Achievement[]> {
  const progress = await getAllMovieProgress();
  const visited = await getVisitedIds();
  const newAchievements: Achievement[] = [];

  // "Movie Explorer" — first location visited
  if (visited.size >= 1) {
    const a = await awardAchievement(
      'movie-explorer',
      'Movie Explorer',
      'You visited your first filming location!',
      '🎬',
    );
    if (a) newAchievements.push(a);
  }

  // "[Movie] Expert" — per-movie completion
  for (const p of progress) {
    if (p.isComplete && p.totalCount >= 3) {
      const a = await awardAchievement(
        `expert-${p.movieTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        `${p.movieTitle} Expert`,
        `You visited every filming location for ${p.movieTitle}!`,
        '⭐',
        p.movieTitle,
      );
      if (a) newAchievements.push(a);
    }
  }

  // "Completed Collection" — at least 5 movies fully completed
  const completedMovies = progress.filter((p) => p.isComplete && p.totalCount >= 3);
  if (completedMovies.length >= 5) {
    const a = await awardAchievement(
      'completed-collection',
      'Completed Collection',
      `You've completed 5 movies — your filmography is growing!`,
      '🏆',
    );
    if (a) newAchievements.push(a);
  }

  // "Globetrotter" — locations in 3+ countries
  const visitedLocations = allLocations.filter((l) => visited.has(l.id));
  const countries = new Set(visitedLocations.map((l) => l.country));
  if (countries.size >= 3) {
    const a = await awardAchievement(
      'globetrotter',
      'Globetrotter',
      `You've explored filming locations in ${countries.size} countries!`,
      '🌍',
    );
    if (a) newAchievements.push(a);
  }

  // "Completionist" — 10+ movies completed
  if (completedMovies.length >= 10) {
    const a = await awardAchievement(
      'completionist',
      'Completionist',
      `You've completed 10 movies — you're a true film location hunter!`,
      '💯',
    );
    if (a) newAchievements.push(a);
  }

  return newAchievements;
}

// ── Completion Detection & Snapshots ──

/**
 * Call this after marking a location as visited.
 * Detects completions and regressions.
 * Returns: { justCompleted: string[], regression: string[] }
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
      // Newly completed!
      justCompleted.push(p.movieTitle);
      await saveCompletionSnapshot({
        movieTitle: p.movieTitle,
        totalCount: p.totalCount,
        completedAt: Date.now(),
      });
    } else if (!p.isComplete && snapshot) {
      // Was complete, now not — regression (new locations added)
      regressions.push(p.movieTitle);
      await removeCompletionSnapshot(p.movieTitle);
    } else if (p.isComplete && snapshot && p.totalCount > snapshot.totalCount) {
      // Still complete, but total grew (edge case — visited counts increased too)
      await saveCompletionSnapshot({
        movieTitle: p.movieTitle,
        totalCount: p.totalCount,
        completedAt: snapshot.completedAt,
      });
    }
  }

  return { justCompleted, regressions };
}

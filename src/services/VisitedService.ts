import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../models';

const VISITED_KEY = STORAGE_KEYS.VISITED_LOCATIONS || '@scenenearby/visited';

/** Get all visited location IDs for the current user */
export async function getVisitedIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(VISITED_KEY);
    if (!raw) return new Set();
    const arr: string[] = JSON.parse(raw);
    return new Set(arr);
  } catch {
    return new Set();
  }
}

/** Mark a location as visited. Returns the updated set. */
export async function markVisited(locationId: string): Promise<Set<string>> {
  const visited = await getVisitedIds();
  visited.add(locationId);
  await AsyncStorage.setItem(VISITED_KEY, JSON.stringify([...visited]));
  return visited;
}

/** Unmark a location as visited. Returns the updated set. */
export async function unmarkVisited(locationId: string): Promise<Set<string>> {
  const visited = await getVisitedIds();
  visited.delete(locationId);
  await AsyncStorage.setItem(VISITED_KEY, JSON.stringify([...visited]));
  return visited;
}

/** Check if a single location has been visited */
export async function isVisited(locationId: string): Promise<boolean> {
  const visited = await getVisitedIds();
  return visited.has(locationId);
}

/** Replace all visited IDs (used to sync) */
export async function setVisitedIds(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(VISITED_KEY, JSON.stringify(ids));
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../models';

const KEY = STORAGE_KEYS.VISITED_LOCATIONS;

/** Get all visited location IDs for the current user */
export async function getVisitedIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

/** Mark a location as visited. Returns the updated set. */
export async function markVisited(locationId: string): Promise<Set<string>> {
  const visited = await getVisitedIds();
  visited.add(locationId);
  await AsyncStorage.setItem(KEY, JSON.stringify([...visited]));
  return visited;
}

/** Unmark a location as visited. Returns the updated set. */
export async function unmarkVisited(locationId: string): Promise<Set<string>> {
  const visited = await getVisitedIds();
  visited.delete(locationId);
  await AsyncStorage.setItem(KEY, JSON.stringify([...visited]));
  return visited;
}

/** Check if a single location has been visited */
export async function isVisited(locationId: string): Promise<boolean> {
  const visited = await getVisitedIds();
  return visited.has(locationId);
}

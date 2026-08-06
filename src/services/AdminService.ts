import { allLocations } from '../data/sampleData';
import type { FilmingLocation } from '../models';

export interface AdminStats {
  totalLocations: number;
  missingPhotos: number;
  missingDescriptions: number;
  pendingTips: number;
  pendingApproval: number;
  reportedPhotos: number;
  completionPercentage: number;
  missingPhotoItems: FilmingLocation[];
  missingDescriptionItems: FilmingLocation[];
}

export function computeAdminStats(pendingPhotoCount: number = 0): AdminStats {
  const total = allLocations.length;

  const missingPhotoItems = allLocations.filter((l) => !l.imageUrl);
  const missingDescriptionItems = allLocations.filter(
    (l) => !l.sceneDescription || l.sceneDescription.trim() === '',
  );

  // A location is "complete" when it has: imageUrl, sceneDescription, AND funFact
  const completeCount = allLocations.filter(
    (l) => l.imageUrl && l.sceneDescription && l.sceneDescription.trim() !== '' && l.funFact && l.funFact.trim() !== '',
  ).length;

  return {
    totalLocations: total,
    missingPhotos: missingPhotoItems.length,
    missingDescriptions: missingDescriptionItems.length,
    pendingTips: 0, // placeholder
    pendingApproval: pendingPhotoCount,
    reportedPhotos: 0, // placeholder
    completionPercentage: total > 0 ? Math.round((completeCount / total) * 100) : 0,
    missingPhotoItems,
    missingDescriptionItems,
  };
}

// ── Filter utilities for Admin Detail screen ──

/** Extract unique sorted values for a given field from a location list */
export function getUniqueValues(items: FilmingLocation[], field: 'city' | 'country'): string[] {
  const values = new Set(items.map((l) => l[field]));
  return [...values].sort((a, b) => a.localeCompare(b));
}

/** Extract the first letter (A-Z) from location titles, sorted */
export function getTitleFirstLetters(items: FilmingLocation[]): string[] {
  const letters = new Set(
    items
      .map((l) => l.title.charAt(0).toUpperCase())
      .filter((ch) => ch >= 'A' && ch <= 'Z'),
  );
  return [...letters].sort();
}

/** Derive a region/state from the address field (e.g. "Chicago, IL 60613" → "IL") */
export function deriveRegion(loc: FilmingLocation): string {
  // Try to extract US state abbreviation from address
  const match = loc.address.match(/,\s*([A-Z]{2})\s+\d/);
  if (match) return match[1];
  // Fall back to country
  return loc.country;
}

/** Get sorted unique regions */
export function getUniqueRegions(items: FilmingLocation[]): string[] {
  const regions = new Set(items.map(deriveRegion));
  return [...regions].sort((a, b) => a.localeCompare(b));
}

export interface DetailFilters {
  search: string;
  city: string | null;
  country: string | null;
  region: string | null;
  firstLetter: string | null;
}

export const EMPTY_FILTERS: DetailFilters = {
  search: '',
  city: null,
  country: null,
  region: null,
  firstLetter: null,
};

/** Apply all active filters to a list of locations */
export function applyDetailFilters(items: FilmingLocation[], filters: DetailFilters): FilmingLocation[] {
  return items.filter((loc) => {
    // Text search: match title, movie/show, or address
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      const matchesSearch =
        loc.title.toLowerCase().includes(q) ||
        loc.movieOrShow.toLowerCase().includes(q) ||
        loc.address.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    if (filters.city && loc.city !== filters.city) return false;
    if (filters.country && loc.country !== filters.country) return false;
    if (filters.region && deriveRegion(loc) !== filters.region) return false;
    if (filters.firstLetter && loc.title.charAt(0).toUpperCase() !== filters.firstLetter) return false;

    return true;
  });
}

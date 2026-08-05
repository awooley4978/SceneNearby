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

import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';

export interface UserPhoto {
  id: string;
  userId: string;
  locationId: string;
  locationName: string;
  city: string;
  imageUrl: string;
  caption: string;
  uploadedAt: number; // timestamp millis
}

export interface LocationGroup {
  locationId: string;
  locationName: string;
  city: string;
  photoCount: number;
  firstPhotoUrl: string;
}

/** Fetch all photos for a user and group by location */
export async function getUserAlbum(userId: string): Promise<{
  photos: UserPhoto[];
  groups: LocationGroup[];
}> {
  const photosRef = collection(db, 'photos');
  const q = query(
    photosRef,
    where('userId', '==', userId),
    orderBy('uploadedAt', 'desc')
  );

  const snapshot = await getDocs(q);
  const photos: UserPhoto[] = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    photos.push({
      id: doc.id,
      userId: data.userId,
      locationId: data.locationId,
      locationName: data.locationName,
      city: data.city,
      imageUrl: data.imageUrl,
      caption: data.caption ?? '',
      uploadedAt: data.uploadedAt,
    });
  });

  // Group by location, preserving most-recent-first order
  const groupMap = new Map<string, LocationGroup>();
  for (const photo of photos) {
    const existing = groupMap.get(photo.locationId);
    if (existing) {
      existing.photoCount++;
    } else {
      groupMap.set(photo.locationId, {
        locationId: photo.locationId,
        locationName: photo.locationName,
        city: photo.city,
        photoCount: 1,
        firstPhotoUrl: photo.imageUrl,
      });
    }
  }

  return {
    photos,
    groups: Array.from(groupMap.values()),
  };
}

/** Fetch photos for a specific location */
export async function getLocationPhotos(
  userId: string,
  locationId: string
): Promise<UserPhoto[]> {
  const photosRef = collection(db, 'photos');
  const q = query(
    photosRef,
    where('userId', '==', userId),
    where('locationId', '==', locationId),
    orderBy('uploadedAt', 'desc')
  );

  const snapshot = await getDocs(q);
  const photos: UserPhoto[] = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    photos.push({
      id: doc.id,
      userId: data.userId,
      locationId: data.locationId,
      locationName: data.locationName,
      city: data.city,
      imageUrl: data.imageUrl,
      caption: data.caption ?? '',
      uploadedAt: data.uploadedAt,
    });
  });

  return photos;
}

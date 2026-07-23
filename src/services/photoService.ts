import { Platform } from 'react-native';

const API_BASE = 'http://localhost:3000';

export interface PhotoUploadRequest {
  app_name: string;
  location_id: string;
  location_name: string;
  user_info?: string;
  comment?: string;
  photo: {
    uri: string;
    type: string;
    fileName: string;
  };
}

export interface PhotoUploadResponse {
  success: boolean;
  submission_id: string;
  message: string;
  error?: string;
}

/**
 * Upload a photo to the nearby API for moderation.
 * Uses multipart/form-data with the photo file and metadata.
 */
export async function uploadPhoto(request: PhotoUploadRequest): Promise<PhotoUploadResponse> {
  const formData = new FormData();

  formData.append('app_name', request.app_name);
  formData.append('location_id', request.location_id);
  formData.append('location_name', request.location_name);

  if (request.user_info) {
    formData.append('user_info', request.user_info);
  }
  if (request.comment) {
    formData.append('comment', request.comment);
  }

  // Append photo as file
  formData.append('photo', {
    uri: request.photo.uri,
    type: request.photo.type,
    name: request.photo.fileName,
  } as any);

  const response = await fetch(`${API_BASE}/api/submissions`, {
    method: 'POST',
    body: formData,
    headers: {
      'Accept': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Upload failed. Please try again.');
  }

  return data as PhotoUploadResponse;
}

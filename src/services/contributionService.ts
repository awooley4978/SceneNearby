import { Platform } from 'react-native';
// Production points at the Fly.io host (R12: cloud host migration); dev uses the
// local/sandbox API edge.
const API_BASE = __DEV__
  ? 'http://localhost:3000'
  : 'https://scene-nearby-api.fly.dev';

export interface ContributionTitle {
  title: string;
}
export interface ContributionLocationOption {
  locationId: string;
  title: string;
  city: string;
  address: string;
}
export interface ProposedMovie {
  movie_title: string;
  year?: number | null;
  type: 'movie' | 'show';
}
export interface ProposedLocation {
  place_name?: string;
  address?: string;
  city?: string;
  scene_description?: string;
  source_evidence?: string;
}
export interface SubmitContributionRequest {
  location_id?: string;
  location_name?: string;
  movie_or_show?: string;
  proposed_movie_json?: ProposedMovie;
  proposed_location_json?: ProposedLocation;
  description?: string;
  submitter_uid?: string;
  display_name?: string;
  allow_public_credit: boolean;
  rights_confirmed: boolean;
  // License captured at upload time (owner rule 08-23): every photo upload must
  // carry a license that renders clickable to open the license.
  license?: string;      // short name, e.g. "CC BY 4.0"
  license_url?: string;  // resolvable license page
  /** Community permission tag for own/community photos ('display'). */
  community_permission?: string;
  photo: { uri: string; type: string; fileName: string };
}
export interface SubmitContributionResponse {
  success: boolean;
  submission_id: string;
  message: string;
  error?: string;
}

/** Distinct known movie/TV titles (for the picker + search-as-you-type). */
export async function fetchTitles(q?: string): Promise<ContributionTitle[]> {
  const query = q ? `?q=${encodeURIComponent(q)}` : '';
  const res = await fetch(`${API_BASE}/api/contributions/titles${query}`, {
    headers: { Accept: 'application/json', 'Accept-Encoding': 'identity' },
  });
  if (!res.ok) throw new Error('Could not load titles.');
  return res.json();
}

/** Filming locations already known for a given movie/TV show. */
export async function fetchLocationsForTitle(title: string): Promise<ContributionLocationOption[]> {
  const res = await fetch(
    `${API_BASE}/api/contributions/locations?title=${encodeURIComponent(title)}`,
    { headers: { Accept: 'application/json', 'Accept-Encoding': 'identity' } }
  );
  if (!res.ok) throw new Error('Could not load locations.');
  return res.json();
}

/**
 * Submit a guided community contribution (photo -> movie/show -> filming
 * location -> description). Always stored pending-only server-side.
 */
export async function submitContribution(
  request: SubmitContributionRequest
): Promise<SubmitContributionResponse> {
  const formData = new FormData();
  if (request.location_id) formData.append('location_id', request.location_id);
  if (request.location_name) formData.append('location_name', request.location_name);
  if (request.movie_or_show) formData.append('movie_or_show', request.movie_or_show);
  if (request.proposed_movie_json) {
    formData.append('proposed_movie_json', JSON.stringify(request.proposed_movie_json));
  }
  if (request.proposed_location_json) {
    formData.append('proposed_location_json', JSON.stringify(request.proposed_location_json));
  }
  if (request.description) formData.append('description', request.description);
  if (request.submitter_uid) formData.append('submitter_uid', request.submitter_uid);
  if (request.display_name) formData.append('display_name', request.display_name);
  formData.append('allow_public_credit', String(request.allow_public_credit));
  formData.append('rights_confirmed', String(request.rights_confirmed));
  if (request.license) formData.append('license', request.license);
  if (request.license_url) formData.append('license_url', request.license_url);
  if (request.community_permission) {
    formData.append('community_permission', request.community_permission);
  }

  formData.append('photo', {
    uri: request.photo.uri,
    type: request.photo.type,
    name: request.photo.fileName,
  } as any);

  const response = await fetch(`${API_BASE}/api/contributions`, {
    method: 'POST',
    body: formData,
    headers: { Accept: 'application/json' },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Could not submit your photo. Please try again.');
  }
  return data as SubmitContributionResponse;
}

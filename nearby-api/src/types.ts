// ── Types ──

export type SubmissionStatus = "pending" | "approved" | "rejected" | "needs_review";

/** Rejection reasons an admin can pick when rejecting a photo submission. */
export const REJECTION_REASONS = [
  "Blurry / out of focus",
  "Wrong location",
  "Inappropriate content",
  "Poor / unclear view of the location",
  "Duplicate photo",
  "Other",
] as const;

export type RejectionReason = (typeof REJECTION_REASONS)[number];

export interface PhotoSubmission {
  id: string;
  app_name: string;
  location_id: string;
  location_name: string;
  user_info: string | null;
  photo_path: string;
  photo_public_url: string | null;
  comment: string | null;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  status: SubmissionStatus;
  rejection_reason?: string | null;
  rejection_note?: string | null;
  rejection_email_sent?: number | null;
  rejection_email_to?: string | null;
}

export interface GalleryPhoto {
  id: string;
  url: string;
  submitted_by: string;
  submitted_at: string;
  comment: string | null;
}

export interface HealthResponse {
  status: "ok";
  timestamp: string;
}

export interface SubmissionResponse {
  success: boolean;
  submission_id?: string;
  message?: string;
  public_url?: string;
  error?: string;
}

export interface ApiError {
  error: string;
}

// ── Location types ──

export interface RemoteDestination {
  country?: string;
  island?: string;
  warnings?: string[];
  details?: string[];
  ferry_required?: boolean;
  travel_time?: string;
}

export interface LocationRecord {
  id: string;
  title: string;
  movie_or_show: string;
  year: number;
  category: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  country: string;
  scene_description: string;
  fun_fact: string;
  quote: string | null;
  quote_attribution: string | null;
  then_and_now: string | null;
  is_movie: number;
  image_url: string | null;
  focal_point_x: number | null;
  focal_point_y: number | null;
  remote_destination_json: string | null;
  actors_json: string | null;
  estimated_visit_time: string | null;
  worth_it_percentage: number | null;
  worth_it_votes: number | null;
}

export interface FilmingLocation {
  id: string;
  title: string;
  movieOrShow: string;
  year: number;
  category: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  country: string;
  sceneDescription: string;
  funFact: string;
  quote: string | null;
  quoteAttribution: string | null;
  thenAndNow: string | null;
  isMovie: boolean;
  imageUrl: string | null;
  focalPoint: { x: number; y: number } | null;
  remoteDestination: RemoteDestination | null;
  actors: string[];
  estimatedVisitTime: string | null;
  worthItPercentage: number | null;
  worthItVotes: number | null;
  distance?: number;
  addedAt: string | null;
  source: "research" | "manual";
  approvedBy: string | null;
}

export interface LocationSummary {
  id: string;
  title: string;
  movieOrShow: string;
  year: number;
  category: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  country: string;
  sceneDescription: string;
  actors: string[];
  imageUrl: string | null;
  focalPoint: { x: number; y: number } | null;
  isMovie: boolean;
  distance?: number;
}
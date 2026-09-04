// ── Research pipeline shared types ──
// These mirror the Firestore research_* field contract used by the web Admin
// (admin/src/lib/research.ts) and the in-app Admin Research screen. Field
// names here are a contract — do not rename without updating both UIs.
export type MovieType = "movie" | "show";

export type VerificationStatus =
  | "needs_research"
  | "ready_for_review"
  | "verified"
  | "approved"
  | "rejected";

export type PhotoUseStatus =
  | "verified_reusable"
  | "permission_required"
  | "unknown"
  | "no_photo_found";

export interface ResearchMovie {
  id: string; // slug, e.g. "the-dark-knight-2008"
  title: string;
  year: number;
  type: MovieType;
  created_at: string;
}

export interface ResearchCandidate {
  id: string;
  movie_id: string;
  name: string;
  movie_or_show: string;
  year: number;
  city: string;
  country: string;
  proposed_address: string;
  latitude: number;
  longitude: number;
  scene_description: string;
  fun_fact: string;
  episode: string | null;
  confidence: number; // raw 0-100 integer
  verification_status: VerificationStatus;
  research_notes: string;
  region_level: boolean; // true = city/region-level lead, never ready_for_review
  created_at: string;
  updated_at: string;
}

export interface ResearchSource {
  id: string;
  candidate_id: string;
  url: string;
  title: string;
  kind: string;
  note: string;
  accessed_at: string;
}

export interface ResearchPhotoCandidate {
  id: string;
  candidate_id: string;
  url: string;
  source_url: string;
  license: string;
  creator: string;
  attribution_required: boolean;
  photo_use_status: PhotoUseStatus;
  accessed_at: string;
}

export type JobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface ResearchJobStats {
  candidates_found: number;
  candidates_added: number;
  duplicates_skipped: number;
  geocoded: number;
  photos_found: number;
  sources_count: number;
  region_leads: number;
  prose_rejected: number;
  context_mismatches: number;
  stage1_skipped?: number;
}

export interface ResearchJob {
  id: string; // slug, e.g. "the-dark-knight-2008"
  movie_title: string;
  year: number;
  type: MovieType;
  status: JobStatus;
  attempts: number;
  error: string | null;
  stats: ResearchJobStats;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  created_by: string;
  dry_run: boolean;
}

// ── Server-side config (Turso research_config table, all changeable without an app build) ──
export interface ResearchConfig {
  max_candidates_per_job: number; // 25
  max_jobs_per_day: number; // 20
  max_sources_per_candidate: number; // 10
  max_photos_per_candidate: number; // 5
  max_geocode_attempts_per_job: number; // 40
  job_timeout_ms: number; // 15 * 60 * 1000
  poll_interval_ms: number; // 60 * 1000
  pause_research: boolean; // kill switch
  nominatim_max_rps: number; // 1
  commons_max_results: number; // 5
  wikipedia_max_candidates: number; // 25 (cap on raw mentions before dedupe)
  priority_default_target: number; // 10 — minimum coverage target (candidates produced) per priority request
  priority_films_per_pass: number; // 3 — region priority: films processed per worker pass
  priority_pass_timeout_ms: number; // 10 * 60 * 1000
}

export const DEFAULT_CONFIG: ResearchConfig = {
  max_candidates_per_job: 25,
  max_jobs_per_day: 20,
  max_sources_per_candidate: 10,
  max_photos_per_candidate: 5,
  max_geocode_attempts_per_job: 40,
  job_timeout_ms: 15 * 60 * 1000,
  poll_interval_ms: 60 * 1000,
  pause_research: false,
  nominatim_max_rps: 1,
  commons_max_results: 5,
  wikipedia_max_candidates: 25,
  priority_default_target: 12, // candidates per priority request — headroom so >=5 land LIVE after owner review (goal: every state >=5 locations)
  priority_films_per_pass: 3,
  priority_pass_timeout_ms: 10 * 60 * 1000,
};

// ── Worker intermediate types ──
export interface RawLocationMention {
  name: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceKind: "wikidata" | "wikipedia" | "wikipedia-section" | "trusted-reference";
  note: string;
  wikidataId?: string;
  coords?: { lat: number; lng: number };
  addressHint?: string;
  cityHint?: string;
  countryHint?: string;
}

export interface CandidateDraft {
  name: string;
  mentions: RawLocationMention[];
  wikidataId?: string;
  coords?: { lat: number; lng: number };
  address?: string;
  city?: string;
  country?: string;
  confidence: number;
  sources: ResearchSource[];
  photos: ResearchPhotoCandidate[];
  duplicateOfProduction?: string;
  duplicateOfCandidate?: string;
  regionLevel?: boolean; // true = city/region-level lead (never ready_for_review)
  geocodeContextMismatch?: boolean; // Nominatim pin landed outside film's contexts
  stage1Skipped?: boolean; // stopped by Stage-1 upper-bound gate before geocode/photo
  researchNote?: string;
}

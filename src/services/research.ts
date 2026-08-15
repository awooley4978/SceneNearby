// ── Location Research data layer (in-app Admin) ──
// Port of the web Admin's research layer (admin/src/lib/research.ts). Research
// data lives in Firestore collections research_movies / research_candidates /
// research_sources / research_photo_candidates — fully isolated from the
// production `locations` collection, Turso, and the nearby-api. Field names are
// a contract shared with the web Admin and future automation: do not rename.
//
// Approve/Reject update verification_status on the research_candidates document
// ONLY — never production data.

import {
  collection,
  doc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';

// ── Types (mirror of admin/src/lib/research.ts) ──

export type MovieType = 'movie' | 'show';

export interface ResearchMovie {
  id: string; // slug
  title: string;
  year: number;
  type: MovieType;
  created_at: string;
}

export type VerificationStatus =
  | 'needs_research'
  | 'ready_for_review'
  | 'verified'
  | 'approved'
  | 'rejected';

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

export type PhotoUseStatus =
  | 'verified_reusable'
  | 'permission_required'
  | 'unknown'
  | 'no_photo_found';

export interface ResearchPhotoCandidate {
  id: string;
  candidate_id: string;
  url: string;
  source_url: string;
  license: string;
  creator: string;
  attribution_required: boolean;
  use_status: PhotoUseStatus;
  note: string;
}

// ── Read helpers ──

export async function fetchResearchMovies(): Promise<ResearchMovie[]> {
  const snap = await getDocs(collection(db, 'research_movies'));
  return snap.docs.map((d) => d.data() as ResearchMovie).sort((a, b) => a.title.localeCompare(b.title));
}

export async function fetchResearchCandidates(): Promise<ResearchCandidate[]> {
  const snap = await getDocs(collection(db, 'research_candidates'));
  return snap.docs.map((d) => d.data() as ResearchCandidate);
}

export async function fetchResearchSources(): Promise<ResearchSource[]> {
  const snap = await getDocs(collection(db, 'research_sources'));
  return snap.docs.map((d) => d.data() as ResearchSource);
}

export async function fetchResearchPhotoCandidates(): Promise<ResearchPhotoCandidate[]> {
  const snap = await getDocs(collection(db, 'research_photo_candidates'));
  return snap.docs.map((d) => d.data() as ResearchPhotoCandidate);
}

// ── Write helper (research data only — never production) ──

export async function updateCandidateStatus(
  id: string,
  status: VerificationStatus,
): Promise<void> {
  await setDoc(
    doc(db, 'research_candidates', id),
    { verification_status: status, updated_at: new Date().toISOString() },
    { merge: true },
  );
}

// ── Display constants ──

export const STATUS_META: Record<VerificationStatus, { label: string; color: string }> = {
  verified: { label: 'Verified', color: '#22c55e' },
  approved: { label: 'Approved', color: '#22c55e' },
  ready_for_review: { label: 'Ready for Review', color: '#F5C518' },
  needs_research: { label: 'Needs Research', color: '#f59e0b' },
  rejected: { label: 'Rejected', color: '#ef4444' },
};

export const PHOTO_STATUS_META: Record<PhotoUseStatus, { label: string; color: string }> = {
  verified_reusable: { label: 'Verified Reusable', color: '#22c55e' },
  permission_required: { label: 'Permission Required', color: '#F5C518' },
  unknown: { label: 'Unknown', color: '#f59e0b' },
  no_photo_found: { label: 'No Photo Found', color: '#ef4444' },
};

// Confidence color: green at 90+, gold at 75+, gray below.
export function confidenceColor(confidence: number): string {
  if (confidence >= 90) return '#22c55e';
  if (confidence >= 75) return '#F5C518';
  return '#6b7280';
}

// Secondary sort order for verification status (lower = earlier when confidence ties).
export const STATUS_SORT_ORDER: Record<VerificationStatus, number> = {
  verified: 0,
  approved: 1,
  ready_for_review: 2,
  needs_research: 3,
  rejected: 4,
};

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

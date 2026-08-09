import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';

interface WorthItData {
  absolutely: number;
  nearby: number;
  bigFan: number;
}

export type WorthItVote = 'absolutely' | 'nearby' | 'big_fan';

export interface WorthItStats {
  absolutely: number;
  nearby: number;
  bigFan: number;
  total: number;
  worthItPercent: number; // (absolutely + nearby) / total
}

const VOTE_KEYS: Record<WorthItVote, keyof WorthItData> = {
  absolutely: 'absolutely',
  nearby: 'nearby',
  big_fan: 'bigFan',
};

export async function submitWorthItVote(
  locationId: string,
  userId: string,
  vote: WorthItVote
): Promise<WorthItStats> {
  const ref = doc(db, 'locations', locationId);
  const userVoteRef = doc(db, 'locations', locationId, 'worthItVotes', userId);

  const stats = await runTransaction(db, async (t) => {
    const locSnap = await t.get(ref);
    const data: WorthItData = locSnap.exists()
      ? (locSnap.data() as WorthItData)
      : { absolutely: 0, nearby: 0, bigFan: 0 };

    const userVoteSnap = await t.get(userVoteRef);
    if (userVoteSnap.exists()) {
      const prevVote = userVoteSnap.data().vote as WorthItVote;
      const prevKey = VOTE_KEYS[prevVote];
      data[prevKey] = Math.max(0, data[prevKey] - 1);
    }

    const newKey = VOTE_KEYS[vote];
    data[newKey]++;

    t.set(ref, data, { merge: true });
    t.set(userVoteRef, { vote, timestamp: Date.now() });

    const total = data.absolutely + data.nearby + data.bigFan;
    return {
      absolutely: total > 0 ? Math.round((data.absolutely / total) * 100) : 0,
      nearby: total > 0 ? Math.round((data.nearby / total) * 100) : 0,
      bigFan: total > 0 ? Math.round((data.bigFan / total) * 100) : 0,
      total,
      worthItPercent: total > 0 ? Math.round(((data.absolutely + data.nearby) / total) * 100) : 0,
    };
  });

  return stats;
}

export async function getWorthItStats(
  locationId: string
): Promise<WorthItStats | null> {
  const ref = doc(db, 'locations', locationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as WorthItData;
  const total = (data.absolutely || 0) + (data.nearby || 0) + (data.bigFan || 0);
  return {
    absolutely: total > 0 ? Math.round(((data.absolutely || 0) / total) * 100) : 0,
    nearby: total > 0 ? Math.round(((data.nearby || 0) / total) * 100) : 0,
    bigFan: total > 0 ? Math.round(((data.bigFan || 0) / total) * 100) : 0,
    total,
    worthItPercent: total > 0 ? Math.round((((data.absolutely || 0) + (data.nearby || 0)) / total) * 100) : 0,
  };
}

export async function submitVisitTime(
  locationId: string,
  userId: string,
  timeRange: string
): Promise<string> {
  const ref = doc(db, 'locations', locationId, 'visitTimes', userId);
  await setDoc(ref, { timeRange, timestamp: Date.now() });

  // Return the most common time range
  const colRef = collection(db, 'locations', locationId, 'visitTimes');
  const allSnaps = await getDocs(colRef);
  if (allSnaps.empty) return timeRange;

  const counts: Record<string, number> = {};
  allSnaps.forEach((d) => {
    const t = d.data().timeRange as string;
    counts[t] = (counts[t] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

export async function getVisitTimeStats(
  locationId: string
): Promise<string | null> {
  const colRef = collection(db, 'locations', locationId, 'visitTimes');
  const allSnaps = await getDocs(colRef);
  if (allSnaps.empty) return null;

  const counts: Record<string, number> = {};
  allSnaps.forEach((d) => {
    const t = d.data().timeRange as string;
    counts[t] = (counts[t] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// ── Visitor Tips ──

export interface VisitorTip {
  id: string;
  text: string;
  userId: string;
  createdAt: number;
}

export async function submitVisitorTip(
  locationId: string,
  userId: string,
  text: string
): Promise<void> {
  const ref = doc(collection(db, 'visitorTips', locationId, 'tips'));
  await setDoc(ref, {
    text,
    userId,
    createdAt: Date.now(),
  });
}

export async function fetchVisitorTips(
  locationId: string
): Promise<VisitorTip[]> {
  const colRef = collection(db, 'visitorTips', locationId, 'tips');
  const snaps = await getDocs(colRef);
  if (snaps.empty) return [];
  return snaps.docs
    .map((d) => ({ id: d.id, ...d.data() } as VisitorTip))
    .sort((a, b) => b.createdAt - a.createdAt);
}

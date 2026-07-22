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
  yes: number;
  no: number;
}

export async function submitWorthItVote(
  locationId: string,
  userId: string,
  vote: boolean
): Promise<{ percentage: number; votes: number }> {
  const ref = doc(db, 'locations', locationId);
  const userVoteRef = doc(db, 'locations', locationId, 'worthItVotes', userId);

  const { percentage, votes } = await runTransaction(db, async (t) => {
    const locSnap = await t.get(ref);
    const data: WorthItData = locSnap.exists()
      ? (locSnap.data() as WorthItData)
      : { yes: 0, no: 0 };

    const userVoteSnap = await t.get(userVoteRef);
    if (userVoteSnap.exists()) {
      const prevVote = userVoteSnap.data().vote as boolean;
      if (prevVote) data.yes = Math.max(0, data.yes - 1);
      else data.no = Math.max(0, data.no - 1);
    }

    if (vote) data.yes++;
    else data.no++;

    t.set(ref, data, { merge: true });
    t.set(userVoteRef, { vote, timestamp: Date.now() });

    const total = data.yes + data.no;
    return {
      percentage: total > 0 ? Math.round((data.yes / total) * 100) : 0,
      votes: total,
    };
  });

  return { percentage, votes };
}

export async function getWorthItStats(
  locationId: string
): Promise<{ percentage: number; votes: number } | null> {
  const ref = doc(db, 'locations', locationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as WorthItData;
  const total = (data.yes || 0) + (data.no || 0);
  return {
    percentage: total > 0 ? Math.round(((data.yes || 0) / total) * 100) : 0,
    votes: total,
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

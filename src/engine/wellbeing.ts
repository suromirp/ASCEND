// ASCEND — the morning check-in (docs/onderzoek/Pijn spierpijn en
// vermoeidheid melden.md): when to ask it, and what its answers mean.
// Subjective fatigue follows training load better than most objective
// measures (Saw, Main en Gastin 2016), so it is asked in a few taps, in
// your own terms compared with normal.
//
// Pure: no React, no IndexedDB.

import type { MorningCheckIn } from '../models/checkIn';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { addDays } from '../utils/dates';
import { painReports } from './pain';
import { resolveEffectiveStressProfile } from './stressProfile';

const PAIN_WINDOW_DAYS = 14;

export function checkInFor(date: string, checkIns: MorningCheckIn[] | undefined): MorningCheckIn | undefined {
  return (checkIns ?? []).find((c) => c.date === date);
}

// The spot that hurt most recently in the last 14 days, with its last score:
// asked again in the morning (does it settle by the next morning?).
export function recentPainSpot(today: string, logs: SessionLog[]): { area: string; lastScore: number; date: string } | undefined {
  const since = addDays(today, -PAIN_WINDOW_DAYS);
  const recent = logs
    .filter((l) => l.completedDate >= since && l.completedDate <= today && painReports(l).length > 0)
    .sort((a, b) => b.completedDate.localeCompare(a.completedDate))[0];
  if (!recent) return undefined;
  const top = [...painReports(recent)].sort((a, b) => b.score - a.score)[0];
  return { area: top.area, lastScore: top.score, date: recent.completedDate };
}

// Asked on a training day, and on the day after a session heavy for the
// legs or one with pain. Not twice on one day.
export function shouldAskCheckIn(today: string, checkIns: MorningCheckIn[] | undefined, logs: SessionLog[], planned: PlannedSession[], templates: SessionTemplate[]): boolean {
  if (checkInFor(today, checkIns)) return false;
  const byId = new Map(templates.map((t) => [t.id, t]));
  const trainingToday = planned.some((s) => s.scheduledDate === today && s.status !== 'skipped' && byId.get(s.templateId)?.type !== 'recovery');
  const yesterday = addDays(today, -1);
  const heavyYesterday = logs.some((l) => {
    if (l.completedDate !== yesterday) return false;
    const t = byId.get(l.templateId);
    return painReports(l).length > 0 || (!!t && resolveEffectiveStressProfile(t).lowerBodyLoad === 'heavy');
  });
  return trainingToday || heavyYesterday;
}

export interface MorningSignals {
  sore: 'none' | 'spierpijn' | 'flink';
  negatives: number; // energy moe 1, op 2; sleep slecht 1; flinke spierpijn 1
  rest: boolean; // "Op", or two negatives: a calm day
  spotWorse?: { area: string; score: number; lastScore: number }; // morning pain above 5 or 2 up
}

export function morningSignals(checkIn: MorningCheckIn | undefined, logs: SessionLog[]): MorningSignals {
  if (!checkIn || checkIn.allNormal) return { sore: 'none', negatives: 0, rest: false };
  const sore = checkIn.legs === 'flink' ? 'flink' : checkIn.legs === 'spierpijn' ? 'spierpijn' : 'none';
  const negatives = (checkIn.energy === 'op' ? 2 : checkIn.energy === 'moe' ? 1 : 0) + (checkIn.sleep === 'slecht' ? 1 : 0) + (sore === 'flink' ? 1 : 0);
  let spotWorse: MorningSignals['spotWorse'];
  if (checkIn.spot) {
    const last = recentPainSpot(checkIn.date, logs.filter((l) => l.completedDate < checkIn.date));
    const lastScore = last && last.area === checkIn.spot.area ? last.lastScore : 0;
    if (checkIn.spot.score > 5 || checkIn.spot.score >= lastScore + 2) spotWorse = { area: checkIn.spot.area, score: checkIn.spot.score, lastScore };
  }
  return { sore, negatives, rest: checkIn.energy === 'op' || negatives >= 2, spotWorse };
}

// What your answers do, in one sentence, before you save: the same signals the
// advice reads (adviceEngine.ts#morningAdvice). Nothing moves without your Akkoord.
export function checkInEffect(answers: Pick<MorningCheckIn, 'legs' | 'energy' | 'sleep'>): string {
  const sig = morningSignals({ date: '', ...answers }, []);
  if (sig.rest) return 'Dan wordt vandaag een rustige dag: ASCEND stelt voor je zware training op te schuiven. Jij beslist.';
  if (sig.sore !== 'none') return 'Dan stelt ASCEND voor je eerstvolgende zware training of beendag een dag op te schuiven. Jij beslist.';
  if (sig.negatives === 1) return 'ASCEND noemt het bij je training; je planning blijft zoals hij is.';
  return 'Je planning blijft zoals hij is.';
}

// Three tired mornings in a row: a block of a few lighter days (Nuuttila e.a.
// 2022: recreational runners did better when the plan followed this).
export function tiredStreak(today: string, checkIns: MorningCheckIn[] | undefined): number {
  let n = 0;
  for (let d = 0; d < 7; d++) {
    const c = checkInFor(addDays(today, -d), checkIns);
    if (!c || c.allNormal || !(c.energy === 'moe' || c.energy === 'op')) break;
    n++;
  }
  return n;
}



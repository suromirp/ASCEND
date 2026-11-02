// ASCEND: wat dit toestel onthoudt van "Liever niet" bij de melding over spieren voor de berg
// (engine/mountainMuscles.ts). Alleen een herinnering om niet te zeuren, geen gegeven over je training: het
// staat niet in de back-up. Zonder opslag (privémodus, geweigerd) komt de melding gewoon terug.

import { MUSCLE_GROUPS } from '../models/exercise';
import type { MuscleDecline } from '../engine/mountainMuscles';

const KEY = 'ascend.bergspieren.nee';
const MAX = 12;

export function readMuscleDeclines(): MuscleDecline[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter((d): d is MuscleDecline => !!d && typeof d === 'object'
      && (MUSCLE_GROUPS as readonly unknown[]).includes((d as MuscleDecline).muscle)
      && typeof (d as MuscleDecline).weekStart === 'string' && /^\d{4}-\d{2}-\d{2}$/.test((d as MuscleDecline).weekStart));
  } catch {
    return [];
  }
}

export function rememberMuscleDecline(decline: MuscleDecline): void {
  try {
    const next = [...readMuscleDeclines().filter((d) => d.muscle !== decline.muscle), decline].slice(-MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // geen opslag: de melding komt de volgende keer terug, er gaat niets stuk
  }
}

// "Alles verwijderen" wist ook deze herinnering (storage/databaseSeed.ts#resetToDemoData).
export function clearMuscleDeclines(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // geen opslag: dan is er ook niets te wissen
  }
}

// ASCEND: Je stand, kaart Ritme en de zin bovenaan (docs/beslissingen/2026-11-02-gegevens-herinrichting.md).
//
// Ritme beantwoordt één vraag: doe je over een paar weken wat gepland staat? De telling is die van de coach op
// Ascend (engine/onCourse.ts#recentAdherence, dezelfde lat in `adherenceStatus`), per week opgesplitst in
// stipjes. Deze week telt niet mee in het getal; die staat op Week. Er komt niets nieuws in de opslag:
// alles is afgeleid. Puur: geen React, geen IndexedDB.

import type { Adherence } from './onCourse';
import { adherenceStatus } from './onCourse';
import type { WeekReview } from './weekReview';
import { LOAD_JUMP, loadVersusBefore, type WeekLoad } from './standing';
import { formatNumberNL } from '../utils/number';
import { capitalize } from '../utils/capitalize';

export interface RhythmWeek {
  weekStart: string;
  done: number;
  planned: number;
  // Alleen voor deze week: wat al voorbij is zonder gedaan te zijn.
  missed: number;
  // Alleen voor deze week: wat nog komt (een open rondje).
  open: number;
  current: boolean;
}

export interface Rhythm {
  enough: boolean;
  verdict?: string; // "Op koers"
  status?: 'on' | 'nearly' | 'behind';
  sentence?: string; // "Laatste 4 weken: 18 van 23 gedaan."
  fact: string; // voor onder het oordeel op de lucht: "18 van 23"
  weeks: RhythmWeek[];
  streakLine?: string;
}

const VERDICT = { on: 'Op koers', nearly: 'Bijna op koers', behind: 'Achter op schema' } as const;

// "Op rij" komt pas in beeld vanaf drie trainingsdagen: bij 0, 1 of 2 is er niets te vieren.
const STREAK_FROM = 3;

export function buildRhythm(input: { adherence: Adherence; thisWeek: WeekReview | null; streak: number }): Rhythm {
  const { adherence, thisWeek, streak } = input;
  const weeks: RhythmWeek[] = [...adherence.reviews]
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .map((r) => ({ weekStart: r.weekStart, done: r.done, planned: r.planned, missed: r.planned - r.done, open: 0, current: false }));
  if (thisWeek && thisWeek.planned > 0) {
    const missed = Math.min(thisWeek.missed.length, thisWeek.planned - thisWeek.done);
    weeks.push({ weekStart: thisWeek.weekStart, done: thisWeek.done, planned: thisWeek.planned, missed, open: Math.max(0, thisWeek.planned - thisWeek.done - missed), current: true });
  }
  const streakLine = streak >= STREAK_FROM ? `Nu ${streak} trainingsdagen op rij alles gedaan.` : undefined;
  if (!adherence.enough) {
    return { enough: false, fact: 'nog niets', weeks, streakLine };
  }
  const status = adherenceStatus(adherence);
  return {
    enough: true,
    status,
    verdict: VERDICT[status],
    sentence: `Laatste ${adherence.weeks} ${adherence.weeks === 1 ? 'week' : 'weken'}: ${adherence.done} van ${adherence.planned} gedaan.`,
    fact: `${adherence.done} van ${adherence.planned}`,
    weeks,
    streakLine,
  };
}

export interface LoadVerdict { word: string; fact: string; level: 'rustig' | 'lijn' | 'zwaar' }

// Belasting in één woord, met dezelfde grenzen als de zin onder de weekbalken (LOAD_JUMP).
export function loadVerdict(weeks: WeekLoad[]): LoadVerdict | undefined {
  const current = weeks.find((w) => w.isCurrent);
  if (!current) return undefined;
  const jump = loadVersusBefore(weeks);
  if (!jump) return current.isRestWeek ? { word: 'Rustig', level: 'rustig', fact: 'rustweek' } : undefined;
  // Het oordeel kijkt naar de hele week (gedaan plus wat vanaf vandaag nog komt), dus het getal ook; anders staat er
  // "0 van 1.718" op maandag. "Nu" en niet "gepland": wat je al deed telt mee, een gemiste training niet.
  const fact = `nu ${formatNumberNL(jump.now, 0)}, gewoonlijk ${formatNumberNL(jump.before, 0)}`;
  if (current.isRestWeek) return { word: 'Rustig', level: 'rustig', fact };
  if (jump.doneRatio > LOAD_JUMP || jump.ratio > LOAD_JUMP) return { word: 'Zwaar', level: 'zwaar', fact };
  if (jump.ratio < 0.7) return { word: 'Rustig', level: 'rustig', fact };
  return { word: 'In lijn', level: 'lijn', fact };
}

// Eén zin bovenaan Je stand, uit de drie oordelen. Een rustweek komt erbij.
export function standSentence(input: { legLevel: 0 | 1 | 2 | undefined; load?: LoadVerdict; rhythm: Rhythm; restWeek: boolean }): string {
  const { legLevel, load, rhythm, restWeek } = input;
  const parts: string[] = [];
  if (legLevel !== undefined) parts.push(legLevel === 0 ? 'je benen zijn fris' : legLevel === 1 ? 'je benen zijn wat vermoeid' : 'je benen zijn vermoeid');
  if (load) parts.push(load.level === 'lijn' ? 'je week is in lijn' : load.level === 'zwaar' ? 'je week is zwaar' : 'je week is rustig');
  if (rhythm.enough && rhythm.status) {
    parts.push(rhythm.status === 'on' ? 'je ritme houdt' : rhythm.status === 'nearly' ? 'je ritme zit er bijna in' : 'je ritme loopt achter');
  }
  const joined = parts.length === 0 ? '' : `${parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} en ${parts[parts.length - 1]}`}.`;
  const sentence = joined ? capitalize(joined) : '';
  const rest = restWeek ? 'Deze week is een rustweek. Zo komt de training van de weken ervoor binnen.' : '';
  return [sentence, rest].filter(Boolean).join(' ');
}

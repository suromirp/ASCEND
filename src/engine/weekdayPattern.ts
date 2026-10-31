// ASCEND: patronen per weekdag (docs/onderzoek/Kansen met gegevens.md, kans G;
// docs/beslissingen/2026-10-31-kansen-stap-0.md).
//
// Past het plan bij je week? Kijkt de laatste acht weken terug: op welke weekdag valt je training
// duidelijk vaker weg dan op de andere dagen. Geen sportwetenschap, praktijk; de drempels zijn een
// eigen aanname en staan hieronder:
//
// - minstens 6 keer stond er op die weekdag een training;
// - minstens 4 keer viel hij weg, en dat is minstens de helft;
// - op die dag valt hij minstens 30 procentpunt vaker weg dan op de andere dagen samen.
//
// Wegvallen: overgeslagen, gemist, of door jou naar een andere dag geschoven. Vrije dagen,
// vakanties, tochten en ziekte tellen niet mee. Alleen een zin: de weekvorm later wijzigen gaat
// via de planning, als voorstel met Akkoord, nooit vanzelf.
//
// Puur: geen React, geen IndexedDB.

import type { PlannedSession, SessionLog } from '../models/training';
import { addDays, isoWeekday } from '../utils/dates';

export const PATTERN_WEEKS = 8;
export const MIN_OCCASIONS = 6;
export const MIN_MISSED = 4;
export const MIN_SHARE = 0.5;
export const MIN_GAP = 0.3;

const DAY_NAME = ['', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
const COUNT_WORD = ['nul', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien', 'elf', 'twaalf'];
const word = (n: number) => COUNT_WORD[n] ?? String(n);

export interface WeekdayPattern {
  weekday: number; // 1 = maandag ... 7 = zondag
  occasions: number;
  missed: number;
  text: string;
}

export interface WeekdayPatternInput {
  today: string;
  planned: readonly PlannedSession[];
  logs: readonly Pick<SessionLog, 'plannedSessionId'>[];
  // Dagen die niet meetellen: vrije dagen, vakanties, tochten, ziekte.
  excludedDays?: ReadonlySet<string>;
  // Een rustdag in de planning is geen training (de rusttemplate).
  isRest?: (s: PlannedSession) => boolean;
}

export function weekdayPattern(input: WeekdayPatternInput): WeekdayPattern | undefined {
  const from = addDays(input.today, -PATTERN_WEEKS * 7);
  const done = new Set(input.logs.map((l) => l.plannedSessionId).filter((id): id is string => !!id));
  const occasions = new Array(8).fill(0);
  const missed = new Array(8).fill(0);
  for (const s of input.planned) {
    // De dag waar hij stond: bij een training die jij verschoof is dat de oude dag.
    const movedAway = !!s.movedFromDate && s.movedFromDate !== s.scheduledDate && s.status === 'moved';
    const day = movedAway ? s.movedFromDate! : s.scheduledDate;
    if (s.status === 'optional' || day < from || day >= input.today || input.excludedDays?.has(day) || input.isRest?.(s)) continue;
    const wd = isoWeekday(day);
    occasions[wd]++;
    const gone = !done.has(s.id) && (s.status === 'skipped' || s.scheduledDate < input.today);
    if (movedAway || gone) missed[wd]++;
  }
  const totalOcc = occasions.reduce((a, b) => a + b, 0);
  const totalMissed = missed.reduce((a, b) => a + b, 0);
  let best: WeekdayPattern | undefined;
  for (let wd = 1; wd <= 7; wd++) {
    if (occasions[wd] < MIN_OCCASIONS || missed[wd] < MIN_MISSED) continue;
    const share = missed[wd] / occasions[wd];
    const otherOcc = totalOcc - occasions[wd];
    const otherShare = otherOcc > 0 ? (totalMissed - missed[wd]) / otherOcc : 0;
    if (share < MIN_SHARE || share - otherShare < MIN_GAP) continue;
    if (best && missed[wd] / occasions[wd] <= best.missed / best.occasions) continue;
    best = {
      weekday: wd,
      occasions: occasions[wd],
      missed: missed[wd],
      text: `Op ${DAY_NAME[wd]} viel je training de laatste ${word(PATTERN_WEEKS)} weken ${word(missed[wd])} van de ${word(occasions[wd])} keer weg. Misschien past een andere dag beter in je week.`,
    };
  }
  return best;
}

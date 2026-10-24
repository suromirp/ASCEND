// ASCEND: de woorden bij de cijfers van Forge. Kleine verschillen met teken en
// eenheid ("+2,5 kg"), rustig en zonder oordeel: vooruit krijgt de toon 'up',
// gelijk en achteruit allebei 'flat'. Puur.

import type { Exercise } from '../models/exercise';
import { formatNumberNL } from '../utils/number';
import { isRepsBased, type ExtraChange } from './forgeHistory';
import type { ExerciseView } from './strengthHistory';
import type { OneRmView } from './strengthSettings';
import { formatWeight } from './strengthModel';

export type DeltaTone = 'up' | 'flat';

const nl = (n: number) => formatNumberNL(n, 1);

// "+2,5 kg", "-1 kg" of "gelijk". Een tiende of minder telt als gelijk.
export function signedKg(delta: number): string {
  if (Math.abs(delta) < 0.05) return 'gelijk';
  return `${delta > 0 ? '+' : '-'}${nl(Math.abs(delta))} kg`;
}

export const deltaTone = (delta: number | undefined): DeltaTone => (delta !== undefined && delta >= 0.05 ? 'up' : 'flat');

const reps = (n: number) => (n === 1 ? 'herhaling' : 'herhalingen');
const whole = (n: number) => formatNumberNL(Math.round(n), 0);

// De regel bij een verandering naast het getal.
export function extraText(c: ExtraChange): string {
  const sign = c.delta > 0 ? '+' : '-';
  switch (c.kind) {
    case 'reps_same_weight':
      return c.delta === 0
        ? `Evenveel herhalingen bij ${nl(c.atKg ?? 0)} kg`
        : `${sign}${Math.abs(c.delta)} ${reps(Math.abs(c.delta))} bij ${nl(c.atKg ?? 0)} kg`;
    case 'top_weight':
      return `${sign}${nl(Math.abs(c.delta))} kg in je zwaarste set`;
    case 'total_reps':
      return c.delta === 0 ? 'Evenveel herhalingen in totaal' : `${sign}${Math.abs(c.delta)} ${reps(Math.abs(c.delta))} in totaal`;
    case 'volume':
      return c.delta === 0 ? 'Gelijk volume per training' : `${sign}${whole(Math.abs(c.delta))} kg volume per training`;
  }
}

export const extraTone = (c: ExtraChange): DeltaTone => (c.delta > 0 ? 'up' : 'flat');

// Het getal van een oefening in de kolom: bij de 1RM gewoon kilo's. Bij het werkgewicht
// van een oefening met hulp staat de hulp negatief: met je lichaamsgewicht erbij is het
// wat je zelf optilt, zonder lichaamsgewicht "hulp 30 kg".
export type ValueKind = OneRmView | 'reps';

// Welk soort getal een oefening toont: herhalingen bij een oefening op herhalingen,
// anders de gekozen kant.
export const valueKind = (view: ExerciseView, mode: OneRmView): ValueKind => (isRepsBased(view) ? 'reps' : mode);

export const repsLabel = (n: number): string => `${formatNumberNL(n, 0)} ${n === 1 ? 'herhaling' : 'herhalingen'}`;

export function valueText(value: number, kind: ValueKind, exercise: Exercise | undefined, bodyKg: number | undefined, short = false): string {
  if (kind === 'reps') return short ? `${formatNumberNL(value, 0)} herh.` : repsLabel(value);
  if (kind === 'work_weight' && exercise?.resistance === 'assisted_bodyweight') {
    return bodyKg ? `${nl(bodyKg + value)} kg` : `hulp ${nl(Math.abs(value))} kg`;
  }
  return `${nl(value)} kg`;
}

// De zwaarste set zoals hij gelogd is: "60 kg x 8", "hulp 30 kg x 8".
export const topSetText = (exercise: Exercise | undefined, weightKg: number | undefined, repCount: number | undefined): string | undefined =>
  weightKg === undefined || repCount === undefined ? undefined : `${formatWeight(exercise, weightKg)} x ${repCount}`;

// Het verschil bij een oefening met hulp zonder lichaamsgewicht: meer is minder hulp.
export function deltaText(delta: number, kind: ValueKind, exercise: Exercise | undefined, bodyKg: number | undefined, short = false): string {
  if (kind === 'reps') return Math.abs(delta) < 0.5 ? 'gelijk' : `${delta > 0 ? '+' : '-'}${Math.abs(Math.round(delta))} ${short ? 'herh.' : reps(Math.abs(Math.round(delta)))}`;
  if (kind === 'work_weight' && exercise?.resistance === 'assisted_bodyweight' && !bodyKg && Math.abs(delta) >= 0.05) {
    return `${nl(Math.abs(delta))} kg ${delta > 0 ? 'minder' : 'meer'} hulp`;
  }
  return signedKg(delta);
}

const SHORT_MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

// "12 okt", met het jaar erbij als het niet het jaar van `today` is ("12 okt 2025").
export function shortDateNL(iso: string, today: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${SHORT_MONTHS[m - 1]}${String(y) === today.slice(0, 4) ? '' : ` ${y}`}`;
}

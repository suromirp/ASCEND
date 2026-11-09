// ASCEND: wat Forge bij een oefening met eigen gewicht laat zien: een klein bolletje "84,2 kg · 50%" en de tekst
// van het blad erachter (docs/beslissingen/2026-11-09-gewicht-bij-eigen-gewicht.md).
//
// Puur: geen React, geen opslag. Het gewicht komt uit `weightTrend.ts#loadWeight` (de trend, of de laatste
// weging met te weinig wegingen of als je daarvoor kiest), het aandeel uit `Exercise.bodyweightFraction`.

import type { Exercise } from '../models/exercise';
import { shareSource } from '../data/bodyweightShares';
import { formatDayMonthNL } from '../utils/dates';
import { formatNumberNL } from '../utils/number';
import type { LoadWeight } from './weightTrend';

// Alleen een oefening waarbij je eigen gewicht (een deel ervan) de weerstand is: eigen gewicht of geholpen.
export function carriesBodyweight(exercise: Exercise | undefined): exercise is Exercise & { bodyweightFraction: number } {
  return !!exercise && exercise.bodyweightFraction !== undefined && (exercise.resistance === 'bodyweight' || exercise.resistance === 'assisted_bodyweight');
}

export interface BodyLoadView {
  // Het bolletje: "84,2 kg · 50%", of zonder gewicht "Gewicht invullen · 50%".
  chip: string;
  // Het blad.
  weight?: string;
  weightLabel: string;
  share: string;
  shareLine: string;
  explain: string;
  source: string;
}

const pct = (f: number) => `${formatNumberNL(f * 100, 0)}%`;
const kg = (v: number) => `${formatNumberNL(v, 1)} kg`;

export function bodyLoadView(exercise: Exercise | undefined, load: LoadWeight | undefined, mode: 'trend' | 'latest' | undefined): BodyLoadView | undefined {
  if (!carriesBodyweight(exercise)) return undefined;
  const f = exercise.bodyweightFraction;
  const share = pct(f);
  const source = shareSource(exercise.id);
  if (!load) {
    return { chip: `Gewicht invullen · ${share}`, weightLabel: 'Nog geen gewicht', share, shareLine: share, explain: `Bij deze oefening telt ${share} van je gewicht mee als weerstand. Vul je gewicht in, dan rekent Forge je last uit.`, source };
  }
  const shareKg = f * load.kg;
  const asked = mode === 'latest' ? 'latest' : 'trend';
  const weightLabel = load.isTrend
    ? `Je trend, je laatste weging was ${kg(load.latest.kg)}`
    : asked === 'latest'
      ? `Je laatste weging, ${formatDayMonthNL(load.latest.date)}`
      : `Je laatste weging, ${formatDayMonthNL(load.latest.date)}, want er zijn te weinig wegingen voor een trend`;
  return {
    chip: `${kg(load.kg)} · ${share}`,
    weight: kg(load.kg),
    weightLabel,
    share,
    shareLine: `${share}, ${kg(shareKg)}`,
    explain: `Bij deze oefening telt ${share} van je gewicht mee als weerstand, dus ${kg(shareKg)}. Forge rekent je last en je extra gewicht daarmee uit.`,
    source,
  };
}

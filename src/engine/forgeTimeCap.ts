// ASCEND: hoogstens zo lang per krachttraining (docs/beslissingen/2026-11-03-forge-tijdsgrens.md).
//
// Een gewone krachttraining duurt hoogstens 60 minuten en een beendag hoogstens 75 (het advies,
// instelling "Hoogstens per krachttraining": `AppSettings.forgeCapStrength` en `forgeCapLegs`, Uit,
// 45, 60, 75 of 90). Forge rekent met de geleerde duur van de training per voorgeschreven werkset
// (engine/durationLearning.ts) en haalt, als het langer zou duren, eerst sets bijwerk weg, zoals
// "Minder tijd vandaag" de kern laat staan: eerst de extra oefeningen (`optional`), dan het bijwerk
// (`accessory`), de kern (`core`) nooit. Is de training al korter, dan verandert er niets.
//
// Het gaat alleen om de inhoud van één sessie in Forge: de planning, de geplande sessie en elk
// bestaand log blijven zoals ze zijn. Puur: geen React, geen opslag.

import type { ExercisePrescription, SessionTemplate } from '../models/training';
import { cleanExerciseName } from './exerciseMatch';
import { isLegHeavyTemplate } from './scheduler';

export const TIME_CAP_OPTIONS = [0, 45, 60, 75, 90] as const;
export type TimeCap = (typeof TIME_CAP_OPTIONS)[number];
export const TIME_CAP_ADVICE_STRENGTH: TimeCap = 60;
export const TIME_CAP_ADVICE_LEGS: TimeCap = 75;

// Een oefening houdt minstens zoveel sets voordat hij helemaal wegvalt.
const KEEP_SETS = 2;

const pick = (raw: unknown, fallback: TimeCap): TimeCap => TIME_CAP_OPTIONS.find((m) => m === raw) ?? fallback;

export function resolveTimeCap(raw: { forgeCapStrength?: unknown; forgeCapLegs?: unknown } | undefined | null): { strength: TimeCap; legs: TimeCap } {
  return { strength: pick(raw?.forgeCapStrength, TIME_CAP_ADVICE_STRENGTH), legs: pick(raw?.forgeCapLegs, TIME_CAP_ADVICE_LEGS) };
}

// De grens voor deze training: een beendag herkend aan zijn belasting (zwaar voor de benen, zoals de
// planner en Lichter bij vermoeide benen hem lezen), nooit aan een id. 0 is geen grens.
export function capForTemplate(template: SessionTemplate, setting: { strength: TimeCap; legs: TimeCap }): TimeCap {
  if (template.type !== 'strength') return 0;
  return isLegHeavyTemplate(template) ? setting.legs : setting.strength;
}

// De werksets van een voorschrift. Een voorschrift kent alleen werksets: de opwarmsets maakt Forge er
// zelf bij, en wat er gelogd wordt telt via isWorkSet.
export const prescribedSets = (slot: Pick<ExercisePrescription, 'sets' | 'setTargets'>): number =>
  Math.max(0, slot.setTargets && slot.setTargets.length > 0 ? slot.setTargets.length : slot.sets);

const setsOf = (list: readonly ExercisePrescription[]) => list.reduce((n, s) => n + prescribedSets(s), 0);

function withoutLastSet(slot: ExercisePrescription): ExercisePrescription {
  if (slot.setTargets && slot.setTargets.length > 0) {
    const setTargets = slot.setTargets.slice(0, -1);
    return { ...slot, setTargets, sets: setTargets.length };
  }
  return { ...slot, sets: Math.max(0, slot.sets - 1) };
}

export interface TimeCapResult {
  slots: ExercisePrescription[];
  // De grens; 0 = geen.
  cap: number;
  // Hoe lang de training zou duren, en na het inkorten (in minuten, niet afgerond).
  fromMinutes: number;
  minutes: number;
  // Sets die wegvielen bij oefeningen die blijven, en de oefeningen die helemaal wegvielen.
  setsRemoved: number;
  dropped: string[];
  // Ook zonder bijwerk past de training niet onder de grens: de kern blijft staan.
  coreOver: boolean;
}

// Kort de voorschriften in tot ze onder de grens passen.
// De duur per werkset is `minutesPerSet` (geleerd uit je logs, durationLearning.ts#learnedMinutesPerSet),
// of anders `fullMinutes`, de verwachte duur van de hele training (`fullSlots`), gedeeld door de werksets
// ervan. Zo blijft de grens staan als je vaker ingekort traint en de geleerde duur korter wordt. Eerst gaat er telkens één set af van de oefening
// met de meeste sets boven de twee (bij gelijk de laatste), bij de extra oefeningen en daarna bij het
// bijwerk. Pas als alles op twee staat valt een hele oefening weg, eerst een extra, van achteren af.
export function capSlots(args: { slots: ExercisePrescription[]; fullSlots?: ExercisePrescription[]; fullMinutes: number; minutesPerSet?: number; cap: number }): TimeCapResult {
  const { slots, fullMinutes, cap } = args;
  const fullSets = setsOf(args.fullSlots ?? slots);
  const perSet = args.minutesPerSet !== undefined && args.minutesPerSet > 0 ? args.minutesPerSet : fullSets > 0 && fullMinutes > 0 ? fullMinutes / fullSets : 0;
  const minutesOf = (list: readonly ExercisePrescription[]) => perSet * setsOf(list);
  const fromMinutes = minutesOf(slots);
  const none: TimeCapResult = { slots, cap, fromMinutes, minutes: fromMinutes, setsRemoved: 0, dropped: [], coreOver: false };
  if (!(cap > 0) || perSet === 0 || fromMinutes <= cap) return none;

  // null = weggevallen; de volgorde van de training blijft.
  const list: (ExercisePrescription | null)[] = [...slots];
  const dropped: string[] = [];
  const now = () => minutesOf(list.filter((s): s is ExercisePrescription => s !== null));
  const TIERS = ['optional', 'accessory'] as const;
  const inTier = (tier: (typeof TIERS)[number]) => list.flatMap((s, i) => (s && s.priority === tier ? [i] : []));
  // Eerst sets eraf, laag voor laag, tot elke oefening er nog twee heeft.
  for (const tier of TIERS) {
    while (now() > cap) {
      let best = -1;
      for (const i of inTier(tier)) if (prescribedSets(list[i]!) > KEEP_SETS && (best < 0 || prescribedSets(list[i]!) >= prescribedSets(list[best]!))) best = i;
      if (best < 0) break;
      list[best] = withoutLastSet(list[best]!);
    }
  }
  // Pas dan hele oefeningen, laag voor laag en van achteren af.
  for (const tier of TIERS) {
    while (now() > cap) {
      const i = inTier(tier).at(-1);
      if (i === undefined) break;
      dropped.push(cleanExerciseName(list[i]!.exerciseName));
      list[i] = null;
    }
  }
  // Sets van een oefening die daarna toch helemaal wegviel tellen niet als losse sets.
  const kept = list.filter((s): s is ExercisePrescription => s !== null);
  const keptIds = new Set(kept.map((s) => s.id));
  const removedFromKept = slots.filter((s) => keptIds.has(s.id)).reduce((n, s) => n + prescribedSets(s), 0) - setsOf(kept);
  const minutes = minutesOf(kept);
  return { slots: kept, cap, fromMinutes, minutes, setsRemoved: removedFromKept, dropped, coreOver: minutes > cap };
}

const roundTo5 = (m: number) => Math.max(5, Math.round(m / 5) * 5);

function joinNL(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} en ${names.at(-1)}`;
}

// De ene rustige regel in Forge, alleen als er iets wegviel.
// "Ingekort tot ongeveer 60 minuten: 2 sets bijwerk vallen weg."
export function timeCapLine(r: TimeCapResult): string | undefined {
  if (r.setsRemoved === 0 && r.dropped.length === 0) return undefined;
  const parts: string[] = [];
  if (r.dropped.length > 0) parts.push(`${joinNL(r.dropped)} ${r.dropped.length === 1 ? 'valt' : 'vallen'} weg${r.setsRemoved > 0 ? ',' : ''}`);
  if (r.setsRemoved > 0) {
    const sets = `${r.setsRemoved} ${r.setsRemoved === 1 ? 'set' : 'sets'} bijwerk`;
    parts.push(r.dropped.length > 0 ? `net als ${sets}` : `${sets} ${r.setsRemoved === 1 ? 'valt' : 'vallen'} weg`);
  }
  const head = `Ingekort tot ongeveer ${roundTo5(r.minutes)} minuten: ${parts.join(' ')}.`;
  return r.coreOver ? `${head} De kernsets blijven staan, ook al kom je dan boven de ${r.cap}.` : head;
}

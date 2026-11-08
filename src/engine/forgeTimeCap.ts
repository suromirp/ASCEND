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
import { MOUNTAIN_MUSCLES } from './mountainMuscles';
import { exerciseKey } from './strengthHistory';
import { isLegHeavyTemplate } from './scheduler';

export const TIME_CAP_OPTIONS = [0, 45, 60, 75, 90] as const;
export type TimeCap = (typeof TIME_CAP_OPTIONS)[number];
const TIME_CAP_ADVICE_STRENGTH: TimeCap = 60;
const TIME_CAP_ADVICE_LEGS: TimeCap = 75;

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
  // De voorschriften voor het inkorten en de minuten per werkset, voor capLineFor.
  from: ExercisePrescription[];
  perSet: number;
}

// Kort de voorschriften in tot ze onder de grens passen.
// De duur per werkset is `minutesPerSet` (geleerd uit je logs, durationLearning.ts#learnedMinutesPerSet),
// of anders `fullMinutes`, de verwachte duur van de hele training (`fullSlots`), gedeeld door de werksets
// ervan. Zo blijft de grens staan als je vaker ingekort traint en de geleerde duur korter wordt. Eerst gaat er telkens één set af van de oefening
// met de meeste sets boven de twee (bij gelijk de laatste), bij de extra oefeningen en daarna bij het
// bijwerk. Pas als alles op twee staat valt een hele oefening weg, eerst een extra, van achteren af.
// `keep` beschermt oefeningen (servesMountainMuscle bij een bergdoel): die leveren pas sets in als alle andere
// extra's en bijwerk op twee staan, gaan dan eerst naar één set en vallen als allerlaatste weg.
export function capSlots(args: { slots: ExercisePrescription[]; fullSlots?: ExercisePrescription[]; fullMinutes: number; minutesPerSet?: number; cap: number; keep?: (slot: ExercisePrescription) => boolean }): TimeCapResult {
  const { slots, fullMinutes, cap } = args;
  const fullSets = setsOf(args.fullSlots ?? slots);
  const perSet = args.minutesPerSet !== undefined && args.minutesPerSet > 0 ? args.minutesPerSet : fullSets > 0 && fullMinutes > 0 ? fullMinutes / fullSets : 0;
  const minutesOf = (list: readonly ExercisePrescription[]) => perSet * setsOf(list);
  const fromMinutes = minutesOf(slots);
  const none: TimeCapResult = { slots, cap, fromMinutes, minutes: fromMinutes, setsRemoved: 0, dropped: [], coreOver: false, from: slots, perSet };
  if (!(cap > 0) || perSet === 0 || fromMinutes <= cap) return none;

  // null = weggevallen; de volgorde van de training blijft.
  const list: (ExercisePrescription | null)[] = [...slots];
  const dropped: string[] = [];
  const now = () => minutesOf(list.filter((s): s is ExercisePrescription => s !== null));
  const TIERS = ['optional', 'accessory'] as const;
  const isKept = (i: number) => !!args.keep?.(slots[i]);
  // Binnen een laag eerst de gewone oefeningen, de beschermde (bergspieren bij een bergdoel) als laatste.
  const inTier = (tier: (typeof TIERS)[number], keep: boolean) => list.flatMap((s, i) => (s && s.priority === tier && isKept(i) === keep ? [i] : []));
  // Telkens een set eraf bij de oefening met de meeste sets boven `floor` (bij gelijk de laatste).
  const trim = (indices: number[], floor: number): boolean => {
    let best = -1;
    for (const i of indices) if (prescribedSets(list[i]!) > floor && (best < 0 || prescribedSets(list[i]!) >= prescribedSets(list[best]!))) best = i;
    if (best < 0) return false;
    list[best] = withoutLastSet(list[best]!);
    return true;
  };
  const drop = (indices: number[]): boolean => {
    const i = indices.at(-1);
    if (i === undefined) return false;
    dropped.push(cleanExerciseName(list[i]!.exerciseName));
    list[i] = null;
    return true;
  };
  // Eerst sets eraf, laag voor laag, tot elke oefening er nog twee heeft. De beschermde oefeningen (bergspieren)
  // komen pas aan de beurt als alle andere van extra en bijwerk op twee staan, in welke laag ze ook zitten: een
  // kuitheffing die als extra in de training staat gaat niet weg voordat een gewone bijwerkoefening weg is.
  for (const keep of [false, true]) for (const tier of TIERS) while (now() > cap && trim(inTier(tier, keep), KEEP_SETS));
  // Pas dan hele oefeningen, laag voor laag en van achteren af: eerst de gewone, dan gaan de beschermde naar
  // één set, en pas als laatste vallen die weg.
  for (const tier of TIERS) while (now() > cap && drop(inTier(tier, false)));
  for (const tier of TIERS) while (now() > cap && trim(inTier(tier, true), 1));
  for (const tier of TIERS) while (now() > cap && drop(inTier(tier, true)));
  // Sets van een oefening die daarna toch helemaal wegviel tellen niet als losse sets.
  const kept = list.filter((s): s is ExercisePrescription => s !== null);
  const keptIds = new Set(kept.map((s) => s.id));
  const removedFromKept = slots.filter((s) => keptIds.has(s.id)).reduce((n, s) => n + prescribedSets(s), 0) - setsOf(kept);
  const minutes = minutesOf(kept);
  return { slots: kept, cap, fromMinutes, minutes, setsRemoved: removedFromKept, dropped, coreOver: minutes > cap, from: slots, perSet };
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

// De regel bij wat er echt op het scherm staat. Een heropend concept houdt wat je al deed (mergeDraft): een
// oefening die bij het inkorten wegviel maar met afgevinkte sets in de sessie staat, valt dan niet weg, en een
// oefening die de volle sets hield telt niet als ingekort. Per plek telt het verschil tussen het voorschrift
// en de werksets in de sessie, alleen bij extra oefeningen en bijwerk; de kern wordt nooit ingekort.
// Aanroepen met de eerste stand van de sessie.
export function capLineFor(r: TimeCapResult, workout: readonly { slot: string; rows: readonly { kind: string }[] }[]): string | undefined {
  if (r.setsRemoved === 0 && r.dropped.length === 0) return undefined;
  const bySlot = new Map(workout.map((e) => [e.slot, e]));
  let setsRemoved = 0;
  let sets = 0;
  let coreSets = 0;
  const dropped: string[] = [];
  for (const slot of r.from) {
    const ex = bySlot.get(slot.id);
    if (!ex) {
      if (slot.priority !== 'core') dropped.push(cleanExerciseName(slot.exerciseName));
      continue;
    }
    const work = ex.rows.filter((row) => row.kind === 'work').length;
    sets += work;
    if (slot.priority === 'core') coreSets += work;
    if (slot.priority !== 'core') setsRemoved += Math.max(0, prescribedSets(slot) - work);
  }
  // Alleen als de kern zelf al boven de grens komt; een oefening die je zelf liet staan is geen kern.
  return timeCapLine({ ...r, setsRemoved, dropped, minutes: r.perSet * sets, coreOver: r.perSet * coreSets > r.cap });
}

// Hoeveel sets van deze oefening de tijdsgrens wegnam en die nog weg zijn: het verschil tussen het voorschrift
// en wat het inkorten overliet, min wat jij er sindsdien bij zette (werksets nu in de sessie, plus de sets die
// jij zelf weghaalde en kunt terugzetten). Zo zegt de oefening zelf wat er wegviel, en Set toevoegen telt mee.
// De kern wordt nooit ingekort, dus daar is het altijd 0.
// `effSlots` zijn de voorschriften na Lichter (legDayEase.ts#easeSlots): een set die Lichter wegnam telt niet als
// "weg door je tijdsgrens", dus het nu-aantal wordt tegen de voorschriften van het scherm gehouden.
export function capRemovedFor(r: Pick<TimeCapResult, 'from' | 'slots'>, ex: { slot: string; rows: readonly { kind: string }[]; dropped?: readonly unknown[] }, effSlots?: readonly ExercisePrescription[]): number {
  const before = r.from.find((s) => s.id === ex.slot);
  const after = r.slots.find((s) => s.id === ex.slot);
  const shown = effSlots?.find((s) => s.id === ex.slot) ?? after;
  if (!before || !after || before.priority === 'core') return 0;
  const removed = prescribedSets(before) - prescribedSets(after);
  const now = ex.rows.filter((row) => row.kind === 'work').length + (ex.dropped?.length ?? 0);
  return Math.max(0, removed - Math.max(0, now - prescribedSets(shown ?? after)));
}

// "1 set weg door je tijdsgrens", bij de oefening zelf.
export const capRemovedLine = (n: number): string => `${n === 1 ? '1 set' : `${n} sets`} weg door je tijdsgrens`;

// Een oefening die als hoofdspier een bergspier traint (kuit, scheen, bilspieren; engine/mountainMuscles.ts).
// Alleen bij een bergdoel met "Spieren voor de berg" aan geeft Forge dit als `keep` aan capSlots.
export function servesMountainMuscle(slot: Pick<ExercisePrescription, 'id' | 'exerciseName'>): boolean {
  const exercise = exerciseKey(slot.id, slot.exerciseName).exercise;
  return !!exercise && exercise.primary.some((m) => MOUNTAIN_MUSCLES.includes(m));
}

// ASCEND: de standen van een toestel. Puur; geen React.
// Ontwerp: docs/visie/Toestelstanden in Forge.md. Besluit: docs/beslissingen/2026-11-09-forge-toestelstanden.md.
//
// Een stand is een gewicht dat op een kabel of toestel met gewichtsblok in deze sportschool bestaat omdat
// je het gebruikte. Forge onthoudt hem bij het afvinken van een set, zonder vraag maar met Terugdraaien.
// Standen staan bij het sportschoolprofiel (`GymProfile.exerciseStandsKg`), nooit in een log: een log
// wordt hier nooit gelezen om te schrijven en nooit herschreven.
//
// Een sleutel in `exerciseStandsKg`, ook met een lege lijst, betekent "al ingelezen uit je trainingen":
// wat je weghaalt komt niet terug. Een toestel zonder sleutel met een oude lijst of een oud bereik
// (`exerciseWeightsKg`, `exerciseWeightRanges`) houdt die als gesloten lijst tot je het toestel aanraakt;
// dan gaat het in één keer om naar standen met `only`.

import type { Exercise } from '../models/exercise';
import { addOnsFor, cleanMachineList, cleanWeightRanges, hasStack, rangeWeights, splitAddOn } from './machineWeights';
import { looksLikePounds } from './strengthWeights';
import { STAND_LIMITS, cleanStandList, resolveStrengthSettings, type GymProfile, type MachineStandList, type StrengthSettings } from './strengthSettings';
import { r2 } from '../utils/round';

export { STAND_LIMITS };

// De standen van een toestel zoals Forge ze leest. `stored`: er is een sleutel (ingelezen of aangeraakt).
// Zonder sleutel geven de oude lijst en het oude bereik de standen, met `only` (dat is wat ze nu doen).
export interface MachineStands {
  kg: number[];
  only: boolean;
  stored: boolean;
}

// De oude losse gewichten en bereiken van een toestel samen, oplopend. Leeg als er niets staat.
function oldWeightsOf(profile: GymProfile, exerciseId: string): number[] {
  const all = new Set<number>(cleanMachineList(profile.exerciseWeightsKg?.[exerciseId]) ?? []);
  for (const r of cleanWeightRanges(profile.exerciseWeightRanges?.[exerciseId]) ?? []) for (const w of rangeWeights(r)) all.add(r2(w));
  return [...all].sort((a, b) => a - b);
}

const storedOf = (profile: GymProfile, exerciseId: string): MachineStandList | undefined => cleanStandList(profile.exerciseStandsKg?.[exerciseId]);

// De standen van dit toestel in dit profiel. Undefined voor alles zonder gewichtsblok (stang, halter,
// schijvenmachine, vest, eigen gewicht en de hulp van een optrekstation).
export function standsFor(profile: GymProfile, exercise: Exercise | undefined): MachineStands | undefined {
  if (!exercise || !hasStack(exercise)) return undefined;
  const stored = storedOf(profile, exercise.id);
  if (stored) return { kg: stored.kg, only: !!stored.only, stored: true };
  const old = oldWeightsOf(profile, exercise.id);
  return { kg: old, only: old.length > 0, stored: false };
}

// Het profiel met de standen van één toestel gezet, en de oude lijst en het oude bereik van alleen dat
// toestel weg. De andere toestellen blijven zoals ze zijn.
function withStandList(profile: GymProfile, exerciseId: string, list: MachineStandList): GymProfile {
  const { exerciseWeightsKg, exerciseWeightRanges, exerciseStandsKg, ...rest } = profile;
  const lists = { ...(exerciseWeightsKg ?? {}) };
  const ranges = { ...(exerciseWeightRanges ?? {}) };
  delete lists[exerciseId];
  delete ranges[exerciseId];
  const stands = { ...(exerciseStandsKg ?? {}), [exerciseId]: { kg: list.kg, ...(list.only ? { only: true } : {}) } };
  return {
    ...rest,
    ...(Object.keys(lists).length > 0 ? { exerciseWeightsKg: lists } : {}),
    ...(Object.keys(ranges).length > 0 ? { exerciseWeightRanges: ranges } : {}),
    exerciseStandsKg: stands,
  };
}

// Een gewicht dat een stand mag worden: boven 0, op 0,01, hoogstens één decimaal, geen pond.
type WeightSkip = 'zero' | 'range' | 'decimals' | 'pounds';
function weightProblem(weightKg: number): WeightSkip | undefined {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return 'zero';
  const w = r2(weightKg);
  if (w < STAND_LIMITS.minKg || w > STAND_LIMITS.maxKg) return 'range';
  if (Math.abs(w * 10 - Math.round(w * 10)) > 1e-6) return 'decimals';
  if (looksLikePounds(w)) return 'pounds';
  return undefined;
}

// Is dit gewicht een stand plus een tussengewicht van dit toestel (70 + 2,3)?
const isStandPlusAddOn = (profile: GymProfile, exercise: Exercise, kg: number[], weightKg: number): boolean =>
  !!splitAddOn(weightKg, addOnsFor(profile, exercise), (w) => kg.includes(w));

// --- inlezen uit je trainingen -------------------------------------------------------------------

// De eerste keer dat Forge of het blad een toestel zonder sleutel opent: de gewichten die je er in deze
// sportschool gebruikte (`usedBefore`, werk- en opwarmsets) worden standen, één keer. Geen pond, niet meer
// dan één decimaal, geen stand plus tussengewicht; bij meer dan 40 de 40 die je het vaakst gebruikte.
// Undefined als er niets te doen is: geen toestel met blok, al een sleutel, of een oude lijst of bereik
// (die blijft de gesloten lijst tot je het toestel aanraakt). Zonder gebruikte gewichten komt er een
// lege sleutel: ook dat is ingelezen.
export function seedStands(profile: GymProfile, exercise: Exercise | undefined, usedKg: number[] | undefined): GymProfile | undefined {
  if (!exercise || !hasStack(exercise)) return undefined;
  if (storedOf(profile, exercise.id)) return undefined;
  if (oldWeightsOf(profile, exercise.id).length > 0) return undefined;
  const counts = new Map<number, number>();
  for (const w of usedKg ?? []) {
    if (weightProblem(w)) continue;
    counts.set(r2(w), (counts.get(r2(w)) ?? 0) + 1);
  }
  const ranked = [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([w]) => w);
  const kg: number[] = [];
  // Lichtste eerst, zodat 70 een stand is voor 72,3 als tussengewicht herkend wordt.
  for (const w of [...ranked].sort((a, b) => a - b)) if (!isStandPlusAddOn(profile, exercise, kg, w)) kg.push(w);
  const keep = new Set(ranked.filter((w) => kg.includes(w)).slice(0, STAND_LIMITS.maxCount));
  return withStandList(profile, exercise.id, { kg: kg.filter((w) => keep.has(w)) });
}

// --- onthouden bij afvinken ----------------------------------------------------------------------

// Waarom een afgevinkt gewicht geen nieuwe stand werd.
export type StandSkip = 'no_stack' | WeightSkip | 'known' | 'add_on' | 'full';

export type LearnResult = { ok: true; profile: GymProfile; kg: number } | { ok: false; reason: StandSkip };

// Het profiel met dit gewicht als nieuwe stand van het toestel. Een toestel met een oude lijst of bereik
// gaat daarbij in één keer om (standen met `only`, de oude velden van dat toestel weg); past dat niet
// binnen 40 standen, dan blijft alles zoals het was. Werk- en opwarmsets tellen allebei: de aanroeper
// geeft elk afgevinkt gewicht.
export function learnStand(profile: GymProfile, exercise: Exercise | undefined, weightKg: number): LearnResult {
  if (!exercise || !hasStack(exercise)) return { ok: false, reason: 'no_stack' };
  const problem = weightProblem(weightKg);
  if (problem) return { ok: false, reason: problem };
  const w = r2(weightKg);
  const now = standsFor(profile, exercise) ?? { kg: [], only: false, stored: false };
  if (now.kg.includes(w)) return { ok: false, reason: 'known' };
  if (isStandPlusAddOn(profile, exercise, now.kg, w)) return { ok: false, reason: 'add_on' };
  if (now.kg.length >= STAND_LIMITS.maxCount) return { ok: false, reason: 'full' };
  const kg = [...now.kg, w].sort((a, b) => a - b);
  return { ok: true, profile: withStandList(profile, exercise.id, { kg, only: now.only }), kg: w };
}

// Terugdraaien: alleen deze stand weg, de sleutel blijft (zodat hij niet terugkomt uit je logs). Undefined
// als de stand er niet is. De set en het log blijven zoals ze zijn.
export function forgetStand(profile: GymProfile, exercise: Exercise | undefined, weightKg: number): GymProfile | undefined {
  const now = standsFor(profile, exercise);
  if (!exercise || !now) return undefined;
  const w = r2(weightKg);
  if (!now.kg.includes(w)) return undefined;
  return withStandList(profile, exercise.id, { kg: now.kg.filter((x) => x !== w), only: now.only });
}

// --- op de hele instellingen -------------------------------------------------------------------

// De instellingen met het actieve profiel vervangen; de andere sportscholen blijven gelijk.
function withActive(raw: StrengthSettings | undefined, next: GymProfile): StrengthSettings {
  const activeId = resolveStrengthSettings(raw).profile.id;
  const stored = raw?.profiles ?? [];
  const profiles = stored.some((p) => p.id === activeId) ? stored.map((p) => (p.id === activeId ? next : p)) : [next, ...stored];
  return { ...raw, activeProfileId: activeId, profiles };
}

// Wat er na het afvinken van een set met de standen gebeurt. `remember` is de instelling "Standen
// onthouden" (komt in stap 6, standaard aan): uit is het gedrag van voor de standen, er wordt niets
// ingelezen en niets onthouden. `settings` is undefined als er niets te schrijven is.
export type StandAfterTick =
  | { kind: 'learned'; settings: StrengthSettings; kg: number }
  | { kind: 'seeded'; settings: StrengthSettings }
  | { kind: 'none'; reason: StandSkip | 'off' };

export function standAfterTick(raw: StrengthSettings | undefined, exercise: Exercise | undefined, weightKg: number | undefined, opts: { remember: boolean; usedKg?: number[] }): StandAfterTick {
  if (!opts.remember) return { kind: 'none', reason: 'off' };
  if (!exercise || !hasStack(exercise)) return { kind: 'none', reason: 'no_stack' };
  const profile = resolveStrengthSettings(raw).profile;
  const seeded = seedStands(profile, exercise, opts.usedKg);
  const base = seeded ?? profile;
  const learned = learnStand(base, exercise, weightKg ?? 0);
  if (learned.ok) return { kind: 'learned', settings: withActive(raw, learned.profile), kg: learned.kg };
  if (seeded) return { kind: 'seeded', settings: withActive(raw, seeded) };
  return { kind: 'none', reason: learned.reason };
}

// Het inlezen alleen, bij het openen van een toestel in Forge of in het blad. Undefined: niets te doen.
export function seedOnOpen(raw: StrengthSettings | undefined, exercise: Exercise | undefined, opts: { remember: boolean; usedKg?: number[] }): StrengthSettings | undefined {
  if (!opts.remember) return undefined;
  const seeded = seedStands(resolveStrengthSettings(raw).profile, exercise, opts.usedKg);
  return seeded ? withActive(raw, seeded) : undefined;
}

// Terugdraaien op de instellingen. Undefined: de stand is er niet (meer).
export function withStandForgotten(raw: StrengthSettings | undefined, exercise: Exercise | undefined, weightKg: number): StrengthSettings | undefined {
  const next = forgetStand(resolveStrengthSettings(raw).profile, exercise, weightKg);
  return next ? withActive(raw, next) : undefined;
}

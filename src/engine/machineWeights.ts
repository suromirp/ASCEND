// ASCEND: de gewichten van een toestel die je zelf invult, en de sportscholen waar ze
// bij horen. Puur; geen React. Besluit: docs/beslissingen/2026-10-26-gewichten-per-toestel.md.
//
// Een kabel of een toestel met een gewichtstapel heeft per sportschool andere
// gewichten. Wie ze opgeeft ("4,5 9 13,5 18") heeft de lijst bij het sportschoolprofiel
// staan (`GymProfile.exerciseWeightsKg`, per oefening). Zo'n lijst gaat voor alles wat
// ASCEND over dat toestel leert of schat (`candidatesFor`).

import type { Exercise } from '../models/exercise';
import { ADD_ON_LIMITS, DEFAULT_PROFILE, cleanAddOnOverride, cleanAddOns, cleanWeightRanges, poundRangeFor, rangeProblem, resolveStrengthSettings, weightsFromRange, withProfile, type GymProfile, type StrengthSettings, type WeightRange } from './strengthSettings';

export { ADD_ON_LIMITS, cleanAddOnOverride, cleanAddOns, cleanWeightRanges, poundRangeFor, rangeProblem, weightsFromRange };
export type { WeightRange };

export const MACHINE_LIST_LIMITS = { minKg: 0.25, maxKg: 500, maxCount: 40, maxExercises: 100 };
export const MAX_GYM_PROFILES = 5;
// Een los tussengewicht (plaatje, magneet) dat je bij elk gewicht van het blok optelt.
const PROFILE_NAME_MAX = 40;

const r2 = (n: number) => Math.round(n * 100) / 100;

// Heeft dit een gewichtstapel of kabel waarvan je de gewichten kunt invullen?
export const hasStack = (exercise: Exercise | undefined): boolean => exercise?.resistance === 'cable' || exercise?.resistance === 'machine_stack';

// Een lijst die opgeslagen mag worden: getallen binnen de grenzen, zonder dubbele,
// oplopend. Undefined als er niets bruikbaars staat.
export function cleanMachineList(raw: unknown): number[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const { minKg, maxKg, maxCount } = MACHINE_LIST_LIMITS;
  const list = [...new Set(raw.filter((n): n is number => typeof n === 'number' && Number.isFinite(n) && n >= minKg && n <= maxKg).map(r2))].sort((a, b) => a - b);
  return list.length > 0 && list.length <= maxCount ? list : undefined;
}

// De gewichten van een bereik zonder wat je weghaalde.
export function rangeWeights(range: WeightRange): number[] {
  const removed = new Set(range.removedKg ?? []);
  return weightsFromRange(range.startKg, range.endKg, range.stepKg, range.unit).filter((w) => !removed.has(w));
}

// De bereiken van dit toestel in dit profiel, defensief gelezen.
export const rangesFor = (profile: GymProfile, exercise: Exercise | undefined): WeightRange[] => (exercise && hasStack(exercise) ? (cleanWeightRanges(profile.exerciseWeightRanges?.[exercise.id]) ?? []) : []);

// Wat je voor dit toestel invulde, als lijst: de losse gewichten en de bereiken samen, oplopend en
// zonder dubbele. Undefined als er niets staat.
function ownWeightsOf(profile: GymProfile, exerciseId: string): number[] | undefined {
  const all = new Set<number>(cleanMachineList(profile.exerciseWeightsKg?.[exerciseId]) ?? []);
  for (const r of cleanWeightRanges(profile.exerciseWeightRanges?.[exerciseId]) ?? []) for (const w of rangeWeights(r)) all.add(w);
  return all.size > 0 ? [...all].sort((a, b) => a - b) : undefined;
}

// De gewichten van dit toestel in dit profiel, als je ze invulde (lijst, bereiken of allebei).
export function ownWeightsFor(profile: GymProfile, exercise: Exercise | undefined): number[] | undefined {
  if (!exercise || !hasStack(exercise)) return undefined;
  return ownWeightsOf(profile, exercise.id);
}

// Voor hoeveel toestellen er in dit profiel iets is ingevuld.
export const machineListCount = (profile: GymProfile): number =>
  new Set([...Object.keys(profile.exerciseWeightsKg ?? {}), ...Object.keys(profile.exerciseWeightRanges ?? {})]).size === 0
    ? 0
    : [...new Set([...Object.keys(profile.exerciseWeightsKg ?? {}), ...Object.keys(profile.exerciseWeightRanges ?? {})])].filter((id) => ownWeightsOf(profile, id)).length;

export type ParsedList = { ok: true; list: number[] } | { ok: false; reason: string };

// "4,5 9 13,5", "4,5; 9; 13,5" of "4.5, 9, 13.5": zoals mensen een lijst typen. Een
// komma tussen cijfers is een decimaalteken; een komma of puntkomma achter een getal
// scheidt. Een leeg veld is een fout, wissen heeft zijn eigen knop.
export function parseMachineWeights(text: string): ParsedList {
  const tokens = text
    .split(/[;\s]+/)
    .map((t) => t.replace(/^,+|,+$/g, '').replace(',', '.'))
    .filter((t) => t !== '');
  if (tokens.length === 0) return { ok: false, reason: 'Vul de gewichten in, bijvoorbeeld 4,5 9 13,5 18.' };
  const numbers = tokens.map((t) => (/^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN));
  if (numbers.some((n) => !Number.isFinite(n))) return { ok: false, reason: 'Gebruik alleen getallen, met een spatie ertussen.' };
  const { minKg, maxKg, maxCount } = MACHINE_LIST_LIMITS;
  if (numbers.some((n) => n < minKg || n > maxKg)) return { ok: false, reason: `Een gewicht ligt tussen ${String(minKg).replace('.', ',')} en ${maxKg} kg.` };
  const list = cleanMachineList(numbers);
  if (!list) return { ok: false, reason: `Hoogstens ${maxCount} gewichten.` };
  return { ok: true, list };
}

// De lijst zoals je hem typt: "4,5 9 13,5".
export const formatMachineWeights = (list: number[]): string => list.map((n) => String(n).replace('.', ',')).join(' ');

// De instellingen met losse gewichten en bereiken van één toestel gezet, in het actieve profiel.
// Een lege lijst en geen bereiken wissen het toestel.
export function withMachineSetup(raw: StrengthSettings | undefined, exerciseId: string, setup: { list?: number[]; ranges?: WeightRange[] }): StrengthSettings {
  const profile = resolveStrengthSettings(raw).profile;
  const lists = { ...(profile.exerciseWeightsKg ?? {}) };
  const ranges = { ...(profile.exerciseWeightRanges ?? {}) };
  const cleanList = cleanMachineList(setup.list);
  const cleanRanges = cleanWeightRanges(setup.ranges);
  if (cleanList) lists[exerciseId] = cleanList;
  else delete lists[exerciseId];
  if (cleanRanges) ranges[exerciseId] = cleanRanges;
  else delete ranges[exerciseId];
  const out = withProfile(raw, {
    exerciseWeightsKg: Object.keys(lists).length > 0 ? lists : undefined,
    exerciseWeightRanges: Object.keys(ranges).length > 0 ? ranges : undefined,
  });
  out.profiles = out.profiles?.map((p) => {
    if (p.id !== profile.id) return p;
    const { exerciseWeightsKg, exerciseWeightRanges, ...rest } = p;
    return { ...rest, ...(exerciseWeightsKg ? { exerciseWeightsKg } : {}), ...(exerciseWeightRanges ? { exerciseWeightRanges } : {}) };
  });
  return out;
}

// De instellingen met de lijst van één toestel gezet of gewist (undefined wist hem). De bereiken blijven.
export function withMachineWeights(raw: StrengthSettings | undefined, exerciseId: string, list: number[] | undefined): StrengthSettings {
  const profile = resolveStrengthSettings(raw).profile;
  return withMachineSetup(raw, exerciseId, { list, ranges: profile.exerciseWeightRanges?.[exerciseId] });
}

// --- de sportscholen -------------------------------------------------------------------------

// Alle profielen, het actieve eerst gevonden. Zonder opgeslagen profiel is het er een.
export function allProfiles(raw: StrengthSettings | undefined): GymProfile[] {
  const active = resolveStrengthSettings(raw).profile;
  const stored = raw?.profiles ?? [];
  return stored.some((p) => p.id === active.id) ? stored : [active, ...stored];
}

const nameKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

// Kan een sportschool zo heten? Niet leeg en nog niet in gebruik (hoofdletters tellen niet mee),
// want de naam is ook hoe een MacroFactor-workout ("Benen A @ naam") aan het profiel gekoppeld wordt.
export function profileNameProblem(raw: StrengthSettings | undefined, name: string, ownId?: string): string | undefined {
  const trimmed = name.trim();
  if (trimmed === '') return 'Geef de sportschool een naam.';
  if (allProfiles(raw).some((p) => p.id !== ownId && nameKey(p.name) === nameKey(trimmed))) return 'Er is al een sportschool met deze naam.';
  return undefined;
}

// Een nieuwe sportschool, begonnen met de stangen, schijven, dumbbells en stap van de actieve
// (zonder de lijsten van toestellen: die zijn daar anders), en meteen de actieve. Undefined bij
// een slechte naam of als er al vijf zijn.
export function withNewProfile(raw: StrengthSettings | undefined, name: string): StrengthSettings | undefined {
  if (profileNameProblem(raw, name)) return undefined;
  const profiles = allProfiles(raw);
  if (profiles.length >= MAX_GYM_PROFILES) return undefined;
  const base = resolveStrengthSettings(raw).profile ?? DEFAULT_PROFILE;
  let n = profiles.length + 1;
  while (profiles.some((p) => p.id === `gym-${n}`)) n++;
  const { exerciseWeightsKg: _own, exerciseWeightRanges: _ownRanges, exerciseAddOnKg: _ownAdd, id: _id, ...rest } = base;
  void _own;
  void _ownRanges;
  void _ownAdd;
  void _id;
  const created: GymProfile = { ...rest, id: `gym-${n}`, name: name.trim().slice(0, PROFILE_NAME_MAX) };
  return { ...raw, profiles: [...profiles, created], activeProfileId: created.id };
}

// Het actieve profiel gekozen. Een id die er niet is verandert niets.
export function withActiveProfile(raw: StrengthSettings | undefined, id: string): StrengthSettings {
  const profiles = allProfiles(raw);
  if (!profiles.some((p) => p.id === id)) return raw ?? {};
  return { ...raw, profiles, activeProfileId: id };
}

// Het profiel van een MacroFactor-workout: de naam eindigt op " @ <naam>" en die naam is die van
// een profiel (hoofdletters tellen niet mee). Anders niets.
export function profileIdFromWorkoutName(workoutName: string, profiles: GymProfile[]): string | undefined {
  const at = workoutName.lastIndexOf(' @ ');
  if (at < 0) return undefined;
  const tail = nameKey(workoutName.slice(at + 3));
  if (tail === '') return undefined;
  return profiles.find((p) => nameKey(p.name) === tail)?.id;
}

// Telt een training mee voor wat ASCEND over de gewichten in deze sportschool leert? Een training
// zonder sportschool (van voor dit veld) telt voor elke: we weten niet waar hij was, en
// weglaten zou het geleerde van alle toestellen in één keer wissen.
export const countsForProfile = (sessionProfileId: string | undefined, activeId: string): boolean => sessionProfileId === undefined || sessionProfileId === activeId;

// --- losse tussengewichten ---------------------------------------------------------------------
// Besluit: docs/beslissingen/2026-10-28-tussengewichten.md. Een plaatje of magneet van 2,3 kg dat je
// bij elk gewicht van het blok optelt. Elk tussengewicht hoogstens een keer, alle combinaties.

// Waar het tussengewicht van dit toestel vandaan komt.
export type AddOnSource = 'gym' | 'own' | 'none-own';

// De tussengewichten die voor dit toestel gelden: de eigen keuze van het toestel, anders die van de
// sportschool. Alleen een kabel of toestel met een gewichtstapel heeft ze.
export function addOnsFor(profile: GymProfile, exercise: Exercise | undefined): number[] {
  if (!exercise || !hasStack(exercise)) return [];
  const own = cleanAddOnOverride(profile.exerciseAddOnKg?.[exercise.id]);
  return own ?? cleanAddOns(profile.addOnKg) ?? [];
}

export function addOnSource(profile: GymProfile, exercise: Exercise | undefined): AddOnSource {
  if (!exercise || !hasStack(exercise)) return 'gym';
  const own = cleanAddOnOverride(profile.exerciseAddOnKg?.[exercise.id]);
  if (!own) return 'gym';
  return own.length === 0 ? 'none-own' : 'own';
}

// Alle sommen van tussengewichten (elk hoogstens een keer), zonder de lege som, met de gewichten
// waaruit ze bestaan. Eerst de kortste combinatie, dan de lichtste.
export function addOnCombos(addOns: number[]): { sumKg: number; parts: number[] }[] {
  const list = cleanAddOns(addOns) ?? [];
  const out: { sumKg: number; parts: number[] }[] = [];
  for (let mask = 1; mask < 1 << list.length; mask++) {
    const parts = list.filter((_, i) => mask & (1 << i));
    out.push({ sumKg: r2(parts.reduce((a, b) => a + b, 0)), parts });
  }
  return out.sort((a, b) => a.parts.length - b.parts.length || a.sumKg - b.sumKg);
}

const MAX_WITH_ADD_ON_KG = 500;

// De gewichten van het blok met elk ervan plus elke combinatie van tussengewichten, oplopend en
// zonder dubbele. Zonder tussengewichten blijft de lijst zoals hij was.
export function withAddOnWeights(base: number[], addOns: number[]): number[] {
  const combos = addOnCombos(addOns);
  if (combos.length === 0) return base;
  const all = new Set<number>(base);
  for (const w of base) for (const c of combos) if (r2(w + c.sumKg) <= MAX_WITH_ADD_ON_KG) all.add(r2(w + c.sumKg));
  return [...all].sort((a, b) => a - b);
}

// Een gewicht uit blok en tussengewichten uit elkaar: het blokgewicht (volgens `isBase`) en de
// tussengewichten die erbij kwamen. Undefined als het gewicht zelf een blokgewicht is, of als het
// nergens op past.
export function splitAddOn(weightKg: number, addOns: number[], isBase: (kg: number) => boolean): { baseKg: number; addOnKg: number[] } | undefined {
  if (isBase(r2(weightKg))) return undefined;
  for (const c of addOnCombos(addOns)) {
    const base = r2(weightKg - c.sumKg);
    if (base > 0 && isBase(base)) return { baseKg: base, addOnKg: c.parts };
  }
  return undefined;
}

// Is dit een gewicht van het blok zelf? Met een eigen lijst: staat erin; anders een veelvoud van de stap.
export function blockPredicate(profile: GymProfile, exercise: Exercise | undefined, stepKg: number): (kg: number) => boolean {
  const own = ownWeightsFor(profile, exercise);
  if (own) return (kg) => own.includes(kg);
  return (kg) => kg > 0 && Math.abs(kg / stepKg - Math.round(kg / stepKg)) < 1e-6;
}

// "70 + 2,3" voor een gewicht dat met tussengewicht gemaakt is, anders niets.
export function addOnText(profile: GymProfile, exercise: Exercise | undefined, weightKg: number | undefined, stepKg: number): string | undefined {
  if (weightKg === undefined) return undefined;
  const addOns = addOnsFor(profile, exercise);
  if (addOns.length === 0) return undefined;
  const split = splitAddOn(weightKg, addOns, blockPredicate(profile, exercise, stepKg));
  if (!split) return undefined;
  return [split.baseKg, ...split.addOnKg].map((n) => String(n).replace('.', ',')).join(' + ');
}

// De waarde in de rij: "2,3 kg", "1,25 en 2,5 kg" of "Geen".
export function formatAddOns(list: number[] | undefined): string {
  if (!list || list.length === 0) return 'Geen';
  const f = list.map((n) => String(n).replace('.', ','));
  return `${f.length > 1 ? `${f.slice(0, -1).join(', ')} en ${f[f.length - 1]}` : f[0]} kg`;
}

// Tekst van het veld ("2,3" of "1,25 2,5") naar een lijst. Leeg mag: dat is "geen".
export function parseAddOns(text: string): ParsedList {
  if (text.trim() === '') return { ok: true, list: [] };
  const parsed = parseMachineWeights(text);
  const { minKg, maxKg, maxCount } = ADD_ON_LIMITS;
  if (!parsed.ok) {
    // Wel getallen, maar buiten het bereik van een toestel: zeg het bereik van een tussengewicht.
    const numbers = text.split(/[;\s]+/).filter((t) => t !== '').map((t) => Number(t.replace(',', '.')));
    const outside = numbers.length > 0 && numbers.every((n) => Number.isFinite(n));
    return { ok: false, reason: outside ? `Een tussengewicht ligt tussen ${String(minKg).replace('.', ',')} en ${maxKg} kg.` : 'Gebruik alleen getallen, met een spatie ertussen, bijvoorbeeld 2,3.' };
  }
  if (parsed.list.some((n) => n < minKg || n > maxKg)) return { ok: false, reason: `Een tussengewicht ligt tussen ${String(minKg).replace('.', ',')} en ${maxKg} kg.` };
  const tokens = text.split(/[;\s]+/).filter((t) => t.replace(/,/g, '') !== '').length;
  if (parsed.list.length > maxCount || tokens > maxCount) return { ok: false, reason: `Hoogstens ${maxCount} tussengewichten.` };
  return { ok: true, list: parsed.list };
}

// De sportschool-brede lijst gezet of gewist (een lege lijst wist), in het actieve profiel.
export function withGymAddOns(raw: StrengthSettings | undefined, list: number[] | undefined): StrengthSettings {
  const clean = cleanAddOns(list);
  const out = withProfile(raw, { addOnKg: clean });
  const id = resolveStrengthSettings(raw).profile.id;
  out.profiles = out.profiles?.map((p) => {
    if (p.id !== id || p.addOnKg) return p;
    const { addOnKg: _gone, ...rest } = p;
    void _gone;
    return rest;
  });
  return out;
}

// De keuze van een toestel gezet: een lijst, een lege lijst voor "geen", of undefined voor "zoals de sportschool".
export function withExerciseAddOns(raw: StrengthSettings | undefined, exerciseId: string, list: number[] | undefined): StrengthSettings {
  const profile = resolveStrengthSettings(raw).profile;
  const next = { ...(profile.exerciseAddOnKg ?? {}) };
  const clean = list === undefined ? undefined : cleanAddOnOverride(list);
  if (clean) next[exerciseId] = clean;
  else delete next[exerciseId];
  const out = withProfile(raw, { exerciseAddOnKg: Object.keys(next).length > 0 ? next : undefined });
  if (Object.keys(next).length === 0) {
    out.profiles = out.profiles?.map((p) => {
      if (p.id !== profile.id) return p;
      const { exerciseAddOnKg: _gone, ...rest } = p;
      void _gone;
      return rest;
    });
  }
  return out;
}

// Voor hoeveel toestellen dit profiel een eigen keuze heeft.
export const exerciseAddOnCount = (profile: GymProfile): number => Object.values(profile.exerciseAddOnKg ?? {}).filter((l) => cleanAddOnOverride(l)).length;

// De waarde in de rij van een toestel: een korte lijst zoals hij is, een lange als "4,5 tot 109,5 kg".
export function machineSummary(list: number[]): string {
  if (list.length <= 6) return formatMachineWeights(list);
  return `${formatMachineWeights([list[0]])} tot ${formatMachineWeights([list[list.length - 1]])} kg`;
}

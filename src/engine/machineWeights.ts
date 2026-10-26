// ASCEND: de gewichten van een toestel die je zelf invult, en de sportscholen waar ze
// bij horen. Puur; geen React. Besluit: docs/beslissingen/2026-10-26-gewichten-per-toestel.md.
//
// Een kabel of een toestel met een gewichtstapel heeft per sportschool andere
// gewichten. Wie ze opgeeft ("4,5 9 13,5 18") heeft de lijst bij het sportschoolprofiel
// staan (`GymProfile.exerciseWeightsKg`, per oefening). Zo'n lijst gaat voor alles wat
// ASCEND over dat toestel leert of schat (`candidatesFor`).

import type { Exercise } from '../models/exercise';
import { DEFAULT_PROFILE, resolveStrengthSettings, withProfile, type GymProfile, type StrengthSettings } from './strengthSettings';

export const MACHINE_LIST_LIMITS = { minKg: 0.25, maxKg: 500, maxCount: 40, maxExercises: 100 };
export const MAX_GYM_PROFILES = 5;
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

// De lijst van dit toestel in dit profiel, als je hem invulde.
export function ownWeightsFor(profile: GymProfile, exercise: Exercise | undefined): number[] | undefined {
  if (!exercise || !hasStack(exercise)) return undefined;
  return cleanMachineList(profile.exerciseWeightsKg?.[exercise.id]);
}

// Voor hoeveel toestellen er in dit profiel een lijst is.
export const machineListCount = (profile: GymProfile): number => Object.values(profile.exerciseWeightsKg ?? {}).filter((l) => cleanMachineList(l)).length;

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

// De instellingen met de lijst van één toestel gezet of gewist (undefined wist hem),
// in het profiel dat nu actief is.
export function withMachineWeights(raw: StrengthSettings | undefined, exerciseId: string, list: number[] | undefined): StrengthSettings {
  const profile = resolveStrengthSettings(raw).profile;
  const next = { ...(profile.exerciseWeightsKg ?? {}) };
  const clean = cleanMachineList(list);
  if (clean) next[exerciseId] = clean;
  else delete next[exerciseId];
  const out = withProfile(raw, { exerciseWeightsKg: Object.keys(next).length > 0 ? next : undefined });
  if (Object.keys(next).length === 0) {
    out.profiles = out.profiles?.map((p) => {
      if (p.id !== profile.id) return p;
      const { exerciseWeightsKg: _gone, ...rest } = p;
      void _gone;
      return rest;
    });
  }
  return out;
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
  const { exerciseWeightsKg: _own, id: _id, ...rest } = base;
  void _own;
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

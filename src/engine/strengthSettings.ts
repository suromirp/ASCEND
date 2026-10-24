// ASCEND: the settings of "Kracht meerekenen" and the gym profile.
//
// Decision: docs/beslissingen/2026-10-22-alles-instelbaar.md. Every value is
// optional; a missing value means the advice below. That way an older backup
// without the block imports as before and nobody notices anything until he
// changes a choice himself. `resolveStrengthSettings` reads defensively (a
// backup can be damaged); `normalizeStrengthSettings` is what the backup import
// stores: only values that make sense, never the rubbish.
//
// One profile now, but the shape is a list with an active id, so more gyms can
// come later without changing what is stored.

import { normalizeStrengthProgram, type StoredStrengthProgram } from './strengthProgramStore';

export type ProgressionFirst = 'weight_first' | 'reps_first';
export type WorkSetsMode = 'descending' | 'equal';
export type WarmupMode = 'smart' | 'scheme' | 'off';
// Who gets the full build-up: the first heavy exercise of a body part, or every compound exercise.
export type WarmupScope = 'group' | 'exercise';
// What happens when the rest timer of the workout screen runs out.
export type RestAlert = 'sound_vibrate' | 'vibrate' | 'sound' | 'off';
// The sound at the end of the rest: three soft bells, one deep bell, or the old beep.
export type RestSound = 'chime' | 'bell' | 'beep' | 'boxing' | 'whistle' | 'gong';
// What the cards on Forge show per exercise: the estimated 1RM (with the
// MacroFactor one next to it) or the weight you can handle at your rep range.
export type OneRmView = 'one_rm' | 'work_weight';

// Met welke momenten Forge het getal van nu vergelijkt, in weken terug: twee
// momenten.
export type CompareWeeks = '4_8' | '2_4' | '8_12' | '12_26';
// De volgorde van de oefeningen: de meest getrainde eerst, de laatst getrainde
// eerst, of op naam.
export type ForgeSort = 'most' | 'recent' | 'name';

export interface DumbbellRack {
  // The lightest dumbbell, the step up to `upToKg`, the step above that and the heaviest.
  startKg: number;
  stepKg: number;
  upToKg: number;
  thenStepKg: number;
  maxKg: number;
}

export interface GymProfile {
  id: string;
  name: string;
  // Empty bars, heaviest first.
  barsKg: number[];
  // Plates that come in pairs, as many as you need of each.
  platesKg: number[];
  dumbbells: DumbbellRack;
  // The step of cables and machines with a weight stack.
  stackStepKg: number;
  // Own step for one exercise (by exercise id), over the one above. For later.
  exerciseStepKg?: Record<string, number>;
}

export interface StrengthSettings {
  // "Kracht meerekenen".
  enabled?: boolean;
  progression?: ProgressionFirst;
  workSets?: WorkSetsMode;
  warmup?: WarmupMode;
  warmupScope?: WarmupScope;
  // Widen the rep range for a while when the step of the machine is too coarse.
  widenRange?: boolean;
  // Up to how many reps to failure a set counts for the estimate (12, 15 or 20).
  estimateUpTo?: number;
  activeProfileId?: string;
  profiles?: GymProfile[];
  // The workout screen (components/forge/ForgeWorkout.tsx). The rest timer
  // starts by itself after a working set and after the last warm-up set.
  restAuto?: boolean;
  restAlert?: RestAlert;
  restSound?: RestSound;
  // Keep the screen on while the workout screen is open.
  keepScreenOn?: boolean;
  // A weight you change on one set goes on to the next sets you did not touch.
  carryWeights?: boolean;
  // A small line "per kant 15 + 2,5" under a working set of a barbell exercise.
  showPlates?: boolean;
  // The block "Geschatte 1RM" with a trend on the Forge page.
  showOneRm?: boolean;
  // The choice between the 1RM and the working weight on the cards of Forge, one
  // for all cards (the switch on a card sets it). Only matters while showOneRm is on.
  oneRmView?: OneRmView;
  // The 1RM from the MacroFactor export, as a line next to ASCEND's own estimate.
  showMacroFactorOneRm?: boolean;
  // The moments the numbers on Forge are set against ("4 en 8 weken geleden").
  compareWeeks?: CompareWeeks;
  // The order of the list on Forge.
  listSort?: ForgeSort;
  // The small lines next to the number: reps at the same weight, top weight, volume.
  showExtras?: boolean;
  // A small line per exercise in the list on Forge, and the chart when a row opens.
  showTrendLines?: boolean;
  // Your own rest per exercise (by exercise id), in seconds, over the estimate.
  restSeconds?: Record<string, number>;
  // A pinned note per exercise (by exercise id): seat position, grip.
  exerciseNotes?: Record<string, string>;
  // The strength program read in from MacroFactor, after Akkoord: it fills the
  // strength templates (engine/macrofactorProgram.ts). Absent: ASCEND's own.
  program?: StoredStrengthProgram;
}

export interface ResolvedStrengthSettings {
  enabled: boolean;
  progression: ProgressionFirst;
  workSets: WorkSetsMode;
  warmup: WarmupMode;
  warmupScope: WarmupScope;
  widenRange: boolean;
  estimateUpTo: number;
  profile: GymProfile;
  restAuto: boolean;
  restAlert: RestAlert;
  restSound: RestSound;
  keepScreenOn: boolean;
  carryWeights: boolean;
  showPlates: boolean;
  showOneRm: boolean;
  oneRmView: OneRmView;
  showMacroFactorOneRm: boolean;
  compareWeeks: CompareWeeks;
  listSort: ForgeSort;
  showExtras: boolean;
  showTrendLines: boolean;
  restSeconds: Record<string, number>;
  exerciseNotes: Record<string, string>;
}

export const DEFAULT_PROFILE_ID = 'standaard';

export const DEFAULT_PROFILE: GymProfile = {
  id: DEFAULT_PROFILE_ID,
  name: 'Mijn sportschool',
  barsKg: [20, 15],
  platesKg: [1.25, 2.5, 5, 10, 15, 20, 25],
  dumbbells: { startKg: 2, stepKg: 2, upToKg: 10, thenStepKg: 2.5, maxKg: 50 },
  stackStepKg: 5,
};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function weightList(raw: unknown, min: number, max: number, maxCount: number): number[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const list = [...new Set(raw.filter(isNum).filter((n) => n >= min && n <= max).map((n) => Math.round(n * 100) / 100))];
  return list.length > 0 && list.length <= maxCount ? list : undefined;
}

function stepValue(raw: unknown, fallback: number): number {
  return isNum(raw) && raw >= 0.25 && raw <= 50 ? Math.round(raw * 100) / 100 : fallback;
}

function normalizeRack(raw: unknown): DumbbellRack {
  const d = DEFAULT_PROFILE.dumbbells;
  const r = isRecord(raw) ? raw : {};
  const startKg = isNum(r.startKg) && r.startKg >= 0.5 && r.startKg <= 20 ? r.startKg : d.startKg;
  const stepKg = stepValue(r.stepKg, d.stepKg);
  const thenStepKg = stepValue(r.thenStepKg, d.thenStepKg);
  const upToKg = isNum(r.upToKg) && r.upToKg >= startKg && r.upToKg <= 100 ? r.upToKg : Math.max(d.upToKg, startKg);
  const maxKg = isNum(r.maxKg) && r.maxKg >= upToKg && r.maxKg <= 200 ? r.maxKg : Math.max(d.maxKg, upToKg);
  return { startKg, stepKg, upToKg, thenStepKg, maxKg };
}

// A profile that can be stored, or nothing.
export function normalizeProfile(raw: unknown): GymProfile | undefined {
  if (!isRecord(raw) || typeof raw.id !== 'string' || raw.id.trim() === '' || raw.id.length > 40) return undefined;
  const bars = weightList(raw.barsKg, 1, 40, 6)?.sort((a, b) => b - a);
  const plates = weightList(raw.platesKg, 0.25, 50, 12)?.sort((a, b) => a - b);
  let exerciseStepKg: Record<string, number> | undefined;
  if (isRecord(raw.exerciseStepKg)) {
    const entries = Object.entries(raw.exerciseStepKg).filter((e): e is [string, number] => e[0].length <= 60 && isNum(e[1]) && e[1] >= 0.25 && e[1] <= 50);
    if (entries.length > 0) exerciseStepKg = Object.fromEntries(entries);
  }
  return {
    id: raw.id,
    name: typeof raw.name === 'string' && raw.name.trim() !== '' ? raw.name.trim().slice(0, 40) : DEFAULT_PROFILE.name,
    barsKg: bars ?? DEFAULT_PROFILE.barsKg,
    platesKg: plates ?? DEFAULT_PROFILE.platesKg,
    dumbbells: normalizeRack(raw.dumbbells),
    stackStepKg: stepValue(raw.stackStepKg, DEFAULT_PROFILE.stackStepKg),
    ...(exerciseStepKg ? { exerciseStepKg } : {}),
  };
}

const PROGRESSIONS: ProgressionFirst[] = ['weight_first', 'reps_first'];
const WORK_SETS: WorkSetsMode[] = ['descending', 'equal'];
const WARMUPS: WarmupMode[] = ['smart', 'scheme', 'off'];
const WARMUP_SCOPES: WarmupScope[] = ['group', 'exercise'];
export const ONE_RM_VIEWS: OneRmView[] = ['one_rm', 'work_weight'];
export const COMPARE_WEEKS: CompareWeeks[] = ['4_8', '2_4', '8_12', '12_26'];
export const FORGE_SORTS: ForgeSort[] = ['most', 'recent', 'name'];
// '4_8' to [4, 8].
export const compareMoments = (c: CompareWeeks): [number, number] => {
  const [a, b] = c.split('_').map(Number);
  return [a, b];
};
export const REST_ALERTS: RestAlert[] = ['sound_vibrate', 'vibrate', 'sound', 'off'];
export const REST_SOUNDS: RestSound[] = ['chime', 'bell', 'beep', 'boxing', 'whistle', 'gong'];
export const REST_LIMITS = { min: 15, max: 600 };
export const EXERCISE_NOTE_MAX = 200;
const MAX_PER_EXERCISE_ENTRIES = 300;

// A record keyed by exercise id, with only the entries that make sense.
function perExercise<T>(raw: unknown, keep: (v: unknown) => T | undefined): Record<string, T> | undefined {
  if (!isRecord(raw)) return undefined;
  const out: Record<string, T> = {};
  let n = 0;
  for (const [key, value] of Object.entries(raw)) {
    if (key.length === 0 || key.length > 60 || n >= MAX_PER_EXERCISE_ENTRIES) continue;
    const kept = keep(value);
    if (kept === undefined) continue;
    out[key] = kept;
    n++;
  }
  return n > 0 ? out : undefined;
}

const restValue = (v: unknown): number | undefined => (isNum(v) && v >= REST_LIMITS.min && v <= REST_LIMITS.max ? Math.round(v) : undefined);
const noteValue = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() !== '' ? v.trim().slice(0, EXERCISE_NOTE_MAX) : undefined);
export const ESTIMATE_UP_TO_OPTIONS = [12, 15, 20];

// What a backup import keeps of the block: only valid values. Undefined when
// the block is not a record at all.
export function normalizeStrengthSettings(raw: unknown): StrengthSettings | undefined {
  if (!isRecord(raw)) return undefined;
  const out: StrengthSettings = {};
  if (typeof raw.enabled === 'boolean') out.enabled = raw.enabled;
  if (typeof raw.widenRange === 'boolean') out.widenRange = raw.widenRange;
  const progression = PROGRESSIONS.find((p) => p === raw.progression);
  if (progression) out.progression = progression;
  const workSets = WORK_SETS.find((p) => p === raw.workSets);
  if (workSets) out.workSets = workSets;
  const warmup = WARMUPS.find((p) => p === raw.warmup);
  if (warmup) out.warmup = warmup;
  const warmupScope = WARMUP_SCOPES.find((p) => p === raw.warmupScope);
  if (warmupScope) out.warmupScope = warmupScope;
  const upTo = ESTIMATE_UP_TO_OPTIONS.find((n) => n === raw.estimateUpTo);
  if (upTo) out.estimateUpTo = upTo;
  if (Array.isArray(raw.profiles)) {
    const seen = new Set<string>();
    const profiles = raw.profiles
      .map(normalizeProfile)
      .filter((p): p is GymProfile => !!p && !seen.has(p.id) && !!seen.add(p.id))
      .slice(0, 5);
    if (profiles.length > 0) out.profiles = profiles;
  }
  if (typeof raw.activeProfileId === 'string' && raw.activeProfileId.length <= 40) out.activeProfileId = raw.activeProfileId;
  if (typeof raw.restAuto === 'boolean') out.restAuto = raw.restAuto;
  if (typeof raw.keepScreenOn === 'boolean') out.keepScreenOn = raw.keepScreenOn;
  if (typeof raw.carryWeights === 'boolean') out.carryWeights = raw.carryWeights;
  if (typeof raw.showPlates === 'boolean') out.showPlates = raw.showPlates;
  if (typeof raw.showOneRm === 'boolean') out.showOneRm = raw.showOneRm;
  const oneRmView = ONE_RM_VIEWS.find((v) => v === raw.oneRmView);
  if (oneRmView) out.oneRmView = oneRmView;
  if (typeof raw.showMacroFactorOneRm === 'boolean') out.showMacroFactorOneRm = raw.showMacroFactorOneRm;
  const compareWeeks = COMPARE_WEEKS.find((v) => v === raw.compareWeeks);
  if (compareWeeks) out.compareWeeks = compareWeeks;
  const listSort = FORGE_SORTS.find((v) => v === raw.listSort);
  if (listSort) out.listSort = listSort;
  if (typeof raw.showExtras === 'boolean') out.showExtras = raw.showExtras;
  if (typeof raw.showTrendLines === 'boolean') out.showTrendLines = raw.showTrendLines;
  const alert = REST_ALERTS.find((a) => a === raw.restAlert);
  if (alert) out.restAlert = alert;
  const sound = REST_SOUNDS.find((a) => a === raw.restSound);
  if (sound) out.restSound = sound;
  const rest = perExercise(raw.restSeconds, restValue);
  if (rest) out.restSeconds = rest;
  const notes = perExercise(raw.exerciseNotes, noteValue);
  if (notes) out.exerciseNotes = notes;
  const program = normalizeStrengthProgram(raw.program);
  if (program) out.program = program;
  return out;
}

export function resolveStrengthSettings(raw: StrengthSettings | undefined | null): ResolvedStrengthSettings {
  const s = normalizeStrengthSettings(raw) ?? {};
  const profile = s.profiles?.find((p) => p.id === s.activeProfileId) ?? s.profiles?.[0] ?? DEFAULT_PROFILE;
  return {
    enabled: s.enabled ?? true,
    progression: s.progression ?? 'weight_first',
    workSets: s.workSets ?? 'descending',
    warmup: s.warmup ?? 'smart',
    warmupScope: s.warmupScope ?? 'group',
    widenRange: s.widenRange ?? true,
    estimateUpTo: s.estimateUpTo ?? 20,
    profile,
    restAuto: s.restAuto ?? true,
    restAlert: s.restAlert ?? 'sound_vibrate',
    restSound: s.restSound ?? 'chime',
    keepScreenOn: s.keepScreenOn ?? true,
    carryWeights: s.carryWeights ?? true,
    showPlates: s.showPlates ?? true,
    showOneRm: s.showOneRm ?? true,
    oneRmView: s.oneRmView ?? 'one_rm',
    showMacroFactorOneRm: s.showMacroFactorOneRm ?? true,
    compareWeeks: s.compareWeeks ?? '4_8',
    listSort: s.listSort ?? 'most',
    showExtras: s.showExtras ?? true,
    showTrendLines: s.showTrendLines ?? true,
    restSeconds: s.restSeconds ?? {},
    exerciseNotes: s.exerciseNotes ?? {},
  };
}

export const strengthModelOn = (raw: StrengthSettings | undefined): boolean => resolveStrengthSettings(raw).enabled;

// The settings with the active profile changed. The first time, the default
// profile becomes a stored one.
export function withProfile(raw: StrengthSettings | undefined, patch: Partial<GymProfile>): StrengthSettings {
  const resolved = resolveStrengthSettings(raw);
  const current = resolved.profile;
  const next: GymProfile = { ...current, ...patch, id: current.id };
  const others = (raw?.profiles ?? []).filter((p) => p.id !== current.id);
  return { ...raw, activeProfileId: next.id, profiles: [next, ...others] };
}

// One entry of a per-exercise record set or cleared (undefined clears it).
export function withExerciseValue<K extends 'restSeconds' | 'exerciseNotes'>(
  raw: StrengthSettings | undefined,
  field: K,
  exerciseId: string,
  value: NonNullable<StrengthSettings[K]>[string] | undefined,
): StrengthSettings {
  const current = { ...(raw?.[field] ?? {}) } as Record<string, unknown>;
  if (value === undefined) delete current[exerciseId];
  else current[exerciseId] = value;
  const next = { ...raw, [field]: current };
  if (Object.keys(current).length === 0) delete next[field];
  return next;
}

// "1,25; 2,5; 5" or "20 15" to numbers: the way people type a list.
export function parseWeightList(text: string): number[] {
  return text
    .split(/[;\s]+/)
    .map((t) => t.trim().replace(',', '.'))
    .filter((t) => t !== '')
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0);
}

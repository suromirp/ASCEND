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

export type ProgressionFirst = 'weight_first' | 'reps_first';
export type WorkSetsMode = 'descending' | 'equal';
export type WarmupMode = 'smart' | 'scheme' | 'off';

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
  // Widen the rep range for a while when the step of the machine is too coarse.
  widenRange?: boolean;
  // Up to how many reps to failure a set counts for the estimate (12, 15 or 20).
  estimateUpTo?: number;
  activeProfileId?: string;
  profiles?: GymProfile[];
}

export interface ResolvedStrengthSettings {
  enabled: boolean;
  progression: ProgressionFirst;
  workSets: WorkSetsMode;
  warmup: WarmupMode;
  widenRange: boolean;
  estimateUpTo: number;
  profile: GymProfile;
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
    widenRange: s.widenRange ?? true,
    estimateUpTo: s.estimateUpTo ?? 20,
    profile,
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

// "1,25; 2,5; 5" or "20 15" to numbers: the way people type a list.
export function parseWeightList(text: string): number[] {
  return text
    .split(/[;\s]+/)
    .map((t) => t.trim().replace(',', '.'))
    .filter((t) => t !== '')
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0);
}

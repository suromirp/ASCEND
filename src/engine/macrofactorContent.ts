// ASCEND: which ASCEND training does a MacroFactor workout NAME look like?
// A suggestion on the content, for names the plan and the logs say nothing
// about (most workouts are older than the ASCEND plan).
//
// Pure. Per name it looks at the exercises logged under it (matched against
// data/exercises.ts, else read from the words in the name) and counts the
// working sets: legs, or upper body, or both (a full body day). The same is
// done for the strength templates of the program. The template of the same kind
// with the most movements in common wins. Names of one program that are the
// same kind (Workout A and C of an upper/lower split) take the templates in
// turn, so they do not all land on the first.
//
// A name whose workouts all fall before the program started, or in a week with
// no planned strength session, is suggested "als losse krachttraining": no
// planned session is involved, the log only gets the template as its kind.

import { EXERCISES } from '../data/exercises';
import type { MovementPattern } from '../models/exercise';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { mondayOfWeek } from '../utils/dates';
import { matchExercise, normalizeExerciseName } from './exerciseMatch';
import { nameKey, type MacroFactorWorkout } from './macrofactorImport';
import { isLegSession } from './macrofactorSets';

export type Kind = 'legs' | 'upper' | 'full';

const LEG_PATTERNS = new Set<MovementPattern>(['squat', 'hinge', 'lunge_step', 'calf', 'shin', 'hip', 'isolation_leg']);

// Order matters: "leg curl" is a leg before it is a curl, "overhead press" is
// vertical before it is a press.
const WORD_PATTERNS: [RegExp, MovementPattern][] = [
  [/romanian|\brdl\b|deadlift|good morning|hip thrust|hinge|hyperextension/, 'hinge'],
  [/calf|calves|kuit/, 'calf'],
  [/leg curl|leg extension|hamstring|nordic/, 'isolation_leg'],
  [/lunge|step ?up|step ?down|split squat|uitvalspas/, 'lunge_step'],
  [/squat|leg press|beenpers|hack|sled/, 'squat'],
  [/fly|flye|pullover|pull over|straight arm|shrug/, 'isolation_upper'],
  [/overhead|shoulder press|military|\bohp\b|arnold/, 'push_vertical'],
  [/lateral raise|side raise|rear delt|face pull|reverse fly|schouder/, 'isolation_shoulder'],
  [/pulldown|pull down|pull up|pullup|chin|\blat\b|optrek/, 'pull_vertical'],
  [/\brows?\b|roei/, 'pull_horizontal'],
  [/tricep|bicep|curl|pushdown|skull|forearm/, 'isolation_arm'],
  [/bench|chest|incline|decline|fly|flye|push|dip|press|borst/, 'push_horizontal'],
  [/\bcore\b|plank|crunch|\bab\b|abs\b|romp/, 'core'],
];

const byId = new Map(EXERCISES.map((e) => [e.id, e]));

export function patternOf(exerciseName: string): MovementPattern | undefined {
  const id = matchExercise(exerciseName);
  if (id) return byId.get(id)?.pattern;
  const key = normalizeExerciseName(exerciseName);
  return WORD_PATTERNS.find(([re]) => re.test(key))?.[1];
}

export interface Profile {
  kind: Kind;
  legsShare: number;
  patterns: Set<MovementPattern>;
  // Exercise names with their number of sets, most sets first.
  top: { name: string; sets: number }[];
}

const FULL_FROM = 0.3;
const LEGS_FROM = 0.7;

function kindOf(legsShare: number): Kind {
  return legsShare >= LEGS_FROM ? 'legs' : legsShare >= FULL_FROM ? 'full' : 'upper';
}

function profileOf(items: { name: string; sets: number }[]): Profile | undefined {
  let legs = 0;
  let upper = 0;
  const patterns = new Set<MovementPattern>();
  const per = new Map<string, number>();
  for (const { name, sets } of items) {
    const pattern = patternOf(name);
    if (!pattern) continue;
    patterns.add(pattern);
    per.set(name, (per.get(name) ?? 0) + sets);
    // Core says nothing about the kind of day.
    if (pattern === 'core') continue;
    const exercise = byId.get(matchExercise(name) ?? '');
    const isLegs = exercise ? exercise.loadsLegs : LEG_PATTERNS.has(pattern);
    if (isLegs) legs += sets;
    else upper += sets;
  }
  if (legs + upper === 0) return undefined;
  const legsShare = legs / (legs + upper);
  const top = [...per].map(([name, sets]) => ({ name, sets })).sort((a, b) => b.sets - a.sets);
  return { kind: kindOf(legsShare), legsShare, patterns, top };
}

export function workoutProfile(workouts: MacroFactorWorkout[]): Profile | undefined {
  return profileOf(workouts.flatMap((w) => w.exercises.map((e) => ({ name: e.name, sets: Math.max(1, e.sets.length) }))));
}

function templateProfile(template: SessionTemplate): Profile {
  const own = profileOf((template.exercises ?? []).map((e) => ({ name: e.exerciseName, sets: Math.max(1, e.sets ?? 1) })));
  if (own) return own;
  const legs = isLegSession(template);
  return { kind: legs ? 'legs' : 'upper', legsShare: legs ? 1 : 0, patterns: new Set(), top: [] };
}

// --- words ------------------------------------------------------------------------------

const KIND_PHRASE: Record<Kind, string> = { legs: 'een beendag', upper: 'een bovenlichaamdag', full: 'een training voor het hele lichaam' };

// Exercise names stay as MacroFactor writes them (English), only tidied.
function tidy(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

function joinNL(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} en ${items[items.length - 1]}`;
}

// "Back Squat (Barbell), Romanian Deadlift en Leg Press: een beendag"
export function contentReason(profile: Profile): string {
  const names: string[] = [];
  for (const { name } of profile.top) {
    const t = tidy(name);
    if (t && !names.includes(t)) names.push(t);
    if (names.length === 3) break;
  }
  const head = joinNL(names);
  return `${head ? `${head}: ` : ''}${KIND_PHRASE[profile.kind]}`;
}

// --- the choice -----------------------------------------------------------------------------

export interface ContentSuggestion {
  templateId: string;
  reason: string;
  loose: boolean;
}

// "(Workout B)" gives 1; no letter gives 0.
function letterIndex(name: string): number {
  const m = name.match(/(?:workout|training|day|dag)\s+([a-h])\b/i);
  return m ? m[1].toUpperCase().charCodeAt(0) - 65 : 0;
}
const stemOf = (name: string) => nameKey(name.replace(/\s*\([^)]*\)\s*$/, ''));

const overlap = (a: Set<MovementPattern>, b: Set<MovementPattern>) => [...a].filter((p) => b.has(p)).length;

const sameWeek = (a: string, b: string) => mondayOfWeek(a) === mondayOfWeek(b);

// Per name key a suggestion; absent when the exercises say nothing or ASCEND
// has no strength template.
export function suggestByContent(
  workouts: MacroFactorWorkout[],
  templates: SessionTemplate[],
  planned: PlannedSession[],
  programStart?: string,
): Record<string, ContentSuggestion> {
  const strength = templates.filter((t) => t.type === 'strength');
  if (strength.length === 0) return {};
  const tplProfiles = strength.map((t) => ({ template: t, profile: templateProfile(t) }));
  const strengthIds = new Set(strength.map((t) => t.id));
  const plannedStrength = planned.filter((s) => s.status !== 'skipped' && strengthIds.has(s.templateId));

  const byName = new Map<string, MacroFactorWorkout[]>();
  for (const w of workouts) byName.set(nameKey(w.name), [...(byName.get(nameKey(w.name)) ?? []), w]);

  const entries = [...byName]
    .map(([key, list]) => ({ key, list, name: list[0].name, profile: workoutProfile(list) }))
    .filter((e): e is typeof e & { profile: Profile } => !!e.profile);

  // Names of one program that are the same kind take the templates in turn.
  const ordinal = new Map<string, number>();
  const groups = new Map<string, typeof entries>();
  for (const e of entries) {
    const g = `${stemOf(e.name)}|${e.profile.kind}`;
    groups.set(g, [...(groups.get(g) ?? []), e]);
  }
  for (const g of groups.values()) {
    g.sort((a, b) => letterIndex(a.name) - letterIndex(b.name) || a.name.localeCompare(b.name));
    g.forEach((e, i) => ordinal.set(e.key, i));
  }

  const result: Record<string, ContentSuggestion> = {};
  for (const { key, list, profile } of entries) {
    let candidates = tplProfiles.filter((t) => t.profile.kind === profile.kind);
    // No template of that kind (a full body day): the one closest in legs and upper body.
    const nearest = candidates.length === 0;
    if (nearest) candidates = tplProfiles;
    const distance = (t: (typeof tplProfiles)[number]) => (nearest ? Math.abs(t.profile.legsShare - profile.legsShare) : 0);
    const score = (t: (typeof tplProfiles)[number]) => overlap(profile.patterns, t.profile.patterns);
    const ranked = [...candidates].sort((a, b) => distance(a) - distance(b) || score(b) - score(a));
    // One name of its kind: the template with the most movements in common.
    // Several names of one program: the templates in turn (A and C of an
    // upper/lower split are two different upper days).
    const crowd = groups.get(`${stemOf(entries.find((e) => e.key === key)!.name)}|${profile.kind}`)!.length > 1;
    const tied = crowd ? ranked.filter((t) => distance(t) === distance(ranked[0])) : ranked.filter((t) => distance(t) === distance(ranked[0]) && score(t) === score(ranked[0]));
    const pick = tied[(ordinal.get(key) ?? 0) % tied.length];

    const outside = list.every(
      (w) => (programStart !== undefined && w.date < programStart) || !plannedStrength.some((s) => sameWeek(s.scheduledDate, w.date)),
    );
    result[key] = { templateId: pick.template.id, reason: contentReason(profile), loose: outside };
  }
  return result;
}

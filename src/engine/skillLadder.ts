// ASCEND: waar je staat op een calisthenicsladder, uit je logs (docs/beslissingen/2026-11-09-calisthenics-ontwerp.md).
// Puur en deterministisch, geen AI, en het schrijft niets: een stap omhoog of omlaag is later een voorstel
// met Akkoord. De ladders zelf staan in data/skillLadders.ts; je logt op de variant die je deed.
//
// De regels:
// - Een training is het laatste log van een dag met sets op deze ladder (`completedDate`, dan `completedAt`).
//   Een log van na `today` telt niet.
// - Alleen werksets tellen (`isWorkSet`). Een houding telt in seconden; een set zonder seconden telt niet.
//   Een stap met extra gewicht telt alleen sets met minstens `addedKg`.
// - De onderkant is gehaald met `sets` sets op minstens 5 herhalingen (of 10 seconden), de toets met `sets`
//   sets op de bovenkant. Een set met `clean: false` telt voor geen van beide; onbekend telt mee.
// - De huidige stap is de zwaarste stap waarop je de onderkant haalde, in de laatste training waarin je
//   ergens de onderkant haalde. De toets is gehaald als de laatste training op die stap hem haalde.
// - Toets gehaald en er is een zwaardere stap: het voorstel is die stap.
// - Anders: haalde je de onderkant van de zwaarste stap uit je laatste voorbije training drie voorbije
//   trainingen achter elkaar niet, dan is het voorstel de lichtere stap. Vandaag telt niet als voorbij: een
//   training van vandaag is geen misser, maar haalt hij de onderkant op die stap, dan vervalt het voorstel.

import { SKILL_FLOOR_REPS, SKILL_FLOOR_SECONDS, SKILL_LADDERS, LADDER_PLACE, skillLadderById, type SkillLadder, type SkillTest } from '../data/skillLadders';
import type { SessionLog, SetLog } from '../models/training';
import { isWorkSet } from './workSets';

const MISSES_FOR_LIGHTER = 3;

export interface StepResult {
  // Minstens één werkset die voor deze stap telt.
  attempted: boolean;
  floorMet: boolean;
  passed: boolean;
}

export interface LadderProposal {
  kind: 'harder' | 'lighter';
  // Telt vanaf 1, zoals `Exercise.ladder.step`.
  step: number;
  exerciseId: string;
}

export interface LadderState {
  ladderId: string;
  // De huidige stap (vanaf 1), of null als je nergens de onderkant haalde.
  current: number | null;
  currentExerciseId: string | null;
  // De toets van de huidige stap gehaald in de laatste training op die stap.
  passed: boolean;
  proposal: LadderProposal | null;
  // De dag van de laatste training op deze ladder.
  lastDate: string | null;
}

// Wat een set meet voor deze toets: herhalingen, of seconden bij een houding. Undefined als hij niet telt.
function setValue(set: SetLog, test: SkillTest): number | undefined {
  if (!set || typeof set !== 'object' || !isWorkSet(set)) return undefined;
  if (test.kind === 'hold') {
    return typeof set.seconds === 'number' && Number.isFinite(set.seconds) && set.seconds > 0 ? set.seconds : undefined;
  }
  if (typeof set.reps !== 'number' || !Number.isFinite(set.reps) || set.reps < 0) return undefined;
  if (test.addedKg !== undefined && !(typeof set.weightKg === 'number' && set.weightKg >= test.addedKg)) return undefined;
  return set.reps;
}

export function stepResult(sets: readonly SetLog[], test: SkillTest): StepResult {
  const floor = test.kind === 'hold' ? SKILL_FLOOR_SECONDS : SKILL_FLOOR_REPS;
  const top = test.kind === 'hold' ? test.seconds : test.reps;
  let attempted = false;
  let atFloor = 0;
  let atTop = 0;
  for (const set of sets) {
    const value = setValue(set, test);
    if (value === undefined) continue;
    attempted = true;
    if (set.clean === false) continue;
    if (value >= floor) atFloor += 1;
    if (value >= top) atTop += 1;
  }
  return { attempted, floorMet: atFloor >= test.sets, passed: atTop >= test.sets };
}

interface Training {
  date: string;
  // Per stap (vanaf 1) de uitkomst, alleen voor stappen die je probeerde.
  steps: Map<number, StepResult>;
}

const level = (t: Training): number | null => {
  let best: number | null = null;
  for (const [step, r] of t.steps) if (r.floorMet && (best === null || step > best)) best = step;
  return best;
};

const heaviestAttempted = (t: Training): number => Math.max(...t.steps.keys());

// Het laatste log per dag met sets op deze ladder, oud naar nieuw; alleen dagen met een geprobeerde stap.
function trainingsOn(ladder: SkillLadder, logs: readonly SessionLog[], today: string): Training[] {
  const stepOf = new Map(ladder.steps.map((s, i) => [s.exerciseId, i + 1]));
  const lastPerDay = new Map<string, SessionLog>();
  for (const log of logs) {
    if (!log || typeof log.completedDate !== 'string' || log.completedDate > today || !Array.isArray(log.strengthData)) continue;
    if (!log.strengthData.some((e) => e && stepOf.has(e.exerciseId))) continue;
    const known = lastPerDay.get(log.completedDate);
    if (!known || later(log, known)) lastPerDay.set(log.completedDate, log);
  }
  const out: Training[] = [];
  for (const log of lastPerDay.values()) {
    const byStep = new Map<number, SetLog[]>();
    for (const e of log.strengthData ?? []) {
      const step = e ? stepOf.get(e.exerciseId) : undefined;
      if (step === undefined || !Array.isArray(e.sets)) continue;
      byStep.set(step, [...(byStep.get(step) ?? []), ...e.sets]);
    }
    const steps = new Map<number, StepResult>();
    for (const [step, sets] of byStep) {
      const r = stepResult(sets, ladder.steps[step - 1].test);
      if (r.attempted) steps.set(step, r);
    }
    if (steps.size > 0) out.push({ date: log.completedDate, steps });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

// Het latere van twee logs op dezelfde dag: de tijd, dan het id (zodat de volgorde van de lijst niet telt).
function later(a: SessionLog, b: SessionLog): boolean {
  if (a.completedAt !== b.completedAt) return String(a.completedAt) > String(b.completedAt);
  return String(a.id) > String(b.id);
}

export function ladderState(ladder: SkillLadder, logs: readonly SessionLog[], today: string): LadderState {
  const trainings = trainingsOn(ladder, logs, today);
  const exerciseAt = (step: number | null) => (step === null ? null : ladder.steps[step - 1]?.exerciseId ?? null);
  const empty: LadderState = { ladderId: ladder.id, current: null, currentExerciseId: null, passed: false, proposal: null, lastDate: null };
  if (trainings.length === 0) return empty;

  let current: number | null = null;
  for (let i = trainings.length - 1; i >= 0 && current === null; i--) current = level(trainings[i]);
  let passed = false;
  if (current !== null) {
    for (let i = trainings.length - 1; i >= 0; i--) {
      const r = trainings[i].steps.get(current);
      if (r) {
        passed = r.passed;
        break;
      }
    }
  }

  let proposal: LadderProposal | null = null;
  if (passed && current !== null && current < ladder.steps.length) {
    proposal = { kind: 'harder', step: current + 1, exerciseId: exerciseAt(current + 1)! };
  } else {
    const past = trainings.filter((t) => t.date < today);
    const todays = trainings.find((t) => t.date === today);
    const recent = past.slice(-MISSES_FOR_LIGHTER);
    if (recent.length === MISSES_FOR_LIGHTER) {
      const step = heaviestAttempted(recent[recent.length - 1]);
      const missed = recent.every((t) => t.steps.has(step) && !t.steps.get(step)!.floorMet);
      const savedToday = todays !== undefined && (level(todays) ?? 0) >= step;
      if (missed && !savedToday && step > 1) proposal = { kind: 'lighter', step: step - 1, exerciseId: exerciseAt(step - 1)! };
    }
  }

  return { ladderId: ladder.id, current, currentExerciseId: exerciseAt(current), passed, proposal, lastDate: trainings[trainings.length - 1].date };
}

// De stand van elke ladder, in de volgorde van data/skillLadders.ts.
export function ladderStates(logs: readonly SessionLog[], today: string, ladders: readonly SkillLadder[] = SKILL_LADDERS): LadderState[] {
  return ladders.map((l) => ladderState(l, logs, today));
}

// De stand van de ladder waar deze oefening op staat; null voor een oefening zonder ladder.
export function ladderStateFor(exerciseId: string, logs: readonly SessionLog[], today: string): LadderState | null {
  const place = LADDER_PLACE.get(exerciseId);
  const ladder = place ? skillLadderById(place.id) : undefined;
  return ladder ? ladderState(ladder, logs, today) : null;
}

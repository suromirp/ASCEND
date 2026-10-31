// ASCEND — the program laid out toward the goal date (Fase 3).
//
// The program used to be four fixed blocks of 4 weeks from the start date,
// so "Expeditieklaar" fell 31 weeks before the GR5 and after week 16 there
// was no planning at all (docs/audit/3 Simulatie trainingsplan.md, findings
// 1, 2 and 8). Here the phases are counted BACKWARD from the main goal's
// date: a taper right before departure, Expeditieklaar before that,
// Bergcapaciteit, Opbouw, and the basis fills whatever time is left.
// Without a goal date the four blocks stay as they were, followed by an
// Onderhoud block that keeps growing, so a week is never empty.
//
// Pure: no React, no IndexedDB. storage/database.ts#syncProgramHorizon
// applies the result to the stored program and planning.

import { PHASE_TAPER, WAVE_LENGTH, isLightWeekOf, phaseWaveLength, type Phase, type Program, type ProgramDirection, type ProgramDirectionId, type ResolvedProgramPosition } from '../models/program';
import type { PlannedSession, SessionLog, SessionTemplate, WeeklyProgressionStep } from '../models/training';
import type { TrainingGoal, GoalMilestone } from '../models/goals';
import { addDays, daysBetween, mondayOfWeek, resolveProgramWeek } from '../utils/dates';
import { HIKE_DAY_ONE_LADDER, MOUNTAIN_HIKE_LADDER } from '../data/hikeLadder';
import { packLadder, type LadderWeek } from './packLadder';
import { TENT_PACK_KG } from './gr5Profile';
import { goalTiming } from './goalRoute';
import { mainGoal } from './mainGoal';

export const PHASE_BASIS = 'phase_1';
export const PHASE_OPBOUW = 'phase_2';
export const PHASE_BERG = 'phase_3';
export const PHASE_EXPEDITIE = 'phase_4';
export { PHASE_TAPER, WAVE_LENGTH };
export const PHASE_ONDERHOUD = 'phase_onderhoud';
// Zonder doel (docs/visie/Zonder doel.md, 3.2): neutrale golven van vier weken, drie weken
// opbouwen en een lichte week. Geen bergcapaciteit, geen expeditieklaar, geen rugzak.
export const PHASE_GOLF = 'phase_golf';
// De beginnersstart (engine/beginnerStart.ts): de eerste vier weken van je richting, zonder harde training.
export const PHASE_GOLF_START = 'phase_golf_start';
// Een week in een golf, ook de start.
export const isWavePhase = (id: string | undefined): boolean => id === PHASE_GOLF || id === PHASE_GOLF_START;

// The training wave inside every phase (WAVE_LENGTH, models/program.ts):
// wennen, opbouw, zwaarste week, deload (3:1, docs/onderzoek rapport 1).

const PHASE_TEXT: Record<string, { name: string; description: string }> = {
  [PHASE_BASIS]: {
    name: 'BASISFASE',
    description: 'Kracht, een rustige aerobe basis en het weekendblok met heuvels en een lange duurloop. Golven van vier weken: wennen, opbouw, zwaarste week, rustweek.',
  },
  [PHASE_OPBOUW]: {
    name: 'OPBOUW',
    description: 'Je lopen bouwen echt op: de lange duurloop groeit elk blok ongeveer 10% tot rond de 2 uur, de rustige loop wordt langer, en als het goed gaat stelt ASCEND een extra training voor.',
  },
  [PHASE_BERG]: {
    name: 'BERGCAPACITEIT',
    description: 'De lange zondag wordt een bergtocht: meer hoogtemeters omhoog en omlaag, en de rugzak gaat in stappen van 1 tot 2 kg richting je rugzakdoel, nooit in dezelfde week als meer hoogtemeters.',
  },
  [PHASE_EXPEDITIE]: {
    name: 'EXPEDITIEKLAAR',
    description: 'Twee wandeldagen achter elkaar in het weekend, met de rugzak op tochtgewicht (in de zwaarste weken tot 1 kg erboven) en ongeveer 1.000 m stijgen op een dag.',
  },
  [PHASE_TAPER]: {
    name: 'NAAR DE START',
    description: 'Minder volume, dezelfde intensiteit. Je komt fris aan de start. Geen nieuwe zware afdalingen meer.',
  },
  [PHASE_GOLF_START]: {
    name: 'RUSTIG BEGINNEN',
    description: 'De eerste vier weken van je richting alleen makkelijk: de heuvelloop is dan een herstelloop. Zo went je lichaam eerst aan het ritme. Daarna lopen je weken gewoon in golven.',
  },
  [PHASE_GOLF]: {
    name: 'GOLVEN',
    description: 'Je hebt geen doel met een datum. Je weken lopen in golven van vier: drie weken opbouwen, dan een lichtere week. Er komt geen bergtocht en geen rugzak in, tot je een tocht als doel kiest.',
  },
  [PHASE_ONDERHOUD]: {
    name: 'ONDERHOUD',
    description: 'Er is geen doeldatum ingesteld. Je houdt vast wat je hebt opgebouwd tot je een nieuw doel kiest.',
  },
};

function phase(id: string, order: number, weekCount: number): Phase {
  return { id, order, weekCount, ...PHASE_TEXT[id] };
}
const basePhase = phase;

// The goal the program is laid out toward: the main goal (the one with the
// Ascent Ladder), when it is active and still ahead.
export function programAnchorDate(goals: TrainingGoal[], milestones: GoalMilestone[], today: string): string | undefined {
  const withLadder = new Set(milestones.map((m) => m.goalId));
  const main = mainGoal(goals, withLadder);
  if (!main || main.status !== 'active') return undefined;
  return main.targetDate > today ? main.targetDate : undefined;
}

// The day the plan ends: the main goal's own day, also once it has come.
// programAnchorDate only gives a goal still ahead (what the screens count down
// to); this one keeps the plan ending there during the GR5 and after it, so no
// maintenance weeks appear on the trip itself (Doorloop, punt 10). Only a goal
// you mark as reached or set aside lets the planning run on without a goal.
// With the setting "Na je hoofddoel" on maintain (AppSettings.afterMainGoal),
// maintenance weeks follow once the trip itself is over; never during it.
export function planEndDay(goals: TrainingGoal[], milestones: GoalMilestone[], today: string, after: 'stop' | 'maintain' = 'stop'): string | undefined {
  const ahead = programAnchorDate(goals, milestones, today);
  if (ahead) return ahead;
  const withLadder = new Set(milestones.map((m) => m.goalId));
  const main = mainGoal(goals, withLadder);
  if (main?.status !== 'active') return undefined;
  if (after === 'maintain' && goalTiming(main, today).state === 'past') return undefined;
  return main.targetDate;
}

// Switching "Na je hoofddoel" (Instellingen, Programma). Before and during the
// goal it changes nothing in the plan yet, so it is stored directly. Once the
// goal is past, it does change the plan at once: maintenance weeks come on, or
// the open sessions after the goal go off. Then it is a proposal with Akkoord,
// with what it does in plain words
// (docs/beslissingen/2026-10-22-na-het-hoofddoel-als-voorstel.md).
export function afterMainGoalChange(
  goals: TrainingGoal[],
  milestones: GoalMilestone[],
  today: string,
  planned: PlannedSession[],
  logs: SessionLog[],
  from: 'stop' | 'maintain',
  to: 'stop' | 'maintain',
): { proposal: boolean; lines: string[] } {
  if (from === to) return { proposal: false, lines: [] };
  const withLadder = new Set(milestones.map((m) => m.goalId));
  const main = mainGoal(goals, withLadder);
  if (!main || goalTiming(main, today).state !== 'past') return { proposal: false, lines: [] };
  if (to === 'maintain') {
    return { proposal: true, lines: ['Vanaf deze week plant ASCEND weer gewone onderhoudsweken, met je weekschema en je rustdag.', 'Je geschiedenis blijft zoals hij is.'] };
  }
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const open = planned.filter((s) => s.scheduledDate >= today && s.status !== 'skipped' && !logged.has(s.id)).length;
  if (open === 0) return { proposal: false, lines: [] };
  return {
    proposal: true,
    lines: [`${open} geplande ${open === 1 ? 'training gaat' : 'trainingen gaan'} van de planning. ASCEND plant niets meer tot je een nieuw doel kiest.`, 'Wat je al deed blijft staan.'],
  };
}

// Weeks from the program's first Monday up to (not including) the goal
// date. A goal on a Wednesday still gets that week's Monday and Tuesday.
function weeksUntilGoal(startDate: string, goalDate: string): number {
  return Math.ceil(daysBetween(mondayOfWeek(startDate), goalDate) / 7);
}

// The user's own phase lengths (Settings → Training → Programma). Each one
// is optional: what is not set follows the automatic layout. Either the
// basis or the Opbouw fills the weeks that are left: normally the basis,
// but when you set the basis yourself ("start de opbouw eerder"), the
// Opbouw takes the rest instead.
export type AdjustablePhaseId = typeof PHASE_BASIS | typeof PHASE_OPBOUW | typeof PHASE_BERG | typeof PHASE_EXPEDITIE | typeof PHASE_TAPER;
export type PhaseLengthOverrides = Partial<Record<AdjustablePhaseId, number>>;

// Taper in single weeks (1 to 3), the other phases in whole waves of four
// weeks so the rest week stays the fourth week.
export const PHASE_LENGTH_LIMITS: Record<AdjustablePhaseId, { step: number; min: number; max: number }> = {
  [PHASE_BASIS]: { step: WAVE_LENGTH, min: WAVE_LENGTH, max: 24 },
  [PHASE_OPBOUW]: { step: WAVE_LENGTH, min: 0, max: 24 },
  [PHASE_BERG]: { step: WAVE_LENGTH, min: 0, max: 16 },
  [PHASE_EXPEDITIE]: { step: WAVE_LENGTH, min: 0, max: 8 },
  [PHASE_TAPER]: { step: 1, min: 0, max: 3 },
};

function clampLength(id: AdjustablePhaseId, value: number): number {
  const { step, min, max } = PHASE_LENGTH_LIMITS[id];
  return Math.min(max, Math.max(min, Math.round(value / step) * step));
}

export function layoutPhasesForGoal(startDate: string, goalDate: string, overrides: PhaseLengthOverrides = {}): Phase[] | null {
  const total = weeksUntilGoal(startDate, goalDate);
  if (total < 1) return null;
  const pick = (id: AdjustablePhaseId, auto: number, rest: number) =>
    Math.min(rest, overrides[id] !== undefined ? clampLength(id, overrides[id]!) : auto);
  // Counted back from the goal: taper, Expeditieklaar, Bergcapaciteit,
  // Opbouw; the basis gets the rest. A choice that doesn't fit before the
  // goal is shortened, from the earliest phase on.
  let rest = total;
  const taper = pick(PHASE_TAPER, total >= 8 ? 2 : total >= 3 ? 1 : 0, rest);
  rest -= taper;
  const expeditie = pick(PHASE_EXPEDITIE, Math.min(WAVE_LENGTH, rest), rest);
  rest -= expeditie;
  const berg = pick(PHASE_BERG, Math.min(rest >= 20 ? 8 : WAVE_LENGTH, rest), rest);
  rest -= berg;
  let opbouw: number;
  let basis: number;
  if (overrides[PHASE_BASIS] !== undefined) {
    // Your own basis: the Opbouw runs from its end up to Bergcapaciteit.
    basis = Math.min(rest, clampLength(PHASE_BASIS, overrides[PHASE_BASIS]!));
    opbouw = rest - basis;
  } else {
    opbouw = pick(PHASE_OPBOUW, Math.min(rest >= 24 ? 12 : rest >= 12 ? 8 : WAVE_LENGTH, rest), rest);
    basis = rest - opbouw;
  }
  const counts: [string, number][] = [
    [PHASE_BASIS, basis],
    [PHASE_OPBOUW, opbouw],
    [PHASE_BERG, berg],
    [PHASE_EXPEDITIE, expeditie],
    [PHASE_TAPER, taper],
  ];
  return counts.filter(([, n]) => n > 0).map(([id, n], i) => phase(id, i + 1, n));
}

// Without a goal: the original four blocks, then Onderhoud for as long as
// needed to keep at least `horizonWeeks` of planning ahead of today.
export function layoutPhasesWithoutGoal(startDate: string, today: string, horizonWeeks = 12): Phase[] {
  const blocks = [PHASE_BASIS, PHASE_OPBOUW, PHASE_BERG, PHASE_EXPEDITIE].map((id, i) => phase(id, i + 1, WAVE_LENGTH));
  const neededWeeks = Math.floor(daysBetween(mondayOfWeek(startDate), mondayOfWeek(today)) / 7) + 1 + horizonWeeks;
  const extra = neededWeeks - blocks.length * WAVE_LENGTH;
  if (extra <= 0) return blocks;
  // Whole waves, so the deload week stays where it belongs.
  return [...blocks, phase(PHASE_ONDERHOUD, blocks.length + 1, Math.ceil(extra / WAVE_LENGTH) * WAVE_LENGTH)];
}

// Zonder doel: één fase in golven, in hele golven zo lang dat er minstens `horizonWeeks` weken
// voor vandaag liggen. Welke week van de golf het is volgt uit de kalender (waveWeek), nooit
// uit iets wat per week is opgeslagen.
// `waveStart`: de maandag waarop je richting begon (AppSettings.directionStart). De golven tellen
// dan vanaf die maandag, zodat week 1 van de golf de week is waarin je koos, net als op de kaart
// Je week; de weken ervoor zijn een eigen stuk.
// `beginnerWeeks`: zoveel weken vanaf `waveStart` zijn de beginnersstart (een eigen fase, zonder
// harde training). Ze tellen als de eerste golf, zodat de golven daarna gelijk blijven lopen.
export function layoutWaves(startDate: string, today: string, horizonWeeks = 12, waveStart?: string, beginnerWeeks = 0, wave?: { length: number; light: boolean }): Phase[] {
  const len = wave ? phaseWaveLength({ wave }) : WAVE_LENGTH;
  const phase = (id: string, order: number, weekCount: number): Phase => ({ ...basePhase(id, order, weekCount), ...(wave ? { wave: { length: len, light: wave.light } } : {}) });
  const first = mondayOfWeek(startDate);
  const neededWeeks = Math.max(1, Math.floor(daysBetween(first, mondayOfWeek(today)) / 7) + 1 + horizonWeeks);
  const rawLead = waveStart ? Math.floor(daysBetween(first, mondayOfWeek(waveStart)) / 7) : 0;
  const lead = rawLead > 0 && rawLead < neededWeeks ? rawLead : 0;
  const out: Phase[] = [];
  if (lead > 0) out.push(phase(PHASE_GOLF, out.length + 1, lead));
  // De start beslaat hele golven, zodat de golven daarna gelijk blijven lopen met je richting.
  const begin = waveStart && rawLead >= 0 && rawLead < neededWeeks && beginnerWeeks > 0 ? Math.ceil(beginnerWeeks / len) * len : 0;
  if (begin > 0) out.push(phase(PHASE_GOLF_START, out.length + 1, begin));
  const rest = Math.max(1, neededWeeks - lead - begin);
  out.push(phase(PHASE_GOLF, out.length + 1, Math.ceil(rest / len) * len));
  return out;
}

// `free`: er is geen doel (engine/direction.ts#activeDirection), dan de neutrale golven. Met een
// doel zonder datum blijven de oude blokken staan, zodat een plan met een doel niet verandert.
export function layoutPhases(startDate: string, goalDate: string | undefined, today: string, overrides?: PhaseLengthOverrides, opts: { free?: boolean; waveStart?: string; beginnerWeeks?: number; wave?: { length: number; light: boolean } } = {}): Phase[] {
  if (goalDate) {
    const toGoal = layoutPhasesForGoal(startDate, goalDate, overrides);
    if (toGoal) return toGoal;
  }
  return opts.free ? layoutWaves(startDate, today, 12, opts.waveStart, opts.beginnerWeeks, opts.wave) : layoutPhasesWithoutGoal(startDate, today);
}

// De kop van Vandaag in een golf: "Week 2 van 4 van je golf". Buiten een golf niets.
export function waveHeader(position: ResolvedProgramPosition | null | undefined): string | undefined {
  if (!position || !isWavePhase(position.phase.id)) return undefined;
  if (position.phase.wave && !position.phase.wave.light && position.phase.id === PHASE_GOLF) return 'Je vaste week';
  const len = phaseWaveLength(position.phase);
  return `Week ${((position.weekInPhase - 1) % len) + 1} van ${len} van je golf`;
}

// Program.direction defensief gelezen: alleen een bekende richting.
const PROGRAM_DIRECTIONS: ProgramDirectionId[] = ['maintain', 'improve', 'stronger', 'easy'];
export function readProgramDirection(raw: unknown): ProgramDirection | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as { id?: unknown; factors?: unknown };
  const id = PROGRAM_DIRECTIONS.find((d) => d === r.id);
  if (!id) return undefined;
  const factors = Array.isArray(r.factors) && r.factors.length >= 1 && r.factors.length <= 8 && r.factors.every((f) => typeof f === 'number' && Number.isFinite(f) && f > 0 && f <= 3) ? (r.factors as number[]) : undefined;
  return { id, ...(factors ? { factors } : {}) };
}

// De factor van het weekbudget voor deze week van de golf (Program.direction.factors), alleen voor
// een duurtraining in een golf. Kracht en herstel houden hun lengte.
function directionFactor(template: SessionTemplate, program: Program, position: ResolvedProgramPosition): number | undefined {
  if (!isWavePhase(position.phase.id) || template.type === 'strength' || template.type === 'recovery') return undefined;
  const factors = readProgramDirection(program.direction)?.factors;
  if (!factors) return undefined;
  const factor = factors[(waveWeek(position) - 1) % factors.length];
  // In de beginnersstart nooit langer dan de gewone lengte: eerst wennen, dan pas meer (afgeleid).
  return position.phase.id === PHASE_GOLF_START ? Math.min(1, factor) : factor;
}

// Welke week van het gewone schema een week in een golf leest, als de richting vlakke weken
// vraagt (Fit blijven en Rustig aan): de gewone opbouwweek (week 2), en bij Fit blijven in de
// vierde week de lichte week. Zonder richting, of buiten een golf, niets: dan de gewone golf.
function flatWaveWeek(program: Program, position: ResolvedProgramPosition): number | undefined {
  if (!isWavePhase(position.phase.id)) return undefined;
  const direction = readProgramDirection(program.direction);
  if (!direction) return undefined;
  if (direction.id === 'easy') return 2;
  if (direction.id === 'maintain') return isLightWeekOf(position.phase, position.weekInPhase) ? WAVE_LENGTH : 2;
  return undefined;
}

export function programEndDate(program: Program): string {
  const weeks = program.phases.reduce((sum, p) => sum + p.weekCount, 0);
  return addDays(mondayOfWeek(program.startDate), weeks * 7);
}

// --- what a week asks for --------------------------------------------------

// The week the load is read from. Normally the calendar's own week; in a
// repeated week (and the weeks after it in the same wave) the week before
// ("Deze week nog een keer", engine/repeatWeek.ts).
function loadWeekInPhase(position: ResolvedProgramPosition): number {
  return position.weekInPhase - (position.loadShift ?? 0);
}
function loadWeekInProgram(position: ResolvedProgramPosition): number {
  return position.weekInProgram - (position.loadShift ?? 0);
}

// Which week of the wave this is (1-4). The taper has no wave of its own.
// A rest week you chose to train through counts as week 2 of the wave: a
// normal build week, not a second heaviest week in a row.
export function waveWeek(position: ResolvedProgramPosition): number {
  const len = phaseWaveLength(position.phase);
  const wave = ((loadWeekInPhase(position) - 1) % len) + 1;
  return wave === len && position.restSkipped && position.phase.id !== PHASE_TAPER ? 2 : wave;
}

// Taper volume: first week about 70%, the last about 50% of a normal
// build week, intensity unchanged (Bosquet 2007, docs/onderzoek rapport 1).
// One taper week sits in between.
function taperFactor(position: ResolvedProgramPosition): number | undefined {
  if (position.phase.id !== PHASE_TAPER) return undefined;
  if (position.phase.weekCount === 1) return 0.6;
  return position.weekInPhase === 1 ? 0.7 : 0.5;
}

// ASCEND_HEURISTIC(PROGRESSION-CYCLE-CARRYOVER): every repeat of the 4-week
// shape scales it up by 8%, capped at 1.3x, so phase after phase keeps
// building instead of resetting to the "Wennen" numbers. The first wave is
// unaffected. Steps written for one specific phase (phaseId) are explicit
// targets and never scaled.
const CYCLE_GROWTH_PER_REPEAT = 0.08;
const CYCLE_GROWTH_CAP = 1.3;

function cycleMultiplier(weekInProgram: number): number {
  const cycleIndex = Math.floor((weekInProgram - 1) / WAVE_LENGTH);
  return Math.min(1 + CYCLE_GROWTH_PER_REPEAT * cycleIndex, CYCLE_GROWTH_CAP);
}

// --- the running build-up in Opbouw -----------------------------------------
//
// In the basis every template follows the same slow growth (above), which
// stops at 1.3x around week 17. In Opbouw the long run and the easy run
// build on: every wave of four weeks 10% more than the wave before, until
// a peak (long run about 2 hours). Why 10% per wave: the heaviest week of
// a wave then sits at most 10% above the heaviest week four weeks earlier,
// which is the longest run of the previous 30 days. Over 10% raised the
// injury rate (Frandsen et al. 2025, 5,205 runners); the week total may
// grow faster without that risk, which is what the extra run in Opbouw is
// for (engine/extraRun.ts). After Opbouw the runs hold that level. The
// per-session cap in engine/substitutions.ts still guards every session.
export const RUN_BUILD_PER_WAVE = 0.1;
const LONG_RUN_ID = 'tpl_long_run';
export const RUN_BUILD_PEAK_MINUTES: Record<string, number> = {
  tpl_long_run: 120,
  tpl_easy_run: 55,
};

function opbouwStartWeek(program: Program): { start: number; weeks: number } | undefined {
  let week = 1;
  for (const p of program.phases) {
    if (p.id === PHASE_OPBOUW) return { start: week, weeks: p.weekCount };
    week += p.weekCount;
  }
  return undefined;
}

// Quality sessions build in their structure (more blocks per week of the
// wave), not in minutes: a tempo run at most ~10% of the weekly volume
// (Daniels), intervals around 16 to 20 minutes of hard work (Helgerud 2007).
// Growing them with the general cycle made a 72-minute interval session.
const FIXED_LENGTH = new Set(['tpl_tempo_run', 'tpl_intervals']);

function runBuildMultiplier(template: SessionTemplate, program: Program, position: ResolvedProgramPosition, heaviestStepMinutes: number): number {
  if (FIXED_LENGTH.has(template.id)) return 1;
  const week = loadWeekInProgram(position);
  const basic = cycleMultiplier(week);
  const peak = RUN_BUILD_PEAK_MINUTES[template.id];
  const opbouw = opbouwStartWeek(program);
  if (!peak || !opbouw || opbouw.weeks === 0 || week < opbouw.start) return basic;
  const lastWave = Math.floor((opbouw.weeks - 1) / WAVE_LENGTH);
  const wave = Math.min(Math.floor((week - opbouw.start) / WAVE_LENGTH), lastWave);
  const from = opbouw.start > 1 ? cycleMultiplier(opbouw.start - 1) : 1;
  const built = from * Math.pow(1 + RUN_BUILD_PER_WAVE, wave + 1);
  return Math.max(basic, Math.min(built, peak / heaviestStepMinutes));
}

// The long run toward a running race of a Top or Voortop goal (Program.runBuild, setting "Groei van
// de lange loop"): from the start of Opbouw a step of at most 10% every `stepWeeks` build weeks on the
// last build week, never a jump to the peak or to the 110% limit. The lighter week of the wave stays
// (as light as the written ladder has it) and the build resumes from the last build week, not from
// the light one. The weekly growth holds up to the peak of that race (without a known peak the
// program's own 120); above that, and after the week of the race, the usual build-up takes over
// (the target is the larger of the usual build-up and the capped gradual growth). The 110% cap on your own longest run of
// 30 days (engine/substitutions.ts) still holds on top, so a skipped or shorter run makes the next
// one grow from what you really did.
function gradualLongRunMinutes(template: SessionTemplate, program: Program, generic: WeeklyProgressionStep[], week: number, restSkipped: boolean): { minutes: number; cap: number } | undefined {
  const build = readRunBuild(program.runBuild);
  const opbouw = opbouwStartWeek(program);
  if (!build || build.taperOnly || !opbouw || opbouw.weeks === 0 || week < opbouw.start) return undefined;
  const raceWeek = Math.floor(daysBetween(mondayOfWeek(program.startDate), mondayOfWeek(build.raceDate)) / 7) + 1;
  if (!Number.isFinite(raceWeek) || week >= raceWeek) return undefined;
  const ladder = [1, 2, 3, 4].map((n) => generic.find((g) => g.weekInPhase === n)?.targetMinutes);
  if (ladder.some((m) => !(typeof m === 'number' && m > 0))) return undefined;
  const [, , heavy, light] = ladder as number[];
  const lightRatio = light / heavy;
  // The weekly growth holds up to the peak of the race (10 km 75, half 120, marathon 180); without a
  // known race peak up to the program's own peak. Above that the usual build-up takes over again
  // (see genericTarget: the larger of the two).
  const peak = build.peakMinutes > 0 ? build.peakMinutes : longRunPeak(program);
  // The first build week grows from the highest non-light week of the last four weeks before
  // Opbouw, as those weeks stand in the plan (the usual build-up): the same measure as the 110%
  // cap on the longest run of 30 days, so the step into Opbouw is also at most 10%.
  let level = 0;
  for (let back = 2; back <= WAVE_LENGTH + 1 && opbouw.start - back >= 0; back++) {
    const before = resolveProgramWeek(program, addDays(mondayOfWeek(program.startDate), 7 * (opbouw.start - back)));
    const usualBefore = before ? genericTarget(template, program, before, generic) : undefined;
    if (!before || !usualBefore || usualBefore.taper) continue;
    if (waveWeek(before) === WAVE_LENGTH) continue;
    level = Math.max(level, Math.floor(usualBefore.minutes));
  }
  if (!(level > 0)) level = Math.floor(heavy);
  let builds = 0;
  for (let w = opbouw.start; w <= week; w++) {
    const isLight = ((w - opbouw.start) % WAVE_LENGTH) + 1 === WAVE_LENGTH && !(w === week && restSkipped) && !(w < week && resolveProgramWeek(program, addDays(mondayOfWeek(program.startDate), 7 * (w - 1)))?.restSkipped);
    let value: number;
    if (isLight) value = Math.max(15, Math.round(level * lightRatio));
    else {
      if (builds % build.stepWeeks === 0 && level < peak) level = Math.min(peak, Math.floor(level * (1 + (build.stepPercent ?? RUN_BUILD_PER_WAVE * 100) / 100)));
      builds++;
      value = level;
    }
    if (w === week) return { minutes: value, cap: peak };
  }
  return undefined;
}

// Program.runBuild defensief gelezen (een oude of beschadigde back-up): een echte datum, een stap
// van minstens een week en een piek zonder rare waarden; anders niets, en dan geldt de gewone groei.
export function readRunBuild(raw: unknown): NonNullable<Program['runBuild']> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const b = raw as Record<string, unknown>;
  const date = b.raceDate;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) return undefined;
  const step = b.stepWeeks;
  if (typeof step !== 'number' || !Number.isFinite(step) || step < 1) return undefined;
  const peak = typeof b.peakMinutes === 'number' && Number.isFinite(b.peakMinutes) && b.peakMinutes > 0 ? b.peakMinutes : 0;
  const percent = b.stepPercent;
  const limit = b.spikeLimit;
  return {
    raceDate: date, stepWeeks: Math.floor(step), peakMinutes: peak,
    ...(typeof percent === 'number' && Number.isFinite(percent) && percent > 10 && percent <= 20 ? { stepPercent: percent } : {}),
    ...(b.alternatePeak === false ? { alternatePeak: false } : {}),
    ...(b.taperOnly === true ? { taperOnly: true } : {}),
    ...(typeof limit === 'number' && Number.isFinite(limit) && limit > 1.1 && limit <= 1.2 ? { spikeLimit: limit } : {}),
  };
}

export interface ProgressionTarget {
  step: WeeklyProgressionStep;
  minutes: number;
  // The steps of this phase, for the "deze fase" overview.
  phaseSteps: WeeklyProgressionStep[];
}

// The step written for this exact week of the phase; in a phase made longer
// than its written ladder, the last written wave repeats instead of starting
// over at "Wennen".
function ownStepFor(own: WeeklyProgressionStep[], position: ResolvedProgramPosition): WeeklyProgressionStep {
  const wave = waveWeek(position);
  const sameWave = own.filter((s) => ((s.weekInPhase - 1) % WAVE_LENGTH) + 1 === wave).sort((a, b) => b.weekInPhase - a.weekInPhase);
  return own.find((s) => s.weekInPhase === loadWeekInPhase(position)) ?? sameWave[0] ?? own[own.length - 1];
}

// The target for one template in one program week. Phase-specific steps
// win (matched on the exact week in the phase first, then on the wave
// week); otherwise the generic 4-week shape, scaled per cycle, and in the
// taper a normal build week scaled down. The backpack of the hikes and the
// rucksack walk comes from the pack ladder (below), not from the steps.
export function progressionTarget(template: SessionTemplate, program: Program | null | undefined, dateIso: string): ProgressionTarget | undefined {
  const target = stepTarget(template, program, dateIso);
  if (!target || !program || !PACK_LADDER_TEMPLATES.has(template.id)) return target;
  // Zonder doel geen rugzakladder: die hoort bij een tocht.
  if (isWavePhase(resolveProgramWeek(program, dateIso)?.phase.id)) return target;
  const kg = packKgOn(program, dateIso);
  return kg === undefined ? target : { ...target, step: { ...target.step, backpackKg: kg } };
}

function stepTarget(template: SessionTemplate, program: Program | null | undefined, dateIso: string): ProgressionTarget | undefined {
  const steps = template.weeklyProgression;
  if (!steps || !program) return undefined;
  const position = resolveProgramWeek(program, dateIso);
  if (!position) return undefined;

  const own = steps.filter((s) => s.phaseId === position.phase.id);
  if (own.length > 0) {
    const step = ownStepFor(own, position);
    return { step: repeatNote(step, position), minutes: step.targetMinutes, phaseSteps: own };
  }

  const generic = steps.filter((s) => !s.phaseId);
  if (generic.length === 0) return undefined;
  const raw = genericTarget(template, program, position, generic);
  if (!raw) return undefined;
  if (raw.taper) return { step: raw.step, minutes: template.id === LONG_RUN_ID ? raceTaperCap(program, dateIso, raw.minutes) : raw.minutes, phaseSteps: generic };
  let minutes = raw.minutes;
  // The long run on its peak alternates: a week on the peak, the next about 80% of it, next to the
  // lighter week of the wave. So the peak stands at most every other week (expert).
  if (template.id === LONG_RUN_ID) minutes = raceTaperCap(program, dateIso, alternatePeak(template, program, dateIso, generic, minutes, raw.peak, raw.usual));
  return { step: repeatNote(raw.step, position), minutes, phaseSteps: generic };
}

// The peak the long run of this program tops out at: its own 120 minutes, or more toward a race.
function longRunPeak(program: Program): number {
  return Math.max(RUN_BUILD_PEAK_MINUTES[LONG_RUN_ID], readRunBuild(program.runBuild)?.peakMinutes ?? 0);
}
// Derived rule (not a study): a taper lowers the volume and keeps the intensity (Bosquet 2007). In the 14
// days before a running race of a Top or Voortop goal the long run is at most the peak of that race
// (10 km 75 minutes, half 120, marathon 180), in the last 7 days at most 70% of it. After the race the
// usual recovery applies. Only with a known race peak (Program.runBuild.peakMinutes).
export const RACE_TAPER_RATIO = 0.7;
function raceTaperCap(program: Program, dateIso: string, minutes: number): number {
  const build = readRunBuild(program.runBuild);
  if (!build || !(build.peakMinutes > 0)) return minutes;
  const days = daysBetween(dateIso, build.raceDate);
  if (days < 0 || days > 14) return minutes;
  return Math.min(minutes, Math.round(build.peakMinutes * (days <= 7 ? RACE_TAPER_RATIO : 1)));
}

export const PEAK_ALTERNATE_RATIO = 0.8;

function alternatePeak(template: SessionTemplate, program: Program, dateIso: string, generic: WeeklyProgressionStep[], minutes: number, peak: number | undefined, usual?: number): number {
  if (!peak || program.runBuild?.alternatePeak === false) return minutes;
  // How many weeks in a row before this one stood on a peak: odd = this week is the lighter one.
  // The peak is the one that is reached: the race peak while the growth is capped at it, else the program's own.
  let run = 0;
  while (run < 60) {
    const position = resolveProgramWeek(program, addDays(dateIso, -7 * (run + 1)));
    const before = position ? genericTarget(template, program, position, generic) : undefined;
    if (!before || before.taper || !before.peak) break;
    run++;
  }
  // The lighter week never drops below the usual build-up when the peak is the race's own.
  return run % 2 === 1 ? Math.max(Math.round(peak * PEAK_ALTERNATE_RATIO), usual ?? 0) : minutes;
}

// The generic step of a week, scaled: before any alternation of the peak.
function genericTarget(template: SessionTemplate, program: Program, position: ResolvedProgramPosition, generic: WeeklyProgressionStep[]): { step: WeeklyProgressionStep; minutes: number; taper: boolean; peak?: number; usual?: number } | undefined {
  // A phase with steps of its own is not this path.
  if (template.weeklyProgression?.some((s) => s.phaseId === position.phase.id)) return undefined;
  // Zonder doel met een richting: de gewone lengte (de opbouwweek) maal de factor van de week.
  const factor = directionFactor(template, program, position);
  const flat = factor !== undefined ? 2 : flatWaveWeek(program, position);
  const wave = flat ?? waveWeek(position);
  const taper = taperFactor(position);
  const step = generic.find((s) => s.weekInPhase === (taper ? 2 : wave));
  if (!step) return undefined;
  const heaviest = Math.max(...generic.map((s) => s.targetMinutes));
  // Vlakke weken groeien niet per golf: elke golf is dezelfde.
  const scaled = step.targetMinutes * (factor ?? (flat ? 1 : runBuildMultiplier(template, program, position, heaviest)));
  if (taper) {
    const minutes = Math.max(15, Math.round((scaled * taper) / 5) * 5);
    return { step: { ...step, note: position.weekInPhase === position.phase.weekCount ? 'Laatste week voor de start, kort en fris' : 'Minder volume, zelfde tempo' }, minutes, taper: true };
  }
  const gradual = template.id === LONG_RUN_ID ? gradualLongRunMinutes(template, program, generic, loadWeekInProgram(position), !!position.restSkipped) : undefined;
  const usual = Math.round(scaled);
  const minutes = gradual ? Math.max(usual, gradual.minutes) : usual;
  // The peak this week stands on: the capped gradual growth when it is what sets the week, else the
  // program's own peak when the usual build-up reaches it.
  const programPeak = longRunPeak(program);
  const peak = gradual && gradual.minutes >= usual && gradual.minutes >= gradual.cap ? gradual.cap : minutes >= programPeak && template.id === LONG_RUN_ID ? programPeak : undefined;
  return { step, minutes, taper: false, ...(peak ? { peak } : {}), ...(peak && peak !== programPeak ? { usual } : {}) };
}

// A repeated week says so in its note ("Opbouw (herhaalweek)").
function repeatNote(step: WeeklyProgressionStep, position: ResolvedProgramPosition): WeeklyProgressionStep {
  return position.repeated ? { ...step, note: step.note ? `${step.note} (herhaalweek)` : 'Herhaalweek' } : step;
}

// --- the backpack ladder ------------------------------------------------------
//
// The rucksack walk, the mountain hike and the first hiking day carry the
// weight of the week. It is worked out for the whole program at once
// (engine/packLadder.ts) from the pack target of the main goal
// (Program.packTargetKg, set by storage/database.ts#syncProgramHorizon) and
// the D+ ladder (data/hikeLadder.ts), so a pack step never lands in a week
// with more D+, and a goal of 16 kg gives another ladder than one of 12.
const PACK_LADDER_TEMPLATES = new Set(['tpl_mountain_hike', 'tpl_hike_day_one', 'tpl_ruck_walk']);

// The pack target a program is laid out for: the main goal's own setting,
// else the default with a tent.
function programPackTargetKg(program: Program): number {
  const kg = program.packTargetKg;
  return kg !== undefined && Number.isFinite(kg) && kg > 0 ? kg : TENT_PACK_KG;
}

function hikeElevation(ladder: WeeklyProgressionStep[], position: ResolvedProgramPosition): number | undefined {
  const own = ladder.filter((s) => s.phaseId === position.phase.id);
  return own.length > 0 ? ownStepFor(own, position).elevationGainM : undefined;
}

function ladderWeeks(program: Program): LadderWeek[] {
  const total = program.phases.reduce((sum, p) => sum + p.weekCount, 0);
  const first = mondayOfWeek(program.startDate);
  const weeks: LadderWeek[] = [];
  // The D+ of the previous build week, per hike: a rise is judged against it.
  let mountain: number | undefined;
  let dayOne: number | undefined;
  for (let i = 0; i < total; i++) {
    const position = resolveProgramWeek(program, addDays(first, i * 7));
    if (!position) break;
    const taper = position.phase.id === PHASE_TAPER;
    // The fourth week of a wave is a rest week, also when you train through it:
    // the D+ steps of that week are the light ones.
    const rest = !taper && ((position.weekInPhase - 1) % WAVE_LENGTH) === WAVE_LENGTH - 1;
    const kind = taper ? 'taper' : rest ? 'rest' : 'build';
    const m = hikeElevation(MOUNTAIN_HIKE_LADDER, position);
    const d = hikeElevation(HIKE_DAY_ONE_LADDER, position);
    const hike = kind === 'build' && m !== undefined;
    const elevationRises = hike && ((mountain !== undefined && (m ?? 0) > mountain) || (dayOne !== undefined && d !== undefined && d > dayOne));
    if (kind === 'build') {
      if (m !== undefined) mountain = m;
      if (d !== undefined) dayOne = d;
    }
    weeks.push({ kind, hike, elevationRises });
  }
  return weeks;
}

const ladderCache = new Map<string, number[]>();
const LADDER_CACHE_SIZE = 8;

// The pack in kg for every week of the program, by week number - 1.
export function packLadderOf(program: Program): number[] {
  const target = programPackTargetKg(program);
  const key = `${program.startDate}|${program.phases.map((p) => `${p.id}:${p.weekCount}`).join(',')}|${target}`;
  const cached = ladderCache.get(key);
  if (cached) return cached;
  // Built on the calendar without repeated weeks: packKgOn alone shifts a
  // repeated week to the pack of the week before. With them in here the
  // shift would count twice, and the cache (keyed without them) would hand
  // out whichever variant filled it first. A week changed halfway
  // (heldWeekDays) can bring a repeat back for its first days, so it goes too.
  const ladder = packLadder(ladderWeeks({ ...program, repeatedWeeks: undefined, heldWeekDays: undefined }), target);
  if (ladderCache.size >= LADDER_CACHE_SIZE) ladderCache.delete(ladderCache.keys().next().value!);
  ladderCache.set(key, ladder);
  return ladder;
}

export function packKgOn(program: Program, dateIso: string): number | undefined {
  const position = resolveProgramWeek(program, dateIso);
  // A repeated week carries the pack of the week before too.
  return position ? packLadderOf(program)[loadWeekInProgram(position) - 1] : undefined;
}

// --- the weekly pattern per phase -------------------------------------------

// From Bergcapaciteit on, the long Sunday becomes a mountain hike, and in
// Expeditieklaar the Saturday becomes the first of two hiking days
// (docs/onderzoek rapport 1: phase 3 shifts to hikes with D+/D− and a pack,
// phase 4 back-to-back days). The hikes take the slot of the session they
// replace. The user can keep the long run instead (settings), and when
// hiking is switched off the original sessions simply stay.
export interface PatternSwap {
  from: string;
  to: string;
  phases: string[];
}

export const PATTERN_SWAPS: PatternSwap[] = [
  { from: 'tpl_long_run', to: 'tpl_mountain_hike', phases: [PHASE_BERG, PHASE_EXPEDITIE, PHASE_TAPER] },
  { from: 'tpl_hill_intervals', to: 'tpl_hike_day_one', phases: [PHASE_EXPEDITIE] },
];

// Rustig aan (docs/visie/Zonder doel.md, 2.3): nooit een harde training. In een golf wordt de
// heuvelloop van de zaterdag een herstelloop; kies je iets anders, dan wordt hij weer de heuvelloop.
export const CALM_SWAPS: PatternSwap[] = [
  { from: 'tpl_hill_intervals', to: 'tpl_recovery_run', phases: [PHASE_GOLF, PHASE_GOLF_START] },
];
// De beginnersstart: dezelfde wissel, alleen in de eerste vier weken (regel NO-HARD-YET in het ontwerp).
export const BEGINNER_SWAPS: PatternSwap[] = [
  { from: 'tpl_hill_intervals', to: 'tpl_recovery_run', phases: [PHASE_GOLF_START] },
];

// De wissels die een richting zonder doel vraagt.
export function directionSwaps(direction: ProgramDirection | undefined, beginner = false): PatternSwap[] {
  // Rustig aan nooit hard, Sterker worden rustige duur: de benen fris voor de krachtdagen.
  if (direction?.id === 'easy' || direction?.id === 'stronger') return CALM_SWAPS;
  return beginner ? BEGINNER_SWAPS : [];
}

// The pattern session whose place in the week a session fills: a tempo run
// or test takes the easy run's day, the Saturday variants (intervals, hills
// up and down, the first hike day) the hill session's, the mountain hike the
// long run's. A pattern template is its own slot. What protects a session and
// where it goes when the rest day changes follows this place, not the
// template (docs/onderzoek/Planning op een lijn.md, conflicts 1 and 4).
const SLOT_OF: Record<string, string> = {
  tpl_tempo_run: 'tpl_easy_run',
  tpl_test_run: 'tpl_easy_run',
  tpl_intervals: 'tpl_hill_intervals',
  tpl_hills_descent: 'tpl_hill_intervals',
  tpl_hike_day_one: 'tpl_hill_intervals',
  tpl_mountain_hike: 'tpl_long_run',
};
export function patternSlotOf(templateId: string): string {
  return SLOT_OF[templateId] ?? templateId;
}

export interface SwapSettings {
  // 'hike' (default): the long Sunday becomes a mountain hike from
  // Bergcapaciteit on. 'run': keep the long run every week.
  longSundaySession?: 'hike' | 'run';
}

export function activeSwaps(templates: SessionTemplate[], settings: SwapSettings, plannable: (t: SessionTemplate) => boolean): PatternSwap[] {
  if (settings.longSundaySession === 'run') return [];
  const byId = new Map(templates.map((t) => [t.id, t]));
  return PATTERN_SWAPS.filter((s) => {
    const to = byId.get(s.to);
    return !!to && plannable(to);
  });
}

export interface PatternSlot {
  template: SessionTemplate;
  dayOfWeek: number;
}

// The weekly pattern for one week of the program. `pattern` is the
// already sport-filtered set of templates with a usual weekday
// (engine/sports.ts#weeklyPatternTemplates).
export function patternForWeek(pattern: SessionTemplate[], allTemplates: SessionTemplate[], swaps: PatternSwap[], phaseId: string | undefined): PatternSlot[] {
  const byId = new Map(allTemplates.map((t) => [t.id, t]));
  return pattern
    .filter((t) => t.defaultDayOfWeek)
    .map((t) => {
      const swap = phaseId ? swaps.find((s) => s.from === t.id && s.phases.includes(phaseId)) : undefined;
      const template = (swap && byId.get(swap.to)) || t;
      return { template, dayOfWeek: t.defaultDayOfWeek as number };
    });
}

// For an already planned session: which template it should be in the
// phase its week now falls in. Used when the goal date (and with it the
// phases) moves, so a planned long run becomes a hike or back.
// `level`: who may touch the session (weekValidator.ts#lockLevel). Only the
// system's own (3) follows the phase; yours, a test or race and history
// stay what they are. Without it (a new pattern week), always the phase.
export function templateForPhase(templateId: string, swaps: PatternSwap[], phaseId: string | undefined, level?: 0 | 1 | 2 | 3): string {
  if (!phaseId || (level !== undefined && level < 3)) return templateId;
  const forward = swaps.find((s) => s.from === templateId && s.phases.includes(phaseId));
  if (forward) return forward.to;
  // A hike in a week that no longer asks for one (goal moved, or the user
  // chose to keep the long run) goes back to the original session.
  const back = PATTERN_SWAPS.find((s) => s.to === templateId) ?? (isWavePhase(phaseId) ? CALM_SWAPS.find((s) => s.to === templateId) : undefined);
  if (back && !swaps.some((s) => s.to === templateId && s.phases.includes(phaseId))) return back.from;
  return templateId;
}

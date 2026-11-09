// ASCEND: de tekst voor Strava bij een gedane training, om zelf te plakken
// (docs/beslissingen/2026-11-09-strava-tekst-soort-training.md, vervangt de tekst
// uit docs/beslissingen/2026-10-24-namen-en-strava-tekst.md).
//
// Strava toont afstand, tijd en tempo al. Deze tekst zegt wat voor training het
// was: een titel en hooguit één regel waarom.
//
//   Heuvelintervallen · 6 × 90 s
//   Week 3 van de basis, richting GR5
//
// Daaronder een lege regel voor je eigen tekst. Nooit afstand, totale tijd of
// tempo. Het aantal herhalingen is wat er gedaan is (SessionLog.workout) of
// anders wat de progressie van die week vraagt, via dezelfde buildWorkoutPlan
// als de workout naar het horloge. De regel waarom staat er alleen bij een
// training uit je planning. Puur: geen React, geen opslag.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { isLightWeekOf, phaseWaveLength, PHASE_TAPER, type Program } from '../models/program';
import type { GoalMilestone, TrainingGoal } from '../models/goals';
import { formatNumberNL } from '../utils/number';
import { resolveProgramWeek } from '../utils/dates';
import { buildWorkoutPlan, type PlanStep } from './workoutPlan';
import { PHASE_BASIS, PHASE_BERG, PHASE_EXPEDITIE, PHASE_GOLF, PHASE_GOLF_START, PHASE_ONDERHOUD, PHASE_OPBOUW, progressionTarget } from './programLayout';
import { logSport, SPORT_LABEL } from './sports';
import { mainGoal } from './mainGoal';
import { kgLabel } from '../utils/kg';

export interface ActivityTextInput {
  log: SessionLog;
  // De training erachter; zonder dat heet hij naar zijn sport, of "Training".
  template?: SessionTemplate;
  // De geplande training, voor de week waarin de herhalingen vallen en de regel waarom.
  planned?: PlannedSession;
  program?: Program | null;
  // De korte naam van je hoofddoel (stravaGoalName), voor "richting GR5".
  goalName?: string;
}

// De tekst voor Strava: een titel en hooguit één regel waarom.
export interface StravaText {
  title: string;
  line?: string;
}

// Wat erin staat (AppSettings.stravaTextParts): alleen de titel, of de titel en de regel.
export type StravaTextParts = 'title' | 'title-line';
export const DEFAULT_STRAVA_TEXT_PARTS: StravaTextParts = 'title-line';
export function resolveStravaTextParts(raw: unknown): StravaTextParts {
  return raw === 'title' ? 'title' : DEFAULT_STRAVA_TEXT_PARTS;
}

// "20 s", "1 min", "90 s", "2 min 30 s": de lengte van één herhaling.
export function spanText(seconds: number): string {
  const total = Math.max(1, Math.round(seconds));
  if (total % 60 === 0) return `${total / 60} min`;
  if (total < 120) return `${total} s`;
  return `${Math.floor(total / 60)} min ${total % 60} s`;
}

// "52 min", "75 min", "2 u 30 min", "3 u".
export function minutesText(minutes: number): string {
  const total = Math.max(1, Math.round(minutes));
  if (total < 120) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} u ${m} min` : `${h} u`;
}

const stepOf = (steps: PlanStep[] | undefined, kind: PlanStep['kind']): PlanStep | undefined => steps?.find((s) => s.kind === kind);

const lowerFirst = (text: string): string => text.charAt(0).toLowerCase() + text.slice(1);

// Rustige, doorlopende trainingen: de zone of het gevoel staat voorop.
const STEADY_TITLE: Record<string, string> = {
  tpl_easy_run: 'Zone 2 · rustige duurloop',
  tpl_hill_easy: 'Zone 2 · rustige heuvelloop',
  tpl_recovery_run: 'Herstelloop · heel rustig',
  tpl_herstel: 'Herstelwandeling · rustig',
};

// Trainingen met een rugzak: het gewicht hoort in de titel.
const PACK_IDS = new Set(['tpl_ruck_walk', 'tpl_mountain_hike', 'tpl_hike_day_one']);

// Onder deze stijging zegt "hoogtemeters" niets over de training.
const MIN_CLIMB_M = 50;

// De gemeten stijging op tientallen, of niets: een schatting (loopband) telt niet.
function climbText(log: SessionLog): string | undefined {
  const metric = log.outdoorData ?? log.cardioData;
  const gain = metric?.elevationGainM;
  if (!gain || metric?.estimatedElevation) return undefined;
  const rounded = Math.round(gain / 10) * 10;
  return rounded >= MIN_CLIMB_M ? `${formatNumberNL(rounded, 0)} hoogtemeters` : undefined;
}

// De titel: het soort training, met één kenmerk erachter als dat er is.
function titleOf(input: ActivityTextInput): string {
  const { log, template, planned, program } = input;
  // Een losse activiteit zonder template heet naar zijn sport ("Hardlopen").
  const sport = logSport(log);
  const name = template?.name ?? (sport ? SPORT_LABEL[sport] : 'Training');
  const id = template?.id ?? log.templateId;
  const date = planned?.scheduledDate ?? log.completedDate;
  const plan = template ? buildWorkoutPlan(template, date, program) : undefined;
  const repeat = plan?.items.find((i): i is { repeat: number; steps: PlanStep[] } => 'repeat' in i);
  // Het plan van de week zegt alleen iets als de log bij een geplande training hoort;
  // bij een losse of ingekorte training noemt de tekst geen herhalingen die misschien
  // niet gedaan zijn.
  const inPlan = planned !== undefined && log.variant === 'full';
  const reps = log.workout?.reps ?? (inPlan ? repeat?.repeat : undefined);
  const workSec = log.workout?.repSeconds ?? (inPlan ? stepOf(repeat?.steps, 'work')?.seconds : undefined);
  const climb = climbText(log);

  if (template && STEADY_TITLE[id]) return STEADY_TITLE[id];

  switch (template ? id : undefined) {
    case 'tpl_hills_descent':
      return reps ? `${name} · ${reps} × op en af` : name;
    case 'tpl_hill_intervals':
    case 'tpl_intervals':
    case 'tpl_fartlek':
    case 'tpl_tempo_run':
    case 'tpl_strides_run':
      return reps && workSec ? `${name} · ${reps} × ${spanText(workSec)}` : name;
    case 'tpl_progression_run': {
      const block = log.workout?.blockMinutes ?? (reps ? reps * 5 : undefined);
      return block ? `${name} · laatste ${block} min stevig` : name;
    }
    case 'tpl_long_run':
      return `${name} · ${climb ?? 'zone 2'}`;
    case 'tpl_bergconditie':
      return climb ? `${name} · ${climb}` : name;
    default:
      break;
  }

  if (template && PACK_IDS.has(id)) {
    const kg = log.outdoorData?.backpackWeightKg
      ?? (inPlan ? progressionTarget(template, program ?? undefined, date)?.step.backpackKg : undefined)
      ?? (inPlan ? template.outdoorTarget?.backpackWeightKg : undefined);
    return [name, climb, kg ? `rugzak ${kgLabel(kg)}` : undefined].filter(Boolean).join(' · ');
  }

  if (template?.type === 'strength') return `Kracht · ${lowerFirst(name)}`;
  if (!template && log.type === 'strength') return 'Kracht';
  return name;
}

// Hoe een fase in de regel heet: "Week 3 van de basis".
const PHASE_WORD: Record<string, string> = {
  [PHASE_BASIS]: 'de basis',
  [PHASE_OPBOUW]: 'de opbouw',
  [PHASE_BERG]: 'bergcapaciteit',
  [PHASE_EXPEDITIE]: 'expeditieklaar',
  [PHASE_GOLF_START]: 'rustig beginnen',
  [PHASE_GOLF]: 'de golf',
};

// De regel waarom: waar deze training in je planning staat en waar je heen werkt.
// Alleen bij een training uit je planning; een losse activiteit heeft geen regel.
function lineOf(input: ActivityTextInput): string | undefined {
  const { planned, program, goalName } = input;
  if (!planned || !program) return undefined;
  const position = resolveProgramWeek(program, planned.scheduledDate);
  if (!position) return undefined;
  const { phase } = position;
  const toward = goalName ? `, richting ${goalName}` : '';
  if (phase.id === PHASE_ONDERHOUD) return `Onderhoud${toward}`;
  if (phase.id === PHASE_TAPER) return `Week ${position.weekInPhase} naar de start${toward}`;
  const word = PHASE_WORD[phase.id] ?? phase.name.toLowerCase();
  // In een golf telt de week binnen de golf, niet binnen de hele fase.
  const week = phase.id === PHASE_GOLF ? ((position.weekInPhase - 1) % phaseWaveLength(phase)) + 1 : position.weekInPhase;
  // De beginnersstart is vier makkelijke weken: daar heet geen week rustweek.
  if (phase.id !== PHASE_GOLF_START && isLightWeekOf(phase, position.weekInPhase) && !position.restSkipped) return `Rustweek van ${word}${toward}`;
  return `Week ${week} van ${word}${toward}`;
}

const MAX_GOAL_NAME = 32;

// De naam van je hoofddoel zoals hij in de regel staat: "GR5 / ALPENKLAAR" wordt "GR5".
export function stravaGoalName(goals: readonly TrainingGoal[], milestones: readonly GoalMilestone[]): string | undefined {
  const name = mainGoal(goals, milestones)?.name.replace(/\s+/g, ' ').split(' / ')[0].trim();
  // Een heel lange naam maakt de regel te lang: dan staat er geen doel in.
  return name && name.length <= MAX_GOAL_NAME ? name : undefined;
}

export function stravaText(input: ActivityTextInput): StravaText {
  const line = lineOf(input);
  return line ? { title: titleOf(input), line } : { title: titleOf(input) };
}

// Wat er op het klembord komt. Alleen de titel: precies de titel, voor het titelveld
// van Strava. Titel en regel: daaronder een lege regel voor je eigen tekst.
export function stravaCopyText(text: StravaText, parts: StravaTextParts): string {
  if (parts === 'title') return text.title;
  return `${[text.title, text.line].filter(Boolean).join('\n')}\n`;
}

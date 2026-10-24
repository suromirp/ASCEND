// ASCEND: een korte, nette beschrijving van een gedane training, om zelf in
// Strava te plakken (docs/beslissingen/2026-10-24-namen-en-strava-tekst.md).
//
// Strava geeft een activiteit altijd een eigen naam ("Middagloop") en ASCEND
// kan er niet naar schrijven (dat vraagt een server). De eigenaar schrijft dus
// zelf een stukje in Strava; dit is dat stukje, klaargezet. Eén of twee regels,
// geen opsomming van alle stappen:
//
//   Heuvelsprints en afdalen: 4× hard bergop, 4× rustig op en beheerst af.
//   7,2 km · 52 min · 140 m stijgen
//
// Het aantal herhalingen is wat er gedaan is (SessionLog.workout) of anders wat
// de progressie van die week vraagt, via dezelfde buildWorkoutPlan als de
// workout naar het horloge. De getallen onder de eerste regel zijn de gemeten
// getallen van de log; wat er niet is, blijft weg, en wat de eerste regel al
// zegt staat er niet nog een keer. Puur: geen React, geen opslag.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import { formatNumberNL } from '../utils/number';
import { buildWorkoutPlan, type PlanStep } from './workoutPlan';
import { progressionTarget } from './programLayout';
import { isWorkSet } from './workSets';
import { logSport, SPORT_LABEL } from './sports';

export interface ActivityTextInput {
  log: SessionLog;
  // De training erachter; zonder dat staat er "Training".
  template?: SessionTemplate;
  // De geplande training, voor de week waarin de herhalingen vallen.
  planned?: PlannedSession;
  program?: Program | null;
}

interface Used { distance?: true; duration?: true }
interface Described { line: string; used: Used }

// "20 sec", "1 min", "90 sec", "2 min 30 sec".
export function spanText(seconds: number): string {
  const total = Math.max(1, Math.round(seconds));
  if (total < 120) return total === 60 ? '1 min' : `${total} sec`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return s ? `${m} min ${s} sec` : `${m} min`;
}

// "52 min", "75 min", "2 u 30 min", "3 u".
export function minutesText(minutes: number): string {
  const total = Math.max(1, Math.round(minutes));
  if (total < 120) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} u ${m} min` : `${h} u`;
}

const kmText = (km: number): string => `${formatNumberNL(km, 1)} km`;

const stepOf = (steps: PlanStep[] | undefined, kind: PlanStep['kind']): PlanStep | undefined => steps?.find((s) => s.kind === kind);

// Hoe rustig een gewone, doorlopende training was.
const STEADY_WORD: Record<string, string> = {
  tpl_easy_run: 'rustig',
  tpl_long_run: 'rustig',
  tpl_recovery_run: 'heel rustig',
  tpl_herstel: 'rustig',
};

// Trainingen met een rugzak: het gewicht hoort in de zin.
const PACK_IDS = new Set(['tpl_ruck_walk', 'tpl_mountain_hike', 'tpl_hike_day_one']);

function describe(input: ActivityTextInput, name: string): Described {
  const { log, template, planned, program } = input;
  const metric = log.outdoorData ?? log.cardioData;
  const id = template?.id ?? log.templateId;
  const minutes = log.durationMinutes;
  // Zonder gemeten duur noemt de zin geen minuten (nooit "1 min" voor een lege duur).
  const timed = minutes > 0;
  const date = planned?.scheduledDate ?? log.completedDate;
  const plan = template ? buildWorkoutPlan(template, date, program) : undefined;
  const repeat = plan?.items.find((i): i is { repeat: number; steps: PlanStep[] } => 'repeat' in i);
  // Het plan van de week zegt alleen iets als de log bij een geplande training hoort;
  // bij een losse of ingekorte training noemt de tekst geen herhalingen die misschien
  // niet gedaan zijn.
  const planned_ = planned !== undefined;
  const reps = log.workout?.reps ?? (planned_ ? repeat?.repeat : undefined);
  const work = stepOf(repeat?.steps, 'work');
  const recover = planned_ ? stepOf(repeat?.steps, 'recover') : undefined;
  const workSec = log.workout?.repSeconds ?? (planned_ ? work?.seconds : undefined);
  const rest = recover ? `, ${spanText(recover.seconds)} rustig` : '';
  const none: Used = {};

  switch (id) {
    case 'tpl_hills_descent':
      if (reps) return { line: `${name}: ${reps}× hard bergop, ${reps}× rustig op en beheerst af.`, used: none };
      break;
    case 'tpl_hill_intervals':
      if (reps && workSec) return { line: `${name}: ${reps}× ${spanText(workSec)} hard bergop.`, used: none };
      break;
    case 'tpl_intervals':
    case 'tpl_fartlek':
      if (reps && workSec) return { line: `${name}: ${reps}× ${spanText(workSec)} hard${rest}.`, used: none };
      break;
    case 'tpl_tempo_run':
      if (reps && workSec) return { line: `${name}: ${reps}× ${spanText(workSec)} stevig${rest}.`, used: none };
      break;
    case 'tpl_strides_run':
      if (reps && workSec && timed) return { line: `${name}: ${minutesText(minutes)} rustig met ${reps}× ${spanText(workSec)} versnellen.`, used: { duration: true } };
      if (reps && workSec) return { line: `${name}: ${reps}× ${spanText(workSec)} versnellen.`, used: none };
      break;
    case 'tpl_progression_run': {
      const block = log.workout?.blockMinutes ?? (reps ? reps * 5 : undefined);
      if (block && block < minutes) return { line: `${name}: ${minutesText(minutes)} rustig, de laatste ${block} min stevig.`, used: { duration: true } };
      break;
    }
    case 'tpl_test_run':
    case 'tpl_race':
      return { line: `${name}.`, used: none };
    case 'tpl_bergconditie':
      return timed ? { line: `${name}: ${minutesText(minutes)}.`, used: { duration: true } } : { line: `${name}.`, used: none };
    default:
      break;
  }

  if (PACK_IDS.has(id)) {
    const kg = log.outdoorData?.backpackWeightKg
      ?? (template && planned_ ? progressionTarget(template, program ?? undefined, date)?.step.backpackKg : undefined)
      ?? (planned_ ? template?.outdoorTarget?.backpackWeightKg : undefined);
    const withKg = kg ? ` met ${formatNumberNL(kg, 1)} kg` : '';
    if (metric?.distanceKm && metric.distanceKm > 0) return { line: `${name}: ${kmText(metric.distanceKm)}${withKg}.`, used: { distance: true } };
    if (timed) return { line: `${name}: ${minutesText(minutes)}${withKg}.`, used: { duration: true } };
    return { line: `${name}${withKg}.`, used: none };
  }

  if (STEADY_WORD[id] && timed) return { line: `${name}: ${minutesText(minutes)} ${STEADY_WORD[id]}.`, used: { duration: true } };

  if (log.type === 'strength' || template?.type === 'strength') {
    const done = (log.strengthData ?? []).map((e) => e.sets.filter(isWorkSet).length).filter((n) => n > 0);
    if (done.length > 0) {
      const sets = done.reduce((a, b) => a + b, 0);
      return { line: `${name}: ${done.length} ${done.length === 1 ? 'oefening' : 'oefeningen'}, ${sets} ${sets === 1 ? 'set' : 'sets'}.`, used: none };
    }
  }
  return { line: `${name}.`, used: none };
}

// Eén of twee regels. Altijd een eerste regel; de tweede alleen als er gemeten
// getallen zijn die de eerste nog niet noemt.
export function activityText(input: ActivityTextInput): string {
  const { log, template } = input;
  // Een losse activiteit zonder template heet naar zijn sport ("Hardlopen").
  const sport = logSport(log);
  const name = template?.name ?? (sport ? SPORT_LABEL[sport] : 'Training');
  const { line, used } = describe(input, name);
  const metric = log.outdoorData ?? log.cardioData;
  const facts: string[] = [];
  if (!used.distance && metric?.distanceKm && metric.distanceKm > 0) facts.push(kmText(metric.distanceKm));
  if (!used.duration && log.durationMinutes > 0) facts.push(minutesText(log.durationMinutes));
  if (metric?.elevationGainM && metric.elevationGainM >= 1 && !metric.estimatedElevation) facts.push(`${formatNumberNL(metric.elevationGainM, 0)} m stijgen`);
  return facts.length ? `${line}\n${facts.join(' · ')}` : line;
}

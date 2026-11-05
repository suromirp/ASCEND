// ASCEND: de spierindex in zijn kleinste vorm (docs/beslissingen/2026-11-02-spierindex-klein.md, onderzoek
// docs/onderzoek/Spierindex opzet.md, keuzes in docs/beslissingen/2026-11-02-forge-herinrichting.md).
//
// Bij een bergdoel kijkt ASCEND naar drie spieren die een bergwandelaar met rugzak nodig heeft en die een gewoon
// krachtschema vaak overslaat: kuiten, tibialis (de voorkant van je scheen) en bilspieren. Krijgt een ervan de
// laatste vier weken gemiddeld minder dan 4 harde sets per week (engine/muscleVolume.ts, sets via isWorkSet, een
// rustweek telt niet mee), dan staat er één rustige melding in de weekterugblik met een voorstel om één oefening
// toe te voegen; pas na Akkoord verandert er iets. In Forge zet Ruilen bij gelijke keuze een oefening voorop die
// zo'n spier bedient (forgeWorkout.ts#swapOptions). Geen score, geen kleur per spier, geen heatmap.
// Puur: geen React, geen opslag.

import { EXERCISES, exerciseById } from '../data/exercises';
import type { Exercise, MuscleGroup } from '../models/exercise';
import type { GoalKindId, TrainingGoal } from '../models/goals';
import type { Program } from '../models/program';
import type { ExercisePrescription, SessionLog, SessionTemplate } from '../models/training';
import { addDays, mondayOfWeek } from '../utils/dates';
import { formatNumberNL } from '../utils/number';
import { addedPrescription } from './addedExercises';
import { goalKindOf } from './goalLabels';
import { mainGoal, type Ladder } from './mainGoal';
import { muscleVolumeByWeek } from './muscleVolume';
import { exerciseKey } from './strengthHistory';
import type { GymProfile } from './strengthSettings';
import { hasRole } from './templateRoles';
import { isRestWeekAt } from './weekLoadChange';

export const MOUNTAIN_MUSCLES: readonly MuscleGroup[] = ['calves', 'tibialis', 'glutes'];
// Onder dit gemiddelde per week is het te weinig om op peil te blijven (afgeleid, nog te ijken).
export const MOUNTAIN_FLOOR_SETS = 4;
export const MOUNTAIN_WINDOW_WEEKS = 4;
// Na "Liever niet" blijft het voor die spier zo lang stil.
export const DECLINE_QUIET_WEEKS = 8;

const MOUNTAIN_KINDS: ReadonlySet<GoalKindId> = new Set(['trek_hut', 'trek_tent', 'day_hike', 'mountaineering']);

// Hoe de spier in een zin heet.
const NAMED: Record<string, { your: string; got: string; work: string; why: string }> = {
  calves: { your: 'je kuiten', got: 'kregen', work: 'kuitwerk', why: 'bergop en bergaf met een rugzak' },
  tibialis: { your: 'je scheenspier', got: 'kreeg', work: 'werk voor je scheenspier', why: 'lange afdalingen' },
  glutes: { your: 'je bilspieren', got: 'kregen', work: 'werk voor je bilspieren', why: 'klimmen met een rugzak' },
};

// Een bergdoel: het hoofddoel is een tocht, een bergtocht of mountaineering (een hoofddoel zonder soort is de
// oude tocht), of er is een ander actief doel van die soort.
export function hasMountainGoal(goals: readonly TrainingGoal[], milestones: Ladder): boolean {
  const main = mainGoal(goals, milestones, 'active');
  if (main) {
    const kind = goalKindOf(main);
    if (kind === undefined || MOUNTAIN_KINDS.has(kind)) return true;
  }
  return goals.some((g) => g.status === 'active' && !!g.kind && MOUNTAIN_KINDS.has(g.kind));
}

export interface MuscleShort {
  muscle: MuscleGroup;
  // Gemiddeld aantal harde sets per week over de weken die meetellen.
  avgSets: number;
  // Hoeveel weken meetelden (een rustweek en weken voor het programma niet).
  weeks: number;
  // Of er een rustweek uit het venster viel.
  restLeftOut: boolean;
  // Harde sets van oefeningen die ASCEND niet kent, in die weken: ze tellen nergens mee.
  unknownSets: number;
}

// De bergspieren onder de ondergrens, de laagste eerst, over de vier weken die eindigen met `lastWeekStart`.
// Leeg bij minder dan twee weken die meetellen of als er in die weken helemaal geen krachtwerk was.
export function mountainMusclesShort(logs: readonly SessionLog[], lastWeekStart: string, program?: Program | null): MuscleShort[] {
  const last = mondayOfWeek(lastWeekStart);
  const start = program ? mondayOfWeek(program.startDate) : undefined;
  const inProgram = Array.from({ length: MOUNTAIN_WINDOW_WEEKS }, (_, k) => addDays(last, -7 * k)).filter((w) => start === undefined || w >= start);
  const weeks = inProgram.filter((w) => !(program && isRestWeekAt(program, w)));
  const restLeftOut = weeks.length < inProgram.length;
  if (weeks.length < 2) return [];
  const byWeek = new Map(muscleVolumeByWeek(logs as SessionLog[]).map((v) => [v.weekStart, v]));
  const counted = weeks.map((w) => byWeek.get(w)).filter((v) => !!v);
  const anything = counted.some((v) => v.unknownSets > 0 || Object.values(v.sets).some((n) => n > 0));
  if (!anything) return [];
  const unknownSets = counted.reduce((n, v) => n + v.unknownSets, 0);
  return MOUNTAIN_MUSCLES
    .map((muscle) => ({ muscle, avgSets: counted.reduce((n, v) => n + v.sets[muscle], 0) / weeks.length, weeks: weeks.length, restLeftOut, unknownSets }))
    .filter((m) => m.avgSets < MOUNTAIN_FLOOR_SETS)
    .sort((a, b) => a.avgSets - b.avgSets || MOUNTAIN_MUSCLES.indexOf(a.muscle) - MOUNTAIN_MUSCLES.indexOf(b.muscle));
}

// De spieren die Ruilen in Forge voorrang geeft: alleen bij een bergdoel en met de instelling aan.
export function swapPreference(input: { on: boolean; goals: readonly TrainingGoal[]; milestones: Ladder; logs: readonly SessionLog[]; today: string; program?: Program | null }): MuscleGroup[] {
  if (!input.on || !hasMountainGoal(input.goals, input.milestones)) return [];
  // De vier hele weken voor deze week: de lopende week is nog niet af.
  return mountainMusclesShort(input.logs, addDays(mondayOfWeek(input.today), -7), input.program).map((m) => m.muscle);
}

// De korte reden bij een keuze in het ruilblad die zo'n spier bedient.
export function swapReason(exercise: Exercise, prefer: readonly MuscleGroup[]): string | undefined {
  const muscle = prefer.find((m) => exercise.primary.includes(m) || exercise.secondary.includes(m));
  return muscle ? `Ook voor ${NAMED[muscle].your}, die ${NAMED[muscle].got} weinig de laatste vier weken.` : undefined;
}

export interface MuscleDecline {
  muscle: MuscleGroup;
  weekStart: string;
}

export interface MuscleProposal extends MuscleShort {
  templateId: string;
  templateName: string;
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: string;
}

export interface MuscleProposalInput {
  on: boolean;
  weekStart: string;
  // Vandaag: de stilte na "Liever niet" telt vanaf de week waarin je het zei tot nu, ook bij een oude terugblik.
  today: string;
  // Of er in die training nog plek is voor een toevoeging (engine/addedExercises.ts#canAddExercise). Geen plek:
  // geen voorstel, want Akkoord zou niets doen.
  canAdd?: (templateId: string) => boolean;
  logs: readonly SessionLog[];
  program?: Program | null;
  goals: readonly TrainingGoal[];
  milestones: Ladder;
  templates: readonly SessionTemplate[];
  // De oefeningen van een training zoals Forge ze nu zou plannen (met een programma uit MacroFactor en wat je
  // al toevoegde).
  exercisesOf: (template: SessionTemplate) => ExercisePrescription[];
  profile: Pick<GymProfile, 'barsKg'>;
  declined?: readonly MuscleDecline[];
}

const RESISTANCE_ORDER = ['bodyweight', 'dumbbell', 'pack_or_vest', 'cable', 'machine_stack', 'machine_plates', 'barbell'];

function idsIn(slots: ExercisePrescription[]): Set<string> {
  return new Set(slots.map((s) => exerciseKey(s.id, s.exerciseName).exercise?.id).filter((id): id is string => !!id));
}

// De ene melding van de weekterugblik, of null. Geen melding als de training waar hij in zou komen zo'n spier al
// als hoofdspier heeft (dan ontbreekt hij niet in het plan), als er geen krachttraining is om hem aan toe te
// voegen, of als je de laatste weken "Liever niet" zei voor die spier.
export function mountainMuscleProposal(input: MuscleProposalInput): MuscleProposal | null {
  if (!input.on || !hasMountainGoal(input.goals, input.milestones)) return null;
  const strength = input.templates.filter((t) => t.type === 'strength' || hasRole(t, 'strength'));
  if (strength.length === 0) return null;
  const legWork = (t: SessionTemplate) => [...idsIn(input.exercisesOf(t))].filter((id) => exerciseById(id)?.loadsLegs).length;
  const target = [...strength].sort((a, b) => legWork(b) - legWork(a) || a.name.localeCompare(b.name))[0];
  const inTarget = idsIn(input.exercisesOf(target));
  const inPlan = new Set(strength.flatMap((t) => [...idsIn(input.exercisesOf(t))]));
  if (input.canAdd && !input.canAdd(target.id)) return null;
  const now = mondayOfWeek(input.today);
  const quiet = (m: MuscleGroup) => (input.declined ?? []).some((d) => d.muscle === m && d.weekStart <= now && addDays(d.weekStart, 7 * DECLINE_QUIET_WEEKS) > now);
  for (const short of mountainMusclesShort(input.logs, input.weekStart, input.program)) {
    if (quiet(short.muscle)) continue;
    if ([...inPlan].some((id) => exerciseById(id)?.primary.includes(short.muscle))) continue;
    const pick = EXERCISES
      .filter((e) => e.primary.includes(short.muscle) && !inTarget.has(e.id) && (e.resistance !== 'barbell' || input.profile.barsKg.length > 0))
      .sort((a, b) => a.primary.length - b.primary.length || RESISTANCE_ORDER.indexOf(a.resistance) - RESISTANCE_ORDER.indexOf(b.resistance) || a.name.localeCompare(b.name))[0];
    if (!pick) continue;
    return { ...short, templateId: target.id, templateName: target.name, exerciseId: pick.id, exerciseName: pick.name, ...addedPrescription(pick) };
  }
  return null;
}

const setsWord = (n: number) => (n === 1 ? 'harde set' : 'harde sets');

// De woorden van de melding: eerst het feit, dan de zorg ("kan helpen"), eerlijk over wat niet telde, en het voorstel.
export function muscleNoticeText(p: MuscleProposal): { fact: string; care: string; unknown?: string; proposal: string } {
  const avg = Math.round(p.avgSets * 10) / 10;
  const span = p.restLeftOut ? `de laatste ${p.weeks === 3 ? 'drie' : p.weeks} weken zonder de rustweek` : p.weeks === MOUNTAIN_WINDOW_WEEKS ? 'de laatste vier weken' : `de laatste ${p.weeks === 3 ? 'drie' : p.weeks} weken`;
  const named = NAMED[p.muscle];
  const unknown = Math.round(p.unknownSets);
  const [low, high] = p.reps.split('-');
  return {
    // Nul is geen gemiddelde: dan zeg je gewoon dat er niets was.
    fact: `${named.your.charAt(0).toUpperCase()}${named.your.slice(1)} ${named.got} ${span} ${avg === 0 ? 'geen harde sets' : `gemiddeld ${formatNumberNL(avg, avg % 1 === 0 ? 0 : 1)} ${setsWord(avg)} per week`}.`,
    care: `Voor ${named.why} kan ${named.work} helpen.`,
    unknown: unknown > 0 ? `${unknown} ${unknown === 1 ? 'set kon' : 'sets konden'} niet aan een oefening gekoppeld worden; die tellen hier niet mee.` : undefined,
    proposal: `Voorstel: ${p.exerciseName} erbij in ${p.templateName}, ${p.sets} sets van ${low}${high ? ` tot ${high}` : ''} herhalingen.`,
  };
}

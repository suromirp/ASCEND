// ASCEND: de spierindex in zijn kleinste vorm (docs/beslissingen/2026-11-02-spierindex-klein.md, onderzoek
// docs/onderzoek/Spierindex opzet.md, keuzes in docs/beslissingen/2026-11-02-forge-herinrichting.md).
//
// Bij een bergdoel kijkt ASCEND naar drie spieren die een bergwandelaar met rugzak nodig heeft en die een gewoon
// krachtschema vaak overslaat: kuiten, tibialis (de voorkant van je scheen) en bilspieren. Krijgt een ervan de
// laatste vier weken gemiddeld minder dan 4 harde sets per week (engine/muscleVolume.ts, sets via isWorkSet; een
// rustweek en een week met vakantie, een tocht of zonder sportschool tellen niet mee,
// docs/beslissingen/2026-11-14-bergspieren-zonder-vakantieweek.md), dan staat er één rustige melding in de weekterugblik met een voorstel om één oefening
// toe te voegen; pas na Akkoord verandert er iets. In Forge zet Ruilen bij gelijke keuze een oefening voorop die
// zo'n spier bedient (forgeWorkout.ts#swapOptions). Geen score, geen kleur per spier, geen heatmap.
//
// Enkel en evenwicht (docs/beslissingen/2026-11-11-enkel-evenwicht.md) is de vierde rij: geen spier maar
// evenwichtsoefeningen (patroon 'balance'; lunges en split squats tellen hier niet). Het telt werksets, geen harde
// sets, met een eigen ondergrens, en laat dezelfde weken weg als de spieren. Bij een open pijnklacht aan een
// enkel of voet zwijgt het. Het komt na de drie spieren: hoogstens één voorstel per keer, met dezelfde Akkoord.
// Puur: geen React, geen opslag.

import { EXERCISES, exerciseById } from '../data/exercises';
import type { Exercise, MuscleGroup } from '../models/exercise';
import type { GoalKindId, TrainingGoal } from '../models/goals';
import type { InjuryNote } from '../models/injury';
import type { LeavePeriod } from '../models/leave';
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
import { isOpenOn, isSoreness } from './injuryKind';
import { periodsInWeek } from './leave';
import { hasRole, isGymStrengthTemplate } from './templateRoles';
import { isRestWeekAt } from './weekLoadChange';
import { noticeExerciseName } from './exerciseNames';
import { isWorkSet } from './workSets';

export const MOUNTAIN_MUSCLES: readonly MuscleGroup[] = ['calves', 'tibialis', 'glutes'];
// De rijen van Spieren voor de berg: de drie spieren en enkel en evenwicht.
export type MountainArea = MuscleGroup | 'balance';
// Enkel en evenwicht: onder dit gemiddelde aantal werksets per week (eigen keuze: minder dan één korte ronde van
// twee sets per week; de studies trainden twee tot drie keer per week).
const BALANCE_FLOOR_SETS = 2;
// De eerste oefening van het voorstel: op één been staan met ogen open, de makkelijkste vorm. Zwaarder gaat via de
// uitleg (ogen dicht, kussen) of Ruilen binnen de familie.
const BALANCE_START = 'single-leg-stance';
// Een week met zo'n periode telt niet mee, voor de drie spieren en voor evenwicht: op vakantie, op tocht of zonder
// sportschool train je niet in Forge, en dan zou er na elke vakantie meteen een melding staan. Vrije dagen tellen wel.
const LEAVE_SKIP: ReadonlySet<LeavePeriod['kind']> = new Set(['no_training', 'trek', 'no_gym']);
// Een open pijnklacht aan een van deze plekken: geen voorstel voor evenwicht.
const BALANCE_INJURY_PARTS = ['enkel', 'voet'];
// Onder dit gemiddelde per week is het te weinig om op peil te blijven (afgeleid, nog te ijken).
const MOUNTAIN_FLOOR_SETS = 4;
const MOUNTAIN_WINDOW_WEEKS = 4;
// Na "Liever niet" blijft het voor die spier zo lang stil.
export const DECLINE_QUIET_WEEKS = 8;

export const MOUNTAIN_KINDS: ReadonlySet<GoalKindId> = new Set(['trek_hut', 'trek_tent', 'day_hike', 'mountaineering']);

// Hoe de spier in een zin heet.
const NAMED: Record<string, { your: string; got: string }> = {
  calves: { your: 'je kuiten', got: 'kregen' },
  tibialis: { your: 'je scheenspier', got: 'kreeg' },
  glutes: { your: 'je bilspieren', got: 'kregen' },
};

// Alleen het hoofddoel: een tocht, een bergtocht of mountaineering (zonder soort: de oude tocht).
export function mainGoalIsMountain(goals: readonly TrainingGoal[], milestones: Ladder): boolean {
  const main = mainGoal(goals, milestones, 'active');
  if (!main) return false;
  const kind = goalKindOf(main);
  return kind === undefined || MOUNTAIN_KINDS.has(kind);
}

// Een bergdoel: het hoofddoel is een tocht, een bergtocht of mountaineering (een hoofddoel zonder soort is de
// oude tocht), of er is een ander actief doel van die soort.
export function hasMountainGoal(goals: readonly TrainingGoal[], milestones: Ladder): boolean {
  if (mainGoalIsMountain(goals, milestones)) return true;
  return goals.some((g) => g.status === 'active' && !!g.kind && MOUNTAIN_KINDS.has(g.kind));
}

export interface MuscleShort {
  muscle: MountainArea;
  // Gemiddeld aantal harde sets per week over de weken die meetellen.
  avgSets: number;
  // Hoeveel weken meetelden (een rustweek, een week met vakantie, een tocht of zonder sportschool en weken voor het
  // programma niet).
  weeks: number;
  // Of er zo'n week uit het venster viel (een rustweek, vakantie, een tocht of zonder sportschool).
  restLeftOut: boolean;
  // Harde sets van oefeningen die ASCEND niet kent, in die weken: ze tellen nergens mee.
  unknownSets: number;
}

// De weken van het venster van vier die meetellen, eindigend met `lastWeekStart`: binnen het programma, geen
// rustweek en geen week met vakantie, een tocht of zonder sportschool. `leftOut`: of er zo'n week wegviel.
function countedWeeks(lastWeekStart: string, program?: Program | null, leave?: readonly LeavePeriod[]): { weeks: string[]; leftOut: boolean } {
  const last = mondayOfWeek(lastWeekStart);
  const start = program ? mondayOfWeek(program.startDate) : undefined;
  const inProgram = Array.from({ length: MOUNTAIN_WINDOW_WEEKS }, (_, k) => addDays(last, -7 * k)).filter((w) => start === undefined || w >= start);
  const away = (w: string) => periodsInWeek([...(leave ?? [])], w).some((p) => LEAVE_SKIP.has(p.kind));
  const weeks = inProgram.filter((w) => !(program && isRestWeekAt(program, w)) && !away(w));
  return { weeks, leftOut: weeks.length < inProgram.length };
}

// De bergspieren onder de ondergrens, de laagste eerst, over de vier weken die eindigen met `lastWeekStart`.
// Leeg bij minder dan twee weken die meetellen of als er in die weken helemaal geen krachtwerk was.
export function mountainMusclesShort(logs: readonly SessionLog[], lastWeekStart: string, program?: Program | null, leave?: readonly LeavePeriod[]): MuscleShort[] {
  const { weeks, leftOut: restLeftOut } = countedWeeks(lastWeekStart, program, leave);
  if (weeks.length < 2) return [];
  const byWeek = new Map(muscleVolumeByWeek(logs as SessionLog[]).map((v) => [v.weekStart, v]));
  const counted = weeks.map((w) => byWeek.get(w)).filter((v) => !!v);
  const anything = counted.some((v) => v.unknownSets > 0 || Object.values(v.sets).some((n) => n > 0));
  if (!anything) return [];
  const unknownSets = counted.reduce((n, v) => n + v.unknownSets, 0);
  return MOUNTAIN_MUSCLES
    .map((muscle) => ({ muscle, avgSets: counted.reduce((n, v) => n + v.sets[muscle], 0) / weeks.length, weeks: weeks.length, restLeftOut, unknownSets }))
    .filter((m) => m.avgSets < MOUNTAIN_FLOOR_SETS)
    .sort((a, b) => a.avgSets - b.avgSets || MOUNTAIN_MUSCLES.indexOf(a.muscle as MuscleGroup) - MOUNTAIN_MUSCLES.indexOf(b.muscle as MuscleGroup));
}

const isBalance = (e: Exercise | undefined): boolean => e?.pattern === 'balance';

// Werksets van evenwichtsoefeningen per week (maandag), en of er die week iets van kracht gelogd is.
function balanceSetsByWeek(logs: readonly SessionLog[]): Map<string, { sets: number; strength: boolean }> {
  const out = new Map<string, { sets: number; strength: boolean }>();
  for (const log of logs) {
    if (!log.strengthData || log.strengthData.length === 0) continue;
    const week = mondayOfWeek(log.completedDate);
    const row = out.get(week) ?? { sets: 0, strength: false };
    for (const entry of log.strengthData) {
      const work = (entry.sets ?? []).filter((set) => !!set && isWorkSet(set)).length;
      if (work === 0) continue;
      row.strength = true;
      if (isBalance(exerciseKey(entry.exerciseId, entry.exerciseName).exercise)) row.sets += work;
    }
    out.set(week, row);
  }
  return out;
}

// Enkel en evenwicht onder de ondergrens over de vier weken die eindigen met `lastWeekStart`, of null. Een rustweek
// en een week met vakantie, een tocht of zonder sportschool tellen niet mee; zonder krachtwerk in die weken, of met
// minder dan twee weken die meetellen, zwijgt het.
export function balanceShort(logs: readonly SessionLog[], lastWeekStart: string, program?: Program | null, leave?: readonly LeavePeriod[]): MuscleShort | null {
  const { weeks, leftOut } = countedWeeks(lastWeekStart, program, leave);
  if (weeks.length < 2) return null;
  const byWeek = balanceSetsByWeek(logs);
  if (!weeks.some((w) => byWeek.get(w)?.strength)) return null;
  const avgSets = weeks.reduce((n, w) => n + (byWeek.get(w)?.sets ?? 0), 0) / weeks.length;
  if (avgSets >= BALANCE_FLOOR_SETS) return null;
  return { muscle: 'balance', avgSets, weeks: weeks.length, restLeftOut: leftOut, unknownSets: 0 };
}

// Een open pijnklacht aan een enkel of voet (spierpijn en stijf tellen niet): dan geen evenwichtswerk voorstellen.
// Wiebelen op een pijnlijke enkel, zonder iemand erbij, laten we aan een fysiotherapeut.
export function ankleComplaintOpen(injuries: readonly InjuryNote[] | undefined, today: string): boolean {
  return (injuries ?? []).some((n) => !isSoreness(n) && isOpenOn(n, today) && n.date <= today && BALANCE_INJURY_PARTS.some((p) => new RegExp(`(^|[^a-z])${p}($|[^a-z])`).test(n.bodyPart.toLowerCase())));
}

// De spieren die Ruilen in Forge voorrang geeft: alleen bij een bergdoel en met de instelling aan.
export function swapPreference(input: { on: boolean; goals: readonly TrainingGoal[]; milestones: Ladder; logs: readonly SessionLog[]; today: string; program?: Program | null; leave?: readonly LeavePeriod[] }): MuscleGroup[] {
  if (!input.on || !hasMountainGoal(input.goals, input.milestones)) return [];
  // De vier hele weken voor deze week: de lopende week is nog niet af.
  return mountainMusclesShort(input.logs, addDays(mondayOfWeek(input.today), -7), input.program, input.leave).map((m) => m.muscle as MuscleGroup);
}

// De korte reden bij een keuze in het ruilblad die zo'n spier bedient.
export function swapReason(exercise: Exercise, prefer: readonly MuscleGroup[]): string | undefined {
  if (isBalance(exercise)) return undefined;
  const muscle = prefer.find((m) => exercise.primary.includes(m) || exercise.secondary.includes(m));
  return muscle ? `Ook voor ${NAMED[muscle].your}, die ${NAMED[muscle].got} weinig de laatste vier weken.` : undefined;
}

export interface MuscleDecline {
  muscle: MountainArea;
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
  // Enkel en evenwicht binnen Spieren voor de berg (StrengthSettings.mountainBalance). Ontbreekt het: aan, het advies.
  balance?: boolean;
  // Vakanties, tochten en periodes zonder sportschool: weken die voor geen rij meetellen.
  leave?: readonly LeavePeriod[];
  // Voor enkel en evenwicht: klachten uit Lichaam.
  injuries?: readonly InjuryNote[];
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
  const strength = input.templates.filter((t) => isGymStrengthTemplate(t) || hasRole(t, 'strength'));
  if (strength.length === 0) return null;
  const legWork = (t: SessionTemplate) => [...idsIn(input.exercisesOf(t))].filter((id) => exerciseById(id)?.loadsLegs).length;
  const target = [...strength].sort((a, b) => legWork(b) - legWork(a) || a.name.localeCompare(b.name))[0];
  const inTarget = idsIn(input.exercisesOf(target));
  const inPlan = new Set(strength.flatMap((t) => [...idsIn(input.exercisesOf(t))]));
  if (input.canAdd && !input.canAdd(target.id)) return null;
  const now = mondayOfWeek(input.today);
  const quiet = (m: MountainArea) => (input.declined ?? []).some((d) => d.muscle === m && d.weekStart <= now && addDays(d.weekStart, 7 * DECLINE_QUIET_WEEKS) > now);
  for (const short of mountainMusclesShort(input.logs, input.weekStart, input.program, input.leave)) {
    if (quiet(short.muscle)) continue;
    const muscle = short.muscle as MuscleGroup;
    if ([...inPlan].some((id) => { const e = exerciseById(id); return !!e && !isBalance(e) && e.primary.includes(muscle); })) continue;
    const pick = EXERCISES
      .filter((e) => e.primary.includes(muscle) && !isBalance(e) && !inTarget.has(e.id) && (e.resistance !== 'barbell' || input.profile.barsKg.length > 0))
      .sort((a, b) => a.primary.length - b.primary.length || RESISTANCE_ORDER.indexOf(a.resistance) - RESISTANCE_ORDER.indexOf(b.resistance) || a.name.localeCompare(b.name))[0];
    if (!pick) continue;
    return { ...short, templateId: target.id, templateName: target.name, exerciseId: pick.id, exerciseName: pick.name, ...addedPrescription(pick) };
  }
  // Pas als geen spier aan de beurt is: enkel en evenwicht.
  if (input.balance === false || quiet('balance') || ankleComplaintOpen(input.injuries, input.today)) return null;
  if ([...inPlan].some((id) => isBalance(exerciseById(id)))) return null;
  const short = balanceShort(input.logs, input.weekStart, input.program, input.leave);
  const pick = exerciseById(BALANCE_START);
  if (!short || !pick || inTarget.has(pick.id)) return null;
  return { ...short, templateId: target.id, templateName: target.name, exerciseId: pick.id, exerciseName: pick.name, ...addedPrescription(pick) };
}

// De week waarmee het voorstel rekent: de laatste hele week voor vandaag. Forge en de weekterugblik gebruiken
// dezelfde, zodat ze nooit een ander voorstel tonen (ook rond middernacht op de maandag).
export function muscleProposalWeek(today: string): string {
  return addDays(mondayOfWeek(today), -7);
}

// Het blad van een week toont het voorstel alleen voor deze of de vorige week; een oudere terugblik gaat over toen.
export function reviewShowsMuscleProposal(reviewWeekStart: string, today: string): boolean {
  return reviewWeekStart >= muscleProposalWeek(today);
}

const WEEKS_WORD: Record<number, string> = { 2: 'twee', 3: 'drie', 4: 'vier' };
const TIMES_WORD: Record<number, string> = { 1: 'Eén', 2: 'Twee', 3: 'Drie', 4: 'Vier', 5: 'Vijf' };

// Waarom, per rij: één zin met "kan helpen", nooit "voorkomt".
const WHY: Partial<Record<MountainArea, string>> = {
  calves: 'Sterkere kuiten kunnen helpen bij bergop en bergaf met een rugzak.',
  tibialis: 'Een sterkere scheenspier kan helpen bij lange afdalingen.',
  glutes: 'Sterkere bilspieren kunnen helpen bij klimmen met een rugzak.',
  balance: 'Evenwichtsoefeningen kunnen je enkels helpen op ongelijke paden en bij afdalen.',
};

export interface MuscleNoticeText {
  // De Nederlandse naam van de oefening (engine/exerciseNames.ts): de titel van het voorstel en de rij.
  name: string;
  // In welke training hij komt.
  where: string;
  // Wat je doet, in gewone woorden, met de dosis.
  how: string;
  // Waarom: het droge feit, dan wat het kan helpen.
  why: string;
  // Wat de telling minder zeker maakt (sets die aan geen oefening gekoppeld konden worden): op het scherm, ook in
  // Forge, nooit alleen achter de i.
  unknown?: string;
  // Als Forge de oefening anders noemt dan het voorstel: "In Forge heet hij Single Leg Stance."
  forgeName?: string;
  // Achter de i: wat telt en wat niet meetelde, voor deze rij, en wat Liever niet doet.
  info: string;
  // Wat er na Akkoord gebeurt.
  after: string;
  // Na Akkoord: dat hij er staat en waar (met de zin over de naam in Forge erachter).
  done: string;
}

// De woorden van het voorstel, in lagen: de oefening, wat je doet, waarom, en wat Akkoord doet. Forge
// (MountainMuscleNotice) en de weekterugblik gebruiken dezelfde woorden. De oefening heet hier bij haar Nederlandse
// naam; in Forge, logs en MacroFactor blijft de naam zoals hij is. Toegevoegde oefeningen komen achter de oefeningen
// van de training (engine/forgeSlots.ts#forgeSlotsFor), dus de nieuwste is de laatste.
export function muscleNoticeText(p: MuscleProposal): MuscleNoticeText {
  const avg = Math.round(p.avgSets * 10) / 10;
  const balance = p.muscle === 'balance';
  const span = `de laatste ${WEEKS_WORD[p.weeks] ?? p.weeks} weken`;
  const exercise = exerciseById(p.exerciseId);
  const name = noticeExerciseName(p.exerciseId, p.exerciseName);
  const [low, high] = p.reps.split('-');
  const times = TIMES_WORD[p.sets] ?? String(p.sets);
  // Geen duur in minuten: die kent de app niet, dus die staat er niet.
  let how: string;
  if (exercise?.measure === 'hold') {
    how = balance ? `Sta op één been tot je gaat wiebelen, dan op het andere been. ${times} keer per been.` : `${times} keer, zo lang je de houding goed houdt.`;
  } else {
    const line = exercise?.guide?.short[0];
    how = `${line ? `${line} ` : ''}${p.sets} sets van ${low}${high ? ` tot ${high}` : ''} herhalingen${exercise?.perSide ? ' per been' : ''}.`;
  }
  const many = (n: number) => `${formatNumberNL(n, n % 1 === 0 ? 0 : 1)} ${n === 1 ? 'set' : 'sets'}`;
  // Nul is geen gemiddelde: dan zeg je gewoon dat er niets was.
  const fact = balance
    ? (avg === 0 ? `Je deed ${span} geen evenwichtsoefening.` : `Je deed ${span} gemiddeld ${many(avg)} per week met een evenwichtsoefening.`)
    : (avg === 0 ? `Je deed ${span} geen sets voor ${NAMED[p.muscle].your}.` : `Je deed ${span} gemiddeld ${many(avg)} per week voor ${NAMED[p.muscle].your}.`);
  const fewer = p.restLeftOut ? `, daarom gaat het hier over ${WEEKS_WORD[p.weeks] ?? p.weeks} weken` : '';
  const unknown = Math.round(p.unknownSets);
  const info = [
    // Zoals engine/muscleVolume.ts telt: ook een set zonder ingevulde reserve, en een spier die alleen meehelpt half
    // (vandaar een gemiddelde als 1,5).
    balance ? 'Elke werkset van een evenwichtsoefening telt, opwarmen niet.' : 'Een set telt met hoogstens 4 herhalingen over, ook als je dat niet invulde. Helpt de spier alleen mee, dan half.',
    `Een rustweek en een week met vakantie, een tocht of zonder sportschool tellen niet mee${fewer}.`,
    `Na Liever niet blijft het acht weken stil over ${balance ? 'je evenwicht' : NAMED[p.muscle].your}.`,
  ].filter(Boolean).join(' ');
  const inForge = exercise?.name ?? p.exerciseName;
  const forgeName = inForge && inForge !== name ? `In Forge heet hij ${inForge}.` : undefined;
  return {
    name,
    ...(unknown > 0 ? { unknown: `${unknown} ${unknown === 1 ? 'set kon' : 'sets konden'} niet aan een oefening gekoppeld worden; die tellen hier niet mee.` } : {}),
    ...(forgeName ? { forgeName } : {}),
    where: `Erbij in ${p.templateName}`,
    how,
    why: `${fact} ${WHY[p.muscle] ?? ''}`.trim(),
    info,
    // De naam van de training staat achteraan: een naam met haakjes (Benen A (zwaar)) leest dan als een gewone zin.
    after: `Eerst een voorstel, pas na Akkoord verandert er iets. Daarna is hij vanaf je volgende keer de laatste oefening in ${p.templateName}. Weghalen kan in het blad van de oefening.`,
    done: `Vanaf je volgende keer is ${name} de laatste oefening in ${p.templateName}.${forgeName ? ` ${forgeName}` : ''}`,
  };
}

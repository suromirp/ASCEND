// ASCEND: van een paar antwoorden naar een doel (ronde 2c, "Doel toevoegen" op de Ascend-tab,
// docs/beslissingen/2026-10-26-ascend-tab-als-doelen.md). Drie stappen: de soort, een paar vragen,
// en dan het voorstel met Akkoord voor de planning. Dit bestand doet het middelste stuk: welke
// vragen een soort stelt (uit data/goalKinds.ts), welk label er voorgesteld wordt, en het doel dat
// uit de antwoorden volgt. Het slaat niets op: het doel gaat als voorstel door planHorizonChange.
//
// Puur: geen React, geen IndexedDB.

import type { GoalDetails, GoalKindId, GoalPriority, GoalRequirement, TrainingGoal } from '../models/goals';
import { GOAL_KINDS, type GoalInputSpec } from '../data/goalKinds';
import { goalDateProblem } from './goalDate';
import { requirementsFromDetails } from './goalReadiness';
import type { PictogramName } from '../components/pictograms';
import { MARATHON_GOAL_NAME } from './mainGoal';
import { goalDetailsOf, goalKindOf } from './goalLabels';

// De tegels van stap 1. Een tocht met hut of tent is één tegel met een vraag.
export type AddTileId = 'trek' | Exclude<GoalKindId, 'trek_hut' | 'trek_tent'>;

export interface AddTile {
  id: AddTileId;
  label: string;
  summary: string;
  picto: PictogramName;
}

const tile = (id: AddTileId, label: string, kind: GoalKindId, picto: PictogramName, summary?: string): AddTile => ({ id, label, summary: summary ?? GOAL_KINDS[kind].summary, picto });

export const ADD_TILES: readonly AddTile[] = [
  tile('trek', 'Trektocht', 'trek_hut', 'wandelen', 'Meerdere dagen onderweg met je rugzak, in hut of tent.'),
  tile('day_hike', 'Bergtocht', 'day_hike', 'bergtocht', 'Eén lange dag met flink wat klimmen.'),
  tile('mountaineering', 'Mountaineering', 'mountaineering', 'bergtocht', 'Toppen, gletsjer, vroege start.'),
  tile('run_race', 'Hardloopwedstrijd', 'run_race', 'lopen', 'Van 5 km tot marathon, op een vaste dag.'),
  tile('trail', 'Trailrun', 'trail', 'lopen', 'Hardlopen met hoogtemeters.'),
  tile('bike', 'Fietstocht of wedstrijd', 'bike', 'fietsen', 'Rit, col of meerdere dagen.'),
  tile('triathlon', 'Triathlon', 'triathlon', 'lopen', 'Zwemmen, fietsen en lopen.'),
  tile('stronger', 'Sterker worden', 'stronger', 'kracht', 'Meer kracht op je hoofdoefeningen.'),
  tile('fit', 'Fit blijven', 'fit', 'lichaam', 'Gewoon fit blijven, zonder datum, met de beweegrichtlijn als maat.'),
];

export const RACE_KM: Record<string, number> = { '5k': 5, '10k': 10, half: 21.1, marathon: 42.2 };

// Wat een nieuw doel van deze tegel al ingevuld heeft: een tocht slaapt standaard in hutten.
export function defaultDetails(id: AddTileId): GoalDetails {
  return id === 'trek' ? { shelter: 'hut' } : {};
}

export function kindOfTile(id: AddTileId, details?: GoalDetails): GoalKindId {
  return id === 'trek' ? (details?.shelter === 'tent' ? 'trek_tent' : 'trek_hut') : id;
}

// Een vraag van stap 2.
export interface Question extends GoalInputSpec {
  choices?: { value: string; label: string }[];
  // De vraag hoort alleen bij sommige antwoorden (de eigen afstand bij "Eigen").
  showIf?: (details: GoalDetails) => boolean;
}

// Wat een soort niet vraagt in dit blad: de afstand als de keuze hem al zegt, het hoogste punt, de
// bagage en de krachtdoelen per oefening (die staan bij Sterker worden in Forge en Instellingen).
const SKIP = new Set<keyof GoalDetails>(['highestPointM', 'sleepingPointM', 'baggageKg', 'strengthTargets']);
const MAX_QUESTIONS = 6;

export function questionsFor(id: AddTileId): Question[] {
  const def = GOAL_KINDS[kindOfTile(id)];
  const out: Question[] = [];
  for (const spec of def.inputs) {
    if (SKIP.has(spec.key)) continue;
    // De afstand van een hardloopwedstrijd volgt uit de keuze (5, 10, 21,1 of 42,2 km); alleen bij
    // "Eigen" typ je hem zelf.
    if (id === 'run_race' && spec.key === 'distanceKm') {
      out.push({ ...spec, required: true, showIf: (d) => d.variant === 'eigen' });
      continue;
    }
    // De duur van een tocht volgt uit het aantal dagen: geen aparte keuze.
    if (id === 'trek' && spec.key === 'variant') continue;
    if (spec.key === 'expectedMinutes' && !spec.required) continue;
    if (spec.key === 'variant') {
      const choices = def.variants.map((v) => ({ value: v.id, label: v.label }));
      out.push({ ...spec, choices: id === 'run_race' ? [...choices, { value: 'eigen', label: 'Eigen afstand' }] : choices });
    }
    else if (spec.key === 'shelter') out.push({ ...spec, label: 'Slapen', required: true, choices: [{ value: 'hut', label: 'In hutten' }, { value: 'tent', label: 'Met tent' }] });
    else out.push(spec);
  }
  return out.slice(0, MAX_QUESTIONS);
}

// Het eerste doel is Top. Een volgend doel is Voortop als het voor je Top ligt en Verkenning als het
// erna ligt, of als het geen datum heeft.
// `mainGoalId`: het doel met de mijlpalen, dat altijd Top is, ook als het nooit een label kreeg.
export function suggestPriority(existing: readonly TrainingGoal[], date: string | undefined, mainGoalId?: string): GoalPriority {
  const live = existing.filter((g) => g.status === 'active');
  const top = live.filter((g) => (g.priority === 'top' || g.id === mainGoalId) && g.targetDate);
  if (live.length === 0) return date ? 'top' : 'verkenning';
  if (!date) return 'verkenning';
  if (top.length === 0) return 'top';
  const lastTop = top.map((g) => g.targetDate as string).sort().at(-1) as string;
  return date < lastTop ? 'voortop' : 'verkenning';
}

// Wat er nog mist of niet kan, in gewone woorden. Leeg als je door kunt.
export function draftProblems(id: AddTileId, details: GoalDetails, date: string | undefined, today: string, unchangedDate?: string): string[] {
  const kind = GOAL_KINDS[kindOfTile(id, details)];
  const out: string[] = [];
  for (const q of questionsFor(id)) {
    if (!q.required || (q.showIf && !q.showIf(details))) continue;
    const v = details[q.key];
    if (q.choices) {
      if (!v) out.push(q.key === 'shelter' ? 'Kies of je in hutten of met tent slaapt.' : q.label === 'Afstand' ? 'Kies een afstand.' : `Kies ${q.label.toLowerCase()}.`);
    } else if (typeof v !== 'number' || !(v > 0)) {
      out.push(`Vul ${q.label.toLowerCase()} in.`);
    }
  }
  if (kind.needsDate && !date) out.push('Kies een datum.');
  const dateProblem = goalDateProblem(date, today, unchangedDate);
  if (dateProblem) out.push(dateProblem);
  return out;
}

const DISCIPLINE: Partial<Record<GoalKindId, string>> = {
  trek_hut: 'hiking', trek_tent: 'hiking', day_hike: 'hiking', mountaineering: 'hiking', trail: 'trail', bike: 'cycling',
};

const PRIORITY_ROLE: Record<GoalPriority, 'secondary' | 'track'> = { top: 'secondary', voortop: 'secondary', verkenning: 'track' };

export function defaultGoalName(id: AddTileId, details: GoalDetails): string {
  if (id === 'run_race') {
    const v = details.variant;
    return v === '5k' ? '5 km wedstrijd' : v === '10k' ? '10 km wedstrijd' : v === 'half' ? 'Halve marathon' : v === 'marathon' ? 'Hele marathon' : 'Hardloopwedstrijd';
  }
  if (id === 'trail') return details.distanceKm ? `Trailrun ${String(details.distanceKm).replace('.', ',')} km` : 'Trailrun';
  return ADD_TILES.find((t) => t.id === id)?.label ?? 'Doel';
}

export interface DraftInput {
  id: string;
  now: string;
  tile: AddTileId;
  details: GoalDetails;
  date: string | undefined;
  name: string;
  priority: GoalPriority;
  order: number;
}

// Het doel dat uit de antwoorden volgt. Met een datum is het actief, zonder (Fit blijven) gepauzeerd:
// een actief doel kan niet zonder datum bestaan.
export function buildGoalDraft(input: DraftInput): TrainingGoal {
  const kind = kindOfTile(input.tile, input.details);
  const details: GoalDetails = { ...input.details };
  if (kind === 'run_race' && details.variant && RACE_KM[details.variant] !== undefined) details.distanceKm = RACE_KM[details.variant];
  // Een eigen afstand heeft geen keuze: de soort leidt hem af uit de afstand.
  if (details.variant === 'eigen') delete details.variant;
  if (kind === 'trek_hut' || kind === 'trek_tent') details.shelter = kind === 'trek_tent' ? 'tent' : 'hut';
  let requirements: GoalRequirement[] = requirementsFromDetails(kind, details).map((r) => ({ ...r, ...(DISCIPLINE[kind] ? { discipline: DISCIPLINE[kind] } : {}) }));
  if (kind === 'run_race') {
    const reqs: GoalRequirement[] = [];
    if (details.distanceKm) reqs.push({ id: `req-${input.id}-d`, kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: details.distanceKm, unit: 'km' }, discipline: 'running' });
    if (details.targetMinutes) reqs.push({ id: `req-${input.id}-t`, kind: 'targetTime', scope: 'SINGLE_EVENT', target: { amount: details.targetMinutes, unit: 'min' }, discipline: 'running' });
    requirements = reqs;
  }
  const typed = input.name.trim();
  let name = typed || defaultGoalName(input.tile, details);
  // De naam Marathon is van het oude marathondoel (engine/mainGoal.ts#isMarathonGoal).
  if (name === MARATHON_GOAL_NAME) name = 'Marathon wedstrijd';
  const base = {
    id: input.id, name, requirements, kind, details, priority: input.priority, priorityChosen: true as const, planRole: PRIORITY_ROLE[input.priority],
    order: input.order, createdAt: input.now, updatedAt: input.now,
    ...(kind === 'trek_hut' || kind === 'trek_tent' ? { execution: 'stages' as const } : {}),
  };
  return input.date ? { ...base, status: 'active', targetDate: input.date } : { ...base, status: 'paused' };
}

// --- het tempo onder de doeltijd ---------------------------------------------------------------

// "Dat is een tempo van 4:30 min/km." Zonder afstand of tijd niets.
export function paceText(km: number | undefined, minutes: number | undefined): string | undefined {
  if (!km || !minutes || km <= 0 || minutes <= 0) return undefined;
  const total = Math.round((minutes * 60) / km);
  return `Dat is een tempo van ${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')} min/km.`;
}

// --- een bestaand doel aanpassen -----------------------------------------------------------------

export function tileOfGoal(goal: TrainingGoal): AddTileId | undefined {
  const kind = goalKindOf(goal);
  if (!kind) return undefined;
  return kind === 'trek_hut' || kind === 'trek_tent' ? 'trek' : kind;
}

// Welke eis bij welk antwoord hoort. Alleen deze worden bijgewerkt; elke andere eis van het doel blijft.
const REQ_FIELDS: { key: keyof GoalDetails; kind: GoalRequirement['kind']; unit: 'km' | 'm' | 'days' | 'kg' | 'min' }[] = [
  { key: 'distanceKm', kind: 'distance', unit: 'km' },
  { key: 'gainM', kind: 'elevationGain', unit: 'm' },
  { key: 'lossM', kind: 'elevationLoss', unit: 'm' },
  { key: 'days', kind: 'eventDays', unit: 'days' },
  { key: 'packKg', kind: 'packWeight', unit: 'kg' },
  { key: 'targetMinutes', kind: 'targetTime', unit: 'min' },
];

function reqAmount(goal: TrainingGoal, kind: GoalRequirement['kind']): number | undefined {
  const a = goal.requirements.find((r) => r.kind === kind)?.target?.amount;
  return typeof a === 'number' && a > 0 ? a : undefined;
}

// De antwoorden zoals het formulier ze toont: de ingevulde gegevens, met de eisen van het doel als
// bron voor de getallen (die kunnen na het invullen zijn aangepast), en bij een hardloopwedstrijd de
// afstand als keuze (5, 10, 21,1, 42,2 of eigen).
export function detailsFromGoal(goal: TrainingGoal): GoalDetails {
  const kind = goalKindOf(goal);
  const d: GoalDetails = { ...goalDetailsOf(goal) };
  for (const f of REQ_FIELDS) {
    const v = reqAmount(goal, f.kind);
    if (v !== undefined) (d as Record<string, unknown>)[f.key] = v;
  }
  if (kind === 'run_race') {
    const match = Object.entries(RACE_KM).find(([, km]) => d.distanceKm !== undefined && Math.abs(km - d.distanceKm) < 0.05)?.[0];
    d.variant = match ?? (d.distanceKm !== undefined ? 'eigen' : undefined);
    if (d.variant === undefined) delete d.variant;
  }
  if (kind === 'trek_hut' || kind === 'trek_tent') d.shelter = d.shelter ?? (kind === 'trek_tent' ? 'tent' : 'hut');
  return d;
}

export interface EditInput {
  tile?: AddTileId;
  details: GoalDetails;
  date: string | undefined;
  name: string;
  now: string;
}

// Het doel na het aanpassen. Id, label, volgorde, aanvaarde botsingen en elke eis die het formulier
// niet vraagt blijven zoals ze waren; de eisen die het wel vraagt worden op hun plek bijgewerkt of
// weggehaald als je het veld leegmaakt. Slaat niets op: het gaat als voorstel door planHorizonChange.
export function applyGoalEdit(goal: TrainingGoal, input: EditInput): TrainingGoal {
  const tile = input.tile ?? tileOfGoal(goal);
  const kind = tile ? kindOfTile(tile, input.details) : (goalKindOf(goal) as GoalKindId);
  // Het formulier geeft het volledige antwoord op wat het vraagt: een veld dat er niet in staat is
  // leeggemaakt. Wat het niet vraagt blijft zoals het was.
  const asked = new Set<keyof GoalDetails>(tile ? questionsFor(tile).map((q) => q.key) : []);
  if (kind === 'run_race') asked.add('distanceKm');
  const details: GoalDetails = { ...(goal.details ?? {}) };
  for (const key of asked) {
    const v = input.details[key];
    if (v === undefined) delete details[key]; else (details as Record<string, unknown>)[key] = v;
  }
  if (kind === 'run_race' && details.variant && RACE_KM[details.variant] !== undefined) details.distanceKm = RACE_KM[details.variant];
  if (details.variant === 'eigen') delete details.variant;
  if (kind === 'trek_hut' || kind === 'trek_tent') details.shelter = kind === 'trek_tent' ? 'tent' : 'hut';
  const multi = kind === 'trek_hut' || kind === 'trek_tent';
  let requirements = [...goal.requirements];
  for (const f of REQ_FIELDS) {
    if (!asked.has(f.key)) continue;
    if (f.key === 'days' && !multi) continue;
    const value = details[f.key];
    const at = requirements.findIndex((r) => r.kind === f.kind);
    if (typeof value === 'number' && value > 0) {
      if (at >= 0) requirements[at] = { ...requirements[at], target: { amount: value, unit: f.unit } as GoalRequirement['target'] };
      else {
        const scope: GoalRequirement['scope'] = f.kind === 'packWeight' || kind === 'run_race' ? 'SINGLE_EVENT' : multi ? 'TOTAL_EVENT' : kind === 'mountaineering' ? 'PER_DAY' : 'SINGLE_EVENT';
        const discipline = kind === 'run_race' ? 'running' : DISCIPLINE[kind];
        requirements.push({ id: `req-${goal.id}-${f.kind}`, kind: f.kind, scope, target: { amount: value, unit: f.unit } as GoalRequirement['target'], ...(f.kind === 'packWeight' || !discipline ? {} : { discipline }) });
      }
    } else if (at >= 0) {
      requirements = requirements.filter((_, i) => i !== at);
    }
  }
  const typed = input.name.trim();
  let name = typed || goal.name;
  if (name === MARATHON_GOAL_NAME && goal.name !== MARATHON_GOAL_NAME) name = 'Marathon wedstrijd';
  const base = { ...goal, name, kind, details, requirements, updatedAt: input.now };
  if (multi && !base.execution) base.execution = 'stages';
  if (input.date) return { ...base, status: 'active', targetDate: input.date };
  const { targetDate: _gone, ...rest } = base;
  void _gone;
  return { ...rest, status: 'paused' } as TrainingGoal;
}

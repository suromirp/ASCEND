// ASCEND: een ladder van Calisthenics algemeen die nergens in je trainingen staat, als voorstel met Akkoord in één
// krachttraining (docs/beslissingen/2026-11-26-calisthenics-voorstel-benen-en-romp.md, het Open punt van
// docs/beslissingen/2026-11-09-calisthenics-algemeen.md).
//
// Alleen de squat op één been en de L-sit: de ladders voor het bovenlichaam komen al via Calisthenics per training
// (`forge-soort`). Akkoord gebruikt het mechanisme van Spieren voor de berg (engine/addedExercises.ts): de stap komt in
// `StrengthSettings.addedExercises`, niet in het sjabloon, en geen datum of geplande sessie verandert. Hoogstens één
// voorstel per ladder; na Liever niet komt het voor die ladder niet terug. Geen plek in een passende training: geen
// voorstel. Puur en deterministisch: geen React, geen opslag, geen planning.

import { exerciseById } from '../data/exercises';
import { LADDER_PLACE, SKILL_FLOOR_REPS, SKILL_FLOOR_SECONDS, skillLadderById } from '../data/skillLadders';
import type { ExercisePrescription, SessionLog, SessionTemplate } from '../models/training';
import { addedPrescription, normalizeAddedExercises, withAddedExercise, type AddedExercises } from './addedExercises';
import { ladderState } from './skillLadder';
import { slotExerciseId } from './stepSwaps';
import { hasRole } from './templateRoles';

// De ladders waarvoor dit voorstel bestaat, en waar ze heen gaan: de squat op één been op een beendag, de L-sit in
// elke krachttraining met plek.
export const LADDER_ADD_PLACES: Readonly<Record<string, 'legs' | 'any'>> = { pistol: 'legs', 'l-sit': 'any' };

export interface LadderAddProposal {
  // Het id van de ladder: Liever niet geldt voor de hele ladder.
  ladderId: string;
  ladderName: string;
  templateId: string;
  templateName: string;
  exerciseId: string;
  exerciseName: string;
  // De onderkant van de stap (addedPrescription).
  sets: number;
  reps: string;
}

export interface LadderAddInput {
  // De instelling Stap voorstellen.
  on: boolean;
  // De ladders van het algemene doel.
  ladderIds: readonly string[];
  logs: readonly SessionLog[];
  today: string;
  templates: readonly SessionTemplate[];
  // De oefeningen van een training zoals Forge ze nu zou plannen (engine/forgeSlots.ts#forgeSlotsFor).
  exercisesOf: (template: SessionTemplate) => ExercisePrescription[];
  // engine/addedExercises.ts#canAddExercise voor die training.
  canAdd: (templateId: string) => boolean;
  // De trainingen die vanaf vandaag gepland staan: die gaan voor, zodat de stap niet in een training komt die je niet
  // meer doet (Benen B blijft bestaan voor oude logs). Leeg of zonder: alle krachttrainingen gelijk.
  scheduled?: ReadonlySet<string>;
  // De ladders waarvoor je Liever niet zei.
  declined?: readonly string[];
}

// Een krachttraining, herkend aan soort of rol, nooit aan een id; zoals het stapvoorstel.
const isStrength = (t: SessionTemplate) => t.type === 'strength' || hasRole(t, 'strength');

// Of een ladder ergens in je trainingen staat: een van zijn stappen in een training, ook een toegevoegde.
export function ladderInTrainings(ladderId: string, templates: readonly SessionTemplate[], exercisesOf: (t: SessionTemplate) => ExercisePrescription[]): boolean {
  return templates.some((t) => exercisesOf(t).some((s) => {
    const id = slotExerciseId(s);
    return !!id && LADDER_PLACE.get(id)?.id === ladderId;
  }));
}

function proposalFor(ladderId: string, input: LadderAddInput): LadderAddProposal | null {
  const place = LADDER_ADD_PLACES[ladderId];
  const ladder = skillLadderById(ladderId);
  if (!place || !ladder || (input.declined ?? []).includes(ladderId)) return null;
  if (ladderInTrainings(ladderId, input.templates, input.exercisesOf)) return null;
  // De stap waar de ladder volgens je logs nu staat, anders de eerste.
  const step = ladderState(ladder, input.logs, input.today).current ?? 1;
  const exercise = exerciseById(ladder.steps[step - 1]?.exerciseId ?? '');
  if (!exercise) return null;
  const legWork = (t: SessionTemplate) => input.exercisesOf(t).filter((s) => exerciseById(slotExerciseId(s) ?? '')?.loadsLegs).length;
  const planned = (t: SessionTemplate) => (input.scheduled && input.scheduled.size > 0 && !input.scheduled.has(t.id) ? 1 : 0);
  const fits = input.templates.filter((t) => isStrength(t) && input.canAdd(t.id) && (place === 'any' || legWork(t) > 0));
  // Benen: de training met het meeste beenwerk. Romp: de training met het minste, zodat de beendag niet langer wordt.
  const target = [...fits].sort((a, b) => planned(a) - planned(b)
    || (place === 'legs' ? legWork(b) - legWork(a) : legWork(a) - legWork(b))
    || a.name.localeCompare(b.name) || a.id.localeCompare(b.id))[0];
  if (!target) return null;
  return { ladderId, ladderName: ladder.name, templateId: target.id, templateName: target.name, exerciseId: exercise.id, exerciseName: exercise.name, ...addedPrescription(exercise) };
}

// Per ladder hoogstens één voorstel, in de volgorde van het doel.
export function ladderAddProposals(input: LadderAddInput): LadderAddProposal[] {
  if (!input.on) return [];
  return [...new Set(input.ladderIds)].map((id) => proposalFor(id, input)).filter((p): p is LadderAddProposal => p !== null);
}

// De woorden: de vraag, de dosis in klein, en wat er na Akkoord staat. Het droge feit ("Staat nog niet in je
// trainingen.") staat al in de rij erboven.
export function ladderAddText(p: LadderAddProposal): { question: string; dose: string; done: string; undone: string } {
  const exercise = exerciseById(p.exerciseId);
  const dose = exercise?.measure === 'hold'
    ? `${p.sets} keer ${SKILL_FLOOR_SECONDS} seconden`
    : `${p.sets} keer ${SKILL_FLOOR_REPS}${exercise?.perSide ? ' per been' : ''}`;
  return {
    question: `Zet ${p.exerciseName} in ${p.templateName}?`,
    dose: `Sets en herhalingen: ${dose}, als laatste oefening.`,
    done: `${p.exerciseName} staat in ${p.templateName}. Je ziet het de volgende keer dat je die training opent.`,
    undone: `${p.templateName} is weer zoals hij was.`,
  };
}

// Akkoord: de stap erbij in die training, met dezelfde regel als Spieren voor de berg (één opslag, alles of niets).
export function withLadderAdded<M extends { addedExercises?: AddedExercises }>(model: M | undefined, p: LadderAddProposal, templateIds: readonly string[]): M {
  return withAddedExercise(model, p.templateId, p.exerciseId, templateIds);
}

// Ongedaan maken: de toevoegingen van die training krijgen precies terug wat er voor Akkoord stond.
export function withLadderAddUndone<M extends { addedExercises?: AddedExercises }>(model: M | undefined, p: LadderAddProposal, before: { addedExercises?: AddedExercises } | undefined): M {
  const base = (model ?? {}) as M;
  const all = { ...(normalizeAddedExercises(base.addedExercises) ?? {}) };
  const was = normalizeAddedExercises(before?.addedExercises)?.[p.templateId];
  if (was) all[p.templateId] = was;
  else delete all[p.templateId];
  return { ...base, addedExercises: Object.keys(all).length > 0 ? all : undefined };
}

// ASCEND: een stap omhoog of omlaag op een calisthenicsladder als voorstel met Akkoord
// (docs/beslissingen/2026-11-09-calisthenics-stapvoorstel.md, F4d van docs/beslissingen/2026-11-09-calisthenics-ontwerp.md).
//
// Of er een stap omhoog of omlaag is, beslist engine/skillLadder.ts#ladderState (toets gehaald, of drie voorbije
// trainingen onder de onderkant; een training van vandaag telt niet als voorbij). Dit bestand zoekt er alleen de
// krachttrainingen bij die de oefening op de huidige stap echt bevatten, en zegt wat Akkoord schrijft: die plekken
// worden de voorgestelde stap (engine/stepSwaps.ts). Hoogstens één voorstel per ladder. Niets als je Liever niet zei
// voor precies deze stap (ladder, van en naar), als de stap al in die training staat, of zonder volgende stap.
// Puur en deterministisch: geen React, geen opslag, geen planning. De stille regel in Forge (engine/forgeLadder.ts)
// blijft zoals hij is; dit plant niets en raakt geen log en geen geplande sessie.

import { exerciseById } from '../data/exercises';
import { SKILL_FLOOR_REPS, SKILL_FLOOR_SECONDS, SKILL_LADDERS, type SkillLadder } from '../data/skillLadders';
import type { ExercisePrescription, SessionLog, SessionTemplate } from '../models/training';
import { ladderState } from './skillLadder';
import { canHoldStep, slotExerciseId, stepSwapAt, withStepSwapsSet, type StepSwap, type StepSwaps } from './stepSwaps';
import { hasRole } from './templateRoles';

export interface StepTarget {
  templateId: string;
  templateName: string;
  // De plek in de training (`ExercisePrescription.id`).
  slot: string;
}

export interface StepProposal {
  // Ladder, van- en naar-stap: na Liever niet komt alleen een voorstel voor een andere stap terug.
  id: string;
  ladderId: string;
  kind: 'harder' | 'lighter';
  fromExerciseId: string;
  fromName: string;
  toExerciseId: string;
  toName: string;
  // Elke training met de oefening, allemaal in hetzelfde voorstel: Akkoord schrijft ze samen of geen.
  targets: StepTarget[];
}

export interface StepProposalInput {
  on: boolean;
  logs: readonly SessionLog[];
  today: string;
  templates: readonly SessionTemplate[];
  // De oefeningen van een training zoals Forge ze nu zou plannen (engine/forgeSlots.ts), met de stappen die je al koos.
  exercisesOf: (template: SessionTemplate) => ExercisePrescription[];
  // De id's waarvoor je Liever niet zei.
  declined?: readonly string[];
  ladders?: readonly SkillLadder[];
}

export const stepProposalId = (ladderId: string, from: string, to: string) => `${ladderId}:${from}>${to}`;

// Een krachttraining, herkend aan soort of rol, nooit aan een id. Eigen gewicht (zonder sportschool) hoort erbij.
const isStrength = (t: SessionTemplate) => t.type === 'strength' || hasRole(t, 'strength');

// Een plek die Forge achter de training zet na Spieren voor de berg: geen plek van het sjabloon, dus niet te ruilen.
const ADDED_PREFIX = 'plus:';

function proposalFor(ladder: SkillLadder, input: StepProposalInput): StepProposal | null {
  const state = ladderState(ladder, input.logs, input.today);
  const p = state.proposal;
  if (!p) return null;
  // Harder: van de huidige stap. Lichter: van de stap die je drie keer niet haalde, één boven het voorstel.
  const fromStep = p.kind === 'harder' ? state.current : p.step + 1;
  const from = fromStep === null ? undefined : ladder.steps[fromStep - 1]?.exerciseId;
  const to = p.exerciseId;
  const fromEx = from ? exerciseById(from) : undefined;
  const toEx = exerciseById(to);
  if (!from || !fromEx || !toEx) return null;
  const id = stepProposalId(ladder.id, from, to);
  if ((input.declined ?? []).includes(id)) return null;
  const targets: StepTarget[] = [];
  for (const t of [...input.templates].filter(isStrength).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))) {
    const slots = input.exercisesOf(t);
    const ids = slots.map(slotExerciseId);
    // Staat de stap er al in, dan zou Akkoord hem dubbel zetten: deze training niet.
    if (ids.includes(to)) continue;
    slots.forEach((s, i) => {
      if (ids[i] === from && !s.id.startsWith(ADDED_PREFIX) && canHoldStep(s)) targets.push({ templateId: t.id, templateName: t.name, slot: s.id });
    });
  }
  if (targets.length === 0) return null;
  return { id, ladderId: ladder.id, kind: p.kind, fromExerciseId: from, fromName: fromEx.name, toExerciseId: to, toName: toEx.name, targets };
}

// Per ladder hoogstens één voorstel, in de volgorde van data/skillLadders.ts.
export function stepProposals(input: StepProposalInput): StepProposal[] {
  if (!input.on) return [];
  return (input.ladders ?? SKILL_LADDERS).map((l) => proposalFor(l, input)).filter((p): p is StepProposal => p !== null);
}

// De woorden van de kaart: het droge feit eerst, dan de vraag.
// `keeps` zegt wat er met sets en herhalingen gebeurt (zie withStepAccepted).
export function stepProposalText(p: StepProposal): { fact: string; question: string; where: string; keeps: string } {
  const names = [...new Set(p.targets.map((t) => t.templateName))];
  const where = names.length === 1 ? `In ${names[0]}.` : `In ${names.slice(0, -1).join(', ')} en ${names[names.length - 1]}.`;
  const sets = floorSets(p);
  const keeps = isHold(p.fromExerciseId) === isHold(p.toExerciseId)
    ? 'Sets en herhalingen blijven.'
    : isHold(p.toExerciseId) ? `Je begint op ${sets} keer ${SKILL_FLOOR_SECONDS} seconden.` : `Je begint op ${sets} keer ${SKILL_FLOOR_REPS}.`;
  return p.kind === 'harder'
    ? { fact: `Je toets op ${p.fromName} is gehaald. Volgende stap: ${p.toName}.`, question: `Zet je plan op ${p.toName}?`, where, keeps }
    : { fact: `Drie trainingen onder de onderkant van ${p.fromName}.`, question: `Zet je plan op de lichtere stap ${p.toName}?`, where, keeps };
}

// Het aantal sets van de onderkant: dat van de toets van de nieuwe stap, zoals withStepAccepted het schrijft.
function floorSets(p: Pick<StepProposal, 'ladderId' | 'toExerciseId'>): number {
  const ladder = SKILL_LADDERS.find((l) => l.id === p.ladderId);
  return ladder?.steps.find((s) => s.exerciseId === p.toExerciseId)?.test.sets ?? 3;
}

function isHold(exerciseId: string): boolean {
  return exerciseById(exerciseId)?.measure === 'hold';
}

// Wat Akkoord schrijft: elke plek van het voorstel wordt de nieuwe stap, in één keer. De oorspronkelijke oefening van
// het sjabloon blijft `from`, zodat terug naar het sjabloon altijd kan. Sets en herhalingen blijven; alleen bij een
// overgang tussen herhalingen en een houding komt de onderkant van de nieuwe stap (3 keer 5, of 3 keer 10 seconden).
// Wordt de stap weer de oefening van het sjabloon, dan gaat de stap weg.
export function withStepAccepted<M extends { stepSwaps?: StepSwaps }>(model: M | undefined, p: StepProposal): M {
  const changes = p.targets.map((t) => {
    const before = stepSwapAt(model, t.templateId, t.slot);
    const from = before?.from ?? p.fromExerciseId;
    if (from === p.toExerciseId) return { templateId: t.templateId, slot: t.slot, swap: undefined };
    const swap: StepSwap = { from, to: p.toExerciseId };
    if (isHold(p.fromExerciseId) !== isHold(p.toExerciseId)) {
      swap.sets = floorSets(p);
      swap.reps = isHold(p.toExerciseId) ? `${SKILL_FLOOR_SECONDS}s` : `${SKILL_FLOOR_REPS}`;
    } else if (before?.reps !== undefined && before.sets !== undefined) {
      // Een eerdere overgang gaf al de onderkant; die blijft bij een stap met dezelfde meting.
      swap.sets = before.sets;
      swap.reps = before.reps;
    }
    return { templateId: t.templateId, slot: t.slot, swap };
  });
  return withStepSwapsSet(model, changes);
}

// Ongedaan maken: de plekken van het voorstel krijgen precies terug wat er voor Akkoord stond.
export function withStepUndone<M extends { stepSwaps?: StepSwaps }>(model: M | undefined, p: StepProposal, before: { stepSwaps?: StepSwaps } | undefined): M {
  return withStepSwapsSet(model, p.targets.map((t) => ({ templateId: t.templateId, slot: t.slot, swap: stepSwapAt(before, t.templateId, t.slot) })));
}

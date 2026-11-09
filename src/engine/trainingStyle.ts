// ASCEND: calisthenics als soort per krachttraining: kracht, calisthenics of samen
// (docs/beslissingen/2026-11-09-calisthenics-planner.md, F4g van docs/beslissingen/2026-11-09-calisthenics-ontwerp.md).
//
// Geen nieuw plansysteem en geen nieuw opgeslagen veld. De keuze is een set ladderstappen in een training, precies de
// vorm van het stapvoorstel (engine/stepSwaps.ts, `StrengthSettings.stepSwaps`): een plek met bankdrukken krijgt de
// push-up op jouw stap, lat pulldown het optrekken. Welke plek welke ladder kan worden, staat in
// data/calisthenicsStyle.ts (alleen bovenlichaam). De soort zelf wordt afgeleid uit de stappen die er staan, dus een
// oude back-up zonder stappen is overal kracht. Daarna neemt het stapvoorstel het over: haal je de toets, dan stelt
// het de volgende stap voor in deze training.
//
// Een andere soort kiezen is een voorstel met Akkoord: `styleChange` zegt wat er verandert, `withStyleAccepted` schrijft
// het in één keer of niets, `withStyleUndone` zet precies terug. De planning ziet het niet: de planningsronde leest de
// belasting en de rollen van het sjabloon, en die blijven. Puur en deterministisch: geen React, geen opslag, geen AI.

import { LADDERS_FOR_FAMILY } from '../data/calisthenicsStyle';
import { exerciseById } from '../data/exercises';
import { LADDER_PLACE, SKILL_FLOOR_SECONDS, skillLadderById } from '../data/skillLadders';
import type { ExercisePrescription, SessionLog, SessionTemplate } from '../models/training';
import { baseSlotsFor } from './forgeSlots';
import { ladderState } from './skillLadder';
import type { StoredStrengthProgram } from './strengthProgramStore';
import { isGymStrengthTemplate } from './templateRoles';
import { canHoldStep, normalizeStepSwaps, slotExerciseId, stepSwapAt, withStepSwapsSet, type StepSwap, type StepSwaps } from './stepSwaps';

export type TrainingStyle = 'strength' | 'calisthenics' | 'mixed';

export const STYLE_LABEL: Record<TrainingStyle, string> = { strength: 'Kracht', calisthenics: 'Calisthenics', mixed: 'Samen' };

// Een plek in een training die een ladder kan worden.
export interface StyleSlot {
  slot: string;
  // De oefening van het sjabloon of het programma op die plek.
  from: string;
  fromName: string;
  ladderId: string;
}

// Een plek die Forge achter de training zet na Spieren voor de berg: geen plek van het sjabloon.
const ADDED_PREFIX = 'plus:';

// De plekken die een ladder kunnen worden, in de volgorde van de training. Een oefening die al op een ladder staat
// (Push-Up in Eigen gewicht) blijft van het stapvoorstel, en die ladder komt er dan niet nog eens bij. Elke ladder
// hoogstens één keer per training.
export function styleSlots(slots: readonly ExercisePrescription[]): StyleSlot[] {
  const used = new Set<string>();
  for (const s of slots) {
    const id = slotExerciseId(s);
    const place = id ? LADDER_PLACE.get(id) : undefined;
    if (place) used.add(place.id);
  }
  const out: StyleSlot[] = [];
  for (const s of slots) {
    if (s.id.startsWith(ADDED_PREFIX) || !canHoldStep(s)) continue;
    const id = slotExerciseId(s);
    const ex = id ? exerciseById(id) : undefined;
    if (!ex || ex.ladder || !ex.family) continue;
    const ladderId = (LADDERS_FOR_FAMILY[ex.family] ?? []).find((l) => !used.has(l) && skillLadderById(l));
    if (!ladderId) continue;
    used.add(ladderId);
    out.push({ slot: s.id, from: ex.id, fromName: s.exerciseName, ladderId });
  }
  return out;
}

// Welke keuzes deze training heeft: niets zonder plek voor een ladder, Samen pas vanaf twee plekken.
export function stylesOffered(slots: readonly ExercisePrescription[]): TrainingStyle[] {
  const n = styleSlots(slots).length;
  if (n === 0) return [];
  return n >= 2 ? ['strength', 'calisthenics', 'mixed'] : ['strength', 'calisthenics'];
}

// Een stap op deze plek die nog klopt met de oefening van het sjabloon (zoals engine/stepSwaps.ts#withStepSwaps).
function liveSwap(model: { stepSwaps?: StepSwaps } | undefined, templateId: string, c: StyleSlot): StepSwap | undefined {
  const swap = stepSwapAt(model, templateId, c.slot);
  return swap && swap.from === c.from && LADDER_PLACE.get(swap.to)?.id === c.ladderId ? swap : undefined;
}

// De soort van een training, afgeleid uit de stappen die er staan: geen enkele is kracht, allemaal is calisthenics,
// een deel is samen (ook als je zelf een plek terugzette in het blad van de oefening).
export function trainingStyleOf(slots: readonly ExercisePrescription[], model: { stepSwaps?: StepSwaps } | undefined, templateId: string): TrainingStyle {
  const cands = styleSlots(slots);
  const on = cands.filter((c) => liveSwap(model, templateId, c)).length;
  if (on === 0) return 'strength';
  return on === cands.length ? 'calisthenics' : 'mixed';
}

// Samen: de eerste helft blijft met gewicht (de zware basisoefeningen staan vooraan), de rest gaat op een ladder.
function ladderSlots(style: TrainingStyle, cands: StyleSlot[]): Set<string> {
  if (style === 'strength') return new Set();
  if (style === 'calisthenics') return new Set(cands.map((c) => c.slot));
  return new Set(cands.slice(Math.ceil(cands.length / 2)).map((c) => c.slot));
}

export interface StyleStep {
  slot: string;
  // Wat er nu staat en wat er na Akkoord staat (namen zoals Forge ze toont).
  nowName: string;
  nextName: string;
  // De nieuwe stap op de ladder, alleen als er een ladder bijkomt.
  step?: number;
  steps?: number;
  hold?: boolean;
  // Wat Akkoord op deze plek schrijft; `undefined` haalt de stap weg (terug naar het sjabloon).
  swap: StepSwap | undefined;
}

export interface StyleChange {
  templateId: string;
  templateName: string;
  style: TrainingStyle;
  steps: StyleStep[];
}

export interface StyleChangeInput {
  template: Pick<SessionTemplate, 'id' | 'name'>;
  // De plekken van het programma of sjabloon zonder stappen (engine/forgeSlots.ts#baseSlotsFor).
  slots: readonly ExercisePrescription[];
  model: { stepSwaps?: StepSwaps } | undefined;
  style: TrainingStyle;
  logs: readonly SessionLog[];
  // Tot en met deze dag tellen je logs, zoals in Forge (engine/skillLadder.ts).
  today: string;
}

// De stap waar je op de ladder staat: uit je logs met dezelfde regels als Forge, zonder training stap 1.
function startStep(ladderId: string, logs: readonly SessionLog[], today: string): { exerciseId: string; step: number; steps: number } | undefined {
  const ladder = skillLadderById(ladderId);
  if (!ladder) return undefined;
  const step = ladderState(ladder, logs, today).current ?? 1;
  const exerciseId = ladder.steps[step - 1]?.exerciseId;
  return exerciseId ? { exerciseId, step, steps: ladder.steps.length } : undefined;
}

const isHold = (exerciseId: string) => exerciseById(exerciseId)?.measure === 'hold';

// Wat een andere soort in deze training verandert. Een plek die al op zijn ladder staat blijft zoals hij is (de stap
// die het stapvoorstel zette gaat niet terug naar het begin). Null als er niets verandert of niets kan.
export function styleChange(input: StyleChangeInput): StyleChange | null {
  const cands = styleSlots(input.slots);
  if (cands.length === 0 || (input.style === 'mixed' && cands.length < 2)) return null;
  const want = ladderSlots(input.style, cands);
  const steps: StyleStep[] = [];
  for (const c of cands) {
    const live = liveSwap(input.model, input.template.id, c);
    if (want.has(c.slot) && !live) {
      const start = startStep(c.ladderId, input.logs, input.today);
      const to = start ? exerciseById(start.exerciseId) : undefined;
      if (!start || !to) return null;
      const hold = isHold(to.id);
      const ladder = skillLadderById(c.ladderId)!;
      // Zoals het stapvoorstel: herhalingen houden de sets en herhalingen van het sjabloon; een houding begint op de
      // onderkant (3 keer 10 seconden).
      const swap: StepSwap = hold ? { from: c.from, to: to.id, sets: ladder.steps[start.step - 1].test.sets, reps: `${SKILL_FLOOR_SECONDS}s` } : { from: c.from, to: to.id };
      steps.push({ slot: c.slot, nowName: c.fromName, nextName: to.name, step: start.step, steps: start.steps, hold, swap });
    } else if (!want.has(c.slot) && live) {
      steps.push({ slot: c.slot, nowName: exerciseById(live.to)?.name ?? live.to, nextName: c.fromName, swap: undefined });
    }
  }
  if (steps.length === 0) return null;
  return { templateId: input.template.id, templateName: input.template.name, style: input.style, steps };
}

const DONE: Record<TrainingStyle, (name: string) => string> = {
  strength: (name) => `${name} is weer kracht met gewicht.`,
  calisthenics: (name) => `${name} is nu calisthenics.`,
  mixed: (name) => `${name} is nu kracht en calisthenics samen.`,
};

// De woorden van het voorstel: per plek het droge feit, dan de vaste zin.
export function styleChangeText(c: StyleChange): { lines: string[]; always: string; done: string; undone: string } {
  const lines = c.steps.map((s) => (s.swap ? `${s.nowName} wordt ${s.nextName} (stap ${s.step} van ${s.steps}).` : `${s.nowName} wordt weer ${s.nextName}.`));
  const hold = c.steps.find((s) => s.swap && s.hold);
  if (hold?.swap?.sets) lines.push(`Een houding begint op ${hold.swap.sets} keer ${SKILL_FLOOR_SECONDS} seconden.`);
  return {
    lines,
    always: 'Eerst een voorstel, pas na Akkoord verandert er iets.',
    done: `${DONE[c.style](c.templateName)} Je ziet het de volgende keer dat je deze training opent.`,
    undone: `${c.templateName} staat weer zoals het was.`,
  };
}

const sameSwap = (a: StepSwap | undefined, b: StepSwap | undefined) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

// Wat Akkoord schrijft: alle plekken in één keer. Landt één plek niet (het maximum aan trainingen of plekken), dan
// niets: null, en de aanroeper slaat niets op.
export function withStyleAccepted<M extends { stepSwaps?: StepSwaps }>(model: M | undefined, c: StyleChange): M | null {
  const before = normalizeStepSwaps(model?.stepSwaps) ?? {};
  const next = withStepSwapsSet(model, c.steps.map((s) => ({ templateId: c.templateId, slot: s.slot, swap: s.swap })));
  if (!c.steps.every((s) => sameSwap(stepSwapAt(next, c.templateId, s.slot), s.swap))) return null;
  // Geen stap van een andere training mag wegvallen.
  for (const [t, slots] of Object.entries(before)) {
    if (t === c.templateId) continue;
    for (const slot of Object.keys(slots)) if (!sameSwap(stepSwapAt(next, t, slot), slots[slot])) return null;
  }
  return next;
}

// Ongedaan maken: de plekken van het voorstel krijgen precies terug wat er voor Akkoord stond; de rest blijft.
export function withStyleUndone<M extends { stepSwaps?: StepSwaps }>(model: M | undefined, c: StyleChange, before: { stepSwaps?: StepSwaps } | undefined): M {
  return withStepSwapsSet(model, c.steps.map((s) => ({ templateId: c.templateId, slot: s.slot, swap: stepSwapAt(before, c.templateId, s.slot) })));
}

// Hoeveel trainingen calisthenics hebben (helemaal of samen), voor de rij in de instellingen. Een stap waarvan de
// oefening van het sjabloon zelf geen ladder heeft, kan alleen uit deze keuze komen; het stapvoorstel zet alleen een
// plek die al op een ladder stond.
export function calisthenicsTrainings(model: { stepSwaps?: StepSwaps } | undefined): number {
  const all = normalizeStepSwaps(model?.stepSwaps) ?? {};
  return Object.values(all).filter((slots) => Object.values(slots).some((s) => !LADDER_PLACE.has(s.from))).length;
}

export interface StyleTraining {
  template: SessionTemplate;
  // De plekken zonder stappen, om het voorstel mee te rekenen.
  slots: ExercisePrescription[];
  style: TrainingStyle;
  offered: TrainingStyle[];
}

// De krachttrainingen in de sportschool die een keuze hebben, op naam. Eigen gewicht (zonder sportschool) en een
// beentraining staan er niet bij: die hebben geen plek voor een ladder of staan al op een ladder.
export function styleTrainings(templates: readonly SessionTemplate[], model: { program?: StoredStrengthProgram; stepSwaps?: StepSwaps } | undefined, date: string): StyleTraining[] {
  return templates
    .filter(isGymStrengthTemplate)
    .map((template) => {
      const slots = baseSlotsFor(template, model, date);
      return { template, slots, style: trainingStyleOf(slots, model, template.id), offered: stylesOffered(slots) };
    })
    .filter((t) => t.offered.length > 0)
    .sort((a, b) => a.template.name.localeCompare(b.template.name) || a.template.id.localeCompare(b.template.id));
}

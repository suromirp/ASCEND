// ASCEND: de krachtdoelen per oefening van "Sterker worden" in het doelformulier
// (GoalDetails.strengthTargets). Een doel is een oefening uit de bestaande lijst met een gewicht en een
// aantal herhalingen; de meter Krachttrend (engine/strengthReadiness.ts) leest ze. Dit bestand houdt de
// lijst bij en keurt een invoer goed, zonder React en zonder opslag.

import { EXERCISES } from '../data/exercises';
import { formatNumberNL } from '../utils/number';

export interface StrengthTarget {
  exercise: string;
  kg: number;
  reps: number;
}

export interface StrengthTargetInput {
  exercise: string;
  kg: number | undefined;
  reps: number | undefined;
}

// Meer dan dit lezen we niet terug (storage/migrations.ts#readGoalDetails): een doel gaat over een paar hoofdoefeningen.
export const MAX_STRENGTH_TARGETS = 8;
export const MAX_REPS = 30;
export const MAX_KG = 500;

const norm = (s: string) => s.trim().toLowerCase();

// De oefeningen die je als doel kunt kiezen: alles met een gewicht, op naam gesorteerd.
export function strengthTargetChoices(): string[] {
  const names = EXERCISES.filter((e) => e.resistance !== 'bodyweight').map((e) => e.name);
  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

const canonical = (name: string): string | undefined => strengthTargetChoices().find((n) => norm(n) === norm(name));

// Wat er nog mist, in gewone woorden. Undefined als de invoer kan.
export function strengthTargetProblem(t: StrengthTargetInput): string | undefined {
  if (!t.exercise.trim()) return 'Kies een oefening.';
  if (!canonical(t.exercise)) return 'Kies een oefening uit de lijst.';
  if (t.kg === undefined || !(t.kg > 0)) return 'Vul het gewicht in.';
  if (t.kg > MAX_KG) return `Kies een gewicht tot ${MAX_KG} kg.`;
  if (t.reps === undefined || !(t.reps > 0)) return 'Vul het aantal herhalingen in.';
  if (!Number.isInteger(t.reps) || t.reps > MAX_REPS) return `Kies 1 tot ${MAX_REPS} herhalingen.`;
  return undefined;
}

// De lijst met een doel erbij. Een tweede doel voor dezelfde oefening vervangt het eerste. Een invoer die niet
// kan verandert niets.
export function addStrengthTarget(list: readonly StrengthTarget[], input: StrengthTargetInput): StrengthTarget[] {
  if (strengthTargetProblem(input)) return [...list];
  const exercise = canonical(input.exercise) as string;
  const next = { exercise, kg: input.kg as number, reps: input.reps as number };
  const at = list.findIndex((t) => norm(t.exercise) === norm(exercise));
  if (at >= 0) return list.map((t, i) => (i === at ? next : t));
  return list.length >= MAX_STRENGTH_TARGETS ? [...list] : [...list, next];
}

export function removeStrengthTarget(list: readonly StrengthTarget[], exercise: string): StrengthTarget[] {
  return list.filter((t) => norm(t.exercise) !== norm(exercise));
}

export function strengthTargetLine(t: StrengthTarget): string {
  return `${t.exercise}: ${formatNumberNL(t.kg, Number.isInteger(t.kg) ? 0 : 1)} kg voor ${t.reps} ${t.reps === 1 ? 'herhaling' : 'herhalingen'}`;
}

// Wat er in de velden staat maar nog niet met "Doel toevoegen" is toegevoegd. Leeg is geen invoer; half ingevuld
// is een vraag aan de gebruiker, geen stille keuze.
export function isBlankInput(t: StrengthTargetInput): boolean {
  return !t.exercise.trim() && t.kg === undefined && t.reps === undefined;
}

// De lijst bij Opslaan: een volledig ingevulde invoer gaat mee. Staat er iets half in, of is de lijst vol, dan
// blijft de lijst zoals hij was en komt er één heldere zin terug, zodat er niets stil verloren gaat.
export function finishStrengthTargets(list: readonly StrengthTarget[], input: StrengthTargetInput): { list: StrengthTarget[]; problem?: string } {
  if (isBlankInput(input)) return { list: [...list] };
  const why = strengthTargetProblem(input);
  if (why) return { list: [...list], problem: `Je krachtdoel is nog niet af. ${why} Of maak de velden leeg.` };
  const next = addStrengthTarget(list, input);
  const added = next.some((t) => norm(t.exercise) === norm(input.exercise) && t.kg === input.kg && t.reps === input.reps);
  if (!added) return { list: [...list], problem: `Je kunt tot ${MAX_STRENGTH_TARGETS} doelen toevoegen. Haal er eerst een weg of maak de velden leeg.` };
  return { list: next };
}

// ASCEND: waar je slaapt op een meerdaagse tocht, hutten, tent of beide
// (docs/beslissingen/2026-11-14-keuzes-avond.md, punt 1). Eén keuze, op het doel zelf
// (GoalDetails.shelter), en de doelkop, de paklijst en de Reisplanner lezen haar hier.
//
// Het advies is tent: wie zich voorbereidt op een tent (zwaardere rugzak, kookspullen,
// een nacht buiten) is ook klaar voor hutten, andersom niet. Beide is een tocht met tent:
// je draagt de tent ook op de dagen dat je in een hut slaapt.
//
// Puur: geen React, geen opslag.

import type { GoalKindId, TrainingGoal, TrekShelter } from '../models/goals';
import { GOAL_KINDS } from '../data/goalKinds';
import { SHELTER_OPTIONS } from '../data/shelterOptions';
import { effectiveGoalKind, isTrekKind } from './journeyAccess';
import { listedGoals } from './goalList';

export type { TrekShelter };

export const SHELTER_ADVICE: TrekShelter = 'tent';

export { SHELTER_OPTIONS };

const SHELTER_LABEL: Record<TrekShelter, string> = {
  tent: 'Meerdaagse tocht met tent',
  hut: 'Meerdaagse tocht met hutten',
  both: 'Meerdaagse tocht met hutten en tent',
};

const SHELTER_SHORT: Record<TrekShelter, string> = { tent: 'Met tent', hut: 'In hutten', both: 'Hutten en tent' };

export const shelterShort = (s: TrekShelter): string => SHELTER_SHORT[s];

export function readShelter(v: unknown): TrekShelter | undefined {
  return v === 'hut' || v === 'tent' || v === 'both' ? v : undefined;
}

// De soort die bij de keuze hoort. Beide rekent als tent: de rugzak is die van een tent.
export function kindForShelter(s: TrekShelter): 'trek_hut' | 'trek_tent' {
  return s === 'hut' ? 'trek_hut' : 'trek_tent';
}

// De keuze die bij een soort past: hutten bij trek_hut, bij trek_tent tent of beide (wat er stond).
export function shelterForKind(kind: 'trek_hut' | 'trek_tent', current: TrekShelter | undefined): TrekShelter {
  if (kind === 'trek_hut') return 'hut';
  return current === 'both' ? 'both' : 'tent';
}

// Waar je slaapt op deze tocht. Wat er op het doel staat, anders wat de soort zegt, en een tocht
// zonder soort en zonder keuze krijgt het advies.
export function shelterOfGoal(goal: TrainingGoal | undefined, isMain = true): TrekShelter {
  if (!goal) return SHELTER_ADVICE;
  const own = readShelter(goal.details?.shelter);
  if (own) return own;
  if (goal.kind === 'trek_tent') return 'tent';
  if (goal.kind === 'trek_hut') return 'hut';
  return isMain ? SHELTER_ADVICE : 'hut';
}

// De naam van de soort zoals de doelkop hem toont. Bij een tocht volgt hij de keuze, ook beide.
export function goalKindName(goal: TrainingGoal, isMain: boolean): string | undefined {
  const kind: GoalKindId | undefined = effectiveGoalKind(goal, isMain);
  if (!kind) return undefined;
  if (isTrekKind(kind)) return SHELTER_LABEL[shelterOfGoal(goal, isMain)];
  return GOAL_KINDS[kind].label;
}

const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

// De regel onder de paklijst: voor welke opzet het voorbeeld is, en of het bij de maand van vertrek past.
export function packListNote(shelter: TrekShelter, goalDate: string | undefined): string {
  const setup = shelter === 'hut'
    ? 'De voorbeeldlijst is voor een tocht van hut naar hut: zonder tent en kookspullen, met een lakenzak voor de hut.'
    : shelter === 'both'
      ? 'De voorbeeldlijst is een solo opzet met tent: die draag je ook op de dagen dat je in een hut slaapt.'
      : 'De voorbeeldlijst is een solo opzet met tent, licht maar comfortabel.';
  const month = goalDate ? Number(goalDate.slice(5, 7)) : undefined;
  const summer = month === undefined || (month >= 6 && month <= 9);
  const season = summer
    ? 'De gewichten zijn afgerond en passen bij de zomer.'
    : shelter === 'hut'
      ? `Je vertrekt in ${MONTHS[month - 1]}: reken op sneeuw op hoogte en meer kleding dan hier staat, en kijk of de hutten dan open zijn.`
      : `Je vertrekt in ${MONTHS[month - 1]}: reken op koudere nachten en sneeuw op hoogte, dus een warmere slaapzak en meer kleding dan hier staat.`;
  return `${setup} ${season} Pas de gewichten aan zodra je iets in huis hebt en weegt. Vink af wat je hebt.`;
}

// De tocht van de tochtschermen (Reisplanner, Paklijst): het hoofddoel als dat een tocht is,
// anders de eerste tocht in de lijst.
export function journeyTrekGoal(goals: readonly TrainingGoal[], ladderGoalIds: ReadonlySet<string>, today: string): { goal: TrainingGoal; isMain: boolean } | undefined {
  const treks = listedGoals(goals, ladderGoalIds, today).filter(({ goal, isMain }) => {
    const kind = effectiveGoalKind(goal, isMain);
    return !!kind && isTrekKind(kind);
  });
  return treks.find((t) => t.isMain) ?? treks[0];
}

// Waar je slaapt op die tocht. Zonder tocht het advies.
export function journeyShelter(goals: readonly TrainingGoal[], ladderGoalIds: ReadonlySet<string>, today: string): TrekShelter {
  const pick = journeyTrekGoal(goals, ladderGoalIds, today);
  return pick ? shelterOfGoal(pick.goal, pick.isMain) : SHELTER_ADVICE;
}

// Het doel met een andere keuze: de soort en de keuze samen, zodat ze nooit uit elkaar lopen. Slaat
// niets op: het gaat als voorstel met Akkoord door planHorizonChange, want de soort verandert de
// opbouw (afbouw, dagen achter elkaar, rugzak).
export function withShelter(goal: TrainingGoal, shelter: TrekShelter, now: string): TrainingGoal {
  return { ...goal, kind: kindForShelter(shelter), details: { ...(goal.details ?? {}), shelter, shelterChosen: true }, updatedAt: now };
}

// --- Een doel dat de migratie op hutten zette ---------------------------------------------
// Een hoofddoel van voor de soorten werd trek_hut met shelter 'hut' als het etappeplan geen nacht in
// tent of bivak had (storage/migrationsGoals.ts). Sinds de keuze de paklijst en de Reisplanner bepaalt,
// zou zo iemand stil de tent en de tenttaken kwijtraken. Het doel blijft het doel: de app vraagt het
// één keer, met Klopt, Tent of Beide; Tent en Beide gaan als voorstel met Akkoord.

export function readShelterAsked(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 200) : [];
}

export function withShelterAsked(raw: unknown, goalId: string): string[] {
  const list = readShelterAsked(raw);
  return list.includes(goalId) ? list : [...list, goalId];
}

// Vraagt de app het bij dit doel? Alleen bij hutten zonder eigen keuze, en nog niet gevraagd.
export function needsShelterCheck(goal: TrainingGoal, isMain: boolean, asked: unknown): boolean {
  if (shelterOfGoal(goal, isMain) !== 'hut') return false;
  if (goal.details?.shelterChosen === true) return false;
  return !readShelterAsked(asked).includes(goal.id);
}

// Het doel van de tochtschermen als de vraag daar hoort, anders niets.
export function shelterCheckGoal(goals: readonly TrainingGoal[], ladderGoalIds: ReadonlySet<string>, today: string, asked: unknown): TrainingGoal | undefined {
  const pick = journeyTrekGoal(goals, ladderGoalIds, today);
  return pick && needsShelterCheck(pick.goal, pick.isMain, asked) ? pick.goal : undefined;
}

export const SHELTER_CHECK = {
  eyebrow: 'Slapen onderweg',
  question: 'Je tocht staat op hutten. Klopt dat?',
  line: 'De paklijst en de Reisplanner volgen die keuze. Met tent komen de tent, de kookspullen en de taken voor bivak erbij.',
  keep: 'Klopt',
  tent: 'Tent',
  both: 'Beide',
} as const;

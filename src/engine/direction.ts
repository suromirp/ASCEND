// ASCEND: de richting van je week zonder doel (docs/visie/Zonder doel.md, 3.2). De
// richting wordt afgeleid, niet alleen opgeslagen: met een doel op Ascend is dat doel de
// richting; zonder doel geldt wat je koos in `AppSettings.direction`, en zonder keuze het
// advies. Puur: geen React, geen IndexedDB.

import { ADVICE_DIRECTION, DIRECTIONS, DIRECTION_IDS, IMPROVE_FLOOR, MINUTES_CEILING, type DirectionId, type DirectionSpec } from '../data/directions';
import type { TrainingGoal } from '../models/goals';
import { isoWeekday } from '../utils/dates';
import { mainGoal, type Ladder } from './mainGoal';

// Een richting uit een bestand of de instellingen: alleen een bekende waarde blijft over.
export function parseDirection(raw: unknown): DirectionId | undefined {
  return DIRECTION_IDS.find((id) => id === raw);
}

// De startdatum van je richting: een echte datum die een maandag is, anders niets.
export function parseDirectionStart(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;
  const parsed = Date.parse(`${raw}T00:00:00Z`);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== raw) return undefined;
  return isoWeekday(raw) === 1 ? raw : undefined;
}

export type ActiveDirection =
  | { kind: 'goal' }
  | { kind: 'direction'; id: DirectionId; chosen: boolean };

// `goals` zijn de doelen zoals de Ascend-tab ze toont (engine/goalList.ts#listedGoals), zodat
// "zonder doel" overal hetzelfde betekent. Een doel met een datum of het hoofddoel is "doel";
// een doel van de soort Fit blijven of Sterker worden is zelf de richting.
export function activeDirection(
  settings: { direction?: unknown },
  goals: readonly Pick<TrainingGoal, 'id' | 'status' | 'kind' | 'targetDate'>[],
  milestones: Ladder,
): ActiveDirection {
  if (goals.length > 0) {
    if (mainGoal(goals, milestones, 'live') || goals.some((g) => !!g.targetDate)) return { kind: 'goal' };
    const light = goals.find((g) => g.kind === 'fit' || g.kind === 'stronger');
    if (light && goals.every((g) => g.kind === 'fit' || g.kind === 'stronger')) {
      return { kind: 'direction', id: light.kind === 'stronger' ? 'stronger' : 'maintain', chosen: true };
    }
    return { kind: 'goal' };
  }
  const chosen = parseDirection(settings.direction);
  return { kind: 'direction', id: chosen ?? ADVICE_DIRECTION, chosen: chosen !== undefined };
}

export function directionSpec(id: DirectionId): DirectionSpec {
  return DIRECTIONS[id];
}

const ceil5 = (n: number) => Math.ceil(n / 5) * 5;

// De tel-minuten waarmee de richting begint. Fitter worden begint bij je gemiddelde van de
// laatste vier weken, naar boven op 5, niet onder het minimum en niet boven het plafond;
// zonder geschiedenis is dat het advies. De andere richtingen hebben een vast getal.
export function startMinutes(id: DirectionId, recentAverage?: number): number {
  const spec = DIRECTIONS[id];
  if (id !== 'improve' || recentAverage === undefined || !(recentAverage > 0)) return spec.minutes.value;
  return Math.min(MINUTES_CEILING, Math.max(IMPROVE_FLOOR, ceil5(recentAverage)));
}

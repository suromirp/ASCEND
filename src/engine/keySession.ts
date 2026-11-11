// ASCEND: de sleuteltraining, één definitie voor de hele app
// (docs/beslissingen/2026-11-11-sleuteltraining.md). De sleuteltraining is de training die je doel het
// meest dient: bij een 10 km de tempo- of intervaltraining, bij een tocht de bergtocht met rugzak, zonder
// doel wat je richting vraagt. Ascend noemt de volgende (`nextKeySession`), het inhalen haalt alleen deze
// in (`engine/adviceWeek.ts`). Puur: geen React, geen IndexedDB. Dit plant niets: het zegt alleen welke
// geplande training het woord krijgt.

import { variantOf, GOAL_KINDS } from '../data/goalKinds';
import type { DirectionId } from '../data/directions';
import type { GoalKindId, TrainingGoal } from '../models/goals';
import type { LeavePeriod } from '../models/leave';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { addDays } from '../utils/dates';
import { activeDirection } from './direction';
import { goalDetailsOf, goalKindOf } from './goalLabels';
import { listedGoals } from './goalList';
import type { Ladder } from './mainGoal';
import { hasRole } from './templateRoles';

// Waar de sleuteltraining naar kijkt: de soort van het doel bovenaan Ascend, of de richting zonder doel.
// `{ goal: undefined }` is een doel zonder soort (een oud doel): dan geldt wat altijd gold, de lange
// duurloop of de bergtocht.
export type KeyFocus =
  | { goal: GoalKindId | undefined; variant?: string }
  | { direction: DirectionId };

export const DEFAULT_KEY_FOCUS: KeyFocus = { goal: undefined };

type Tpl = Pick<SessionTemplate, 'id' | 'name' | 'type' | 'roles' | 'sport'>;
type Test = (t: Tpl) => boolean;

// De bouwstenen. Een rol op het sjabloon gaat voor; de naam vangt een eigen sjabloon zonder rol.
const longRun: Test = (t) => (hasRole(t, 'long') && hasRole(t, 'easy_pace')) || /lange duurloop/i.test(t.name);
const mountainHike: Test = (t) => (hasRole(t, 'long') && !hasRole(t, 'easy_pace')) || t.id === 'tpl_hike_day_one' || /bergtocht/i.test(t.name);
const ruck: Test = (t) => hasRole(t, 'ruck');
const ride: Test = (t) => t.sport === 'cycling';
// De kwaliteitstraining: tempo of intervallen (`blocks`), en heuvelintervallen (`hills`) als kwaliteit van
// de basis. Voor een snelle afstand gaat het specifieke werk voor de heuvels.
const blocks: Test = (t) => hasRole(t, 'blocks');
const hills: Test = (t) => hasRole(t, 'hills');
const quality: Test = (t) => blocks(t) || hills(t);
const gymStrength: Test = (t) => hasRole(t, 'strength');
const any = (...tests: Test[]): Test => (t) => tests.some((f) => f(t));

// Per focus de treden: de eerste trede met een training wint, binnen een trede de langste. Een lege
// lijst: geen sleuteltraining (Rustig aan).
function tiersFor(focus: KeyFocus): Test[] {
  if ('direction' in focus) {
    switch (focus.direction) {
      case 'stronger': return [gymStrength];
      case 'easy': return [];
      case 'maintain':
      case 'improve': return [any(longRun, mountainHike, ride)];
    }
  }
  switch (focus.goal) {
    case 'run_race':
      // Marathon: de lange duurloop eerst. Tot en met de halve telt snelheid (de meter Snelheid,
      // data/goalKinds.ts), dus eerst de tempo- of intervaltraining, dan de heuvels, dan de lange duurloop.
      return focus.variant === 'marathon' ? [longRun, quality] : [blocks, hills, longRun];
    case 'trail': return [any(longRun, mountainHike), quality];
    case 'trek_hut':
    case 'trek_tent':
    case 'day_hike':
    case 'mountaineering': return [mountainHike, ruck, longRun];
    case 'bike': return [ride, longRun];
    case 'triathlon': return [any(ride, longRun), quality];
    case 'stronger': return [gymStrength];
    case 'fit': return [any(longRun, mountainHike, ride)];
    case undefined: return [any(longRun, mountainHike)];
  }
}

// De trede van een sjabloon voor deze focus (0 is de beste), of undefined als het geen sleuteltraining is.
// Een rustdag of herstel is het nooit, een test of wedstrijd ook niet: die hebben hun eigen naam.
export function keyRank(template: Tpl, focus: KeyFocus = DEFAULT_KEY_FOCUS): number | undefined {
  if (template.type === 'recovery' || hasRole(template, 'test') || hasRole(template, 'race')) return undefined;
  const i = tiersFor(focus).findIndex((f) => f(template));
  return i < 0 ? undefined : i;
}

export function isKeyFor(template: Tpl, focus: KeyFocus = DEFAULT_KEY_FOCUS): boolean {
  return keyRank(template, focus) !== undefined;
}

// De naam voor in een regel: "de tempo- of intervaltraining of de lange duurloop".
export function keyPhrase(focus: KeyFocus = DEFAULT_KEY_FOCUS): string | undefined {
  if ('direction' in focus) {
    if (focus.direction === 'stronger') return 'de krachttraining';
    if (focus.direction === 'easy') return undefined;
    return 'de langste duurtraining';
  }
  switch (focus.goal) {
    case 'run_race': return focus.variant === 'marathon' ? 'de lange duurloop of de tempoloop' : 'de tempo- of intervaltraining of de lange duurloop';
    case 'trail': return 'de lange duurloop of bergtocht, of de heuvelintervallen';
    case 'trek_hut':
    case 'trek_tent':
    case 'day_hike':
    case 'mountaineering': return 'de bergtocht, de rugzakwandeling of de lange duurloop';
    case 'bike': return 'de fietstocht of de lange duurloop';
    case 'triathlon': return 'de fietstocht of de lange duurloop';
    case 'stronger': return 'de krachttraining';
    case 'fit': return 'de langste duurtraining';
    case undefined: return 'de lange duurloop of de bergtocht';
  }
}

// De focus uit wat de app al weet: het doel bovenaan Ascend (dezelfde lijst als de tab), of de richting
// zonder doel (engine/direction.ts#activeDirection).
export function keyFocusOf(goals: readonly TrainingGoal[], ladder: Ladder, today: string, settings: { direction?: unknown }): KeyFocus {
  const ids = ladder instanceof Set ? (ladder as ReadonlySet<string>) : new Set((ladder as readonly { goalId: string }[]).map((m) => m.goalId));
  const listed = listedGoals(goals, ids, today);
  const active = activeDirection(settings, listed.map((l) => l.goal), ladder);
  if (active.kind === 'direction') return { direction: active.id };
  const top = listed[0]?.goal;
  if (!top) return DEFAULT_KEY_FOCUS;
  const kind = goalKindOf(top);
  if (!kind || !GOAL_KINDS[kind]) return DEFAULT_KEY_FOCUS;
  return { goal: kind, variant: variantOf(kind, goalDetailsOf(top)) };
}

export interface NextKeySession {
  sessionId: string;
  date: string;
  name: string;
  minutes: number;
}

const AWAY: ReadonlySet<LeavePeriod['kind']> = new Set(['no_training', 'trek']);

// De volgende sleuteltraining in de komende twee weken (vandaag telt mee) die nog niet gedaan is. Eerst
// de beste trede, dan de langste, dan de vroegste. Een overgeslagen training telt niet, net als een
// training in een vakantie zonder training of een eigen tocht. `minutesOf` geeft de lengte zoals de
// schermen die tonen; zonder valt het terug op 0. Undefined: niets dat past, en dan toont Ascend geen regel.
export function nextKeySession(
  sessions: readonly PlannedSession[],
  templates: readonly SessionTemplate[],
  logs: readonly SessionLog[],
  today: string,
  focus: KeyFocus = DEFAULT_KEY_FOCUS,
  minutesOf?: (session: PlannedSession, template: SessionTemplate) => number | undefined,
  leave: readonly LeavePeriod[] = [],
): NextKeySession | undefined {
  const until = addDays(today, 13);
  const byId = new Map(templates.map((t) => [t.id, t]));
  const done = new Set(logs.map((l) => l.plannedSessionId).filter((x): x is string => !!x));
  const away = (d: string) => leave.some((p) => AWAY.has(p.kind) && d >= p.startDate && d <= p.endDate);
  let best: (NextKeySession & { rank: number }) | undefined;
  for (const s of sessions) {
    const t = byId.get(s.templateId);
    if (!t || s.status === 'skipped' || done.has(s.id)) continue;
    if (s.scheduledDate < today || s.scheduledDate > until || away(s.scheduledDate)) continue;
    const rank = keyRank(t, focus);
    if (rank === undefined) continue;
    const minutes = s.plannedMinutes ?? minutesOf?.(s, t) ?? 0;
    const better = !best
      || rank < best.rank
      || (rank === best.rank && (minutes > best.minutes
        || (minutes === best.minutes && (s.scheduledDate < best.date || (s.scheduledDate === best.date && s.id < best.sessionId)))));
    if (better) best = { sessionId: s.id, date: s.scheduledDate, name: t.name, minutes, rank };
  }
  return best && { sessionId: best.sessionId, date: best.date, name: best.name, minutes: best.minutes };
}

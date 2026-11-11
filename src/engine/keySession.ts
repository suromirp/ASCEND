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
import type { Program } from '../models/program';
import { addDays, mondayOfWeek } from '../utils/dates';
import { activeDirection } from './direction';
import { effectivePriority, goalDetailsOf, goalKindOf } from './goalLabels';
import { listedGoals } from './goalList';
import { mainGoal, type Ladder } from './mainGoal';
import { hasRole } from './templateRoles';
import { resolveVariantDuration } from './substitutions';

// Waar de sleuteltraining naar kijkt: de soort van het doel bovenaan Ascend, of de richting zonder doel.
// `{ goal: undefined }` is een doel zonder soort (een oud doel): dan geldt wat altijd gold, de lange
// duurloop of de bergtocht.
export type KeyFocus =
  | { goal: GoalKindId | undefined; variant?: string }
  | { direction: DirectionId };

export const DEFAULT_KEY_FOCUS: KeyFocus = { goal: undefined };

type Tpl = Pick<SessionTemplate, 'id' | 'name' | 'type' | 'roles' | 'sport'>;
// Een soort sleuteltraining: hoe je hem herkent, en hoe hij heet in een zin.
interface Kind { test: (t: Tpl) => boolean; label: string }

// De bouwstenen. Een rol op het sjabloon gaat voor; de naam vangt een eigen sjabloon zonder rol.
const LONG_RUN: Kind = { label: 'de lange duurloop', test: (t) => (hasRole(t, 'long') && hasRole(t, 'easy_pace')) || /lange duurloop/i.test(t.name) };
const MOUNTAIN_HIKE: Kind = { label: 'de bergtocht', test: (t) => (hasRole(t, 'long') && !hasRole(t, 'easy_pace')) || /bergtocht/i.test(t.name) };
const HIKE_DAY: Kind = { label: 'de wandeldag', test: (t) => t.id === 'tpl_hike_day_one' };
const RUCK: Kind = { label: 'de rugzakwandeling', test: (t) => hasRole(t, 'ruck') };
const RIDE: Kind = { label: 'de fietstocht', test: (t) => t.sport === 'cycling' };
// De kwaliteitstraining: tempo of intervallen (`blocks`), en heuvelintervallen (`hills`) als kwaliteit van
// de basis. Voor een snelle afstand gaat het specifieke werk voor de heuvels.
const BLOCKS: Kind = { label: 'de tempoloop of de intervallen', test: (t) => hasRole(t, 'blocks') };
const HILLS: Kind = { label: 'de heuvelintervallen', test: (t) => hasRole(t, 'hills') };
const STRENGTH: Kind = { label: 'de krachttraining', test: (t) => hasRole(t, 'strength') };

// Per focus de treden: binnen een week wint de eerste trede met een training, binnen een trede de langste.
// Een lege lijst: geen sleuteltraining (Rustig aan).
function tiersFor(focus: KeyFocus): Kind[][] {
  if ('direction' in focus) {
    switch (focus.direction) {
      case 'stronger': return [[STRENGTH]];
      case 'easy': return [];
      case 'maintain':
      case 'improve': return [[LONG_RUN, MOUNTAIN_HIKE, HIKE_DAY, RIDE]];
    }
  }
  switch (focus.goal) {
    case 'run_race':
      // Marathon: de lange duurloop eerst. Tot en met de halve telt snelheid (de meter Snelheid,
      // data/goalKinds.ts), dus eerst de tempo- of intervaltraining, dan de heuvels, dan de lange duurloop.
      return focus.variant === 'marathon' ? [[LONG_RUN], [BLOCKS, HILLS]] : [[BLOCKS], [HILLS], [LONG_RUN]];
    case 'trail': return [[LONG_RUN, MOUNTAIN_HIKE, HIKE_DAY], [BLOCKS, HILLS]];
    case 'trek_hut':
    case 'trek_tent':
    case 'day_hike':
    case 'mountaineering': return [[MOUNTAIN_HIKE, HIKE_DAY], [RUCK], [LONG_RUN]];
    case 'bike': return [[RIDE], [LONG_RUN]];
    case 'triathlon': return [[RIDE, LONG_RUN], [BLOCKS, HILLS]];
    case 'stronger': return [[STRENGTH]];
    case 'fit': return [[LONG_RUN, MOUNTAIN_HIKE, HIKE_DAY, RIDE]];
    case undefined: return [[LONG_RUN, MOUNTAIN_HIKE, HIKE_DAY]];
  }
}

const kindOf = (template: Tpl, focus: KeyFocus): { rank: number; kind: Kind } | undefined => {
  if (template.type === 'recovery' || hasRole(template, 'test') || hasRole(template, 'race')) return undefined;
  const tiers = tiersFor(focus);
  for (let rank = 0; rank < tiers.length; rank++) {
    const kind = tiers[rank].find((k) => k.test(template));
    if (kind) return { rank, kind };
  }
  return undefined;
};

// De trede van een sjabloon voor deze focus (0 is de beste), of undefined als het geen sleuteltraining is.
// Een rustdag of herstel is het nooit, een test of wedstrijd ook niet: die hebben hun eigen naam.
export function keyRank(template: Tpl, focus: KeyFocus = DEFAULT_KEY_FOCUS): number | undefined {
  return kindOf(template, focus)?.rank;
}

export function isKeyFor(template: Tpl, focus: KeyFocus = DEFAULT_KEY_FOCUS): boolean {
  return keyRank(template, focus) !== undefined;
}

// Hoe deze sleuteltraining heet in de zin van `keyPhrase` ("de heuvelintervallen").
export function keyLabel(template: Tpl, focus: KeyFocus = DEFAULT_KEY_FOCUS): string | undefined {
  return kindOf(template, focus)?.kind.label;
}

// Alles wat als sleuteltraining telt, in volgorde: "de tempoloop of de intervallen, de heuvelintervallen of
// de lange duurloop". Undefined: geen sleuteltraining (Rustig aan).
export function keyPhrase(focus: KeyFocus = DEFAULT_KEY_FOCUS): string | undefined {
  const labels = tiersFor(focus).flat().map((k) => k.label);
  if (labels.length === 0) return undefined;
  return labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(', ')} of ${labels.at(-1)}`;
}

const PRIORITY_RANK: Record<string, number> = { top: 0, voortop: 1, verkenning: 2 };

// Het doel waar de sleuteltraining naar kijkt: het hoofddoel dat de planning volgt (mainGoal). Zonder hoofddoel
// het actieve doel met het hoogste label, dan de vroegste datum. Nooit de volgorde van de lijst: slepen zonder
// Akkoord verandert dus niet wat het inhalen voorstelt. Een gepauzeerd of gearchiveerd doel telt niet.
export function keyGoalOf(goals: readonly TrainingGoal[], ladder: Ladder): TrainingGoal | undefined {
  const main = mainGoal(goals, ladder);
  if (main) return main;
  return goals
    .filter((g) => g.status === 'active')
    .sort((a, b) => (PRIORITY_RANK[effectivePriority(a, undefined)] ?? 9) - (PRIORITY_RANK[effectivePriority(b, undefined)] ?? 9)
      || (a.targetDate ?? '9999').localeCompare(b.targetDate ?? '9999') || a.id.localeCompare(b.id))[0];
}

// De focus uit wat de app al weet: het doel van `keyGoalOf`, of de richting zonder doel
// (engine/direction.ts#activeDirection).
export function keyFocusOf(goals: readonly TrainingGoal[], ladder: Ladder, today: string, settings: { direction?: unknown }): KeyFocus {
  const ids = ladder instanceof Set ? (ladder as ReadonlySet<string>) : new Set((ladder as readonly { goalId: string }[]).map((m) => m.goalId));
  const listed = listedGoals(goals, ids, today);
  const active = activeDirection(settings, listed.map((l) => l.goal), ladder);
  if (active.kind === 'direction') return { direction: active.id };
  const goal = keyGoalOf(listed.map((l) => l.goal), ids);
  if (!goal) return DEFAULT_KEY_FOCUS;
  const kind = goalKindOf(goal);
  if (!kind || !GOAL_KINDS[kind]) return DEFAULT_KEY_FOCUS;
  return { goal: kind, variant: variantOf(kind, goalDetailsOf(goal)) };
}

export interface NextKeySession {
  sessionId: string;
  date: string;
  name: string;
  minutes: number;
}

const AWAY: ReadonlySet<LeavePeriod['kind']> = new Set(['no_training', 'trek']);

type Row = Pick<PlannedSession, 'id' | 'templateId' | 'scheduledDate' | 'plannedMinutes'>;
type Templates = Iterable<SessionTemplate> | ReadonlyMap<string, SessionTemplate>;
const mapOf = (templates: Templates): ReadonlyMap<string, SessionTemplate> =>
  templates instanceof Map ? templates as ReadonlyMap<string, SessionTemplate> : new Map([...(templates as Iterable<SessionTemplate>)].map((t) => [t.id, t]));

// De lengte waarop een sleutel wordt vergeleken: wat de rij zegt, anders wat de schermen tonen (de volle
// versie in deze week van je programma). Dezelfde voor `nextKeySession` en `weekKeySession`.
function minutesOf(s: Row, t: SessionTemplate, program: Program | null | undefined): number {
  return s.plannedMinutes ?? resolveVariantDuration(t, 'full', s.scheduledDate, program);
}

// Beter dan `best`? Eerst de trede, dan de langste, dan de vroegste, dan een vaste volgorde op id.
const beats = (a: { rank: number; minutes: number; date: string; id: string }, b: typeof a | undefined) =>
  !b || a.rank < b.rank || (a.rank === b.rank && (a.minutes > b.minutes
    || (a.minutes === b.minutes && (a.date < b.date || (a.date === b.date && a.id < b.id)))));

// De sleuteltraining onder deze trainingen (bijvoorbeeld die van één week).
export function weekKeySession<S extends Row>(sessions: readonly S[], templates: Templates, focus: KeyFocus = DEFAULT_KEY_FOCUS, program?: Program | null): S | undefined {
  const byId = mapOf(templates);
  let best: { s: S; rank: number; minutes: number; date: string; id: string } | undefined;
  for (const s of sessions) {
    const t = byId.get(s.templateId);
    const rank = t ? keyRank(t, focus) : undefined;
    if (!t || rank === undefined) continue;
    const c = { s, rank, minutes: minutesOf(s, t, program), date: s.scheduledDate, id: s.id };
    if (beats(c, best)) best = c;
  }
  return best?.s;
}

// De volgende sleuteltraining in de komende twee weken (vandaag telt mee) die nog niet gedaan is: de
// sleuteltraining van de eerste week waarin er nog een staat, gekozen zoals `weekKeySession`. Zo noemt
// Ascend de lange duurloop van morgen, niet die van volgende week omdat die tien minuten langer is. Een
// overgeslagen training telt niet, net als een training in een vakantie zonder training of een eigen tocht.
// Undefined: niets dat past, en dan toont Ascend geen regel.
export function nextKeySession(
  sessions: readonly PlannedSession[],
  templates: readonly SessionTemplate[],
  logs: readonly SessionLog[],
  today: string,
  focus: KeyFocus = DEFAULT_KEY_FOCUS,
  program?: Program | null,
  leave: readonly LeavePeriod[] = [],
): NextKeySession | undefined {
  const until = addDays(today, 13);
  const byId = mapOf(templates);
  const done = new Set(logs.map((l) => l.plannedSessionId).filter((x): x is string => !!x));
  const away = (d: string) => leave.some((p) => AWAY.has(p.kind) && d >= p.startDate && d <= p.endDate);
  const open = sessions.filter((s) => s.status !== 'skipped' && !done.has(s.id) && s.scheduledDate >= today && s.scheduledDate <= until && !away(s.scheduledDate));
  const weeks = [...new Set(open.map((s) => mondayOfWeek(s.scheduledDate)))].sort();
  for (const week of weeks) {
    const key = weekKeySession(open.filter((s) => mondayOfWeek(s.scheduledDate) === week), byId, focus, program);
    if (key) return { sessionId: key.id, date: key.scheduledDate, name: byId.get(key.templateId)!.name, minutes: minutesOf(key, byId.get(key.templateId)!, program) };
  }
  return undefined;
}

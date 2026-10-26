// ASCEND: de afstand tussen doelen en botsingen (ronde 2b, regels 3 tot 6 uit
// docs/onderzoek/Meerdere doelen en prioriteit.md, vastgelegd in
// docs/beslissingen/2026-10-26-planning-met-labels.md).
//
// Twee doelen die te dicht op elkaar liggen kunnen niet allebei een piek zijn. Deze functie
// zegt dat in gewone woorden, met de rekensom erbij, en wat ASCEND zou voorstellen. Ze
// verandert niets: de bevindingen komen in het voorstel met Akkoord als een doel wordt
// toegevoegd of verplaatst (storage/horizonPlan.ts). "Toch allebei" bewaar je op het doel
// (`TrainingGoal.conflictAccepted`, de datum van het andere doel); de veiligheidsgrenzen tussen
// zware beendagen blijven altijd (engine/weekValidator.ts).
//
// De regels, met de sterkte van het bewijs (er is geen studie naar twee pieken; Pyne 2009):
// - Twee Tops: minstens het grootste van 42 dagen en herstel van de eerste + 21 dagen
//   heropbouw + afbouw van de tweede (expert voor de uitkomst, afgeleid voor de som).
// - Een Voortop voor een Top: niet in de afbouw van die Top en niet binnen 10 dagen ervoor, en
//   minstens herstel van de Voortop + 7 dagen gewone training + afbouw van de Top (expert).
// - Een doel na een ander: niet binnen het herstel van dat andere doel (afgeleid).
// - Oplossen in vaste volgorde, voor het doel dat het laagste label heeft (bij gelijk label het
//   doel dat lager in de lijst staat): de afbouw inkorten (Voortop tot 3 dagen, Top tot 7), dan
//   een label lager, dan eerlijk melden dat het niet past (afgeleid, expert voor de volgorde).
// De dagen zelf komen uit data/goalKinds.ts en zijn de startwaarden van het advies.
//
// Puur: geen React, geen IndexedDB.

import type { GoalDetails, GoalKindId, GoalPriority, TrainingGoal } from '../models/goals';
import { recoveryDaysFor, taperDaysFor } from '../data/goalKinds';
import { daysBetween, formatDateNL } from '../utils/dates';
import { effectivePriority, goalDetailsOf, goalKindOf, PRIORITY_NAME } from './goalLabels';
import { mainGoal } from './mainGoal';

export const TOP_TOP_MIN_DAYS = 42;
export const TOP_REBUILD_DAYS = 21;
export const VOORTOP_REBUILD_DAYS = 7;
export const VOORTOP_BEFORE_TOP_MIN_DAYS = 10;
// Hoe kort een afbouw ten minste blijft als hij wordt ingekort, per label.
export const MIN_TAPER_DAYS: Record<GoalPriority, number> = { top: 7, voortop: 3, verkenning: 0 };

const RANK: Record<GoalPriority, number> = { top: 0, voortop: 1, verkenning: 2 };
const LOWER: Record<GoalPriority, GoalPriority | undefined> = { top: 'voortop', voortop: 'verkenning', verkenning: undefined };

// Wat de botsingsregels van een doel moeten weten. `order`: de plek in de lijst (lager getal =
// hoger in de lijst). `taperDays`: een eigen kortere afbouw.
export interface ConflictGoal {
  id: string;
  name: string;
  date: string;
  kind: GoalKindId;
  priority: GoalPriority;
  details: GoalDetails;
  order: number;
  taperDays?: number;
  accepted: string[];
}

export type ConflictRule = 'TOP-TOP' | 'VOORTOP-VOOR-TOP' | 'NA-HERSTEL' | 'IN-AFBOUW';

export type ConflictResolution =
  // De afbouw van `goalId` wordt `taperDays` dagen.
  | { kind: 'shorten_taper'; taperDays: number }
  // `goalId` krijgt een label lager, eventueel met een kortere afbouw.
  | { kind: 'lower_label'; to: GoalPriority; taperDays?: number }
  // Het past niet; allebei blijven staan en de dagen eromheen blijven licht.
  | { kind: 'tell' };

export interface GoalConflict {
  rule: ConflictRule;
  // Het doel dat wijkt: het laagste label, bij gelijk label het doel lager in de lijst.
  goalId: string;
  otherGoalId: string;
  // Het eerste en het tweede doel in de tijd.
  firstId: string;
  secondId: string;
  gapDays: number;
  neededDays: number;
  resolution: ConflictResolution;
  // De bevinding in gewone woorden, met de som.
  message: string;
  // Wat ASCEND voorstelt, in gewone woorden.
  suggestion: string;
}

// --- van doelen naar wat de regels lezen -------------------------------------------

// De doelen in de volgorde van de lijst. Alleen actieve doelen met een datum en een bekende soort
// doen mee. `mainGoalId` is het hoofddoel met de ladder (altijd Top).
export function conflictGoalsFrom(goals: TrainingGoal[], mainGoalId: string | undefined): ConflictGoal[] {
  const out: ConflictGoal[] = [];
  goals.forEach((g, order) => {
    const kind = goalKindOf(g);
    if (g.status !== 'active' || !g.targetDate || !kind) return;
    out.push({
      id: g.id, name: g.name || 'Je doel', date: g.targetDate, kind, priority: effectivePriority(g, mainGoalId),
      details: goalDetailsOf(g), order: g.order ?? order, taperDays: g.taperDays, accepted: g.conflictAccepted ?? [],
    });
  });
  return out;
}

export function conflictsForGoals(goals: TrainingGoal[], milestoneGoalIds: ReadonlySet<string>, today: string): GoalConflict[] {
  return goalConflicts(conflictGoalsFrom(goals, mainGoal(goals, milestoneGoalIds)?.id), today);
}

// "Toch allebei" bewaart het paar van beide datums. Verschuift een van beide doelen, dan is het een
// ander paar en komt de melding terug. (Een los bewaarde datum van het andere doel, uit een eerdere
// versie, telt nog zoals het deed.)
export const conflictPairKey = (dateA: string, dateB: string) => (dateA <= dateB ? `${dateA}|${dateB}` : `${dateB}|${dateA}`);
const isAccepted = (a: ConflictGoal, b: ConflictGoal) => {
  const pair = conflictPairKey(a.date, b.date);
  return a.accepted.includes(pair) || b.accepted.includes(pair) || a.accepted.includes(b.date) || b.accepted.includes(a.date);
};

// --- de som --------------------------------------------------------------------------

const recovery = (g: ConflictGoal) => recoveryDaysFor(g.kind, g.details).value;
const taperOf = (g: ConflictGoal, priority: GoalPriority) => {
  const advice = taperDaysFor(g.kind, priority, g.details).value;
  return g.taperDays !== undefined ? Math.min(advice, g.taperDays) : advice;
};

interface Need {
  rule: ConflictRule;
  days: number;
  // De delen van de som, en hun totaal (kleiner dan `days` als een ondergrens geldt).
  parts: string[];
  sum: number;
}

// Hoeveel dagen er minstens tussen `a` (eerder) en `b` (later) moeten zitten, als ze deze labels
// hebben en `b` een afbouw van `taperB` dagen krijgt. Het herstel volgt de soort en de afstand van
// `a`, niet zijn label; alleen wie rustig meedoet (Verkenning) herstelt in de helft van de dagen.
function needBetween(a: ConflictGoal, aPriority: GoalPriority, bPriority: GoalPriority, taperB: number): Need | undefined {
  const full = recovery(a);
  const rec = aPriority === 'verkenning' ? Math.ceil(full / 2) : full;
  const make = (rule: ConflictRule, floor: number, parts: [string, number][]): Need | undefined => {
    const live = parts.filter(([, n]) => n > 0);
    const sum = live.reduce((t, [, n]) => t + n, 0);
    const days = Math.max(floor, sum);
    return days > 0 ? { rule, days, sum, parts: live.map(([text, n]) => `${dag(n)} ${text}`) } : undefined;
  };
  if (bPriority === 'top') {
    if (aPriority === 'top') return make('TOP-TOP', TOP_TOP_MIN_DAYS, [['herstel', rec], ['opbouw', TOP_REBUILD_DAYS], ['afbouw', taperB]]);
    if (aPriority === 'voortop') return make('VOORTOP-VOOR-TOP', VOORTOP_BEFORE_TOP_MIN_DAYS, [['herstel', rec], ['gewoon trainen', VOORTOP_REBUILD_DAYS], ['afbouw', taperB]]);
    // Een verkenning vlak voor een Top: niet in de afbouw van die Top.
    return make('IN-AFBOUW', 0, [['afbouw', taperB]]);
  }
  if (bPriority === 'voortop') return make('NA-HERSTEL', 0, [['herstel', rec], ['afbouw', taperB]]);
  return make('NA-HERSTEL', 0, [['herstel', rec]]);
}

// --- de bevindingen --------------------------------------------------------------------

const dag = (n: number) => `${n} ${n === 1 ? 'dag' : 'dagen'}`;
const label = (p: GoalPriority) => PRIORITY_NAME[p];

function sentence(first: ConflictGoal, second: ConflictGoal, gap: number, need: Need, firstP: GoalPriority, secondP: GoalPriority): string {
  const head = `Je ${label(firstP)}-doel ${first.name} staat op ${formatDateNL(first.date)} en je ${label(secondP)}-doel ${second.name} op ${formatDateNL(second.date)}: ${dag(gap)} ertussen.`;
  const owner = need.rule === 'IN-AFBOUW' ? second.name : first.name;
  const verb = need.rule === 'IN-AFBOUW' ? 'heeft' : 'vraagt';
  const sum = need.parts.length > 1 ? `${need.parts.join(' en ')}, samen ${dag(need.sum)}` : need.parts[0];
  const floor = need.rule === 'TOP-TOP' && need.days > need.sum ? ` Tussen twee Top-doelen zit sowieso minstens ${dag(TOP_TOP_MIN_DAYS)}.` : '';
  return `${head} ${owner} ${verb} ${sum}.${floor} Dat past niet.`;
}

function suggestion(c: { resolution: ConflictResolution; goal: ConflictGoal; priority: GoalPriority }): string {
  const { resolution, goal, priority } = c;
  if (resolution.kind === 'shorten_taper') {
    return `Voorstel: de afbouw van ${goal.name} wordt ${dag(resolution.taperDays)} in plaats van ${dag(taperOf(goal, priority))}. Dan past het.`;
  }
  if (resolution.kind === 'lower_label') {
    const short = resolution.taperDays !== undefined ? ` met een afbouw van ${dag(resolution.taperDays)}` : '';
    return `Voorstel: ${goal.name} wordt ${label(resolution.to)}${short}. Dan past het, en je opbouw naar het andere doel blijft zoals hij was.`;
  }
  if (priority === 'verkenning') {
    return `${goal.name} doe je als training mee. ASCEND houdt de dagen eromheen licht.`;
  }
  return 'ASCEND kan dit niet oplossen met een kortere afbouw of een lager label. Kies je toch allebei, dan plant ASCEND zoals je wilt en houdt de dagen eromheen licht, maar je kunt niet voor allebei pieken. De grenzen tussen zware beendagen blijven.';
}

// Alle botsingen tussen de doelen op deze datum, nieuw en oud. Doelen in het verleden en doelen
// waarvoor je "toch allebei" koos (met de datum van het andere doel) doen niet mee.
export function goalConflicts(goals: ConflictGoal[], today: string): GoalConflict[] {
  const ahead = goals.filter((g) => g.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order);
  const out: GoalConflict[] = [];
  for (let i = 0; i < ahead.length; i++) {
    for (let j = i + 1; j < ahead.length; j++) {
      const a = ahead[i];
      const b = ahead[j];
      if (isAccepted(a, b)) continue;
      const gap = daysBetween(a.date, b.date);
      const need = needBetween(a, a.priority, b.priority, taperOf(b, b.priority));
      if (!need || gap >= need.days) continue;
      // Wie wijkt: het laagste label, bij gelijk label het doel lager in de lijst.
      const loser = RANK[a.priority] !== RANK[b.priority] ? (RANK[a.priority] > RANK[b.priority] ? a : b) : a.order > b.order ? a : b;
      const resolution = resolve(a, b, loser, gap);
      const goal = loser;
      const other = loser === a ? b : a;
      out.push({
        rule: need.rule, goalId: goal.id, otherGoalId: other.id, firstId: a.id, secondId: b.id, gapDays: gap, neededDays: need.days, resolution,
        message: sentence(a, b, gap, need, a.priority, b.priority),
        suggestion: suggestion({ resolution, goal, priority: goal.priority }),
      });
    }
  }
  return out;
}

// De vaste volgorde voor het doel dat wijkt: eerst zijn afbouw inkorten, dan een label lager
// (waarna weer eerst de afbouw), dan eerlijk melden.
function resolve(a: ConflictGoal, b: ConflictGoal, loser: ConflictGoal, gap: number): ConflictResolution {
  const isSecond = loser === b;
  let priority: GoalPriority | undefined = loser.priority;
  let lowered = false;
  while (priority) {
    const asA = !isSecond ? { aP: priority, bP: b.priority, taper: taperOf(b, b.priority) } : { aP: a.priority, bP: priority, taper: taperOf(b, priority) };
    const need = needBetween(a, asA.aP, asA.bP, asA.taper);
    if (!need || gap >= need.days) return lowered ? { kind: 'lower_label', to: priority } : { kind: 'tell' };
    // Alleen de afbouw van het latere doel telt in de som; die kan korter tot de ondergrens van zijn label.
    if (isSecond) {
      const min = MIN_TAPER_DAYS[priority];
      for (let t = asA.taper - 1; t >= min; t--) {
        const shorter = needBetween(a, asA.aP, asA.bP, t);
        if (shorter && gap >= shorter.days) return lowered ? { kind: 'lower_label', to: priority, taperDays: t } : { kind: 'shorten_taper', taperDays: t };
        if (!shorter) break;
      }
    }
    priority = LOWER[priority];
    lowered = true;
  }
  return { kind: 'tell' };
}

// --- wat een voorstel ermee doet --------------------------------------------------------

const keyOf = (c: GoalConflict) => `${c.rule}|${c.firstId}|${c.secondId}|${c.gapDays}`;

// De botsingen die er na een verandering bij zijn gekomen: niet al bestaande, niet wat je al
// aanvaardde (dat doen de doelen zelf al niet meer mee).
export function newConflicts(before: GoalConflict[], after: GoalConflict[]): GoalConflict[] {
  const known = new Set(before.map(keyOf));
  return after.filter((c) => !known.has(keyOf(c)));
}

// "Toch allebei": het doel dat moest wijken onthoudt het paar van beide datums, zodat de
// melding niet terugkomt zolang allebei blijven. Geeft alleen de doelen terug die veranderen.
export function acceptConflicts(goals: TrainingGoal[], conflicts: GoalConflict[]): TrainingGoal[] {
  const byId = new Map(goals.map((g) => [g.id, g]));
  const patched = new Map<string, TrainingGoal>();
  for (const c of conflicts) {
    const goal = patched.get(c.goalId) ?? byId.get(c.goalId);
    const other = byId.get(c.otherGoalId);
    if (!goal || !other?.targetDate) continue;
    const dates = new Set(goal.conflictAccepted ?? []);
    if (!goal.targetDate) continue;
    dates.add(conflictPairKey(goal.targetDate, other.targetDate));
    patched.set(goal.id, { ...goal, conflictAccepted: [...dates].sort() });
  }
  return [...patched.values()];
}

// Het voorstel van ASCEND uitvoeren op het doel dat wijkt: een kortere afbouw en/of een label lager.
// `planRole` blijft kloppen met het label (voortop = tussendoel, verkenning = meedoen als training).
export function applyResolution(goal: TrainingGoal, resolution: ConflictResolution): TrainingGoal {
  if (resolution.kind === 'tell') return goal;
  const next: TrainingGoal = { ...goal };
  if (resolution.kind === 'lower_label') {
    next.priority = resolution.to;
    if (resolution.to === 'voortop') next.planRole = 'secondary';
    if (resolution.to === 'verkenning') { next.planRole = 'track'; next.priorityChosen = true; } // jouw Akkoord op het voorstel
    if (resolution.taperDays !== undefined) next.taperDays = resolution.taperDays;
    else delete next.taperDays;
  } else {
    next.taperDays = resolution.taperDays;
  }
  return next;
}

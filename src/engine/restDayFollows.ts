// ASCEND: de rustdag schuift mee (I-162). Zet jij een training op een dag met je rustdag, dan biedt ASCEND aan de
// rustdag naar de dag te zetten die vrijkwam. Een voorstel met Akkoord: jouw verplaatsing blijft altijd staan, Liever
// niet laat alles zoals jij het sleepte. Puur en deterministisch: geen React, geen opslag, geen klok.
//
// Welke dag:
// - de vrijgekomen dag, als die in de week van de rustdag ligt, niet voorbij is (vandaag telt nog niet als voorbij),
//   vrij is (geen rij die zichtbaar op die dag staat) en buiten een vakantie, tocht of vrije dagen valt;
// - anders de dichtstbijzijnde vrije dag van die week vanaf vandaag, gemeten vanaf waar de rustdag stond; bij gelijke
//   afstand de latere dag (rust na de training die nu op die dag staat);
// - nooit een dag direct naast een test of wedstrijd: daar regelt de rust voor de test of de raceweek de rust al;
// - geen vrije dag: geen voorstel.
// De rustdag blijft in zijn eigen week: een rustdag van maandag schuift niet naar de zondag ervoor.

import type { LeavePeriod } from '../models/leave';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { ScheduleProposal } from './scheduler';
import { hiddenFromDay } from './dayPlan';
import { isTestOrRace } from './templateRoles';
import { addDays, daysBetween, mondayOfWeek, weekdayShortNL, weekDates } from '../utils/dates';

// Periodes waarin een rustdag niets toevoegt: je traint er al niet. Zonder sportschool train je wel.
const QUIET_KINDS: ReadonlySet<LeavePeriod['kind']> = new Set(['no_training', 'trek', 'free_days']);

export interface RestDayFollowInput {
  // Het plan na jouw verplaatsing (de training staat al op zijn nieuwe dag), met de weken eromheen.
  sessions: readonly PlannedSession[];
  movedId: string;
  // De dag waar de training stond.
  fromDate: string;
  templateById: ReadonlyMap<string, SessionTemplate>;
  logs: readonly Pick<SessionLog, 'plannedSessionId'>[];
  today: string;
  leave?: readonly LeavePeriod[];
  // Rustdag of Hersteldag (instelling Op je rustdag): het woord in het voorstel.
  restTitle: string;
}

const dayWord = (iso: string) => `${weekdayShortNL(iso).toLowerCase()} ${Number(iso.slice(8, 10))}`;

export function restDayFollowProposal(input: RestDayFollowInput): ScheduleProposal | undefined {
  const { sessions, templateById, today } = input;
  const moved = sessions.find((s) => s.id === input.movedId);
  const movedTemplate = moved ? templateById.get(moved.templateId) : undefined;
  if (!moved || !movedTemplate || movedTemplate.type === 'recovery' || moved.scheduledDate === input.fromDate) return undefined;
  const toDate = moved.scheduledDate;
  if (toDate < today) return undefined;
  const logged = new Set(input.logs.map((l) => l.plannedSessionId).filter(Boolean));
  const isRest = (s: PlannedSession) => templateById.get(s.templateId)?.type === 'recovery';
  // De rustdag op de nieuwe dag: open, van het plan of van jou, niet van een periode (die zet hem zelf terug).
  const rests = sessions.filter((s) => s.scheduledDate === toDate && isRest(s) && s.status !== 'skipped' && !logged.has(s.id));
  if (rests.length !== 1 || rests[0].leave) return undefined;
  const rest = rests[0];

  const visible = sessions.filter((s) => !hiddenFromDay(s, templateById) && s.status !== 'skipped');
  const taken = (date: string) => visible.some((s) => s.id !== rest.id && s.scheduledDate === date);
  const quiet = (date: string) => (input.leave ?? []).some((p) => QUIET_KINDS.has(p.kind) && p.startDate <= date && p.endDate >= date);
  const testOrRaceDays = new Set(visible.flatMap((s) => { const t = templateById.get(s.templateId); return t && isTestOrRace(t) ? [s.scheduledDate] : []; }));
  const besideTest = (date: string) => testOrRaceDays.has(addDays(date, -1)) || testOrRaceDays.has(addDays(date, 1));
  const week = weekDates(mondayOfWeek(toDate));
  const fits = (date: string) => date !== toDate && date >= today && week.includes(date) && !taken(date) && !quiet(date) && !besideTest(date);

  let target: string | undefined;
  let vacated = false;
  if (fits(input.fromDate)) {
    target = input.fromDate;
    vacated = true;
  } else {
    const byDistance = week.filter(fits).sort((a, b) => Math.abs(daysBetween(toDate, a)) - Math.abs(daysBetween(toDate, b)) || b.localeCompare(a));
    target = byDistance[0];
  }
  if (!target) return undefined;

  const word = input.restTitle.toLowerCase();
  const name = movedTemplate.name;
  const reason = vacated
    ? `${name} staat nu op je ${word}. Je ${word} kan naar ${dayWord(target)}, die dag is nu vrij.`
    : `${name} staat nu op je ${word}. Je ${word} kan naar ${dayWord(target)}, de vrije dag die het dichtst bij ligt.`;
  return {
    changes: [{ sessionId: rest.id, templateId: rest.templateId, templateName: input.restTitle, fromDate: toDate, toDate: target }],
    reason,
    resolved: true,
  };
}

// Eén blad in plaats van twee (I-163): jouw verplaatsing en de rustdag die meeschuift staan samen in één voorstel,
// met één Akkoord. Eén melding dus, en Ongedaan maken zet beide terug (ook jouw sleep). De zin van de verplaatsing
// blijft voorop, daarna wat er met je rustdag kan. Liever niet laat alles zoals het was.
export function withRestDayFollow(move: ScheduleProposal, follow: ScheduleProposal): ScheduleProposal {
  return {
    ...move,
    changes: [...move.changes, ...follow.changes],
    reason: [move.reason, follow.reason].filter(Boolean).join(' '),
  };
}

// Na jouw verplaatsing (slepen of het blad, engine/weekDrag.ts#decideMove): het plan zoals het daarna staat, en het
// voorstel voor de rustdag. Geen voorstel na overslaan, Toch doen of ruilen; een rustdag zelf verplaatsen ook niet.
export function restDayFollowAfterMove(move: ScheduleProposal, input: Omit<RestDayFollowInput, 'movedId' | 'fromDate'>): ScheduleProposal | undefined {
  const own = move.changes[0];
  if (!own || move.swap || own.restore || own.toDate === own.fromDate) return undefined;
  const to = new Map(move.changes.filter((c) => !c.restore && c.toDate !== c.fromDate).map((c) => [c.sessionId, c.toDate]));
  const sessions = input.sessions.map((s) => (to.has(s.id) ? { ...s, scheduledDate: to.get(s.id)! } : s));
  return restDayFollowProposal({ ...input, sessions, movedId: own.sessionId, fromDate: own.fromDate });
}

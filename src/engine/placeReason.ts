// ASCEND: "Waarom staat dit hier?" bij een training in Week
// (docs/beslissingen/2026-11-02-week-en-vandaag-hulp.md).
//
// Alleen uit wat er al bewaard is: het slot op de rij (`PlannedSession.lock`, met het voorstel en
// het moment van Akkoord), de sporen die de planningsronde zelf op de rij zet (`catchUp`, `leave`,
// `raceBlock`, `afterGoal`, `movedFromDate`), de voorstellen in het logboek van wijzigingen en de
// dag van het weekpatroon (engine/planPass.ts#patternDays). Niets nieuws wordt opgeslagen. Weet de
// app het niet, dan zegt hij dat eerlijk.
//
// Puur: geen React, geen opslag.

import type { PlannedSession } from '../models/training';
import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import type { LeavePeriod } from '../models/leave';
import { formatWeekdayDayMonthNL, isoWeekday, localDateOf, weekdayLongNL } from '../utils/dates';
import { capitalize } from '../utils/capitalize';

type PlaceReasonKind = 'catchUp' | 'proposal' | 'yours' | 'leave' | 'rule' | 'pattern' | 'unknown';

export interface PlaceReason {
  kind: PlaceReasonKind;
  // De reden van de plek, in een of twee zinnen.
  text: string;
  // Wat een voorstel of de planning verder aan de training veranderde, zonder de plek te bepalen.
  extra?: string;
}

export interface PlaceReasonInput {
  session: PlannedSession;
  proposals: PlanChangeProposal[];
  // De vaste weekdag (1 maandag tot 7 zondag) van deze training in het weekpatroon, als hij erin staat.
  patternDay?: number;
  leavePeriods?: LeavePeriod[];
}

// Zonder vaste dag in het weekpatroon en zonder ander spoor.
export const UNKNOWN_PLACE = 'Waarom precies deze dag, is niet bewaard.';
const WEEKDAYS_LONG = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];

// Het weekpatroon heeft een andere vaste dag dan de dag waarop hij nu staat.
function otherPatternDay(patternDay: number, date: string): string {
  return `Je weekpatroon zet hem op ${WEEKDAYS_LONG[patternDay - 1]}. Waarom hij nu op ${weekdayLongNL(date)} staat, is niet bewaard.`;
}

const day = (iso: string) => formatWeekdayDayMonthNL(iso);
const momentDay = (moment: string) => day(localDateOf(moment));

const MOVING: PlanChangeItem['action'][] = ['move', 'swap', 'add', 'keep'];

interface Found {
  proposal: PlanChangeProposal;
  item?: PlanChangeItem;
}

function revertedIds(proposals: PlanChangeProposal[]): Set<string> {
  return new Set(proposals.map((p) => p.revertsProposalId).filter((id): id is string => !!id));
}

function itemFor(p: PlanChangeProposal, sessionId: string): PlanChangeItem | undefined {
  return [...p.changes].reverse().find((c) => c.plannedSessionId === sessionId && MOVING.includes(c.action));
}

// Het voorstel achter het slot: eerst het id op het slot, anders het laatste aangenomen en niet
// teruggedraaide voorstel dat deze rij noemt.
function proposalFor(session: PlannedSession, proposals: PlanChangeProposal[]): Found | undefined {
  const byId = session.lock?.proposalId ? proposals.find((p) => p.id === session.lock!.proposalId) : undefined;
  if (byId) return { proposal: byId, item: itemFor(byId, session.id) };
  const reverted = revertedIds(proposals);
  const candidates = proposals
    .filter((p) => p.resolution === 'accepted' && !p.revertsProposalId && !reverted.has(p.id) && itemFor(p, session.id))
    .sort((a, b) => (b.resolvedAt ?? b.createdAt).localeCompare(a.resolvedAt ?? a.createdAt));
  const p = candidates[0];
  return p ? { proposal: p, item: itemFor(p, session.id) } : undefined;
}

const moved = (s: PlannedSession) => !!s.movedFromDate && s.movedFromDate !== s.scheduledDate;

function leaveName(period: LeavePeriod | undefined): string {
  if (!period) return 'een vrije periode';
  if (period.kind === 'trek') return period.trek?.name ? `je tocht "${period.trek.name}"` : 'je tocht';
  if (period.kind === 'no_training') return 'je vakantie';
  return 'je vrije dagen';
}


// De plek zonder slot: wat de planningsronde zelf op de rij zette, of het weekpatroon.
function systemReason(s: PlannedSession, input: PlaceReasonInput): PlaceReason {
  const fromLine = s.movedFromDate && moved(s) ? ` Hij stond op ${day(s.movedFromDate)}.` : '';
  if (s.leave) {
    const period = input.leavePeriods?.find((p) => p.id === s.leave!.periodId);
    if (s.leave.role === 'placed') return { kind: 'leave', text: `${capitalize(leaveName(period))} zette hem hier.` };
    if (s.leave.role === 'moved') return { kind: 'leave', text: `Hij schoof hierheen voor ${leaveName(period)}.${fromLine}` };
  }
  if (s.raceBlock && s.raceBlock.from !== s.scheduledDate) {
    return { kind: 'rule', text: `De planning ruilde hem van ${day(s.raceBlock.from)} naar hier, zodat je tempoloop of test niet naast zware benen staat.` };
  }
  const extra = s.afterGoal ? `Na je doel van ${day(s.afterGoal.date)} maakte de planning er een rustige loop van.` : undefined;
  if (moved(s)) return { kind: 'rule', text: `De planning schoof hem hierheen van ${day(s.movedFromDate!)}. Welke regel dat was, is niet bewaard.`, ...(extra ? { extra } : {}) };
  if (input.patternDay !== undefined && input.patternDay === isoWeekday(s.scheduledDate)) {
    return { kind: 'pattern', text: `Volgens je weekpatroon: deze training staat op ${weekdayLongNL(s.scheduledDate)}.`, ...(extra ? { extra } : {}) };
  }
  const text = input.patternDay !== undefined && input.patternDay >= 1 && input.patternDay <= 7 ? otherPatternDay(input.patternDay, s.scheduledDate) : UNKNOWN_PLACE;
  return { kind: 'unknown', text, ...(extra ? { extra } : {}) };
}

export function placeReason(input: PlaceReasonInput): PlaceReason {
  const s = input.session;
  if (s.catchUp) return { kind: 'catchUp', text: `Verplaatst: hij stond op ${day(s.catchUp.fromDate)} en ging toen niet door.` };

  if (s.lock?.by === 'proposal') {
    const found = proposalFor(s, input.proposals);
    const at = found?.proposal.resolvedAt ?? s.lock.at;
    if (!found) return { kind: 'proposal', text: `Via een voorstel, Akkoord op ${momentDay(at)}.` };
    const { proposal, item } = found;
    // Een voorstel dat de training op zijn dag liet (een andere lengte, een test op de dag van
    // een harde loop): de plek komt van ergens anders, het voorstel staat erbij.
    if (item && item.fromDate && item.toDate && item.fromDate === item.toDate && item.action === 'move') {
      const what = item.templateId ? 'de training' : 'de lengte';
      // Alleen het spoor van dit voorstel zelf (dezelfde dag) gaat weg; een eerdere verplaatsing blijft.
      const base = systemReason(s.movedFromDate === s.scheduledDate ? { ...s, movedFromDate: undefined } : s, input);
      return { ...base, extra: `Het voorstel "${proposal.issue}" (Akkoord op ${momentDay(at)}) veranderde alleen ${what}.` };
    }
    const from = item?.fromDate && item.toDate && item.fromDate !== item.toDate ? `Verplaatst van ${day(item.fromDate)} via` : 'Via';
    const reason = item?.reason?.trim();
    return { kind: 'proposal', text: `${from} het voorstel "${proposal.issue}", Akkoord op ${momentDay(at)}.${reason ? ` ${reason}` : ''}` };
  }

  if (s.lock?.by === 'user') {
    if (moved(s)) return { kind: 'yours', text: `Je zette hem hier zelf neer op ${momentDay(s.lock.at)}. Hij stond op ${day(s.movedFromDate!)}.` };
    return { kind: 'yours', text: `Je zette hem zelf vast op deze dag, op ${momentDay(s.lock.at)}.` };
  }

  // Oudere gegevens: een verplaatsing van jou zonder slot.
  if (s.status === 'moved' && moved(s)) return { kind: 'yours', text: `Je verplaatste hem zelf. Hij stond op ${day(s.movedFromDate!)}.` };

  return systemReason(s, input);
}

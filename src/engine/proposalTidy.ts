// ASCEND: oude voorstellen samenvatten (docs/beslissingen/2026-10-31-data-lange-termijn.md).
//
// Elk voorstel dat je ooit zag, blijft in planChangeProposals staan, met alle wijzigingen, de
// andere keuzes en de uitleg erbij: ongeveer 3,4 KB per stuk. Na een paar maanden leest geen
// scherm die details nog. Dit rekent uit welke beslisregels samengevat mogen worden, en hoe die
// samenvatting eruitziet. Er wordt niets weggegooid: de regel zelf blijft, kleiner.
//
// Samengevat wordt alleen een voorstel dat
// - beslist is (Akkoord of Liever niet, met een moment van beslissen); een open voorstel nooit;
// - ouder is dan de grens (standaard 3 maanden), en waarvan alles wat het raakte ook voor die grens
//   lag (de oude en nieuwe dag van elke wijziging, en de dag van elke training die het noemt);
// - niet door een geplande training wordt aangewezen (PlannedSession.lock.proposalId);
// - niet bij een ongedaan maken hoort (het ongedaan maken zelf of wat het terugdraaide);
// - niet bij een vrije periode of tocht hoort die nog bestaat (het weghalen ervan leest het voorstel).
//
// Wat de samenvatting houdt: id, soort, titel (issue), datum, het moment van beslissen, de uitslag,
// de verwijzingen (revertsProposalId, leavePeriodId) en het aantal wijzigingen. Van een aangenomen
// voorstel blijven de trainingen die het uit de planning haalde staan (alleen actie en id), want
// engine/weekLogs.ts#leftOutOfCount leest die voor de hele geschiedenis: zo telt een training die
// ASCEND zelf weghaalde ook later niet als gemist.
//
// Puur: geen React, geen IndexedDB. SessionLog en MilestoneProgress komen hier niet in beeld.

import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import type { PlannedSession } from '../models/training';
import { localDateOf } from '../utils/dates';

// De keuzes van "Oude voorstellen opruimen": 0 is uit.
export const PROPOSAL_TIDY_OPTIONS = [0, 3, 6, 12] as const;
export type ProposalTidyMonths = (typeof PROPOSAL_TIDY_OPTIONS)[number];
export const DEFAULT_PROPOSAL_TIDY_MONTHS: ProposalTidyMonths = 3;

export function resolveProposalTidyMonths(value: unknown): ProposalTidyMonths {
  return (PROPOSAL_TIDY_OPTIONS as readonly unknown[]).includes(value) ? (value as ProposalTidyMonths) : DEFAULT_PROPOSAL_TIDY_MONTHS;
}

// De dag precies `months` maanden voor `today` (31 mei min 3 maanden is 28 of 29 februari).
export function monthsBefore(today: string, months: number): string {
  const [y, m, d] = today.slice(0, 10).split('-').map(Number);
  const total = y * 12 + (m - 1) - months;
  const year = Math.floor(total / 12);
  const month = total - year * 12;
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(d, last);
  return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export interface TidyContext {
  plannedSessions: readonly Pick<PlannedSession, 'id' | 'scheduledDate' | 'lock'>[];
  // De id's van de vrije periodes en tochten die nu bestaan (AppSettings.leavePeriods).
  leavePeriodIds: readonly string[];
  today: string;
  months: number;
  // Het moment van samenvatten, voor `summarizedAt`.
  now: string;
}

const isDecided = (p: PlanChangeProposal) => (p.resolution === 'accepted' || p.resolution === 'rejected') && typeof p.resolvedAt === 'string';

function datesOf(item: PlanChangeItem, sessionDate: Map<string, string>): string[] {
  const out: string[] = [];
  if (item.fromDate) out.push(item.fromDate);
  if (item.toDate) out.push(item.toDate);
  if (item.newSessionDraft?.scheduledDate) out.push(item.newSessionDraft.scheduledDate);
  for (const id of [item.plannedSessionId, item.pairedWithSessionId]) {
    const day = id ? sessionDate.get(id) : undefined;
    if (day) out.push(day);
  }
  return out;
}

function periodIdsOf(p: PlanChangeProposal): string[] {
  const ids = (p.changes ?? []).map((c) => c.leave?.periodId).filter((id): id is string => !!id);
  return p.leavePeriodId ? [p.leavePeriodId, ...ids] : ids;
}

// De kleine vorm van een beslist voorstel. Blijft een geldig PlanChangeProposal, zodat elke lezer
// en de import het gewoon kunnen lezen.
export function summarizeProposal(p: PlanChangeProposal, now: string): PlanChangeProposal {
  const changes = p.changes ?? [];
  const removed: PlanChangeItem[] = p.resolution === 'accepted'
    ? changes.filter((c) => c.action === 'remove' && c.plannedSessionId).map((c) => ({ action: 'remove', plannedSessionId: c.plannedSessionId }))
    : [];
  const summary: PlanChangeProposal = {
    id: p.id,
    trigger: p.trigger,
    issue: p.issue,
    changes: removed,
    alternatives: [],
    consequences: '',
    explanation: '',
    createdAt: p.createdAt,
    resolvedAt: p.resolvedAt,
    resolution: p.resolution,
    summarizedAt: now,
    changeCount: changes.filter((c) => c.action !== 'keep').length,
  };
  if (p.revertsProposalId) summary.revertsProposalId = p.revertsProposalId;
  if (p.leavePeriodId) summary.leavePeriodId = p.leavePeriodId;
  return summary;
}

// De voorstellen die nu samengevat mogen worden, al in hun kleine vorm. Een voorstel dat al
// samengevat is, komt er niet nog eens in: twee keer draaien geeft hetzelfde.
export function proposalsToSummarize(proposals: readonly PlanChangeProposal[], ctx: TidyContext): PlanChangeProposal[] {
  if (!(ctx.months > 0)) return [];
  const cutoff = monthsBefore(ctx.today, ctx.months);
  const locked = new Set(ctx.plannedSessions.map((s) => s.lock?.proposalId).filter((id): id is string => !!id));
  const reverted = new Set(proposals.map((p) => p.revertsProposalId).filter((id): id is string => !!id));
  const periods = new Set(ctx.leavePeriodIds);
  const sessionDate = new Map(ctx.plannedSessions.map((s) => [s.id, s.scheduledDate]));

  const out: PlanChangeProposal[] = [];
  for (const p of proposals) {
    if (p.summarizedAt || !isDecided(p)) continue;
    if (typeof p.createdAt !== 'string' || localDateOf(p.createdAt) >= cutoff || localDateOf(p.resolvedAt!) >= cutoff) continue;
    if (locked.has(p.id) || reverted.has(p.id) || p.revertsProposalId) continue;
    if (periodIdsOf(p).some((id) => periods.has(id))) continue;
    const touched = (p.changes ?? []).flatMap((c) => datesOf(c, sessionDate));
    if (touched.some((day) => day.slice(0, 10) >= cutoff)) continue;
    out.push(summarizeProposal(p, ctx.now));
  }
  return out;
}

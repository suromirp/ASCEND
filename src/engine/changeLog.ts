// ASCEND — change log (Fase 3): what ASCEND changed on the calendar, when,
// and why — read straight from the append-only PlanChangeProposal audit
// trail. Nothing new is stored for it; this only makes the existing record
// readable (Week page timeline, "aangepast" badges, weekly reflection).

import type { PlanChangeItem, PlanChangeProposal, EngineEvent } from '../models/planChange';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { describeChanges } from './changeImpact';
import { caughtUpMap } from './catchUp';
import { capitalize } from '../utils/capitalize';
import { addDays, formatDateNL, mondayOfWeek, localDateOf, weekdayLongNL, weekdayShortNL } from '../utils/dates';

const TRIGGER_LABEL: Record<EngineEvent, string> = {
  goal_created: 'Nieuw doel',
  goal_changed: 'Doel aangepast',
  goal_removed: 'Doel verwijderd',
  goal_paused: 'Doel gepauzeerd',
  strategy_changed: 'Instelling gewijzigd',
  goal_priority_changed: 'Doelprioriteit',
  session_completed: 'Training gelogd',
  session_skipped: 'Advies',
  session_moved: 'Sessie verplaatst',
  no_time_today: 'Geen tijd vandaag',
  injury_added: 'Blessure',
  injury_resolved: 'Blessure hersteld',
  illness_reported: 'Ziek gemeld',
  illness_resolved: 'Weer beter',
  availability_changed: 'Beschikbaarheid',
  new_training_data: 'Nieuwe trainingsdata',
  strength_program_changed: 'Krachtblok',
  schedule_anomaly_detected: 'Planning rechtgezet',
  weekly_prescription_computed: 'Weekplanning',
  plan_check: 'Weekcontrole',
  leave_added: 'Vrije periode toegevoegd',
  leave_removed: 'Vrije periode verwijderd',
  leave_note: 'Notitie bij een vrije periode',
  week_load_changed: 'Rustweek of herhaalde week',
  direction_changed: 'Je richting',
  wave_review: 'Na je golf',
};

export interface ChangeLogEntry {
  id: string;
  at: string; // ISO datetime
  label: string;
  issue: string;
  undone: boolean;
  lines: string[];
  reasons: string[];
  explanation: string;
}

function revertedIds(proposals: PlanChangeProposal[]): Set<string> {
  return new Set(proposals.map((p) => p.revertsProposalId).filter((id): id is string => Boolean(id)));
}

export function buildChangeLog(proposals: PlanChangeProposal[], sessions: PlannedSession[], templates: SessionTemplate[], sinceIso: string): ChangeLogEntry[] {
  const reverted = revertedIds(proposals);
  return proposals
    .filter((p) => p.resolvedAt && localDateOf(p.createdAt) >= sinceIso)
    .filter((p) => p.changes.some((c) => c.action !== 'keep') || p.resolution === 'rejected')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((p) => ({
      id: p.id,
      at: p.createdAt,
      label: TRIGGER_LABEL[p.trigger] ?? p.trigger,
      issue: p.issue,
      undone: p.resolution === 'rejected' || reverted.has(p.id),
      lines: describeChanges(p.changes, sessions, templates),
      reasons: [...new Set(p.changes.map((c) => c.reason).filter((r): r is string => Boolean(r)))],
      explanation: p.explanation,
    }));
}

// The latest accepted reason per session that ASCEND moved or re-dosed in
// the last `days` days — what the "aangepast" badge explains.
export function adjustedSessionReasons(proposals: PlanChangeProposal[], asOf: string, days = 14): Map<string, string> {
  const since = addDays(asOf, -days);
  const result = new Map<string, string>();
  const reverted = revertedIds(proposals);
  const accepted = proposals
    .filter((p) => p.resolution === 'accepted' && !reverted.has(p.id) && localDateOf(p.createdAt) >= since)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const p of accepted) {
    for (const c of p.changes) {
      if (!c.plannedSessionId || !['move', 'swap', 'reduce', 'replace'].includes(c.action)) continue;
      result.set(c.plannedSessionId, c.reason ?? p.issue);
    }
  }
  return result;
}

// "Volgende week verandert": the changes made in the last 7 days that land
// in next week.
export function nextWeekChangeLines(proposals: PlanChangeProposal[], sessions: PlannedSession[], templates: SessionTemplate[], asOf: string): string[] {
  const nextWeek = addDays(mondayOfWeek(asOf), 7);
  const since = addDays(asOf, -7);
  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const lines: string[] = [];
  const reverted = revertedIds(proposals);
  for (const p of proposals.filter((x) => x.resolution === 'accepted' && !reverted.has(x.id) && localDateOf(x.createdAt) >= since)) {
    const relevant = p.changes.filter((c) => {
      const date = c.toDate ?? c.newSessionDraft?.scheduledDate ?? (c.plannedSessionId ? sessionById.get(c.plannedSessionId)?.scheduledDate : undefined);
      return date !== undefined && mondayOfWeek(date) === nextWeek;
    });
    lines.push(...describeChanges(relevant, sessions, templates));
  }
  return [...new Set(lines)];
}

// Production feedback: the full change log was "te aanwezig" and a stack
// of "Weekprescriptie bijgewerkt" entries told the user nothing. The Week
// page now shows only what actually changed in the week being viewed:
// one line per session, its latest change, and only while that change is
// still what the calendar shows (a session moved again, restored or
// deleted since then drops out). Undo proposals themselves never show.
export interface WeekChange {
  key: string;
  line: string;
  reason: string;
  at: string;
}

export function weekChanges(
  proposals: PlanChangeProposal[],
  sessions: PlannedSession[],
  templates: SessionTemplate[],
  weekStart: string,
  asOf: string,
  days = 14,
): WeekChange[] {
  const since = addDays(asOf, -days);
  const weekEnd = addDays(weekStart, 6);
  const inWeek = (d?: string) => d !== undefined && d >= weekStart && d <= weekEnd;
  const reverted = revertedIds(proposals);
  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const latest = new Map<string, WeekChange>();

  const accepted = proposals
    .filter((p) => p.resolution === 'accepted' && !p.revertsProposalId && !reverted.has(p.id) && localDateOf(p.createdAt) >= since)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const p of accepted) {
    for (const c of p.changes) {
      if (c.action === 'keep') continue;
      const session = c.plannedSessionId ? sessionById.get(c.plannedSessionId) : undefined;
      if (!inWeek(c.toDate) && !inWeek(c.fromDate) && !inWeek(c.newSessionDraft?.scheduledDate) && !inWeek(session?.scheduledDate)) continue;

      let stillTrue: boolean;
      switch (c.action) {
        case 'add': {
          const draft = c.newSessionDraft;
          stillTrue = !!draft && sessions.some((s) => s.templateId === draft.templateId && s.scheduledDate === draft.scheduledDate && s.status !== 'skipped');
          break;
        }
        case 'remove':
          stillTrue = session?.status === 'skipped';
          break;
        case 'move':
        case 'swap':
          stillTrue = !!session && session.status !== 'skipped' && session.scheduledDate === c.toDate;
          break;
        default:
          stillTrue = !!session && session.status !== 'skipped';
      }
      const key = c.plannedSessionId ?? `${c.newSessionDraft?.templateId}:${c.newSessionDraft?.scheduledDate}`;
      if (!stillTrue) {
        latest.delete(key);
        continue;
      }
      const line = describeChanges([c], sessions, templates)[0];
      if (!line) continue;
      latest.set(key, { key, line, reason: c.reason ?? p.issue, at: p.createdAt });
    }
  }
  return [...latest.values()].sort((a, b) => b.at.localeCompare(a.at));
}

// ---------------------------------------------------------------------------
// Aangepast door ASCEND (docs/beslissingen/2026-11-12-week-minimaal.md, docs/visie/Ontwerp Week minimaal.md
// hoofdstuk 3). Eén functie, één venster: de rij in Week, het blad erachter en het woord "aangepast" op de
// dagrij lezen allemaal deze uitkomst, zodat er nooit twee getallen zijn. Alleen lezen van het log; er wordt
// niets opgeslagen of herschreven.
//
// Een regel staat er alleen als:
// - de app de wijziging bedacht. Week opnieuw plannen vroeg je zelf (`engine/replanWeek.ts`) en de eerste
//   opbouw van je plan bij een nieuw doel is geen aanpassing: die geven geen regel, en wat ze neerlegden
//   wist een eerdere regel van dezelfde training.
// - de training er nu nog zo staat.
// - het meer is dan de weekplanning die de inhoud van een training invult (`replace` en `reduce` van
//   weekly_prescription_computed): dat gebeurt elke week en zou elke rij "aangepast" maken.
// - er echt iets anders staat dan daarvoor: een toevoeging met een verwijdering van dezelfde training op
//   dezelfde dag, of een training die binnen het venster terug op zijn oude dag kwam, is geen wijziging.
// - niemand anders hem daarna neerlegde: met jouw slot op de rij (je sleepte of verplaatste hem zelf, ook
//   weg en weer terug) of het slot van een ander voorstel is er geen regel. Bij twijfel geen regel, zoals in
//   `engine/systemMoves.ts`.
// Een training die Week niet als rij toont (de oude rij van een inhaal, een overgeslagen rustdag, wat een
// vakantie liet vallen) krijgt ook geen regel: de band of de nieuwe rij zegt het al.

export const ADJUST_WINDOW_DAYS = 14;

// Voorstellen die het systeem zelf toepast; binnen zoveel seconden vastgelegd is "vanzelf".
const AUTO_TRIGGERS = new Set<EngineEvent>(['weekly_prescription_computed', 'strength_program_changed', 'plan_check']);
const AUTO_SECONDS = 10;
const REPLAN_BY = 'engine/replanWeek.ts';

export interface WeekAdjustment {
  sessionId: string;
  name: string; // de naam van de training
  what: string; // "van vr 13 naar za 14", "erbij op zo 15"
  date: string; // waar de training nu staat
  reason: string;
  at: string; // wanneer het besloten is
  how?: 'akkoord' | 'vanzelf'; // leeg als het log het niet zeker zegt
}

const dayShort = (iso: string) => `${weekdayShortNL(iso).toLowerCase()} ${Number(iso.slice(8, 10))}`;

function notAChange(p: PlanChangeProposal): boolean {
  return p.trigger === 'goal_created' || p.id.startsWith('replan') || p.changes.some((c) => c.generatedBy?.includes(REPLAN_BY));
}

function howDecided(p: PlanChangeProposal): WeekAdjustment['how'] {
  if (!p.resolvedAt) return undefined;
  const gap = Math.abs(Date.parse(p.resolvedAt) - Date.parse(p.createdAt)) / 1000;
  if (!Number.isFinite(gap)) return undefined;
  if (gap > AUTO_SECONDS) return 'akkoord';
  return AUTO_TRIGGERS.has(p.trigger) ? 'vanzelf' : undefined;
}

// "Dinsdag 10 november, na jouw Akkoord" of "Dinsdag 10 november, vanzelf met een melding".
export function decidedLine(a: Pick<WeekAdjustment, 'at' | 'how'>): string {
  const day = localDateOf(a.at);
  const date = `${capitalize(weekdayLongNL(day))} ${formatDateNL(day)}`;
  if (a.how === 'akkoord') return `${date}, na jouw Akkoord`;
  if (a.how === 'vanzelf') return `${date}, vanzelf met een melding`;
  return date;
}

export function weekAdjustments(
  proposals: PlanChangeProposal[],
  sessions: PlannedSession[],
  templates: SessionTemplate[],
  weekStart: string,
  asOf: string,
): WeekAdjustment[] {
  const since = addDays(asOf, -ADJUST_WINDOW_DAYS);
  const weekEnd = addDays(weekStart, 6);
  const reverted = revertedIds(proposals);
  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const templateById = new Map(templates.map((t) => [t.id, t]));
  const caughtUp = caughtUpMap(sessions);
  const latest = new Map<string, WeekAdjustment>();
  // Hoe een training stond voordat ASCEND hem in het venster voor het eerst aanraakte.
  const origin = new Map<string, { date: string; skipped: boolean }>();

  const accepted = proposals
    // Venster en volgorde lezen hetzelfde moment: wanneer het besloten is.
    .filter((p) => p.resolution === 'accepted' && !p.revertsProposalId && !reverted.has(p.id) && localDateOf(p.resolvedAt ?? p.createdAt) >= since)
    .sort((a, b) => (a.resolvedAt ?? a.createdAt).localeCompare(b.resolvedAt ?? b.createdAt));

  for (const p of accepted) {
    const own = (c: PlanChangeItem): PlannedSession | undefined => {
      if (c.plannedSessionId) return sessionById.get(c.plannedSessionId);
      const d = c.newSessionDraft;
      if (!d) return undefined;
      const same = sessions.filter((s) => s.templateId === d.templateId && s.scheduledDate === d.scheduledDate && s.status !== 'skipped');
      return same.find((s) => s.lock?.proposalId === p.id) ?? (same.length === 1 ? same[0] : undefined);
    };

    if (notAChange(p)) {
      for (const c of p.changes) {
        const s = own(c);
        if (s) { latest.delete(s.id); origin.delete(s.id); }
      }
      continue;
    }

    // Een toevoeging die hoort bij een verwijdering van dezelfde training op dezelfde dag, en een toevoeging
    // naast een verwijdering die niet meer te lezen is: geen wijziging, of twijfel.
    const removedHere = p.changes.filter((c) => c.action === 'remove' && c.plannedSessionId);
    const pairKey = (templateId: string, date: string) => `${templateId}|${date}`;
    const removedKeys = new Set(removedHere.map((c) => sessionById.get(c.plannedSessionId!)).filter((s): s is PlannedSession => !!s).map((s) => pairKey(s.templateId, s.scheduledDate)));
    const unreadableRemove = removedHere.some((c) => !sessionById.has(c.plannedSessionId!));
    const paired = new Set<PlanChangeItem>();
    for (const c of p.changes) {
      const d = c.action === 'add' && !c.plannedSessionId ? c.newSessionDraft : undefined;
      if (!d) continue;
      const key = pairKey(d.templateId, d.scheduledDate);
      if (removedKeys.has(key) || unreadableRemove) {
        paired.add(c);
        for (const r of removedHere) {
          const s = sessionById.get(r.plannedSessionId!);
          if (s && pairKey(s.templateId, s.scheduledDate) === key) paired.add(r);
        }
      }
    }

    for (const c of p.changes) {
      if (c.action === 'keep') continue;
      // De weekplanning vult elke week de inhoud van de komende trainingen in (lengte, blokken): dat is het
      // plan dat zijn werk doet, geen aanpassing. Verplaatsen, erbij en vervallen van die ronde tellen wel.
      if (p.trigger === 'weekly_prescription_computed' && (c.action === 'replace' || c.action === 'reduce')) continue;
      const s = own(c);
      if (!s) continue;
      // Wat ASCEND eerder in het venster met deze training deed; een nieuwe rij stond nergens ('').
      const known = origin.get(s.id);
      if (!known) origin.set(s.id, { date: c.action === 'add' && !c.plannedSessionId ? '' : c.fromDate ?? s.scheduledDate, skipped: c.action === 'add' && !!c.plannedSessionId });
      const drop = () => latest.delete(s.id);
      const undoneByNow = () => { drop(); origin.delete(s.id); };
      if (paired.has(c)) { drop(); continue; }
      // Iemand anders legde hem daarna neer: jij, of een ander voorstel.
      if (s.lock?.by === 'user' || (s.lock?.proposalId && s.lock.proposalId !== p.id)) { drop(); continue; }

      let what: string | undefined;
      switch (c.action) {
        case 'add': {
          const date = c.newSessionDraft?.scheduledDate ?? c.toDate;
          if (s.status === 'skipped' || !date || s.scheduledDate !== date) break;
          // Eerder in het venster door ASCEND van deze dag gehaald en nu terug: per saldo niets.
          if (c.plannedSessionId && known && !known.skipped && known.date === date) { undoneByNow(); continue; }
          what = c.plannedSessionId ? `weer op ${dayShort(date)}` : `erbij op ${dayShort(date)}`;
          break;
        }
        case 'remove':
          // Eerder in het venster door ASCEND erbij gezet en nu weer weg: per saldo niets.
          if (known && known.date === '') { undoneByNow(); continue; }
          if (s.status === 'skipped') what = `vervalt op ${dayShort(s.scheduledDate)}`;
          break;
        case 'move':
        case 'swap': {
          if (s.status === 'skipped' || !c.toDate || s.scheduledDate !== c.toDate) break;
          if (c.templateId && c.templateId !== s.templateId) break;
          const from = c.fromDate ?? known?.date;
          if (from && from !== c.toDate) {
            // Terug op de dag waar ASCEND hem vond: per saldo niets veranderd.
            if (known && known.date === c.toDate && !known.skipped && !c.templateId) { undoneByNow(); continue; }
            what = `van ${dayShort(from)} naar ${dayShort(c.toDate)}`;
          } else what = c.templateId ? `andere invulling op ${dayShort(c.toDate)}` : `andere lengte op ${dayShort(c.toDate)}`;
          break;
        }
        case 'reduce':
          if (s.status !== 'skipped') what = `lichter op ${dayShort(s.scheduledDate)}`;
          break;
        case 'replace':
          if (s.status !== 'skipped') what = `andere invulling op ${dayShort(s.scheduledDate)}`;
          break;
        default:
          break;
      }
      if (!what) { drop(); continue; }
      latest.set(s.id, {
        sessionId: s.id,
        name: templateById.get(s.templateId)?.name ?? 'Training',
        what,
        date: s.scheduledDate,
        reason: c.reason || p.issue,
        at: p.resolvedAt ?? p.createdAt,
        how: howDecided(p),
      });
    }
  }

  // Alleen wat Week als rij in deze week toont.
  const shown = (s: PlannedSession | undefined) => !!s && s.scheduledDate >= weekStart && s.scheduledDate <= weekEnd
    && !(s.status === 'skipped' && (caughtUp.has(s.id) || templateById.get(s.templateId)?.type === 'recovery' || s.leave?.role === 'dropped'));
  return [...latest.values()]
    .filter((a) => shown(sessionById.get(a.sessionId)))
    .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}

// De tweede regel van de rij: "2 trainingen deze week".
export function adjustmentsSub(n: number, current: boolean): string {
  return `${n} ${n === 1 ? 'training' : 'trainingen'}${current ? ' deze week' : ''}`;
}

// Het woord "aangepast" op de dagrij: precies de trainingen met een regel.
export function adjustedIdsOf(adjustments: WeekAdjustment[]): Set<string> {
  return new Set(adjustments.map((a) => a.sessionId));
}

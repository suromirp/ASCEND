import type { PlannedSession, SessionTemplate } from '../models/training';
import { addDays, daysBetween, mondayOfWeek, weekDates } from '../utils/dates';

// ASCEND's scheduling engine is deterministic on purpose (spec §16, §29):
// it never guesses and it never runs an LLM in the loop. A future AI layer
// may translate free-text ("I only have 30 minutes Wednesday") into
// constraints, but every constraint still flows through the plain functions
// below. UI components call these functions and render their output — they
// never re-implement the rules themselves.
//
// V1 enforces one rule concretely: two "leg-heavy" sessions (Onderlichaam or
// a hike) should not land within 48 hours of each other. Other rules from
// the brief (avoid stacking too many high-load days, preserve optional
// sessions last, etc.) are documented here as the natural next additions but
// are not yet enforced — see README "Roadmap".

const LEG_HEAVY_TEMPLATE_IDS = new Set(['tpl_lower', 'tpl_hike']);

export function isLegHeavy(templateId: string): boolean {
  return LEG_HEAVY_TEMPLATE_IDS.has(templateId);
}

export interface ScheduleChange {
  sessionId: string;
  templateId: string;
  templateName: string;
  fromDate: string;
  toDate: string;
}

export interface ScheduleProposal {
  changes: ScheduleChange[];
  reason: string;
  resolved: boolean;
}

function templateName(templates: Map<string, SessionTemplate>, id: string): string {
  return templates.get(id)?.name ?? id;
}

function isSlotFree(sessions: PlannedSession[], date: string, excludeId: string): boolean {
  return !sessions.some((s) => s.id !== excludeId && s.status !== 'skipped' && s.scheduledDate === date);
}

function conflictsWith(
  candidateDate: string,
  candidateTemplateId: string,
  sessions: PlannedSession[],
  templates: Map<string, SessionTemplate>,
  excludeId: string,
): boolean {
  if (!isLegHeavy(candidateTemplateId)) return false;
  return sessions.some((s) => {
    if (s.id === excludeId || s.status === 'skipped') return false;
    const other = templates.get(s.templateId);
    if (!other || !isLegHeavy(other.id)) return false;
    return Math.abs(daysBetween(s.scheduledDate, candidateDate)) <= 1;
  });
}

// Proposes moving one session to a new date, cascading a single conflicting
// leg-heavy session out of the way within the same week if needed. Returns a
// proposal for the UI to confirm — nothing is mutated here.
export function proposeMove(
  weekSessions: PlannedSession[],
  templates: SessionTemplate[],
  sessionId: string,
  targetDate: string,
): ScheduleProposal {
  const templateMap = new Map(templates.map((t) => [t.id, t]));
  const session = weekSessions.find((s) => s.id === sessionId);
  if (!session) return { changes: [], reason: 'Sessie niet gevonden.', resolved: false };

  const changes: ScheduleChange[] = [
    {
      sessionId: session.id,
      templateId: session.templateId,
      templateName: templateName(templateMap, session.templateId),
      fromDate: session.scheduledDate,
      toDate: targetDate,
    },
  ];

  // Simulate the week after this move.
  const simulated = weekSessions.map((s) => (s.id === sessionId ? { ...s, scheduledDate: targetDate } : s));

  const conflicting = simulated.find((s) => {
    if (s.id === sessionId || s.status === 'skipped') return false;
    const t = templateMap.get(s.templateId);
    if (!t || !isLegHeavy(t.id)) return false;
    const movedTemplate = templateMap.get(session.templateId);
    if (!movedTemplate || !isLegHeavy(movedTemplate.id)) return false;
    return Math.abs(daysBetween(s.scheduledDate, targetDate)) <= 1;
  });

  if (!conflicting) {
    return { changes, reason: 'Geen conflicten gevonden.', resolved: true };
  }

  // Try to find the conflicting session a free, non-conflicting day within
  // the same calendar week, preferring later days first.
  const monday = mondayOfWeek(targetDate);
  const candidates = weekDates(monday).filter((d) => d !== conflicting.scheduledDate);
  const ordered = [...candidates.filter((d) => d > conflicting.scheduledDate), ...candidates.filter((d) => d < conflicting.scheduledDate).reverse()];

  const newSpot = ordered.find(
    (d) =>
      isSlotFree(simulated, d, conflicting.id) &&
      !conflictsWith(d, conflicting.templateId, simulated, templateMap, conflicting.id),
  );

  if (newSpot) {
    changes.push({
      sessionId: conflicting.id,
      templateId: conflicting.templateId,
      templateName: templateName(templateMap, conflicting.templateId),
      fromDate: conflicting.scheduledDate,
      toDate: newSpot,
    });
    return {
      changes,
      reason: `Behoudt 48 uur hersteltijd tussen beenbelasting: ${templateName(templateMap, conflicting.templateId)} schuift op.`,
      resolved: true,
    };
  }

  return {
    changes,
    reason: `Let op: ${templateName(templateMap, conflicting.templateId)} valt nu binnen 48 uur van een andere zware beensessie. Geen vrije dag gevonden om dit automatisch op te lossen.`,
    resolved: false,
  };
}

export function skipSession(session: PlannedSession): PlannedSession {
  return { ...session, status: 'skipped' };
}

// "Geen tijd vandaag" — try to move every one of today's sessions to the
// next free day this week; falls back to skip if the week is full.
export function proposeNoTimeToday(
  weekSessions: PlannedSession[],
  templates: SessionTemplate[],
  todayDate: string,
): ScheduleProposal[] {
  const todaysSessions = weekSessions.filter((s) => s.scheduledDate === todayDate && s.status !== 'skipped');
  const proposals: ScheduleProposal[] = [];
  let working = weekSessions;

  for (const session of todaysSessions) {
    const monday = mondayOfWeek(todayDate);
    const candidates = weekDates(monday).filter((d) => d !== todayDate && d > todayDate);
    const freeDay = candidates.find((d) => isSlotFree(working, d, session.id));
    if (freeDay) {
      const proposal = proposeMove(working, templates, session.id, freeDay);
      proposals.push(proposal);
      working = working.map((s) => {
        const change = proposal.changes.find((c) => c.sessionId === s.id);
        return change ? { ...s, scheduledDate: change.toDate } : s;
      });
    } else {
      proposals.push({
        changes: [{ sessionId: session.id, templateId: session.templateId, templateName: templateName(new Map(templates.map((t) => [t.id, t])), session.templateId), fromDate: todayDate, toDate: todayDate }],
        reason: 'Geen vrije dag meer deze week — sessie wordt overgeslagen.',
        resolved: false,
      });
    }
  }
  return proposals;
}

export { addDays };

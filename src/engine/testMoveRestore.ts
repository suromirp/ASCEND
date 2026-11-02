// ASCEND: verplaats je een nieuwe testpoging (regel TEST-RETRY), dan komt terug wat alleen voor die test
// van de planning ging (besluit docs/beslissingen/2026-11-02-week-opnieuw-plannen.md).
//
// TEST-RETRY laat een training gaan "zodat je benen fris zijn voor de testloop". Staat de test daarna op
// een andere dag, dan is die reden weg. Het verplaatsen van een test vraagt altijd Akkoord
// (engine/weekDrag.ts#decideMove), dus de training komt in hetzelfde voorstel terug, als "weer op",
// net als Toch doen; Ongedaan maken zet beide terug. Alleen een rij die nog overgeslagen is met het slot
// van dat voorstel (niet door jou, niet gelogd), vandaag of later, en alleen als hij niet botst met de
// test op zijn nieuwe dag: niet op de testdag, niet de dag erna, en iets zwaars niet binnen twee dagen.
// Pure: no React, no IndexedDB.

import type { PlanChangeProposal } from '../models/planChange';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { ScheduleChange } from './scheduler';
import { addDays, daysBetween } from '../utils/dates';
import { idHasRole } from './templateRoles';
import { isHeavySession } from './illness';

// De reden waarmee TEST-RETRY een training laat gaan voor frisse benen (engine/adviceCompute.ts).
export const FRESH_FOR_TEST_REASON = 'Zodat je benen fris zijn voor de testloop.';

export interface TestMoveRestoreInput {
  testId: string;
  toDate: string;
  sessions: PlannedSession[];
  proposals: readonly PlanChangeProposal[];
  logs: SessionLog[];
  templates: SessionTemplate[];
  today: string;
}

export function restoresForTestMove(input: TestMoveRestoreInput): ScheduleChange[] {
  const { testId, toDate, sessions, templates, today } = input;
  const test = sessions.find((s) => s.id === testId);
  if (!test || test.scheduledDate === toDate || !idHasRole(test.templateId, 'test', templates)) return [];
  const reverted = new Set(input.proposals.map((p) => p.revertsProposalId).filter((x): x is string => !!x));
  const placedBy = input.proposals.filter((p) => p.resolution === 'accepted' && !reverted.has(p.id)
    && p.changes.some((c) => c.plannedSessionId === testId && c.templateId === test.templateId && c.generatedBy?.includes('TEST-RETRY')));
  if (placedBy.length === 0) return [];
  const logged = new Set(input.logs.map((l) => l.plannedSessionId).filter(Boolean));
  const byId = new Map(templates.map((t) => [t.id, t]));
  const rows = new Map(sessions.map((s) => [s.id, s]));
  const out: ScheduleChange[] = [];
  for (const p of placedBy) {
    for (const c of p.changes) {
      if (c.action !== 'remove' || !c.plannedSessionId || c.reason !== FRESH_FOR_TEST_REASON) continue;
      const row = rows.get(c.plannedSessionId);
      const template = row ? byId.get(row.templateId) : undefined;
      if (!row || !template || row.status !== 'skipped' || logged.has(row.id) || row.scheduledDate < today) continue;
      if (row.lock?.by !== 'proposal' || row.lock.proposalId !== p.id) continue;
      if (row.scheduledDate === toDate || row.scheduledDate === addDays(toDate, 1)) continue;
      if (isHeavySession(template) && Math.abs(daysBetween(row.scheduledDate, toDate)) < 2) continue;
      if (out.some((o) => o.sessionId === row.id)) continue;
      out.push({ sessionId: row.id, templateId: row.templateId, templateName: template.name, fromDate: row.scheduledDate, toDate: row.scheduledDate, restore: true });
    }
  }
  return out;
}

// De zin in het voorstel van de verplaatsing.
export function restoreSentence(changes: ScheduleChange[]): string {
  if (changes.length === 0) return '';
  const names = changes.map((c) => c.templateName);
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} en ${names.at(-1)}`;
  return `${list} ging alleen weg voor de test en ${changes.length === 1 ? 'komt' : 'komen'} terug op ${changes.length === 1 ? 'zijn' : 'hun'} eigen dag.`;
}

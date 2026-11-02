// Eenmalige reparaties van de planning.

import type { SessionTemplate, PlannedSession } from '../models/training';
import { addDays, mondayOfWeek, todayISO } from '../utils/dates';
import { patternSlotOf } from '../engine/programLayout';
import { patternDays } from '../engine/planPass';
import { MetaRepo, PlannedSessionsRepo, SessionLogsRepo, PlanChangeProposalsRepo, SessionTemplatesRepo } from './databaseRepos';
import { SettingsRepo } from './databaseSettings';

// Repair for production feedback "hoe kan het dat in opkomende weken de
// lange duurloop een kruis krijgt?": the weekly prescription used to take
// a session of the weekly pattern (Lange Duurloop) out of upcoming weeks
// and put another candidate (Bergconditie) in. It no longer does
// (engine/weeklyPrescriptionEngine.ts); this restores what it removed,
// from today on, and drops the sessions it added in those same weeks — the
// next prescription run re-adds anything still genuinely needed.
// Idempotent: a restored session is no longer skipped, so a second run
// finds nothing to do. Logged sessions and past days are never touched.
export async function restorePatternSessionsRemovedByPrescription(): Promise<number> {
  // One-time repair. Running it on every start used to put a session the
  // user later skipped on purpose straight back into the planning.
  let restoredCount = 0;
  if (!(await MetaRepo.get<boolean>('patternRestoreDone'))) {
    restoredCount += await restorePatternSessionsOnce((t) => t?.defaultDayOfWeek !== undefined);
    await MetaRepo.set('patternRestoreDone', true);
  }
  // Second repair (docs/onderzoek/Planning op een lijn.md, conflict 1): the
  // prescription also took out sessions that fill a pattern slot without a
  // fixed weekday of their own: the tempo runs and intervals of the race
  // block, the mountain hikes of Expeditieklaar. Back they come, and the
  // skipped copies of the race left by an older bug go.
  if (!(await MetaRepo.get<boolean>('slotRestoreDone'))) {
    restoredCount += await restorePatternSessionsOnce((t, id) => !!t && (t.defaultDayOfWeek !== undefined || patternSlotOf(id) !== id) && id !== 'tpl_test_run');
    await removeSkippedRaceCopies();
    await MetaRepo.set('slotRestoreDone', true);
  }
  return restoredCount;
}

// Skipped rows of the race on a day that has an open race: copies, never
// logged, nothing to keep.
async function removeSkippedRaceCopies(): Promise<void> {
  const [sessions, logs] = await Promise.all([PlannedSessionsRepo.getAll(), SessionLogsRepo.getAll()]);
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const openRaceDays = new Set(sessions.filter((s) => s.templateId === 'tpl_race' && s.status !== 'skipped').map((s) => s.scheduledDate));
  for (const s of sessions) {
    if (s.templateId === 'tpl_race' && s.status === 'skipped' && !logged.has(s.id) && openRaceDays.has(s.scheduledDate)) await PlannedSessionsRepo.delete(s.id);
  }
}

async function restorePatternSessionsOnce(isPatternTemplate: (template: SessionTemplate | undefined, templateId: string) => boolean): Promise<number> {
  const [proposals, sessions, logs, templates, settings] = await Promise.all([
    PlanChangeProposalsRepo.getAll(),
    PlannedSessionsRepo.getAll(),
    SessionLogsRepo.getAll(),
    SessionTemplatesRepo.getAll(),
    SettingsRepo.get(),
  ]);
  const today = todayISO();
  // A restored session goes to its slot's day as the week is now: the rest
  // day may have changed while it was out.
  const slotDays = patternDays(templates, settings, settings.restDay ?? 1);
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const templateById = new Map(templates.map((t) => [t.id, t]));
  const byId = new Map(sessions.map((s) => [s.id, s]));
  const fromPrescription = (generatedBy: string[] | undefined) => (generatedBy ?? []).some((g) => g.startsWith('engine/weeklyPrescriptionEngine'));
  const isPattern = (templateId: string) => isPatternTemplate(templateById.get(templateId), templateId);
  let restored = 0;

  for (const proposal of proposals) {
    if (proposal.trigger !== 'weekly_prescription_computed' || proposal.resolution !== 'accepted') continue;
    const restoredWeeks = new Set<string>();
    for (const item of proposal.changes) {
      if (item.action !== 'remove' || !item.plannedSessionId || !fromPrescription(item.generatedBy)) continue;
      const session = byId.get(item.plannedSessionId);
      if (!session || session.status !== 'skipped' || logged.has(session.id) || session.scheduledDate < today || !isPattern(session.templateId)) continue;
      const slotDay = slotDays.get(patternSlotOf(session.templateId));
      const onSlot = slotDay ? addDays(mondayOfWeek(session.scheduledDate), slotDay - 1) : session.scheduledDate;
      const back: PlannedSession = { ...session, status: 'planned', ...(onSlot >= today ? { scheduledDate: onSlot } : {}) };
      await PlannedSessionsRepo.put(back);
      byId.set(back.id, back);
      restoredWeeks.add(session.weekStartDate);
      restored++;
    }
    for (const item of proposal.changes) {
      const draft = item.newSessionDraft;
      if (item.action !== 'add' || !draft || !restoredWeeks.has(draft.weekStartDate) || !fromPrescription(item.generatedBy) || isPattern(draft.templateId)) continue;
      const added = [...byId.values()].find((s) => s.templateId === draft.templateId && s.scheduledDate === draft.scheduledDate && s.weekStartDate === draft.weekStartDate && s.status !== 'skipped' && !logged.has(s.id));
      if (!added || added.scheduledDate < today) continue;
      await PlannedSessionsRepo.delete(added.id);
      byId.delete(added.id);
    }
  }
  return restored;
}

// ASCEND: a training that has to move for a holiday or the light days around a
// tocht (rules LEAVE-OFF and LEAVE-LIGHT in engine/weekValidator.ts) may not land
// right before or after its own next time. A made-up example shows why:
// Bovenlichaam A moved from Tuesday to Sunday, two days before the next
// Bovenlichaam A, so three upper body trainings stood in five days. Then it is
// better to let it go (docs/beslissingen/2026-11-01-vakantie-bijwerken.md).
//
// "Its own next time" is the same template, or a template with the same task in
// the week: a role from LEAVE_SPACING_ROLES (engine/templateRoles.ts), never a
// list of template ids. The usual distance is how far the training stands from
// its nearest other time where it is now; the new day must keep at least half of
// that (rounded up), before and after. A weekly training keeps four days.
//
// Pure: no React, no IndexedDB.

import type { PlannedSession, SessionTemplate, TemplateRole } from '../models/training';
import { daysBetween } from '../utils/dates';
import { hasRole } from './templateRoles';

// The roles that say what a training is for in a week. Roles such as easy_pace or
// extra are shared by trainings with different tasks, so they do not count.
export const LEAVE_SPACING_ROLES: readonly TemplateRole[] = ['long', 'hard_run', 'hills', 'blocks'];

// How far we look around the training for its other times.
const WINDOW_DAYS = 28;

function sameTask(a: SessionTemplate | undefined, aId: string, b: SessionTemplate | undefined, bId: string): boolean {
  if (aId === bId) return true;
  if (!a || !b) return false;
  return LEAVE_SPACING_ROLES.some((role) => hasRole(a, role) && hasRole(b, role));
}

// The other times of the same training (or the same task), not skipped, near it.
// A walking day a tocht placed (leave.role 'placed') is the tocht, not a time of
// a training of its own: it never counts, so a long run next to a tocht keeps
// the usual distance to its own next time.
function otherTimes(subject: PlannedSession, sessions: PlannedSession[], byId: ReadonlyMap<string, SessionTemplate>): string[] {
  const t = byId.get(subject.templateId);
  return sessions
    .filter((o) => o.id !== subject.id && o.status !== 'skipped' && o.leave?.role !== 'placed' && Math.abs(daysBetween(subject.scheduledDate, o.scheduledDate)) <= WINDOW_DAYS)
    .filter((o) => sameTask(t, subject.templateId, byId.get(o.templateId), o.templateId))
    .map((o) => o.scheduledDate);
}

// The usual distance in days: from where the training stands now to its nearest other time.
export function ownGapDays(subject: PlannedSession, sessions: PlannedSession[], byId: ReadonlyMap<string, SessionTemplate>): number | undefined {
  const gaps = otherTimes(subject, sessions, byId).map((d) => Math.abs(daysBetween(subject.scheduledDate, d))).filter((g) => g > 0);
  return gaps.length > 0 ? Math.min(...gaps) : undefined;
}

// True when moving the training to `date` puts it too close to its own other times.
export function crowdsOwnNext(subject: PlannedSession, date: string, sessions: PlannedSession[], byId: ReadonlyMap<string, SessionTemplate>): boolean {
  const usual = ownGapDays(subject, sessions, byId);
  if (usual === undefined) return false;
  const least = Math.ceil(usual / 2);
  return otherTimes(subject, sessions, byId).some((d) => Math.abs(daysBetween(date, d)) < least);
}

// Week opnieuw plannen (engine/replanWeek.ts, storage/weekReplan.ts): het voorstel uitrekenen en na Akkoord
// wegschrijven, met één melding en Ongedaan maken. Ongedaan maken zelf staat in planChangeActions.ts.

import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { RecentPlanChange } from '../models/planChange';
import type { SessionTemplate } from '../models/training';
import { planWeekReplan as planWeekReplanNow, writeWeekReplan, REPLAN_STALE, type WeekReplanPlan } from '../storage/weekReplan';
import { formatDateNL, weekdayShortNL } from '../utils/dates';
import { makeId } from '../utils/id';
import { withTimeout } from '../utils/withTimeout';
import { armFlip, disarmFlip } from '../utils/flipDom';
import { bumpPlanRevision, failureNotice, planSettled } from './planningSync';
import { syncWatchWorkoutsAfterPlanChange } from '../storage/watchWorkouts';

// Het uitrekenen loopt de planningsronde een of enkele keren: nooit langer dan dit.
const PLAN_TIMEOUT_MS = 20_000;

const day = (iso: string) => `${weekdayShortNL(iso).toLowerCase()} ${formatDateNL(iso)}`;

// Een regel per wijziging, voor de melding.
export function replanLines(plan: WeekReplanPlan, templates: SessionTemplate[]): string[] {
  const name = (id: string) => templates.find((t) => t.id === id)?.name ?? 'Training';
  const was = new Map(plan.diff.before.map((s) => [s.id, s]));
  const lines: string[] = [];
  for (const s of plan.diff.writes) {
    const old = was.get(s.id);
    if (!old) lines.push(`${name(s.templateId)} op ${day(s.scheduledDate)} erbij`);
    else if (old.status === 'skipped') lines.push(`${name(s.templateId)} op ${day(s.scheduledDate)} staat weer op de planning`);
    else if (old.scheduledDate !== s.scheduledDate) lines.push(`${name(s.templateId)}: ${day(old.scheduledDate)} → ${day(s.scheduledDate)}`);
    else if (old.templateId !== s.templateId) lines.push(`${name(old.templateId)} op ${day(s.scheduledDate)} wordt ${name(s.templateId)}`);
    else lines.push(`${name(s.templateId)} op ${day(s.scheduledDate)} weer zoals het plan hem maakt`);
  }
  for (const id of plan.diff.removedIds) {
    const old = was.get(id);
    if (old) lines.push(`${name(old.templateId)} op ${day(old.scheduledDate)} vervalt`);
  }
  return lines;
}

export function useWeekReplanActions(deps: {
  templates: SessionTemplate[];
  setRecentChange: Dispatch<SetStateAction<RecentPlanChange | null>>;
  refresh: (fromOtherWindow?: boolean) => Promise<void>;
}) {
  const { templates, setRecentChange, refresh } = deps;

  // Rekent alleen: er wordt niets geschreven.
  const planWeekReplan = useCallback(async (weekStart: string): Promise<WeekReplanPlan | null> => {
    await withTimeout(planSettled(), PLAN_TIMEOUT_MS);
    return withTimeout(planWeekReplanNow(weekStart), PLAN_TIMEOUT_MS, 'Het uitrekenen duurde te lang.');
  }, []);

  // Akkoord: alles in één keer, of niets. Lukt het niet, dan zegt de melding dat, zonder Ongedaan maken.
  const applyWeekReplan = useCallback(async (plan: WeekReplanPlan): Promise<void> => {
    armFlip();
    await planSettled();
    let written: Awaited<ReturnType<typeof writeWeekReplan>>;
    try {
      written = await writeWeekReplan(plan);
    } catch (err) {
      disarmFlip();
      console.error('Week opnieuw plannen mislukt:', err);
      setRecentChange(failureNotice('Niet opnieuw gepland', err instanceof Error && err.message === REPLAN_STALE ? REPLAN_STALE : 'Er ging iets mis; je week staat nog zoals hij was.'));
      await refresh();
      return;
    }
    const lines = replanLines(plan, templates);
    setRecentChange({
      id: makeId('replan'),
      trigger: 'session_moved',
      title: 'Week opnieuw gepland',
      lines,
      summary: lines.length === 1 ? lines[0] : `${lines.length} wijzigingen in je week`,
      why: '',
      before: written.before,
      addedIds: written.addedIds,
      replan: { written: written.written, removedIds: written.removedIds },
      createdAt: new Date().toISOString(),
    });
    bumpPlanRevision();
    await refresh();
    void syncWatchWorkoutsAfterPlanChange();
  }, [templates, setRecentChange, refresh]);

  return { planWeekReplan, applyWeekReplan };
}

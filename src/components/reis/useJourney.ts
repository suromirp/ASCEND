import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { JOURNEY_TASKS } from '../../data/journeyTasks';
import { journeyProgress, markDone, normalizeJourneyState, pickJourneyTask, postponeTask, unmarkDone, type JourneyPick, type JourneyState } from '../../engine/journey';
import { programAnchorDate } from '../../engine/programLayout';
import { todayISO } from '../../utils/dates';

// The reisplanner as the screens use it: the stored state, this week's
// task and the changes. Everything it decides lives in engine/journey.ts.
export function useJourney(): {
  goalDate: string | undefined;
  state: JourneyState | undefined;
  pick: JourneyPick | undefined;
  progress: { done: number; total: number };
  tick: (taskId: string, opts?: { keepForWeek?: boolean }) => void;
  untick: (taskId: string) => void;
  postpone: (taskId: string) => void;
} {
  const { settings, updateSettings, trainingGoals, goalMilestones } = useAppData();
  const today = todayISO();
  const goalDate = programAnchorDate(trainingGoals, goalMilestones, today);
  const state = useMemo(() => normalizeJourneyState(settings.journey).state, [settings.journey]);
  const pick = pickJourneyTask(JOURNEY_TASKS, state, today, goalDate);
  const progress = journeyProgress(JOURNEY_TASKS, state);

  // Two quick taps must not overwrite each other with an older state.
  const latest = useRef(state);
  useEffect(() => { latest.current = state; }, [state]);
  const commit = useCallback((next: JourneyState) => {
    latest.current = next;
    void updateSettings({ journey: next });
  }, [updateSettings]);

  return {
    goalDate,
    state,
    pick,
    progress,
    tick: (taskId, opts) => commit(markDone(latest.current, taskId, todayISO(), opts?.keepForWeek)),
    untick: (taskId) => commit(unmarkDone(latest.current, taskId)),
    postpone: (taskId) => commit(postponeTask(latest.current, taskId, todayISO())),
  };
}

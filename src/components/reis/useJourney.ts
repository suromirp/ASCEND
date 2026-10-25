import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { JOURNEY_TASKS } from '../../data/journeyTasks';
import { bootBreakInStatus, bootGoalKm, type BootBreakInStatus, type BootsState } from '../../engine/bootBreakIn';
import { journeyProgress, EMPTY_JOURNEY, markDone, normalizeJourneyState, pickJourneyTask, postponeTask, unmarkDone, type JourneyPick, type JourneyState } from '../../engine/journey';
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
  // Bergschoenen inlopen: de stand uit het logboek, en de datum vastleggen of wissen.
  boots: BootBreakInStatus;
  setBoots: (boots: BootsState | undefined) => void;
} {
  const { settings, updateSettings, trainingGoals, goalMilestones, sessionLogs } = useAppData();
  const today = todayISO();
  const goalDate = programAnchorDate(trainingGoals, goalMilestones, today);
  const stored = useMemo(() => normalizeJourneyState(settings.journey).state, [settings.journey]);
  const boots = useMemo(
    () => bootBreakInStatus({ boots: stored?.boots, logs: sessionLogs, goalKm: bootGoalKm(settings.bootBreakInKm), today, departure: goalDate }),
    [stored?.boots, sessionLogs, settings.bootBreakInKm, today, goalDate],
  );
  // De taak "schoenen" is af zodra het doel gehaald is op tijd; dat wordt afgeleid
  // uit het logboek en nooit als vlag opgeslagen.
  const state = useMemo<JourneyState | undefined>(() => {
    if (boots.kind !== 'done' || stored?.done.schoenen) return stored;
    const base = stored ?? EMPTY_JOURNEY;
    return { ...base, done: { ...base.done, schoenen: boots.reachedOn ?? today } };
  }, [stored, boots.kind, boots.reachedOn, today]);
  const pick = pickJourneyTask(JOURNEY_TASKS, state, today, goalDate);
  const progress = journeyProgress(JOURNEY_TASKS, state);

  // Two quick taps must not overwrite each other with an older state.
  const latest = useRef(stored);
  useEffect(() => { latest.current = stored; }, [stored]);
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
    boots,
    setBoots: (next) => {
      const base = latest.current ?? EMPTY_JOURNEY;
      const rest: JourneyState = { ...base };
      delete rest.boots;
      commit(next ? { ...rest, boots: next } : rest);
    },
  };
}

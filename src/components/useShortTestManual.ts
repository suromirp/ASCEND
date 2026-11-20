// ASCEND: de stappen om de rustige loop met de korte test zelf na te bouwen, voor het blad Je horloge
// (engine/watchWorkout.ts#shortTestManualFor; I-91, docs/beslissingen/2026-11-20-korte-test-rest.md).
// Leest dezelfde dingen als het versturen (storage/watchWorkouts.ts) en de stand (useWatchStatus.ts): de
// instellingen, de geplande trainingen, de logs en de keuze Waar train je?. Undefined als deze training de
// korte test niet draagt; dan blijven de stappen van de training zelf staan. Geen rekenwerk hier.

import { useMemo } from 'react';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { useAppData } from '../state/AppDataContext';
import { SHORT_TEST_RUN_ID, shortTestDone, watchShortTest } from '../engine/shortTest';
import { shortTestManualFor, type WatchManual } from '../engine/watchWorkout';
import { buildWorkoutPlan } from '../engine/workoutPlan';
import { todayISO } from '../utils/dates';
import { useTrainingPlaces } from './useTrainingPlaces';

export function useShortTestManual(template: SessionTemplate, session: PlannedSession | undefined): WatchManual | undefined {
  const { settings, plannedSessions, sessionLogs, program } = useAppData();
  const places = useTrainingPlaces();
  const today = todayISO();
  return useMemo(() => {
    if (!session || template.id !== SHORT_TEST_RUN_ID) return undefined;
    const shortTest = watchShortTest(settings, plannedSessions, shortTestDone(today, sessionLogs));
    if (!shortTest) return undefined;
    // Het plan zoals het naar je horloge gaat: op de dag van de geplande training.
    const plan = buildWorkoutPlan(template, session.scheduledDate, program);
    return shortTestManualFor(session, template, plan, places?.[session.id], settings.watchPlaceWorkout, shortTest);
  }, [template, session, settings, plannedSessions, sessionLogs, program, places, today]);
}

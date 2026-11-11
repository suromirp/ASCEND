// ASCEND: leest wat het blad Je horloge toont (engine/watchSheet.ts) met de instellingen en de stand
// op het horloge van deze training. Gebruikt door het trainingsscherm voor de knop Horloge en het blad.

import type { PlannedSession, SessionTemplate } from '../models/training';
import { useAppData } from '../state/AppDataContext';
import { resolveWatchModel, watchFieldsShown } from '../engine/watchFields';
import { watchSheet, type WatchSheetView } from '../engine/watchSheet';
import { useWatchStatuses } from './useWatchStatus';

// Wat het blad toont, voor de knop Horloge en voor het blad zelf. De stand laadt zoals op het
// trainingsscherm; zolang hij laadt telt hij als onbekend en houdt hij de rest niet tegen.
export function useWatchSheet({
  template,
  garmin,
  session,
  hasZonesNote,
}: {
  template: SessionTemplate;
  garmin?: { sport: string; lines: string[] };
  session?: PlannedSession;
  hasZonesNote: boolean;
}): WatchSheetView {
  const { settings } = useAppData();
  const { statusOf, ready } = useWatchStatuses();
  return watchSheet({
    template,
    garmin,
    status: session && ready ? statusOf(session, template).kind : undefined,
    showStatus: settings.showWatchStatus !== false,
    fieldsShown: watchFieldsShown(settings),
    model: resolveWatchModel(settings.watchModel),
    store: settings.watchFieldVersions,
    hasZonesNote,
  });
}

import { useMemo } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { runTrends, type TrendRow } from '../../engine/runTrends';
import { tempoPiecesOn } from '../../engine/aerobicTrend';
import { useExcludedLogIds } from '../influence/useExcludedLogIds';
import { useDetailsOn } from '../useRunInsight';
import { todayISO } from '../../utils/dates';

// De looptrends zonder Efficiëntie, voor het scherm Lopen en de rij Lopen op Je stand.
export function useRunTrendRows(): TrendRow[] {
  const { sessionLogs, templates, program, settings } = useAppData();
  const detailsOn = useDetailsOn();
  const excluded = useExcludedLogIds();
  const tempoPieces = tempoPiecesOn(settings);
  const trends = useMemo(
    () => runTrends({ logs: sessionLogs, templates, program, hr: settings.heartRate, settings: settings.runInsight, detailsOn, today: todayISO(), excludedLogIds: excluded, tempoPieces }),
    [sessionLogs, templates, program, settings.heartRate, settings.runInsight, excluded, detailsOn, tempoPieces],
  );
  return useMemo(() => trends.rows.filter((r) => r.key !== 'efficiency'), [trends]);
}


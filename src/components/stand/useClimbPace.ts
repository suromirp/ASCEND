import { useMemo } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { climbPace, type ClimbPaceState } from '../../engine/climbPace';
import { signalOn } from '../../engine/signalSettings';
import { todayISO } from '../../utils/dates';

// Het klimtempo als de instelling aan staat, anders niets (dan is er op het scherm Belasting geen rij Klimtempo).
export function useClimbPace(): ClimbPaceState | undefined {
  const { sessionLogs, settings } = useAppData();
  const on = signalOn(settings, 'climbPace');
  return useMemo(() => (on ? climbPace(sessionLogs, todayISO()) : undefined), [on, sessionLogs]);
}

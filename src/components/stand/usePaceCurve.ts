import { useMemo } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { paceCurve } from '../../engine/paceCurve';
import { pacesFromLogs, judgmentOptions } from '../../engine/testJudgment';
import { signalOn } from '../../engine/signalSettings';
import { todayISO } from '../../utils/dates';

// De controle naast je test, of niets (uit, of geen test). Ook voor de rij Lopen op Je stand.
export function usePaceCurve() {
  const { sessionLogs, settings, templates } = useAppData();
  const on = signalOn(settings, 'paceCurve');
  const today = todayISO();
  return useMemo(() => {
    if (!on) return undefined;
    const { paces } = pacesFromLogs(sessionLogs, judgmentOptions(settings));
    return paceCurve(sessionLogs, paces?.test, today, templates);
  }, [on, sessionLogs, settings, today, templates]);
}


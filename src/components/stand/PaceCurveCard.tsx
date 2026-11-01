// ASCEND: Je stand, sectie Lopen: de test waar je tempo's uit komen, met daaronder je snelste
// stuk in gewone loopjes sinds die test als controle (engine/paceCurve.ts). De test blijft de bron;
// deze kaart verandert geen tempo. Zonder test is er niets te vergelijken en staat hier niets.

import { useMemo } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { paceCurve, paceCurveLine, paceCurveWaitLine } from '../../engine/paceCurve';
import { pacesFromLogs, judgmentOptions } from '../../engine/testJudgment';
import { formatRaceTime } from '../../engine/racePrediction';
import { signalOn } from '../../engine/signalSettings';
import { formatDayMonthNL, todayISO } from '../../utils/dates';
import { formatNumberNL } from '../../utils/number';
import { Card, Eyebrow } from '../ui';

export function PaceCurveCard() {
  const { sessionLogs, settings } = useAppData();
  const on = signalOn(settings, 'paceCurve');
  const today = todayISO();
  const curve = useMemo(() => {
    if (!on) return undefined;
    const { paces } = pacesFromLogs(sessionLogs, judgmentOptions(settings));
    return paceCurve(sessionLogs, paces?.test, today);
  }, [on, sessionLogs, settings, today]);
  if (!curve) return null;
  const { test } = curve;
  return (
    <Card className="flex flex-col gap-2">
      <Eyebrow>Tempo naast je test</Eyebrow>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
        Je tempo's komen uit je test van {formatDayMonthNL(test.date)}: <span className="tabular-nums">{formatNumberNL(test.km, 1)}</span> km in <span className="tabular-nums">{formatRaceTime(test.minutes)}</span>.
      </p>
      <p className="text-sm leading-relaxed tabular-nums" style={{ color: 'var(--color-ink)' }}>
        {curve.state === 'ready' ? paceCurveLine(curve) : paceCurveWaitLine(curve, today)}
      </p>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
        Een controle, geen nieuw getal: de test blijft de bron voor je tempo's.
      </p>
    </Card>
  );
}

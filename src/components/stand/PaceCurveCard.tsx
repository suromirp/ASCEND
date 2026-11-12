// ASCEND: Je stand, scherm Lopen: de test waar je tempo's uit komen, met daaronder je snelste
// stuk in gewone loopjes sinds die test als controle (engine/paceCurve.ts). De test blijft de bron;
// deze kaart verandert geen tempo. Zonder test is er niets te vergelijken en staat hier niets.

import { paceCurveLine, paceCurveWaitLine } from '../../engine/paceCurve';
import { usePaceCurve } from './usePaceCurve';
import { formatRaceTime } from '../../engine/racePrediction';
import { formatDayMonthNL, todayISO } from '../../utils/dates';
import { formatNumberNL } from '../../utils/number';
import { Card, Eyebrow } from '../ui';

export function PaceCurveCard() {
  const curve = usePaceCurve();
  const today = todayISO();
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
        Een controle, geen nieuw getal. De test blijft de bron voor je tempo's.
      </p>
    </Card>
  );
}

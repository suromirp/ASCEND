import { useMemo } from 'react';
import { useAppData } from '../state/AppDataContext';
import { aerobicTrend, formatPace, trendVerdict } from '../engine/aerobicTrend';
import { useExcludedLogIds } from './influence/useExcludedLogIds';
import { todayISO } from '../utils/dates';
import { Card, Eyebrow } from './ui';
import { TrendLineChart } from './TrendLineChart';

// Je stand, sectie Lopen (moved here from Ascend): progress on easy runs, as pace at one zone 2 heart rate
// (engine/aerobicTrend.ts). A line going up means faster at the same effort.
export function AerobicTrendCard() {
  const { sessionLogs, templates, program, settings } = useAppData();
  // A training set to "Niet meetellen voor hartslag" stays out (engine/influence.ts).
  const excluded = useExcludedLogIds();
  const trend = useMemo(() => aerobicTrend(sessionLogs, templates, program, settings.heartRate, todayISO(), excluded), [sessionLogs, templates, program, settings.heartRate, excluded]);
  const latest = trend.points.at(-1);
  const hasZones = !!(settings.heartRate?.lthr || settings.heartRate?.maxHr);

  // One sentence from the same line as the chart (engine/aerobicTrend.ts#trendVerdict).
  const verdict = trendVerdict(trend);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <Eyebrow>Tempo bij zone 2</Eyebrow>
        {latest && <span className="font-sans text-2xl tabular-nums" style={{ color: 'var(--color-ink)' }}>{formatPace(latest.paceSec)}<span className="text-sm"> /km</span></span>}
      </div>
      <p className="-mt-2 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
        Je rustige en lange duurlopen, omgerekend naar {trend.referenceHr > 0 ? `${trend.referenceHr} bpm` : 'dezelfde hartslag'}. Word je fitter, dan loop je bij dezelfde hartslag sneller.
      </p>
      {trend.points.length >= 2 ? (
        <TrendLineChart points={trend.points} color="var(--color-progress)" formatValue={(v) => formatPace(-v)} />
      ) : (
        <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
          {trend.runs === 0 ? 'Nog geen loopjes om te vergelijken.' : `${trend.runs === 1 ? 'Eén loopje' : `${trend.runs} loopjes`}, nog maar één week.`} Na twee weken met loopjes zie je hier je lijn.
        </p>
      )}
      {verdict && <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{verdict}</p>}
      <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
        Telt mee: vlakke rustige loopjes met afstand, tijd en gemiddelde hartslag ingevuld
        {hasZones ? ', met een hartslag in zone 2 of een beetje eronder' : ''}.
        {trend.outsideZone > 0 ? ` ${trend.outsideZone} ${trend.outsideZone === 1 ? 'loopje zat' : 'loopjes zaten'} te ver van zone 2 en ${trend.outsideZone === 1 ? 'telt' : 'tellen'} niet mee.` : ''}
        {!hasZones ? ' Vul bij Instellingen, Lichaam je hartslag in, dan telt alleen zone 2.' : ''}
      </p>
    </Card>
  );
}

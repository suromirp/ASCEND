import { useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { aerobicTrend, formatPace, tempoPiecesOn, trendHeadline, trendVerdict, zone2Criteria } from '../engine/aerobicTrend';
import { useExcludedLogIds } from './influence/useExcludedLogIds';
import { todayISO } from '../utils/dates';
import { Card, Eyebrow, InfoButton } from './ui';
import { TrendLineChart } from './TrendLineChart';
import { Zone2InfoSheet } from './Zone2InfoSheet';

// Je stand, sectie Lopen (moved here from Ascend): progress on easy runs, as pace at one zone 2 heart rate
// (engine/aerobicTrend.ts). A line going up means faster at the same effort.
export function AerobicTrendCard() {
  const { sessionLogs, templates, program, settings } = useAppData();
  // A training set to "Niet meetellen voor hartslag" stays out (engine/influence.ts).
  const excluded = useExcludedLogIds();
  const pieces = tempoPiecesOn(settings);
  const today = todayISO();
  const trend = useMemo(() => aerobicTrend(sessionLogs, templates, program, settings.heartRate, today, excluded, { pieces }), [sessionLogs, templates, program, settings.heartRate, today, excluded, pieces]);
  const [info, setInfo] = useState(false);
  // The big number: the line today, the first estimate or the last week, with its label.
  const headline = trendHeadline(trend);
  const hasZones = !!(settings.heartRate?.lthr || settings.heartRate?.maxHr);

  // One sentence from the same line as the chart (engine/aerobicTrend.ts#trendVerdict).
  const verdict = trendVerdict(trend);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="flex items-center gap-3">
          <Eyebrow>Tempo bij zone 2</Eyebrow>
          <InfoButton onClick={() => setInfo(true)} label="Wat tempo bij zone 2 zegt" />
        </span>
        {headline && (
          <span className="flex flex-col items-end">
            <span className="font-sans text-2xl tabular-nums" style={{ color: 'var(--color-ink)' }}>{formatPace(headline.paceSec)}<span className="text-sm"> /km</span></span>
            <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{headline.label}</span>
          </span>
        )}
      </div>
      <p className="-mt-2 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
        {trend.referenceHr > 0 ? `Je tempo bij ${trend.referenceHr} bpm.` : 'Je tempo bij één vaste hartslag.'} Word je fitter, dan loop je daarbij sneller.
      </p>
      {trend.points.length >= 2 ? (
        <TrendLineChart points={trend.points} color="var(--color-progress)" formatValue={(v) => formatPace(-v)} />
      ) : (
        <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
          {trend.runs === 0 ? 'Nog geen loopjes.' : `${trend.runs === 1 ? 'Eén loopje' : `${trend.runs} loopjes`}, nog maar één week.`} Na twee weken zie je hier je lijn.
        </p>
      )}
      {verdict && <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{verdict}</p>}
      <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
        {zone2Criteria(trend, pieces, hasZones).join(' ')}
        {trend.outsideZone > 0 ? ` ${trend.outsideZone} ${trend.outsideZone === 1 ? 'loopje zat' : 'loopjes zaten'} te ver van zone 2 en ${trend.outsideZone === 1 ? 'telt' : 'tellen'} niet mee.` : ''}
        {!hasZones ? ' Vul bij Instellingen, Lichaam je hartslag in, dan telt alleen zone 2.' : ''}
      </p>
      {info && <Zone2InfoSheet trend={trend} pieces={pieces} zones={hasZones} today={today} onClose={() => setInfo(false)} />}
    </Card>
  );
}

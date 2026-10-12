import { useMemo } from 'react';
import { useAppData } from '../state/AppDataContext';
import { aerobicTrend, formatPace, MEANINGFUL_CHANGE_SEC } from '../engine/aerobicTrend';
import { todayISO } from '../utils/dates';
import { Card, Eyebrow } from './ui';
import { TrendLineChart } from './TrendLineChart';

// Ascend: progress on easy runs, as pace at one zone 2 heart rate
// (engine/aerobicTrend.ts). A line going up means faster at the same effort.
export function AerobicTrendCard() {
  const { sessionLogs, templates, program, settings } = useAppData();
  const trend = useMemo(() => aerobicTrend(sessionLogs, templates, program, settings.heartRate, todayISO()), [sessionLogs, templates, program, settings.heartRate]);
  const latest = trend.points.at(-1);
  const hasZones = !!(settings.heartRate?.lthr || settings.heartRate?.maxHr);

  let verdict: string | undefined;
  if (trend.changeSec !== undefined) {
    const sec = Math.round(Math.abs(trend.changeSec));
    verdict = Math.abs(trend.changeSec) < MEANINGFUL_CHANGE_SEC
      ? 'Gelijk aan een maand geleden. Normaal: vooruitgang gaat in weken, niet per loop.'
      : trend.changeSec < 0
        ? `${sec} seconden per km sneller dan een maand geleden, bij dezelfde hartslag. Je wordt fitter.`
        : `${sec} seconden per km langzamer dan een maand geleden. Moe, warm of weinig geslapen? Kijk hoe het de komende weken gaat.`;
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <Eyebrow>TEMPO BIJ ZONE 2</Eyebrow>
        {latest && <span className="font-display text-2xl tabular-nums" style={{ color: 'var(--color-gold)' }}>{formatPace(latest.paceSec)}<span className="text-sm"> /km</span></span>}
      </div>
      <p className="-mt-2 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
        Je rustige en lange duurlopen, omgerekend naar {trend.referenceHr > 0 ? `${trend.referenceHr} bpm` : 'dezelfde hartslag'}. Word je fitter, dan loop je bij dezelfde hartslag sneller.
      </p>
      {trend.points.length >= 2 ? (
        <TrendLineChart points={trend.points} formatValue={(v) => formatPace(-v)} />
      ) : (
        <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
          {trend.runs === 0 ? 'Nog geen loopjes om te vergelijken.' : 'Nog één week met loopjes.'} Na twee weken zie je hier je lijn.
        </p>
      )}
      {verdict && <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{verdict}</p>}
      <p className="text-[11px] leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
        Telt mee: vlakke rustige loopjes met afstand, tijd en gemiddelde hartslag ingevuld
        {hasZones ? ', met een hartslag in zone 2' : ''}.
        {trend.outsideZone > 0 ? ` ${trend.outsideZone} ${trend.outsideZone === 1 ? 'loopje viel' : 'loopjes vielen'} buiten zone 2 en ${trend.outsideZone === 1 ? 'telt' : 'tellen'} niet mee.` : ''}
        {!hasZones ? ' Vul bij Meer, Training je hartslag in, dan telt alleen zone 2.' : ''}
      </p>
    </Card>
  );
}

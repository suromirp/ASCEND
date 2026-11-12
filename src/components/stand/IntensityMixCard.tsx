import { useState } from 'react';
import { EASY_TARGET, intensityVerdict, type IntensityMix } from '../../engine/standing';
import { Card, Eyebrow, InfoButton } from '../ui';
import { StandInfoSheet, UnderLine } from './StandParts';
import { intensityInfo } from './standChartData';
import { formatWeekdayDayMonthNL } from '../../utils/dates';

// Je stand → intensity: how your endurance trainings of the last four weeks
// split into easy, middle and hard, in minutes, by heart rate where the watch gave it.
// One colour, darker is harder; each label has a dot in the shade of its part of the bar. Op het scherm de balk en
// één zin; wat er geteld is en de 80% staan achter de i (docs/visie/Ontwerp Stand minimaal.md, 2).

const PARTS: { key: keyof IntensityMix['minutes']; label: string; opacity: number }[] = [
  { key: 'easy', label: 'rustig', opacity: 0.4 },
  { key: 'middle', label: 'middel', opacity: 0.7 },
  { key: 'hard', label: 'hard', opacity: 1 },
];

export function IntensityMixCard({ mix }: { mix: IntensityMix }) {
  const [info, setInfo] = useState(false);
  const perTraining = mix.unit === 'sessions';
  if (mix.total < 3 || (!perTraining && mix.totalMinutes <= 0)) return null;
  // Naar het plan: per training geteld, zoals altijd; naar je hartslag: in minuten.
  const amounts = perTraining ? mix.sessions : mix.minutes;
  const whole = perTraining ? mix.total : mix.totalMinutes;
  const pct = (n: number) => (whole ? Math.round((n / whole) * 100) : 0);
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <Eyebrow>Intensiteit</Eyebrow>
        <InfoButton onClick={() => setInfo(true)} label="Wat Intensiteit telt" />
      </div>

      <div className="relative">
        <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={PARTS.map((p) => `${p.label} ${pct(amounts[p.key])}%`).join(', ')}>
          {PARTS.filter((p) => amounts[p.key] > 0).map((p) => (
            <span key={p.key} style={{ width: `${pct(amounts[p.key])}%`, background: 'var(--color-progress)', opacity: p.opacity }} />
          ))}
        </div>
        <span className="absolute -top-1 h-5 w-0.5 rounded" style={{ left: `${EASY_TARGET * 100}%`, background: 'var(--color-ink)' }} aria-hidden />
      </div>
      {/* Elk deel blijft heel (bolletje, getal, woord en minuten); passen ze niet op één regel, dan gaat een heel deel naar de volgende. */}
      <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
        {PARTS.map((p) => (
          <span key={p.key} className="whitespace-nowrap"><span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: 'var(--color-progress)', opacity: p.opacity }} aria-hidden /><span className="tabular-nums" style={{ color: 'var(--color-ink)' }}>{pct(amounts[p.key])}%</span> {p.label} <span className="tabular-nums">({amounts[p.key]}{perTraining ? '' : ' min'})</span></span>
        ))}
      </div>

      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
        {intensityVerdict(amounts, whole)}
      </p>

      {mix.easyTooHard.length > 0 && (
        <UnderLine>
          <p>{mix.easyTooHard.length === 1 ? 'Eén rustige training was te hard:' : `${mix.easyTooHard.length} rustige trainingen waren te hard:`}</p>
          <p style={{ color: 'var(--color-ink-dim)' }}>
            {mix.easyTooHard.slice(0, 4).map((x) => `${x.name} ${formatWeekdayDayMonthNL(x.date)} (${x.why === 'hartslag' ? 'hartslag boven zone 2' : 'zwaarte 7 of meer'})`).join(' · ')}
          </p>
          <p className="mt-1" style={{ color: 'var(--color-ink-dim)' }}>Rustig is praten in hele zinnen. Langzamer mag, ook bergop.</p>
        </UnderLine>
      )}
      {info && <StandInfoSheet eyebrow="Belasting" title="Intensiteit" lines={intensityInfo(mix)} onClose={() => setInfo(false)} />}
    </Card>
  );
}

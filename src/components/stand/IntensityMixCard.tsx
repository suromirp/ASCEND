import { EASY_TARGET, intensityVerdict, type IntensityMix } from '../../engine/standing';
import { Card, Eyebrow } from '../ui';
import { formatWeekdayDayMonthNL } from '../../utils/dates';

// Je stand → intensity: how your endurance trainings of the last four weeks
// split into easy, middle and hard, in minutes, by heart rate where the watch gave it.
// One colour, darker is harder; each label has a dot in the shade of its part of the bar.

const PARTS: { key: keyof IntensityMix['minutes']; label: string; opacity: number }[] = [
  { key: 'easy', label: 'rustig', opacity: 0.4 },
  { key: 'middle', label: 'middel', opacity: 0.7 },
  { key: 'hard', label: 'hard', opacity: 1 },
];

// One short honest line: what was counted from the heart rate and what by plan.
function sourceLine(mix: IntensityMix): string {
  const trainings = (n: number) => (n === 1 ? '1 training' : `${n} trainingen`);
  if (mix.measuredSessions === 0) return 'Naar het plan, niet naar je hartslag.';
  if (mix.plannedSessions === 0) return 'Uit je hartslag.';
  return `Uit je hartslag, ${trainings(mix.plannedSessions)} naar plan.`;
}

export function IntensityMixCard({ mix }: { mix: IntensityMix }) {
  const perTraining = mix.unit === 'sessions';
  if (mix.total < 3 || (!perTraining && mix.totalMinutes <= 0)) return null;
  // Naar het plan: per training geteld, zoals altijd; naar je hartslag: in minuten.
  const amounts = perTraining ? mix.sessions : mix.minutes;
  const whole = perTraining ? mix.total : mix.totalMinutes;
  const pct = (n: number) => (whole ? Math.round((n / whole) * 100) : 0);
  return (
    <Card className="flex flex-col gap-3">
      <div>
        <Eyebrow>Intensiteit</Eyebrow>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
          {perTraining
            ? 'Je loop- en wandeltrainingen van de laatste vier weken.'
            : `Je loop- en wandelminuten van de laatste vier weken${mix.measuredSessions > 0 ? ', naar je hartslag' : ''}.`} Goede duursporters doen ongeveer {Math.round(EASY_TARGET * 100)}% rustig.
        </p>
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

      {!perTraining && <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{sourceLine(mix)}</p>}

      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
        {intensityVerdict(amounts, whole)}
      </p>

      {mix.easyTooHard.length > 0 && (
        <div className="rounded-xl px-3 py-2 text-xs leading-relaxed" style={{ background: 'var(--color-charcoal)', color: 'var(--color-ink)' }}>
          <p>{mix.easyTooHard.length === 1 ? 'Eén rustige training was te hard:' : `${mix.easyTooHard.length} rustige trainingen waren te hard:`}</p>
          <p style={{ color: 'var(--color-ink-dim)' }}>
            {mix.easyTooHard.slice(0, 4).map((x) => `${x.name} ${formatWeekdayDayMonthNL(x.date)} (${x.why === 'hartslag' ? 'hartslag boven zone 2' : 'zwaarte 7 of meer'})`).join(' · ')}
          </p>
          <p className="mt-1" style={{ color: 'var(--color-ink-dim)' }}>Rustig is praten in hele zinnen. Langzamer mag, ook bergop.</p>
        </div>
      )}
    </Card>
  );
}

import { EASY_FLOOR, EASY_TARGET, type IntensityMix } from '../../engine/standing';
import { Card, Eyebrow } from '../ui';
import { dayShort } from './chartParts';

// Je stand → intensity: how your endurance trainings of the last four weeks
// split into easy, middle and hard, in minutes, by heart rate where the watch gave it.
// One colour, darker is harder.

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
  if (mix.total < 3 || mix.totalMinutes <= 0) return null;
  const pct = (n: number) => (mix.totalMinutes ? Math.round((n / mix.totalMinutes) * 100) : 0);
  const easyPct = pct(mix.minutes.easy);
  return (
    <Card className="flex flex-col gap-3">
      <div>
        <Eyebrow>INTENSITEIT</Eyebrow>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
          Je loop- en wandelminuten van de laatste vier weken{mix.measuredSessions > 0 ? ', naar je hartslag' : ''}. Goede duursporters doen ongeveer {Math.round(EASY_TARGET * 100)}% rustig.
        </p>
      </div>

      <div className="relative">
        <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={PARTS.map((p) => `${p.label} ${pct(mix.minutes[p.key])}%`).join(', ')}>
          {PARTS.filter((p) => mix.minutes[p.key] > 0).map((p) => (
            <span key={p.key} style={{ width: `${pct(mix.minutes[p.key])}%`, background: 'var(--color-progress)', opacity: p.opacity }} />
          ))}
        </div>
        <span className="absolute -top-1 h-5 w-0.5 rounded" style={{ left: `${EASY_TARGET * 100}%`, background: 'var(--color-ink)' }} aria-hidden />
      </div>
      <div className="flex justify-between text-xs" style={{ color: 'var(--color-ink-dim)' }}>
        {PARTS.map((p) => (
          <span key={p.key}><span className="tabular-nums" style={{ color: 'var(--color-ink)' }}>{pct(mix.minutes[p.key])}%</span> {p.label} <span className="tabular-nums">({mix.minutes[p.key]} min)</span></span>
        ))}
      </div>

      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{sourceLine(mix)}</p>

      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
        {easyPct >= EASY_TARGET * 100 - 5
          ? 'Goed verdeeld: het meeste rustig, een paar keer echt hard. Zo groeit je basis en blijf je fris voor de harde dagen.'
          : easyPct >= EASY_FLOOR * 100
            ? 'Bijna goed. Nog iets meer rustig, of houd de rustige trainingen echt rustig.'
            : 'Meer hard dan rustig voor duurtraining. Dat gaat een tijd goed, maar je basis groeit vooral van de rustige kilometers.'}
      </p>

      {mix.easyTooHard.length > 0 && (
        <div className="rounded-xl px-3 py-2 text-xs leading-relaxed" style={{ background: 'var(--color-charcoal)', color: 'var(--color-ink)' }}>
          <p>{mix.easyTooHard.length === 1 ? 'Eén rustige training ging harder dan rustig:' : `${mix.easyTooHard.length} rustige trainingen gingen harder dan rustig:`}</p>
          <p style={{ color: 'var(--color-ink-dim)' }}>
            {mix.easyTooHard.slice(0, 4).map((x) => `${x.name} ${dayShort(x.date)} (${x.why === 'hartslag' ? 'hartslag boven zone 2' : 'zwaarte 7 of meer'})`).join(' · ')}
          </p>
          <p className="mt-1" style={{ color: 'var(--color-ink-dim)' }}>Rustig is praten in hele zinnen. Langzamer mag, ook bergop.</p>
        </div>
      )}
    </Card>
  );
}

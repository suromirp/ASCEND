import type { SessionBrief } from '../engine/sessionBrief';
import { Eyebrow } from './ui';

// The head of a training, identical on the training screen and the info
// screen (engine/sessionBrief.ts): the sport and kind of training, the
// name, why in one sentence, the week, and three key numbers.
export function SessionHeader({ brief, title, as = 'h1' }: { brief: SessionBrief; title: string; as?: 'h1' | 'h2' }) {
  const Heading = as;
  return (
    <div>
      <Eyebrow>{brief.headline}</Eyebrow>
      <Heading className="mt-1 font-display text-2xl leading-tight" style={{ color: 'var(--color-ink)' }}>{title}</Heading>
      {brief.purpose && <p className="mt-1 text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{brief.purpose}</p>}
      {brief.weekLabel && <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{brief.weekLabel}</p>}

      <div className="mt-4 grid grid-cols-3 gap-2">
        {brief.facts.map((f) => (
          <div key={f.label} className="rounded-xl border px-2.5 py-2.5" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}>
            <p className={`font-sans tabular-nums leading-tight ${f.value.length > 9 ? 'text-sm' : 'text-lg'}`} style={{ color: 'var(--color-ink)' }}>{f.value}</p>
            <p className="mt-0.5 text-xs leading-tight" style={{ color: 'var(--color-ink-dim)' }}>{f.label}</p>
          </div>
        ))}
      </div>

      {brief.sportSwitch && <p className="mt-3 text-xs" style={{ color: 'var(--color-status)' }}>{brief.sportSwitch}</p>}
      {brief.tomorrow && <p className="mt-3 text-xs" style={{ color: 'var(--color-action)' }}>{brief.tomorrow}</p>}
    </div>
  );
}

// "Stop of schakel terug als", the signals that count during the training.
export function StopSignals({ signals }: { signals: string[] }) {
  if (signals.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-col gap-1.5">
      {signals.map((s) => (
        <li key={s} className="flex gap-2 text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
          <span aria-hidden="true" style={{ color: 'var(--color-warning)' }}>·</span>
          <span>{s}</span>
        </li>
      ))}
    </ul>
  );
}

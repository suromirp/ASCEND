import { LightCard } from '../ui';

// Het beeld van Je stand in twee seconden: drie kolommen op de lucht, Benen, Belasting en Ritme. Per kolom
// een label, het oordeel in woorden (Marcellus) en één feit in Inter. Elke kolom is een sprong naar zijn
// kaart, geen schakelaar: de pagina eronder blijft helemaal zichtbaar.

export interface SummaryColumn { id: string; label: string; word: string; fact: string; target: string }

function jump(target: string) {
  const el = document.getElementById(target);
  if (!el) return;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'uit';
  el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
}

export function StandSummary({ columns }: { columns: SummaryColumn[] }) {
  return (
    <LightCard className="!p-2">
      <div className="grid grid-cols-3">
        {columns.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => jump(c.target)}
            className={`flex min-h-[44px] flex-col items-start gap-0.5 rounded-xl px-2 py-2 text-left ${i > 0 ? 'border-l' : ''}`}
            style={{ borderColor: 'var(--color-card-border)' }}
          >
            <span className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>{c.label}</span>
            <span className="font-display text-xl leading-tight" style={{ color: 'var(--color-ink)' }}>{c.word}</span>
            <span className="font-sans text-sm tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{c.fact}</span>
          </button>
        ))}
      </div>
    </LightCard>
  );
}

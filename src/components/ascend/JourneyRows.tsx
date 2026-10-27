import { baseWeightGrams, formatKg, packProgress } from '../../engine/packList';
import { Icon, type IconName } from '../icons';
import { Eyebrow } from '../ui';
import { useJourney } from '../reis/useJourney';
import { usePackList } from '../reis/usePackList';

// De tochtmodule onder een doel van de soort Trektocht: Reisplanner, Paklijst, Etappes en Alleen
// onderweg. Alleen een tocht heeft hem (isTrekGoal); de rest van de doelen niet.
interface Row {
  icon: IconName;
  title: string;
  line: string;
  to: string;
}

function useRows(): Row[] {
  const { progress } = useJourney();
  const { items } = usePackList();
  const packs = packProgress(items);
  return [
    { icon: 'locatie', title: 'Reisplanner', line: `${progress.done} van ${progress.total} taken gedaan`, to: '/reis' },
    { icon: 'rugzak', title: 'Paklijst', line: `Basisgewicht ${formatKg(baseWeightGrams(items))}, ${packs.have} van ${packs.total} onderdelen in huis`, to: '/reis/paklijst' },
    { icon: 'wandelen', title: 'Etappes', line: 'De etappes, je zwaarste dagen en waar je slaapt', to: '/etappes' },
    { icon: 'info', title: 'Alleen onderweg', line: 'Alarmnummer, afspraak met thuis, vertrekbrief', to: '/onderweg' },
  ];
}

export function JourneyRows({ compact = false, onNavigate }: { compact?: boolean; onNavigate: (to: string) => void }) {
  const rows = useRows();
  if (compact) {
    const [planner, ...rest] = rows;
    return (
      <div className="-mx-1 flex flex-col overflow-hidden rounded-xl border" style={{ borderColor: 'var(--color-card-border)' }}>
        <button type="button" onClick={() => onNavigate(planner.to)} className="flex min-h-[56px] items-center gap-3 px-3 py-2 text-left">
          <span style={{ color: 'var(--color-ink-dim)' }}><Icon name={planner.icon} size={20} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm" style={{ color: 'var(--color-ink)' }}>{planner.title}</span>
            <span className="block text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{planner.line}</span>
          </span>
          <span style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={18} /></span>
        </button>
        <div className="grid grid-cols-3 border-t" style={{ borderColor: 'var(--color-card-border)' }}>
          {rest.map((r, i) => (
            <button
              key={r.to}
              type="button"
              onClick={() => onNavigate(r.to)}
              className={`flex min-h-[48px] items-center justify-center gap-1.5 px-1 text-sm ${i > 0 ? 'border-l' : ''}`}
              style={{ color: 'var(--color-ink)', borderColor: 'var(--color-card-border)' }}
            >
              {r.title === 'Alleen onderweg' ? 'Onderweg' : r.title}
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <section className="flex flex-col gap-2">
      <Eyebrow>Je tocht</Eyebrow>
      <div className="st-list">
        {rows.map((r) => (
          <button key={r.to} type="button" onClick={() => onNavigate(r.to)} className="flex min-h-[56px] w-full items-center gap-3 border-b px-4 py-3 text-left last:border-b-0" style={{ borderColor: 'var(--color-card-border)' }}>
            <span style={{ color: 'var(--color-ink-dim)' }}><Icon name={r.icon} size={20} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-base" style={{ color: 'var(--color-ink)' }}>{r.title}</span>
              <span className="block text-sm leading-snug tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{r.line}</span>
            </span>
            <span style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={18} /></span>
          </button>
        ))}
      </div>
    </section>
  );
}

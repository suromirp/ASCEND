import { useSheetClose } from '../utils/useSheetClose';
import { Icon } from './icons';
import { GR5_TRAINING_SPLIT_SOURCES } from '../data/gr5Details';
import { Portal } from './Portal';
import { Card, Eyebrow } from './ui';

// Hoe de week er richting de GR5 uitziet: de verdeling tussen kracht,
// hardlopen en bergwerk. Opent vanaf Ascend, zodat er geen dichtgeklapt
// blokje op de pagina staat.

const PARTS = [
  '3 tot 4 keer kracht',
  '1 tot 2 keer hardlopen: aerobe basis, later snelheid en drempel',
  '1 keer bergspecifiek: helling, D+ of een echte hike',
  'regelmatig: lange hike, afdalen, rugzak, twee dagen achter elkaar',
];

export function TrainingSplitSheet({ onClose }: { onClose: () => void }) {
  const { closing, requestClose } = useSheetClose(onClose);
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div className={`max-h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <Card className="rounded-b-none border-b-0 pb-8">
            <div className="-mr-2 -mt-2 flex items-center justify-between">
              <Eyebrow>TRAININGSVERDELING</Eyebrow>
              <button onClick={requestClose} aria-label="Sluiten" className="flex h-11 w-11 items-center justify-center text-lg" style={{ color: 'var(--color-ink-dim)' }}>×</button>
            </div>
            <h2 className="mt-1 font-display text-2xl" style={{ color: 'var(--color-ink)' }}>Je week richting de GR5</h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
              Hardlopen blijft in het schema: het is een goede aerobe aanvulling en gaat niet ten koste van kracht.
              De verhouding verschuift wel steeds meer richting echt bergwandelen naarmate de GR5 dichterbij komt.
            </p>
            <ul className="mt-3 flex flex-col gap-1.5 text-sm" style={{ color: 'var(--color-ink)' }}>
              {PARTS.map((p) => (
                <li key={p} className="flex gap-2"><span style={{ color: 'var(--color-gold)' }}>·</span>{p}</li>
              ))}
            </ul>
            <div className="mt-3 flex flex-col gap-1 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
              {GR5_TRAINING_SPLIT_SOURCES.map((s) => (
                <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-1 text-xs underline underline-offset-2" style={{ color: 'var(--color-sky)' }}>
                  {s.label}
                  <Icon name="buiten" size={14} />
                </a>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Portal>
  );
}

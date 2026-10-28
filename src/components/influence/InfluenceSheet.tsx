import { useState } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { entryForDay, entryForLog, type NoteTarget } from '../../engine/influence';
import type { SessionLog } from '../../models/training';
import { TimeoutError, withTimeout } from '../../utils/withTimeout';
import { useSheetClose } from '../../utils/useSheetClose';
import { Portal } from '../Portal';
import { SheetHeader } from '../SheetHeader';
import { Card, SecondaryButton } from '../ui';
import { InfluenceBlock } from './InfluenceBlock';
import { useKnownFacts } from './useInfluence';

// Het blad "Wat speelde er": voor een dag in de kalender van Logboek, voor een training zonder
// afwijkende hartslag (de rustige rij in het blad van die training) en voor een notitie uit
// Instellingen, waar je hem ook weg kunt halen. Het sluit via useSheetClose, zoals elk blad.
const REMOVE_LIMIT_MS = 10_000;

export function InfluenceSheet({
  eyebrow,
  title,
  line,
  target,
  log,
  removable = false,
  onClose,
}: {
  eyebrow: string;
  title: string;
  line?: string;
  target: NoteTarget;
  // De training waar de notitie bij hoort; zonder is het een dag.
  log?: SessionLog;
  // Alleen in Instellingen: "Weghalen" haalt de hele notitie weg.
  removable?: boolean;
  onClose: () => void;
}) {
  const { settings, removeInfluence } = useAppData();
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  const entry = target.logId ? entryForLog(settings.influences, target.logId) : entryForDay(settings.influences, target.date);
  const mode = target.logId ? 'log' : 'day';
  const facts = useKnownFacts(log ? { kind: 'log', log } : mode === 'day' ? { kind: 'day', date: target.date } : undefined);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function remove() {
    if (!entry || busy) return;
    setBusy(true);
    setNote(null);
    try {
      await withTimeout(removeInfluence(entry.id), REMOVE_LIMIT_MS, 'Weghalen');
      requestClose();
    } catch (err) {
      setNote(err instanceof TimeoutError ? 'Weghalen is nog niet bevestigd. Kijk zo of het weg is.' : 'Weghalen lukte niet. Er is niets veranderd; probeer het zo nog eens.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Portal>
      <div
        className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
        onClick={requestClose}
      >
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={`max-h-[85vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="rounded-b-none border-b-0 pb-8">
            <div className="-mt-2"><SheetHeader eyebrow={eyebrow} title={title} onClose={requestClose} /></div>
            {line && <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{line}</p>}
            <div className="mt-4">
              <InfluenceBlock target={target} entry={entry} facts={facts} mode={mode} showStravaLine={mode === 'log'} />
            </div>
            {removable && entry && (
              <div className="mt-4 flex flex-col gap-2">
                <div className="flex"><SecondaryButton onClick={() => void remove()} disabled={busy}>{busy ? 'Bezig…' : 'Weghalen'}</SecondaryButton></div>
                {note && <p role="status" className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{note}</p>}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Portal>
  );
}

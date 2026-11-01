import { useState } from 'react';
import { useAppData } from '../../../state/AppDataContext';
import { archivedMornings, clearArchivedMornings, putBackMornings, type ArchivedMornings } from '../../../storage/morningArchive';
import type { RecoveryMetric } from '../../../models/metrics';
import { withTimeout } from '../../../utils/withTimeout';
import { TextButton } from '../../TextButton';
import { Sheet } from '../Sheet';

// "Ochtendgetallen in back-up" uitzetten (docs/beslissingen/2026-11-01-ochtenden-archief.md).
// Zonder koppeling worden de ochtenden die alleen voor de back-up bewaard bleven opgeruimd; met
// een koppeling haalt de volgende keer ophalen het deel van langer dan 400 dagen geleden weg.
// Dat vraagt de pagina eerst. De lijst wordt vooraf gelezen en bewaard, zodat Ongedaan maken
// ook na een fout of te lang wachten precies die ochtenden terugzet.

const LIMIT_MS = 10_000;

const mornings = (n: number) => (n === 1 ? '1 ochtend' : `${n} ochtenden`);

type Note = { text: string; warn?: boolean; list?: RecoveryMetric[] };

export function useMorningBackupOff() {
  const { updateSettings } = useAppData();
  const [asking, setAsking] = useState<ArchivedMornings | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note | null>(null);

  async function onChange(on: boolean) {
    setNote(null);
    if (on) {
      await updateSettings({ morningInBackup: true });
      return;
    }
    let found: ArchivedMornings;
    try {
      found = await withTimeout(archivedMornings(), LIMIT_MS);
    } catch {
      setNote({ text: 'Dat lukte niet. Er is niets veranderd; probeer het zo nog eens.', warn: true });
      return;
    }
    if (found.list.length === 0) await updateSettings({ morningInBackup: false });
    else setAsking(found);
  }

  async function confirm(found: ArchivedMornings, close: () => void) {
    const { list, linked } = found;
    setBusy(true);
    try {
      await withTimeout(updateSettings({ morningInBackup: false }), LIMIT_MS);
      // Met een koppeling ruimt de volgende keer ophalen ze op; zonder gebeurt het nu, alles of niets.
      if (!linked) await withTimeout(clearArchivedMornings(list), LIMIT_MS);
      const n = list.length;
      const text = n === 0
        ? 'Uitgezet.'
        : linked
          ? `Uitgezet. ${n === 1 ? 'De ochtend van langer dan 400 dagen geleden verdwijnt' : `De ${n} ochtenden van langer dan 400 dagen geleden verdwijnen`} bij de volgende keer ophalen.`
          : `Uitgezet. ${n === 1 ? 'De bewaarde ochtend is' : `De ${n} bewaarde ochtenden zijn`} van deze telefoon gehaald.`;
      setNote({ text, list: n > 0 ? list : undefined });
    } catch {
      setNote({ text: 'Uitzetten lukte niet helemaal. Met Ongedaan maken staat alles weer zoals het was.', warn: true, list });
    } finally {
      setBusy(false);
      close();
    }
  }

  async function undo(list: RecoveryMetric[]) {
    setBusy(true);
    try {
      await withTimeout(putBackMornings(list), LIMIT_MS);
      await withTimeout(updateSettings({ morningInBackup: true }), LIMIT_MS);
      setNote({ text: 'Teruggezet. Je ochtenden staan weer op deze telefoon en gaan weer mee in je back-up.' });
    } catch {
      setNote({ text: 'Ongedaan maken lukte niet. Probeer het nog eens.', warn: true, list });
    } finally {
      setBusy(false);
    }
  }

  const notice = note && (
    <p className={`st-hint${note.warn ? ' warn' : ''}`} role="status">
      {note.text}{' '}
      {note.list && note.list.length > 0 && (
        <TextButton disabled={busy} onClick={() => void undo(note.list!)}>{busy ? 'Bezig…' : 'Ongedaan maken'}</TextButton>
      )}
    </p>
  );

  const n = asking?.list.length ?? 0;
  const sheet = asking !== null && (
    <Sheet
      eyebrow="Gegevens en back-up"
      title="Ochtendgetallen uitzetten"
      line="De bewaarde ochtenden verdwijnen van deze telefoon. Uitzetten?"
      onClose={() => setAsking(null)}
    >
      {(close) => (
        <>
          <p className="st-lead">
            {asking.linked
              ? `${n === 1 ? 'De ochtend van langer dan 400 dagen geleden verdwijnt' : `De ${n} ochtenden van langer dan 400 dagen geleden verdwijnen`} bij de volgende keer ophalen. De recente haalt ASCEND gewoon opnieuw op.`
              : `Het gaat om ${mornings(n)} met je slaap, rusthartslag en HRV. Er is geen koppeling met je horloge die ze opnieuw kan ophalen, dus daarna staan ze alleen nog in een back-up die je al maakte.`}{' '}
            Wat speelde er, vroeg ziek zien en de ochtendregel kunnen je ochtenden dan niet meer vergelijken.
          </p>
          <div className="st-btns">
            <button type="button" className="st-btn" disabled={busy} onClick={close}>Annuleren</button>
            <button type="button" className="st-btn red" disabled={busy} onClick={() => void confirm(asking, close)}>
              {busy ? 'Bezig…' : 'Uitzetten'}
            </button>
          </div>
        </>
      )}
    </Sheet>
  );

  return { onChange, notice, sheet };
}

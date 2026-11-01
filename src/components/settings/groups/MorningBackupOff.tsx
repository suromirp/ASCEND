import { useState } from 'react';
import { useAppData } from '../../../state/AppDataContext';
import { archivedMornings, clearArchivedMornings, putBackMornings } from '../../../storage/morningArchive';
import type { RecoveryMetric } from '../../../models/metrics';
import { withTimeout } from '../../../utils/withTimeout';
import { TextButton } from '../../TextButton';
import { Sheet } from '../Sheet';

// "Ochtendgetallen in back-up" uitzetten (docs/beslissingen/2026-11-01-ochtenden-archief.md).
// Is er geen koppeling, dan worden de ochtenden die alleen voor de back-up bewaard bleven
// opgeruimd. Dat vraagt de pagina eerst, en daarna staat Ongedaan maken in de melding zolang je
// op deze pagina blijft. Met een koppeling verandert er niets op de telefoon en is het één tik.

const LIMIT_MS = 10_000;

const mornings = (n: number) => (n === 1 ? '1 ochtend' : `${n} ochtenden`);

type Note = { text: string; removed?: RecoveryMetric[] };

export function useMorningBackupOff() {
  const { updateSettings } = useAppData();
  const [asking, setAsking] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note | null>(null);

  async function onChange(on: boolean) {
    setNote(null);
    if (on) {
      await updateSettings({ morningInBackup: true });
      return;
    }
    let count = 0;
    try {
      count = (await withTimeout(archivedMornings(), LIMIT_MS)).length;
    } catch {
      setNote({ text: 'Dat lukte niet. Er is niets veranderd; probeer het zo nog eens.' });
      return;
    }
    if (count === 0) await updateSettings({ morningInBackup: false });
    else setAsking(count);
  }

  async function confirm(close: () => void) {
    setBusy(true);
    try {
      await withTimeout(updateSettings({ morningInBackup: false }), LIMIT_MS);
      const removed = await withTimeout(clearArchivedMornings(), LIMIT_MS);
      setNote({ text: `Uitgezet. ${removed.length === 1 ? 'De bewaarde ochtend is' : `De ${removed.length} bewaarde ochtenden zijn`} van deze telefoon gehaald.`, removed });
    } catch {
      setNote({ text: 'Uitzetten lukte niet helemaal. Kijk of de schakelaar uit staat en probeer het zo nog eens.' });
    } finally {
      setBusy(false);
      close();
    }
  }

  async function undo(removed: RecoveryMetric[]) {
    setBusy(true);
    try {
      await withTimeout(putBackMornings(removed), LIMIT_MS);
      await withTimeout(updateSettings({ morningInBackup: true }), LIMIT_MS);
      setNote({ text: 'Teruggezet. Je ochtenden staan weer op deze telefoon en gaan weer mee in je back-up.' });
    } catch {
      setNote({ text: 'Ongedaan maken lukte niet. Probeer het nog eens.', removed });
    } finally {
      setBusy(false);
    }
  }

  const notice = note && (
    <p className="st-hint" role="status">
      {note.text}{' '}
      {note.removed && note.removed.length > 0 && (
        <TextButton disabled={busy} onClick={() => void undo(note.removed!)}>Ongedaan maken</TextButton>
      )}
    </p>
  );

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
            Het gaat om {mornings(asking)} met je slaap, rusthartslag en HRV. Er is geen koppeling met je horloge die ze
            opnieuw kan ophalen, dus daarna staan ze alleen nog in een back-up die je al maakte.
          </p>
          <div className="st-btns">
            <button type="button" className="st-btn" disabled={busy} onClick={close}>Annuleren</button>
            <button type="button" className="st-btn red" disabled={busy} onClick={() => void confirm(close)}>
              {busy ? 'Bezig' : 'Uitzetten'}
            </button>
          </div>
        </>
      )}
    </Sheet>
  );

  return { onChange, notice, sheet };
}

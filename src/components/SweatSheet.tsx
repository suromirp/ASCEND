import { useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import type { SessionLog } from '../models/training';
import { entryResultLine, sweatLossMl } from '../engine/sweat';
import { buildSweatEntry, preWeightForLog } from '../engine/sweatMoments';
import { formatDateNL } from '../utils/dates';
import { makeId } from '../utils/id';
import { TimeoutError, withTimeout } from '../utils/withTimeout';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { SheetHeader } from './SheetHeader';
import { NumberField } from './NumberField';
import { Card, PrimaryButton, SecondaryButton } from './ui';

const SAVE_LIMIT_MS = 10_000;

// Het blad "Zweetverlies meten" bij een training: je gewicht voor en na, wat je dronk en
// plaste, en eventueel de schatting van je horloge. De uitkomst en de uitleg komen uit
// engine/sweat.ts. Het sluit via useSheetClose, zoals elk blad.
export function SweatSheet({ log, templateName, onClose }: { log: SessionLog; templateName: string; onClose: () => void }) {
  const { settings, saveSweat } = useAppData();
  const existing = settings.sweatEntries?.find((e) => e.logId === log.id);
  const { closing, requestClose } = useSheetClose(onClose);
  const pre = preWeightForLog(settings.sweatPre, settings.sweatEntries, log);
  const [before, setBefore] = useState(existing?.weightBeforeKg ?? pre);
  const [after, setAfter] = useState(existing?.weightAfterKg);
  const [drank, setDrank] = useState(existing?.drankMl);
  const [pee, setPee] = useState(existing?.peeMl);
  const [watch, setWatch] = useState(existing?.watchMl);
  const [temp, setTemp] = useState(existing?.tempC ?? log.detail?.conditions?.tempC);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const draft = buildSweatEntry(
    log,
    { weightBeforeKg: before, weightAfterKg: after, drankMl: drank, peeMl: pee, watchMl: watch, tempC: temp },
    existing,
    makeId('sweat'),
    new Date().toISOString(),
  );
  const loss = sweatLossMl(draft);
  const result = entryResultLine(draft);
  const hasNumbers = loss !== undefined || watch !== undefined;
  // Een verlies van nul of minder, of een onmogelijk tempo, geeft geen uitkomst: zeg dat.
  const unusable = hasNumbers && !result;

  async function save() {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      // Lege velden worden niet bewaard (buildSweatEntry laat ze weg).
      await withTimeout(saveSweat(draft), SAVE_LIMIT_MS);
      requestClose();
    } catch (err) {
      setNote(err instanceof TimeoutError ? 'Opslaan duurt langer dan verwacht. Kijk zo of je meting er staat; staat hij er niet, probeer het dan nog eens.' : 'Opslaan lukte niet. Probeer het zo nog eens.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      await withTimeout(saveSweat({ logId: log.id, remove: true }), SAVE_LIMIT_MS);
      requestClose();
    } catch (err) {
      setNote(err instanceof TimeoutError ? 'Weghalen duurt langer dan verwacht. Probeer het zo nog eens.' : 'Weghalen lukte niet. Probeer het zo nog eens.');
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
          role="dialog"
          aria-modal="true"
          aria-label="Zweetverlies meten"
          className={`max-h-[88vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="rounded-b-none border-b-0 pb-8">
            <div className="-mt-2"><SheetHeader eyebrow={formatDateNL(log.completedDate)} title="Zweetverlies" onClose={requestClose} /></div>
            <p className="mt-0.5 text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
              {templateName}, {log.durationMinutes} min. Weeg jezelf zonder kleren, voor het begin en na afloop, allebei na het plassen. Een kilo minder is ongeveer een liter zweet.
            </p>

            <div className="mt-4 flex flex-col gap-3">
              <NumberField tall label="Gewicht voor" value={before} onChange={setBefore} unit="kg" decimals={1} />
              <NumberField tall label="Gewicht na" value={after} onChange={setAfter} unit="kg" decimals={1} />
              <NumberField tall label="Gedronken onderweg" value={drank} onChange={setDrank} unit="ml" helper="Alles wat je dronk, ook uit een fles of bij een bron." />
              <NumberField tall label="Geplast tijdens de training" value={pee} onChange={setPee} unit="ml" helper="Plas je onderweg, schat dan hoeveel. Dat gewicht ging niet door zweet weg. Laat leeg als je niet plaste." />
              <NumberField tall label="Temperatuur" value={temp} onChange={setTemp} unit="°C" decimals={1} helper={log.detail?.conditions?.tempC !== undefined ? 'Ingevuld uit het weer bij deze training.' : 'Zonder temperatuur kan ASCEND de meting niet op een warme of koude dag zetten.'} />
              <NumberField tall label="Schatting van je horloge" value={watch} onChange={setWatch} unit="ml" helper="Alleen als je niet woog. Een eigen weging gaat altijd voor." />
            </div>

            {result && <p role="status" className="mt-4 text-sm" style={{ color: 'var(--color-ink)' }}>{result}</p>}
            {unusable && (
              <p role="status" className="mt-4 text-xs leading-snug" style={{ color: 'var(--color-warning)' }}>
                Hier komt geen bruikbaar zweetverlies uit. Controleer je gewichten en wat je dronk en plaste, of meet bij een training van minstens 30 minuten.
              </p>
            )}

            <div className="mt-4 flex flex-col gap-3">
              <PrimaryButton onClick={() => void save()} disabled={busy || !result}>{busy ? 'Bezig…' : 'Opslaan'}</PrimaryButton>
              {existing && <SecondaryButton onClick={() => void remove()} disabled={busy}>Meting weghalen</SecondaryButton>}
              {note && <p role="status" className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{note}</p>}
            </div>
          </Card>
        </div>
      </div>
    </Portal>
  );
}

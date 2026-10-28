import { useState } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { SEVERITY_CHOICES } from '../../data/bodyCare';
import { isValidReportDate, offFigureParts } from '../../engine/bodyMap';
import type { InjurySeverity } from '../../models/injury';
import { todayISO } from '../../utils/dates';
import { useSheetClose } from '../../utils/useSheetClose';
import { withTimeout } from '../../utils/withTimeout';
import { ChoiceStrip } from '../ChoiceStrip';
import { Portal } from '../Portal';
import { SheetHeader } from '../SheetHeader';
import { Card, PrimaryButton, SecondaryButton, SheetGrip } from '../ui';
import { REPORT_TIMEOUT_MS, reportInputStyle } from './reportConfig';

const OTHER = '__anders__';

// De datum van een melding: standaard vandaag, nooit in de toekomst.
export function ReportDateField({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const today = todayISO();
  return (
    <div>
      <label htmlFor={id} className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Sinds wanneer?</label>
      <input
        id={id}
        type="date"
        value={value}
        max={today}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 min-h-[44px] w-full rounded-lg border px-3 text-base"
        style={{ ...reportInputStyle, colorScheme: 'dark' }}
      />
    </div>
  );
}

// "Iets anders melden": een klacht aan iets wat niet op het figuur staat, zoals een elleboog,
// met een eigen naam, ernst en datum. Zelfde addInjury als het formulier bij een plek; ook
// dit verandert de planning niet en vraagt dus geen Akkoord.
export function ReportSheet({ onClose }: { onClose: () => void }) {
  const { addInjury } = useAppData();
  const [busy, setBusy] = useState(false);
  const { closing, requestClose, sheetRef } = useSheetClose(onClose, 200, () => !busy);
  const options = offFigureParts();
  const [choice, setChoice] = useState<string>(options[0] ?? OTHER);
  const [custom, setCustom] = useState('');
  const [severity, setSeverity] = useState<InjurySeverity>('licht');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [failed, setFailed] = useState(false);

  const name = choice === OTHER ? custom.trim() : choice;
  const valid = name.length > 0 && isValidReportDate(date, todayISO());
  const line = SEVERITY_CHOICES.find((c) => c.value === severity)?.line;

  async function report() {
    if (!valid || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await withTimeout(addInjury({ date, bodyPart: name, severity, note: note.trim() || undefined }), REPORT_TIMEOUT_MS);
      setBusy(false);
      requestClose();
      return;
    } catch {
      setFailed(true);
    }
    setBusy(false);
  }

  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={() => !busy && requestClose()}>
        <div ref={sheetRef}
          className={`relative max-h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label="Iets anders melden"
        >
          <SheetGrip />
          <Card className="flex flex-col gap-3 rounded-b-none border-b-0 pb-6">
            <SheetHeader eyebrow="Klacht" title="Iets anders melden" onClose={() => !busy && requestClose()} />
            <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Voor een plek die niet op het figuur staat, of als je het liever zelf benoemt.</p>
            <div>
              <label htmlFor="klacht-plek" className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Waar zit het?</label>
              <select
                id="klacht-plek"
                value={choice}
                onChange={(e) => setChoice(e.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-lg border px-3 text-base"
                style={reportInputStyle}
              >
                {options.map((p) => <option key={p} value={p} style={{ background: 'var(--color-card)' }}>{p}</option>)}
                <option value={OTHER} style={{ background: 'var(--color-card)' }}>Iets anders</option>
              </select>
            </div>
            {choice === OTHER && (
              <div>
                <label htmlFor="klacht-naam" className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Hoe noem je het?</label>
                <input
                  id="klacht-naam"
                  type="text"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  maxLength={60}
                  className="mt-1 min-h-[44px] w-full rounded-lg border px-3 text-base"
                  style={reportInputStyle}
                />
              </div>
            )}
            <p className="text-base" style={{ color: 'var(--color-ink)' }}>Hoe erg is het nu?</p>
            <ChoiceStrip
              label="Hoe erg"
              value={severity}
              options={SEVERITY_CHOICES.map((c) => ({ value: c.value, label: c.label }))}
              onChange={(v) => v && setSeverity(v)}
            />
            {line && <p className="-mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{line}</p>}
            <ReportDateField id="klacht-datum-anders" value={date} onChange={setDate} />
            <div>
              <label htmlFor="klacht-notitie-anders" className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Wat merk je? (mag leeg)</label>
              <textarea
                id="klacht-notitie-anders"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={280}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-base"
                style={reportInputStyle}
              />
            </div>
            {failed && <p role="alert" className="text-sm" style={{ color: 'var(--color-danger-text)' }}>Opslaan lukte niet. Probeer het nog eens.</p>}
            <PrimaryButton onClick={() => void report()} disabled={!valid || busy}>{busy ? 'Bezig…' : 'Melden'}</PrimaryButton>
            <SecondaryButton onClick={requestClose} disabled={busy}>Annuleren</SecondaryButton>
          </Card>
        </div>
      </div>
    </Portal>
  );
}

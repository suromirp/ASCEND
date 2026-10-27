import { useState } from 'react';
import type { SessionTemplate } from '../models/training';
import { useAppData } from '../state/AppDataContext';
import { asksSweat, preWeightOn, sweatActivityOfTemplate, weightSuggestion } from '../engine/sweatMoments';
import { formatNumberNL } from '../utils/number';
import { todayISO } from '../utils/dates';
import { TimeoutError, withTimeout } from '../utils/withTimeout';
import { NumberField } from './NumberField';
import { TextButton } from './TextButton';
import { SecondaryButton } from './ui';

const SAVE_LIMIT_MS = 10_000;

// De herinnering om je te wegen, op de missiekaart van een loop, wandeling of tocht
// (docs/beslissingen/2026-10-27-zweet-bij-afronden.md). Een kleine tekstknop die een veld
// openklapt; een gewicht dat er al is (MacroFactor, vandaag of gisteren) staat erbij als
// voorstel met één tik. Het gewicht blijft bewaard tot de log van vandaag er is
// (AppSettings.sweatPre) en komt dan vanzelf bij het afronden terug.
export function SweatBeforeRow({ template, className = '' }: { template: SessionTemplate; className?: string }) {
  const { settings, saveSweatPre } = useAppData();
  const today = todayISO();
  const stored = preWeightOn(settings.sweatPre, today);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<number | undefined>(stored?.weightKg);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  if (!asksSweat(settings.askSweat) || !sweatActivityOfTemplate(template)) return null;

  const suggestion = weightSuggestion(settings.weightEntries, settings.weightFromMacroFactor, today);

  async function save(kg: number | undefined) {
    if (busy || kg === undefined) return;
    setBusy(true);
    setNote(null);
    try {
      await withTimeout(saveSweatPre(today, kg), SAVE_LIMIT_MS);
      setOpen(false);
    } catch (err) {
      setNote(err instanceof TimeoutError ? 'Opslaan duurt langer dan verwacht. Probeer het zo nog eens.' : 'Opslaan lukte niet. Probeer het zo nog eens.');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className={`flex items-center justify-between gap-3 ${className}`}>
        {stored ? (
          <>
            <p className="text-sm tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>Gewicht voor: {formatNumberNL(stored.weightKg, 1)} kg</p>
            <TextButton tone="dim" onClick={() => { setValue(stored.weightKg); setOpen(true); }}>Wijzig</TextButton>
          </>
        ) : (
          <TextButton onClick={() => setOpen(true)} icon="omlaag">Weeg je even voor je begint</TextButton>
        )}
      </div>
    );
  }

  const when = suggestion?.date === today ? 'van vandaag' : 'van gisteren';
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-label="Gewicht voor de training">
      <NumberField tall label="Gewicht voor (kg)" value={value} onChange={setValue} unit="kg" decimals={1} helper="Zonder kleren, na het plassen. Na afloop vraagt ASCEND naar je gewicht erna." />
      {suggestion && value === undefined && (
        <div>
          <TextButton onClick={() => setValue(suggestion.kg)}>Gebruik {formatNumberNL(suggestion.kg, 1)} kg {when}</TextButton>
        </div>
      )}
      <div className="flex items-center gap-2">
        <SecondaryButton onClick={() => void save(value)} disabled={busy || value === undefined}>{busy ? 'Bezig…' : 'Opslaan'}</SecondaryButton>
        <TextButton tone="dim" onClick={() => setOpen(false)}>Annuleren</TextButton>
      </div>
      {note && <p role="status" className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{note}</p>}
    </div>
  );
}

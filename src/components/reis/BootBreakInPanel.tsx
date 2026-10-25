import { useState } from 'react';
import { DEFAULT_BOOTS_NAME, type BootBreakInStatus, type BootsState } from '../../engine/bootBreakIn';
import { formatNumberNL } from '../../utils/number';
import { todayISO } from '../../utils/dates';
import { SecondaryButton, Eyebrow } from '../ui';
import { TextButton } from '../TextButton';
import { shortDateNL } from './format';

// Bij de taak "schoenen": sinds wanneer je de nieuwe bergschoenen draagt, hoeveel
// ASCEND er sindsdien telde en of dat op tijd is. De berekening staat in
// engine/bootBreakIn.ts; dit blad vraagt alleen de datum en de naam.
export function BootBreakInPanel({ status, boots, onSave }: { status: BootBreakInStatus; boots: BootsState | undefined; onSave: (boots: BootsState | undefined) => void }) {
  const today = todayISO();
  const [editing, setEditing] = useState(!boots);
  const [since, setSince] = useState(boots?.since ?? today);
  const [name, setName] = useState(boots?.name ?? '');
  const field = 'min-h-[44px] w-full rounded-lg border bg-transparent px-3 text-base';
  const fieldStyle = { borderColor: 'var(--color-control-border)', color: 'var(--color-ink)', colorScheme: 'dark' } as const;

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-surface)' }}>
      <Eyebrow>{boots ? status.name : 'Je bergschoenen'}</Eyebrow>
      <p className="text-sm leading-snug" style={{ color: status.kind === 'late' ? 'var(--color-warning)' : 'var(--color-ink)' }}>{status.line}</p>
      {boots && (
        <p className="text-xs leading-relaxed tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
          Sinds {shortDateNL(boots.since)}. {status.detail ? `${status.detail}. ` : ''}Stijging {formatNumberNL(Math.round(status.gainM), 0)} m. Alleen wandelingen en tochten tellen. Hardloopschoenen houdt Garmin bij.
        </p>
      )}
      {editing ? (
        <div className="flex flex-col gap-2">
          <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }} htmlFor="schoenen-datum">Eerste dag dat je ze draagt</label>
          <input id="schoenen-datum" type="date" value={since} max={today} onChange={(e) => e.target.value && setSince(e.target.value)} className={field} style={fieldStyle} />
          <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }} htmlFor="schoenen-naam">Naam (mag leeg)</label>
          <input id="schoenen-naam" type="text" value={name} maxLength={40} placeholder={DEFAULT_BOOTS_NAME} onChange={(e) => setName(e.target.value)} className={field} style={fieldStyle} />
          <div className="flex gap-3">
            {boots && <SecondaryButton onClick={() => { setSince(boots.since); setName(boots.name ?? ''); setEditing(false); }}>Annuleren</SecondaryButton>}
            <SecondaryButton onClick={() => { onSave({ since, ...(name.trim() ? { name: name.trim() } : {}) }); setEditing(false); }}>Opslaan</SecondaryButton>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-4">
          <TextButton onClick={() => setEditing(true)}>Datum of naam wijzigen</TextButton>
          <TextButton tone="dim" onClick={() => { onSave(undefined); setSince(today); setName(''); setEditing(true); }}>Datum wissen</TextButton>
        </div>
      )}
    </div>
  );
}

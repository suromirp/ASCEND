import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import type { InjurySeverity } from '../models/injury';
import { formatDateNL, todayISO } from '../utils/dates';
import { Card, PrimaryButton, SecondaryButton, Eyebrow } from '../components/ui';

const SEVERITY_LABEL: Record<InjurySeverity, string> = { licht: 'Licht', matig: 'Matig', ernstig: 'Ernstig' };
const SEVERITY_COLOR: Record<InjurySeverity, string> = {
  licht: 'var(--color-success)',
  matig: 'var(--color-warning)',
  ernstig: 'var(--color-danger)',
};

const inputStyle = { background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' };

export function InjuriesPage() {
  const navigate = useNavigate();
  const { injuryNotes, addInjury, resolveInjury, deleteInjury } = useAppData();
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [bodyPart, setBodyPart] = useState('');
  const [severity, setSeverity] = useState<InjurySeverity>('licht');
  const [note, setNote] = useState('');

  const open = useMemo(() => injuryNotes.filter((n) => !n.resolvedDate).sort((a, b) => (a.date < b.date ? 1 : -1)), [injuryNotes]);
  const resolved = useMemo(() => injuryNotes.filter((n) => n.resolvedDate).sort((a, b) => (a.date < b.date ? 1 : -1)), [injuryNotes]);

  async function handleAdd() {
    if (!bodyPart.trim()) return;
    await addInjury({ date, bodyPart: bodyPart.trim(), severity, note: note.trim() || undefined });
    setBodyPart('');
    setNote('');
    setSeverity('licht');
    setDate(todayISO());
    setShowForm(false);
  }

  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-10 pt-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-lg" style={{ color: 'var(--color-ink-dim)' }}>‹</button>
        <div>
          <p className="font-display text-lg" style={{ color: 'var(--color-bronze)' }}>BLESSURES</p>
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Bijhouden zonder je trainingsgeschiedenis aan te passen</p>
        </div>
      </div>

      {!showForm ? (
        <PrimaryButton onClick={() => setShowForm(true)}>BLESSURE TOEVOEGEN</PrimaryButton>
      ) : (
        <Card className="flex flex-col gap-3">
          <Eyebrow>NIEUWE BLESSURE</Eyebrow>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Datum</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm" style={inputStyle} />
            </div>
            <div className="flex-1">
              <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Ernst</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value as InjurySeverity)} className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm" style={inputStyle}>
                {(Object.keys(SEVERITY_LABEL) as InjurySeverity[]).map((s) => (
                  <option key={s} value={s} style={{ background: 'var(--color-card)' }}>{SEVERITY_LABEL[s]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Lichaamsdeel</label>
            <input
              type="text"
              value={bodyPart}
              onChange={(e) => setBodyPart(e.target.value)}
              placeholder="bijv. rechterknie"
              className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Notitie (optioneel)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
              style={inputStyle}
            />
          </div>
          <div className="flex gap-3">
            <SecondaryButton onClick={() => setShowForm(false)}>ANNULEREN</SecondaryButton>
            <PrimaryButton onClick={handleAdd} disabled={!bodyPart.trim()}>OPSLAAN</PrimaryButton>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        <Eyebrow>ACTIEF{open.length > 0 ? ` (${open.length})` : ''}</Eyebrow>
        {open.length === 0 && <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Geen actieve blessures.</p>}
        {open.map((n) => (
          <Card key={n.id} className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{n.bodyPart}</p>
                <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                  {formatDateNL(n.date)} • <span style={{ color: SEVERITY_COLOR[n.severity] }}>{SEVERITY_LABEL[n.severity]}</span>
                </p>
              </div>
            </div>
            {n.note && <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{n.note}</p>}
            <div className="flex gap-3">
              <SecondaryButton onClick={() => deleteInjury(n.id)}>VERWIJDEREN</SecondaryButton>
              <PrimaryButton onClick={() => resolveInjury(n.id)}>MARKEER HERSTELD</PrimaryButton>
            </div>
          </Card>
        ))}
      </div>

      {resolved.length > 0 && (
        <div className="flex flex-col gap-2">
          <Eyebrow>HERSTELD</Eyebrow>
          {resolved.map((n) => (
            <div key={n.id} className="flex items-center justify-between rounded-xl border px-3 py-2.5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-card-border)' }}>
              <div>
                <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{n.bodyPart}</p>
                <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                  {formatDateNL(n.date)} → {n.resolvedDate ? formatDateNL(n.resolvedDate) : ''}
                </p>
              </div>
              <button onClick={() => deleteInjury(n.id)} className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { todayISO, formatDateNL } from '../utils/dates';
import { DIMENSION_META, DIMENSION_ORDER } from '../data/baselineQuestions';
import { Card, PrimaryButton, SecondaryButton, Eyebrow } from './ui';

// Targeted baseline questions (Algorithm Contract v0.2 §27) — the full,
// generic list across every dimension, regardless of any specific goal's
// actual demand. Advanced/fallback entry point (Phase 7) — the primary way
// to answer these is now the goal setup wizard's targeted baseline step
// (components/GoalSetupWizard.tsx), which only asks about what a goal
// draft actually demands and doesn't already know. This card stays for
// manual entry any time, goal-independent. Answers here are stored as
// CapabilityEvidence with evidenceType:'manual' — never a fake SessionLog
// (§5.4).
export function BaselineEvidenceCard() {
  const { capabilityEvidence, addManualCapabilityEvidence, deleteCapabilityEvidence } = useAppData();
  const manualEntries = capabilityEvidence.filter((e) => e.source === 'manualEntry');
  const [adding, setAdding] = useState(false);
  const [dimension, setDimension] = useState<(typeof DIMENSION_ORDER)[number]>(DIMENSION_ORDER[0]);
  const [discipline, setDiscipline] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());

  const meta = DIMENSION_META[dimension];

  async function handleSave() {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    await addManualCapabilityEvidence({
      key: { dimension, discipline: meta.needsDiscipline && discipline ? discipline : undefined },
      measured: { amount: parsed, unit: meta.unit },
      date,
    });
    setAmount('');
    setAdding(false);
  }

  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>BASELINE / CAPACITEITSCHECK</Eyebrow>
      <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>
        Korte, gerichte vragen over wat je aantoonbaar kunt — helpt ASCEND straks betere doelen en trainingsdoelen
        voor te stellen. Handmatige antwoorden, geen verzonnen sessies.
      </p>

      {manualEntries.length > 0 && (
        <div className="flex flex-col gap-2">
          {manualEntries.map((e) => {
            const label = e.key.dimension === 'fatigue_resistance' ? e.key.dimension : DIMENSION_META[e.key.dimension]?.label ?? e.key.dimension;
            return (
              <div key={e.id} className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <span style={{ color: 'var(--color-ink)' }}>{label}</span>
                  <span className="ml-2 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                    {e.measured.amount} {e.measured.unit} — {formatDateNL(e.date)}
                  </span>
                </div>
                <button onClick={() => deleteCapabilityEvidence(e.id)} className="text-xs" style={{ color: 'var(--color-danger)' }}>
                  verwijderen
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!adding ? (
        <SecondaryButton onClick={() => setAdding(true)}>METING TOEVOEGEN</SecondaryButton>
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Onderdeel</label>
            <select
              value={dimension}
              onChange={(e) => setDimension(e.target.value as typeof dimension)}
              className="mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm"
              style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
            >
              {DIMENSION_ORDER.map((key) => (
                <option key={key} value={key} style={{ background: 'var(--color-charcoal)' }}>{DIMENSION_META[key].label}</option>
              ))}
            </select>
          </div>
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{meta.question}</p>
          {meta.needsDiscipline && (
            <div>
              <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Sport (bijv. hardlopen, hiken)</label>
              <input
                type="text"
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm"
                style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
              />
            </div>
          )}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Waarde ({meta.unit})</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm"
                style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Datum</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={todayISO()}
                className="mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm"
                style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <SecondaryButton onClick={() => setAdding(false)}>ANNULEREN</SecondaryButton>
            <PrimaryButton onClick={handleSave}>OPSLAAN</PrimaryButton>
          </div>
        </div>
      )}
    </Card>
  );
}

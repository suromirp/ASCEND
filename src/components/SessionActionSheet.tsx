import { useState } from 'react';
import type { PlannedSession, SessionTemplate, SessionVariant } from '../models/training';
import type { Program } from '../models/program';
import { availableVariants, resolveEffectiveFullDuration, weeklyProgressionNote } from '../engine/substitutions';
import { Card, PrimaryButton, SecondaryButton, Eyebrow } from './ui';

export function SessionActionSheet({
  session,
  template,
  program,
  onStart,
  onMove,
  onSkip,
  onClose,
}: {
  session: PlannedSession;
  template: SessionTemplate;
  program: Program | null;
  onStart: (variant: SessionVariant) => void;
  onMove: (date: string) => void;
  onSkip: () => void;
  onClose: () => void;
}) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const variants = availableVariants(template);
  const fullDuration = resolveEffectiveFullDuration(template, session.scheduledDate, program);
  const note = weeklyProgressionNote(template, session.scheduledDate, program);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <Card className="rounded-b-none border-b-0 pb-6">
          <Eyebrow>{session.scheduledDate}</Eyebrow>
          <h3 className="mt-1 font-display text-xl" style={{ color: 'var(--color-ink)' }}>{template.name}</h3>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
            ±{fullDuration} min{note ? ` • ${note}` : ''}{template.focus ? ` • ${template.focus}` : ''}
          </p>

          <div className="mt-4 flex flex-col gap-2">
            {variants.map((v) => (
              <PrimaryButton key={v} onClick={() => onStart(v)}>
                {v === 'full' ? 'START VOLLEDIGE SESSIE' : v === 'short' ? 'START KORTE VERSIE' : 'START MINIMUM VERSIE'}
              </PrimaryButton>
            ))}
          </div>

          <div className="mt-3 flex gap-3">
            <SecondaryButton onClick={() => setShowDatePicker((s) => !s)}>VERPLAATS</SecondaryButton>
            <SecondaryButton onClick={onSkip}>OVERSLAAN</SecondaryButton>
          </div>

          {showDatePicker && (
            <div className="mt-3 rounded-xl border p-2" style={{ borderColor: 'var(--color-card-border)' }}>
              <input
                type="date"
                className="w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm"
                style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
                onChange={(e) => e.target.value && onMove(e.target.value)}
              />
            </div>
          )}

          <button onClick={onClose} className="mt-4 w-full text-center text-xs" style={{ color: 'var(--color-ink-dim)' }}>
            Sluiten
          </button>
        </Card>
      </div>
    </div>
  );
}

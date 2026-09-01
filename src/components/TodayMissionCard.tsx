import { useState } from 'react';
import type { SessionTemplate, SessionVariant, SubjectiveFeel } from '../models/training';
import { availableVariants } from '../engine/substitutions';
import { getTrainingGuide } from '../data/trainingGuide';
import { TrainingGuideSheet } from './TrainingGuideSheet';
import { Card, PrimaryButton, SecondaryButton, Eyebrow, InfoButton } from './ui';

const TYPE_LABEL: Record<SessionTemplate['type'], string> = {
  strength: 'Kracht',
  cardio: 'Cardio',
  hiking: 'Avontuur',
  recovery: 'Herstel',
  adventure: 'Avontuur',
};

const FEEL_LABEL: Record<SubjectiveFeel, string> = { better: 'BETER', normal: 'NORMAAL', worse: 'SLECHTER' };

export function TodayMissionCard({
  template,
  fullDuration,
  weekNote,
  quickComplete = false,
  onStart,
  onMove,
  onSkip,
}: {
  template: SessionTemplate;
  fullDuration: number;
  weekNote?: string;
  quickComplete?: boolean;
  onStart: (variant: SessionVariant, feel?: SubjectiveFeel) => void;
  onMove: (date: string) => void;
  onSkip: () => void;
}) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const variants = availableVariants(template);
  const shortVariant = variants.find((v) => v === 'short');
  const guide = getTrainingGuide(template.id);

  return (
    <Card texture className="flex flex-col gap-4">
      <div>
        <div className="flex items-start justify-between gap-2">
          <Eyebrow>VANDAAG</Eyebrow>
          {guide && <InfoButton onClick={() => setShowGuide(true)} />}
        </div>
        <h2 className="mt-1 font-display text-2xl" style={{ color: 'var(--color-ink)' }}>{template.name}</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>
          {TYPE_LABEL[template.type]} • ±{fullDuration} min{weekNote ? ` • ${weekNote}` : ''}
        </p>
        {template.focus && <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{template.focus}</p>}
      </div>

      {showGuide && guide && <TrainingGuideSheet title={template.name} guide={guide} onClose={() => setShowGuide(false)} />}

      {quickComplete ? (
        <div>
          <p className="mb-1.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Hoe voelde dit t.o.v. normaal?</p>
          <div className="flex gap-2">
            {(['better', 'normal', 'worse'] as const).map((f) => (
              <PrimaryButton key={f} onClick={() => onStart('full', f)} fullWidth={false} className="text-xs">{FEEL_LABEL[f]}</PrimaryButton>
            ))}
          </div>
        </div>
      ) : (
        <PrimaryButton onClick={() => onStart('full')}>SESSIE STARTEN</PrimaryButton>
      )}

      <div className="flex gap-2">
        {!quickComplete && shortVariant && <SecondaryButton onClick={() => onStart('short')}>KORTE VERSIE</SecondaryButton>}
        <SecondaryButton onClick={() => setShowDatePicker((s) => !s)}>VERPLAATS</SecondaryButton>
        <SecondaryButton onClick={onSkip}>OVERSLAAN</SecondaryButton>
      </div>

      {showDatePicker && (
        <div className="flex items-center gap-2 rounded-xl border p-2" style={{ borderColor: 'var(--color-card-border)' }}>
          <input
            type="date"
            className="flex-1 rounded-lg border bg-transparent px-2 py-1.5 text-sm"
            style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
            onChange={(e) => {
              if (e.target.value) {
                onMove(e.target.value);
                setShowDatePicker(false);
              }
            }}
          />
        </div>
      )}
    </Card>
  );
}

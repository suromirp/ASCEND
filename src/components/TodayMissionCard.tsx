import { useState } from 'react';
import type { SessionTemplate, SessionVariant, SubjectiveFeel } from '../models/training';
import { availableVariants } from '../engine/substitutions';
import { getTrainingGuide, guideDayLabel } from '../data/trainingGuide';
import { todayISO } from '../utils/dates';
import { TrainingGuideSheet } from './TrainingGuideSheet';
import { MoveSuggestions } from './MoveSuggestions';
import type { MoveSuggestion } from '../engine/moveSuggestions';
import { Card, PrimaryButton, SecondaryButton, Eyebrow, InfoButton } from './ui';
import { sessionKindLabel } from '../engine/sports';


const FEEL_LABEL: Record<SubjectiveFeel, string> = { better: 'BETER', normal: 'NORMAAL', worse: 'SLECHTER' };

export function TodayMissionCard({
  template,
  fullDuration,
  weekNote,
  quickComplete = false,
  onStart,
  onMove,
  onSkip,
  suggestions,
  onPickSuggestion,
  originalDate,
  coachLine,
}: {
  template: SessionTemplate;
  fullDuration: number;
  weekNote?: string;
  quickComplete?: boolean;
  onStart: (variant: SessionVariant, feel?: SubjectiveFeel, durationMinutes?: number) => void;
  onMove: (date: string) => void;
  onSkip: () => void;
  suggestions: MoveSuggestion[];
  onPickSuggestion: (suggestion: MoveSuggestion) => void;
  originalDate?: string;
  // engine/coach.ts#coachLineForToday
  coachLine?: string;
}) {
  const [showMove, setShowMove] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  // Prefilled with ASCEND's own estimate, but editable — MacroFactor knows
  // the real elapsed time for a quick-complete strength session, and that's
  // usually more accurate than the template's fixed duration.
  const [quickDuration, setQuickDuration] = useState<number | ''>(fullDuration);
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
          {sessionKindLabel(template)} • ±{fullDuration} min{weekNote ? ` • ${weekNote}` : ''}
        </p>
        {template.focus && <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{template.focus}</p>}
        {coachLine && (
          <p className="mt-3 border-l-2 pl-3 text-sm leading-snug" style={{ borderColor: 'var(--color-bronze)', color: 'var(--color-ink)' }}>
            {coachLine}
          </p>
        )}
      </div>

      {showGuide && guide && <TrainingGuideSheet title={template.name} guide={guide} template={template} dateIso={todayISO()} dayLabel={guideDayLabel(template, todayISO())} onClose={() => setShowGuide(false)} />}

      {quickComplete ? (
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Duur (min), uit MacroFactor</label>
            <input
              type="number"
              value={quickDuration}
              onChange={(e) => setQuickDuration(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-20 rounded-lg border px-2 py-1.5 text-right text-sm"
              style={{ background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
            />
          </div>
          <p className="mb-1.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Hoe voelde dit t.o.v. normaal?</p>
          <div className="flex gap-2">
            {(['better', 'normal', 'worse'] as const).map((f) => (
              <PrimaryButton
                key={f}
                onClick={() => onStart('full', f, quickDuration === '' ? fullDuration : quickDuration)}
                fullWidth={false}
                className="text-xs"
              >
                {FEEL_LABEL[f]}
              </PrimaryButton>
            ))}
          </div>
        </div>
      ) : (
        <PrimaryButton onClick={() => onStart('full')}>TRAINING STARTEN</PrimaryButton>
      )}

      <div className="flex gap-2">
        {!quickComplete && shortVariant && <SecondaryButton onClick={() => onStart('short')}>KORTE VERSIE</SecondaryButton>}
        <SecondaryButton onClick={() => setShowMove((v) => !v)}>VERPLAATSEN</SecondaryButton>
      </div>

      {showMove && (
        <MoveSuggestions sessionDate={todayISO()} originalDate={originalDate} suggestions={suggestions} onPick={onPickSuggestion} onPickDate={onMove} onSkip={onSkip} />
      )}
    </Card>
  );
}

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
import { StrengthDoneElsewhere, type StrengthDoneExtra } from './StrengthDoneElsewhere';
import { isLegHeavyTemplate } from '../engine/scheduler';
import { WarmupRow } from './WarmupRow';


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
  onStart: (variant: SessionVariant, feel?: SubjectiveFeel, durationMinutes?: number, extra?: StrengthDoneExtra) => void;
  onMove: (date: string) => void;
  onSkip: () => void;
  suggestions: MoveSuggestion[];
  onPickSuggestion: (suggestion: MoveSuggestion) => void;
  originalDate?: string;
  // engine/coach.ts#coachLineForToday
  coachLine?: string;
  // One tap, the plan's own minutes (engine/asPlanned.ts). Absent when not offered.
}) {
  const [showMove, setShowMove] = useState(false);
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
          {sessionKindLabel(template)} • ±{fullDuration} min{weekNote ? ` • ${weekNote}` : ''}
        </p>
        {template.focus && <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{template.focus}</p>}
        {coachLine && (
          <p className="mt-3 border-l-2 pl-3 text-sm leading-snug" style={{ borderColor: 'var(--color-bronze)', color: 'var(--color-ink)' }}>
            {coachLine}
          </p>
        )}
      </div>

      <WarmupRow template={template} />

      {showGuide && guide && <TrainingGuideSheet title={template.name} guide={guide} template={template} dateIso={todayISO()} dayLabel={guideDayLabel(template, todayISO())} onClose={() => setShowGuide(false)} />}

      {quickComplete ? (
        <StrengthDoneElsewhere fullDuration={fullDuration} legs={isLegHeavyTemplate(template)} onDone={(feel, minutes, extra) => onStart('full', feel, minutes, extra)} />
      ) : (
        <PrimaryButton onClick={() => onStart('full')}>Training starten</PrimaryButton>
      )}


      <div className="flex gap-2">
        {!quickComplete && shortVariant && <SecondaryButton onClick={() => onStart('short')}>Korte versie</SecondaryButton>}
        <SecondaryButton onClick={() => setShowMove((v) => !v)}>Verplaatsen</SecondaryButton>
      </div>

      {showMove && (
        <MoveSuggestions sessionDate={todayISO()} originalDate={originalDate} suggestions={suggestions} onPick={onPickSuggestion} onPickDate={onMove} onSkip={onSkip} />
      )}
    </Card>
  );
}

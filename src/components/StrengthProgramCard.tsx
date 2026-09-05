// ASCEND — Strength Program Strategy card (Addendum v0.1 §3/§5/§7, Phase 8).
// ASCEND owns block strategy/frequency/split/placement; MacroFactor
// Workouts keeps owning exercise-level content (§1/§10) — this card never
// shows or asks for exercise/set/rep detail, only the strategy layer.

import { useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import type { StrengthProgramStrategy } from '../models/strengthProgram';
import { activeStrengthStrategy, daysUntilBlockEnd } from '../engine/strengthProgram';
import { addDays, formatDateNL, todayISO } from '../utils/dates';
import { makeId } from '../utils/id';
import { Card, PrimaryButton, SecondaryButton, Eyebrow } from './ui';
import { StrengthProgramWizard } from './StrengthProgramWizard';

function blankStrategyDraft(): StrengthProgramStrategy {
  const now = new Date().toISOString();
  return {
    id: makeId('strength'),
    source: 'macrofactor_workouts',
    startDate: todayISO(),
    sessionsPerWeek: 3,
    splitType: 'upper_lower',
    sessionTemplateIds: [],
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}

function cloneForRepeat(strategy: StrengthProgramStrategy): StrengthProgramStrategy {
  const now = new Date().toISOString();
  const startDate = todayISO();
  return {
    ...strategy,
    id: makeId('strength'),
    startDate,
    plannedEndDate: strategy.plannedBlockWeeks ? addDays(startDate, strategy.plannedBlockWeeks * 7) : undefined,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}

export function StrengthProgramCard() {
  const { templates, strengthProgramStrategies, strengthRecommendation, activateStrengthProgram, reportStrengthSchemaEnded, resolveStrengthRecommendation } = useAppData();
  const [wizard, setWizard] = useState<{ mode: 'create' | 'edit'; draft: StrengthProgramStrategy } | null>(null);

  const templateById = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates]);
  const strategy = activeStrengthStrategy(strengthProgramStrategies);
  const daysLeft = strategy ? daysUntilBlockEnd(strategy, todayISO()) : undefined;

  async function repeatCurrentBlock() {
    if (!strategy) return;
    await activateStrengthProgram(cloneForRepeat(strategy));
    if (strengthRecommendation) await resolveStrengthRecommendation(strengthRecommendation.id, 'accepted');
  }

  function reviewNextBlock() {
    if (!strengthRecommendation) return;
    const base = strategy ?? blankStrategyDraft();
    setWizard({
      mode: strategy ? 'edit' : 'create',
      draft: {
        ...base,
        id: makeId('strength'),
        startDate: todayISO(),
        plannedEndDate: strengthRecommendation.suggestedBlockWeeks ? addDays(todayISO(), strengthRecommendation.suggestedBlockWeeks * 7) : undefined,
        plannedBlockWeeks: strengthRecommendation.suggestedBlockWeeks,
        sessionsPerWeek: strengthRecommendation.suggestedSessionsPerWeek,
        splitType: strengthRecommendation.suggestedSplitType,
        status: 'active',
      },
    });
  }

  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>KRACHTPROGRAMMA</Eyebrow>

      {!strategy ? (
        <>
          <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>
            Nog geen krachtblok ingesteld. ASCEND bepaalt frequentie, split en planning — MacroFactor Workouts blijft
            de oefeningen zelf bepalen.
          </p>
          <PrimaryButton onClick={() => setWizard({ mode: 'create', draft: blankStrategyDraft() })}>
            KRACHTBLOK STARTEN
          </PrimaryButton>
        </>
      ) : (
        <>
          <p className="font-display text-xl" style={{ color: 'var(--color-gold)' }}>
            {strategy.sessionsPerWeek}x/week — {strategy.splitType}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
            {strategy.sessionTemplateIds.map((id) => templateById.get(id)?.name ?? id).join(', ') || 'Geen sessietypes gekozen'}
          </p>
          {strategy.plannedEndDate && (
            <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              {daysLeft !== undefined && daysLeft >= 0
                ? `Loopt af ${formatDateNL(strategy.plannedEndDate)} — nog ${daysLeft} dagen`
                : `Gepland tot ${formatDateNL(strategy.plannedEndDate)}`}
            </p>
          )}
          {strategy.musclePriorities && strategy.musclePriorities.length > 0 && (
            <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Prioriteit: {strategy.musclePriorities.join(', ')}</p>
          )}
          {strategy.muscleMaintenance && strategy.muscleMaintenance.length > 0 && (
            <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Onderhoud: {strategy.muscleMaintenance.join(', ')}</p>
          )}

          <div className="flex gap-3">
            <SecondaryButton onClick={() => setWizard({ mode: 'edit', draft: strategy })}>SCHEMA AANPASSEN</SecondaryButton>
            <SecondaryButton onClick={() => void reportStrengthSchemaEnded()}>MIJN SCHEMA IS AFGELOPEN</SecondaryButton>
          </div>
        </>
      )}

      {strengthRecommendation && (
        <div className="flex flex-col gap-2 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
          <Eyebrow>KRACHTBLOK REVIEW</Eyebrow>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{strengthRecommendation.rationale}</p>
          <div className="flex flex-col gap-2">
            <div className="flex gap-3">
              <SecondaryButton onClick={reviewNextBlock}>VOLGEND BLOK BEKIJKEN</SecondaryButton>
              {strategy && <SecondaryButton onClick={() => void repeatCurrentBlock()}>HUIDIG BLOK HERHALEN</SecondaryButton>}
            </div>
            <div className="flex gap-3">
              {strategy && <SecondaryButton onClick={() => setWizard({ mode: 'edit', draft: strategy })}>VOORKEUREN AANPASSEN</SecondaryButton>}
              <SecondaryButton onClick={() => void resolveStrengthRecommendation(strengthRecommendation.id, 'dismissed')}>NIET NU</SecondaryButton>
            </div>
          </div>
        </div>
      )}

      {wizard && (
        <StrengthProgramWizard
          mode={wizard.mode}
          initialStrategy={wizard.draft}
          onClose={() => setWizard(null)}
          onActivated={() => {
            if (strengthRecommendation) void resolveStrengthRecommendation(strengthRecommendation.id, 'accepted');
          }}
        />
      )}
    </Card>
  );
}

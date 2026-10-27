import { useState } from 'react';
import type { GoalPriority, TrainingGoal } from '../../models/goals';
import { GOAL_PRIORITIES } from '../../models/goals';
import { GOAL_KINDS } from '../../data/goalKinds';
import { goalKindOf, PRIORITY_NAME } from '../../engine/goalLabels';
import { labelEffectLines, labelLine } from '../../engine/goalList';
import { Icon } from '../icons';
import { PrimaryButton } from '../ui';
import { TextButton } from '../TextButton';
import { Sheet } from '../settings/Sheet';
import { LabelBars } from './GoalLabel';

// "Hoe belangrijk is dit doel?": de drie labels met elk één regel uitleg, en eronder wat het gekozen
// label voor dit doel doet, in dagen. Kiezen opent het voorstel met Akkoord (de pagina regelt dat);
// de botsingen met je andere doelen staan daar, met "Toch allebei".
export function GoalLabelSheet({
  goal, priority, isMain, onChoose, onClose,
}: {
  goal: TrainingGoal;
  priority: GoalPriority;
  isMain: boolean;
  // Sluit het blad en opent het voorstel.
  onChoose: (priority: GoalPriority, close: () => void) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<GoalPriority>(priority);
  const kind = goalKindOf(goal);
  const short = kind ? GOAL_KINDS[kind].label : 'doel';
  void short;
  const effects = labelEffectLines(goal, picked, priority);
  return (
    <Sheet
      eyebrow={goal.name || short}
      title="Hoe belangrijk is dit doel voor jou?"
      line={isMain ? 'Dit doel heeft de mijlpalen van je tocht, dus het blijft je Top.' : `Nu: ${PRIORITY_NAME[priority]}. Je ziet eerst wat er verandert, daarna beslis jij.`}
      onClose={onClose}
    >
      {(close) => (
        <div className="flex flex-col gap-4">
          <div className="st-list" role="radiogroup" aria-label="Label van dit doel">
            {GOAL_PRIORITIES.map((p) => {
              const disabled = isMain && p !== 'top';
              return (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={picked === p}
                  disabled={disabled}
                  onClick={() => setPicked(p)}
                  className="flex min-h-[64px] w-full items-start gap-3 border-b px-4 py-3 text-left last:border-b-0 disabled:opacity-40"
                  style={{ borderColor: 'var(--color-card-border)' }}
                >
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2"
                    style={{ borderColor: picked === p ? 'var(--color-action)' : 'var(--color-control-border)' }}
                    aria-hidden="true"
                  >
                    {picked === p && <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--color-action)' }} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-base font-semibold" style={{ color: 'var(--color-ink)' }}>
                      <LabelBars priority={p} />
                      {PRIORITY_NAME[p]}
                    </span>
                    <span className="mt-0.5 block text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{labelLine(goal, p)}</span>
                    {picked === p && effects.length > 0 && (
                      <span className="mt-2 flex flex-col gap-1">
                        {effects.slice(0, 3).map((line) => (
                          <span key={line} className="flex items-start gap-2 text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
                            <span className="mt-0.5 shrink-0" style={{ color: 'var(--color-action)' }}><Icon name="vinkje" size={16} /></span>
                            {line}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {isMain ? (
            <TextButton tone="dim" onClick={close} className="self-center">Sluiten</TextButton>
          ) : (
            <div className="flex flex-col items-stretch gap-1">
              <PrimaryButton onClick={() => onChoose(picked, close)} disabled={picked === priority}>Volgende</PrimaryButton>
              <TextButton tone="dim" onClick={close} className="self-center">Annuleren</TextButton>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

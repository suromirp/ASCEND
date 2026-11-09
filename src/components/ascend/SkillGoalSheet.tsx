import { useMemo, useState } from 'react';
import { SKILL_LADDERS, skillLadderById } from '../../data/skillLadders';
import { SKILL_LADDER_CHOICES, buildSkillGoal, defaultTargetStep, freeTargetStep, skillStepName } from '../../engine/skillGoal';
import { ladderStates } from '../../engine/skillLadder';
import type { SessionLog } from '../../models/training';
import type { SkillGoal } from '../../models/skillGoals';
import { makeId } from '../../utils/id';
import { Chip, PrimaryButton } from '../ui';
import { TextButton } from '../TextButton';
import { Sheet } from '../settings/Sheet';

// Een vaardigheid kiezen (docs/beslissingen/2026-11-09-calisthenics-vaardigheidsdoel.md): één ladder en een
// doelstap, standaard de stap boven je huidige. Het blad slaat niets op; Volgende opent het voorstel met Akkoord.
// Een vaardigheid heeft geen datum en verandert je planning niet. Een stap die al een vaardigheid is, kun je niet
// nog eens kiezen.

export function SkillGoalSheet({ logs, today, taken, onSubmit, onClose }: {
  logs: readonly SessionLog[];
  today: string;
  // "ladder|stap" van de vaardigheden die er al zijn (engine/skillGoal.ts#takenSkillSteps).
  taken: ReadonlySet<string>;
  onSubmit: (goal: SkillGoal, close: () => void) => void;
  onClose: () => void;
}) {
  const states = useMemo(() => new Map(ladderStates(logs, today).map((s) => [s.ladderId, s])), [logs, today]);
  const [ladderId, setLadderId] = useState(SKILL_LADDERS[0].id);
  const ladder = skillLadderById(ladderId) ?? SKILL_LADDERS[0];
  const current = states.get(ladder.id)?.current ?? null;
  const [picked, setPicked] = useState<Record<string, number>>({});
  const step = picked[ladder.id] ?? freeTargetStep(ladder, defaultTargetStep(ladder, { current }), taken);

  return (
    <Sheet eyebrow="Doel toevoegen · stap 2 van 3" title="Vaardigheid" line="Kies een ladder en de stap die je wilt halen." onClose={onClose}>
      {(close) => (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="st-lab">Ladder</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Ladder">
              {SKILL_LADDER_CHOICES.map((l) => (
                <Chip key={l.id} selected={l.id === ladder.id} onClick={() => setLadderId(l.id)}>{l.name}</Chip>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Doelstap">
            <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>
              {current === null ? 'Nog geen training op deze ladder.' : `Je traint nu op ${skillStepName(ladder, current)}.`}
            </p>
            {ladder.steps.map((s, i) => {
              const n = i + 1;
              const on = n === step;
              const already = taken.has(`${ladder.id}|${n}`);
              return (
                <button
                  key={s.exerciseId}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={already}
                  onClick={() => setPicked((p) => ({ ...p, [ladder.id]: n }))}
                  className="flex min-h-[52px] items-center justify-between gap-3 rounded-2xl border px-4 py-2 text-left disabled:opacity-40"
                  style={{ borderColor: on ? 'var(--color-action)' : 'var(--color-card-border)', background: on ? 'var(--color-action-muted)' : 'var(--color-card)' }}
                >
                  <span className="min-w-0">
                    <span className="block text-base tabular-nums" style={{ color: 'var(--color-ink)' }}>{n}. {skillStepName(ladder, n)}</span>
                    <span className="block text-xs" style={{ color: 'var(--color-ink-dim)' }}>{s.note}</span>
                  </span>
                  {already ? <span className="shrink-0 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Al een doel</span>
                    : current === n && <span className="shrink-0 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Nu</span>}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col items-stretch gap-1">
            <PrimaryButton disabled={step === undefined} onClick={() => {
              if (step === undefined) return;
              const goal = buildSkillGoal({ id: makeId('skill'), now: new Date().toISOString(), ladderId: ladder.id, targetStep: step });
              if (goal) onSubmit(goal, close);
            }}>Volgende</PrimaryButton>
            <TextButton tone="dim" onClick={close} className="self-center">Annuleren</TextButton>
          </div>
        </div>
      )}
    </Sheet>
  );
}

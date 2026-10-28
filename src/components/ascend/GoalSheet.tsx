import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../../state/AppDataContext';
import { GOAL_KINDS } from '../../data/goalKinds';
import { getGR5MilestoneDetail, GR5_TRACK_DESCRIPTION } from '../../data/gr5Details';
import { changeLabel } from '../../engine/goalReadiness';
import { raceWeightSentence } from '../../engine/raceReadiness';
import { goalKindOf, PRIORITY_NAME } from '../../engine/goalLabels';
import { computeGoalProgress } from '../../engine/progression';
import { labelLine, type NextKeySession } from '../../engine/goalList';
import { formatDateNL } from '../../utils/dates';
import { AscentLadder } from '../AscentLadder';
import { Icon } from '../icons';
import { MilestoneDetailSheet } from '../MilestoneDetailSheet';
import { OnCourseCard } from '../OnCourseCard';
import { TextButton } from '../TextButton';
import { Eyebrow, Meter, Ring } from '../ui';
import { Sheet } from '../settings/Sheet';
import { NextStep } from './GoalCard';
import { isTrekGoal, whenText } from './goalText';
import { LabelPill } from './GoalLabel';
import { JourneyRows } from './JourneyRows';
import type { GoalView } from './useGoalViews';
import { RaceFactsBlock } from './GoalCard';

// Het blad van één doel: de meters achter het percentage, de volgende stap, de coach, bij een
// tocht de tochtmodule en de mijlpalen, en onderaan "Dit doel": label, plek in de lijst (Hoger en
// Lager, voor wie niet wil slepen), aanpassen en archiveren. De mijlpalenladder hoort alleen bij een
// tocht en staat hier.
export function GoalSheet({
  view, index, next, onLabel, onMenu, onClose,
}: {
  view: GoalView;
  index: number;
  next?: NextKeySession;
  onLabel: () => void;
  // De drie puntjes: aanpassen, label, plek in de lijst en archiveren.
  onMenu: () => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  // Eerst het blad sluiten, dan pas navigeren, zodat de terugknop geen halve laag overhoudt.
  const pending = useRef<string | null>(null);
  const { sessionLogs, goalMilestones, goalMilestoneProgress, clearMilestoneManually } = useAppData();
  const { item, readiness, timing } = view;
  const goal = item.goal;
  const kind = goalKindOf(goal) ?? (item.isMain ? 'trek_hut' : undefined);
  const when = whenText(view);
  const [ladderOpen, setLadderOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const milestones = useMemo(() => goalMilestones.filter((m) => m.goalId === goal.id), [goalMilestones, goal.id]);
  const progress = useMemo(
    () => (milestones.length > 0 ? computeGoalProgress(goal.id, goal.name, milestones, goalMilestoneProgress, sessionLogs) : null),
    [milestones, goal.id, goal.name, goalMilestoneProgress, sessionLogs],
  );
  const selectedMilestone = progress?.milestones.find((m) => m.definition.id === selected);
  const selectedDetail = selectedMilestone ? getGR5MilestoneDetail(selectedMilestone.definition.order) : undefined;
  const percent = readiness?.percent;
  const change = readiness ? changeLabel(readiness.change) : undefined;
  const line = [goal.targetDate ? formatDateNL(goal.targetDate) : undefined, when.text].filter(Boolean).join(' · ');

  return (
    <>
      <Sheet eyebrow={`${kind ? GOAL_KINDS[kind].label : 'Doel'} · ${PRIORITY_NAME[item.priority]}`} title={goal.name || 'Naamloos doel'} line={line} action={(
        <button type="button" onClick={onMenu} aria-label="Meer voor dit doel" className="flex h-11 w-11 items-center justify-center" style={{ color: 'var(--color-ink-dim)' }}>
          <Icon name="meer" size={24} />
        </button>
      )} onClose={() => {
        onClose();
        const to = pending.current;
        pending.current = null;
        if (to) navigate(to);
      }}>
        {(close) => (
          <div className="flex flex-col gap-4 pb-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Hoe belangrijk dit doel voor jou is</span>
              <LabelPill priority={item.priority} onClick={onLabel} strong={item.priority === 'top'} />
            </div>
            <div className="flex items-center gap-4 rounded-2xl border p-4" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-card)' }}>
              <Ring value={percent === undefined ? 0 : percent / 100} label={percent === undefined ? 'Nog niet te meten' : `Klaar voor je doel: ${percent}%`} size={84} stroke={8}>
                <span className="font-sans text-2xl font-semibold tabular-nums" style={{ color: 'var(--color-ink)' }}>{percent === undefined ? '-' : percent}{percent !== undefined && <span className="text-xs font-medium">%</span>}</span>
              </Ring>
              <div className="min-w-0 flex-1">
                <Eyebrow>Klaar voor je doel</Eyebrow>
                {change && <p className="text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{change}</p>}
                <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
                  {readiness?.race?.weighted
                    ? raceWeightSentence()
                    : readiness && percent !== undefined
                    ? `Het gemiddelde van ${readiness.meters.length === 1 ? 'deze meter' : `deze ${readiness.meters.length} meters`}. Elke meter stopt bij 100%, dus een zware rugzak redt een korte dag niet.`
                    : 'Nog niets te meten. Dat komt met trainingen die meetellen.'}
                </p>
              </div>
            </div>

            {readiness?.race && <RaceFactsBlock race={readiness.race} withBasis />}
            {readiness?.race && readiness.race.status !== 'no-target' && kind && (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{labelLine(goal, item.priority)}</p>
            )}

            {readiness && readiness.meters.length > 0 && (
              <div className="st-list">
                {readiness.meters.map((m) => (
                  <div key={m.key} className="flex flex-col gap-1.5 border-b px-4 py-3 last:border-b-0" style={{ borderColor: 'var(--color-card-border)' }}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-base" style={{ color: 'var(--color-ink)' }}>{m.label}</span>
                      <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--color-ink)' }}>{m.text}</span>
                    </div>
                    <Meter value={m.share} label={m.label} />
                    {m.parts.length > 1 && <p className="text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{m.parts.map((p) => `${p.name} ${p.text}`).join(', ')}</p>}
                    <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{m.why}</p>
                  </div>
                ))}
              </div>
            )}
            {readiness?.weakestSentence && <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{readiness.weakestSentence}</p>}
            {readiness?.missingSentence && <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{readiness.missingSentence}</p>}
            {readiness?.derivedNote && <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{readiness.derivedNote}</p>}

            {index === 0 && next && <NextStep next={next} />}

            {goal.targetDate && goal.status === 'active' && timing.state === 'ahead' && <OnCourseCard goalName={goal.name} goalDate={goal.targetDate} />}

            {kind && isTrekGoal(kind) && <JourneyRows onNavigate={(to) => { pending.current = to; close(); }} />}

            {progress && progress.milestones.length > 0 && (
              <section className="flex flex-col gap-2">
                <Eyebrow>Kampen</Eyebrow>
                {ladderOpen ? (
                  <>
                    <AscentLadder
                      progress={progress}
                      description={GR5_TRACK_DESCRIPTION}
                      onMarkCleared={(milestoneId) => clearMilestoneManually(goal.id, milestoneId)}
                      onSelectMilestone={setSelected}
                    />
                    <TextButton tone="dim" onClick={() => setLadderOpen(false)} icon="omlaag" flipped className="self-start">Inklappen</TextButton>
                  </>
                ) : (
                  <button type="button" onClick={() => setLadderOpen(true)} className="flex min-h-[56px] items-center justify-between gap-3 rounded-2xl border px-4 text-left" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-card)' }}>
                    <span className="min-w-0">
                      <span className="block text-base" style={{ color: 'var(--color-ink)' }}>{progress.currentMilestone ? progress.currentMilestone.definition.title : 'Alle kampen'}</span>
                      <span className="block text-sm" style={{ color: 'var(--color-ink-dim)' }}>Alle {progress.milestones.length} kampen bekijken</span>
                    </span>
                    <Icon name="omlaag" size={18} />
                  </button>
                )}
              </section>
            )}

            <TextButton tone="dim" onClick={close} className="self-center">Sluiten</TextButton>
          </div>
        )}
      </Sheet>
      {selectedMilestone && selectedDetail && (
        <MilestoneDetailSheet title={selectedMilestone.definition.title} detail={selectedDetail} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

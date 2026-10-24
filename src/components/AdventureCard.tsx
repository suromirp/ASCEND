import type { ReactNode } from 'react';
import type { GoalProgress } from '../engine/progression';
import { Card, Eyebrow } from './ui';
import { Icon } from './icons';

const SYMBOL: Record<string, ReactNode> = {
  completed: <Icon name="vinkje" size={16} />,
  current: <Icon name="vandaagStip" size={16} />,
  upcoming: <Icon name="gepland" size={16} />,
  future: <Icon name="gepland" size={16} />,
};
const SYMBOL_COLOR: Record<string, string> = {
  completed: 'var(--color-success)',
  current: 'var(--color-action)',
  upcoming: 'var(--color-ink-dim)',
  future: 'var(--color-ink-dim)',
};

export function AdventureCard({ progress, onOpenLadder }: { progress: GoalProgress; onOpenLadder?: () => void }) {
  if (!progress.currentMilestone) {
    return (
      <Card texture>
        <Eyebrow>VOLGEND KAMP</Eyebrow>
        <p className="mt-2 font-display text-xl" style={{ color: 'var(--color-action)' }}>Alle kampen gehaald</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{progress.goalName} , klaar voor de expeditie.</p>
      </Card>
    );
  }

  const currentIdx = progress.milestones.findIndex((m) => m.definition.id === progress.currentMilestone!.definition.id);
  const window = progress.milestones.slice(Math.max(0, currentIdx - 1), currentIdx + 3);

  return (
    <button onClick={onOpenLadder} className="block w-full text-left">
      <Card texture>
        <Eyebrow>VOLGEND KAMP</Eyebrow>
        <p className="mt-1 font-display text-xl" style={{ color: 'var(--color-ink)' }}>{progress.currentMilestone.definition.title}</p>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{progress.goalName}</p>

        <div className="mt-3 flex flex-col gap-1.5">
          {window.map((m) => (
            <div key={m.definition.id} className="flex items-center gap-2 text-sm">
              <span className="flex" style={{ color: SYMBOL_COLOR[m.status] }}>{SYMBOL[m.status]}</span>
              <span style={{ color: m.status === 'current' ? 'var(--color-ink)' : 'var(--color-ink-dim)' }}>{m.definition.title}</span>
            </div>
          ))}
        </div>
      </Card>
    </button>
  );
}

import type { ObjectiveProgress } from '../engine/progression';
import { Card, Eyebrow } from './ui';

const SYMBOL: Record<string, string> = { completed: '✓', current: '●', upcoming: '○', future: '○' };
const SYMBOL_COLOR: Record<string, string> = {
  completed: 'var(--color-success)',
  current: 'var(--color-gold)',
  upcoming: 'var(--color-ink-dim)',
  future: 'var(--color-ink-dim)',
};

export function AdventureCard({ progress, onOpenLadder }: { progress: ObjectiveProgress; onOpenLadder?: () => void }) {
  if (!progress.currentMilestone) {
    return (
      <Card texture>
        <Eyebrow>VOLGEND OBJECTIEF</Eyebrow>
        <p className="mt-2 font-display text-xl" style={{ color: 'var(--color-gold)' }}>Alle mijlpalen behaald</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{progress.objective.name} — klaar voor de expeditie.</p>
      </Card>
    );
  }

  const currentIdx = progress.milestones.findIndex((m) => m.definition.id === progress.currentMilestone!.definition.id);
  const window = progress.milestones.slice(Math.max(0, currentIdx - 1), currentIdx + 3);

  return (
    <button onClick={onOpenLadder} className="block w-full text-left">
      <Card texture>
        <div className="flex items-baseline justify-between">
          <Eyebrow>VOLGEND OBJECTIEF</Eyebrow>
          <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{progress.readinessPct}% GEREED</span>
        </div>
        <p className="mt-1 font-display text-xl" style={{ color: 'var(--color-ink)' }}>{progress.currentMilestone.definition.title}</p>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{progress.objective.name}</p>

        <div className="mt-3 flex flex-col gap-1.5">
          {window.map((m) => (
            <div key={m.definition.id} className="flex items-center gap-2 text-sm">
              <span style={{ color: SYMBOL_COLOR[m.status] }}>{SYMBOL[m.status]}</span>
              <span style={{ color: m.status === 'current' ? 'var(--color-ink)' : 'var(--color-ink-dim)' }}>{m.definition.title}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 h-1.5 w-full rounded-full" style={{ background: 'var(--color-charcoal)' }}>
          <div className="h-1.5 rounded-full" style={{ width: `${progress.readinessPct}%`, background: 'var(--color-gold)' }} />
        </div>
      </Card>
    </button>
  );
}

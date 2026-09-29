import { Card, Eyebrow } from './ui';

export function WeeklyReflectionCard({
  completed,
  total,
  lastWeekCompleted,
  lastWeekTotal,
  streak,
  nextWeekChanges = [],
}: {
  completed: number;
  total: number;
  lastWeekCompleted: number;
  lastWeekTotal: number;
  streak: number;
  nextWeekChanges?: string[];
}) {
  return (
    <Card className="flex flex-col gap-2">
      <Eyebrow>WEEKTERUGBLIK</Eyebrow>
      <div className="flex items-center justify-between text-sm">
        <span style={{ color: 'var(--color-ink-dim)' }}>Deze week</span>
        <span style={{ color: 'var(--color-ink)' }}>{completed} / {total} voltooid</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span style={{ color: 'var(--color-ink-dim)' }}>Vorige week</span>
        <span style={{ color: 'var(--color-ink)' }}>{lastWeekCompleted} / {lastWeekTotal} voltooid</span>
      </div>
      {nextWeekChanges.length > 0 && (
        <div className="mt-2">
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Volgende week verandert</p>
          <ul className="mt-1 flex flex-col gap-0.5 text-xs" style={{ color: 'var(--color-ink)' }}>
            {nextWeekChanges.slice(0, 4).map((l) => <li key={l}>{l}</li>)}
          </ul>
          {nextWeekChanges.length > 4 && <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>en nog {nextWeekChanges.length - 4}, zie Week.</p>}
        </div>
      )}
      {streak > 0 && (
        <p className="mt-1 text-xs" style={{ color: 'var(--color-gold)' }}>
          Huidige reeks: {streak} {streak === 1 ? 'dag' : 'dagen'} op rij.
        </p>
      )}
    </Card>
  );
}

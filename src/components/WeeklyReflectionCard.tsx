import { Card, Eyebrow } from './ui';

export function WeeklyReflectionCard({
  completed,
  total,
  lastWeekCompleted,
  lastWeekTotal,
  streak,
}: {
  completed: number;
  total: number;
  lastWeekCompleted: number;
  lastWeekTotal: number;
  streak: number;
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
      {streak > 0 && (
        <p className="mt-1 text-xs" style={{ color: 'var(--color-gold)' }}>
          Huidige reeks: {streak} {streak === 1 ? 'dag' : 'dagen'} op rij.
        </p>
      )}
    </Card>
  );
}

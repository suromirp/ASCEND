import { useNavigate } from 'react-router-dom';
import { useJourney } from './reis/useJourney';
import { Card, Eyebrow, PrimaryButton, SecondaryButton } from './ui';

// Today: the one task of the week on the way to the GR5 that is not
// training. Tick it off or push it to next week. Same idea as the lesson
// of the week: one a week, kept for the week, never red.
// `suppress` hides it on a day that belongs to a heavy training, so it
// never pushes the mission aside.
export function JourneyWeekCard({ suppress = false }: { suppress?: boolean }) {
  const navigate = useNavigate();
  const { pick, tick, untick, postpone } = useJourney();
  if (suppress || !pick || pick.state === 'postponed') return null;
  const { task } = pick;

  if (pick.state === 'done') {
    return (
      <Card className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between">
          <Eyebrow>DEZE WEEK VOOR DE GR5</Eyebrow>
          <span className="text-[11px]" style={{ color: 'var(--color-success-text)' }}>gedaan</span>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{task.title}</p>
        <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Volgende week komt er een nieuwe taak.</p>
        <button onClick={() => untick(task.id)} className="min-h-[40px] self-start text-xs underline underline-offset-2" style={{ color: 'var(--color-ink-dim)' }}>
          Toch nog niet gedaan
        </button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-2" texture>
      <div className="flex items-baseline justify-between">
        <Eyebrow>DEZE WEEK VOOR DE GR5</Eyebrow>
        <button onClick={() => navigate('/reis')} className="min-h-[32px] text-[11px] underline underline-offset-2" style={{ color: 'var(--color-ink-dim)' }}>
          Alle taken
        </button>
      </div>
      <button onClick={() => navigate(`/reis?taak=${task.id}`)} className="flex flex-col gap-1 text-left">
        <span className="font-display text-lg leading-snug" style={{ color: 'var(--color-ink)' }}>{task.title}</span>
        <span className="line-clamp-3 text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{task.why}</span>
      </button>
      <div className="mt-1 flex gap-3">
        <SecondaryButton onClick={() => postpone(task.id)}>VOLGENDE WEEK</SecondaryButton>
        <PrimaryButton onClick={() => tick(task.id, { keepForWeek: true })} fullWidth={false}>GEDAAN</PrimaryButton>
      </div>
    </Card>
  );
}

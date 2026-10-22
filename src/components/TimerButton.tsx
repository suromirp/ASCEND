import { useState } from 'react';
import { CountdownTimer } from './CountdownTimer';
import { Icon } from './icons';

// A general-purpose entry point for the countdown timer — not tied to any
// specific exercise or stretch, for anything during a session that needs
// timing (a plank hold, a rest interval, an interval repeat) that doesn't
// already carry its own duration.
export function TimerButton({ initialSeconds = 60 }: { initialSeconds?: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Timer"
        className="flex h-11 w-11 items-center justify-center rounded-full border"
        style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-bronze)' }}
      >
        <Icon name="timer" size={20} />
      </button>
      {open && <CountdownTimer initialSeconds={initialSeconds} onClose={() => setOpen(false)} />}
    </>
  );
}

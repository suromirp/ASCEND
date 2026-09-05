import { useState } from 'react';
import { CountdownTimer } from './CountdownTimer';

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

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
        className="flex h-9 w-9 items-center justify-center rounded-full border"
        style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-bronze)' }}
      >
        <ClockIcon />
      </button>
      {open && <CountdownTimer initialSeconds={initialSeconds} onClose={() => setOpen(false)} />}
    </>
  );
}

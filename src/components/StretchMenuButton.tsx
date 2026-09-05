import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PROBLEM_AREAS } from '../data/stretches';

function StretchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="4" r="1.8" />
      <path d="M12 6v7" />
      <path d="M12 8L8 4" />
      <path d="M12 8L16 4" />
      <path d="M12 13L9 20" />
      <path d="M12 13L15 20" />
    </svg>
  );
}

export function StretchMenuButton() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  function go(areaId?: string) {
    setOpen(false);
    navigate(areaId ? `/stretches/${areaId}` : '/stretches');
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Rekoefeningen"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full border"
        style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-bronze)' }}
      >
        <StretchIcon />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="animate-dropdown-in absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-xl border py-1 shadow-lg"
            style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}
          >
            {PROBLEM_AREAS.map((area) => (
              <button
                key={area.id}
                onClick={() => go(area.id)}
                className="block w-full px-3 py-2 text-left text-sm active:opacity-70"
                style={{ color: 'var(--color-ink)' }}
              >
                {area.label}
              </button>
            ))}
            <div className="mx-3 my-1 border-t" style={{ borderColor: 'var(--color-card-border)' }} />
            <button
              onClick={() => go()}
              className="block w-full px-3 py-2 text-left text-sm font-medium active:opacity-70"
              style={{ color: 'var(--color-gold)' }}
            >
              Alle rekoefeningen →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PROBLEM_AREAS } from '../data/stretches';
import { Icon } from './icons';
import { useBackToClose } from '../utils/useBackToClose';

export function StretchMenuButton() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  // The back button closes the menu first.
  useBackToClose(open, () => setOpen(false));

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
        className="flex h-11 w-11 items-center justify-center rounded-full border"
        style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-bronze)' }}
      >
        <Icon name="rekken" size={20} />
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
                className="min-h-[44px] block w-full px-3 py-2 text-left text-sm active:opacity-70"
                style={{ color: 'var(--color-ink)' }}
              >
                {area.label}
              </button>
            ))}
            <div className="mx-3 my-1 border-t" style={{ borderColor: 'var(--color-card-border)' }} />
            <button
              onClick={() => go()}
              className="min-h-[44px] block w-full px-3 py-2 text-left text-sm font-medium active:opacity-70"
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

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PROBLEM_AREAS } from '../data/stretches';
import { Icon } from './icons';
import { useBackToClose } from '../utils/useBackToClose';
import { Portal } from './Portal';

export function StretchMenuButton() {
  const [open, setOpen] = useState(false);
  // Where the menu opens: right under the button, measured when it opens. The
  // menu goes to document.body (Portal), so the stacking context of the row
  // next to the gear (absolute z-10) can never put it under the cards of Vandaag.
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
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
        ref={buttonRef}
        onClick={() => {
          const rect = buttonRef.current?.getBoundingClientRect();
          if (rect) setAnchor({ top: rect.bottom + 4, right: Math.max(8, window.innerWidth - rect.right) });
          setOpen((o) => !o);
        }}
        aria-label="Rekoefeningen"
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-full border"
        style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-bronze)' }}
      >
        <Icon name="rekken" size={20} />
      </button>

      {open && (
        <Portal>
          <div className="fixed inset-0 z-40" data-testid="rekmenu-buiten" onClick={() => setOpen(false)} />
          <div
            role="menu"
            aria-label="Rekoefeningen"
            className="animate-dropdown-in fixed z-50 w-56 overflow-hidden rounded-xl border py-1 shadow-lg"
            style={{ top: anchor?.top ?? 60, right: anchor?.right ?? 16, background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}
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
              className="flex min-h-[44px] w-full items-center justify-between px-3 py-2 text-left text-sm font-medium active:opacity-70"
              style={{ color: 'var(--color-gold)' }}
            >
              Alle rekoefeningen
              <Icon name="verder" size={18} />
            </button>
          </div>
        </Portal>
      )}
    </div>
  );
}

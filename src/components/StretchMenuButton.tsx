import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PROBLEM_AREAS } from '../data/stretches';
import { Icon } from './icons';
import { TodaySheet } from './vandaag/TodaySheet';

// Hoeveel minuten de oefeningen van een plek samen duren (afgerond, minstens 1).
function minutesOf(area: (typeof PROBLEM_AREAS)[number]): number {
  return Math.max(1, Math.round(area.stretches.reduce((n, s) => n + (s.durationSec ?? 30), 0) / 60));
}

// Het knopje met het poppetje bovenaan Vandaag: een blad met de plekken waar je last van
// hebt, zoals elke andere keuze in de app (geen los uitklapmenu over de kaarten).
export function StretchMenuButton() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Rekoefeningen"
        aria-haspopup="dialog"
        className="flex h-11 w-11 items-center justify-center rounded-full border"
        style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-action)' }}
      >
        <Icon name="rekken" size={20} />
      </button>

      {open && (
        <TodaySheet eyebrow="Rekken" title="Waar zit het?" onClose={() => setOpen(false)}>
          {(close) => {
            const go = (path: string) => {
              close();
              navigate(path);
            };
            return (
              <div className="flex flex-col">
                {PROBLEM_AREAS.map((area) => (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => go(`/stretches/${area.id}`)}
                    className="flex min-h-[52px] items-center justify-between gap-3 border-b text-left"
                    style={{ borderColor: 'var(--color-card-border)' }}
                  >
                    <span className="text-[15px]" style={{ color: 'var(--color-ink)' }}>{area.label}</span>
                    <span className="flex shrink-0 items-center gap-2 font-sans text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
                      {area.stretches.length} oefeningen · {minutesOf(area)} min
                      <Icon name="verder" size={16} />
                    </span>
                  </button>
                ))}
                <button type="button" onClick={() => go('/stretches')} className="flex min-h-[52px] items-center justify-between gap-3 text-left">
                  <span className="text-[15px]" style={{ color: 'var(--color-ink)' }}>Alle rekoefeningen</span>
                  <span style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={16} /></span>
                </button>
              </div>
            );
          }}
        </TodaySheet>
      )}
    </>
  );
}

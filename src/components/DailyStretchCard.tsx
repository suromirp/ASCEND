import { useState } from 'react';
import type { Stretch } from '../models/training';
import { StretchItems } from './StretchList';
import { DayRow } from './vandaag/DayRow';
import { TodaySheet } from './vandaag/TodaySheet';
import { Icon } from './icons';
import { PrimaryButton } from './ui';

// Rekken als regel in "Je dag": de regel opent de oefeningen in een sheet,
// de ronde knop rechts (leeg, mint met vinkje als het gedaan is) vinkt de
// routine af zonder iets te openen.
export function DailyStretchCard({
  label,
  title,
  stretches,
  completed,
  onToggleComplete,
}: {
  // "Ochtend" of "Avond"
  label: string;
  title: string;
  stretches: Stretch[];
  completed: boolean;
  onToggleComplete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <DayRow
        label={label}
        state={completed ? 'done' : 'todo'}
        onClick={() => setOpen(true)}
        chevron={false}
        action={
          <button
            onClick={onToggleComplete}
            aria-pressed={completed}
            aria-label={completed ? `${title} afgevinkt, tik om ongedaan te maken` : `${title} afvinken`}
            className="flex h-11 w-11 shrink-0 items-center justify-center"
          >
            <span style={{ color: completed ? 'var(--color-progress)' : 'var(--color-control-border)' }}>
              <Icon key={completed ? 'on' : 'off'} name={completed ? 'gedaan' : 'gepland'} size={26} className={completed ? 'mx-check mx-check-draw' : 'mx-check'} />
            </span>
          </button>
        }
      >
        {title}, {stretches.length} oefeningen
      </DayRow>
      {open && (
        <TodaySheet eyebrow={label} title={title} onClose={() => setOpen(false)}>
          {(close) => (
            <>
              <StretchItems stretches={stretches} className="flex flex-col" />
              <div className="mt-5">
                <PrimaryButton onClick={() => { if (!completed) onToggleComplete(); close(); }}>{completed ? 'Klaar' : 'Gedaan'}</PrimaryButton>
              </div>
            </>
          )}
        </TodaySheet>
      )}
    </>
  );
}

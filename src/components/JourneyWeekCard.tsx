import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJourney } from './reis/useJourney';
import { PrimaryButton, SecondaryButton } from './ui';
import { DayRow } from './vandaag/DayRow';
import { TodaySheet } from './vandaag/TodaySheet';
import { TextButton } from './TextButton';

// Vandaag: the one task of the week on the way to the GR5 that is not
// training, as one line in "Je dag". The line opens the task in a sheet: tick
// it off or push it to next week. Same idea as the lesson of the week: one a
// week, kept for the week, never red.
export function JourneyWeekCard() {
  const navigate = useNavigate();
  const { pick, derived, tick, untick, postpone } = useJourney();
  const [open, setOpen] = useState(false);
  if (!pick || pick.state === 'postponed') return null;
  const { task } = pick;
  const done = pick.state === 'done';

  return (
    <>
      <DayRow label="Reis" state={done ? 'done' : 'todo'} onClick={() => setOpen(true)}>
        {task.title}
      </DayRow>
      {open && (
        <TodaySheet eyebrow="DEZE WEEK VOOR DE GR5" title={task.title} onClose={() => setOpen(false)}>
          {(close) => (
            <div className="flex flex-col gap-4">
              <p className="text-[15px] leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{task.why}</p>
              {done ? (
                <>
                  <p className="text-sm" style={{ color: 'var(--color-success-text)' }}>{derived[task.id] ? `${derived[task.id]}.` : 'Gedaan.'} Volgende week komt er een nieuwe taak.</p>
                  {!derived[task.id] && (
                    <TextButton tone="dim" onClick={() => { untick(task.id); close(); }} className="self-start">
                      Toch nog niet gedaan
                    </TextButton>
                  )}
                </>
              ) : (
                <div className="flex gap-3">
                  <SecondaryButton onClick={() => { postpone(task.id); close(); }}>Volgende week</SecondaryButton>
                  <PrimaryButton onClick={() => { tick(task.id, { keepForWeek: true }); close(); }} fullWidth={false}>Gedaan</PrimaryButton>
                </div>
              )}
              <div className="flex items-center justify-between">
                <TextButton onClick={() => navigate(`/reis?taak=${task.id}`)} icon="verder">
                  Meer over deze taak
                </TextButton>
                <TextButton onClick={() => navigate('/reis')} icon="verder">
                  Alle taken
                </TextButton>
              </div>
            </div>
          )}
        </TodaySheet>
      )}
    </>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJourneyRow } from './vandaag/yourDayRows';
import { PrimaryButton, SecondaryButton } from './ui';
import { DayRow } from './vandaag/DayRow';
import { TodaySheet } from './vandaag/TodaySheet';
import { TextButton } from './TextButton';

// Vandaag: de taak op weg naar je tocht die geen training is, als één regel in "Je dag", maar
// alleen als de instelling het zegt (standaard in de laatste week dat hij nog kan). De regel opent
// de taak in een blad: afvinken, of naar volgende week. In de laatste week heet dat Niet nu en
// blijft de taak open op Ascend. Nooit rood, nooit "te laat".
export function JourneyWeekCard() {
  const navigate = useNavigate();
  const { shown, when, lastWeek, journey } = useJourneyRow();
  const { pick, derived, tick, untick, postpone } = journey;
  const [open, setOpen] = useState(false);
  if (!shown || !pick || pick.state === 'postponed') return null;
  const { task } = pick;
  const done = pick.state === 'done';

  return (
    <>
      <DayRow label="Reis" trailing={done ? undefined : when} state={done ? 'done' : 'todo'} onClick={() => setOpen(true)} sheetFrom>
        {task.title}
      </DayRow>
      {open && (
        <TodaySheet eyebrow="Deze week voor de GR5" title={task.title} onClose={() => setOpen(false)}>
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
                  <SecondaryButton onClick={() => { postpone(task.id); close(); }}>{lastWeek ? 'Niet nu' : 'Volgende week'}</SecondaryButton>
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

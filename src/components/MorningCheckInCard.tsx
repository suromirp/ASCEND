import { useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { checkInFor, recentPainSpot, shouldAskCheckIn } from '../engine/wellbeing';
import { todayISO } from '../utils/dates';
import { DayRow } from './vandaag/DayRow';
import { ENERGY, LEGS, SLEEP } from '../engine/morningCard';
import { MorningCheckInSheet } from './MorningCheckInSheet';

// Vandaag → "Gevoel" as one line in "Je dag" (the form opens in a sheet,
// components/MorningCheckInSheet.tsx; "Alles normaal" is one tap on the line): the
// morning check-in (docs/onderzoek/Pijn spierpijn en vermoeidheid melden.md). In
// the morning the question first stands as its own card above the mission
// (components/MorningCard.tsx); this line then waits (`hideTodo`) and, once the
// day is filled in, says what you answered.

const KEEP = 60;

// painOnly: de ochtendcheck staat uit, maar er is een pijnplek van de laatste 14
// dagen. Dan alleen die vraag, niet benen, energie en slaap.
export function MorningCheckInCard({ painOnly = false, hideTodo = false }: { painOnly?: boolean; hideTodo?: boolean } = {}) {
  const { settings, updateSettings, sessionLogs, plannedSessions, templates } = useAppData();
  const today = todayISO();
  const existing = checkInFor(today, settings.morningCheckIns);
  const [open, setOpen] = useState(false);
  const spot = recentPainSpot(today, sessionLogs);
  const ask = shouldAskCheckIn(today, settings.morningCheckIns, sessionLogs, plannedSessions, templates);

  if (!ask && !existing) return null;
  // De ochtendkaart staat er nog: die stelt de vraag, deze regel wacht tot er een antwoord is.
  if (hideTodo && !existing) return null;

  function allNormal() {
    const others = (settings.morningCheckIns ?? []).filter((c) => c.date !== today);
    void updateSettings({ morningCheckIns: [...others, { date: today, allNormal: true }].sort((a, b) => a.date.localeCompare(b.date)).slice(-KEEP) });
  }

  const summary = existing
    ? (existing.allNormal ? ['alles normaal'] : [
        LEGS.find(([k]) => k === existing.legs)?.[1], ENERGY.find(([k]) => k === existing.energy)?.[1], SLEEP.find(([k]) => k === existing.sleep)?.[1] && `slaap ${SLEEP.find(([k]) => k === existing.sleep)![1].toLowerCase()}`,
        existing.spot && `${existing.spot.area.toLowerCase()} ${existing.spot.score}`,
      ].filter(Boolean).map((s) => String(s).toLowerCase())).join(', ')
    : '';

  return (
    <>
      <DayRow
        label="Gevoel"
        state={existing ? 'done' : 'todo'}
        onClick={() => setOpen(true)}
        chevron={!!existing}
        action={existing || painOnly ? undefined : (
          <button onClick={allNormal} className="ml-2 min-h-[44px] shrink-0 whitespace-nowrap rounded-full px-3.5 text-xs font-semibold" style={{ boxShadow: 'inset 0 0 0 1px var(--color-control-border)', color: 'var(--color-ink)' }}>
            Alles normaal
          </button>
        )}
      >
        {existing ? `Vanochtend: ${summary}` : painOnly && spot ? `Hoe is je ${spot.area.toLowerCase()}?` : 'Benen, energie en slaap'}
      </DayRow>
      {open && <MorningCheckInSheet painOnly={painOnly} onClose={() => setOpen(false)} />}
    </>
  );
}

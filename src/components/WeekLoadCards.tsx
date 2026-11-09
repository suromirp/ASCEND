import { useMemo } from 'react';
import { useAppData } from '../state/AppDataContext';
import { Card, Eyebrow, SecondaryButton } from './ui';
import { useHorizonChange } from './useHorizonChange';
import { restWeekChange, restWeekState } from '../engine/restWeek';
import { repeatState, repeatWeekChange } from '../engine/repeatWeek';
import { resolveVariantDuration } from '../engine/substitutions';
import type { WeekLoadContext } from '../engine/weekLoadChange';
import { mondayOfWeek, todayISO } from '../utils/dates';

// De kaarten Rustweek, Rustweek overgeslagen, Deze week nog een keer en Een stap
// achter op Week. Doortrainen, terugzetten en de herhaling terugzetten gaan via
// het voorstel met Akkoord (storage/weekLoadPlan.ts) en raken alleen wat nog
// open is (engine/weekLoadChange.ts). Is er niets meer open dat verandert, dan
// staat er een zin in plaats van de knop
// (docs/beslissingen/2026-10-24-rustweek-via-voorstel.md).

const DIM = { color: 'var(--color-ink-dim)' };

export function WeekLoadCards({ weekStart }: { weekStart: string }) {
  const { program, plannedSessions, sessionLogs, templates, planWeekLoadChange } = useAppData();
  const horizon = useHorizonChange();
  const today = todayISO();
  const current = !!program && weekStart >= mondayOfWeek(today);

  const view = useMemo(() => {
    if (!program || !current) return undefined;
    const ctx: WeekLoadContext = {
      sessions: plannedSessions, logs: sessionLogs, templates, today,
      minutesOf: (s, t, p) => resolveVariantDuration(t, 'full', s.scheduledDate, p),
    };
    const rest = restWeekState(program, weekStart, sessionLogs, today);
    const repeat = repeatState(program, weekStart);
    return {
      rest,
      repeat,
      restChange: rest.isRestWeek && (rest.skipped || rest.canSkip) ? restWeekChange(program, weekStart, !rest.skipped, ctx) : undefined,
      repeatChange: repeat.repeated ? repeatWeekChange(program, weekStart, false, ctx) : undefined,
    };
  }, [program, current, plannedSessions, sessionLogs, templates, today, weekStart]);

  if (!view) return null;
  const { rest, repeat, restChange, repeatChange } = view;
  const restOpen = restChange?.state === 'open';
  const repeatOpen = repeatChange?.state === 'open';

  const propose = (kind: 'rest' | 'repeat', on: boolean) => void horizon.propose(() => planWeekLoadChange(kind, weekStart, on), {
    eyebrow: kind === 'rest' ? 'Rustweek' : 'Deze week nog een keer',
    ask: 'always',
    alwaysAsk: true,
    declined: 'Je week blijft zoals hij was.',
  });

  const note = horizon.note && <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }} role="status">{horizon.note}</p>;

  return (
    <>
      {rest.isRestWeek && (
        <Card className="flex flex-col gap-2">
          <Eyebrow>{rest.skipped ? 'Rustweek overgeslagen' : 'Rustweek'}</Eyebrow>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
            {rest.skipped
              ? `Je traint deze week door, als een normale opbouwweek.${restOpen ? ' Voelen je benen zwaar, slaap je slecht of gaat het tempo bij dezelfde hartslag omlaag? Zet de rustweek dan terug.' : ''}`
              : `Deze week schakel je terug, zodat de opbouw van de vorige weken binnenkomt.${restOpen ? ' Voel je je fris en ging alles goed? Dan kun je doortrainen: de week wordt een normale opbouwweek, geen tweede zwaarste week.' : ''}`}
          </p>
          {restChange && restOpen ? (
            <>
              <SecondaryButton disabled={horizon.busy} onClick={() => propose('rest', !rest.skipped)}>{rest.skipped ? 'Rustweek terugzetten' : 'Doortrainen'}</SecondaryButton>
              <p className="text-xs leading-snug" style={DIM}>{restChange.sentence}</p>
            </>
          ) : restChange ? (
            <p className="text-xs leading-snug" style={DIM}>{restChange.sentence}</p>
          ) : rest.reason ? (
            <p className="text-xs leading-snug" style={DIM}>{rest.reason}</p>
          ) : null}
          {note}
        </Card>
      )}

      {repeat.repeated && (
        <Card className="flex flex-col gap-2">
          <Eyebrow>Deze week nog een keer</Eyebrow>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
            Je minuten, hoogtemeters en rugzak blijven op het niveau van vorige week, in plaats van een stap omhoog. De rustweek en de weken daarna staan nog op de kalender.{repeatOpen ? ' Gaat het toch goed? Dan kun je de herhaling terugzetten.' : ''}
          </p>
          {repeatChange && repeatOpen ? (
            <>
              <SecondaryButton disabled={horizon.busy} onClick={() => propose('repeat', false)}>Herhaling terugzetten</SecondaryButton>
              <p className="text-xs leading-snug" style={DIM}>{repeatChange.sentence}</p>
            </>
          ) : repeatChange ? (
            <p className="text-xs leading-snug" style={DIM}>{repeatChange.sentence}</p>
          ) : null}
          {!rest.isRestWeek && note}
        </Card>
      )}

      {repeat.shifted && !repeat.repeated && (
        <Card className="flex flex-col gap-2">
          <Eyebrow>Een stap achter</Eyebrow>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
            Eerder in deze golf herhaalde je een week. Deze week bouwt daarom een stap achter op de kalender; de rustweek en de volgende golf lopen weer gewoon door.
          </p>
        </Card>
      )}
      {horizon.sheet}
    </>
  );
}

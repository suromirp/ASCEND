import { useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import type { EnergyFeeling, LegFeeling, MorningCheckIn, SleepFeeling } from '../models/checkIn';
import { checkInFor, recentPainSpot, shouldAskCheckIn } from '../engine/wellbeing';
import { todayISO } from '../utils/dates';
import { DayRow } from './vandaag/DayRow';
import { TodaySheet } from './vandaag/TodaySheet';
import { NotFitLink } from './IllnessCard';

// Vandaag → "Hoe voel je je?" as one line in "Je dag" (the form opens in a
// sheet; "Alles normaal" is one tap on the line): the morning check-in (docs/onderzoek/Pijn
// spierpijn en vermoeidheid melden.md). One tap when all is normal, or
// three short choices: legs, energy, sleep, each compared with normal.
// With a pain spot in the last 14 days, that spot is scored too.

const LEGS: [LegFeeling, string][] = [['fris', 'Fris'], ['stijf', 'Wat stijf'], ['spierpijn', 'Spierpijn'], ['flink', 'Flinke spierpijn']];
const ENERGY: [EnergyFeeling, string][] = [['fit', 'Fit'], ['gewoon', 'Gewoon'], ['moe', 'Moe'], ['op', 'Op']];
const SLEEP: [SleepFeeling, string][] = [['goed', 'Goed'], ['gewoon', 'Gewoon'], ['matig', 'Matig'], ['slecht', 'Slecht of kort']];
const KEEP = 60;

export function MorningCheckInCard() {
  const { settings, updateSettings, sessionLogs, plannedSessions, templates } = useAppData();
  const today = todayISO();
  const existing = checkInFor(today, settings.morningCheckIns);
  const [open, setOpen] = useState(false);
  const spot = recentPainSpot(today, sessionLogs);
  const [draft, setDraft] = useState<MorningCheckIn>(() => existing ?? { date: today, spot: spot ? { area: spot.area, score: spot.lastScore } : undefined });
  const ask = shouldAskCheckIn(today, settings.morningCheckIns, sessionLogs, plannedSessions, templates);

  if (!ask && !existing) return null;

  function save(entry: MorningCheckIn) {
    const others = (settings.morningCheckIns ?? []).filter((c) => c.date !== today);
    void updateSettings({ morningCheckIns: [...others, entry].sort((a, b) => a.date.localeCompare(b.date)).slice(-KEEP) });
    setOpen(false);
  }

  const summary = existing
    ? (existing.allNormal ? ['alles normaal'] : [
        LEGS.find(([k]) => k === existing.legs)?.[1], ENERGY.find(([k]) => k === existing.energy)?.[1], SLEEP.find(([k]) => k === existing.sleep)?.[1] && `slaap ${SLEEP.find(([k]) => k === existing.sleep)![1].toLowerCase()}`,
        existing.spot && `${existing.spot.area.toLowerCase()} ${existing.spot.score}`,
      ].filter(Boolean).map((s) => String(s).toLowerCase())).join(', ')
    : '';

  const row = <K extends string>(label: string, options: [K, string][], value: K | undefined, set: (v: K) => void) => (
    <div>
      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{label}</p>
      <div className="mt-1.5 grid grid-cols-4 gap-1.5">
        {options.map(([k, text], i) => {
          const on = value === k;
          const tone = i >= 2 ? 'var(--color-warning)' : 'var(--color-gold)';
          return (
            <button key={k} onClick={() => set(k)} aria-pressed={on} className="min-h-[44px] rounded-lg border px-1 text-xs leading-tight" style={{ borderColor: on ? tone : 'var(--color-card-border)', color: on ? tone : 'var(--color-ink)', background: on ? 'color-mix(in srgb, currentColor 8%, transparent)' : 'transparent' }}>
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );

  const complete = !!(draft.legs && draft.energy && draft.sleep);
  return (
    <>
      <DayRow
        label="Gevoel"
        state={existing ? 'done' : 'todo'}
        onClick={() => { if (existing) setDraft(existing); setOpen(true); }}
        chevron={!!existing}
        action={existing ? undefined : (
          <button onClick={() => save({ date: today, allNormal: true })} className="ml-2 min-h-[44px] shrink-0 whitespace-nowrap rounded-full px-3.5 text-xs font-semibold" style={{ background: 'linear-gradient(135deg, var(--color-gold), var(--color-bronze))', color: '#15130d' }}>
            Alles normaal
          </button>
        )}
      >
        {existing ? `Vanochtend: ${summary}` : 'Hoe voel je je?'}
      </DayRow>
      {open && (
        <TodaySheet eyebrow="VANOCHTEND" title="Hoe voel je je, vergeleken met normaal?" onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-3">
            <button onClick={() => save({ date: today, allNormal: true })} className="min-h-[44px] rounded-xl px-3.5 py-2 text-sm font-semibold" style={{ background: 'linear-gradient(135deg, var(--color-gold), var(--color-bronze))', color: '#15130d' }}>
              Alles normaal
            </button>
            {row('Benen', LEGS, draft.legs, (legs) => setDraft({ ...draft, legs }))}
            {row('Energie', ENERGY, draft.energy, (energy) => setDraft({ ...draft, energy }))}
            {row('Slaap', SLEEP, draft.sleep, (sleep) => setDraft({ ...draft, sleep }))}
            {spot && (
              <div>
                <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Hoe is je {spot.area.toLowerCase()} vanochtend? 0 is niets. Na de training was het {spot.lastScore}.</p>
                <div className="mt-1.5 grid grid-cols-11 gap-1">
                  {Array.from({ length: 11 }, (_, n) => n).map((n) => {
                    const on = draft.spot?.score === n;
                    return (
                      <button key={n} onClick={() => setDraft({ ...draft, spot: { area: spot.area, score: n } })} aria-pressed={on} className="min-h-[44px] rounded-md border text-xs tabular-nums" style={{ borderColor: on ? 'var(--color-warning)' : 'var(--color-card-border)', background: on ? 'var(--color-warning)' : 'transparent', color: on ? 'var(--color-bg)' : 'var(--color-ink-dim)' }}>
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <NotFitLink />
              <button disabled={!complete} onClick={() => save({ ...draft, date: today, allNormal: undefined })} className="min-h-[44px] rounded-xl border px-4 text-sm font-semibold disabled:opacity-40" style={{ borderColor: 'var(--color-bronze-dark)', color: 'var(--color-ink)' }}>
                Opslaan
              </button>
            </div>
          </div>
        </TodaySheet>
      )}
    </>
  );
}

// ASCEND: Racedag voor een 10 km (engine/raceDay.ts, docs/beslissingen/2026-11-14-racedag-10km.md).
// Eén rij op Vandaag en in het blad van het doel, alleen in de laatste week voor de race en de dag erna;
// een tik opent het blad Racedag. Steen, geen mint: de missie houdt het ene accent van het scherm.
// Alles hier is tekst uit de engine; dit bestand rekent niets en plant niets.

import { useState } from 'react';
import { RACE_DAY_TEXT, type RaceDayView } from '../engine/raceDay';
import { useRaceDay } from './useRaceDay';
import { Icon } from './icons';
import { Eyebrow } from './ui';
import { Sheet } from './settings/Sheet';
import { TextButton } from './TextButton';

export function RaceDaySheet({ view, onClose }: { view: RaceDayView; onClose: () => void }) {
  return (
    <Sheet eyebrow={view.sheet.eyebrow} title={view.sheet.title} line={view.sheet.line} onClose={onClose}>
      {(close) => (
        <div className="flex flex-col gap-4 pb-2">
          {view.sheet.sections.map((s) => (
            <section key={s.label} className="flex flex-col gap-1">
              <Eyebrow>{s.label}</Eyebrow>
              {s.lines.map((line) => (
                <p key={line} className="text-sm leading-relaxed tabular-nums" style={{ color: 'var(--color-ink)' }}>{line}</p>
              ))}
            </section>
          ))}
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{RACE_DAY_TEXT.textOnly}</p>
          <TextButton tone="dim" onClick={close} className="self-center">Sluiten</TextButton>
        </div>
      )}
    </Sheet>
  );
}

// De rij: dezelfde op Vandaag en in het blad van het doel.
export function RaceDayRow({ view, onOpen }: { view: RaceDayView; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-race-day={view.review ? 'terugblik' : view.phase}
      className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left"
      style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}
      aria-label={`${view.row.eyebrow}: ${view.row.title}, ${view.row.line}`}
    >
      <span className="shrink-0" style={{ color: 'var(--color-ink-dim)' }}><Icon name="lopen" size={22} /></span>
      <span className="min-w-0 flex-1">
        <Eyebrow as="span">{view.row.eyebrow}</Eyebrow>
        <span className="mt-0.5 block truncate font-display text-base" style={{ color: 'var(--color-ink)' }}>{view.row.title}</span>
        <span className="block text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{view.row.line}</span>
      </span>
      <span className="shrink-0" style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={18} /></span>
    </button>
  );
}

// Vandaag: de rij met het blad erachter, of niets.
export function RaceDayLine() {
  const view = useRaceDay();
  const [open, setOpen] = useState(false);
  if (!view) return null;
  return (
    <>
      <RaceDayRow view={view} onOpen={() => setOpen(true)} />
      {open && <RaceDaySheet view={view} onClose={() => setOpen(false)} />}
    </>
  );
}

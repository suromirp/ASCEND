// ASCEND: the one place a session is moved from (session sheet and the
// Today card alike): a few suggested days, one tap each
// (engine/moveSuggestions.ts), free days first, then the days it can share,
// each with the reason underneath. "Andere dag kiezen" (and "Overslaan" where
// the sheet has no row for it) are buttons, never underlined links
// (production feedback on the old sheet: "dit is niet top").

import { useRef, useState } from 'react';
import type { MoveSuggestion } from '../engine/moveSuggestions';
import { addDays, formatDateNL, todayISO, weekdayLongNL, weekdayShortNL } from '../utils/dates';
import { SheetRow, SheetRows } from './SheetRows';
import { SecondaryButton } from './ui';

function dayName(iso: string): string {
  const today = todayISO();
  if (iso === today) return 'Vandaag';
  if (iso === addDays(today, 1)) return `Morgen, ${weekdayLongNL(iso)}`;
  const day = weekdayLongNL(iso);
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} ${formatDateNL(iso)}`;
}

export function MoveSuggestions({
  sessionDate,
  originalDate,
  suggestions,
  onPick,
  onPickDate,
  onSkip,
  onSameDay,
  catchUp = false,
}: {
  sessionDate: string;
  // Where a moved session came from: offered first, as "terug naar".
  originalDate?: string;
  suggestions: MoveSuggestion[];
  onPick: (suggestion: MoveSuggestion) => void;
  onPickDate: (date: string) => void;
  // Present: an "Overslaan" button next to "Andere dag kiezen" (the Today
  // card). The session sheet has its own row for it and leaves this out.
  onSkip?: () => void;
  // The day it already stands on was picked. A skipped training comes back
  // there ("Toch doen"); otherwise there is nothing to move, and you are told so.
  onSameDay?: () => void;
  // Een gemiste training inhalen: vandaag en de dagen erna, en de zin erboven zegt dat.
  catchUp?: boolean;
}) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sameDayNote, setSameDayNote] = useState(false);
  const [pastNote, setPastNote] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);
  const today = todayISO();
  const pickDate = (date: string) => {
    // Een dag in het verleden kan niet: inhalen is vandaag of later.
    if (catchUp && date < today) { setPastNote(true); setSameDayNote(false); return; }
    setPastNote(false);
    if (date !== sessionDate) { setSameDayNote(false); onPickDate(date); return; }
    if (onSameDay) onSameDay();
    else setSameDayNote(true);
  };
  const openPicker = () => {
    setShowDatePicker(true);
    // Straight to the calendar where the browser can; the field stays as a fallback.
    requestAnimationFrame(() => { try { dateRef.current?.showPicker?.(); } catch { /* the field is there */ } });
  };
  const canGoBack = !!originalDate && originalDate !== sessionDate && originalDate >= today;
  const visible = canGoBack ? suggestions.filter((sug) => sug.date !== originalDate) : suggestions;
  const backTitle = !canGoBack ? ''
    : originalDate === today ? 'Terug naar vandaag'
      : originalDate === addDays(today, 1) ? 'Terug naar morgen'
        : `Terug naar ${weekdayLongNL(originalDate!)} ${formatDateNL(originalDate!)}`;
  return (
    <div className="flex flex-col gap-3">
      {catchUp && (
        <p className="text-[13px] leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          Kies vandaag of een dag erna. De oude rij blijft staan, als ingehaald.
        </p>
      )}
      {originalDate && originalDate < today && originalDate !== sessionDate && (
        <p className="text-[13px] leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          Eerst gepland op {weekdayShortNL(originalDate)} {formatDateNL(originalDate)}, die dag is voorbij.
        </p>
      )}
      {(canGoBack || visible.length > 0) ? (
        <SheetRows label="Voorgestelde dagen">
          {canGoBack && <SheetRow title={backTitle} sub="Oorspronkelijke dag" onClick={() => onPickDate(originalDate!)} />}
          {visible.map((sug) => (
            <SheetRow key={sug.date} title={dayName(sug.date)} sub={sug.note} onClick={() => onPick(sug)} />
          ))}
        </SheetRows>
      ) : (
        <p className="text-[13px] leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          Deze en volgende week is er geen dag met genoeg tijd en rust. Kies zelf een dag{onSkip ? ', of sla hem over' : ''}.
        </p>
      )}
      <div className="flex gap-3">
        <SecondaryButton onClick={openPicker}>Andere dag kiezen</SecondaryButton>
        {onSkip && <SecondaryButton onClick={onSkip}>Overslaan</SecondaryButton>}
      </div>
      {showDatePicker && (
        <div>
          <label htmlFor="move-date" className="mb-2 block text-[13px]" style={{ color: 'var(--color-ink-dim)' }}>Datum</label>
          <input
            id="move-date"
            ref={dateRef}
            type="date"
            min={today}
            className="h-11 w-full rounded-xl border px-3 font-sans text-[15px] tabular-nums"
            style={{ borderColor: 'var(--color-control-border)', background: 'var(--color-charcoal)', color: 'var(--color-ink)' }}
            onChange={(e) => e.target.value && pickDate(e.target.value)}
          />
          {pastNote && (
            <p className="mt-2 text-[13px] leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
              Die dag is al voorbij. Kies vandaag of een dag erna.
            </p>
          )}
          {sameDayNote && (
            <p className="mt-2 text-[13px] leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
              Hij staat al op {weekdayLongNL(sessionDate)} {formatDateNL(sessionDate)}. Kies een andere dag.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

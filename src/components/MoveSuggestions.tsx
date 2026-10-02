// ASCEND — the one place a session is moved from (session sheet and the
// Today card alike): a few suggested days, one tap each
// (engine/moveSuggestions.ts), with "andere dag kiezen" and "overslaan" as
// quiet fallbacks. Replaces the separate "Geen tijd vandaag" button and the
// bare date picker (production feedback: the move options overlapped and
// a manual date was rarely what you wanted).

import { useState } from 'react';
import type { MoveSuggestion } from '../engine/moveSuggestions';
import { addDays, formatDateNL, todayISO, weekdayLongNL } from '../utils/dates';
import { Eyebrow } from './ui';

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
}: {
  sessionDate: string;
  // Where a moved session came from: offered first, as "terug naar".
  originalDate?: string;
  suggestions: MoveSuggestion[];
  onPick: (suggestion: MoveSuggestion) => void;
  onPickDate: (date: string) => void;
  onSkip: () => void;
}) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const canGoBack = !!originalDate && originalDate !== sessionDate && originalDate >= todayISO();
  const visible = canGoBack ? suggestions.filter((sug) => sug.date !== originalDate) : suggestions;
  return (
    <div>
      <Eyebrow>{sessionDate === todayISO() ? 'VANDAAG GEEN TIJD? VERPLAATS NAAR' : 'VERPLAATS NAAR'}</Eyebrow>
      {originalDate && originalDate < todayISO() && originalDate !== sessionDate && (
        <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
          Oorspronkelijk gepland op {weekdayLongNL(originalDate)} {formatDateNL(originalDate)}. Die dag is al voorbij, dus terugzetten kan niet meer. Kies hieronder de beste dag die nog komt.
        </p>
      )}
      {canGoBack && (
        <button
          onClick={() => onPickDate(originalDate!)}
          className="mt-2 flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-all active:scale-[0.98]"
          style={{ borderColor: 'var(--color-gold)', background: 'var(--color-charcoal)' }}
        >
          <span className="shrink-0 whitespace-nowrap text-sm" style={{ color: 'var(--color-ink)' }}>Terug naar {dayName(originalDate!).replace(/^Vandaag$/, 'vandaag')}</span>
          <span className="min-w-0 text-right text-xs" style={{ color: 'var(--color-ink-dim)' }}>oorspronkelijke dag</span>
        </button>
      )}
      {visible.length > 0 ? (
        <div className="mt-2 flex flex-col gap-2">
          {visible.map((sug) => (
            <button
              key={sug.date}
              onClick={() => onPick(sug)}
              className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-all active:scale-[0.98]"
              style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}
            >
              <span className="shrink-0 whitespace-nowrap text-sm" style={{ color: 'var(--color-ink)' }}>{dayName(sug.date)}</span>
              <span className="min-w-0 text-right text-xs" style={{ color: 'var(--color-ink-dim)' }}>{sug.note}</span>
            </button>
          ))}
        </div>
      ) : canGoBack ? null : (
        <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
          Deze en volgende week is er geen dag met genoeg tijd en 48 uur rust voor dezelfde spieren. Kies zelf een dag, of sla hem over.
        </p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <button onClick={() => setShowDatePicker((v) => !v)} className="text-xs underline" style={{ color: 'var(--color-ink-dim)' }}>
          andere dag kiezen
        </button>
        <button onClick={onSkip} className="text-xs underline" style={{ color: 'var(--color-ink-dim)' }}>
          overslaan
        </button>
      </div>
      {showDatePicker && (
        <div className="mt-2 rounded-xl border p-2" style={{ borderColor: 'var(--color-card-border)' }}>
          <input
            type="date"
            min={todayISO()}
            className="w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm"
            style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
            onChange={(e) => e.target.value && onPickDate(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

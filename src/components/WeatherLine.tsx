// ASCEND: one calm line with the weather for a training, e.g.
// "14 graden, droog, licht tot 18.12". Not a widget: nothing at all when the
// training happens indoors or when the forecast does not reach that day.
// Offline or when the forecast is old it says when it was last updated
// ("bijgewerkt om 13.05").
//
// Placed on the mission card of Today and in the training explanation; the
// engine (engine/weather.ts) does all the work. When the weather at your
// usual hour is worse than a block later or earlier that day, a second dimmed
// line says so ("Beste moment: 16 tot 17.30 uur, droog", engine/bestMoment.ts);
// otherwise nothing is added.
//
// `onOpen` makes the line a button (the mission card passes it, the page Weer
// opens). With it, an outdoor training with no place chosen yet gets one calm
// text button in the place of the line, "Weer en kleding bij je training: kies
// je plaats", as long as the weather line or the clothing advice is on. Not a
// filled button: the main button of Today is the one accent of the screen.

import type { SessionTemplate } from '../models/training';
import { useAppData } from '../state/AppDataContext';
import { resolveEffectiveFullDuration } from '../engine/substitutions';
import { isForecastStale, isWeatherSensitive, updatedLabel, weatherForTraining } from '../engine/weather';
import { showBestMoment, showClothingAdvice, showWeatherLine } from '../engine/overviewSettings';
import { bestMomentForTraining } from '../engine/bestMoment';
import { weatherLineForTraining } from '../engine/clothing';
import { adjustFor } from '../engine/clothingFeedback';
import { templateSport } from '../engine/sports';
import { Icon } from './icons';

const TONE = { prima: 'var(--color-ink-dim)', let_op: 'var(--color-warning)', slecht: 'var(--color-danger-text)' } as const;

export function WeatherLine({ template, date, minutes, className = '', onOpen }: { template: SessionTemplate; date: string; minutes?: number; className?: string; onOpen?: () => void }) {
  const { weather, sessionLogs, program, settings } = useAppData();
  const now = new Date();
  const durationMinutes = minutes ?? resolveEffectiveFullDuration(template, date, program);
  const w = weatherForTraining({ forecast: weather.forecast, template, logs: sessionLogs, date, durationMinutes, now });

  // Nog geen plaats: een buitentraining wijst de weg naar de pagina Weer.
  if (onOpen && !settings.homeLocation && isWeatherSensitive(template) && (showWeatherLine(settings.overviews) || showClothingAdvice(settings.overviews))) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={`flex min-h-[44px] w-full items-center justify-between gap-2 text-left text-sm font-medium ${className}`}
        style={{ color: 'var(--color-action)' }}
      >
        <span className="min-w-0">Weer en kleding bij je training: kies je plaats</span>
        <Icon name="verder" size={16} className="shrink-0" />
      </button>
    );
  }

  if (!showWeatherLine(settings.overviews) || !w || !weather.forecast) return null;

  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const stale = offline || isForecastStale(weather.forecast.fetchedAt, now);
  const line = weatherLineForTraining({
    forecast: weather.forecast, template, logs: sessionLogs, date, durationMinutes, now,
    adjustC: adjustFor(settings.clothingAdjust, templateSport(template)),
    clothingOn: showClothingAdvice(settings.overviews),
  }) ?? w.line;
  const lead = w.verdict === 'slecht' ? 'Slecht weer: ' : w.verdict === 'let_op' ? 'Let op: ' : '';
  const best = showBestMoment(settings.overviews)
    ? bestMomentForTraining({ forecast: weather.forecast, template, logs: sessionLogs, date, durationMinutes, now })
    : undefined;
  const text = (
    <>
      {lead}{line}
      {stale && <span style={{ color: 'var(--color-ink-dim)' }}> · {updatedLabel(weather.forecast.fetchedAt)}</span>}
      {best && <span className="mt-0.5 block" style={{ color: 'var(--color-ink-dim)' }}>{best.text}</span>}
    </>
  );
  if (onOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={`flex min-h-[44px] w-full items-center justify-between gap-2 text-left text-xs leading-snug ${className}`}
        style={{ color: TONE[w.verdict] }}
      >
        <span className="min-w-0">{text}<span className="sr-only">. Open weer en kleding</span></span>
        <Icon name="verder" size={14} className="shrink-0" />
      </button>
    );
  }
  return (
    <p className={`text-xs leading-snug ${className}`} style={{ color: TONE[w.verdict] }}>
      {text}
    </p>
  );
}

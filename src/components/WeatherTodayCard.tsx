// ASCEND: bovenaan de pagina Weer, het weer en wat je aantrekt bij je
// buitentraining van vandaag. Staat er vandaag niets buiten (of is dat al
// gedaan), dan de eerstvolgende buitentraining van de komende week.
//
// Alleen tonen en doorgeven: de keuze van het uur, het oordeel, de kleding en
// het beste moment komen uit de engine (weather.ts, clothing.ts, bestMoment.ts),
// dezelfde functies als de weerregel op Vandaag. Zonder plaats staat er niets:
// de kaart "Je plaats" eronder is dan het enige wat je nodig hebt.

import { useAppData } from '../state/AppDataContext';
import { resolveEffectiveFullDuration } from '../engine/substitutions';
import { isForecastStale, nextOutdoorTraining, updatedLabel, verdictLine, weatherForTraining } from '../engine/weather';
import { clothingForTraining, weatherLineForTraining } from '../engine/clothing';
import { adjustFor } from '../engine/clothingFeedback';
import { showBestMoment, showClothingAdvice } from '../engine/overviewSettings';
import { bestMomentForTraining } from '../engine/bestMoment';
import { templateSport } from '../engine/sports';
import { addDays, todayISO, weekdayLongNL } from '../utils/dates';
import { SettingsLinkRow } from './settings/SettingsLink';
import { Card, Eyebrow } from './ui';

const TONE = { prima: 'var(--color-ink)', let_op: 'var(--color-warning)', slecht: 'var(--color-danger-text)' } as const;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function dayLabel(date: string, today: string): string {
  if (date === today) return 'Vandaag';
  if (date === addDays(today, 1)) return 'Morgen';
  return capitalize(weekdayLongNL(date));
}

export function WeatherTodayCard() {
  const { plannedSessions, sessionLogs, templateById, weather, settings, program } = useAppData();
  if (!settings.homeLocation) return null;

  const now = new Date();
  const today = todayISO();
  const next = nextOutdoorTraining(plannedSessions, sessionLogs, templateById, today);

  if (!next) {
    return (
      <Card className="flex flex-col gap-1">
        <Eyebrow>Bij je training</Eyebrow>
        <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          De komende dagen staat er geen buitentraining in je planning. Zodra die er is, staat hier het weer en wat je aantrekt.
        </p>
      </Card>
    );
  }

  const { template, date } = next;
  const durationMinutes = resolveEffectiveFullDuration(template, date, program);
  const w = weatherForTraining({ forecast: weather.forecast, template, logs: sessionLogs, date, durationMinutes, now });
  const clothingOn = showClothingAdvice(settings.overviews);
  const adjustC = adjustFor(settings.clothingAdjust, templateSport(template));
  const advice = w && clothingOn ? clothingForTraining({ forecast: weather.forecast, template, logs: sessionLogs, date, durationMinutes, adjustC, now }) : undefined;
  const clothingLines = advice ? (advice.packLine ? [...advice.lines, advice.packLine] : advice.lines) : [];
  const line = w
    ? weatherLineForTraining({ forecast: weather.forecast, template, logs: sessionLogs, date, durationMinutes, now, adjustC, clothingOn }) ?? w.line
    : undefined;
  const best = w && showBestMoment(settings.overviews)
    ? bestMomentForTraining({ forecast: weather.forecast, template, logs: sessionLogs, date, durationMinutes, now })
    : undefined;
  const stale = !!weather.forecast && (navigator.onLine === false || isForecastStale(weather.forecast.fetchedAt, now));

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <Eyebrow>{dayLabel(date, today)} · bij je training</Eyebrow>
        <p className="font-display text-xl leading-tight" style={{ color: 'var(--color-ink)' }}>{template.name}</p>
      </div>

      {w ? (
        <div className="flex flex-col gap-1">
          <p className="text-base font-medium leading-snug" style={{ color: TONE[w.verdict] }}>{verdictLine(w)}</p>
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
            {line}
            {stale && weather.forecast ? ` · ${updatedLabel(weather.forecast.fetchedAt)}` : ''}
          </p>
          {best && <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{best.text}</p>}
        </div>
      ) : (
        <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          {weather.forecast ? 'Voor die dag is er nog geen voorspelling.' : 'Het weer is nog niet opgehaald. Probeer hieronder Nu verversen.'}
        </p>
      )}

      {w && clothingOn && clothingLines.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>Wat trek je aan</p>
          {clothingLines.map((l) => <p key={l} className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{l}</p>)}
        </div>
      )}
      {w && !clothingOn && (
        <SettingsLinkRow page="vandaag" row="kledingadvies" label="Kledingadvies staat uit. Aanzetten" />
      )}
    </Card>
  );
}

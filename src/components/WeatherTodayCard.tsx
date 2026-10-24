// ASCEND: bovenaan de pagina Weer, het weer en wat je aantrekt bij je
// buitentraining van vandaag. Staat er vandaag niets buiten (of is dat al
// gedaan), dan de eerstvolgende buitentraining van de komende week.
//
// Alleen tonen en doorgeven: de keuze van het uur, het oordeel en de kleding
// komen uit de engine (weather.ts, clothing.ts), dezelfde functies als de
// weerregel op Vandaag. Zonder plaats staat er niets: de kaart "Je plaats"
// eronder is dan het enige wat je nodig hebt.

import type { PlannedSession, SessionTemplate } from '../models/training';
import { useAppData } from '../state/AppDataContext';
import { resolveEffectiveFullDuration } from '../engine/substitutions';
import { isForecastStale, isWeatherSensitive, updatedLabel, verdictLine, weatherForTraining } from '../engine/weather';
import { clothingForTraining, weatherLineForTraining } from '../engine/clothing';
import { adjustFor } from '../engine/clothingFeedback';
import { showClothingAdvice } from '../engine/overviewSettings';
import { templateSport } from '../engine/sports';
import { addDays, todayISO, weekdayLongNL } from '../utils/dates';
import { SettingsLinkRow } from './settings/SettingsLink';
import { Card, Eyebrow } from './ui';

const TONE = { prima: 'var(--color-ink)', let_op: 'var(--color-warning)', slecht: 'var(--color-danger-text)' } as const;
const LOOK_AHEAD_DAYS = 7;

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

// De eerste training van vandaag tot en met over een week die buiten is, nog niet
// gedaan en niet overgeslagen: dezelfde vraag "is dit een buitentraining" als de
// weerregel (isWeatherSensitive).
function nextOutdoorTraining(
  planned: PlannedSession[],
  logs: { plannedSessionId?: string }[],
  templateById: Map<string, SessionTemplate>,
  today: string,
): { template: SessionTemplate; date: string } | undefined {
  const done = new Set(logs.map((l) => l.plannedSessionId).filter((id): id is string => !!id));
  for (let offset = 0; offset < LOOK_AHEAD_DAYS; offset++) {
    const date = addDays(today, offset);
    for (const s of planned) {
      if (s.scheduledDate !== date || s.status === 'skipped' || done.has(s.id)) continue;
      const template = templateById.get(s.templateId);
      if (template && isWeatherSensitive(template)) return { template, date };
    }
  }
  return undefined;
}

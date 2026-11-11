// ASCEND: De avond ervoor (docs/beslissingen/2026-11-11-avond-ervoor.md).
//
// Vanaf een vaste tijd in de avond (standaard 20:00) kijkt Vandaag naar morgen: de training van
// morgen met hoogstens vier korte regels om klaar te leggen. Alleen wat de app echt weet: het weer
// bij de start met de kledingregel, een lampje als het donker is, de rugzak, drinken bij een lange
// training, de stand op je horloge en de route. Het is alleen tekst en plant niets; de kaart
// (components/EveningBeforeCard.tsx) en de melding (components/EveningNoticeHost.tsx) tekenen dit.
//
// Puur: geen React, geen IndexedDB, geen netwerk. De klok is die van het toestel (Europe/Amsterdam
// bij de eigenaar); na middernacht is "morgen" vandaag geworden en staat de kaart er niet meer.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { LeavePeriod } from '../models/leave';
import type { IllnessEpisode } from '../models/illness';
import type { WeatherForecast } from '../models/weather';
import type { SweatEntry } from '../models/sweat';
import type { PaceRange } from './racePaces';
import type { WatchStatusKind } from './watchStatus';
import type { ScheduledNotice, NoticeChannel } from './deviceNotices';
import { addDays, toISODate } from '../utils/dates';
import { pad } from '../utils/pad';
import { kgLabel } from '../utils/kg';
import { deriveSessionStatus } from './sessionStatus';
import { resolveEffectiveFullDuration } from './substitutions';
import { leaveDays } from './leave';
import { activeIllness, isIllnessDay } from './illness';
import { clockNL, isWeatherSensitive, usualStartHour, weatherForTraining, weatherLine } from './weather';
import { clothingForTraining } from './clothing';
import { isNightAt, sunDay } from './sun';
import { progressionTarget } from './programLayout';
import { templateSport } from './sports';
import { sweatRateAt } from './sweat';
import { litersText } from './stageWater';
import { routeTarget, targetText, wantsRoute } from './routeTarget';
import { fuelEveningLine, fuelForTraining, fuelForTrekDay, trekEveningLine } from './fuelOnTheGo';

// ---- de instelling ---------------------------------------------------------------------------

export const EVENING_TIMES = ['19:00', '20:00', '21:00', '22:00'] as const;
export type EveningTime = (typeof EVENING_TIMES)[number];
export const DEFAULT_EVENING_TIME: EveningTime = '20:00';

export interface EveningSettingsInput {
  eveningBefore?: boolean;
  eveningBeforeTime?: string;
  eveningNotice?: boolean;
}

export interface EveningSettings {
  on: boolean;
  time: EveningTime;
  // Een melding op de tijd van de omslag, alleen in de Android-app. Standaard uit.
  notice: boolean;
}

export function cleanEveningTime(raw: unknown): EveningTime | undefined {
  return EVENING_TIMES.find((t) => t === raw);
}

// Afwezig is het advies: de kaart aan vanaf 20:00, de melding uit.
export function resolveEveningBefore(s: EveningSettingsInput): EveningSettings {
  return {
    on: s.eveningBefore !== false,
    time: cleanEveningTime(s.eveningBeforeTime) ?? DEFAULT_EVENING_TIME,
    notice: s.eveningNotice === true,
  };
}

const hourOf = (time: EveningTime) => Number(time.slice(0, 2));

// Is het nu de avond ervoor? Vanaf de gekozen tijd tot middernacht, op de klok van het toestel.
// Na 00:00 is morgen vandaag en hoort het antwoord bij de missie zelf.
export function isEveningNow(now: Date, time: EveningTime): boolean {
  return now.getHours() >= hourOf(time);
}

// ---- de regels -------------------------------------------------------------------------------

// Langer dan dit (in minuten) en buiten: een regel over drinken.
export const LONG_MINUTES = 90;
export const MAX_LINES = 4;

export const EVENING_TEXT = {
  eyebrow: 'De avond ervoor',
  watchSent: 'Staat op je horloge.',
  watchStale: 'Wijziging nog niet op je horloge.',
  watchPending: 'Nog niet op je horloge.',
  watchFailed: 'Versturen naar je horloge lukte niet.',
  noticeTitle: 'Morgen',
} as const;

export interface EveningInput {
  now: Date;
  settings: EveningSettings;
  planned: PlannedSession[];
  logs: SessionLog[];
  templateById: Map<string, SessionTemplate>;
  program: Program | null | undefined;
  leavePeriods?: LeavePeriod[];
  illnessEpisodes?: IllnessEpisode[];
  // Het weer; afwezig zonder netwerk of zonder plaats. Dan valt de weerregel weg.
  forecast?: WeatherForecast;
  // Instellingen Weer bij je training en Kledingadvies.
  weatherOn: boolean;
  clothingOn: boolean;
  // Je eigen bijstelling van de kleding per sport (clothingFeedback.ts).
  clothingAdjust?: (template: SessionTemplate) => number;
  // De plek voor zon en donker (sunPlace); werkt zonder netwerk.
  place: { lat: number; lon: number };
  sweatEntries?: SweatEntry[];
  // De stand op het horloge van een geplande training; afwezig zolang hij laadt.
  watchStatus?: (session: PlannedSession, template: SessionTemplate) => WatchStatusKind | undefined;
  // Instelling "Laten zien of het gelukt is".
  showWatchStatus: boolean;
  // Instelling Route voorstellen, en het rustige tempo uit je test voor de afstand.
  routeOn: boolean;
  easyPace?: PaceRange;
  // Instelling Eten onderweg (engine/fuelOnTheGo.ts). Afwezig is hier uit; de hook geeft de instelling door.
  fuelOn?: boolean;
}

export interface EveningTrainingView {
  kind: 'training' | 'trek';
  date: string;
  // "Morgen 07:00, Lange duurloop, 60 min"; bij twee trainingen beide.
  title: string;
  lines: string[];
}

// Wat de kaart toont, of niets: voor de grens, met de instelling uit, op een rustdag, bij vakantie of
// ziek, als morgen al gedaan is, of als er niets klaar te leggen valt (nooit een lege kaart).
export function eveningBefore(input: EveningInput): EveningTrainingView | undefined {
  if (!input.settings.on || !isEveningNow(input.now, input.settings.time)) return undefined;
  return tomorrowPrep(input);
}

// Hetzelfde zonder de klok: voor de melding, die vooraf gepland wordt.
export function tomorrowPrep(input: EveningInput): EveningTrainingView | undefined {
  const today = toISODate(input.now);
  const date = addDays(today, 1);

  // Ziek: rust uit, er valt niets klaar te leggen. Ook als de ziekte morgen nog loopt.
  if (activeIllness(input.illnessEpisodes) || isIllnessDay(date, input.illnessEpisodes, date)) return undefined;

  const leave = leaveDays(input.leavePeriods).get(date);
  if (leave?.kind === 'off') return undefined;
  if (leave?.kind === 'trek') {
    const kg = leave.period.trek?.packKg;
    const fuel = input.fuelOn ? fuelForTrekDay() : undefined;
    const lines = [...(kg ? [packLine(kg)] : []), ...(fuel ? [trekEveningLine(fuel)] : [])];
    if (lines.length === 0) return undefined;
    const name = leave.period.trek?.name?.trim() || 'Tochtdag';
    return { kind: 'trek', date, title: `Morgen: ${name}`, lines };
  }

  const sessions = input.planned
    .filter((s) => s.scheduledDate === date && s.status !== 'skipped')
    .filter((s) => deriveSessionStatus(s, input.logs).status !== 'completed')
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ session: s, template: input.templateById.get(s.templateId) }))
    .filter((x): x is { session: PlannedSession; template: SessionTemplate } => !!x.template && x.template.type !== 'recovery');
  if (sessions.length === 0) return undefined;

  const parts = sessions.map((x) => trainingPrep(input, x.session, x.template, date));
  const lines = dedupe(parts.flatMap((p) => p.lines)).slice(0, MAX_LINES);
  if (lines.length === 0) return undefined;
  const title = `Morgen ${parts.map((p) => p.label).join(' en ')}`;
  return { kind: 'training', date, title, lines };
}

interface Part {
  label: string;
  lines: string[];
}

function trainingPrep(input: EveningInput, session: PlannedSession, template: SessionTemplate, date: string): Part {
  const minutes = session.plannedMinutes ?? resolveEffectiveFullDuration(template, date, input.program);
  const outside = isWeatherSensitive(template);
  const startHour = usualStartHour(template, input.logs, date).hour;
  const clock = `${pad(startHour)}:00`;
  const label = outside ? `${clock}, ${template.name}, ${minutes} min` : `${template.name}, ${minutes} min`;
  // In volgorde van belang; de kaart neemt de eerste vier.
  const lines: string[] = [];

  // 1. Het weer bij de start, met de eerste kledingregel erachter.
  if (outside && input.forecast && (input.weatherOn || input.clothingOn)) {
    const w = weatherForTraining({ forecast: input.forecast, template, logs: input.logs, date, durationMinutes: minutes, now: input.now });
    if (w) {
      const parts: string[] = [];
      if (input.weatherOn) parts.push(`${capital(weatherLine({ ...w, daylight: undefined }))}.`);
      if (input.clothingOn) {
        const advice = clothingForTraining({ forecast: input.forecast, template, logs: input.logs, date, durationMinutes: minutes, adjustC: input.clothingAdjust?.(template), now: input.now });
        if (advice?.lines[0]) parts.push(advice.lines[0]);
      }
      if (parts.length > 0) lines.push(parts.join(' '));
    }
  }

  // 2. Een lampje: start voor zonsopgang of einde na zonsondergang. Met een voorspelling dezelfde tijden
  // als de weerregel op de missie; zonder uitgerekend (engine/sun.ts), dus ook zonder netwerk.
  if (outside) {
    const daylight = input.forecast ? weatherForTraining({ forecast: input.forecast, template, logs: input.logs, date, durationMinutes: minutes, now: input.now })?.daylight : undefined;
    const lamp = daylight
      ? daylight.startsBeforeSunrise
        ? lampText('tot', daylight.sunrise)
        : daylight.endsAfterSunset
          ? lampText('vanaf', daylight.sunset)
          : undefined
      : lampLine(date, startHour * 60, minutes, input.place);
    if (lamp) lines.push(lamp);
  }

  // 3. De rugzak van een rugzaktraining of tocht (de rugzakladder, anders de training zelf).
  const kg = progressionTarget(template, input.program, date)?.step.backpackKg ?? template.outdoorTarget?.backpackWeightKg;
  if (kg && kg > 0) lines.push(packLine(kg));

  // 4. De stand op je horloge, alleen als de training via de koppeling loopt. Een probleem (nog niet,
  // wijziging nog niet, lukte niet) staat hier; "Staat op je horloge." is alleen geruststelling en
  // komt na het eten (docs/beslissingen/2026-11-11-eten-onderweg.md).
  const watchKind = input.showWatchStatus ? input.watchStatus?.(session, template) : undefined;
  const watch = watchLine(watchKind);
  if (watch && watchKind !== 'sent') lines.push(watch);

  // 5. Drinken bij een lange training buiten: wat je ongeveer kwijtraakt, uit je eigen zweettempo.
  if (outside && minutes >= LONG_MINUTES) {
    const sport = templateSport(template);
    const activity = sport === 'running' ? 'run' : 'walk';
    const w = input.forecast ? weatherForTraining({ forecast: input.forecast, template, logs: input.logs, date, durationMinutes: minutes, now: input.now }) : undefined;
    if (w) {
      const rate = sweatRateAt(input.sweatEntries, w.tempC, activity);
      const liters = Math.max(0.5, Math.round(((rate.mlPerHour * minutes) / 60 / 1000) * 2) / 2);
      lines.push(`Drinken mee: je zweet ongeveer ${litersText(liters)}.`);
    } else {
      lines.push(`Drinken mee voor ${minutes} min.`);
    }
  }

  // 6. Eten mee bij een loop of wandeling vanaf 90 minuten (engine/fuelOnTheGo.ts), naast het drinken.
  if (input.fuelOn) {
    const fuel = fuelForTraining(template, minutes);
    if (fuel) lines.push(fuelEveningLine(fuel));
  }

  // 7. Staat op je horloge: na het eten, want het blad Je horloge zegt het ook.
  if (watch && watchKind === 'sent') lines.push(watch);

  // 8. De route, als Route voorstellen aan staat. Een route wordt niet bewaard: je vraagt hem op bij de training.
  if (input.routeOn && wantsRoute(template)) {
    const target = routeTarget({ template, date, program: input.program, logs: input.logs, testPace: input.easyPace });
    lines.push(`Route ${targetText(target)}: vraag een lus op bij de training.`);
  }

  return { label, lines };
}

export function packLine(kg: number): string {
  return `Rugzak ${kgLabel(kg, 1)}.`;
}

function watchLine(kind: WatchStatusKind | undefined): string | undefined {
  switch (kind) {
    case 'sent':
      return EVENING_TEXT.watchSent;
    case 'stale':
      return EVENING_TEXT.watchStale;
    case 'pending':
      return EVENING_TEXT.watchPending;
    case 'failed':
      return EVENING_TEXT.watchFailed;
    default:
      // Niet gekoppeld, later of geen workout: daar zegt het blad Je horloge genoeg over.
      return undefined;
  }
}

// De offset van de klok van het toestel op die dag, in minuten oost van UTC (Amsterdam in de winter 60).
function utcOffsetOn(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return -new Date(y, m - 1, d, 12).getTimezoneOffset();
}

const lampText = (word: 'tot' | 'vanaf', hhmm: string) => `Donker ${word} ${clockNL(hhmm)}, neem een lampje mee.`;

const clockOf = (minute: number) => `${pad(Math.floor(minute / 60) % 24)}:${pad(minute % 60)}`;

export function lampLine(date: string, startMinute: number, minutes: number, place: { lat: number; lon: number }): string | undefined {
  const day = sunDay(date, place.lat, place.lon, utcOffsetOn(date));
  const end = startMinute + minutes;
  if (typeof day === 'string') return day === 'always-night' ? 'Donker de hele dag, neem een lampje mee.' : undefined;
  const startDark = isNightAt(day, startMinute);
  // Een start in de ochtend voor zonsopgang: licht vanaf. Anders valt de avond in tijdens of voor de training.
  if (startDark && startMinute < day.sunrise) return lampText('tot', clockOf(day.sunrise));
  if (startDark || end >= 1440 || isNightAt(day, end)) return lampText('vanaf', clockOf(day.sunset));
  return undefined;
}

function capital(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function dedupe(lines: string[]): string[] {
  return [...new Set(lines)];
}

// ---- de melding ------------------------------------------------------------------------------

export const EVENING_NOTICE_ID = 4001;

// Het moment van de melding: vandaag op de tijd van de omslag, als dat nog komt.
export function eveningNoticeAt(now: Date, time: EveningTime): Date | undefined {
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hourOf(time), 0, 0, 0);
  return at.getTime() > now.getTime() ? at : undefined;
}

// De melding van vanavond met dezelfde regels als de kaart, of niets.
export function eveningNotice(view: EveningTrainingView | undefined, at: Date | undefined, channel: NoticeChannel): ScheduledNotice | undefined {
  if (!view || !at || view.lines.length === 0) return undefined;
  return {
    id: EVENING_NOTICE_ID,
    at: at.getTime(),
    title: view.title,
    body: view.lines[0],
    largeBody: view.lines.join('\n'),
    channel,
    link: '#/',
  };
}

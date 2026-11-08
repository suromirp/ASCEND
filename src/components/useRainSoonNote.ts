// ASCEND: de regel over regen in het komende uur bij een training buiten (engine/rainSoon.ts).
// Haalt de kwartieren alleen op als het ertoe doet: de instelling staat aan, er is een plaats, de
// training is buiten, het is vandaag en ze begint binnen twee uur. Zonder antwoord, zonder netwerk
// of bij een fout is er geen regel en geen foutmelding.

import { useEffect, useState } from 'react';
import type { SessionTemplate } from '../models/training';
import type { AppSettings } from '../storage/database';
import { rainSoonNote, RAIN_START_WITHIN_MIN, RAIN_STARTED_AGO_MIN } from '../engine/rainSoon';
import { isWeatherSensitive } from '../engine/weather';
import { showRainSoon } from '../engine/overviewSettings';
import { refreshRainSoon } from '../storage/rainSoon';
import { todayISO } from '../utils/dates';

export function useRainSoonNote(input: { template: SessionTemplate; date: string; startHour?: number; durationMinutes: number; settings: AppSettings }): string | undefined {
  const { template, date, startHour, durationMinutes, settings } = input;
  const [note, setNote] = useState<string | undefined>();
  const place = settings.homeLocation;
  const now = new Date();
  const toStart = startHour === undefined ? Infinity : startHour * 60 - (now.getHours() * 60 + now.getMinutes());
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const wanted =
    showRainSoon(settings.overviews) && !!place && !offline && startHour !== undefined && isWeatherSensitive(template) &&
    date === todayISO() && toStart < RAIN_START_WITHIN_MIN && toStart >= -RAIN_STARTED_AGO_MIN;
  const lat = place?.lat;
  const lon = place?.lon;
  const name = place?.name ?? '';
  useEffect(() => {
    if (!wanted || lat === undefined || lon === undefined || startHour === undefined) return;
    let alive = true;
    void refreshRainSoon({ name, lat, lon }).then((f) => {
      if (alive) setNote(rainSoonNote({ forecast: f, date, startMinutes: startHour * 60, durationMinutes, now: new Date() }));
    });
    return () => {
      alive = false;
    };
  }, [wanted, lat, lon, name, date, startHour, durationMinutes]);
  return wanted ? note : undefined;
}

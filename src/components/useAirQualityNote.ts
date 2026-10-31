// ASCEND: de regel over de luchtkwaliteit bij een harde training buiten (engine/airQuality.ts).
// Haalt de luchtkwaliteit alleen op als het ertoe doet: de instelling staat aan, er is een plaats,
// de training is hard (hoge intensiteit) en buiten, en de dag valt binnen de komende vier dagen.

import { useEffect, useState } from 'react';
import type { SessionTemplate } from '../models/training';
import type { AppSettings } from '../storage/database';
import { airQualityNote, type AirQualityNote } from '../engine/airQuality';
import { resolveEffectiveStressProfile } from '../engine/stressProfile';
import { isWeatherSensitive } from '../engine/weather';
import { signalOn } from '../engine/signalSettings';
import { refreshAirQuality } from '../storage/airQuality';
import { AIR_DAYS } from '../integrations/openMeteo';
import { addDays, todayISO } from '../utils/dates';

export function useAirQualityNote(input: { template: SessionTemplate; date: string; startHour?: number; durationMinutes: number; settings: AppSettings }): AirQualityNote | undefined {
  const { template, date, startHour, durationMinutes, settings } = input;
  const [note, setNote] = useState<AirQualityNote | undefined>();
  const place = settings.homeLocation;
  const today = todayISO();
  const wanted =
    signalOn(settings, 'airQuality') && !!place && startHour !== undefined && isWeatherSensitive(template) &&
    resolveEffectiveStressProfile(template).intensity === 'high' && date >= today && date < addDays(today, AIR_DAYS);
  const lat = place?.lat;
  const lon = place?.lon;
  const name = place?.name ?? '';
  useEffect(() => {
    if (!wanted || lat === undefined || lon === undefined || startHour === undefined) return;
    let alive = true;
    void refreshAirQuality({ name, lat, lon }).then((f) => {
      if (alive) setNote(f ? airQualityNote(f.hours, date, startHour, durationMinutes, todayISO()) : undefined);
    });
    return () => {
      alive = false;
    };
  }, [wanted, lat, lon, name, date, startHour, durationMinutes]);
  return wanted ? note : undefined;
}

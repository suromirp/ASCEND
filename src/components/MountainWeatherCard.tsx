// ASCEND: Vandaag, onder de volgende tocht: het bergweer op de hoogte van je tocht, alleen op een dag
// van de tocht zelf en als het weer je locatie volgt (engine/mountainWeather.ts). Alleen informatie en een vaste
// verwijzing naar het officiële bergweer; geen oordeel en geen knop die iets aan je planning doet.
// Ophalen gaat via storage/mountainWeather.ts, met de plek van het gewone weer.

import { useEffect, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { MOUNTAIN_WEATHER_LINK, mountainTrekDay, mountainUpdatedLabel, mountainWeatherLine, type MountainWeatherLine } from '../engine/mountainWeather';
import { signalOn } from '../engine/signalSettings';
import { followsLocation } from '../engine/overviewSettings';
import { refreshMountainWeather } from '../storage/mountainWeather';
import { todayISO } from '../utils/dates';
import { Card, Eyebrow } from './ui';
import { Icon } from './icons';

export function MountainWeatherCard() {
  const { leavePeriods, settings } = useAppData();
  const today = todayISO();
  const place = settings.homeLocation;
  const day = signalOn(settings, 'mountainWeather') && place ? mountainTrekDay(leavePeriods, today, followsLocation(settings.overviews)) : undefined;
  const [shown, setShown] = useState<MountainWeatherLine | undefined>();
  const lat = place?.lat;
  const lon = place?.lon;
  const name = place?.name ?? '';
  const date = day?.date;
  const height = day?.highestM;
  useEffect(() => {
    if (lat === undefined || lon === undefined || !date || !height) return;
    let alive = true;
    void refreshMountainWeather({ name, lat, lon }, height).then((f) => {
      if (alive) setShown(f ? mountainWeatherLine(f, date) : undefined);
    });
    return () => {
      alive = false;
    };
  }, [lat, lon, name, date, height]);
  if (!day || !shown) return null;
  return (
    <Card className="flex flex-col gap-2">
      <Eyebrow>Bergweer, {day.trek.name}</Eyebrow>
      <p className="text-sm leading-relaxed tabular-nums" style={{ color: 'var(--color-ink)' }}>{shown.line}</p>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
        Voor {shown.place}, {mountainUpdatedLabel(shown.fetchedAt, today)}. Een weermodel rekent een bergkam grof uit; kijk voor je vertrekt ook naar het officiële bergweer.
      </p>
      <a href={MOUNTAIN_WEATHER_LINK.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center self-start text-xs underline underline-offset-2" style={{ color: 'var(--color-action)' }}>
        {MOUNTAIN_WEATHER_LINK.label}<Icon name="buiten" size={14} className="ml-1 inline align-[-2px]" />
      </a>
    </Card>
  );
}

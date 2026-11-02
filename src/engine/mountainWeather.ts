// ASCEND: bergweer op de hoogte van je tocht (docs/onderzoek/Kansen met gegevens.md, kans I;
// docs/beslissingen/2026-11-01-kansen-middelgroot.md).
//
// Alleen informatie en een vaste verwijzing, nooit een oordeel als "ga niet": veiligheid in de
// bergen is vakwerk en ASCEND geeft daar geen advies over (docs/onderzoek/Doelsoorten berg en
// buiten.md). Wanneer: een tocht met terrein bergen of sneeuw waarvoor je een hoogste punt
// opgaf, alleen op een dag van de tocht zelf en alleen als het weer je locatie volgt (dan is de plek
// van het weer de plek waar je bent; de dag ervoor ben je meestal nog thuis). Dan vraagt de app
// Open-Meteo met dezelfde afgeronde plek als het gewone weer, met die hoogte erbij
// (integrations/openMeteo.ts), hoogstens eens per uur, zoals het gewone weer. Een eigen plek per
// tocht komt later, samen met de locatie-functie uit de backlog.
//
// Een model van 1 tot 11 km rekent een bergkam grof uit: de hoogte helpt bij de temperatuur, niet
// bij een lokale bui. Daarom de tijd van het ophalen erbij, en de verwijzing naar het officiële
// bergweer.
//
// Puur: geen React, geen IndexedDB.

import type { LeavePeriod, TrekDetails } from '../models/leave';
import type { MountainForecast } from '../integrations/openMeteo';
import { addDays, formatDayMonthNL } from '../utils/dates';
import { updatedLabel } from './weather';
import { formatNumberNL } from '../utils/number';

// De dag op de berg: van 8 tot en met 18 uur. Onweer: de middag, van 12 tot en met 20 uur.
const DAY_HOURS: [number, number] = [8, 18];
const AFTERNOON: [number, number] = [12, 20];
// CAPE vanaf 1000 J/kg is genoeg energie voor flinke buien; een weercode van 95 of hoger is onweer.
const CAPE_THUNDER = 1000;
const CODE_THUNDER = 95;
const SAME_TEMP = 3;

export const MOUNTAIN_WEATHER_LINK = { label: 'Bergweer van Météo-France', url: 'https://meteofrance.com/meteo-montagne' };

export interface MountainTrekDay {
  period: LeavePeriod;
  trek: TrekDetails;
  date: string;
  highestM: number;
}

// De tochtdag van vandaag, als de tocht bezig is en het weer je locatie volgt
// (overviewSettings.ts#followsLocation). Undefined zonder tocht in de bergen of de sneeuw met een
// hoogste punt, of als het weer een vaste plek heeft.
export function mountainTrekDay(periods: readonly LeavePeriod[] | undefined, today: string, followsLocation: boolean): MountainTrekDay | undefined {
  if (!followsLocation) return undefined;
  for (const p of periods ?? []) {
    const t = p.trek;
    if (p.kind !== 'trek' || !t || (t.terrain !== 'mountain' && t.terrain !== 'snow') || !t.highestM) continue;
    if (p.startDate <= today && today <= p.endDate) return { period: p, trek: t, date: today, highestM: t.highestM };
  }
  return undefined;
}

const hourOf = (time: string) => Number(time.slice(11, 13));

export interface MountainWeatherLine {
  line: string;
  // Wanneer de voorspelling is opgehaald (ISO), voor "bijgewerkt om".
  fetchedAt: string;
  place: string;
}

// "Op 2.500 m vandaag tussen 2 en 8 graden, windstoten tot 50 km per uur, kans op onweer in de
// middag. Het vriespunt ligt rond 3.100 m." Undefined zonder uren voor die dag.
export function mountainWeatherLine(forecast: MountainForecast, date: string): MountainWeatherLine | undefined {
  const day = forecast.hours.filter((h) => h.time.startsWith(date) && hourOf(h.time) >= DAY_HOURS[0] && hourOf(h.time) <= DAY_HOURS[1]);
  if (day.length === 0) return undefined;
  const temps = day.map((h) => h.tempC);
  const lo = Math.round(Math.min(...temps));
  const hi = Math.round(Math.max(...temps));
  const temp = hi - lo <= SAME_TEMP ? `rond ${Math.round((lo + hi) / 2)} graden` : `tussen ${lo} en ${hi} graden`;
  const parts = [`Op ${formatNumberNL(forecast.elevationM, 0)} m vandaag ${temp}`];
  const gusts = day.map((h) => h.gustKmh).filter((g): g is number => g !== undefined);
  if (gusts.length > 0) parts.push(`windstoten tot ${Math.round(Math.max(...gusts))} km per uur`);
  const afternoon = forecast.hours.filter((h) => h.time.startsWith(date) && hourOf(h.time) >= AFTERNOON[0] && hourOf(h.time) <= AFTERNOON[1]);
  if (afternoon.some((h) => (h.code ?? 0) >= CODE_THUNDER || (h.capeJkg ?? 0) >= CAPE_THUNDER)) parts.push('kans op onweer in de middag');
  let line = `${parts.join(', ')}.`;
  const freezing = day.map((h) => h.freezingM).filter((f): f is number => f !== undefined);
  if (freezing.length > 0) line += ` Het vriespunt ligt rond ${formatNumberNL(Math.round(Math.min(...freezing) / 100) * 100, 0)} m.`;
  return { line, fetchedAt: forecast.fetchedAt, place: forecast.place.name };
}

// "bijgewerkt om 21.10", met "gisteren" ervoor als de voorspelling van de avond ervoor is: op een
// tocht heb je vaak geen bereik, dan blijft die van gisteren staan.
export function mountainUpdatedLabel(fetchedAt: string, today: string): string {
  const d = new Date(fetchedAt);
  const label = updatedLabel(fetchedAt);
  if (Number.isNaN(d.getTime())) return label;
  const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (local === today) return label;
  return local === addDays(today, -1) ? `gisteren ${label}` : `${label} op ${formatDayMonthNL(local)}`;
}

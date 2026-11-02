// ASCEND: bergweer op de hoogte van je tocht (docs/onderzoek/Kansen met gegevens.md, kans I;
// docs/beslissingen/2026-11-01-kansen-middelgroot.md).
//
// Alleen informatie en een vaste verwijzing, nooit een oordeel als "ga niet": veiligheid in de
// bergen is vakwerk en ASCEND geeft daar geen advies over (docs/onderzoek/Doelsoorten berg en
// buiten.md). Wanneer: een tocht met terrein bergen of sneeuw waarvoor je een hoogste punt
// opgaf. Twee wegen:
// - Heeft de tocht een eigen plek voor het bergweer (`trek.place`), dan komt de kaart al de dag
//   ervoor ("morgen") en blijft hij tot en met de laatste dag, voor die plek, ook als je thuis zit.
// - Heeft hij die niet, dan alleen op een dag van de tocht zelf en alleen als het weer je locatie
//   volgt (dan is de plek van het weer de plek waar je bent; de dag ervoor ben je meestal nog thuis).
// De app vraagt Open-Meteo met de afgeronde plek, met de hoogte erbij (integrations/openMeteo.ts),
// hoogstens eens per uur, zoals het gewone weer.
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
  // De dag waarvoor het bergweer is: vandaag, of morgen als de tocht morgen begint.
  date: string;
  when: 'vandaag' | 'morgen';
  highestM: number;
  // De eigen plek van de tocht; zonder gebruikt de kaart de plek van het gewone weer.
  place?: NonNullable<TrekDetails['place']>;
}

// De dag waarvoor het bergweer wordt getoond, of undefined. Zonder tocht in de bergen of de sneeuw met een
// hoogste punt is er niets. Een tocht die bezig is gaat voor op een die morgen begint. Een tocht met
// een eigen plek mag de dag ervoor; een tocht zonder alleen op een dag van de tocht en als het weer je
// locatie volgt (overviewSettings.ts#followsLocation).
export function mountainTrekDay(periods: readonly LeavePeriod[] | undefined, today: string, followsLocation: boolean): MountainTrekDay | undefined {
  const withHeight = (periods ?? []).filter((p): p is LeavePeriod & { trek: TrekDetails & { highestM: number } } => {
    const t = p.trek;
    return p.kind === 'trek' && !!t && (t.terrain === 'mountain' || t.terrain === 'snow') && !!t.highestM;
  });
  for (const p of withHeight) {
    if (p.startDate <= today && today <= p.endDate && (followsLocation || p.trek.place)) {
      return { period: p, trek: p.trek, date: today, when: 'vandaag', highestM: p.trek.highestM, ...(p.trek.place ? { place: p.trek.place } : {}) };
    }
  }
  const tomorrow = addDays(today, 1);
  for (const p of withHeight) {
    if (p.trek.place && p.startDate === tomorrow) return { period: p, trek: p.trek, date: tomorrow, when: 'morgen', highestM: p.trek.highestM, place: p.trek.place };
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
export function mountainWeatherLine(forecast: MountainForecast, date: string, when: 'vandaag' | 'morgen' = 'vandaag'): MountainWeatherLine | undefined {
  const day = forecast.hours.filter((h) => h.time.startsWith(date) && hourOf(h.time) >= DAY_HOURS[0] && hourOf(h.time) <= DAY_HOURS[1]);
  if (day.length === 0) return undefined;
  const temps = day.map((h) => h.tempC);
  const lo = Math.round(Math.min(...temps));
  const hi = Math.round(Math.max(...temps));
  const temp = hi - lo <= SAME_TEMP ? `rond ${Math.round((lo + hi) / 2)} graden` : `tussen ${lo} en ${hi} graden`;
  const parts = [`Op ${formatNumberNL(forecast.elevationM, 0)} m ${when} ${temp}`];
  const gusts = day.map((h) => h.gustKmh).filter((g): g is number => g !== undefined);
  if (gusts.length > 0) parts.push(`windstoten tot ${Math.round(Math.max(...gusts))} km per uur`);
  const afternoon = forecast.hours.filter((h) => h.time.startsWith(date) && hourOf(h.time) >= AFTERNOON[0] && hourOf(h.time) <= AFTERNOON[1]);
  if (afternoon.some((h) => (h.code ?? 0) >= CODE_THUNDER || (h.capeJkg ?? 0) >= CAPE_THUNDER)) parts.push('kans op onweer in de middag');
  let line = `${parts.join(', ')}.`;
  const freezing = day.map((h) => h.freezingM).filter((f): f is number => f !== undefined);
  if (freezing.length > 0) line += ` Het vriespunt ligt rond ${formatNumberNL(Math.round(Math.min(...freezing) / 100) * 100, 0)} m.`;
  return { line, fetchedAt: forecast.fetchedAt, place: forecast.place.name };
}

// "bijgewerkt om 21:10", met "gisteren" ervoor als de voorspelling van de avond ervoor is: op een
// tocht heb je vaak geen bereik, dan blijft die van gisteren staan.
export function mountainUpdatedLabel(fetchedAt: string, today: string): string {
  const d = new Date(fetchedAt);
  const label = updatedLabel(fetchedAt);
  if (Number.isNaN(d.getTime())) return label;
  const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (local === today) return label;
  return local === addDays(today, -1) ? `gisteren ${label}` : `${label} op ${formatDayMonthNL(local)}`;
}

// ASCEND: het weer van de gekozen plek in de Briefing (besluit docs/beslissingen/2026-11-12-weer-op-de-plek.md).
//
// Kies je bij Start bij een plek die verder dan 10 km van huis ligt (engine/places.ts#weatherAtPlace),
// dan volgt het weer-vak die plek. Dit bestand zegt voor welke plek er een tweede voorspelling nodig
// is, en welke voorspelling het vak daarna toont. Puur: het ophalen staat in storage/placeWeather.ts.
// Het plant niets en bewaart niets; Vandaag en de pagina Weer blijven het weer van huis tonen.

import type { RoutePoint } from '../models/route';
import type { WeatherForecast, WeatherPlace } from '../models/weather';
import { weatherAtPlace } from './places';
import { validStartPoint } from './routeStart';

export interface PlaceWeatherInput {
  // Instelling Weer van de gekozen plek.
  on: boolean;
  // De plek die bij Start bij gekozen is (een bewaarde of gezochte plek), ongelezen.
  place?: { name: string; point: unknown };
  // De plek Thuis, ongelezen; afwezig of kapot telt als geen Thuis.
  home?: unknown;
  // De plaats waar het weer van huis voor geldt (je plaats in Weer en kleding), ongelezen.
  weatherHome?: unknown;
}

// Twee decimalen, zoals het weer van huis: ongeveer een kilometer, nooit de precieze plek.
const round2 = (v: number) => Math.round(v * 100) / 100;

// De plek waarvoor het vak een eigen voorspelling wil, of geen: instelling uit, geen plek, een plek
// zonder bruikbare coördinaten, of een plek binnen 10 km van huis. Huis is Thuis en de plaats van het
// weer: ligt de plek ver van een van beide, dan klopt het weer van huis daar niet. Zonder beide is er
// geen weer van huis en telt elke plek met coördinaten.
export function placeWeatherTarget(i: PlaceWeatherInput): WeatherPlace | undefined {
  if (!i.on || !i.place) return undefined;
  const point = validStartPoint(i.place.point);
  if (!point) return undefined;
  const refs = [validStartPoint(i.home), validStartPoint(i.weatherHome)].filter((p): p is RoutePoint => !!p);
  if (refs.length > 0 && !refs.some((ref) => weatherAtPlace(point, ref))) return undefined;
  return { name: i.place.name.trim(), lat: round2(point.lat), lon: round2(point.lon) };
}

// Wat de tweede voorspelling opleverde: nog bezig, gelukt, of mislukt (netwerk, time-out, opslag).
export type PlaceWeatherState = { status: 'loading' } | { status: 'ok'; forecast: WeatherForecast } | { status: 'failed' };

// Wat het weer-vak leest: welke voorspelling, en of de plek erbij genoemd wordt.
export interface BriefingWeather {
  forecast?: WeatherForecast;
  // 'shown': dit is het weer van de plek. 'failed': dit is het weer van huis, en dat zegt de regel.
  place?: { name: string; state: 'shown' | 'failed' };
}

// Zolang de voorspelling van de plek laadt staat het weer van huis er, zonder plaatsnaam: nooit een
// leeg vak. Mislukt hij, dan blijft het weer van huis staan met één eerlijke regel.
export function briefingWeather(target: WeatherPlace | undefined, state: PlaceWeatherState | undefined, home: WeatherForecast | undefined): BriefingWeather {
  if (!target || !state || state.status === 'loading') return { forecast: home };
  if (state.status === 'ok') return { forecast: state.forecast, place: { name: target.name, state: 'shown' } };
  return { forecast: home, place: { name: target.name, state: 'failed' } };
}

// De teksten van het vak. Een plek zonder naam (een treffer die geen naam gaf) heet "je plek".
const nameOf = (name: string) => (name ? name : 'je plek');
export const placeWeatherLine = (name: string, line: string): string => `In ${nameOf(name)}: ${line.charAt(0).toLowerCase()}${line.slice(1)}`;
export const placeWeatherFailed = (name: string): string => `Weer in ${nameOf(name)} laadde niet.`;
export const PLACE_WEATHER_FROM_HOME = 'Dit is thuis.';

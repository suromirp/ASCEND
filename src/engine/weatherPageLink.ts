// ASCEND: de gekozen plek mee van de Briefing naar de pagina Weer
// (besluit docs/beslissingen/2026-11-13-weer-van-de-plek-pagina.md).
//
// De rij Weer in de Briefing toont het weer van een plek die ver van huis ligt
// (engine/placeWeather.ts). Tik je erop, dan krijgt de pagina Weer dezelfde plek, training en dag
// mee, zodat ze hetzelfde weer toont en de plek bij naam noemt. Wat meegaat reist in de stap van de
// router (HashRouter, `state`), niet in het adres en niet in de opslag: de keuze van een plek geldt
// voor deze training en wordt niet bewaard. Puur: dit bestand haalt niets op en plant niets.

import type { WeatherForecast, WeatherPlace } from '../models/weather';
import type { PlaceWeatherState } from './placeWeather';
import { validStartPoint } from './routeStart';

// Wat de pagina Weer van de Briefing krijgt: de plek, en bij welke training op welke dag.
export interface WeatherPageLink {
  place: WeatherPlace;
  templateId: string;
  date: string;
}

// De vorm in de stap van de router. Eén sleutel, zodat andere gebruikers van `state` er niet mee botsen.
export interface WeatherPageState {
  weatherPlace: WeatherPageLink;
}

// Wat de Briefing meegeeft. Geen plek gekozen (of een plek binnen 10 km van huis, of de instelling
// uit: dan is er geen doel): er gaat niets mee en de pagina toont thuis.
export function weatherPageLink(place: WeatherPlace | undefined, templateId: string, date: string): WeatherPageState | undefined {
  if (!place) return undefined;
  return { weatherPlace: { place: { name: place.name, lat: place.lat, lon: place.lon }, templateId, date } };
}

const round2 = (v: number) => Math.round(v * 100) / 100;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

// Wat de pagina leest uit de stap van de router. Alles wat niet klopt is thuis, zonder fout: niets
// meegegeven, een kapotte vorm, een plek zonder bruikbare coördinaten, geen training, geen dag, of
// een dag die voorbij is (een oude stap in de geschiedenis van de browser blijft soms dagen staan).
export function readWeatherPageLink(raw: unknown, today: string): WeatherPageLink | undefined {
  const link = (raw as { weatherPlace?: unknown } | null | undefined)?.weatherPlace as Partial<Record<keyof WeatherPageLink, unknown>> | null | undefined;
  if (!link || typeof link !== 'object') return undefined;
  const point = validStartPoint(link.place);
  if (!point) return undefined;
  if (typeof link.templateId !== 'string' || !link.templateId) return undefined;
  if (typeof link.date !== 'string' || !ISO_DAY.test(link.date) || link.date < today) return undefined;
  const name = (link.place as { name?: unknown }).name;
  return {
    place: { name: typeof name === 'string' ? name.trim() : '', lat: round2(point.lat), lon: round2(point.lon) },
    templateId: link.templateId,
    date: link.date,
  };
}

// De teksten bij de kaart. Een plek zonder naam (een treffer die geen naam gaf) heet "je plek".
const where = (name: string) => (name ? `in ${name}` : 'op je plek');
export const weatherPageNote = {
  loading: (name: string): string => `Weer ${where(name)} wordt opgehaald.`,
  shown: (name: string): string => (name ? `Weer in ${name}, de plek uit je Briefing.` : 'Weer op je plek uit de Briefing.'),
  failed: (name: string, hasHome: boolean): string => `Weer ${where(name)} laadde niet.${hasHome ? ' Dit is het weer van thuis.' : ''}`,
};

// Wat de kaart bovenaan de pagina leest.
export interface WeatherPageView {
  forecast: WeatherForecast | undefined;
  // De plek wordt nog opgehaald: de kaart toont de regel en geen getallen.
  loading: boolean;
  // De regel die zegt van welke plek dit weer is, of dat de plek niet laadde.
  note?: string;
  // Waar: dit is het weer van de plek, niet van thuis.
  place?: true;
}

// Zonder plek: thuis, zoals altijd. Met een plek: tijdens het laden geen getallen van thuis (die
// zouden even later verspringen naar die van de plek), gelukt de plek bij naam, mislukt het weer
// van thuis met één eerlijke regel.
export function weatherPageView(link: WeatherPageLink | undefined, state: PlaceWeatherState | undefined, home: WeatherForecast | undefined): WeatherPageView {
  if (!link) return { forecast: home, loading: false };
  const name = link.place.name;
  if (!state || state.status === 'loading') return { forecast: undefined, loading: true, note: weatherPageNote.loading(name) };
  if (state.status === 'ok') return { forecast: state.forecast, loading: false, note: weatherPageNote.shown(name), place: true };
  return { forecast: home, loading: false, note: weatherPageNote.failed(name, !!home) };
}

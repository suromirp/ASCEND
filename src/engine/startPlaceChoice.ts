// ASCEND: de plek die je in de Briefing bij Start bij koos, onthouden voor die ene geplande training
// (besluit docs/beslissingen/2026-11-15-avond-ervoor-kent-de-plek.md, I-37).
//
// Een tik op een plek geldt nog steeds voor deze training en niet voor andere. Nieuw is dat hij blijft
// staan als je de Briefing sluit en weer opent, tot de dag van de training voorbij is. Zo kent ook De
// avond ervoor de plek, en toont ze het weer daar. Puur: het bewaren staat in storage/startPlaceChoice.ts.

import type { FoundPlace } from './placeSearch';
import type { WeatherPlace } from '../models/weather';
import { placeWeatherTarget } from './placeWeather';
import { validStartPoint } from './routeStart';
import { addDays } from '../utils/dates';

export interface StartPlaceChoice {
  // De dag van de geplande training: daarna vervalt de keuze.
  date: string;
  name: string;
  lat: number;
  lon: number;
  // Een bewaarde plek; afwezig bij een gezochte plek die (nog) niet bewaard is.
  placeId?: string;
  // De treffer van een gezochte plek, zodat Bewaar als plek na het heropenen nog kan.
  found?: FoundPlace;
}

export type StartPlaceChoices = Record<string, StartPlaceChoice>;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
// Een plafond voor de zekerheid; in gewoon gebruik staan er een paar.
const MAX_ENTRIES = 60;

function cleanFound(raw: unknown): FoundPlace | undefined {
  const f = raw as Partial<FoundPlace> | null | undefined;
  if (!f || typeof f !== 'object' || typeof f.name !== 'string' || !validStartPoint(f)) return undefined;
  return {
    name: f.name,
    lat: f.lat as number,
    lon: f.lon as number,
    ...(typeof f.kind === 'string' ? { kind: f.kind } : {}),
    ...(typeof f.region === 'string' ? { region: f.region } : {}),
    ...(typeof f.country === 'string' ? { country: f.country } : {}),
  };
}

function cleanChoice(raw: unknown): StartPlaceChoice | undefined {
  const c = raw as Partial<StartPlaceChoice> | null | undefined;
  if (!c || typeof c !== 'object' || typeof c.date !== 'string' || !ISO_DAY.test(c.date) || typeof c.name !== 'string') return undefined;
  const point = validStartPoint(c);
  if (!point) return undefined;
  const found = cleanFound(c.found);
  return {
    date: c.date,
    name: c.name,
    lat: point.lat,
    lon: point.lon,
    ...(typeof c.placeId === 'string' && c.placeId ? { placeId: c.placeId } : {}),
    ...(found ? { found } : {}),
  };
}

// Wat er bewaard staat, gelezen; alles wat niet klopt valt weg.
export function cleanChoices(raw: unknown): StartPlaceChoices {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: StartPlaceChoices = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    const c = cleanChoice(value);
    if (c) out[id] = c;
  }
  return out;
}

// De keuze voor deze geplande training op deze dag, zolang de dag niet voorbij is. Een training die
// intussen naar een andere dag verschoof begint opnieuw: daar past de plek misschien niet meer.
export function choiceFor(map: StartPlaceChoices, sessionId: string | undefined, date: string, today: string): StartPlaceChoice | undefined {
  if (!sessionId) return undefined;
  const c = map[sessionId];
  return c && c.date === date && c.date >= today ? c : undefined;
}

// Zet of wist de keuze van één training; voorbije dagen en wat boven het plafond uitkomt gaan weg.
export function withChoice(map: StartPlaceChoices, sessionId: string, choice: StartPlaceChoice | undefined, today: string): StartPlaceChoices {
  const next: StartPlaceChoices = { ...map };
  if (choice) next[sessionId] = choice;
  else delete next[sessionId];
  const from = addDays(today, -1);
  const kept = Object.entries(next)
    .filter(([, c]) => c.date >= from)
    .sort((a, b) => b[1].date.localeCompare(a[1].date))
    .slice(0, MAX_ENTRIES);
  return Object.fromEntries(kept);
}

// Wat de lus bij het openen terugzet. Een bewaarde plek alleen als hij er nog is (anders niets: een
// gewiste plek komt niet stil terug); kon de lijst niet gelezen worden, dan ook niets. Een gezochte
// plek komt terug met zijn treffer.
export function restoredStart(choice: StartPlaceChoice | undefined, places: readonly { id: string; name: string; lat: number; lon: number; home?: boolean }[] | undefined): { placeId?: string; name: string; point: { lat: number; lon: number }; found?: FoundPlace } | undefined {
  if (!choice) return undefined;
  if (choice.placeId) {
    const p = places?.find((x) => x.id === choice.placeId && !x.home);
    return p ? { placeId: p.id, name: p.name, point: { lat: p.lat, lon: p.lon } } : undefined;
  }
  return { name: choice.name, point: { lat: choice.lat, lon: choice.lon }, ...(choice.found ? { found: choice.found } : {}) };
}

// Voor De avond ervoor: de training van morgen met een onthouden plek ver van huis, en de plek waarvoor
// het weer gezocht wordt. Dezelfde regels als de rij Weer in de Briefing (engine/placeWeather.ts): de
// instelling Weer van de gekozen plek, een route op de kaart (Route voorstellen aan en een manier
// buiten met een lus), en een plek verder dan 10 km van huis. Bij twee trainingen de eerste.
export interface EveningPlaceInput {
  placeWeatherOn: boolean;
  rememberOn: boolean;
  routeOn: boolean;
  sessions: readonly { id: string; date: string; routeShown: boolean }[];
  choices: StartPlaceChoices | undefined;
  today: string;
  home?: unknown;
  weatherHome?: unknown;
}

export function eveningPlaceTarget(i: EveningPlaceInput): { sessionId: string; target: WeatherPlace } | undefined {
  if (!i.placeWeatherOn || !i.rememberOn || !i.routeOn || !i.choices) return undefined;
  for (const s of i.sessions) {
    if (!s.routeShown) continue;
    const c = choiceFor(i.choices, s.id, s.date, i.today);
    if (!c) continue;
    const target = placeWeatherTarget({ on: true, place: { name: c.name, point: { lat: c.lat, lon: c.lon } }, home: i.home, weatherHome: i.weatherHome });
    if (target) return { sessionId: s.id, target };
  }
  return undefined;
}

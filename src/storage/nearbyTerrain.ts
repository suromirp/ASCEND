// ASCEND: wat er rond een plek ligt voor heuvels en trappen (engine/nearbyTerrain.ts), per plek op
// dit toestel bewaard onder een eigen sleutel. Een cache van kaartgegevens: hij gaat nooit mee in de
// back-up en bevat geen adres en geen naam; alleen bij een eigen startpunt van een lus (`exact`)
// staat dat punt erin op vier decimalen, anders alleen de afgeronde plek. Per plek hoogstens eens per
// dertig dagen opgehaald; hoogstens zes plekken bewaard. Gooit nooit: zonder antwoord is er gewoon
// geen regel.
//
// De eerste vraag ("mag ASCEND heuvels zoeken?") is ook een eigen sleutel op dit toestel: pas na een
// ja gaat er een afgeronde plek naar OpenStreetMap, ook als de schakelaar in de instellingen aan staat.

import { MetaRepo } from './database';
import { fetchNearbyTerrain, type OverpassOptions } from '../integrations/overpass';
import { roundCoordinate } from '../integrations/openMeteo';
import type { NearbyTerrain } from '../models/nearbyTerrain';
import type { WeatherPlace } from '../models/weather';

const KEY = 'nearbyTerrain';
const ASKED_KEY = 'nearbyTerrainAsked';
export const TERRAIN_FETCH_DAYS = 30;
export const TERRAIN_MAX_PLACES = 6;

// `exact` (het eigen startpunt van een lus): een eigen sleutel op vier decimalen, naast de afgeronde plek.
export const terrainKey = (place: WeatherPlace, exact = false): string =>
  exact ? `${place.lat.toFixed(4)},${place.lon.toFixed(4)}` : `${roundCoordinate(place.lat).toFixed(2)},${roundCoordinate(place.lon).toFixed(2)}`;

function valid(t: unknown): t is NearbyTerrain {
  const x = t as NearbyTerrain | undefined;
  return !!x && typeof x.fetchedAt === 'string' && Array.isArray(x.features) && typeof x.place?.lat === 'number' && typeof x.place?.lon === 'number';
}

async function readAll(): Promise<Record<string, NearbyTerrain>> {
  try {
    const all = await MetaRepo.get<Record<string, NearbyTerrain>>(KEY);
    if (!all || typeof all !== 'object') return {};
    return Object.fromEntries(Object.entries(all).filter(([, v]) => valid(v)));
  } catch {
    return {};
  }
}

export async function getNearbyTerrain(place: WeatherPlace, exact = false): Promise<NearbyTerrain | undefined> {
  return (await readAll())[terrainKey(place, exact)];
}

// Of de gebruiker op dit toestel ja zei op de eerste vraag. Een nee wordt niet bewaard: dat zet de
// schakelaar uit, en zet je hem later weer aan, dan vraagt de app het opnieuw.
export async function hasTerrainConsent(): Promise<boolean> {
  try {
    return (await MetaRepo.get<string>(ASKED_KEY)) === 'yes';
  } catch {
    return false;
  }
}

export async function grantTerrainConsent(): Promise<void> {
  try {
    await MetaRepo.set(ASKED_KEY, 'yes');
  } catch {
    // Zonder opslag vraagt de app het bij de volgende keer opnieuw.
  }
}

const inFlight = new Map<string, Promise<NearbyTerrain | undefined>>();

// Wat er bewaard is als het vers genoeg is, anders een nieuwe zoektocht. Bij een fout blijft het
// oude resultaat van dezelfde plek staan, zonder het te vernieuwen.
export function refreshNearbyTerrain(place: WeatherPlace, options: OverpassOptions = {}): Promise<NearbyTerrain | undefined> {
  const key = terrainKey(place, options.exact);
  const running = inFlight.get(key);
  if (running) return running;
  const job = (async () => {
    const now = options.now ?? new Date();
    const all = await readAll();
    const have = all[key];
    if (have && now.getTime() - Date.parse(have.fetchedAt) < TERRAIN_FETCH_DAYS * 86_400_000) return have;
    const next = await fetchNearbyTerrain(place, { ...options, now });
    if (!next) return have;
    all[key] = next;
    const newest = Object.entries(all).sort((a, b) => Date.parse(b[1].fetchedAt) - Date.parse(a[1].fetchedAt)).slice(0, TERRAIN_MAX_PLACES);
    try {
      await MetaRepo.set(KEY, Object.fromEntries(newest));
    } catch {
      // Niet kunnen bewaren is geen reden om het antwoord weg te gooien.
    }
    return next;
  })().finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, job);
  return job;
}

// Wist de bewaarde plekken (bij uitzetten of een nieuw begin); de eerste vraag blijft.
export async function clearNearbyTerrain(): Promise<void> {
  try {
    await MetaRepo.set(KEY, {});
  } catch {
    // niets te wissen
  }
}

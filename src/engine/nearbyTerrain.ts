// ASCEND: één regel over heuvels en trappen in de buurt, bij een heuveltraining en bij trap- of
// bergconditie ("Op 1,2 km een helling van 60 m") met een link naar de kaart op openstreetmap.org,
// buiten de app. Voor een andere training is er niets. Het verandert de planning nooit: het is een
// regel. Zie docs/beslissingen/2026-11-08-heuvels-osm.md.
//
// Wat bij de training past: een heuveltraining zoekt een helling van minstens 20 m (of een trap),
// trap- of bergconditie neemt de dichtstbijzijnde trap of helling. Zonder hoogtegegevens telt een
// helling toch mee, zonder maat. Op een dag van een periode zonder sportschool met Heuvels in de
// buurt aan krijgt elke loop dezelfde regel als een heuveltraining (terrainWishOn); ook dat plant
// niets. Pure: geen React, geen IndexedDB.

import type { NearbyTerrain, TerrainFeature } from '../models/nearbyTerrain';
import type { SessionTemplate } from '../models/training';
import type { LeavePeriod } from '../models/leave';
import { hasRole, type RoleCarrier } from './templateRoles';
import { leaveDays } from './leave';
import { resolveNoGym } from './noGymDetails';
import { isNoGymRun } from './noGym';

export const MIN_HILL_HEIGHT_M = 20;
export const OSM_SITE = 'https://www.openstreetmap.org/';

export type TerrainWish = 'hills' | 'stairs_or_climb';

// Een heuveltraining herkennen we aan de rol; trap- of bergconditie bestaat in opgeslagen
// programma's zonder eigen rol, dus daar telt het id van het ingebouwde sjabloon (zie het besluit).
const HILL_IDS = new Set(['tpl_hill_intervals', 'tpl_hills_descent', 'tpl_hill_easy']);
const CLIMB_IDS = new Set(['tpl_bergconditie']);

export function terrainWish(template: RoleCarrier & Pick<SessionTemplate, 'id'>): TerrainWish | undefined {
  if (hasRole(template, 'hills') || HILL_IDS.has(template.id)) return 'hills';
  if (CLIMB_IDS.has(template.id)) return 'stairs_or_climb';
  return undefined;
}

// De wens op een dag: die van de training, of op een dag zonder sportschool met Heuvels in de buurt
// aan voor elke loop een helling (docs/beslissingen/2026-11-09-zonder-sportschool.md).
export function terrainWishOn(template: SessionTemplate, date: string, periods: LeavePeriod[] | undefined): TerrainWish | undefined {
  const own = terrainWish(template);
  if (own) return own;
  const day = leaveDays(periods).get(date);
  return day?.kind === 'nogym' && resolveNoGym(day.period).hills && isNoGymRun(template) ? 'hills' : undefined;
}

const usableHill = (f: TerrainFeature) => f.kind === 'hill' && (f.heightM === undefined || f.heightM >= MIN_HILL_HEIGHT_M);

export function pickTerrain(wish: TerrainWish, terrain: NearbyTerrain): TerrainFeature | undefined {
  const byDistance = (a: TerrainFeature, b: TerrainFeature) => a.distanceM - b.distanceM;
  const hills = terrain.features.filter(usableHill).sort(byDistance);
  const steps = terrain.features.filter((f) => f.kind === 'steps').sort(byDistance);
  if (wish === 'hills') return hills[0] ?? steps[0];
  return [hills[0], steps[0]].filter((f): f is TerrainFeature => !!f).sort(byDistance)[0];
}

// "400 m" tot een kilometer, daarna "1,2 km".
export function distanceText(meters: number): string {
  if (meters < 1000) return `${Math.max(50, Math.round(meters / 50) * 50)} m`;
  return `${(Math.round(meters / 100) / 10).toFixed(1).replace('.', ',')} km`;
}

export function mapLink(f: Pick<TerrainFeature, 'lat' | 'lon'>): string {
  return `${OSM_SITE}?mlat=${f.lat}&mlon=${f.lon}#map=17/${f.lat}/${f.lon}`;
}

export interface TerrainLine {
  text: string;
  url: string;
  linkLabel: string;
}

export function terrainLine(template: RoleCarrier & Pick<SessionTemplate, 'id'>, terrain: NearbyTerrain | undefined, wish: TerrainWish | undefined = terrainWish(template)): TerrainLine | undefined {
  if (!wish || !terrain) return undefined;
  const f = pickTerrain(wish, terrain);
  if (!f) return undefined;
  const far = distanceText(f.distanceM);
  const what = f.kind === 'steps'
    ? 'een trap'
    : f.heightM !== undefined ? `een helling van ${Math.round(f.heightM / 5) * 5} m` : 'een helling';
  return { text: `Op ${far} ${what}.`, url: mapLink(f), linkLabel: 'Bekijk op de kaart' };
}

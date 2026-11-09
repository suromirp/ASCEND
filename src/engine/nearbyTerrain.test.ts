import { describe, expect, it } from 'vitest';
import type { NearbyTerrain, TerrainFeature } from '../models/nearbyTerrain';
import type { LeavePeriod } from '../models/leave';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { distanceText, mapLink, pickTerrain, terrainLine, terrainWish, terrainWishOn } from './nearbyTerrain';

const terrain = (features: TerrainFeature[]): NearbyTerrain => ({ source: 'osm', fetchedAt: '2026-11-08T10:00:00.000Z', place: { name: '', lat: 52.12, lon: 5.65 }, radiusM: 3000, features });
const hill = (distanceM: number, heightM?: number): TerrainFeature => ({ kind: 'hill', lat: 52.13, lon: 5.66, distanceM, ...(heightM !== undefined ? { heightM } : {}) });
const steps = (distanceM: number): TerrainFeature => ({ kind: 'steps', lat: 52.121, lon: 5.651, distanceM });

const hillTraining = { id: 'tpl_hill_intervals' };
const climbTraining = { id: 'tpl_bergconditie' };

describe('welke training een regel krijgt', () => {
  it('heuveltraining en bergconditie wel, andere niet', () => {
    expect(terrainWish(hillTraining)).toBe('hills');
    expect(terrainWish({ id: 'tpl_hills_descent' })).toBe('hills');
    expect(terrainWish({ id: 'eigen', roles: ['hills'] })).toBe('hills');
    expect(terrainWish(climbTraining)).toBe('stairs_or_climb');
    for (const id of ['tpl_easy_run', 'tpl_long_run', 'tpl_tempo_run', 'tpl_upper_a', 'tpl_ruck_walk', 'tpl_race']) expect(terrainWish({ id }), id).toBeUndefined();
  });

  it('een andere training krijgt nooit een regel, ook met heuvels in de buurt', () => {
    expect(terrainLine({ id: 'tpl_easy_run' }, terrain([hill(500, 80)]))).toBeUndefined();
  });
});

describe('een dag zonder sportschool met Heuvels in de buurt', () => {
  const byId = new Map(buildDefaultProgramData().templates.map((t) => [t.id, t]));
  const tpl = (id: string) => byId.get(id)!;
  const away = (hills: boolean): LeavePeriod => ({ id: 'weg', kind: 'no_gym', startDate: '2026-11-16', endDate: '2026-11-20', noGym: { amount: 'light', strength: 'bodyweight', hills } });

  it('een loop krijgt dan de regel van een heuveltraining, alleen op de dagen van de periode', () => {
    expect(terrainWishOn(tpl('tpl_easy_run'), '2026-11-17', [away(true)])).toBe('hills');
    expect(terrainWishOn(tpl('tpl_long_run'), '2026-11-20', [away(true)])).toBe('hills');
    expect(terrainWishOn(tpl('tpl_easy_run'), '2026-11-21', [away(true)])).toBeUndefined();
    expect(terrainWishOn(tpl('tpl_easy_run'), '2026-11-17', [away(false)])).toBeUndefined();
    expect(terrainWishOn(tpl('tpl_easy_run'), '2026-11-17', undefined)).toBeUndefined();
    const line = terrainLine(tpl('tpl_easy_run'), terrain([hill(800, 40)]), terrainWishOn(tpl('tpl_easy_run'), '2026-11-17', [away(true)]));
    expect(line?.text).toBe('Op 800 m een helling van 40 m.');
  });

  it('kracht met eigen gewicht en een vakantie krijgen niets; een eigen heuveltraining houdt zijn regel', () => {
    expect(terrainWishOn(tpl('tpl_bodyweight'), '2026-11-17', [away(true)])).toBeUndefined();
    const holiday: LeavePeriod = { id: 'vak', kind: 'no_training', startDate: '2026-11-16', endDate: '2026-11-20' };
    expect(terrainWishOn(tpl('tpl_easy_run'), '2026-11-17', [holiday])).toBeUndefined();
    // Een vakantie over dezelfde dagen is strenger: dan geen loop en geen regel.
    expect(terrainWishOn(tpl('tpl_easy_run'), '2026-11-17', [away(true), holiday])).toBeUndefined();
    expect(terrainWishOn(tpl('tpl_bergconditie'), '2026-11-17', [away(true)])).toBe('stairs_or_climb');
  });
});

describe('de keuze', () => {
  it('heuveltraining neemt de dichtstbijzijnde helling van minstens 20 m', () => {
    const t = terrain([hill(300, 8), hill(1200, 60), hill(2000, 90)]);
    expect(pickTerrain('hills', t)?.distanceM).toBe(1200);
  });

  it('zonder bruikbare helling valt een heuveltraining terug op een trap', () => {
    expect(pickTerrain('hills', terrain([hill(300, 8), steps(900)]))?.kind).toBe('steps');
  });

  it('een helling zonder hoogtegegevens telt mee', () => {
    expect(pickTerrain('hills', terrain([hill(700)]))?.distanceM).toBe(700);
  });

  it('bergconditie neemt wat het dichtstbij ligt: trap of helling', () => {
    expect(pickTerrain('stairs_or_climb', terrain([hill(1200, 60), steps(400)]))?.kind).toBe('steps');
    expect(pickTerrain('stairs_or_climb', terrain([hill(300, 60), steps(400)]))?.kind).toBe('hill');
  });

  it('sportvelden, een baan en onverharde paden zijn geen heuvel', () => {
    const t = terrain([{ kind: 'track', lat: 52.1, lon: 5.6, distanceM: 100 }, { kind: 'dirt_path', lat: 52.1, lon: 5.6, distanceM: 100 }, { kind: 'sports_ground', lat: 52.1, lon: 5.6, distanceM: 100 }]);
    expect(pickTerrain('hills', t)).toBeUndefined();
    expect(pickTerrain('stairs_or_climb', t)).toBeUndefined();
  });
});

describe('de regel', () => {
  it('het droge feit eerst, afstand in km met komma en hoogte op vijf meter', () => {
    const l = terrainLine(hillTraining, terrain([hill(1230, 62)]));
    expect(l?.text).toBe('Op 1,2 km een helling van 60 m.');
  });

  it('een trap onder een kilometer in meters', () => {
    expect(terrainLine(climbTraining, terrain([steps(420)]))?.text).toBe('Op 400 m een trap.');
  });

  it('een helling zonder hoogte zegt geen maat', () => {
    expect(terrainLine(hillTraining, terrain([hill(2100)]))?.text).toBe('Op 2,1 km een helling.');
  });

  it('geen gedachtestreepjes en een link naar openstreetmap.org', () => {
    const l = terrainLine(hillTraining, terrain([hill(1230, 62)]))!;
    expect(l.text).not.toMatch(/[–—]/);
    expect(new URL(l.url).hostname).toBe('www.openstreetmap.org');
    expect(l.url).toBe(mapLink({ lat: 52.13, lon: 5.66 }));
  });

  it('niets zonder gegevens of zonder iets geschikts', () => {
    expect(terrainLine(hillTraining, undefined)).toBeUndefined();
    expect(terrainLine(hillTraining, terrain([]))).toBeUndefined();
  });

  it('afstanden: nooit 0 m en afgerond', () => {
    expect(distanceText(10)).toBe('50 m');
    expect(distanceText(980)).toBe('1000 m');
    expect(distanceText(1000)).toBe('1,0 km');
    expect(distanceText(2960)).toBe('3,0 km');
  });
});

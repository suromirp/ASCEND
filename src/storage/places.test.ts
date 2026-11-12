// Plekken en bewaarde routes, spoor 1: de opslag, de migratie van Vast punt naar Thuis, export en import.
// Alle punten zijn nagemaakt, geen echte plekken.

import { beforeEach, describe, expect, it } from 'vitest';
import { MetaRepo, wipeAllData } from './database';
import { runBootMigrations } from './bootMigrations';
import { buildBackupEnvelope } from './backupExport';
import { normalizeBackupToCurrentModel } from './backupNormalize';
import { buildImportPreview } from './backupPreview';
import { createImportPlan, createPreImportSnapshot, applyImportPlan, listSnapshots, restoreSnapshot } from './backupApply';
import { defaultActionsForMode, defaultPlanPolicyForMode } from './backupMerge';
import { CURRENT_BACKUP_SCHEMA_VERSION } from './backupTypes';
import { CURRENT_SCHEMA_VERSION, migrateExport, migratePlaces, migrateSavedRoutes, type AscendExport } from './migrations';
import { OLD_START_POINT_KEY, PLACES_KEY, SAVED_ROUTES_KEY, clearHome, loadPlaces, loadSavedRoutes, migrateStartPointToHome, readPlaceStore, removePlace, removeRoute, savePlace, saveRoute, setHomePoint, type PlacesMeta } from './places';
import { clearRouteStartPoint, getRouteStartPoint, saveRouteStartPoint } from './routeStart';
import { HOME_PLACE_ID, homeFromStartPoint, homeOf, isLoopRoute } from '../engine/places';
import { chooseStart } from '../engine/routeStart';
import type { Place, SavedRoute } from '../models/place';

const OLD_POINT = { lat: 52.12346, lon: 5.65432 };
const DAY = '2026-11-12';

const hill: Place = { id: 'place_hill', name: 'Heuveltop', lat: 51.9, lon: 5.9, features: ['hill', 'parking'], source: 'map', createdAt: '2026-11-13' };
const loop: SavedRoute = {
  id: 'route_1',
  placeId: 'place_hill',
  name: 'Avontuurlijk 8,2 km',
  source: 'proposal',
  style: 'adventure',
  distanceM: 8200,
  ascentM: 240,
  points: [{ lat: 51.9, lon: 5.9, ele: 40 }, { lat: 51.91, lon: 5.91, ele: 90.4 }, { lat: 51.9001, lon: 5.9001 }],
  createdAt: '2026-11-13',
  chosenFor: [{ date: '2026-11-14', plannedSessionId: 'ps_1' }],
};

// Een opslag in het geheugen, met een schakelaar om een fout na te spelen.
function fakeMeta(start: Record<string, unknown> = {}) {
  const data = new Map<string, unknown>(Object.entries(start));
  const state = { failWrite: 0, failGet: false, failDelete: false, writes: 0, keys: new Set<string>() };
  const meta: PlacesMeta = {
    get: async (key) => {
      if (state.failGet) throw new Error('opslag antwoordt niet');
      return data.get(key);
    },
    write: async (puts, deletes = []) => {
      state.writes++;
      if (state.failWrite > 0) { state.failWrite--; throw new Error('schrijven mislukt'); }
      if (state.failDelete && deletes.length > 0) throw new Error('wissen mislukt');
      for (const [k, v] of Object.entries(puts)) { data.set(k, v); state.keys.add(k); }
      for (const k of deletes) { data.delete(k); state.keys.add(k); }
    },
  };
  return { meta, data, state };
}

async function restore(file: unknown, mode: 'full_restore' | 'merge' = 'full_restore') {
  const backup = normalizeBackupToCurrentModel(file);
  const selections = defaultActionsForMode(mode);
  const policy = defaultPlanPolicyForMode(mode);
  const preview = await buildImportPreview(backup, selections, policy);
  const snapshot = await createPreImportSnapshot();
  const plan = createImportPlan(backup, mode, selections, policy, preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id);
  await applyImportPlan(backup, plan);
  return { backup, preview };
}

beforeEach(async () => {
  await wipeAllData();
});

describe('Vast punt wordt Thuis', () => {
  it('homeFromStartPoint maakt de plek Thuis uit een oud punt, en niets uit een kapot punt', () => {
    expect(homeFromStartPoint(OLD_POINT, DAY)).toEqual({ id: HOME_PLACE_ID, name: 'Thuis', lat: 52.12346, lon: 5.65432, home: true, source: 'fixed-point', createdAt: DAY });
    expect(homeFromStartPoint({ lat: 'x', lon: 5 }, DAY)).toBeUndefined();
    expect(homeFromStartPoint(undefined, DAY)).toBeUndefined();
    // Twee keer dezelfde invoer geeft twee keer hetzelfde.
    expect(homeFromStartPoint(OLD_POINT, DAY)).toEqual(homeFromStartPoint(OLD_POINT, DAY));
  });

  it('het oude punt wordt precies één keer Thuis en de oude sleutel gaat weg', async () => {
    await MetaRepo.set(OLD_START_POINT_KEY, OLD_POINT);
    expect(await migrateStartPointToHome(DAY)).toBe('migrated');
    expect(await MetaRepo.get(OLD_START_POINT_KEY)).toBeUndefined();
    expect(await MetaRepo.get(PLACES_KEY)).toEqual([{ id: HOME_PLACE_ID, name: 'Thuis', lat: 52.12346, lon: 5.65432, home: true, source: 'fixed-point', createdAt: DAY }]);
    // Vast punt blijft werken: de instelling `exact` vindt hetzelfde punt.
    expect(await getRouteStartPoint()).toEqual(OLD_POINT);
    expect(chooseStart('exact', await getRouteStartPoint())).toEqual({ kind: 'exact', point: OLD_POINT });
  });

  it('twee keer starten: de tweede keer doet niets, ook op een latere dag', async () => {
    await MetaRepo.set(OLD_START_POINT_KEY, OLD_POINT);
    await runBootMigrations({ build: 'v1' });
    const first = await MetaRepo.get(PLACES_KEY);
    expect(homeOf(first as Place[])?.source).toBe('fixed-point');
    // Een nieuwe versie van de app laat alle stappen opnieuw lopen.
    await runBootMigrations({ build: 'v2' });
    expect(await migrateStartPointToHome('2027-01-01')).toBe('none');
    expect(await MetaRepo.get(PLACES_KEY)).toEqual(first);
    expect((await loadPlaces()).filter((p) => p.home)).toHaveLength(1);
  });

  it('zonder oud punt gebeurt er niets en wordt er niets geschreven', async () => {
    const { meta, state } = fakeMeta();
    expect(await migrateStartPointToHome(DAY, meta)).toBe('none');
    expect(state.writes).toBe(0);
    await runBootMigrations({ build: 'v1' });
    expect(await MetaRepo.get(PLACES_KEY)).toBeUndefined();
  });

  it('je hernoemde Thuis en wiste hem daarna: een latere start maakt hem niet opnieuw', async () => {
    await MetaRepo.set(OLD_START_POINT_KEY, OLD_POINT);
    await migrateStartPointToHome(DAY);
    const home = homeOf(await loadPlaces())!;
    expect(await savePlace({ ...home, name: 'Voordeur' })).toBe(true);
    expect(homeOf(await loadPlaces())?.name).toBe('Voordeur');
    expect(await getRouteStartPoint()).toEqual(OLD_POINT);
    expect(await clearRouteStartPoint()).toBe(true);
    await runBootMigrations({ build: 'v3' });
    expect(await loadPlaces()).toEqual([]);
  });

  it('er was al een Thuis (uit een back-up): die blijft, alleen de oude sleutel gaat weg', async () => {
    const other: Place = { id: 'place_x', name: 'Deur', lat: 51.5, lon: 5.5, home: true, source: 'map', createdAt: '2026-11-11' };
    const { meta, data } = fakeMeta({ [OLD_START_POINT_KEY]: OLD_POINT, [PLACES_KEY]: [other] });
    expect(await migrateStartPointToHome(DAY, meta)).toBe('migrated');
    expect(data.get(PLACES_KEY)).toEqual([other]);
    expect(data.has(OLD_START_POINT_KEY)).toBe(false);
  });

  it('er waren al plekken zonder Thuis: Thuis komt erbij, de rest blijft', async () => {
    const { meta, data } = fakeMeta({ [OLD_START_POINT_KEY]: OLD_POINT, [PLACES_KEY]: [hill], [SAVED_ROUTES_KEY]: [loop] });
    expect(await migrateStartPointToHome(DAY, meta)).toBe('migrated');
    expect((data.get(PLACES_KEY) as Place[]).map((p) => p.id)).toEqual([HOME_PLACE_ID, 'place_hill']);
    expect(data.get(SAVED_ROUTES_KEY)).toEqual([loop]);
  });

  it('een kapotte oude waarde was geen punt: er komt geen Thuis en de sleutel gaat weg', async () => {
    const { meta, data } = fakeMeta({ [OLD_START_POINT_KEY]: { lat: 'x', lon: 5 } });
    expect(await migrateStartPointToHome(DAY, meta)).toBe('migrated');
    expect(data.has(PLACES_KEY)).toBe(false);
    expect(data.has(OLD_START_POINT_KEY)).toBe(false);
  });
});

describe('een fout halverwege de migratie: alles of niets', () => {
  it('mislukt het schrijven van Thuis, dan blijft de oude sleutel staan en lukt het de volgende start', async () => {
    const { meta, data, state } = fakeMeta({ [OLD_START_POINT_KEY]: OLD_POINT });
    state.failWrite = 1;
    expect(await migrateStartPointToHome(DAY, meta)).toBe('failed');
    expect(data.get(OLD_START_POINT_KEY)).toEqual(OLD_POINT);
    expect(data.has(PLACES_KEY)).toBe(false);
    // De volgende start.
    expect(await migrateStartPointToHome('2026-11-13', meta)).toBe('migrated');
    expect(data.has(OLD_START_POINT_KEY)).toBe(false);
    expect((data.get(PLACES_KEY) as Place[])).toHaveLength(1);
  });

  it('Thuis staat er, maar de oude sleutel wissen mislukt: de volgende start wist alleen, er komt geen tweede Thuis', async () => {
    const { meta, data, state } = fakeMeta({ [OLD_START_POINT_KEY]: OLD_POINT });
    state.failDelete = true;
    expect(await migrateStartPointToHome(DAY, meta)).toBe('failed');
    expect(data.get(OLD_START_POINT_KEY)).toEqual(OLD_POINT);
    const after = data.get(PLACES_KEY);
    state.failDelete = false;
    expect(await migrateStartPointToHome('2026-11-20', meta)).toBe('migrated');
    expect(data.get(PLACES_KEY)).toEqual(after);
    expect(data.has(OLD_START_POINT_KEY)).toBe(false);
  });

  it('is Thuis na het schrijven niet terug te lezen, dan blijft de oude sleutel staan', async () => {
    const { meta, data } = fakeMeta({ [OLD_START_POINT_KEY]: OLD_POINT });
    // Een opslag die het schrijven aanneemt maar niets bewaart.
    const deaf: PlacesMeta = { get: meta.get, write: async (_puts, deletes = []) => { for (const k of deletes) data.delete(k); } };
    expect(await migrateStartPointToHome(DAY, deaf)).toBe('failed');
    expect(data.get(OLD_START_POINT_KEY)).toEqual(OLD_POINT);
  });

  it('een opslag die niet antwoordt: mislukt, zonder fout en zonder schrijven', async () => {
    const { meta, state } = fakeMeta({ [OLD_START_POINT_KEY]: OLD_POINT });
    state.failGet = true;
    expect(await migrateStartPointToHome(DAY, meta)).toBe('failed');
    expect(state.writes).toBe(0);
  });

  it('zolang de migratie niet gelukt is, leest Startpunt van je lus het oude punt nog', async () => {
    await MetaRepo.set(OLD_START_POINT_KEY, OLD_POINT);
    expect(await getRouteStartPoint()).toEqual(OLD_POINT);
    // Een nieuw punt zetten maakt Thuis en ruimt de oude sleutel op; wissen haalt beide weg.
    expect(await saveRouteStartPoint({ lat: 52.2, lon: 5.7 })).toBe(true);
    expect(await MetaRepo.get(OLD_START_POINT_KEY)).toBeUndefined();
    expect(await getRouteStartPoint()).toEqual({ lat: 52.2, lon: 5.7 });
    await MetaRepo.set(OLD_START_POINT_KEY, OLD_POINT);
    expect(await clearRouteStartPoint()).toBe(true);
    expect(await MetaRepo.get(OLD_START_POINT_KEY)).toBeUndefined();
    expect(await loadPlaces()).toEqual([]);
  });

});

describe('de opslag van plekken en routes', () => {
  it('lezen gooit nooit: niets, iets kapots of een opslag die niet antwoordt geeft een lege lijst', async () => {
    expect(await loadPlaces()).toEqual([]);
    expect(await loadSavedRoutes()).toEqual([]);
    await MetaRepo.set(PLACES_KEY, 'kapot');
    await MetaRepo.set(SAVED_ROUTES_KEY, { niet: 'een lijst' });
    expect(await loadPlaces()).toEqual([]);
    expect(await loadSavedRoutes()).toEqual([]);
    const { meta, state } = fakeMeta({ [PLACES_KEY]: [hill] });
    state.failGet = true;
    expect(await loadPlaces(meta)).toEqual([]);
    expect(await readPlaceStore(meta)).toEqual({ ok: false, places: [], routes: [] });
  });

  it('kan de stand niet gelezen worden, dan wordt er niets geschreven', async () => {
    const { meta, data, state } = fakeMeta({ [PLACES_KEY]: [hill] });
    state.failGet = true;
    expect(await savePlace({ ...hill, id: 'place_2', name: 'Duinpad' }, meta)).toBe(false);
    expect(await setHomePoint(OLD_POINT, 'here', DAY, meta)).toBe(false);
    expect(await removePlace('place_hill', meta)).toBe(false);
    expect(state.writes).toBe(0);
    expect(data.get(PLACES_KEY)).toEqual([hill]);
  });

  it('bewaart een plek en een route, en een route alleen bij een plek die er is', async () => {
    expect(await saveRoute(loop)).toBe(false);
    expect(await savePlace(hill)).toBe(true);
    expect(await saveRoute(loop)).toBe(true);
    expect(await loadPlaces()).toEqual([hill]);
    expect(await loadSavedRoutes()).toEqual([loop]);
    expect(await savePlace({ ...hill, name: '' })).toBe(false);
    expect(await saveRoute({ ...loop, points: [loop.points[0]] })).toBe(false);
    expect(await removeRoute('route_1')).toBe(true);
    expect(await loadSavedRoutes()).toEqual([]);
  });

  it('een plek wissen wist zijn routes in dezelfde stap; mislukt het, dan staat alles er nog', async () => {
    const other = { ...loop, id: 'route_2', placeId: 'place_b' };
    const b: Place = { ...hill, id: 'place_b', name: 'Duinpad' };
    const { meta, data, state } = fakeMeta({ [PLACES_KEY]: [hill, b], [SAVED_ROUTES_KEY]: [loop, other] });
    state.failWrite = 1;
    expect(await removePlace('place_hill', meta)).toBe(false);
    expect(data.get(PLACES_KEY)).toEqual([hill, b]);
    expect(data.get(SAVED_ROUTES_KEY)).toEqual([loop, other]);
    expect(await removePlace('place_hill', meta)).toBe(true);
    expect(data.get(PLACES_KEY)).toEqual([b]);
    expect(data.get(SAVED_ROUTES_KEY)).toEqual([other]);
  });

  it('er is hoogstens één Thuis: een nieuwe Thuis maakt van de vorige een gewone plek', async () => {
    await setHomePoint(OLD_POINT, 'here', DAY);
    await savePlace({ ...hill, home: true });
    const places = await loadPlaces();
    expect(places.filter((p) => p.home).map((p) => p.id)).toEqual(['place_hill']);
    expect(places).toHaveLength(2);
  });

  it('een nieuw punt verhuist Thuis en laat naam, dag en routes staan', async () => {
    await setHomePoint(OLD_POINT, 'here', DAY);
    await savePlace({ ...homeOf(await loadPlaces())!, name: 'Voordeur' });
    await saveRoute({ ...loop, placeId: HOME_PLACE_ID });
    expect(await setHomePoint({ lat: 52.2, lon: 5.7 }, 'map', '2026-12-01')).toBe(true);
    expect(await loadPlaces()).toEqual([{ id: HOME_PLACE_ID, name: 'Voordeur', lat: 52.2, lon: 5.7, home: true, source: 'here', createdAt: DAY }]);
    expect(await loadSavedRoutes()).toHaveLength(1);
    // Wissen haalt Thuis en zijn routes weg, de andere plekken niet.
    await savePlace(hill);
    expect(await clearHome()).toBe(true);
    expect(await loadPlaces()).toEqual([hill]);
    expect(await loadSavedRoutes()).toEqual([]);
  });

  it('schrijft alleen zijn eigen sleutels: geen lus van vandaag, geen instelling, geen log', async () => {
    const { meta, state } = fakeMeta({ [OLD_START_POINT_KEY]: OLD_POINT });
    await migrateStartPointToHome(DAY, meta);
    await savePlace(hill, meta);
    await saveRoute(loop, meta);
    await setHomePoint({ lat: 52.2, lon: 5.7 }, 'map', DAY, meta);
    await removeRoute('route_1', meta);
    await removePlace('place_hill', meta);
    await clearHome(meta);
    expect([...state.keys].sort()).toEqual([PLACES_KEY, OLD_START_POINT_KEY, SAVED_ROUTES_KEY].sort());
  });

  it('een route is een lus als het eind binnen 150 m van het begin ligt', () => {
    expect(isLoopRoute(loop)).toBe(true);
    expect(isLoopRoute({ points: [{ lat: 51.9, lon: 5.9 }, { lat: 51.95, lon: 5.95 }] })).toBe(false);
    expect(isLoopRoute({ points: [] })).toBe(false);
  });
});

describe('opschonen bij het inlezen', () => {
  it('een kapotte plek valt weg zonder de rest', () => {
    const read = migratePlaces([
      hill,
      { ...hill, id: 'p2', lat: 123 },
      { ...hill, id: 'p3', name: '   ' },
      { ...hill, id: 'p4', createdAt: '2026-13-45' },
      hill,
      'geen plek',
      { ...hill, id: 'p5', name: 'x'.repeat(60), features: ['hill', 'zwembad', 'hill'], source: 'iets nieuws', home: true },
      { ...hill, id: 'p6', home: true, lat: 51.123456789 },
    ]);
    expect(read.skipped).toBe(5);
    expect(read.list?.map((p) => p.id)).toEqual(['place_hill', 'p5', 'p6']);
    expect(read.list?.[1]).toEqual({ id: 'p5', name: 'x'.repeat(40), lat: 51.9, lon: 5.9, features: ['hill'], home: true, source: 'import', createdAt: '2026-11-13' });
    // De tweede Thuis blijft een gewone plek; het punt staat op vijf decimalen.
    expect(read.list?.[2]).toEqual({ id: 'p6', name: 'Heuveltop', lat: 51.12346, lon: 5.9, features: ['hill', 'parking'], source: 'map', createdAt: '2026-11-13' });
  });

  it('een kapotte route valt weg zonder de rest', () => {
    const many = Array.from({ length: 801 }, (_, i) => ({ lat: 51.9 + i * 1e-5, lon: 5.9 }));
    const read = migrateSavedRoutes([
      loop,
      { ...loop, id: 'r2', points: [{ lat: 51.9, lon: 5.9 }, { lat: 'x', lon: 5.9 }] },
      { ...loop, id: 'r3', points: many },
      { ...loop, id: 'r4', distanceM: -1 },
      { ...loop, id: 'r5', placeId: '' },
      { ...loop, id: 'r6', ascentM: Number.NaN },
      loop,
      null,
      { ...loop, id: 'r7', style: 'vreemd', source: 'nieuw', points: [{ lat: 51.9, lon: 5.9, ele: 'hoog' }, { lat: 51.91, lon: 5.91, ele: 12.345 }], chosenFor: [{ date: 'gisteren', plannedSessionId: 'a' }, { date: '2026-11-14', plannedSessionId: 'b' }, { date: '2026-11-15', plannedSessionId: 'b' }] },
    ]);
    expect(read.skipped).toBe(7);
    expect(read.list?.map((r) => r.id)).toEqual(['route_1', 'r7']);
    expect(read.list?.[0]).toEqual(loop);
    expect(read.list?.[1]).toEqual({ id: 'r7', placeId: 'place_hill', name: 'Avontuurlijk 8,2 km', source: 'import', distanceM: 8200, ascentM: 240, points: [{ lat: 51.9, lon: 5.9 }, { lat: 51.91, lon: 5.91, ele: 12.3 }], createdAt: '2026-11-13', chosenFor: [{ date: '2026-11-14', plannedSessionId: 'b' }] });
  });

  it('niets is niets, iets anders dan een lijst telt als één overgeslagen', () => {
    expect(migratePlaces(undefined)).toEqual({ list: undefined, skipped: 0 });
    expect(migratePlaces(null)).toEqual({ list: undefined, skipped: 0 });
    expect(migratePlaces({ a: 1 })).toEqual({ list: undefined, skipped: 1 });
    expect(migrateSavedRoutes('x')).toEqual({ list: undefined, skipped: 1 });
    expect(migratePlaces([])).toEqual({ list: [], skipped: 0 });
  });
});

describe('export en import', () => {
  it('de versies bewegen niet: schema 2 en back-up 5', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(2);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(5);
  });

  it('plekken en routes gaan mee in de back-up en komen terug op een leeg toestel', async () => {
    await setHomePoint(OLD_POINT, 'fixed-point', DAY);
    await savePlace(hill);
    await saveRoute(loop);
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    expect(envelope.backupSchemaVersion).toBe(5);
    expect(envelope.payload.places).toHaveLength(2);
    expect(envelope.payload.savedRoutes).toEqual([loop]);
    await wipeAllData();
    const { backup } = await restore(envelope);
    expect(backup.skippedInvalid).toBe(0);
    expect((await loadPlaces()).map((p) => p.name)).toEqual(['Thuis', 'Heuveltop']);
    expect(await loadSavedRoutes()).toEqual([loop]);
    expect(await getRouteStartPoint()).toEqual(OLD_POINT);
  });

  it('zonder plekken staan de velden niet in de back-up', async () => {
    const payload = (await buildBackupEnvelope()).payload as unknown as Record<string, unknown>;
    expect('places' in payload).toBe(false);
    expect('savedRoutes' in payload).toBe(false);
  });

  it('een oude back-up zonder de velden leest gelijk en laat de plekken op het toestel staan', async () => {
    // Een back-up van voor Plekken: gemaakt op een toestel zonder plekken.
    const old = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    expect('places' in old.payload).toBe(false);
    const read = normalizeBackupToCurrentModel(old);
    expect('places' in read).toBe(false);
    expect('savedRoutes' in read).toBe(false);
    expect(read.skippedInvalid).toBe(0);
    // Hetzelfde bestand met lege waarden leest precies zo.
    expect(normalizeBackupToCurrentModel({ ...old, payload: { ...old.payload, places: null, savedRoutes: undefined } })).toEqual(read);

    await setHomePoint(OLD_POINT, 'here', DAY);
    await savePlace(hill);
    await saveRoute(loop);
    const before = { places: await loadPlaces(), routes: await loadSavedRoutes() };
    await restore(old);
    expect({ places: await loadPlaces(), routes: await loadSavedRoutes() }).toEqual(before);
    await restore(old, 'merge');
    expect({ places: await loadPlaces(), routes: await loadSavedRoutes() }).toEqual(before);
  });

  it('een oude platte export (schema 1 en 2) opent als voorheen, met en zonder plekken', () => {
    const v1: AscendExport = { schemaVersion: 1, exportDate: '2026-01-01T00:00:00.000Z', program: null, templates: [], plannedSessions: [], sessionLogs: [], objectives: [], milestoneProgress: [], settings: {} };
    expect(migrateExport(v1)).toEqual({ ...v1, schemaVersion: 2 });
    const read = normalizeBackupToCurrentModel(v1);
    expect(read.places).toBeUndefined();
    expect(read.savedRoutes).toBeUndefined();
    const withPlaces = normalizeBackupToCurrentModel({ ...v1, schemaVersion: 2, places: [hill], savedRoutes: [loop] });
    expect(withPlaces.places).toEqual([hill]);
    expect(withPlaces.savedRoutes).toEqual([loop]);
  });

  it('met de velden vervangt een terugzetting de lijst; samenvoegen laat het toestel met rust', async () => {
    await savePlace(hill);
    await saveRoute(loop);
    const file = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    await wipeAllData();
    const mine: Place = { id: 'place_mine', name: 'Duinpad', lat: 52.4, lon: 4.6, source: 'search', createdAt: DAY };
    await savePlace(mine);
    await saveRoute({ ...loop, id: 'route_mine', placeId: 'place_mine' });
    await restore(file, 'merge');
    expect((await loadPlaces()).map((p) => p.id)).toEqual(['place_mine']);
    await restore(file);
    expect(await loadPlaces()).toEqual([hill]);
    expect(await loadSavedRoutes()).toEqual([loop]);
  });

  it('een back-up met alleen plekken: de routes van een plek die verdwijnt gaan mee weg, de rest blijft', async () => {
    await savePlace(hill);
    const file = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    expect('savedRoutes' in file.payload).toBe(false);
    await saveRoute(loop);
    const mine: Place = { id: 'place_mine', name: 'Duinpad', lat: 52.4, lon: 4.6, source: 'search', createdAt: DAY };
    await savePlace(mine);
    await saveRoute({ ...loop, id: 'route_mine', placeId: 'place_mine' });
    await restore(file);
    expect(await loadPlaces()).toEqual([hill]);
    expect(await loadSavedRoutes()).toEqual([loop]);
  });

  it('een back-up met een kapotte plek en een kapotte route: die vallen weg, de rest komt binnen en het telt mee', async () => {
    await savePlace(hill);
    await saveRoute(loop);
    const file = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    const clean = normalizeBackupToCurrentModel(file);
    file.payload.places.push({ id: 'kapot', name: 'Zonder punt', createdAt: DAY });
    file.payload.savedRoutes.push({ ...loop, id: 'kapot', points: 'geen lijn' });
    // Een route van een plek die niet in het bestand staat hoort nergens bij.
    file.payload.savedRoutes.push({ ...loop, id: 'wees', placeId: 'place_weg' });
    await wipeAllData();
    const { backup, preview } = await restore(file);
    expect(backup.skippedInvalid).toBe(3);
    expect(preview.backupMeta.skippedInvalid).toBe(3);
    expect(await loadPlaces()).toEqual([hill]);
    expect(await loadSavedRoutes()).toEqual([loop]);
    // De rest van de back-up leest precies als zonder de kapotte rijen.
    expect({ ...backup, skippedInvalid: 0 }).toEqual({ ...clean, skippedInvalid: 0 });
  });

  it('een veld dat geen lijst is telt als overgeslagen en laat het toestel met rust', async () => {
    await savePlace(hill);
    const file = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    file.payload.places = 'kapot';
    file.payload.savedRoutes = 7;
    const { backup } = await restore(file);
    expect(backup.skippedInvalid).toBe(2);
    expect(await loadPlaces()).toEqual([hill]);
  });

  it('een terugzetting met een Thuis erin, terwijl het oude punt nog niet verhuisd is: Thuis uit het bestand wint en er komt geen tweede', async () => {
    await setHomePoint({ lat: 51.5, lon: 5.5 }, 'map', DAY);
    const file = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    await wipeAllData();
    await MetaRepo.set(OLD_START_POINT_KEY, OLD_POINT);
    await restore(file);
    // Een terugzetting laat de opstartstappen opnieuw lopen.
    await runBootMigrations({ build: 'v1' });
    expect((await loadPlaces()).filter((p) => p.home)).toHaveLength(1);
    expect(await getRouteStartPoint()).toEqual({ lat: 51.5, lon: 5.5 });
    expect(await MetaRepo.get(OLD_START_POINT_KEY)).toBeUndefined();
  });

  it('een lijst waarvan niets te lezen is maakt het toestel niet leeg', async () => {
    await setHomePoint(OLD_POINT, 'here', DAY);
    await savePlace(hill);
    await saveRoute(loop);
    const before = { places: await loadPlaces(), routes: await loadSavedRoutes() };
    const file = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    file.payload.places = [{ id: 'kapot' }, 'niets'];
    file.payload.savedRoutes = [{ id: 'kapot' }];
    const { backup } = await restore(file);
    expect(backup.skippedInvalid).toBe(3);
    expect('places' in backup).toBe(false);
    expect('savedRoutes' in backup).toBe(false);
    expect({ places: await loadPlaces(), routes: await loadSavedRoutes() }).toEqual(before);
    expect(await getRouteStartPoint()).toEqual(OLD_POINT);
  });

  it('een bestand met alleen routes: een route van een plek die niet op het toestel staat komt niet binnen', async () => {
    await savePlace(hill);
    const file = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    file.payload.savedRoutes = [loop, { ...loop, id: 'wees', placeId: 'place_weg' }];
    delete file.payload.places;
    await restore(file);
    expect(await loadPlaces()).toEqual([hill]);
    expect(await loadSavedRoutes()).toEqual([loop]);
  });

  it('Ongedaan maken na een import: de kopie van daarvoor haalt de plekken weer weg die de import bracht', async () => {
    await savePlace(hill);
    await saveRoute(loop);
    const file = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    await wipeAllData();
    // Het toestel heeft geen plekken; een gewone back-up laat de velden dan weg, de kopie niet.
    await restore(file);
    expect(await loadPlaces()).toEqual([hill]);
    const copy = (await listSnapshots())[0];
    expect((copy.envelope.payload as { places?: unknown }).places).toEqual([]);
    await restoreSnapshot(copy.id);
    expect(await loadPlaces()).toEqual([]);
    expect(await loadSavedRoutes()).toEqual([]);
    // En andersom: de kopie van een toestel met plekken zet ze terug.
    await restoreSnapshot((await listSnapshots())[0].id);
    expect(await loadPlaces()).toEqual([hill]);
    expect(await loadSavedRoutes()).toEqual([loop]);
  });

  it('een kopie van voor Plekken (zonder de velden) laat de plekken staan', async () => {
    await createPreImportSnapshot();
    const old = (await listSnapshots())[0];
    const envelope = JSON.parse(JSON.stringify(old.envelope));
    delete envelope.payload.places;
    delete envelope.payload.savedRoutes;
    await savePlace(hill);
    await restore(envelope);
    expect(await loadPlaces()).toEqual([hill]);
  });
});

describe('Je plekken: Thuis wissen via removePlace', () => {
  it('wist ook de oude sleutel van Vast punt, zodat het punt niet terugkomt', async () => {
    const home: Place = { id: HOME_PLACE_ID, name: 'Thuis', lat: 52.1, lon: 5.1, home: true, source: 'map', createdAt: DAY };
    const { meta, data } = fakeMeta({ [PLACES_KEY]: [home, hill], [OLD_START_POINT_KEY]: OLD_POINT });
    expect(await removePlace(HOME_PLACE_ID, meta)).toBe(true);
    expect(data.has(OLD_START_POINT_KEY)).toBe(false);
    expect((await loadPlaces(meta)).map((p) => p.id)).toEqual(['place_hill']);
  });
  it('een gewone plek wissen laat de oude sleutel staan', async () => {
    const { meta, data } = fakeMeta({ [PLACES_KEY]: [hill], [OLD_START_POINT_KEY]: OLD_POINT });
    expect(await removePlace('place_hill', meta)).toBe(true);
    expect(data.has(OLD_START_POINT_KEY)).toBe(true);
  });
});

// Opslag van Plekken en bewaarde routes (docs/visie/Ontwerp Plekken en routes.md, spoor 1;
// docs/beslissingen/2026-11-11-plekken-opslag.md): twee sleutels in de meta-opslag, `places` en `savedRoutes`.
//
// Lezen gooit nooit: een opslag die niet antwoordt of iets kapots bevat geeft een lege lijst, en
// `readPlaceStore` zegt erbij of het lezen lukte. Elke schrijfactie leest wat er nu staat en schrijft
// alles wat verandert in één transactie: een fout halverwege laat de oude stand staan. De schrijfacties
// lopen achter elkaar (een keten op moduleniveau), zodat een tweede nooit een oudere stand terugschrijft.
// Kan de stand niet gelezen worden, dan wordt er niets geschreven: een mislukte leesactie telt nooit als
// "geen plekken".
//
// Niets hier raakt de planning, een log of een geplande training.

import { getDB } from './database';
import { migratePlaces, readPlace, readPlaceList, readSavedRoute, readSavedRouteList, routesOfPlaces } from './migrationsPlaces';
import { homeFromStartPoint, homeOf, withHomePoint } from '../engine/places';
import { validStartPoint } from '../engine/routeStart';
import type { Place, PlaceSource, SavedRoute } from '../models/place';
import type { RoutePoint } from '../models/route';
import { todayISO } from '../utils/dates';

export const PLACES_KEY = 'places';
export const SAVED_ROUTES_KEY = 'savedRoutes';
// De oude sleutel van Vast punt. Hij verdwijnt bij de migratie naar Thuis; `backupClean` blijft hem uit
// oude instellingen halen.
export const OLD_START_POINT_KEY = 'routeStartPoint';

// Wat de opslag nodig heeft; de tests geven er een eigen in om een fout halverwege na te spelen.
export interface PlacesMeta {
  get: (key: string) => Promise<unknown>;
  // Alles of niets: zetten en wissen in één transactie.
  write: (puts: Record<string, unknown>, deletes?: readonly string[]) => Promise<void>;
}

const metaRepo: PlacesMeta = {
  get: async (key) => (await getDB()).get('meta', key),
  write: async (puts, deletes = []) => {
    const db = await getDB();
    const tx = db.transaction('meta', 'readwrite');
    await Promise.all([
      ...Object.entries(puts).map(([key, value]) => tx.store.put(value, key)),
      ...deletes.map((key) => tx.store.delete(key)),
      tx.done,
    ]);
  },
};

// De keten: elke schrijfactie wacht tot de vorige klaar is, ook als die mislukte.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(work: () => Promise<T>): Promise<T> {
  const run = queue.then(work, work);
  queue = run.catch(() => undefined);
  return run;
}

interface Store {
  places: Place[];
  routes: SavedRoute[];
}

// Gooit als de opslag niet antwoordt; alleen de schrijfacties en `readPlaceStore` gebruiken dit.
async function readStore(meta: PlacesMeta): Promise<Store> {
  const [places, routes] = await Promise.all([meta.get(PLACES_KEY), meta.get(SAVED_ROUTES_KEY)]);
  const list = readPlaceList(places);
  return { places: list, routes: routesOfPlaces(readSavedRouteList(routes), list) };
}

export type PlaceStoreRead = ({ ok: true } & Store) | { ok: false; places: []; routes: [] };

// Voor een scherm dat het verschil wil zien tussen "nog geen plekken" en "kon niet lezen".
export async function readPlaceStore(meta: PlacesMeta = metaRepo): Promise<PlaceStoreRead> {
  try {
    return { ok: true, ...(await readStore(meta)) };
  } catch {
    return { ok: false, places: [], routes: [] };
  }
}

export async function loadPlaces(meta: PlacesMeta = metaRepo): Promise<Place[]> {
  return (await readPlaceStore(meta)).places;
}

export async function loadSavedRoutes(meta: PlacesMeta = metaRepo): Promise<SavedRoute[]> {
  return (await readPlaceStore(meta)).routes;
}

// Een schrijfactie: lees, bereken, schrijf. `change` geeft undefined als er niets te doen is of de invoer
// niet klopt. De uitkomst is of de stand nu is zoals gevraagd.
function update(meta: PlacesMeta, change: (store: Store) => { puts: Record<string, unknown>; deletes?: string[] } | 'same' | undefined): Promise<boolean> {
  return serial(async () => {
    try {
      const next = change(await readStore(meta));
      if (next === undefined) return false;
      if (next === 'same') return true;
      await meta.write(next.puts, next.deletes);
      return true;
    } catch {
      return false;
    }
  });
}

// Een plek erbij of bijgewerkt (zelfde id). Wordt hij Thuis, dan is de vorige Thuis een gewone plek.
export function savePlace(place: Place, meta: PlacesMeta = metaRepo): Promise<boolean> {
  const valid = readPlace(place);
  if (!valid) return Promise.resolve(false);
  return update(meta, ({ places }) => {
    const others = places.filter((p) => p.id !== valid.id);
    const list = migratePlaces(valid.home ? [valid, ...others] : [...others, valid]).list ?? [];
    return { puts: { [PLACES_KEY]: list } };
  });
}

// Een plek wissen wist zijn routes, in dezelfde transactie. Logs veranderen nooit. De vraag met het
// aantal routes hoort bij het scherm dat dit aanroept.
export function removePlace(id: string, meta: PlacesMeta = metaRepo): Promise<boolean> {
  return update(meta, ({ places, routes }) => {
    if (!places.some((p) => p.id === id)) return 'same';
    return { puts: { [PLACES_KEY]: places.filter((p) => p.id !== id), [SAVED_ROUTES_KEY]: routes.filter((r) => r.placeId !== id) } };
  });
}

// Een route erbij of bijgewerkt (zelfde id). Zonder zijn plek wordt hij niet bewaard.
export function saveRoute(route: SavedRoute, meta: PlacesMeta = metaRepo): Promise<boolean> {
  const valid = readSavedRoute(route);
  if (!valid) return Promise.resolve(false);
  return update(meta, ({ places, routes }) => {
    if (!places.some((p) => p.id === valid.placeId)) return undefined;
    return { puts: { [SAVED_ROUTES_KEY]: [...routes.filter((r) => r.id !== valid.id), valid] } };
  });
}

export function removeRoute(id: string, meta: PlacesMeta = metaRepo): Promise<boolean> {
  return update(meta, ({ routes }) => {
    if (!routes.some((r) => r.id === id)) return 'same';
    return { puts: { [SAVED_ROUTES_KEY]: routes.filter((r) => r.id !== id) } };
  });
}

// --- Thuis, voor Startpunt van je lus (storage/routeStart.ts) -----------------------------------------

// Thuis op dit punt: de bestaande Thuis verhuist (naam en routes blijven), anders komt hij erbij. De oude
// sleutel van Vast punt gaat in dezelfde transactie weg, zodat er nooit twee punten naast elkaar staan.
export function setHomePoint(point: RoutePoint, source: PlaceSource, today: string = todayISO(), meta: PlacesMeta = metaRepo): Promise<boolean> {
  return update(meta, ({ places }) => {
    const list = withHomePoint(places, point, today, source);
    return list ? { puts: { [PLACES_KEY]: list }, deletes: [OLD_START_POINT_KEY] } : undefined;
  });
}

// Thuis weg, met zijn routes en met de oude sleutel van Vast punt, in één transactie.
export function clearHome(meta: PlacesMeta = metaRepo): Promise<boolean> {
  return update(meta, ({ places, routes }) => {
    const home = homeOf(places);
    if (!home) return { puts: {}, deletes: [OLD_START_POINT_KEY] };
    return {
      puts: { [PLACES_KEY]: places.filter((p) => p.id !== home.id), [SAVED_ROUTES_KEY]: routes.filter((r) => r.placeId !== home.id) },
      deletes: [OLD_START_POINT_KEY],
    };
  });
}

// --- De migratie: Vast punt wordt Thuis ---------------------------------------------------------------

// 'none': er was niets te doen (geen oude sleutel). 'migrated': het oude punt is nu Thuis, of Thuis was er
// al, en de oude sleutel is weg. 'failed': er is niets veranderd of de oude sleutel staat er nog; de
// volgende start probeert het opnieuw.
export type HomeMigration = 'none' | 'migrated' | 'failed';

// Eén keer bij de start (state/boot.ts). Staat er een `routeStartPoint` en nog geen Thuis, dan wordt hij
// de plek Thuis. Pas als Thuis terug te lezen is, gaat de oude sleutel weg. Mislukt het schrijven, dan
// blijft alles staan. Een tweede keer doet niets: de oude sleutel is er dan niet meer. Gooit nooit.
export function migrateStartPointToHome(today: string = todayISO(), meta: PlacesMeta = metaRepo): Promise<HomeMigration> {
  return serial(async () => {
    try {
      const old = await meta.get(OLD_START_POINT_KEY);
      if (old === undefined) return 'none';
      const { places } = await readStore(meta);
      const home = homeFromStartPoint(old, today);
      // Een kapotte oude waarde was al geen punt (validStartPoint): er is niets om te verhuizen.
      if (home && !homeOf(places)) {
        await meta.write({ [PLACES_KEY]: [home, ...places.filter((p) => p.id !== home.id)] });
        const back = homeOf((await readStore(meta)).places);
        const point = validStartPoint(back);
        if (!point || point.lat !== home.lat || point.lon !== home.lon) return 'failed';
      }
      await meta.write({}, [OLD_START_POINT_KEY]);
      return 'migrated';
    } catch {
      return 'failed';
    }
  });
}

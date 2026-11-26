// Opslag van de route per geplande training (models/sessionRoute.ts, I-160): één sleutel in de meta-opslag,
// `sessionRoutes`, een lijst gekoppeld aan PlannedSession.id.
//
// Lezen gooit nooit: een opslag die niet antwoordt of iets kapots bevat geeft een lege lijst. Elke schrijfactie
// leest wat er nu staat en schrijft de hele lijst in één transactie: een fout halverwege laat de oude stand staan
// (alles of niets). De schrijfacties lopen achter elkaar, zodat een tweede nooit een oudere stand terugschrijft.
// Kan de stand niet gelezen worden, dan wordt er niets geschreven.
//
// Bij elke schrijfactie gaan de routes van trainingen die er niet meer zijn mee weg (engine/sessionRoute.ts
// #routesOfSessions): wat de planning weghaalde, neemt zijn route mee. Niets hier raakt de planning of een log.

import { getDB, PlannedSessionsRepo } from './database';
import { afterWipe } from './databaseBackupWrites';
import { readSessionRoute, readSessionRouteList } from './migrationsSessionRoutes';
import { routesOfSessions, withoutSessionRoute, withSessionRoute } from '../engine/sessionRoute';
import type { PlannedSession } from '../models/training';
import type { SessionRoute } from '../models/sessionRoute';

export const SESSION_ROUTES_KEY = 'sessionRoutes';

// Wat de opslag nodig heeft; de tests geven er een eigen in om een fout halverwege na te spelen.
export interface SessionRoutesStore {
  get: () => Promise<unknown>;
  // Alles of niets: de hele lijst in één transactie.
  put: (routes: SessionRoute[]) => Promise<void>;
  // De geplande trainingen van nu, om op te ruimen; undefined of een fout: niet opruimen.
  sessions: () => Promise<readonly Pick<PlannedSession, 'id'>[] | undefined>;
}

const deviceStore: SessionRoutesStore = {
  get: async () => (await getDB()).get('meta', SESSION_ROUTES_KEY),
  put: async (routes) => {
    const db = await getDB();
    const tx = db.transaction('meta', 'readwrite');
    await Promise.all([tx.store.put(routes, SESSION_ROUTES_KEY), tx.done]);
  },
  sessions: () => PlannedSessionsRepo.getAll(),
};

// Het laatst gelezen of bewaarde, zodat Week, Vandaag en de Briefing dezelfde stand tonen; luisteraars horen elke
// verandering.
let cache: SessionRoute[] | undefined;
const listeners = new Set<() => void>();
function notify(): void {
  for (const l of listeners) l();
}

export function subscribeSessionRoutes(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function peekSessionRoutes(): SessionRoute[] | undefined {
  return cache;
}

// Na een import of het wissen van alles: de volgende lezing komt weer uit de opslag.
export function forgetSessionRoutesCache(): void {
  cache = undefined;
  notify();
}

afterWipe(() => forgetSessionRoutesCache());

let queue: Promise<unknown> = Promise.resolve();
function serial<T>(work: () => Promise<T>): Promise<T> {
  const run = queue.then(work, work);
  queue = run.catch(() => undefined);
  return run;
}

export async function loadSessionRoutes(store: SessionRoutesStore = deviceStore): Promise<SessionRoute[]> {
  try {
    const list = readSessionRouteList(await store.get());
    if (store === deviceStore) { cache = list; notify(); }
    return list;
  } catch {
    return cache ?? [];
  }
}

async function update(store: SessionRoutesStore, change: (routes: SessionRoute[]) => SessionRoute[]): Promise<boolean> {
  return serial(async () => {
    try {
      const now = readSessionRouteList(await store.get());
      let sessions: readonly Pick<PlannedSession, 'id'>[] | undefined;
      try {
        sessions = await store.sessions();
      } catch {
        sessions = undefined;
      }
      const changed = change(now);
      const next = sessions ? routesOfSessions(changed, sessions) : changed;
      await store.put(next);
      if (store === deviceStore) { cache = next; notify(); }
      return true;
    } catch {
      return false;
    }
  });
}

// Deze route bij deze training: een oude van dezelfde training gaat eruit. Een kapotte route wordt niet bewaard.
export function saveSessionRoute(session: Pick<PlannedSession, 'id' | 'catchUp'>, route: SessionRoute, store: SessionRoutesStore = deviceStore): Promise<boolean> {
  const valid = readSessionRoute({ ...route, plannedSessionId: session.id });
  if (!valid) return Promise.resolve(false);
  return update(store, (routes) => withSessionRoute(routes, session, valid));
}

export function removeSessionRoute(session: Pick<PlannedSession, 'id' | 'catchUp'>, store: SessionRoutesStore = deviceStore): Promise<boolean> {
  return update(store, (routes) => withoutSessionRoute(routes, session));
}

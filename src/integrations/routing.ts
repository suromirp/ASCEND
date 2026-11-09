// ASCEND: de routeplanner achter één vorm (models/route.ts#RouteFn). Twee openbare bronnen zonder
// sleutel en zonder account: BRouter eerst (integrations/brouter.ts, met hoogte in het antwoord), en
// als die niet antwoordt Valhalla van FOSSGIS (integrations/valhalla.ts). Een bron gooit nooit: elke
// uitkomst is een lijn of een reden. Alleen punten gaan de deur uit, nooit een naam.

import type { RouteAnswer, RouteFailure, RouteFn } from '../models/route';

export const ROUTE_TIMEOUT_MS = 12_000;

export const isOffline = (): boolean => typeof navigator !== 'undefined' && navigator.onLine === false;

export interface HttpAnswer {
  status: number;
  text: string;
}

// Een aanvraag met een grens in tijd die ook geldt tot de hele tekst binnen is.
export async function requestText(url: string, timeoutMs: number, doFetch: typeof fetch, init: RequestInit = {}): Promise<HttpAnswer | RouteFailure> {
  if (isOffline()) return 'offline';
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const response = await doFetch(url, { ...init, signal: controller.signal });
    return { status: response.status, text: await response.text() };
  } catch {
    if (timedOut) return 'timeout';
    return isOffline() ? 'offline' : 'error';
  } finally {
    clearTimeout(timer);
  }
}

export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

// De bronnen op volgorde. Antwoordt een bron niet (fout of tijdgrens), dan gaat dezelfde vraag naar
// de volgende, en latere vragen slaan de stille bron over. Zonder netwerk en bij een punt zonder pad
// (dezelfde kaart bij elke bron) wordt er niet verder gevraagd.
// De vragen gaan een voor een de deur uit, met minstens een seconde ertussen: de diensten zijn van
// vrijwilligers en vragen hoogstens één aanroep per seconde.
export const ROUTE_GAP_MS = 1_000;

export function routeWithFallback(sources: RouteFn[], gapMs = ROUTE_GAP_MS): RouteFn {
  let from = 0;
  let queue: Promise<unknown> = Promise.resolve();
  let lastStart = 0;
  const ask = async (waypoints: Parameters<RouteFn>[0]): Promise<RouteAnswer> => {
    let last: RouteAnswer = { ok: false, reason: 'error' };
    for (let i = from; i < sources.length; i++) {
      const wait = lastStart + gapMs - Date.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      lastStart = Date.now();
      last = await sources[i](waypoints);
      if (last.ok || last.reason === 'offline' || last.reason === 'unmapped') return last;
      if (i + 1 < sources.length) from = i + 1;
    }
    return last;
  };
  return (waypoints) => {
    const next = queue.then(() => ask(waypoints));
    queue = next.catch(() => undefined);
    return next;
  };
}

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

// Een poort: wat erdoor gaat, gaat een voor een, met `gapMs` tussen twee starts. `skip`: is dat waar
// als de beurt komt, dan gaat de vraag niet meer de deur uit.
export type Gate = <T>(job: () => Promise<T>, skip?: () => T | undefined) => Promise<T>;

export function createGate(gapMs = ROUTE_GAP_MS): Gate {
  let queue: Promise<unknown> = Promise.resolve();
  let lastStart = 0;
  return (job, skip) => {
    const next = queue.then(async () => {
      const skipped = skip?.();
      if (skipped !== undefined) return skipped;
      const wait = lastStart + gapMs - Date.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      lastStart = Date.now();
      return job();
    });
    queue = next.catch(() => undefined);
    return next;
  };
}

// Eén poort voor de hele app: ook twee zoektochten na elkaar vragen nooit tegelijk.
export const routeGate: Gate = createGate();

// `stopped`: na de tijdgrens of na sluiten gaat er geen aanroep meer de deur uit.
export function routeWithFallback(sources: RouteFn[], gate: Gate = routeGate, stopped: () => boolean = () => false): RouteFn {
  let from = 0;
  const halted = (): RouteAnswer | undefined => (stopped() ? { ok: false, reason: 'timeout' } : undefined);
  return async (waypoints) => {
    let last: RouteAnswer = { ok: false, reason: 'error' };
    for (let i = from; i < sources.length; i++) {
      last = await gate(() => sources[i](waypoints), halted);
      if (last.ok || last.reason === 'offline' || last.reason === 'unmapped' || stopped()) return last;
      if (i + 1 < sources.length) from = i + 1;
    }
    return last;
  };
}

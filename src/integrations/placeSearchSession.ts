// ASCEND: zoeken op plaatsnaam voor het blad Nieuwe plek (Andere plek bij Start bij). Eerst de
// bestaande zoekdienst (openMeteo.ts#searchPlaces); vindt die niets, dan Photon (photon.ts), binnen
// dezelfde grens in tijd (besluit 2026-11-12-andere-plek-photon.md). Na een pauze in het typen gaat er één
// vraag uit, met een grens in tijd en een zichtbare uitkomst: treffers, geen treffers, offline, te
// traag of een fout. Een nieuw woord of sluiten stopt de vraag die liep; na sluiten gaat er niets meer
// de deur uit. Zonder React, zodat de tests de klok zelf zetten. De regels staan in engine/placeSearch.ts.

import { OpenMeteoError, openMeteoErrorMessage, searchPlaces } from './openMeteo';
import { searchPhoton } from './photon';
import { PLACE_SEARCH_LIMIT_MS, PLACE_SEARCH_MAX, PLACE_SEARCH_PAUSE_MS, mergeFound, placeQuery, searchTerm, type FoundPlace, type PlaceSearchView } from '../engine/placeSearch';

export interface PlaceSearchDeps {
  search?: (query: string, signal: AbortSignal) => Promise<FoundPlace[]>;
  online?: () => boolean;
  pauseMs?: number;
  limitMs?: number;
}

export interface PlaceSearchSession {
  // Elke toetsaanslag; zoekt pas na de pauze.
  type: (raw: string) => void;
  // Zoek op de knop van het toetsenbord: meteen, zonder pauze.
  submit: () => void;
  // Het blad sluit: geen aanroep meer.
  close: () => void;
}

type Source = (term: string, signal: AbortSignal) => Promise<FoundPlace[]>;

// Twee bronnen na elkaar. De eerste beslist: treffers of een fout van de eerste zijn de uitkomst. Alleen
// als hij niets vindt gaat het woord naar de tweede; faalt die of is er intussen gestopt, dan blijft het
// bij niets gevonden. Er gaat nooit een aanroep uit na het stoppen.
export async function searchInTurn(term: string, signal: AbortSignal, first: Source, second: Source): Promise<FoundPlace[]> {
  const found = await first(term, signal);
  if (found.length > 0 || signal.aborted) return found;
  try {
    return mergeFound([], await second(term, signal));
  } catch {
    return found;
  }
}

const defaultSearch: Source = (term, signal) =>
  searchInTurn(term, signal, (t, s) => searchPlaces(t, { signal: s }), (t, s) => searchPhoton(t, { signal: s }));
const defaultOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;

export function createPlaceSearch(onView: (view: PlaceSearchView) => void, deps: PlaceSearchDeps = {}): PlaceSearchSession {
  const search = deps.search ?? defaultSearch;
  const online = deps.online ?? defaultOnline;
  const pauseMs = deps.pauseMs ?? PLACE_SEARCH_PAUSE_MS;
  const limitMs = deps.limitMs ?? PLACE_SEARCH_LIMIT_MS;
  let closed = false;
  let text = '';
  let pause: ReturnType<typeof setTimeout> | undefined;
  let running: { stop: AbortController; limit: ReturnType<typeof setTimeout> } | undefined;

  const show = (view: PlaceSearchView) => {
    if (!closed) onView(view);
  };

  function stopRunning() {
    if (pause !== undefined) clearTimeout(pause);
    pause = undefined;
    if (running) {
      clearTimeout(running.limit);
      running.stop.abort();
      running = undefined;
    }
  }

  function run() {
    pause = undefined;
    if (closed) return;
    const query = text.trim();
    if (placeQuery(query) !== 'ok') return;
    if (!online()) {
      show({ kind: 'offline' });
      return;
    }
    const stop = new AbortController();
    const limit = setTimeout(() => {
      stop.abort();
      if (running?.stop === stop) running = undefined;
      show({ kind: 'timeout' });
    }, limitMs);
    running = { stop, limit };
    show({ kind: 'busy', query });
    search(searchTerm(query), stop.signal).then(
      (found) => {
        if (stop.signal.aborted) return;
        clearTimeout(limit);
        running = undefined;
        show(found.length === 0 ? { kind: 'none', query } : { kind: 'results', query, results: found.slice(0, PLACE_SEARCH_MAX) });
      },
      (err: unknown) => {
        if (stop.signal.aborted) return;
        clearTimeout(limit);
        running = undefined;
        if (err instanceof OpenMeteoError && err.kind === 'network') show({ kind: 'offline' });
        else show({ kind: 'error', message: openMeteoErrorMessage(err) });
      },
    );
  }

  return {
    type(raw) {
      if (closed) return;
      text = raw;
      stopRunning();
      const q = placeQuery(raw);
      if (q === 'empty') return show({ kind: 'idle' });
      if (q === 'short') return show({ kind: 'short' });
      pause = setTimeout(run, pauseMs);
    },
    submit() {
      if (closed) return;
      stopRunning();
      run();
    },
    close() {
      closed = true;
      stopRunning();
    },
  };
}

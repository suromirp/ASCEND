// ASCEND: de laadstand van de feiten van Instellingen, zonder React zodat hij te testen is.
// Per bron een teller: een antwoord van een oudere vraag wordt genegeerd, ook als het laat komt.
// Een bron die de eerste keer te lang duurt of faalt staat in `unknown` (de rij zegt "Onbekend");
// had hij al eens een waarde, dan blijft die staan en wordt hij nooit overschreven.

import { loadParts, type Part } from '../../utils/loadParts';
import type { SettingsSource } from '../../engine/settingsPending';

export interface LoaderState<T> {
  loaded: T;
  // Nog niet binnen, voor de eerste keer.
  pending: readonly SettingsSource[];
  // De eerste keer mislukt of te traag: geen waarde bekend.
  unknown: readonly SettingsSource[];
}

export interface FactsLoader {
  load(only?: readonly SettingsSource[]): Promise<void>;
  dispose(): void;
}

export function createFactsLoader<T>(
  makeParts: () => Part<SettingsSource, T>[],
  initial: T,
  all: readonly SettingsSource[],
  onState: (state: LoaderState<T>) => void,
): FactsLoader {
  let alive = true;
  let state: LoaderState<T> = { loaded: initial, pending: all, unknown: [] };
  const known = new Set<SettingsSource>();
  const generation: Partial<Record<SettingsSource, number>> = {};
  const emit = (next: LoaderState<T>) => {
    state = next;
    onState(next);
  };
  return {
    load(only) {
      const parts = makeParts().filter((p) => !only || only.includes(p.key));
      const mine: Partial<Record<SettingsSource, number>> = {};
      for (const p of parts) mine[p.key] = generation[p.key] = (generation[p.key] ?? 0) + 1;
      return loadParts(parts, (key, patch, ok) => {
        if (!alive || generation[key] !== mine[key]) return;
        const pending = state.pending.filter((k) => k !== key);
        if (ok) {
          known.add(key);
          emit({ loaded: { ...state.loaded, ...patch }, pending, unknown: state.unknown.filter((k) => k !== key) });
        } else {
          emit({ ...state, pending, unknown: known.has(key) || state.unknown.includes(key) ? state.unknown : [...state.unknown, key] });
        }
      });
    },
    dispose() {
      alive = false;
    },
  };
}

// Een wijziging in de opslag vraagt alleen de bronnen die erbij horen.
export interface SourceLink {
  subscribe: (listener: () => void) => () => void;
  sources: readonly SettingsSource[];
}

export function startFactsLoading<T>(
  makeParts: () => Part<SettingsSource, T>[],
  initial: T,
  all: readonly SettingsSource[],
  links: readonly SourceLink[],
  onState: (state: LoaderState<T>) => void,
): { reload: () => void; stop: () => void } {
  const loader = createFactsLoader(makeParts, initial, all, onState);
  void loader.load();
  const offs = links.map((l) => l.subscribe(() => void loader.load(l.sources)));
  return {
    reload: () => void loader.load(),
    stop: () => {
      loader.dispose();
      offs.forEach((off) => off());
    },
  };
}

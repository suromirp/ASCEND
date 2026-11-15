// ASCEND: de plek van Start bij per geplande training, op dit toestel (engine/startPlaceChoice.ts,
// besluit docs/beslissingen/2026-11-15-avond-ervoor-kent-de-plek.md).
//
// Eén meta-sleutel, net als Waar train je? (storage/trainingPlace.ts): bewust niet in de export en niet
// in een back-up. Het is een keuze voor één training die binnen dagen voorbij is; wat er echt gebeurde
// staat in het log. Daarom ook geen migratie. Lezen en schrijven gooien nooit: zonder opslag is er geen
// onthouden plek en begint de lus zoals vroeger. Luisteraars horen elke verandering, zodat De avond
// ervoor een keuze in de Briefing meteen volgt. Schrijven gebeurt een voor een (`chain`).

import { MetaRepo } from './database';
import { cleanChoices, withChoice, type StartPlaceChoice, type StartPlaceChoices } from '../engine/startPlaceChoice';
import { todayISO } from '../utils/dates';

export const START_PLACE_CHOICE_KEY = 'startPlaceChoices';

let cache: StartPlaceChoices | undefined;
const listeners = new Set<() => void>();
let chain: Promise<unknown> = Promise.resolve();

function notify(): void {
  for (const l of listeners) l();
}

export async function readStartPlaceChoices(): Promise<StartPlaceChoices> {
  try {
    cache = cleanChoices(await MetaRepo.get<unknown>(START_PLACE_CHOICE_KEY));
    return cache;
  } catch {
    return cache ?? {};
  }
}

// Wat er het laatst gelezen of bewaard is, zonder te wachten.
export function peekStartPlaceChoices(): StartPlaceChoices | undefined {
  return cache;
}

export function subscribeStartPlaceChoices(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Zet (of met `undefined` wist) de plek van één geplande training. Geeft terug of het lukte.
export function saveStartPlaceChoice(sessionId: string, choice: StartPlaceChoice | undefined, today: string = todayISO()): Promise<boolean> {
  const run = chain.then(async () => {
    try {
      const stored = cleanChoices(await MetaRepo.get<unknown>(START_PLACE_CHOICE_KEY));
      if (!choice && !stored[sessionId]) {
        cache = stored;
        return true;
      }
      const next = withChoice(stored, sessionId, choice, today);
      await MetaRepo.set(START_PLACE_CHOICE_KEY, next);
      cache = next;
      notify();
      return true;
    } catch {
      return false;
    }
  });
  chain = run;
  return run;
}

// Voor tests.
export function resetStartPlaceChoiceCache(): void {
  cache = undefined;
}

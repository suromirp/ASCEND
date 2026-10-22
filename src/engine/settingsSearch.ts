// ASCEND: zoeken in de instellingen. Puur: een zoekopdracht en de index
// (data/settingsIndex.ts) gaan erin, resultaten op relevantie komen eruit.
//
// Hoofdletters en accenten maken niet uit. Elk woord van de zoekopdracht moet
// ergens passen (titel, trefwoorden, uitleg of groep); hoe beter en hoe eerder
// in de titel, hoe hoger het resultaat. Gelijke scores houden de volgorde van
// de index, zodat de uitkomst voorspelbaar is.

import type { SettingsGroupId } from '../data/settingsIndex';
import { settingsPageTitle } from '../data/settingsLayout';

export interface SearchableSetting {
  id: string;
  title: string;
  note: string;
  group: SettingsGroupId;
  keywords: string[];
}

export interface SettingsSearchResult<T extends SearchableSetting = SearchableSetting> {
  item: T;
  score: number;
}

export function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

// Woorden zonder leestekens aan de randen: "horloge." vindt hetzelfde als
// "horloge", en "intervals.icu" blijft heel.
const words = (text: string): string[] =>
  normalizeSearch(text)
    .split(/[^a-z0-9.]+/)
    .map((w) => w.replace(/^\.+|\.+$/g, ''))
    .filter(Boolean);

// Wat één woord van de zoekopdracht oplevert bij één instelling; 0 = past niet.
function tokenScore(token: string, item: SearchableSetting): number {
  const titleWords = words(item.title);
  const title = normalizeSearch(item.title);
  let best = 0;
  if (titleWords.includes(token)) best = Math.max(best, 10);
  else if (titleWords.some((w) => w.startsWith(token))) best = Math.max(best, 8);
  else if (title.includes(token)) best = Math.max(best, 5);

  // Het eerste trefwoord is het belangrijkste synoniem en telt iets zwaarder.
  item.keywords.forEach((keyword, position) => {
    const k = normalizeSearch(keyword);
    if (k === token || words(keyword).includes(token)) best = Math.max(best, position === 0 ? 9 : 7);
    else if (words(keyword).some((w) => w.startsWith(token))) best = Math.max(best, 5);
    else if (k.includes(token)) best = Math.max(best, 3);
  });

  const note = normalizeSearch(item.note);
  if (words(item.note).some((w) => w.startsWith(token))) best = Math.max(best, 2);
  else if (note.includes(token)) best = Math.max(best, 1);

  const groupTitle = settingsPageTitle(item.group);
  if (groupTitle && normalizeSearch(groupTitle).includes(token)) best = Math.max(best, 1);
  return best;
}

export function searchSettings<T extends SearchableSetting>(query: string, index: readonly T[]): SettingsSearchResult<T>[] {
  const tokens = words(query);
  if (tokens.length === 0) return [];
  const whole = normalizeSearch(query);
  const scored: { item: T; score: number; order: number }[] = [];
  index.forEach((item, order) => {
    let total = 0;
    for (const token of tokens) {
      const s = tokenScore(token, item);
      if (s === 0) return;
      total += s;
    }
    // De hele zoekopdracht aan het begin van de titel: een duidelijke treffer.
    if (normalizeSearch(item.title).startsWith(whole)) total += 5;
    scored.push({ item, score: total, order });
  });
  return scored
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map(({ item, score }) => ({ item, score }));
}

// ASCEND: de pagina Je plekken in Instellingen, het pure deel (besluit 2026-11-12-andere-plek.md;
// ontwerp Plekken en routes, "Je plekken"). De volgorde, de waarde in de rij, de vraag bij Wissen en een
// nieuwe naam. Zonder React of opslag; niets hier verandert de planning.

import { PLACE_NAME_MAX, type Place, type SavedRoute } from '../models/place';

// Thuis bovenaan, daarna de recentste eerst; bij dezelfde dag de laatst bewaarde eerst.
export function placesInOrder(places: readonly Place[]): Place[] {
  return places
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      if (!!a.p.home !== !!b.p.home) return a.p.home ? -1 : 1;
      if (a.p.createdAt !== b.p.createdAt) return a.p.createdAt < b.p.createdAt ? 1 : -1;
      return b.i - a.i;
    })
    .map(({ p }) => p);
}

// De vraag bij Wissen: wat er weggaat, met het aantal routes. Logs veranderen nooit.
export function wipeQuestion(place: Pick<Place, 'id' | 'name' | 'home'>, routes: readonly Pick<SavedRoute, 'placeId'>[]): string {
  const n = routes.filter((r) => r.placeId === place.id).length;
  const what = n === 0 ? `${place.name} wissen?` : `${place.name} en ${n === 1 ? 'de route' : `de ${n} routes`} erbij wissen?`;
  const home = place.home ? ' Je lus begint daarna waar je nu bent, tot je een nieuw Thuis kiest.' : '';
  return `${what} Je trainingen blijven staan.${home}`;
}

// Een nieuwe naam: zonder spaties eromheen, hoogstens 40 tekens; leeg is geen naam.
export function cleanPlaceName(raw: string): string | undefined {
  const name = raw.trim().replace(/\s+/g, ' ').slice(0, PLACE_NAME_MAX).trim();
  return name.length > 0 ? name : undefined;
}

// ASCEND: een route bij één geplande training (besluit docs/beslissingen/2026-11-24-route-per-training.md, I-160).
//
// Een eigen lijst in de meta-opslag (storage/sessionRoutes.ts), gekoppeld aan PlannedSession.id, geen veld op de
// geplande training: elke schrijfactie van de planning die een hele rij uit een eerdere stand terugschrijft (een
// voorstel, Ongedaan maken, de weekcontrole, replanWeek#weekDiff) zou een veld stil kwijtraken. Het id blijft bij
// verplaatsen, ruilen, het raceblok en het herstel na een doel; een inhaal leest de route van zijn oude rij
// (`catchUp.fromId`, engine/sessionRoute.ts#routeOfSession). Geen bibliotheek, geen log: de geschiedenis verandert
// er nooit door. Provider-neutraal: de bron staat in `source`.

import type { RoutePoint, RouteSource, RouteStyle } from './route';

export interface SessionRoute {
  plannedSessionId: string;
  style: RouteStyle;
  source: RouteSource;
  distanceM: number;
  ascentM: number;
  // Simpel met herhalingen: hoe vaak dezelfde helling.
  repeats?: number;
  // Hoogstens ROUTE_MAX_POINTS punten (models/place.ts), alleen plek en hoogte.
  points: RoutePoint[];
  // De dag waarop hij gekozen is (JJJJ-MM-DD).
  chosenAt: string;
}

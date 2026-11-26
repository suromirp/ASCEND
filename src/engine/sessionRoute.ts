// ASCEND: de route die bij één geplande training hoort (models/sessionRoute.ts, I-160). Puur: lezen, kiezen,
// weggooien en opruimen op een lijst, en de stille regel voor Week en Vandaag. Plant niets: een route verandert
// de minuten of de dag van de training nooit.

import type { PlannedSession } from '../models/training';
import type { RouteProposal, RouteStyle } from '../models/route';
import type { SessionRoute } from '../models/sessionRoute';
import { simplifyTrack } from './places';
import { roundExact } from './routeStart';
import { ROUTE_MAX_POINTS } from '../models/place';

// De woorden van het Route-blok met een bewaarde route (components/SavedRouteBlock.tsx, TrainingBriefing.tsx).
export const SAVED_ROUTE_TEXT = {
  other: 'Andere route',
  remove: 'Route verwijderen',
  ask: 'Route verwijderen? De training blijft staan.',
  confirm: 'Verwijderen',
  removeFailed: 'Verwijderen lukte niet. Je route staat er nog.',
  save: 'Bewaar voor deze training',
  saveFailed: 'Bewaren lukte niet. Je lus staat er nog.',
} as const;

export const ROUTE_STYLE_NAME: Record<RouteStyle, string> = { simple: 'Simpel', adventure: 'Avontuurlijk' };

// De gekozen lus als bewaarde route: het spoor uitgedund tot hoogstens 800 punten, alleen plek en hoogte.
export function sessionRouteFrom(
  plannedSessionId: string,
  proposal: Pick<RouteProposal, 'style' | 'source' | 'points' | 'distanceM' | 'ascentM' | 'repeats'>,
  today: string,
): SessionRoute {
  return {
    plannedSessionId,
    style: proposal.style,
    source: proposal.source,
    distanceM: Math.round(proposal.distanceM),
    ascentM: Math.round(proposal.ascentM),
    ...(proposal.repeats !== undefined && proposal.repeats > 1 ? { repeats: proposal.repeats } : {}),
    // Op vijf decimalen (ongeveer een meter) en de hoogte op een decimeter, zoals de opslag hem leest: heen en terug gelijk.
    points: simplifyTrack(proposal.points, ROUTE_MAX_POINTS).map((p) => ({ ...roundExact(p), ...(p.ele !== undefined ? { ele: Math.round(p.ele * 10) / 10 } : {}) })),
    chosenAt: today,
  };
}

// De route van deze training: die van zijn eigen id, anders (bij een inhaal) die van de rij van toen. Een
// overgeslagen training toont geen route; Toch doen brengt hem terug, want de route blijft staan.
export function routeOfSession(session: Pick<PlannedSession, 'id' | 'status' | 'catchUp'>, routes: readonly SessionRoute[]): SessionRoute | undefined {
  if (session.status === 'skipped') return undefined;
  const own = routes.find((r) => r.plannedSessionId === session.id);
  if (own) return own;
  const from = session.catchUp?.fromId;
  return from ? routes.find((r) => r.plannedSessionId === from) : undefined;
}

// Welke ids bij deze training horen: zijn eigen en, bij een inhaal, die van de rij van toen.
const idsOf = (session: Pick<PlannedSession, 'id' | 'catchUp'>): Set<string> =>
  new Set([session.id, ...(session.catchUp?.fromId ? [session.catchUp.fromId] : [])]);

// Een route kiezen of wijzigen: de oude van deze training (ook die van de rij van toen) gaat eruit, de nieuwe
// komt op het eigen id.
export function withSessionRoute(routes: readonly SessionRoute[], session: Pick<PlannedSession, 'id' | 'catchUp'>, route: SessionRoute): SessionRoute[] {
  const ids = idsOf(session);
  return [...routes.filter((r) => !ids.has(r.plannedSessionId)), { ...route, plannedSessionId: session.id }];
}

export function withoutSessionRoute(routes: readonly SessionRoute[], session: Pick<PlannedSession, 'id' | 'catchUp'>): SessionRoute[] {
  const ids = idsOf(session);
  return routes.filter((r) => !ids.has(r.plannedSessionId));
}

// Alleen de routes van trainingen die er nog zijn: een training die de planning weghaalde neemt zijn route mee.
// Een overgeslagen rij is er nog (Toch doen), en de rij van toen bij een inhaal ook.
export function routesOfSessions(routes: readonly SessionRoute[], sessions: readonly Pick<PlannedSession, 'id'>[]): SessionRoute[] {
  const ids = new Set(sessions.map((s) => s.id));
  return routes.filter((r) => ids.has(r.plannedSessionId));
}

// Een import: de routes van het bestand winnen bij dezelfde training, de rest van het toestel blijft.
export function mergeSessionRoutes(device: readonly SessionRoute[], incoming: readonly SessionRoute[] | undefined): SessionRoute[] {
  if (!incoming) return [...device];
  const ids = new Set(incoming.map((r) => r.plannedSessionId));
  return [...device.filter((r) => !ids.has(r.plannedSessionId)), ...incoming];
}

const km = (m: number): string => (Math.round(m / 100) / 10).toFixed(1).replace('.', ',');

// De stille regel in Week en op Vandaag: "Route: Avontuurlijk, 10,2 km, 310 m".
export function sessionRouteLine(route: Pick<SessionRoute, 'style' | 'distanceM' | 'ascentM'>): string {
  return `Route: ${ROUTE_STYLE_NAME[route.style]}, ${km(route.distanceM)} km, ${Math.round(route.ascentM)} m`;
}

// De getallen in het Route-blok van de Briefing: "10,2 km, 300 hoogtemeters, 4 keer op en neer".
export function sessionRouteFacts(route: Pick<SessionRoute, 'distanceM' | 'ascentM' | 'repeats'>): string {
  const base = `${km(route.distanceM)} km, ${Math.round(route.ascentM)} hoogtemeters`;
  return route.repeats && route.repeats > 1 ? `${base}, ${route.repeats} keer op en neer` : base;
}

import { describe, expect, it } from 'vitest';
import search from './useRouteSearch.ts?raw';

// Een veld dat de zin nodig heeft moet de hele weg van doel tot planner mee (Lookout, 15 november): de
// component gaf findRoutes alleen afstand en hoogtemeters, en dan zei de lus "de training vraagt 380 m" bij een
// bergtocht van 500 m. useRouteSearch geeft het doel van engine/routeAdjust.ts#searchTarget door, nooit een
// eigen object met een paar velden.
describe('useRouteSearch geeft het hele doel aan findRoutes', () => {
  it('het doel komt uit searchTarget en gaat ongewijzigd naar findRoutes', () => {
    expect(search).toMatch(/const target: RouteTarget = useMemo\(\(\) => searchTarget\(/);
    expect(search).toMatch(/findRoutes\(\{ lat, lon \}, target, \{/);
  });
  it('nergens een uitgekleed doel', () => {
    expect(search).not.toMatch(/findRoutes\([^,]+,\s*\{\s*distanceKm/);
    expect(search).not.toMatch(/\{\s*distanceKm,\s*ascentM\s*\}/);
  });
});

import { describe, expect, it } from 'vitest';
import type { PlannedSession } from '../models/training';
import type { RoutePoint } from '../models/route';
import { mergeSessionRoutes, routeOfSession, routesOfSessions, sessionRouteFacts, sessionRouteFrom, sessionRouteLine, withoutSessionRoute, withSessionRoute } from './sessionRoute';
import { applyPlanChangeItems } from './proposalEngine';
import { footStartLine } from './routePlanner';
import { readSessionRoute } from '../storage/migrationsSessionRoutes';
import { catchUpRows } from './catchUp';
import { weekDiff } from './replanWeek';

// Nagemaakte lus: een cirkel van 2000 punten rond een verzonnen punt.
const loop = (n = 2000): RoutePoint[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / (n - 1)) * 2 * Math.PI;
    return { lat: 50 + 0.02 * Math.sin(a), lon: 5 + 0.03 * Math.cos(a) + 0.0001 * Math.sin(17 * a), ele: 100 + 40 * Math.sin(3 * a), bigRoad: true, surface: 'paved' };
  });

const session = (id: string, date: string, extra: Partial<PlannedSession> = {}): PlannedSession => ({
  id, templateId: 'tpl_long_run', scheduledDate: date, weekStartDate: '2026-11-23', status: 'planned', order: 0, ...extra,
});

const route = (id: string) => sessionRouteFrom(id, { style: 'adventure', source: 'brouter', points: loop(), distanceM: 10230, ascentM: 310.4 }, '2026-11-25');

describe('sessionRouteFrom', () => {
  it('dunt het spoor uit tot hoogstens 800 punten, alleen plek en hoogte', () => {
    const r = route('ps1');
    expect(r.points.length).toBeLessThanOrEqual(800);
    expect(r.points.length).toBeGreaterThan(2);
    expect(r.points.every((p) => Object.keys(p).every((k) => k === 'lat' || k === 'lon' || k === 'ele'))).toBe(true);
    expect(r).toMatchObject({ plannedSessionId: 'ps1', style: 'adventure', source: 'brouter', distanceM: 10230, ascentM: 310, chosenAt: '2026-11-25' });
    expect(r.repeats).toBeUndefined();
  });

  it('zegt de soort, de km en de hoogtemeters in de stille regel', () => {
    expect(sessionRouteLine(route('ps1'))).toBe('Route: Avontuurlijk, 10,2 km, 310 m');
    expect(sessionRouteFacts({ distanceM: 14000, ascentM: 300, repeats: 4 })).toBe('14,0 km, 300 hoogtemeters, 4 keer op en neer');
  });
});

describe('de voet van de helling', () => {
  it('een bewaarde route zegt dezelfde regel als een nieuwe lus, ook na opslaan en lezen', () => {
    const fresh = { style: 'simple' as const, source: 'brouter' as const, points: loop(), distanceM: 10230, ascentM: 310, footStartM: 1800 };
    const saved = sessionRouteFrom('ps1', fresh, '2026-11-25');
    expect(saved.footStartM).toBe(1800);
    const back = readSessionRoute(JSON.parse(JSON.stringify(saved)))!;
    expect(footStartLine(back)).toBe(footStartLine(fresh));
    expect(footStartLine(back)).toMatch(/^Begint bij de voet van de helling/);
    // Zonder voet: geen regel, en een oudere route zonder veld leest gelijk.
    expect(footStartLine(route('ps1'))).toBeUndefined();
    expect('footStartM' in readSessionRoute(JSON.parse(JSON.stringify(route('ps1'))))!).toBe(false);
  });
});

describe('routeOfSession', () => {
  const r = route('ps1');

  it('verplaatsen naar een andere dag: de route blijft', () => {
    const before = [session('ps1', '2026-11-28')];
    const { sessions } = applyPlanChangeItems([{ plannedSessionId: 'ps1', action: 'move', fromDate: '2026-11-28', toDate: '2026-11-29' }], before, () => 'x');
    const moved = sessions.find((s) => s.id === 'ps1')!;
    expect(moved.scheduledDate).toBe('2026-11-29');
    expect(routeOfSession(moved, [r])).toEqual(r);
  });

  it('Ongedaan maken van een verplaatsing: de oude rij komt terug en houdt de route', () => {
    const was = session('ps1', '2026-11-28');
    const { sessions } = applyPlanChangeItems([{ plannedSessionId: 'ps1', action: 'move', fromDate: '2026-11-28', toDate: '2026-11-29' }], [was], () => 'x');
    expect(sessions[0].scheduledDate).toBe('2026-11-29');
    // Ongedaan maken schrijft de rij van voor de verplaatsing terug: hetzelfde id.
    expect(routeOfSession(was, [r])).toEqual(r);
  });

  it('ruilen: elke route gaat mee met zijn eigen training', () => {
    const a = session('psA', '2026-11-26');
    const b = session('psB', '2026-11-28', { templateId: 'tpl_easy_run' });
    const rb = route('psB');
    const { sessions } = applyPlanChangeItems([
      { plannedSessionId: 'psA', action: 'swap', fromDate: '2026-11-26', toDate: '2026-11-28', pairedWithSessionId: 'psB' },
      { plannedSessionId: 'psB', action: 'swap', fromDate: '2026-11-28', toDate: '2026-11-26', pairedWithSessionId: 'psA' },
    ], [a, b], () => 'x');
    const na = sessions.find((s) => s.id === 'psA')!;
    const nb = sessions.find((s) => s.id === 'psB')!;
    expect(na.scheduledDate).toBe('2026-11-28');
    expect(routeOfSession(na, [route('psA'), rb])?.plannedSessionId).toBe('psA');
    expect(routeOfSession(nb, [route('psA'), rb])?.plannedSessionId).toBe('psB');
  });

  it('overgeslagen: geen route te zien, Toch doen brengt hem terug', () => {
    const skipped = session('ps1', '2026-11-28', { status: 'skipped' });
    expect(routeOfSession(skipped, [r])).toBeUndefined();
    expect(routeOfSession({ ...skipped, status: 'planned' }, [r])).toEqual(r);
    // Opruimen laat een overgeslagen rij zijn route houden.
    expect(routesOfSessions([r], [skipped])).toEqual([r]);
  });

  it('inhalen: de nieuwe rij leest de route van de rij van toen', () => {
    const old = session('ps1', '2026-11-24');
    const { skipped, added } = catchUpRows(old, '2026-11-27', { by: 'user', at: '2026-11-25T08:00:00Z' }, 'ps2');
    expect(routeOfSession(skipped, [r])).toBeUndefined();
    expect(routeOfSession(added, [r])).toEqual(r);
    // Een andere route kiezen op de nieuwe rij vervangt die van toen; weggooien wist beide.
    const other = { ...route('ps2'), style: 'simple' as const };
    const chosen = withSessionRoute([r], added, other);
    expect(chosen).toHaveLength(1);
    expect(routeOfSession(added, chosen)?.style).toBe('simple');
    expect(withoutSessionRoute(chosen, added)).toEqual([]);
    expect(withoutSessionRoute([r], added)).toEqual([]);
  });

  it('een inhaal van een inhaal toont de route van de oorspronkelijke rij', () => {
    const first = session('ps1', '2026-11-24');
    const one = catchUpRows(first, '2026-11-26', { by: 'user', at: '2026-11-25T08:00:00Z' }, 'ps2');
    const two = catchUpRows(one.added, '2026-11-28', { by: 'user', at: '2026-11-27T08:00:00Z' }, 'ps3');
    const all = [one.skipped, one.added, two.skipped, two.added];
    // Met de lijst volgt hij de keten; zonder lijst alleen één stap.
    expect(routeOfSession(two.added, [r], all)).toEqual(r);
    expect(routeOfSession(two.added, [r])).toBeUndefined();
    // Overgeslagen blijft zonder route, en een route kiezen op de laatste vervangt die van de oorspronkelijke rij.
    expect(routeOfSession(two.skipped, [r], all)).toBeUndefined();
    const other = { ...route('ps3'), style: 'simple' as const };
    const chosen = withSessionRoute([r], two.added, other, all);
    expect(chosen.map((x) => x.plannedSessionId)).toEqual(['ps3']);
    expect(withoutSessionRoute([r], two.added, all)).toEqual([]);
  });

  it('een lus in de gegevens houdt de keten niet vast', () => {
    const a = { ...session('a', '2026-11-24'), catchUp: { fromId: 'b', fromDate: '2026-11-23' } };
    const b = { ...session('b', '2026-11-25'), catchUp: { fromId: 'a', fromDate: '2026-11-24' } };
    expect(routeOfSession(a, [], [a, b])).toBeUndefined();
  });

  it('de week opnieuw ingedeeld: dezelfde training op een andere dag houdt zijn id en dus zijn route', () => {
    const stored = [session('ps1', '2026-11-28')];
    const after = [session('fresh', '2026-11-29')];
    const diff = weekDiff(stored, after, '2026-11-23');
    expect(diff.writes[0].id).toBe('ps1');
    expect(routeOfSession(diff.writes[0], [r])).toEqual(r);
  });

  it('verwijderd door de planning: de route gaat mee weg', () => {
    const keep = route('ps2');
    expect(routesOfSessions([r, keep], [session('ps2', '2026-11-29')])).toEqual([keep]);
  });

  it('de dag zelf: dezelfde route, zonder zoektocht', () => {
    const today = session('ps1', '2026-11-25');
    expect(routeOfSession(today, [r])?.points.length).toBe(r.points.length);
  });
});

describe('mergeSessionRoutes', () => {
  it('het bestand wint bij dezelfde training, de rest van het toestel blijft; zonder veld blijft alles', () => {
    const device = [route('ps1'), route('ps2')];
    const file = [{ ...route('ps2'), style: 'simple' as const }];
    const merged = mergeSessionRoutes(device, file);
    expect(merged.map((r) => [r.plannedSessionId, r.style])).toEqual([['ps1', 'adventure'], ['ps2', 'simple']]);
    expect(mergeSessionRoutes(device, undefined)).toEqual(device);
  });
});

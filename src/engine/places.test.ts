// Spoor 2 van Plekken en routes: de pure functies. Alle coördinaten zijn nagemaakt.
import { describe, expect, it } from 'vitest';
import {
  HOME_PLACE_ID,
  NEAR_PLACE_M,
  PLACE_REACH_DEFAULT_KM,
  SHORT_TRAINING_REACH_KM,
  nearestPlace,
  placeNeed,
  placeReachKm,
  rankSavedRoutes,
  routeRunDates,
  simplifyTrack,
  startChoices,
  suggestPlace,
  trackFacts,
  weatherAtPlace,
  type PlaceNeed,
} from './places';
import { metersBetween } from './routeGeometry';
import type { Place, SavedRoute } from '../models/place';
import type { RoutePoint } from '../models/route';

const START: RoutePoint = { lat: 50, lon: 5 };
// Een punt `km` naar het noorden van START.
const north = (km: number): RoutePoint => ({ lat: 50 + km / 111.195, lon: 5 });

const place = (id: string, name: string, at: RoutePoint, home = false): Place => ({ id, name, lat: at.lat, lon: at.lon, source: 'map', createdAt: '2026-01-05', ...(home ? { home: true as const } : {}) });
const route = (id: string, placeId: string, distanceM: number, ascentM: number, extra: Partial<SavedRoute> = {}): SavedRoute => ({
  id, placeId, name: id, source: 'proposal', distanceM, ascentM, points: [START, START], createdAt: '2026-01-05', ...extra,
});
const hills = { id: 'hills_x', roles: ['hills' as const], durationVariants: { full: 60 } };
const easy = { id: 'easy_x', roles: [], durationVariants: { full: 45 } };
const longRun = { id: 'long_x', roles: [], durationVariants: { full: 120 } };

describe('placeNeed', () => {
  it('heuveltraining vraagt hoogte, lange duurloop vraagt lang, rustige loop niets', () => {
    expect(placeNeed(hills, { distanceKm: 8, ascentM: 180 })).toEqual({ kind: 'ascent', ascentM: 180, distanceKm: 8, minutes: 60 });
    expect(placeNeed(longRun, { distanceKm: 18, ascentM: 0 })).toEqual({ kind: 'long', distanceKm: 18, ascentM: 0, minutes: 120 });
    expect(placeNeed(easy, { distanceKm: 7, ascentM: 0 })).toEqual({ kind: 'none', minutes: 45 });
  });
  it('een doel van 100 hoogtemeters vraagt hoogte, ook zonder heuvelrol', () => {
    expect(placeNeed(easy, { distanceKm: 7, ascentM: 100 }).kind).toBe('ascent');
    expect(placeNeed(easy, { distanceKm: 7, ascentM: 99 }).kind).toBe('none');
  });
  it('training zonder duur: geen lang, en de korte grens', () => {
    const none = { id: 'x', durationVariants: { full: 0 } };
    const need = placeNeed(none, { distanceKm: 20, ascentM: 0 });
    expect(need).toEqual({ kind: 'none', minutes: undefined });
    expect(placeReachKm(placeNeed(none, { distanceKm: 8, ascentM: 200 }), 75)).toBe(SHORT_TRAINING_REACH_KM);
    const missing = { id: 'x' } as unknown as typeof none;
    expect(placeNeed(missing, { distanceKm: 8, ascentM: 0 }).kind).toBe('none');
    expect(placeNeed(none, { distanceKm: 20, ascentM: 0 }, 100).kind).toBe('long');
  });
  it('een doel dat geen getal is vraagt niets', () => {
    expect(placeNeed(longRun, { distanceKm: 18, ascentM: Number.NaN }).kind).toBe('none');
    expect(placeNeed(hills, { distanceKm: Number.NaN, ascentM: 200 }).kind).toBe('none');
  });
  it('90 minuten precies is lang', () => {
    expect(placeNeed({ id: 'x', durationVariants: { full: 90 } }, { distanceKm: 14, ascentM: 0 }).kind).toBe('long');
    expect(placeNeed({ id: 'x', durationVariants: { full: 89 } }, { distanceKm: 14, ascentM: 0 }).kind).toBe('none');
  });
});

describe('placeReachKm', () => {
  const long: PlaceNeed = { kind: 'long', distanceKm: 18, ascentM: 0, minutes: 120 };
  const short: PlaceNeed = { kind: 'ascent', distanceKm: 8, ascentM: 200, minutes: 60 };
  it('korter dan 90 minuten hoogstens 25 km, vanaf 90 de instelling (standaard 75), Geen grens is onbeperkt', () => {
    expect(placeReachKm(short)).toBe(25);
    expect(placeReachKm(short, 10)).toBe(10);
    expect(placeReachKm(short, null)).toBe(25);
    expect(placeReachKm(long)).toBe(PLACE_REACH_DEFAULT_KM);
    expect(placeReachKm(long, null)).toBe(Infinity);
    expect(placeReachKm(long, Number.NaN)).toBe(75);
    expect(placeReachKm(long, Infinity)).toBe(Infinity);
  });
  it('89 minuten is kort, 90 minuten lang', () => {
    expect(placeReachKm({ kind: 'none', minutes: 89 }, 75)).toBe(25);
    expect(placeReachKm({ kind: 'long', distanceKm: 14, ascentM: 0, minutes: 90 }, 75)).toBe(75);
  });
});

describe('routeRunDates', () => {
  it('telt alleen logs bij de geplande trainingen waarvoor hij gekozen werd, elke dag één keer', () => {
    const r = route('r', 'p', 8000, 0, { chosenFor: [{ date: '2026-03-02', plannedSessionId: 'ps1' }, { date: '2026-03-09', plannedSessionId: 'ps2' }] });
    const logs = [
      { plannedSessionId: 'ps2', completedDate: '2026-03-10' },
      { plannedSessionId: 'ps1', completedDate: '2026-03-02' },
      { plannedSessionId: 'ps1', completedDate: '2026-03-02' },
      { plannedSessionId: 'other', completedDate: '2026-03-03' },
      { completedDate: '2026-03-04' },
    ];
    expect(routeRunDates(r, logs)).toEqual(['2026-03-02', '2026-03-10']);
    expect(routeRunDates(route('n', 'p', 1, 0), logs)).toEqual([]);
  });
});

describe('rankSavedRoutes', () => {
  const target = { distanceKm: 8, ascentM: 240 };
  it('best passend bovenaan, met de zin', () => {
    const ranked = rankSavedRoutes([route('ver', 'p', 12000, 100), route('goed', 'p', 8100, 240)], target);
    expect(ranked.map((r) => r.route.id)).toEqual(['goed', 'ver']);
    expect(ranked[0].line).toBe('Past: 8,1 km en 240 hoogtemeters. Nog niet gelopen.');
    expect(ranked[1].line).toBe('Wijkt af: 12 km en 100 hoogtemeters. Nog niet gelopen.');
  });
  it('gelijke stand: de vaakst gelopen, dan de naam', () => {
    const a = route('a', 'p', 8000, 240, { name: 'B-route', chosenFor: [{ date: '2026-03-02', plannedSessionId: 'x' }] });
    const b = route('b', 'p', 8000, 240, { name: 'A-route', chosenFor: [{ date: '2026-03-02', plannedSessionId: 'y' }, { date: '2026-03-09', plannedSessionId: 'z' }] });
    const c = route('c', 'p', 8000, 240, { name: 'C-route' });
    const logs = [{ plannedSessionId: 'x', completedDate: '2026-03-02' }, { plannedSessionId: 'y', completedDate: '2026-03-02' }, { plannedSessionId: 'z', completedDate: '2026-03-09' }];
    expect(rankSavedRoutes([c, a, b], target, logs).map((r) => r.route.id)).toEqual(['b', 'a', 'c']);
    expect(rankSavedRoutes([a, b], target, logs)[0].line).toBe('Past: 8 km en 240 hoogtemeters. Je liep hem 2 keer.');
    // Zonder logs: op naam.
    expect(rankSavedRoutes([c, a, b], target).map((r) => r.route.id)).toEqual(['b', 'a', 'c']);
  });
  it('geen routes geeft een lege lijst', () => {
    expect(rankSavedRoutes([], target)).toEqual([]);
  });
});

describe('nearestPlace', () => {
  it('de dichtstbijzijnde binnen 300 m, anders geen; bij gelijke afstand de naam', () => {
    const near = place('n', 'Bos', north(0.2));
    const far = place('f', 'Ver', north(0.5));
    expect(nearestPlace(START, [far, near])?.id).toBe('n');
    expect(nearestPlace(START, [far])).toBeUndefined();
    expect(nearestPlace(START, [])).toBeUndefined();
    const twinB = place('b', 'Zuid', north(0.1));
    const twinA = place('a', 'Noord', north(0.1));
    expect(nearestPlace(START, [twinB, twinA])?.id).toBe('a');
  });
  it('een punt dat geen getal is geeft geen plek', () => {
    expect(nearestPlace({ lat: Number.NaN, lon: 5 }, [place('n', 'Bos', north(0.2))])).toBeUndefined();
    expect(nearestPlace(START, [place('n', 'Bos', north(0.2))], Number.NaN)).toBeUndefined();
  });
  it('precies op 300 m telt mee', () => {
    const edge = place('e', 'Rand', north(NEAR_PLACE_M / 1000));
    const m = metersBetween(START, edge);
    expect(nearestPlace(START, [edge], m)?.id).toBe('e');
    expect(nearestPlace(START, [edge], m - 0.01)).toBeUndefined();
  });
});

describe('suggestPlace', () => {
  const need: PlaceNeed = { kind: 'ascent', ascentM: 250, distanceKm: 8, minutes: 60 };
  const top = place('top', 'Heuveltop', north(14));
  const topRoute = route('t1', 'top', 8200, 240);

  it('een heuveltraining met een passende plek binnen de grens: één plek met zijn zin', () => {
    const s = suggestPlace(need, [top], [topRoute], START, 25, { ascentM: 60 });
    expect(s?.place.id).toBe('top');
    expect(s?.route.id).toBe('t1');
    expect(s?.line).toBe('Heuveltop haalt 240 van je 250 hoogtemeters, hier 60. 14 km hemelsbreed.');
  });
  it('lang: de route past', () => {
    const duin = place('d', 'Duinpad', north(9));
    const s = suggestPlace({ kind: 'long', distanceKm: 18, ascentM: 0, minutes: 120 }, [duin], [route('d1', 'd', 18000, 0)], START, 75);
    expect(s?.line).toBe('Je route van 18 km bij Duinpad past. 9 km hemelsbreed.');
  });
  it('geen plekken, geen routes of een training die niets vraagt: niets', () => {
    expect(suggestPlace(need, [], [topRoute], START, 25)).toBeUndefined();
    expect(suggestPlace(need, [top], [], START, 25)).toBeUndefined();
    expect(suggestPlace({ kind: 'none', minutes: 45 }, [top], [topRoute], START, 25)).toBeUndefined();
  });
  it('de route haalt minder dan 80 procent: niets', () => {
    expect(suggestPlace(need, [top], [route('t2', 'top', 8000, 190)], START, 25)).toBeUndefined();
    expect(suggestPlace(need, [top], [route('t3', 'top', 8000, 200)], START, 25)?.route.id).toBe('t3');
  });
  it('het startpunt haalt het zelf al: niets, ook via een route van een plek bij het startpunt', () => {
    expect(suggestPlace(need, [top], [topRoute], START, 25, { ascentM: 210 })).toBeUndefined();
    const home = place(HOME_PLACE_ID, 'Thuis', START, true);
    expect(suggestPlace(need, [home, top], [topRoute, route('h1', HOME_PLACE_ID, 8000, 220)], START, 25)).toBeUndefined();
    // Een te vlakke route bij Thuis telt als wat hier kan.
    expect(suggestPlace(need, [home, top], [topRoute, route('h2', HOME_PLACE_ID, 8000, 50)], START, 25)?.line).toBe('Heuveltop haalt 240 van je 250 hoogtemeters, hier 50. 14 km hemelsbreed.');
  });
  it('wat hier kan onbekend: voorstel zonder hier', () => {
    expect(suggestPlace(need, [top], [topRoute], START, 25)?.line).toBe('Heuveltop haalt 240 van je 250 hoogtemeters. 14 km hemelsbreed.');
  });
  it('een plek precies op de grens telt mee, net erover niet', () => {
    const edge = metersBetween(START, top) / 1000;
    expect(suggestPlace(need, [top], [topRoute], START, edge)?.place.id).toBe('top');
    expect(suggestPlace(need, [top], [topRoute], START, edge - 0.001)).toBeUndefined();
  });
  it('de dichtstbijzijnde passende plek eerst, ook als een verdere beter past', () => {
    const near = place('near', 'Dichtbij', north(5));
    const s = suggestPlace(need, [top, near], [topRoute, route('n1', 'near', 8800, 210)], START, 25);
    expect(s?.place.id).toBe('near');
  });
  it('gelijke stand tussen twee plekken op dezelfde afstand: de beste route, dan de naam', () => {
    const east = place('e', 'Oost', { lat: 50, lon: 5.1 });
    const west = place('w', 'West', { lat: 50, lon: 4.9 });
    expect(metersBetween(START, east)).toBeCloseTo(metersBetween(START, west), 6);
    const better = suggestPlace(need, [west, east], [route('w1', 'w', 8000, 250), route('e1', 'e', 8000, 220)], START, 25);
    expect(better?.place.id).toBe('w');
    const same = suggestPlace(need, [west, east], [route('w1', 'w', 8000, 250), route('e1', 'e', 8000, 250)], START, 25);
    expect(same?.place.id).toBe('e');
    // Volgorde van de invoer verandert niets.
    expect(suggestPlace(need, [east, west], [route('e1', 'e', 8000, 250), route('w1', 'w', 8000, 250)], START, 25)?.place.id).toBe('e');
  });
  it('een route waarvan de afstand niet past komt niet in een voorstel', () => {
    expect(suggestPlace(need, [top], [route('lang', 'top', 40000, 250)], START, 25)).toBeUndefined();
    const duin = place('d', 'Duinpad', north(9));
    expect(suggestPlace({ kind: 'long', distanceKm: 10, ascentM: 0, minutes: 95 }, [duin], [route('d1', 'd', 30000, 0)], START, 75)).toBeUndefined();
  });
  it('lang met hoogtemeters: een vlakke route past niet, ook niet als de afstand klopt', () => {
    const duin = place('d', 'Duinpad', north(9));
    const need: PlaceNeed = { kind: 'long', distanceKm: 20, ascentM: 80, minutes: 120 };
    expect(suggestPlace(need, [duin], [route('vlak', 'd', 20000, 0)], START, 75)).toBeUndefined();
    expect(rankSavedRoutes([route('vlak', 'd', 20000, 0)], { distanceKm: 20, ascentM: 80 })[0].fits).toBe(false);
    expect(suggestPlace(need, [duin], [route('ok', 'd', 20000, 80)], START, 75)?.route.id).toBe('ok');
  });
  it('veel meer hoogtemeters dan gevraagd past niet: 900 voor 300', () => {
    const need300: PlaceNeed = { kind: 'ascent', ascentM: 300, distanceKm: 8, minutes: 60 };
    expect(suggestPlace(need300, [top], [route('steil', 'top', 8000, 900)], START, 25)).toBeUndefined();
    expect(suggestPlace(need300, [top], [route('ruim', 'top', 8000, 375)], START, 25)?.route.id).toBe('ruim');
    expect(rankSavedRoutes([route('steil', 'top', 8000, 900)], { distanceKm: 8, ascentM: 300 })[0].line.startsWith('Wijkt af')).toBe(true);
  });
  it('een grens die geen getal is geeft geen voorstel', () => {
    expect(suggestPlace(need, [top], [topRoute], START, Number.NaN)).toBeUndefined();
    expect(suggestPlace(need, [top], [topRoute], START, Infinity)?.place.id).toBe('top');
  });
  it('wat hier kan telt alleen als eindig getal van minstens nul', () => {
    expect(suggestPlace(need, [top], [topRoute], START, 25, { ascentM: Number.NaN })?.line).toBe('Heuveltop haalt 240 van je 250 hoogtemeters. 14 km hemelsbreed.');
    expect(suggestPlace(need, [top], [topRoute], START, 25, { ascentM: -40 })?.line).toBe('Heuveltop haalt 240 van je 250 hoogtemeters. 14 km hemelsbreed.');
    expect(suggestPlace(need, [top], [topRoute], START, 25, { ascentM: 0 })?.line).toBe('Heuveltop haalt 240 van je 250 hoogtemeters, hier 0. 14 km hemelsbreed.');
  });
  it('een route van 40 km bij het startpunt houdt geen voorstel voor 8 km tegen', () => {
    const home = place(HOME_PLACE_ID, 'Thuis', START, true);
    const s = suggestPlace(need, [home, top], [topRoute, route('lang', HOME_PLACE_ID, 40000, 260)], START, 25);
    expect(s?.place.id).toBe('top');
    expect(s?.line).toBe('Heuveltop haalt 240 van je 250 hoogtemeters. 14 km hemelsbreed.');
  });
  it('een route van A naar B mag', () => {
    const ab = route('ab', 'top', 8000, 240, { points: [north(14), north(18)] });
    expect(suggestPlace(need, [top], [ab], START, 25)?.route.id).toBe('ab');
  });
  it('een plek bij het startpunt zelf wordt nooit voorgesteld', () => {
    const close = place('c', 'Om de hoek', north(0.2));
    expect(suggestPlace(need, [close], [route('c1', 'c', 8000, 250)], START, 25)).toBeUndefined();
  });
});

describe('weatherAtPlace', () => {
  it('verder dan 10 km', () => {
    expect(weatherAtPlace(north(11), START)).toBe(true);
    expect(weatherAtPlace(north(9), START)).toBe(false);
  });
});

describe('startChoices', () => {
  const home = place(HOME_PLACE_ID, 'Thuis', START, true);
  const top = place('top', 'Heuveltop', north(14));
  it('chips en de keuze volgen Startpunt van je lus', () => {
    const c = startChoices('exact', [home, top], { place: top });
    expect(c.chips.map((x) => x.label)).toEqual(['Waar je nu bent', 'Thuis', 'Heuveltop', 'Andere plek']);
    expect(c.chosen.kind).toBe('home');
    expect(startChoices('here', [home], undefined).chosen.kind).toBe('here');
    expect(startChoices('approx', [home], undefined).chosen.kind).toBe('here');
  });
  it('geen plekken: Waar je nu bent en Andere plek, ook bij Thuis als instelling', () => {
    const c = startChoices('exact', [], undefined);
    expect(c.chips.map((x) => x.kind)).toEqual(['here', 'other']);
    expect(c.chosen.kind).toBe('here');
  });
  it('een tik voor deze training gaat voor, een voorstel wordt nooit vanzelf gekozen', () => {
    expect(startChoices('here', [home, top], { place: top }).chosen.kind).toBe('here');
    expect(startChoices('here', [home, top], { place: top }, 'top').chosen.placeId).toBe('top');
    expect(startChoices('here', [home, top], { place: top }, 'gone').chosen.kind).toBe('here');
  });
});

describe('simplifyTrack en trackFacts', () => {
  // Een zigzag van 3000 punten met hoogte: veel meer dan 800.
  const zigzag: RoutePoint[] = Array.from({ length: 3000 }, (_, i) => ({ lat: 50 + i * 0.0001, lon: 5 + (i % 2) * 0.0003, ele: 100 + (i % 50) }));
  it('hoogstens 800 punten, begin en eind blijven, en twee keer hetzelfde', () => {
    const out = simplifyTrack(zigzag);
    expect(out.length).toBeLessThanOrEqual(800);
    expect(out[0]).toEqual(zigzag[0]);
    expect(out[out.length - 1]).toEqual(zigzag[2999]);
    expect(simplifyTrack(zigzag)).toEqual(out);
    expect(simplifyTrack(zigzag, 100).length).toBeLessThanOrEqual(100);
    expect(simplifyTrack(zigzag, Number.NaN).length).toBeLessThanOrEqual(800);
    const copy = JSON.parse(JSON.stringify(zigzag));
    simplifyTrack(zigzag);
    expect(zigzag).toEqual(copy);
  });
  it('een rechte lijn wordt twee punten; een bocht van meer dan 5 m blijft', () => {
    const straight = Array.from({ length: 50 }, (_, i) => ({ lat: 50 + i * 0.0001, lon: 5 }));
    expect(simplifyTrack(straight)).toHaveLength(2);
    const bend = [{ lat: 50, lon: 5 }, { lat: 50.001, lon: 5.0002 }, { lat: 50.002, lon: 5 }];
    expect(simplifyTrack(bend)).toHaveLength(3);
  });
  it('een bult van 10 m in een rechte weg blijft in de hoogtemeters', () => {
    const road = [{ lat: 50, lon: 5, ele: 10 }, { lat: 50.001, lon: 5, ele: 20 }, { lat: 50.002, lon: 5, ele: 10 }];
    expect(simplifyTrack(road)).toHaveLength(3);
  });
  it('20.000 zigzagpunten blijven 800 punten, verspreid over het hele spoor', () => {
    const big: RoutePoint[] = Array.from({ length: 20000 }, (_, i) => ({ lat: 50 + i * 0.00001, lon: 5 + (i % 2) * 0.0003 }));
    const out = simplifyTrack(big);
    expect(out).toHaveLength(800);
    expect(out[0]).toEqual(big[0]);
    expect(out[799]).toEqual(big[19999]);
    // Geen gat van meer dan een kwart van het spoor.
    let gap = 0;
    for (let i = 1; i < out.length; i++) gap = Math.max(gap, out[i].lat - out[i - 1].lat);
    expect(gap).toBeLessThan((big[19999].lat - big[0].lat) / 4);
  });
  it('een hoogte die geen getal is telt als geen hoogte', () => {
    const track: RoutePoint[] = Array.from({ length: 5000 }, (_, i) => ({ lat: 50 + i * 0.0001, lon: 5 + (i % 2) * 0.0003, ele: 100 }));
    track[0] = { ...track[0], ele: Number.NaN };
    const out = simplifyTrack(track);
    expect(out.length).toBe(800);
    expect('ele' in out[0]).toBe(false);
  });
  it('trackFacts slaat een punt dat geen getal is over', () => {
    const loop = [{ lat: 50, lon: 5, ele: 100 }, { lat: Number.NaN, lon: 5 }, { lat: 50.01, lon: 5, ele: 160 }, { lat: 50.0005, lon: 5, ele: Number.NaN }];
    const facts = trackFacts(loop);
    expect(Number.isFinite(facts.distanceM)).toBe(true);
    expect(facts).toEqual({ distanceM: 2168, ascentM: 60, loop: true });
  });
  it('leeg en één punt', () => {
    expect(simplifyTrack([])).toEqual([]);
    expect(simplifyTrack([START])).toEqual([START]);
    expect(trackFacts([])).toEqual({ distanceM: 0, ascentM: 0, loop: false });
    expect(trackFacts([START])).toEqual({ distanceM: 0, ascentM: 0, loop: false });
  });
  it('afstand, hoogtemeters en lus of niet; een route van A naar B is geen lus', () => {
    const loop = [{ lat: 50, lon: 5, ele: 100 }, { lat: 50.01, lon: 5, ele: 160 }, { lat: 50.0005, lon: 5, ele: 100 }];
    expect(trackFacts(loop)).toEqual({ distanceM: 2168, ascentM: 60, loop: true });
    expect(trackFacts([{ lat: 50, lon: 5 }, { lat: 50.01, lon: 5 }]).loop).toBe(false);
  });
});

describe('startChoices met bewaarde plekken (Andere plek)', () => {
  const home = place(HOME_PLACE_ID, 'Thuis', START, true);
  const at = (id: string, day: string): Place => ({ ...place(id, `Plek ${id}`, north(5)), createdAt: day });
  const a = at('a', '2026-11-01');
  const b = at('b', '2026-11-05');
  const c = at('c', '2026-11-09');
  it('hoogstens vier chips: de recentste plekken tussen Thuis en Andere plek', () => {
    const ch = startChoices('here', [home, a, b, c]);
    expect(ch.chips.map((x) => x.placeId ?? x.kind)).toEqual(['here', HOME_PLACE_ID, 'c', 'other']);
    expect(startChoices('here', [a, b, c]).chips.map((x) => x.placeId ?? x.kind)).toEqual(['here', 'c', 'b', 'other']);
  });
  it('een getikte oudere plek blijft erbij en staat gekozen', () => {
    const ch = startChoices('here', [home, a, b, c], undefined, 'a');
    expect(ch.chips.map((x) => x.placeId ?? x.kind)).toEqual(['here', HOME_PLACE_ID, 'a', 'other']);
    expect(ch.chosen.placeId).toBe('a');
  });
  it('een gezochte plek staat met zijn naam op Andere plek', () => {
    const ch = startChoices('here', [home], undefined, 'other', 'Heuvelrug');
    expect(ch.chips.map((x) => x.label)).toEqual(['Waar je nu bent', 'Thuis', 'Heuvelrug']);
    expect(ch.chosen.kind).toBe('other');
  });
});

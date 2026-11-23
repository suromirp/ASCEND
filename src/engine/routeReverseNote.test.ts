import { describe, expect, it } from 'vitest';
import type { RoutePoint, RouteProposal } from '../models/route';
import { reverseProposal } from './routeAdjust';
import { bigRoadMeters, offsetPoint } from './routeGeometry';
import { ascentNotice, renotedProposal } from './routePlanner';

// Nagemaakt: een startpunt dat nergens is.
const START: RoutePoint = { lat: 52.1, lon: 5.9 };
const at = (i: number, ele: number, extra: Partial<RoutePoint> = {}): RoutePoint => ({ ...offsetPoint(START, 90, i * 100), ele, ...extra });

// Eerst 90 m omhoog, dan 10 m omlaag: omgekeerd is het stijgen veel minder.
const climbing = (): RouteProposal => {
  const eles = [0, 30, 60, 90, 90, 85, 80];
  const points = eles.map((ele, i) => at(i, ele));
  return { style: 'adventure', source: 'brouter', points, distanceM: 600, ascentM: 90, repeatedShare: 0 };
};

describe('een omgekeerde lus rekent zijn amber regel opnieuw uit', () => {
  const target = { distanceKm: 0.6, ascentM: 200 };

  it('de melding bij de ene richting verdwijnt of verandert bij de andere, met het stijgen van de omgekeerde lus', () => {
    const p = climbing();
    const notice = ascentNotice(p, target);
    expect(notice).toBe('Deze lus stijgt 90 m; de training vraagt 200 m.');
    const back = reverseProposal({ ...p, notice });
    // Zonder opnieuw uitrekenen staat de oude regel er nog, met het oude getal.
    expect(back.notice).toBe(notice);
    const renoted = renotedProposal(back, target);
    expect(renoted.ascentM).toBeLessThan(90);
    expect(renoted.notice).toBe(ascentNotice(renoted, target));
    expect(renoted.notice).not.toBe(notice);
    expect(renoted.notice).toContain(`Deze lus stijgt ${Math.round(renoted.ascentM / 10) * 10} m`);
  });

  it('een melding die niet meer geldt verdwijnt, en de omgekeerde omgekeerde lus krijgt de oude regel terug', () => {
    const p = climbing();
    const back = reverseProposal(p);
    // Een training die 100 m vraagt: de lus haalt hem (90 m) en heeft geen melding; omgekeerd wel.
    expect(renotedProposal({ ...p, notice: 'oude regel' }, { distanceKm: 0.6, ascentM: 100 }).notice).toBeUndefined();
    expect(renotedProposal(back, { distanceKm: 0.6, ascentM: 100 }).notice).toBeDefined();
    const again = renotedProposal(reverseProposal(renotedProposal(back, target)), target);
    expect(again.notice).toBe(ascentNotice(p, target));
  });

  it('houdt het getal van de training erbij', () => {
    expect(renotedProposal(reverseProposal(climbing()), target).targetAscentM).toBe(200);
  });
});

describe('de labels schuiven mee bij omkeren', () => {
  it('de ondergrond hoort bij het stuk dat op het punt eindigt, dus hij schuift een punt op', () => {
    const surfaces = [undefined, 'paved', 'paved', 'unpaved', 'unpaved'] as const;
    const points = surfaces.map((surface, i) => at(i, 0, surface ? { surface } : {}));
    const back = reverseProposal({ style: 'adventure', source: 'brouter', points, distanceM: 400, ascentM: 0, repeatedShare: 0 });
    // Het eerste stuk heen (punt 0 naar 1) was verhard en is nu het laatste stuk terug.
    expect(back.points.map((p) => p.surface)).toEqual([undefined, 'unpaved', 'unpaved', 'paved', 'paved']);
  });

  it('een grote weg telt even veel meters voor en na het omkeren', () => {
    const points = [0, 1, 2, 3, 4].map((i) => at(i, 0, i === 1 || i === 2 ? { bigRoad: true as const } : {}));
    const p: RouteProposal = { style: 'adventure', source: 'brouter', points, distanceM: 400, ascentM: 0, repeatedShare: 0, bigRoadM: bigRoadMeters(points) };
    const back = reverseProposal(p);
    expect(bigRoadMeters(back.points)).toBe(bigRoadMeters(points));
    expect(back.bigRoadM).toBe(p.bigRoadM);
    expect(back.points.filter((x) => x.bigRoad)).toHaveLength(2);
  });
});

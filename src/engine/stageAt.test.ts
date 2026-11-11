import { describe, expect, it } from 'vitest';
import { OFF_ROUTE_KM, stageAt, type StageAtStage } from './stageAt';
import type { GeoPoint } from '../models/geo';

// Nagemaakte punten op een rechte lijn van west naar oost (ongeveer 0,79 km per 0,01 graad lengte op 45°).
const P = (lon: number, lat = 45): GeoPoint => ({ lat, lon });
const A = P(6.0);
const B = P(6.1);
const C = P(6.2);
const D = P(6.3);

const one: StageAtStage = { id: 's1', coords: { start: A, end: B, path: [A, P(6.05), B] } };
const two: StageAtStage = { id: 's2', coords: { start: B, end: C, path: [B, P(6.15), C] } };
const three: StageAtStage = { id: 's3', coords: { start: C, end: D, path: [C, P(6.25), D] } };
const route = [one, two, three];

describe('stageAt', () => {
  it('vindt de etappe en het punt langs het spoor', () => {
    const at = stageAt(route, P(6.14, 45.001))!;
    expect(at.stageId).toBe('s2');
    expect(at.index).toBe(1);
    expect(at.method).toBe('path');
    expect(at.pointIndex).toBe(1);
    expect(at.offKm).toBeCloseTo(0.111, 2);
    expect(at.kmFromStart + at.kmToEnd).toBeCloseTo(7.86, 1);
    expect(at.kmFromStart).toBeCloseTo(3.14, 1);
    expect(at.endsHere).toBeUndefined();
  });

  it('zegt niets voor een plek buiten de route', () => {
    expect(stageAt(route, P(6.15, 45.05))).toBeUndefined();
    // Net binnen de grens telt nog wel.
    const near = stageAt(route, P(6.15, 45 + (OFF_ROUTE_KM * 0.9) / 111.2))!;
    expect(near.stageId).toBe('s2');
    expect(stageAt(route, P(5.9))).toBeUndefined();
  });

  it('kiest op een grens de etappe die daar begint en noemt de etappe die daar eindigt', () => {
    const at = stageAt(route, B)!;
    expect(at.stageId).toBe('s2');
    expect(at.kmFromStart).toBe(0);
    expect(at.pointIndex).toBe(0);
    expect(at.endsHere).toBe('s1');
    // Het begin van de route is geen grens tussen twee etappes.
    expect(stageAt(route, A)).toMatchObject({ stageId: 's1', kmFromStart: 0 });
    expect(stageAt(route, A)!.endsHere).toBeUndefined();
    // Het eind van de route hoort bij de laatste etappe.
    expect(stageAt(route, D)).toMatchObject({ stageId: 's3', kmToEnd: 0 });
  });

  it('meet een etappe zonder spoor als een rechte lijn tussen begin en eind', () => {
    const bare: StageAtStage = { id: 's2', coords: { start: B, end: C } };
    const at = stageAt([one, bare, three], P(6.15, 45.001))!;
    expect(at).toMatchObject({ stageId: 's2', method: 'straight' });
    expect(at.kmToEnd).toBeCloseTo(3.93, 1);
  });

  it('geeft een nette lege uitkomst voor een etappe zonder spoor en zonder coordinaten in OSM', () => {
    const none: StageAtStage = { id: 's2' };
    // Midden in het gat: te ver van de buren, dus niets.
    expect(stageAt([one, none, three], P(6.15))).toBeUndefined();
    // De buren werken gewoon.
    expect(stageAt([one, none, three], P(6.05))).toMatchObject({ stageId: 's1' });
    // Het begin van s3 is geen grens met s1: s2 zit ertussen zonder coordinaten.
    expect(stageAt([one, none, three], C)!.endsHere).toBeUndefined();
    // Een kapot spoor valt terug op begin en eind.
    const broken: StageAtStage = { id: 's2', coords: { start: B, end: C, path: [B, { lat: NaN, lon: 6.15 }, C] } };
    expect(stageAt([one, broken, three], P(6.15))).toMatchObject({ stageId: 's2', method: 'straight' });
  });

  it('blijft werken met een oud bestand zonder coordinaten', () => {
    const old: StageAtStage[] = [{ id: 's1' }, { id: 's2' }, { id: 's3' }];
    expect(stageAt(old, P(6.15))).toBeUndefined();
    expect(stageAt([], P(6.15))).toBeUndefined();
    expect(stageAt(route, { lat: NaN, lon: 6.1 })).toBeUndefined();
  });
});

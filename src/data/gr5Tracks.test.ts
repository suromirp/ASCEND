import { describe, expect, it } from 'vitest';
import { GR5_STAGES } from './gr5Stages';
import { GR5_STAGE_ENDS, GR5_OSM_ATTRIBUTION } from './gr5StageEnds';
import { decodeTrack, loadGr5Tracks, withTrack } from './gr5Tracks';
import { distanceKm, pathLengthKm, stagePosition } from '../engine/stagePosition';
import { stageAt } from '../engine/stageAt';
import type { StageCoords } from '../models/geo';

describe('decodeTrack', () => {
  it('maakt punten en hoogte uit de platte reeks', () => {
    expect(decodeTrack([45, 6, 1000, 45.1, 6.1, null], 3)).toEqual({ path: [{ lat: 45, lon: 6 }, { lat: 45.1, lon: 6.1 }], ele: [1000, null] });
    expect(decodeTrack([45, 6, 45.1, 6.1], 2)).toEqual({ path: [{ lat: 45, lon: 6 }, { lat: 45.1, lon: 6.1 }] });
  });

  it('geeft geen spoor voor een lege of kapotte reeks', () => {
    expect(decodeTrack(undefined, 3)).toBeUndefined();
    expect(decodeTrack([], 3)).toBeUndefined();
    expect(decodeTrack([45, 6, 1000], 3)).toBeUndefined();
    expect(decodeTrack([45, 6, 1000, 45.1], 3)).toBeUndefined();
    expect(decodeTrack([45, null, 1000, 45.1, 6.1, 900], 3)).toBeUndefined();
    expect(decodeTrack([45, 6, 45.1, 6.1], 4)).toBeUndefined();
  });
});

describe('withTrack', () => {
  const stage: { id: string; coords?: StageCoords } = { id: 'x', coords: { start: { lat: 45, lon: 6 }, end: { lat: 45.1, lon: 6.1 } } };
  const tracks = { x: { path: [{ lat: 45, lon: 6 }, { lat: 45.05, lon: 6.02 }, { lat: 45.1, lon: 6.1 }] } };

  it('zet het spoor bij begin en eind', () => {
    expect(withTrack(stage, tracks).coords?.path).toHaveLength(3);
  });

  it('laat een etappe zonder coordinaten of zonder spoor zoals hij was', () => {
    expect(withTrack({ id: 'x' }, tracks)).toEqual({ id: 'x' });
    expect(withTrack(stage, {})).toBe(stage);
  });
});

describe('de GR5 uit OpenStreetMap', () => {
  it('geeft elke etappe begin en eind, en de grenzen sluiten op elkaar aan', () => {
    for (const s of GR5_STAGES) expect(s.coords, s.id).toBeDefined();
    for (let i = 1; i < GR5_STAGES.length; i++) {
      expect(GR5_STAGES[i].coords!.start, GR5_STAGES[i].id).toEqual(GR5_STAGES[i - 1].coords!.end);
    }
    expect(Object.keys(GR5_STAGE_ENDS)).toEqual(GR5_STAGES.map((s) => s.id));
    expect(GR5_OSM_ATTRIBUTION).toBe('© OpenStreetMap contributors');
  });

  it('ligt in de Franse Alpen, van het Meer van Genève naar Nice', () => {
    const first = GR5_STAGES[0].coords!.start;
    const last = GR5_STAGES[35].coords!.end;
    expect(first.lat).toBeGreaterThan(46.3);
    expect(last.lat).toBeLessThan(43.8);
    for (const s of GR5_STAGES) {
      for (const p of [s.coords!.start, s.coords!.end]) {
        expect(p.lat).toBeGreaterThan(43.6);
        expect(p.lat).toBeLessThan(46.5);
        expect(p.lon).toBeGreaterThan(6.4);
        expect(p.lon).toBeLessThan(7.4);
      }
    }
  });

  it('heeft per etappe een spoor dat bij begin en eind past en niet ver van de site afwijkt', async () => {
    const tracks = await loadGr5Tracks();
    for (const s of GR5_STAGES) {
      const t = tracks[s.id];
      expect(t, s.id).toBeDefined();
      expect(t.path.length, s.id).toBeGreaterThanOrEqual(10);
      expect(t.path.length, s.id).toBeLessThanOrEqual(600);
      expect(distanceKm(t.path[0], s.coords!.start)).toBeLessThan(0.001);
      expect(distanceKm(t.path.at(-1)!, s.coords!.end)).toBeLessThan(0.001);
      if (t.ele) expect(t.ele).toHaveLength(t.path.length);
      // De lengte volgens OSM binnen 30 procent van wat de site zegt (de grootste verschillen staan in het besluit).
      if (s.km !== null) expect(Math.abs(pathLengthKm(t.path) - s.km) / s.km, s.id).toBeLessThan(0.3);
    }
  });

  it('vindt met stageAt de eigen etappe terug vanuit het midden van elk spoor', async () => {
    const tracks = await loadGr5Tracks();
    const stages = GR5_STAGES.map((s) => withTrack(s, tracks));
    for (const s of stages) {
      const mid = s.coords!.path![Math.floor(s.coords!.path!.length / 2)];
      expect(stageAt(stages, mid)?.stageId, s.id).toBe(s.id);
    }
    // Op de grens tussen etappe 1 en 2 (chalets de Bise) begint etappe 2.
    expect(stageAt(stages, stages[1].coords!.start)).toMatchObject({ stageId: 't1e2', endsHere: 't1e1', kmFromStart: 0 });
  });

  it('meet de regel op je etappe langs het spoor zodra het geladen is', async () => {
    const tracks = await loadGr5Tracks();
    const stage = withTrack(GR5_STAGES[0], tracks);
    const mid = stage.coords!.path![Math.floor(stage.coords!.path!.length / 2)];
    expect(stagePosition([stage], mid)?.method).toBe('path');
    expect(stagePosition([GR5_STAGES[0]], mid)?.method).toBe('straight');
  });
});

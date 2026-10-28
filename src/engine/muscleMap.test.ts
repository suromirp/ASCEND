import { describe, expect, it } from 'vitest';
import { MUSCLE_REGIONS, MUSCLE_SIDE } from '../data/muscleRegions';
import { EXERCISES, exerciseById } from '../data/exercises';
import { MUSCLE_GROUPS } from '../models/exercise';
import { cropFor, mainSide, muscleMarks, muscleNames, pathBounds, regionPath, sidesOf } from './muscleMap';

describe('de vlakken van de spieren', () => {
  it('elk van de 19 spiergroepen heeft een vlak aan de kant waar hij hoort', () => {
    expect(MUSCLE_GROUPS).toHaveLength(19);
    for (const g of MUSCLE_GROUPS) {
      expect(regionPath(g, MUSCLE_SIDE[g]), g).toBeTruthy();
    }
  });

  it('elk vlak hoort bij een bestaande spiergroep en staat binnen het figuur van 200 bij 440', () => {
    for (const side of ['front', 'back'] as const) {
      for (const [g, d] of Object.entries(MUSCLE_REGIONS[side])) {
        expect(MUSCLE_GROUPS as readonly string[], g).toContain(g);
        const b = pathBounds(d!);
        expect(b.x1, `${side} ${g}`).toBeGreaterThan(30);
        expect(b.x2, `${side} ${g}`).toBeLessThanOrEqual(100);
        expect(b.y1, `${side} ${g}`).toBeGreaterThan(40);
        expect(b.y2, `${side} ${g}`).toBeLessThan(400);
      }
    }
  });

  it('is alleen zachte bogen: geen rechte stukken en elk vlak is dicht', () => {
    for (const side of ['front', 'back'] as const) {
      for (const [g, d] of Object.entries(MUSCLE_REGIONS[side])) {
        expect(d, g).not.toMatch(/[LHV]/);
        expect(d!.trim().endsWith('Z'), g).toBe(true);
      }
    }
  });
});

describe('muscleMarks', () => {
  it('geeft elke oefening minstens één hoofdspier, zonder dubbelen', () => {
    for (const e of EXERCISES) {
      const marks = muscleMarks(e);
      expect(marks.some((m) => m.level === 'primary'), e.id).toBe(true);
      expect(new Set(marks.map((m) => m.group)).size, e.id).toBe(marks.length);
      for (const m of marks) expect(regionPath(m.group, m.side), `${e.id} ${m.group}`).toBeTruthy();
    }
  });

  it('zet hoofdspieren voor wie meehelpt en telt een dubbele spier als hoofdspier', () => {
    const marks = muscleMarks({ primary: ['chest'], secondary: ['triceps', 'chest', 'front_delts'] });
    expect(marks.map((m) => `${m.group}:${m.level}`)).toEqual(['chest:primary', 'triceps:secondary', 'front_delts:secondary']);
  });

  it('kiest de kant en laat beide kanten zien als de spieren aan beide zitten', () => {
    const bench = muscleMarks(exerciseById('bench-press')!);
    expect(sidesOf(bench)).toEqual(['front', 'back']);
    expect(mainSide(bench)).toBe('front');
    const pulldown = muscleMarks(exerciseById('lat-pulldown')!);
    expect(mainSide(pulldown)).toBe('back');
    expect(sidesOf(muscleMarks({ primary: ['calves'], secondary: ['hamstrings'] }))).toEqual(['back']);
  });
});

describe('cropFor', () => {
  it('maakt één snede om alle spieren, symmetrisch om de middenlijn', () => {
    const marks = muscleMarks(exerciseById('back-squat')!);
    const [x, y, w, h] = cropFor(marks);
    expect(x + w / 2).toBeCloseTo(100);
    expect(w).toBeGreaterThanOrEqual(96);
    expect(h).toBeGreaterThanOrEqual(84);
    expect(y).toBeGreaterThanOrEqual(-4);
    expect(y + h).toBeLessThanOrEqual(444);
  });

  it('geeft met square een vierkant en nooit minder dan het minimum', () => {
    const [, , w, h] = cropFor(muscleMarks({ primary: ['biceps'], secondary: [] }), { square: true, minW: 100, minH: 100 });
    expect(w).toBe(h);
    expect(w).toBeGreaterThanOrEqual(100);
  });

  it('valt zonder vlakken terug op het hele figuur', () => {
    expect(cropFor([])).toEqual([0, 0, 200, 440]);
  });
});

describe('muscleNames', () => {
  it('schrijft de namen als een zin', () => {
    expect(muscleNames(['quadriceps', 'glutes'])).toBe('Quadriceps, bilspieren');
  });
});

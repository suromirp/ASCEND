import { describe, expect, it } from 'vitest';
import type { InjuryNote } from '../models/injury';
import { BODY_CARE } from '../data/bodyCare';
import { FIGURE_SCALE } from '../data/bodyFigure';
import { BODY_SPOTS } from '../data/bodySpots';
import { BODY_PART_OPTIONS } from '../data/bodyAreas';
import { PROBLEM_AREAS } from '../data/stretches';
import {
  careForSpot, injuryNameFor, openComplaints, openComplaintsBySpot, resolvedComplaints, spotById, spotForComplaint, spotForStretchArea,
  hitBoxes, isValidReportDate, MIN_TAP, offFigureParts, spotsForInjury, spotsForView, stretchesForSpot, stretchMinutes,
} from './bodyMap';

function note(over: Partial<InjuryNote>): InjuryNote {
  return { id: 'n1', date: '2026-10-20', bodyPart: 'Knie rechts', severity: 'licht', ...over };
}

describe('de plekken op het figuur', () => {
  it('heeft plekken voor en achter, met unieke id\'s', () => {
    expect(spotsForView('front').length).toBe(17);
    expect(spotsForView('back').length).toBe(11);
    expect(new Set(BODY_SPOTS.map((s) => s.id)).size).toBe(BODY_SPOTS.length);
  });

  it('zet rechts links in beeld op de voorkant en andersom op de achterkant', () => {
    expect(spotById('knie-r')).toMatchObject({ name: 'Rechterknie', cx: 85 });
    expect(spotById('knie-l')).toMatchObject({ name: 'Linkerknie', cx: 115 });
    expect(spotById('kuit-r')).toMatchObject({ name: 'Rechterkuit', cx: 116 });
    expect(spotById('kuit-l')).toMatchObject({ name: 'Linkerkuit', cx: 84 });
  });

  it('elke plek heeft zorg, rekoefeningen die bestaan en een blessurenaam uit de lijst', () => {
    for (const spot of BODY_SPOTS) {
      expect(BODY_CARE[spot.care], spot.id).toBeDefined();
      for (const id of spot.stretchAreaIds) expect(PROBLEM_AREAS.some((a) => a.id === id), `${spot.id}: ${id}`).toBe(true);
      expect(stretchesForSpot(spot).length, spot.id).toBeGreaterThan(0);
      expect(stretchesForSpot(spot).length, spot.id).toBeLessThanOrEqual(6);
      for (const p of spot.injuryParts) expect((BODY_PART_OPTIONS as readonly string[]).includes(p), `${spot.id}: ${p}`).toBe(true);
    }
  });

  it('elke losse rekoefening van een plek bestaat', () => {
    for (const spot of BODY_SPOTS) {
      if ((spot.extraStretches ?? []).length === 0) continue;
      const fromAreas = spot.stretchAreaIds.flatMap((id) => PROBLEM_AREAS.find((a) => a.id === id)?.stretches ?? []).map((s) => s.name);
      const got = stretchesForSpot(spot).map((s) => s.name);
      expect(got.some((n) => !fromAreas.includes(n)), `${spot.id} mist zijn losse oefening`).toBe(true);
    }
  });

  it('elke plek heeft twee tot vier voorkom-oefeningen en geen lege tekst', () => {
    for (const care of Object.values(BODY_CARE)) {
      expect(care.voorkomen.oefeningen.length).toBeGreaterThanOrEqual(2);
      expect(care.voorkomen.oefeningen.length).toBeLessThanOrEqual(4);
      expect(care.bijLast.length).toBeGreaterThan(0);
      expect(care.voorkomen.basis.length).toBeGreaterThan(10);
    }
  });

  it('gebruikt in geen enkele tekst een gedachtestreepje', () => {
    const all = JSON.stringify([BODY_CARE, BODY_SPOTS]);
    expect(all).not.toMatch(/[–—]/);
  });
});

describe('rekken en losmaken', () => {
  it('geeft bij één groep al haar oefeningen', () => {
    const names = stretchesForSpot(spotById('nek')!).map((s) => s.name);
    expect(names).toEqual(PROBLEM_AREAS.find((a) => a.id === 'nek')!.stretches.map((s) => s.name));
  });

  it('geeft bij meer groepen van elke groep de eerste twee, zonder dubbelen', () => {
    const knee = stretchesForSpot(spotById('knie-r')!);
    expect(knee.map((s) => s.name)).toEqual([
      'Staande quadstretch (evt. met band)',
      'Liggende quadstretch (met band)',
      'Staande kuitstretch tegen muur (knie gestrekt)',
      'Staande kuitstretch tegen muur (knie gebogen)',
      '90/90 heuprotatie',
      'Figure-four liggend',
    ]);
  });

  it('voegt een losse oefening uit een andere lijst toe', () => {
    expect(stretchesForSpot(spotById('borst')!).map((s) => s.name)).toContain('Deurpost borststretch');
  });

  it('rekent de minuten af en telt per kant dubbel', () => {
    expect(stretchMinutes([{ name: 'a', durationSec: 30, note: 'per kant' }, { name: 'b', durationSec: 60 }])).toBe(2);
    expect(stretchMinutes([])).toBe(1);
  });
});

describe('zorg', () => {
  it('zet de algemene rode vlaggen voor die van de plek', () => {
    const care = careForSpot(spotById('knie-r')!);
    expect(care.fysioAll[0]).toBe('een flinke zwelling');
    expect(care.fysioAll.join(' ')).toMatch(/niet kunnen belasten/);
    expect(care.fysioAll.join(' ')).toMatch(/wakker/);
    expect(care.fysioAll.join(' ')).toMatch(/twee weken/);
    expect(care.fysioAll.at(-1)).toMatch(/op slot/);
  });

  it('de borst kent een direct-waarschuwing', () => {
    expect(careForSpot(spotById('borst')!).direct).toMatch(/112/);
  });
});

describe('klachten', () => {
  it('slaat een klacht op onder de naam uit de lijst met de kant erachter', () => {
    expect(injuryNameFor(spotById('knie-r')!)).toBe('Knie rechts');
    expect(injuryNameFor(spotById('ham-l')!)).toBe('Hamstring links');
    expect(injuryNameFor(spotById('onderrug')!)).toBe('Onderrug');
    expect(injuryNameFor(spotById('dij-r')!)).toBe('Quadriceps rechts');
    expect(injuryNameFor(spotById('bil-l')!)).toBe('Bil links');
  });

  it('vindt de plek van een opgeslagen klacht, ook met een eigen schrijfwijze', () => {
    expect(spotsForInjury({ bodyPart: 'Knie rechts' }).map((s) => s.id)).toEqual(['knie-r']);
    expect(spotsForInjury({ bodyPart: 'rechterknie' }).map((s) => s.id)).toEqual(['knie-r']);
    expect(spotsForInjury({ bodyPart: 'Linker KNIE' }).map((s) => s.id)).toEqual(['knie-l']);
  });

  it('een oude klacht zonder kant hoort bij beide kanten', () => {
    expect(spotsForInjury({ bodyPart: 'Knie' }).map((s) => s.id).sort()).toEqual(['knie-l', 'knie-r']);
  });

  it('een klacht zonder plek op het figuur geeft geen plek', () => {
    expect(spotsForInjury({ bodyPart: 'Elleboog' })).toEqual([]);
    expect(spotForComplaint({ bodyPart: 'Elleboog' })).toBeUndefined();
  });

  it('een schouderklacht hoort bij de schouder en de bovenrug, een voetklacht bij de enkel', () => {
    expect(spotsForInjury({ bodyPart: 'Schouder links' }).map((s) => s.id).sort()).toEqual(['bovenrug', 'schouder-l']);
    expect(spotsForInjury({ bodyPart: 'Voet rechts' }).map((s) => s.id)).toEqual(['enkel-r']);
  });

  it('springt vanuit een klacht naar de voorkant als die er is', () => {
    expect(spotForComplaint({ bodyPart: 'Schouder links' })?.id).toBe('schouder-l');
    expect(spotForComplaint({ bodyPart: 'Hamstring rechts' })?.id).toBe('ham-r');
  });

  it('telt alleen open klachten voor de stip', () => {
    const open = note({ id: 'a' });
    const done = note({ id: 'b', bodyPart: 'Kuit links', resolvedDate: '2026-10-22' });
    expect(openComplaintsBySpot([open, done])).toEqual({ 'knie-r': [open] });
  });

  it('sorteert nieuw naar oud en scheidt open van opgelost', () => {
    const a = note({ id: 'a', date: '2026-10-01' });
    const b = note({ id: 'b', date: '2026-10-10' });
    const c = note({ id: 'c', date: '2026-09-01', resolvedDate: '2026-09-10' });
    expect(openComplaints([a, b, c]).map((n) => n.id)).toEqual(['b', 'a']);
    expect(resolvedComplaints([a, b, c]).map((n) => n.id)).toEqual(['c']);
  });
});

describe('oude links', () => {
  it('sturen een groep rekoefeningen naar een plek', () => {
    for (const area of PROBLEM_AREAS) expect(spotForStretchArea(area.id), area.id).toBeDefined();
    expect(spotForStretchArea('kuiten')?.id).toBe('kuit-r');
    expect(spotForStretchArea('bestaat-niet')).toBeUndefined();
    expect(spotForStretchArea(undefined)).toBeUndefined();
  });
});

describe('de tikvakken op het figuur', () => {
  for (const view of ['front', 'back'] as const) {
    const boxes = hitBoxes(view, FIGURE_SCALE);
    const spots = spotsForView(view);

    it(`${view}: elk vak is minstens 44 bij 44 px`, () => {
      expect(boxes.length).toBe(spots.length);
      for (const b of boxes) {
        expect(b.width, b.id).toBeGreaterThanOrEqual(MIN_TAP - 0.01);
        expect(b.height, b.id).toBeGreaterThanOrEqual(MIN_TAP - 0.01);
      }
    });

    it(`${view}: geen twee vakken overlappen elkaar`, () => {
      const clashes: string[] = [];
      boxes.forEach((a, i) => {
        boxes.slice(i + 1).forEach((b) => {
          const ox = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
          const oy = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
          if (ox > 0.01 && oy > 0.01) clashes.push(`${a.id} en ${b.id}: ${ox.toFixed(1)} bij ${oy.toFixed(1)}`);
        });
      });
      expect(clashes).toEqual([]);
    });

    it(`${view}: het midden van elke plek ligt in het eigen vak`, () => {
      for (const s of spots) {
        const b = boxes.find((x) => x.id === s.id)!;
        const x = s.cx * FIGURE_SCALE;
        const y = s.cy * FIGURE_SCALE;
        expect(x >= b.left && x <= b.left + b.width && y >= b.top && y <= b.top + b.height, s.id).toBe(true);
      }
    });
  }

  it('past binnen het figuur en een paar blijft aan zijn eigen kant van de middenlijn', () => {
    for (const view of ['front', 'back'] as const) {
      for (const b of hitBoxes(view, FIGURE_SCALE)) {
        const s = spotById(b.id)!;
        const mid = 100 * FIGURE_SCALE;
        if (s.side && s.cx < 100) expect(b.left + b.width, b.id).toBeLessThanOrEqual(mid + 0.01);
        if (s.side && s.cx > 100) expect(b.left, b.id).toBeGreaterThanOrEqual(mid - 0.01);
      }
    }
  });
});

describe('klachten die niet op het figuur staan', () => {
  it('geeft de namen uit de lijst die geen plek hebben', () => {
    const parts = offFigureParts();
    expect(parts).toContain('Elleboog');
    for (const p of parts) expect(BODY_SPOTS.some((s) => s.injuryParts.includes(p)), p).toBe(false);
    expect(parts).not.toContain('Knie');
  });

  it('neemt een datum van vandaag of eerder aan en geen datum in de toekomst', () => {
    expect(isValidReportDate('2026-10-24', '2026-10-24')).toBe(true);
    expect(isValidReportDate('2026-09-01', '2026-10-24')).toBe(true);
    expect(isValidReportDate('2026-10-25', '2026-10-24')).toBe(false);
    expect(isValidReportDate('', '2026-10-24')).toBe(false);
  });
});

describe('rode vlaggen', () => {
  it('stuurt nek, achillespees en buik bij een alarmsignaal naar de huisarts, dezelfde dag', () => {
    expect(BODY_CARE.nek.direct).toMatch(/dubbelzien/);
    expect(BODY_CARE.achilles.direct).toMatch(/dezelfde dag/);
    expect(BODY_CARE.buik.direct).toMatch(/koorts/);
  });
});

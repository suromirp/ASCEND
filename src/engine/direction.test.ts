import { describe, expect, it } from 'vitest';
import { activeDirection, parseDirection, parseDirectionStart, startMinutes } from './direction';
import { DIRECTIONS, DIRECTION_IDS } from '../data/directions';

const goal = (over: Record<string, unknown> = {}) => ({ id: 'g1', status: 'active' as const, ...over });

describe('parseDirection', () => {
  it('houdt alleen een bekende richting over', () => {
    expect(parseDirection('improve')).toBe('improve');
    expect(parseDirection('doel')).toBeUndefined();
    expect(parseDirection(3)).toBeUndefined();
    expect(parseDirection(undefined)).toBeUndefined();
  });
});

describe('parseDirectionStart', () => {
  it('neemt alleen een echte maandag aan', () => {
    expect(parseDirectionStart('2026-10-26')).toBe('2026-10-26');
    expect(parseDirectionStart('2026-10-27')).toBeUndefined();
    expect(parseDirectionStart('2026-02-30')).toBeUndefined();
    expect(parseDirectionStart('morgen')).toBeUndefined();
    expect(parseDirectionStart(5)).toBeUndefined();
  });
});

describe('activeDirection', () => {
  it('zonder doel en zonder keuze geldt het advies', () => {
    expect(activeDirection({}, [], new Set())).toEqual({ kind: 'direction', id: 'maintain', chosen: false });
  });

  it('zonder doel geldt je keuze', () => {
    expect(activeDirection({ direction: 'easy' }, [], new Set())).toEqual({ kind: 'direction', id: 'easy', chosen: true });
    expect(activeDirection({ direction: 'rommel' }, [], new Set())).toEqual({ kind: 'direction', id: 'maintain', chosen: false });
  });

  it('met een doel met datum of een hoofddoel is het doel de richting', () => {
    expect(activeDirection({ direction: 'easy' }, [goal({ targetDate: '2027-03-13' })], new Set())).toEqual({ kind: 'goal' });
    expect(activeDirection({ direction: 'easy' }, [goal()], new Set(['g1']))).toEqual({ kind: 'goal' });
  });

  it('een doel van de soort Fit blijven of Sterker worden is zelf de richting', () => {
    expect(activeDirection({ direction: 'easy' }, [goal({ kind: 'stronger' })], new Set())).toEqual({ kind: 'direction', id: 'stronger', chosen: true });
    expect(activeDirection({}, [goal({ kind: 'fit' })], new Set())).toEqual({ kind: 'direction', id: 'maintain', chosen: true });
  });

  it('een ander doel zonder datum blijft een doel', () => {
    expect(activeDirection({}, [goal({ kind: 'run_race' })], new Set())).toEqual({ kind: 'goal' });
  });
});

describe('startMinutes', () => {
  it('geeft de vaste getallen van de richtingen', () => {
    for (const id of DIRECTION_IDS) if (id !== 'improve') expect(startMinutes(id, 300)).toBe(DIRECTIONS[id].minutes.value);
  });

  it('laat Fitter worden beginnen bij je gemiddelde, naar boven op 5', () => {
    expect(startMinutes('improve', 132)).toBe(135);
    expect(startMinutes('improve', 135)).toBe(135);
  });

  it('zonder geschiedenis het advies, nooit onder 100 en nooit boven 300', () => {
    expect(startMinutes('improve')).toBe(120);
    expect(startMinutes('improve', 0)).toBe(120);
    expect(startMinutes('improve', 40)).toBe(100);
    expect(startMinutes('improve', 450)).toBe(300);
  });
});

describe('de richtingen als gegevens', () => {
  it('elk getal heeft een bewijslabel en een bron', () => {
    for (const id of DIRECTION_IDS) {
      const d = DIRECTIONS[id];
      for (const s of [d.minutes, d.strength, d.hardShare, d.wave]) {
        expect(s.evidence).toBeTruthy();
        expect(s.source).toContain('docs/onderzoek/');
      }
    }
  });

  it('heeft de advieswaarden van het ontwerp', () => {
    expect([DIRECTIONS.maintain.minutes.value, DIRECTIONS.maintain.strength.value]).toEqual([150, 2]);
    expect([DIRECTIONS.easy.minutes.value, DIRECTIONS.easy.strength.value]).toEqual([90, 1]);
    expect([DIRECTIONS.stronger.minutes.value, DIRECTIONS.stronger.strength.value]).toEqual([120, 3]);
    expect(DIRECTIONS.improve.wave.value?.weeks).toBe(4);
    expect(DIRECTIONS.stronger.wave.value?.weeks).toBe(4);
    expect(DIRECTIONS.maintain.wave.value).toBeNull();
    expect(DIRECTIONS.easy.wave.value).toBeNull();
  });

  it('gebruikt in zijn teksten geen gedachtestreepjes of uitroeptekens', () => {
    for (const id of DIRECTION_IDS) {
      expect(`${DIRECTIONS[id].label} ${DIRECTIONS[id].line} ${DIRECTIONS[id].effect}`).not.toMatch(/[–—!]/);
    }
  });
});

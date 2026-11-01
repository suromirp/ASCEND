import { describe, expect, it } from 'vitest';
import { ABOVE_MISSION_ADVICE, TODAY_CARD_RANK, arrangeToday, resolveAboveMission, type TodayCardId } from './todayCards';

const ALL: TodayCardId[] = ['backup', 'missed', 'advice', 'freshStart', 'morning', 'illnessSign', 'illness'];

describe('arrangeToday', () => {
  it('geeft elke kaart een vaste plek: ziekte, ochtend, vandaag, gisteren, onderhoud', () => {
    expect(TODAY_CARD_RANK.map((c) => c.id)).toEqual(['illness', 'illnessSign', 'morning', 'advice', 'missed', 'freshStart', 'backup']);
    expect(TODAY_CARD_RANK.map((c) => c.group)).toEqual(['safety', 'safety', 'morning', 'today', 'yesterday', 'upkeep', 'upkeep']);
  });

  it('laat met het advies hoogstens één kaart boven de missie, de rest eronder in dezelfde volgorde', () => {
    const { above, below } = arrangeToday(ALL, 1);
    expect(above).toEqual(['illness']);
    expect(below).toEqual(['illnessSign', 'morning', 'advice', 'missed', 'freshStart', 'backup']);
  });

  it('de volgorde hangt niet af van de volgorde waarin de kaarten binnenkomen', () => {
    expect(arrangeToday([...ALL].reverse(), 1)).toEqual(arrangeToday(ALL, 1));
  });

  it('zonder ziekte staat de ochtendkaart boven', () => {
    expect(arrangeToday(['backup', 'morning', 'missed'], 1)).toEqual({ above: ['morning'], below: ['missed', 'backup'] });
  });

  it('een advies of een vraag over gisteren komt nooit boven de missie, ook als hij alleen is', () => {
    expect(arrangeToday(['advice'], 1)).toEqual({ above: [], below: ['advice'] });
    expect(arrangeToday(['missed', 'advice'], 'all')).toEqual({ above: [], below: ['advice', 'missed'] });
  });

  it('de back-up mag boven als er niets voor gaat dat boven mag', () => {
    expect(arrangeToday(['advice', 'missed', 'backup'], 1)).toEqual({ above: ['backup'], below: ['advice', 'missed'] });
  });

  it('twee boven als je dat kiest', () => {
    expect(arrangeToday(ALL, 2)).toEqual({ above: ['illness', 'illnessSign'], below: ['morning', 'advice', 'missed', 'freshStart', 'backup'] });
  });

  it('alles: wat boven mag, staat boven', () => {
    expect(arrangeToday(ALL, 'all')).toEqual({ above: ['illness', 'illnessSign', 'morning', 'freshStart', 'backup'], below: ['advice', 'missed'] });
  });

  it('geen kaarten, niets te doen', () => {
    expect(arrangeToday([], 1)).toEqual({ above: [], below: [] });
  });

  it('een kaart die twee keer meldt staat er één keer', () => {
    expect(arrangeToday(['morning', 'morning'], 1)).toEqual({ above: ['morning'], below: [] });
  });
});

describe('resolveAboveMission', () => {
  it('leest 1, 2 en alles, en anders het advies', () => {
    expect(ABOVE_MISSION_ADVICE).toBe(1);
    expect(resolveAboveMission(1)).toBe(1);
    expect(resolveAboveMission(2)).toBe(2);
    expect(resolveAboveMission('all')).toBe('all');
    expect(resolveAboveMission(undefined)).toBe(1);
    expect(resolveAboveMission(3)).toBe(1);
    expect(resolveAboveMission('2')).toBe(1);
    expect(resolveAboveMission(null)).toBe(1);
  });
});

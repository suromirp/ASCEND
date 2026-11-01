import { describe, expect, it } from 'vitest';
import { ABOVE_MISSION_ADVICE, TODAY_CARD_RANK, arrangeToday, resolveAboveMission, type TodayCardId } from './todayCards';

const ALL: TodayCardId[] = ['backup', 'missed', 'advice', 'freshStart', 'ramp', 'morning', 'illnessSign', 'ill'];

describe('arrangeToday', () => {
  it('geeft elke kaart een vaste plek: veiligheid, ochtend, opbouwen, vandaag, gisteren, onderhoud', () => {
    expect(TODAY_CARD_RANK.map((c) => c.id)).toEqual(['ill', 'illnessSign', 'morning', 'ramp', 'advice', 'missed', 'freshStart', 'backup']);
    expect(TODAY_CARD_RANK.map((c) => c.group)).toEqual(['safety', 'safety', 'morning', 'recovery', 'today', 'yesterday', 'upkeep', 'upkeep']);
  });

  it('laat met het advies één kaart boven de missie, de rest eronder in dezelfde volgorde', () => {
    expect(arrangeToday(['backup', 'missed', 'advice', 'freshStart', 'ramp', 'morning'], 1)).toEqual({ above: ['morning'], below: ['ramp', 'advice', 'missed', 'freshStart', 'backup'] });
  });

  it('veiligheid staat altijd boven, ook boven het maximum, en telt mee', () => {
    // Ziek gemeld en een ziektesignaal (in de praktijk niet tegelijk): allebei boven, verder niets.
    expect(arrangeToday(ALL, 1)).toEqual({ above: ['ill', 'illnessSign'], below: ['morning', 'ramp', 'advice', 'missed', 'freshStart', 'backup'] });
    expect(arrangeToday(['ill', 'morning', 'backup'], 1)).toEqual({ above: ['ill'], below: ['morning', 'backup'] });
    expect(arrangeToday(['ill', 'morning', 'backup'], 2)).toEqual({ above: ['ill', 'morning'], below: ['backup'] });
  });

  it('in de opbouwdagen gaat een kaart die een antwoord vraagt voor weer opbouwen', () => {
    expect(arrangeToday(['ramp', 'illnessSign', 'morning'], 1)).toEqual({ above: ['illnessSign'], below: ['morning', 'ramp'] });
    expect(arrangeToday(['ramp', 'morning'], 1)).toEqual({ above: ['morning'], below: ['ramp'] });
    // Weer opbouwen komt boven als er plek is.
    expect(arrangeToday(['ramp', 'advice', 'backup'], 1)).toEqual({ above: ['ramp'], below: ['advice', 'backup'] });
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
    expect(arrangeToday(['ramp', 'illnessSign', 'morning', 'backup'], 2)).toEqual({ above: ['illnessSign', 'morning'], below: ['ramp', 'backup'] });
  });

  it('alles: wat boven mag, staat boven', () => {
    expect(arrangeToday(ALL, 'all')).toEqual({ above: ['ill', 'illnessSign', 'morning', 'ramp', 'freshStart', 'backup'], below: ['advice', 'missed'] });
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

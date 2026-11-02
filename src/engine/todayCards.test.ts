import { describe, expect, it } from 'vitest';
import { ABOVE_MISSION_ADVICE, ABOVE_MISSION_CHOICES, QUIET_TODAY_LINES, TODAY_CARD_RANK, aboveMissionOverflow, arrangeToday, isSafetyCard, resolveAboveMission, type TodayCardId } from './todayCards';

const ALL: TodayCardId[] = ['backup', 'missed', 'advice', 'freshStart', 'ramp', 'morning', 'illnessSign', 'ill'];

describe('arrangeToday', () => {
  it('geeft elke kaart een vaste plek: veiligheid, ochtend, opbouwen, vandaag, gisteren, onderhoud', () => {
    expect(TODAY_CARD_RANK.map((c) => c.id)).toEqual(['ill', 'illnessSign', 'morning', 'ramp', 'advice', 'stagePosition', 'missed', 'sportAsk', 'freshStart', 'backup', 'backupDue']);
    expect(TODAY_CARD_RANK.map((c) => c.group)).toEqual(['safety', 'safety', 'morning', 'recovery', 'today', 'today', 'yesterday', 'yesterday', 'upkeep', 'upkeep', 'upkeep']);
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

  it('Tijd voor je back-up (de automatische back-up) staat altijd onder de missie', () => {
    expect(arrangeToday(['backupDue'], 1)).toEqual({ above: [], below: ['backupDue'] });
    expect(arrangeToday(['backupDue', 'missed'], 'all')).toEqual({ above: [], below: ['missed', 'backupDue'] });
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

describe('de rustige regels van ronde 2', () => {
  it('de etappe-regel hoort bij vandaag, de vraag over een sport bij gisteren, en geen van beide komt boven de missie', () => {
    const ids = TODAY_CARD_RANK.map((c) => c.id);
    expect(ids.indexOf('stagePosition')).toBe(ids.indexOf('advice') + 1);
    expect(ids.indexOf('sportAsk')).toBe(ids.indexOf('missed') + 1);
    expect(QUIET_TODAY_LINES).toEqual(['stagePosition', 'sportAsk']);
    expect(arrangeToday(['sportAsk', 'stagePosition'], 'all')).toEqual({ above: [], below: ['stagePosition', 'sportAsk'] });
  });

  it('een drukke ochtend: ochtendkaart, back-up, Nieuw begonnen, Niet gedaan?, de rustdag terug, padel en de etappe', () => {
    const busy: TodayCardId[] = ['backup', 'freshStart', 'missed', 'advice', 'morning', 'sportAsk', 'stagePosition', 'backupDue'];
    expect(arrangeToday(busy, 1)).toEqual({ above: ['morning'], below: ['advice', 'stagePosition', 'missed', 'sportAsk', 'freshStart', 'backup', 'backupDue'] });
  });
});

describe('aboveMissionOverflow', () => {
  const ids = TODAY_CARD_RANK.map((c) => c.id);
  it('wat arrangeToday boven zet, gaat nooit over het maximum, voor elke combinatie van kaarten', () => {
    for (let mask = 0; mask < 1 << ids.length; mask++) {
      const present = ids.filter((_, i) => mask & (1 << i));
      for (const limit of ABOVE_MISSION_CHOICES) expect(aboveMissionOverflow(arrangeToday(present, limit).above, limit)).toBe(0);
    }
  });

  it('telt wat te veel is: gewone kaarten boven het maximum en kaarten die nooit boven mogen', () => {
    expect(aboveMissionOverflow(['morning', 'backup'], 1)).toBe(1);
    expect(aboveMissionOverflow(['ill', 'morning'], 1)).toBe(1);
    expect(aboveMissionOverflow(['ill', 'illnessSign'], 1)).toBe(0);
    expect(aboveMissionOverflow(['advice'], 'all')).toBe(1);
    expect(aboveMissionOverflow(['sportAsk', 'morning'], 2)).toBe(1);
    expect(aboveMissionOverflow(['morning', 'ramp', 'backup'], 'all')).toBe(0);
  });

  it('veiligheid is herkenbaar', () => {
    expect(isSafetyCard('ill')).toBe(true);
    expect(isSafetyCard('illnessSign')).toBe(true);
    expect(isSafetyCard('morning')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { WALK_KM_ADVICE, resolveWalkKm, validWalkAscent, validWalkKm, walkAscent, walkDurationLine, walkPlanMinutes, walkPlanTarget, walkPlanText } from './walkPlan';
import { aimWord, failureLine, missScore, proposalNotes, shortLine } from './routePlanner';
import { stepDistance } from './routeAdjust';
import type { RouteProposal } from '../models/route';

describe('Wandeling plannen: van afstand en hoogtewens naar het doel van de zoektocht', () => {
  it('het advies is 5 km; de instelling kent alleen de vier chips', () => {
    expect(WALK_KM_ADVICE).toBe(5);
    expect(resolveWalkKm(undefined)).toBe(5);
    expect(resolveWalkKm(8)).toBe(8);
    expect(resolveWalkKm('12')).toBe(12);
    expect(resolveWalkKm(7)).toBe(5);
  });

  it('geen voorkeur en vlak mikken op nul; heuvelig en pittig per kilometer, nooit onder 20 m', () => {
    expect(walkAscent({ km: 5, climb: 'none' })).toBe(0);
    expect(walkAscent({ km: 5, climb: 'flat' })).toBe(0);
    expect(walkAscent({ km: 5, climb: 'hilly' })).toBe(50);
    expect(walkAscent({ km: 5, climb: 'steep' })).toBe(130);
    expect(walkAscent({ km: 1, climb: 'hilly' })).toBe(20);
    // Anders: een eigen getal gaat voor, op tien meter, tot 2000.
    expect(walkAscent({ km: 5, climb: 'none', ascentM: 234 })).toBe(230);
    expect(walkAscent({ km: 5, climb: 'none', ascentM: 5000 })).toBe(2000);
  });

  it('het doel: de afstand leidend (geen duur), als wandeling gemerkt, vlak alleen bij Vlak', () => {
    expect(walkPlanTarget({ km: 5, climb: 'none' })).toEqual({ distanceKm: 5, ascentM: 0, plannedWalk: true });
    expect(walkPlanTarget({ km: 5, climb: 'flat' })).toEqual({ distanceKm: 5, ascentM: 0, plannedWalk: true, flat: true });
    expect(walkPlanTarget({ km: 3.3, climb: 'hilly' }).distanceKm).toBe(3.5);
    expect(walkPlanTarget({ km: 80, climb: 'none' }).distanceKm).toBe(40);
    expect(walkPlanTarget({ km: 5, climb: 'none' }).minutes).toBeUndefined();
  });

  it('de duur op de wandelnorm, zonder pauzes', () => {
    expect(walkPlanMinutes({ distanceKm: 5, ascentM: 0 })).toBe(75);
    expect(walkDurationLine({ distanceKm: 5, ascentM: 0 })).toBe('Ongeveer 1 uur 15, zonder pauzes.');
    expect(walkPlanText({ distanceKm: 5, ascentM: 0 })).toBe('Je wandeling: 5 km, ongeveer 1 uur 15.');
    expect(walkPlanText({ distanceKm: 8, ascentM: 200 })).toMatch(/^Je wandeling: 8 km, 200 hoogtemeters, ongeveer /);
    // Hoogtemeters kosten tijd.
    expect(walkPlanMinutes({ distanceKm: 5, ascentM: 300 })).toBeGreaterThan(75);
  });

  it('Anders: alleen een getal dat kan', () => {
    expect(validWalkKm(undefined)).toBe(false);
    expect(validWalkKm(0.5)).toBe(false);
    expect(validWalkKm(1)).toBe(true);
    expect(validWalkKm(40)).toBe(true);
    expect(validWalkKm(41)).toBe(false);
    expect(validWalkAscent(0)).toBe(true);
    expect(validWalkAscent(2001)).toBe(false);
  });
});

describe('de zinnen van de planner bij een wandeling', () => {
  const walk = walkPlanTarget({ km: 5, climb: 'hilly' });
  const p = { style: 'adventure', source: 'brouter', points: [], distanceM: 3000, ascentM: 10, repeatedShare: 0 } as unknown as RouteProposal;

  it('"je wandeling" in plaats van "je training"; een training blijft gelijk', () => {
    expect(aimWord(walk)).toBe('je wandeling');
    expect(aimWord({})).toBe('je training');
    expect(shortLine(p, walk)).toBe('3 km, korter dan de 5 km van je wandeling.');
    expect(shortLine(p, { distanceKm: 5, ascentM: 0 })).toBe('3 km, korter dan de 5 km van je training.');
    expect(failureLine('simple', { ok: false, reason: 'nothing' }, false, walk)).toBe('Geen helling gevonden die bij je wandeling past.');
    expect(failureLine('simple', { ok: false, reason: 'nothing' }, false)).toBe('Geen helling gevonden die bij je training past.');
    expect(stepDistance(5, 3, 'longer', true)).toMatchObject({ ok: false, line: expect.stringContaining('niet bij deze wandeling') });
    expect(stepDistance(5, 3, 'longer')).toMatchObject({ ok: false, line: expect.stringContaining('niet bij deze training') });
  });

  it('nooit "training" in de regels bij een lus van een wandeling', () => {
    for (const d of [3000, 5600, 6000]) {
      const notes = proposalNotes({ ...p, distanceM: d }, walk);
      expect(notes.join(' ')).not.toMatch(/training/);
    }
  });

  it('Vlak: van twee lussen even lang wint de vlakste; zonder Vlak telt de stijging niet', () => {
    const flat = walkPlanTarget({ km: 5, climb: 'flat' });
    const none = walkPlanTarget({ km: 5, climb: 'none' });
    const level = { distanceM: 5000, ascentM: 10 };
    const hilly = { distanceM: 5000, ascentM: 120 };
    expect(missScore(level, flat)).toBeLessThan(missScore(hilly, flat));
    expect(missScore(level, none)).toBe(missScore(hilly, none));
    // Een looptraining zonder hoogtemeters rekent zoals altijd.
    expect(missScore(hilly, { distanceKm: 5, ascentM: 0 })).toBe(0);
  });
});

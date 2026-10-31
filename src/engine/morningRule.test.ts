import { describe, expect, it } from 'vitest';
import { morningRule, MORNING_RULE_QUESTION } from './morningRule';
import type { RecoveryMetric } from '../models/metrics';
import { addDays } from '../utils/dates';

// Nagemaakte ochtenden: vier weken met rusthartslag 50, HRV rond 60 en 7 uur 30 slaap, daarna vandaag.
const today = '2026-10-31';
function month(todayValues: Partial<RecoveryMetric>): RecoveryMetric[] {
  const out: RecoveryMetric[] = [];
  for (let i = 28; i >= 1; i--) {
    const date = addDays(today, -i);
    out.push({ id: `intervals.icu:${date}`, date, source: 'import', restingHeartRate: 50, hrv: 60 + (i % 5) - 2, sleepMinutes: 450 });
  }
  out.push({ id: `intervals.icu:${today}`, date: today, source: 'import', ...todayValues });
  return out;
}

describe('de ochtendregel twee van drie', () => {
  it('geeft elk getal een woord oordeel tegen je eigen gewone', () => {
    const r = morningRule(today, month({ restingHeartRate: 54, hrv: 60, sleepMinutes: 455 }))!;
    expect(r.signals.map((s) => s.text)).toEqual(['rusthartslag 4 hoger dan normaal', 'HRV normaal', 'slaap normaal']);
    expect(r.line).toBe('Rusthartslag 4 hoger dan normaal · HRV normaal · slaap normaal');
    expect(r.offCount).toBe(0);
    expect(r.askTired).toBe(false);
  });

  it('een afwijkend getal is nog geen vraag', () => {
    const r = morningRule(today, month({ restingHeartRate: 57, hrv: 61, sleepMinutes: 450 }))!;
    expect(r.offCount).toBe(1);
    expect(r.askTired).toBe(false);
  });

  it('twee van de drie afwijkend: de ochtend vraagt of je moe bent', () => {
    const r = morningRule(today, month({ restingHeartRate: 56, hrv: 49, sleepMinutes: 440 }))!;
    expect(r.offCount).toBe(2);
    expect(r.askTired).toBe(true);
    expect(MORNING_RULE_QUESTION).toBe('Twee van de drie wijken af. Ben je moe?');
  });

  it('slaap telt af onder 6 uur of een uur korter dan normaal, met de duur in woorden', () => {
    const shorter = morningRule(today, month({ restingHeartRate: 50, hrv: 60, sleepMinutes: 380 }))!;
    expect(shorter.signals.find((s) => s.key === 'sleep')).toMatchObject({ off: true, text: 'slaap 1 uur 10 korter dan normaal' });
    const bitShort = morningRule(today, month({ restingHeartRate: 50, hrv: 60, sleepMinutes: 420 }))!;
    expect(bitShort.signals.find((s) => s.key === 'sleep')).toMatchObject({ off: false, verdict: 'korter' });
  });

  it('een nacht die je niet goed gemeten noemde telt niet voor slaap en HRV', () => {
    const r = morningRule(today, month({ restingHeartRate: 56, hrv: 45, sleepMinutes: 200 }), { ignoredNights: new Set([today]) });
    expect(r).toBeUndefined();
    const withExcluded = morningRule(today, month({ restingHeartRate: 56, hrv: 45, sleepMinutes: 200 }), { excludedMornings: new Set([today]) });
    expect(withExcluded).toBeUndefined();
  });

  it('zonder getallen van vandaag of zonder een week eigen ochtenden geen oordeel over hartslag', () => {
    expect(morningRule(today, month({}).slice(0, 28))).toBeUndefined();
    const few: RecoveryMetric[] = [{ id: 'a', date: today, source: 'import', restingHeartRate: 60, hrv: 40, sleepMinutes: 300 }];
    expect(morningRule(today, few)).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import { REST_ALARM_PATTERN, restAlertChannels, restVibrationPattern } from './restVibration';
import type { RestSound } from './strengthSettings';

const SOUNDS: RestSound[] = ['chime', 'bell', 'beep', 'boxing', 'whistle', 'gong'];
const pulses = (p: number[]) => p.filter((_, i) => i % 2 === 0);
const total = (p: number[]) => p.reduce((a, b) => a + b, 0);

describe('restVibrationPattern: het trilpatroon bij het gekozen geluid', () => {
  it('Boksbel drie snelle tikken, Fluitje twee korte, Gong één lange', () => {
    const boxing = restVibrationPattern('boxing');
    expect(pulses(boxing)).toHaveLength(3);
    expect(Math.max(...pulses(boxing))).toBeLessThanOrEqual(100);

    const whistle = restVibrationPattern('whistle');
    expect(pulses(whistle)).toHaveLength(2);
    expect(Math.max(...pulses(whistle))).toBeLessThanOrEqual(200);

    const gong = restVibrationPattern('gong');
    expect(pulses(gong)).toHaveLength(1);
    expect(gong[0]).toBeGreaterThanOrEqual(600);
  });

  it('de andere geluiden volgen hun ritme: klokjes drie tonen met een lange laatste, bel één, piep vier', () => {
    const chime = restVibrationPattern('chime');
    expect(pulses(chime)).toHaveLength(3);
    expect(chime[chime.length - 1]).toBeGreaterThan(chime[0]);
    expect(pulses(restVibrationPattern('bell'))).toHaveLength(1);
    expect(pulses(restVibrationPattern('beep'))).toHaveLength(4);
  });

  it('elk geluid heeft een eigen patroon, en geen twee voelen hetzelfde', () => {
    const seen = new Set(SOUNDS.map((s) => restVibrationPattern(s).join(',')));
    expect(seen.size).toBe(SOUNDS.length);
    // En geen ervan is het vaste patroon van vroeger.
    for (const s of SOUNDS) expect(restVibrationPattern(s)).not.toEqual([...REST_ALARM_PATTERN]);
  });

  it('is een geldig patroon: trillen, pauze, trillen; geheel getallen; geen stoot korter dan 70 ms; niet te lang', () => {
    for (const s of SOUNDS) {
      const p = restVibrationPattern(s);
      expect(p.length % 2).toBe(1);
      expect(p.every((n) => Number.isInteger(n) && n > 0)).toBe(true);
      expect(Math.min(...pulses(p))).toBeGreaterThanOrEqual(70);
      expect(total(p)).toBeLessThanOrEqual(1500);
    }
  });

  it('een onbekend of ontbrekend geluid houdt het vaste patroon', () => {
    expect(restVibrationPattern(undefined)).toEqual([...REST_ALARM_PATTERN]);
    expect(restVibrationPattern('trompet')).toEqual([...REST_ALARM_PATTERN]);
    expect(restVibrationPattern('toString')).toEqual([...REST_ALARM_PATTERN]);
  });

  it('geeft telkens een nieuwe lijst: niemand kan het patroon van een ander veranderen', () => {
    const a = restVibrationPattern('gong');
    a[0] = 1;
    expect(restVibrationPattern('gong')[0]).toBe(900);
  });
});

describe('restAlertChannels: wat het signaal doet', () => {
  it('geluid en trillen, alleen trillen, alleen geluid, niets', () => {
    expect(restAlertChannels('sound_vibrate')).toEqual({ sound: true, vibrate: true });
    expect(restAlertChannels('vibrate')).toEqual({ sound: false, vibrate: true });
    expect(restAlertChannels('sound')).toEqual({ sound: true, vibrate: false });
    expect(restAlertChannels('off')).toEqual({ sound: false, vibrate: false });
  });
});

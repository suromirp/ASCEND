import { describe, expect, it } from 'vitest';
import { healthEnableNote, healthOffNote } from './healthConnectNote';

const ALL = ['workouts', 'distance', 'sleep', 'restingHeartRate', 'heartRateVariability'] as const;

describe('wat je ziet na het aanzetten van Health Connect', () => {
  it('aan en opgehaald: wat er binnenkwam', () => {
    expect(healthEnableNote({ status: 'on', granted: [...ALL], sync: { status: 'ok', activities: 2, mornings: 1 } })).toEqual({ text: 'Health Connect staat aan. 2 trainingen en 1 ochtend opgehaald.', tone: 'ok' });
    expect(healthEnableNote({ status: 'on', granted: [...ALL], sync: { status: 'ok', activities: 0, mornings: 0 } }).text).toBe('Health Connect staat aan. Er stond nog niets nieuws in.');
  });

  it('niet alles vrijgegeven: dat staat erbij', () => {
    expect(healthEnableNote({ status: 'on', granted: ['sleep'], sync: { status: 'ok', activities: 0, mornings: 3 } }).text).toBe(
      'Health Connect staat aan. 3 ochtenden opgehaald. Je gaf niet alles vrij: trainingen, afstand, rusthartslag en HRV haalt ASCEND niet op.',
    );
  });

  it('aan, maar het ophalen lukte nog niet', () => {
    expect(healthEnableNote({ status: 'on', granted: [...ALL], sync: { status: 'error', kind: 'timeout', message: 'Health Connect gaf niet op tijd antwoord.' } })).toEqual({
      text: 'Health Connect staat aan, maar ophalen lukte nog niet. Health Connect gaf niet op tijd antwoord.',
      tone: 'warn',
    });
  });

  it('geweigerd, niet geinstalleerd, te oud of op het web: het blijft uit en je leest waarom', () => {
    expect(healthEnableNote({ status: 'denied' })).toMatchObject({ tone: 'warn', openSettings: true });
    expect(healthEnableNote({ status: 'denied' }).text).toMatch(/^Je gaf geen toestemming/);
    expect(healthEnableNote({ status: 'not-installed' }).text).toMatch(/Play Store/);
    expect(healthEnableNote({ status: 'needs-update' }).text).toMatch(/bijgewerkt/);
    expect(healthEnableNote({ status: 'web' }).text).toMatch(/Android-app/);
    expect(healthEnableNote({ status: 'error', message: 'Ophalen uit Health Connect lukte niet.' })).toEqual({ text: 'Ophalen uit Health Connect lukte niet.', tone: 'warn' });
  });

  it('uitgezet', () => {
    expect(healthOffNote()).toEqual({ text: 'Health Connect staat uit. De opgehaalde trainingen zijn van je telefoon gehaald; je logs blijven staan.', tone: 'ok' });
  });

  it('geen gedachtestreepjes', () => {
    for (const status of ['denied', 'not-installed', 'needs-update', 'web'] as const) expect(healthEnableNote({ status }).text).not.toMatch(/[–—]/);
  });
});

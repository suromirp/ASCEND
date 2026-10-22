import { describe, expect, it } from 'vitest';
import { planRestore } from './scrollRestore';

const input = { target: 1800, scrollHeight: 3000, clientHeight: 800, elapsedMs: 0, timeoutMs: 2500 };

describe('planRestore', () => {
  it('zet meteen terug als de pagina lang genoeg is', () => {
    expect(planRestore(input)).toEqual({ set: 1800, done: true });
  });

  it('wacht zolang de pagina nog te kort is', () => {
    expect(planRestore({ ...input, scrollHeight: 1000, elapsedMs: 300 })).toEqual({ set: null, done: false });
  });

  it('zet precies op het laagste punt als de pagina net lang genoeg is', () => {
    expect(planRestore({ ...input, scrollHeight: 2600 })).toEqual({ set: 1800, done: true });
  });

  it('geeft op na de tijd en gaat zo ver als kan', () => {
    expect(planRestore({ ...input, scrollHeight: 1500, elapsedMs: 2500 })).toEqual({ set: 700, done: true });
  });

  it('bovenaan hoeft niet te wachten', () => {
    expect(planRestore({ ...input, target: 0, scrollHeight: 100 })).toEqual({ set: 0, done: true });
  });

  it('een pagina korter dan het scherm geeft 0', () => {
    expect(planRestore({ ...input, scrollHeight: 500, elapsedMs: 3000 })).toEqual({ set: 0, done: true });
  });

  it('ronde en negatieve waarden komen goed', () => {
    expect(planRestore({ ...input, target: 1799.6 })).toEqual({ set: 1800, done: true });
    expect(planRestore({ ...input, target: -40 })).toEqual({ set: 0, done: true });
  });
});

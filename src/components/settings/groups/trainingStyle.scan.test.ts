import { describe, expect, it } from 'vitest';
import src from './TrainingStyleSheet.tsx?raw';
import { saveWithLimit } from '../../forge/stepUndo';

// Calisthenics per training (TrainingStyleSheet.tsx): een voorstel met Liever niet links en Akkoord rechts, één
// opslag met een grens in tijd, Ongedaan maken, en het blad van de instellingen (useSheetClose, greep).
describe('het blad Calisthenics per training', () => {
  it('Liever niet staat links van Akkoord; na Akkoord Ongedaan maken', () => {
    const no = src.indexOf('>Liever niet</button>');
    const yes = src.indexOf('>Akkoord</button>');
    expect(no).toBeGreaterThan(0);
    expect(yes).toBeGreaterThan(no);
    expect(src).toContain('>Ongedaan maken</TextButton>');
  });

  it('gebruikt het blad van de instellingen en de gewone Segmented, met 44 px', () => {
    expect(src).toContain("from '../Sheet'");
    expect(src).toMatch(/<Segmented\s+tall/);
  });

  it('schrijft alleen via de engine en één opslag met een grens in tijd', () => {
    expect(src).toContain('withStyleAccepted(');
    expect(src).toContain('withStyleUndone(');
    expect(src.match(/updateSettings\(/g)?.length).toBe(2);
    expect(src.match(/saveWithLimit\(/g)?.length).toBe(2);
  });

  it('geen losse kleur, geen gedachtestreepje, geen eigen animatie, niets onder 12 px', () => {
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
    expect(src).not.toMatch(/[\u2013\u2014]/);
    expect(src).not.toMatch(/animate-|transition/);
    expect(src).not.toMatch(/text-\[(\d|1[01])px\]|text-\[11/);
  });
});

describe('een fout halverwege', () => {
  it('een opslag die faalt of te laat is, geeft failed; er is maar één opslag, dus niets half', async () => {
    expect(await saveWithLimit(() => Promise.reject(new Error('stuk')), 50)).toBe('failed');
    expect(await saveWithLimit(() => new Promise(() => undefined), 20)).toBe('failed');
    expect(await saveWithLimit(() => Promise.resolve(), 50)).toBe('done');
  });

  it('Ongedaan maken blijft staan als hij niet lukte', () => {
    expect(src).toContain("state === 'undoFailed'");
    expect(src).toContain("state !== 'undone' && (");
  });
});

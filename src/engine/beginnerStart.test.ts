import { describe, expect, it } from 'vitest';
import { beginnerStartLine, isBeginnerStart, parseBeginnerStart, BEGINNER_WEEKS } from './beginnerStart';
import type { SessionLog } from '../models/training';
import { addDays } from '../utils/dates';

// Nagemaakte logs.
const START = '2026-11-02';
const log = (id: string, daysBefore: number, type: SessionLog['type'] = 'cardio'): SessionLog => ({
  id, templateId: 'tpl_easy_run', type, completedDate: addDays(START, -daysBefore), completedAt: `${addDays(START, -daysBefore)}T10:00:00.000Z`, variant: 'full', durationMinutes: 40, source: 'manual',
});
const many = (n: number) => Array.from({ length: n }, (_, i) => log(`l${i}`, 1 + Math.floor((i * 55) / n)));

describe('parseBeginnerStart', () => {
  it('alleen een bekende waarde, anders auto', () => {
    expect(parseBeginnerStart('ja')).toBe('ja');
    expect(parseBeginnerStart('nee')).toBe('nee');
    expect(parseBeginnerStart('misschien')).toBe('auto');
    expect(parseBeginnerStart(undefined)).toBe('auto');
  });
});

describe('isBeginnerStart', () => {
  it('auto: minder dan twee keer per week in de acht weken voor de start', () => {
    expect(isBeginnerStart('auto', [], START)).toBe(true);
    expect(isBeginnerStart('auto', many(15), START)).toBe(true);
    expect(isBeginnerStart('auto', many(16), START)).toBe(false);
  });

  it('herstel telt niet als sporten, en logs van na de start ook niet', () => {
    const recovery = Array.from({ length: 20 }, (_, i) => log(`h${i}`, 1 + i * 2, 'recovery'));
    expect(isBeginnerStart('auto', recovery, START)).toBe(true);
    const after = Array.from({ length: 20 }, (_, i) => ({ ...log(`a${i}`, 0), completedDate: addDays(START, i) }));
    expect(isBeginnerStart('auto', after, START)).toBe(true);
  });

  it('ja en nee winnen van wat de logs zeggen', () => {
    expect(isBeginnerStart('ja', many(40), START)).toBe(true);
    expect(isBeginnerStart('nee', [], START)).toBe(false);
  });

  it('zonder startmaandag geen beginnersstart', () => {
    expect(isBeginnerStart('auto', [], undefined)).toBe(false);
  });
});

describe('beginnerStartLine', () => {
  it('zegt het in een zin en loopt vanzelf af', () => {
    expect(beginnerStartLine(START, START)).toBe('Je begint rustig: de eerste vier weken alleen makkelijk, de eerste pittige training pas daarna. Zo went je lichaam eerst aan het ritme.');
    expect(beginnerStartLine(START, addDays(START, 7 * BEGINNER_WEEKS))).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { strengthTargetFor, reshapeStrength } from './directionStrength';
import { isStrengthTemplateId } from './weekShape';

const templates = buildDefaultProgramData().templates;
const strengthIn = (days: Record<string, number>) => Object.keys(days).filter(isStrengthTemplateId);

describe('strengthTargetFor', () => {
  it('volgt de richting en hoogstens drie, het aantal krachtsjablonen', () => {
    expect(strengthTargetFor('stronger', {})).toBe(3);
    expect(strengthTargetFor('maintain', {})).toBe(2);
    expect(strengthTargetFor('improve', {})).toBe(2);
    expect(strengthTargetFor('easy', {})).toBe(1);
    expect(strengthTargetFor('easy', { strength: 4 })).toBe(3);
  });
});

describe('reshapeStrength', () => {
  it('laat een week met het goede aantal kracht ongemoeid', () => {
    expect(reshapeStrength({ templates, weekShape: { days: { tpl_upper_a: 2, tpl_lower_a: 4, tpl_easy_run: 3, tpl_long_run: 6 } }, target: 2 })).toBeUndefined();
  });

  it('haalt kracht weg tot het doel, de laatste in de volgorde eerst, en laat de andere dagen staan', () => {
    const r = reshapeStrength({ templates, weekShape: { days: { tpl_upper_a: 2, tpl_lower_a: 4, tpl_upper_b: 5, tpl_easy_run: 3, tpl_long_run: 6, tpl_herstel: 1 } }, target: 1 })!;
    expect(r.from).toBe(3);
    expect(r.to).toBe(1);
    expect(r.removed).toEqual(['tpl_upper_b', 'tpl_lower_a']);
    expect(r.added).toEqual([]);
    expect(r.shape.days).toEqual({ tpl_upper_a: 2, tpl_easy_run: 3, tpl_long_run: 6, tpl_herstel: 1 });
    expect(r.strategy).toEqual({ sessionTemplateIds: ['tpl_upper_a'], sessionsPerWeek: 1, splitType: 'full_body' });
  });

  it('zonder eigen weekvorm gaat het gewone patroon uit, met alles op zijn vaste dag', () => {
    const r = reshapeStrength({ templates, target: 2 })!;
    expect(r.from).toBe(3);
    expect(strengthIn(r.shape.days)).toHaveLength(2);
    expect(r.removed).toEqual(['tpl_upper_b']);
    expect(r.shape.days.tpl_long_run).toBeDefined();
    expect(r.shape.days.tpl_herstel).toBeDefined();
  });

  it('zet er kracht bij op een vrije dag waar je kunt, nooit op de rustdag en nooit op een bezette dag', () => {
    const r = reshapeStrength({ templates, weekShape: { days: { tpl_upper_a: 2, tpl_easy_run: 4, tpl_long_run: 6, tpl_herstel: 1 }, allowed: [1, 2, 3, 4, 5, 6, 7] }, target: 3, restDay: 1 })!;
    expect(r.from).toBe(1);
    expect(r.to).toBe(3);
    expect(r.added).toEqual(['tpl_lower_a', 'tpl_upper_b']);
    const days = Object.entries(r.shape.days).filter(([id]) => id !== 'tpl_herstel').map(([, d]) => d);
    expect(new Set(days).size).toBe(days.length);
    expect(days).not.toContain(1);
    expect(r.shape.days.tpl_upper_a).toBe(2);
    expect(r.shape.allowed).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('zet kracht alleen op dagen die je kunt', () => {
    const r = reshapeStrength({ templates, weekShape: { days: { tpl_upper_a: 2, tpl_easy_run: 4, tpl_long_run: 7 }, allowed: [2, 4, 5, 7] }, target: 2 })!;
    expect(r.shape.days.tpl_lower_a).toBe(5);
  });

  it('verandert niets als er geen vrije dag is', () => {
    expect(reshapeStrength({ templates, weekShape: { days: { tpl_upper_a: 2, tpl_easy_run: 4, tpl_long_run: 7 }, allowed: [2, 4, 7] }, target: 2 })).toBeUndefined();
  });

  it('houdt een week zonder kracht zonder kracht', () => {
    expect(reshapeStrength({ templates, weekShape: { days: { tpl_easy_run: 2, tpl_long_run: 6 } }, target: 3 })).toBeUndefined();
  });

  it('beschrijft wat erbij komt en wat vervalt in gewone zinnen', () => {
    const r = reshapeStrength({ templates, weekShape: { days: { tpl_upper_a: 2, tpl_lower_a: 4, tpl_upper_b: 5, tpl_easy_run: 3, tpl_long_run: 6 } }, target: 1 })!;
    expect(r.lines[0]).toBe('Kracht gaat van 3 naar 1 keer per week.');
    expect(r.lines[1]).toMatch(/^Vervalt: /);
    expect(r.lines.join(' ')).not.toMatch(/[–—]/);
    const up = reshapeStrength({ templates, weekShape: { days: { tpl_upper_a: 2, tpl_easy_run: 4, tpl_long_run: 6 } }, target: 2 })!;
    expect(up.lines[0]).toBe('Kracht gaat van 1 naar 2 keer per week.');
    expect(up.lines[1]).toMatch(/^Erbij: .* op (maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\.$/);
  });
});

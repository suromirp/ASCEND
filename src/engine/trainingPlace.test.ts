import { describe, expect, it } from 'vitest';
import type { SessionTemplate } from '../models/training';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { defaultPlace, placeChoices, placeHasRoute, resolvePlace } from './trainingPlace';

const { templates } = buildDefaultProgramData();
const byId = (id: string) => templates.find((t) => t.id === id) as SessionTemplate;
const easy = byId('tpl_easy_run');

describe('Waar train je? bij een geplande training', () => {
  it('de keuzes komen uit data/modalities.ts, met hun rol', () => {
    const choices = placeChoices('tpl_easy_run');
    expect(choices.map((c) => c.key)).toContain('run_treadmill');
    expect(choices.find((c) => c.key === 'run_outdoor')).toMatchObject({ roleLabel: 'Beste keuze', environment: 'outdoor', locked: false });
    expect(placeChoices('tpl_upper_a')).toEqual([]);
  });
  it('de standaard is de beste keuze; op een rustdag de wandeling', () => {
    expect(defaultPlace(easy)).toBe('run_outdoor');
    expect(defaultPlace({ id: 'tpl_herstel', type: 'recovery' })).toBe('recovery_walk');
  });
  it('een bewaarde keuze geldt; een kapotte, onbekende of vergrendelde valt terug op de standaard', () => {
    expect(resolvePlace(easy, 'run_treadmill')).toBe('run_treadmill');
    for (const stored of [undefined, null, 3, {}, 'bestaat_niet']) expect(resolvePlace(easy, stored)).toBe('run_outdoor');
    const locked = placeChoices('tpl_bergconditie').find((c) => c.locked);
    if (locked) expect(resolvePlace(byId('tpl_bergconditie'), locked.key)).toBe(defaultPlace(byId('tpl_bergconditie')));
  });
  it('een route hoort bij Buiten, niet bij Loopband', () => {
    expect(placeHasRoute(easy, 'run_outdoor')).toBe(true);
    expect(placeHasRoute(easy, 'run_treadmill')).toBe(false);
  });
});

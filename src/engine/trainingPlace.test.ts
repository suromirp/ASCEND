import { describe, expect, it } from 'vitest';
import type { SessionTemplate } from '../models/training';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';
import { defaultPlace, placeChoices, placeHasRoute, plannedOn, resolvePlace, routeShownFor } from './trainingPlace';

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

describe('routeShownFor: dezelfde regel op Vandaag, in het blad achter de i en in De avond ervoor', () => {
  it('Loopband bewaard: geen route; Buiten, niets of iets kapots: wel', () => {
    expect(routeShownFor(easy, 'run_treadmill')).toBe(false);
    for (const stored of ['run_outdoor', undefined, null, 7, 'bestaat_niet']) expect(routeShownFor(easy, stored)).toBe(true);
    expect(routeShownFor(undefined, 'run_outdoor')).toBe(false);
    expect(routeShownFor(byId('tpl_upper_a'), undefined)).toBe(false);
  });
  it('plannedOn vindt de geplande training van die dag, overgeslagen telt niet', () => {
    const p = (id: string, date: string, status: PlannedSession['status'] = 'planned', order = 0): PlannedSession => ({ id, templateId: 'tpl_easy_run', scheduledDate: date, weekStartDate: '2026-11-09', status, order });
    expect(plannedOn([p('a', '2026-11-11', 'skipped'), p('b', '2026-11-11', 'planned', 1), p('c', '2026-11-12')], 'tpl_easy_run', '2026-11-11')?.id).toBe('b');
    expect(plannedOn([p('c', '2026-11-12')], 'tpl_easy_run', '2026-11-11')).toBeUndefined();
  });
});

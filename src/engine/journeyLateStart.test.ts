// Backlogpunt G (Lookout profiel GR5, 14 november): de Reisplanner bij een late start, taken die op
// elkaar bouwen, en de taken die bij hutten, tent of beide horen. Nagemaakte data.
import { describe, it, expect } from 'vitest';
import { JOURNEY_TASKS, type JourneyTask } from '../data/journeyTasks';
import { journeyTimeline, markDone, pickJourneyTask, tasksForShelter } from './journey';

const t = (id: string, window: [number, number], extra: Partial<JourneyTask> = {}): JourneyTask => ({ id, title: id, why: '', window, ...extra });

describe('een late start: taken waarvan de tijd voorbij is', () => {
  // Doel 15 maart 2027, vandaag maandag 16 november 2026: 17 weken.
  const GOAL = '2027-03-15';
  const TODAY = '2026-11-16';

  it('staan samen bovenaan onder Nu regelen, niet onder maanden die al voorbij zijn', () => {
    const groups = journeyTimeline(tasksForShelter(JOURNEY_TASKS, 'tent'), undefined, TODAY, GOAL);
    expect(groups[0].catchUp).toBe(true);
    // Geen maand vóór deze maand meer, behalve de groep Nu regelen.
    for (const g of groups.slice(1)) expect(g.month >= '2026-11-01').toBe(true);
    // Alles in Nu regelen is open en voorbij; geen enkele lapsed taak staat onder een maand.
    for (const row of groups[0].tasks) expect(row.status).toBe('lapsed');
    for (const g of groups.slice(1)) for (const row of g.tasks) expect(row.status).not.toBe('lapsed');
    // In de volgorde waarin ze op elkaar bouwen: kiezen voor kopen.
    const ids = groups[0].tasks.map((r) => r.task.id);
    expect(ids.indexOf('grote-drie-kiezen')).toBeLessThan(ids.indexOf('grote-drie-kopen'));
  });

  it('een start in maart begint niet met taken van juli vorig jaar', () => {
    const groups = journeyTimeline(tasksForShelter(JOURNEY_TASKS, 'tent'), undefined, '2027-03-01', '2027-08-01');
    const firstMonth = groups.find((g) => !g.catchUp)!.month;
    expect(firstMonth >= '2027-03-01').toBe(true);
    expect(groups.some((g) => g.month.startsWith('2026-07'))).toBe(false);
  });

  it('een gedane taak uit een voorbije maand blijft onder zijn maand, niet bij Nu regelen', () => {
    const state = markDone(undefined, 'verzekering', '2026-11-16');
    const groups = journeyTimeline(tasksForShelter(JOURNEY_TASKS, 'tent'), state, TODAY, GOAL);
    expect(groups[0].tasks.some((r) => r.task.id === 'verzekering')).toBe(false);
  });

  it('zonder voorbije taken is er geen groep Nu regelen', () => {
    const groups = journeyTimeline([t('a', [10, 5])], undefined, TODAY, GOAL);
    expect(groups.some((g) => g.catchUp)).toBe(false);
  });
});

describe('een taak die op een andere bouwt', () => {
  const tasks = [t('kies', [28, 22]), t('test', [24, 17], { after: 'kies' })];

  it('komt pas als taak van de week als de taak eronder af is', () => {
    // 20 weken voor het doel: kies is voorbij, test past. Toch eerst kies.
    const pick = pickJourneyTask(tasks, undefined, '2027-03-15', '2027-08-02');
    expect(pick?.task.id).toBe('kies');
    const done = markDone(undefined, 'kies', '2027-03-15');
    expect(pickJourneyTask(tasks, done, '2027-03-15', '2027-08-02')?.task.id).toBe('test');
  });

  it('in de echte lijst: testen van de brander wacht op kiezen', () => {
    const list = tasksForShelter(JOURNEY_TASKS, 'tent');
    // 17 weken voor 15 maart: kookset-testen past nog, kookset is voorbij.
    const pick = pickJourneyTask(list, markDone(undefined, 'grote-drie-kiezen', '2026-11-16'), '2026-11-16', '2027-03-15');
    expect(pick?.task.id).not.toBe('kookset-testen');
  });

  it('een kring in de lijst loopt niet eindeloos', () => {
    const loop = [t('x', [10, 5], { after: 'y' }), t('y', [12, 6], { after: 'x' })];
    expect(pickJourneyTask(loop, undefined, '2027-01-04', '2027-03-15')?.task.id).toBeDefined();
  });
});

describe('hutten, tent of beide', () => {
  const ids = (s: 'hut' | 'tent' | 'both') => tasksForShelter(JOURNEY_TASKS, s).map((x) => x.id);

  it('met tent: tent, brander en bivak, geen hutten reserveren', () => {
    expect(ids('tent')).toContain('grote-drie-kopen');
    expect(ids('tent')).toContain('bivak-reserveren');
    expect(ids('tent')).not.toContain('hutten-reserveren');
  });

  it('in hutten: geen tent, brander of bivak, wel hutten reserveren', () => {
    for (const id of ['grote-drie-kiezen', 'grote-drie-kopen', 'kookset', 'kookset-testen', 'eerste-nacht', 'bivakweekend', 'bivak-reserveren', 'reservering-data', 'regels-controle']) {
      expect(ids('hut')).not.toContain(id);
    }
    expect(ids('hut')).toContain('hutten-reserveren');
    // De taken voor iedereen blijven.
    expect(ids('hut')).toContain('verzekering');
  });

  it('beide: de taken van allebei', () => {
    expect(ids('both')).toContain('bivak-reserveren');
    expect(ids('both')).toContain('hutten-reserveren');
  });

  it('elke taak met after verwijst naar een taak in dezelfde lijst', () => {
    for (const s of ['hut', 'tent', 'both'] as const) {
      const list = tasksForShelter(JOURNEY_TASKS, s);
      for (const task of list) if (task.after) expect(list.some((x) => x.id === task.after), `${s}: ${task.id}`).toBe(true);
    }
  });
});

describe('een doeldatum die voorbij is', () => {
  it('geen taak van de week, en alles wat open bleef staat bij Nu regelen zonder te crashen', () => {
    const list = tasksForShelter(JOURNEY_TASKS, 'tent');
    expect(pickJourneyTask(list, undefined, '2027-03-20', '2027-03-15')).toBeUndefined();
    const groups = journeyTimeline(list, undefined, '2027-03-20', '2027-03-15');
    expect(groups[0].catchUp).toBe(true);
    expect(groups.flatMap((g) => g.tasks)).toHaveLength(list.length);
  });
});

import { describe, expect, it } from 'vitest';
import { guideMenu, type GuideMenuInput } from './guideMenu';

const plan = {
  weeks: [
    { week: 1, minutes: 40, note: 'n', current: false },
    { week: 2, minutes: 45, note: 'n', current: true },
    { week: 3, minutes: 50, note: 'n', current: false },
  ],
};

const alles: GuideMenuInput = {
  plan,
  easeOffCount: 1,
  modalityCount: 3,
  backgroundCount: 4,
  hasGear: true,
  sourceCount: 2,
};
const leeg: GuideMenuInput = { easeOffCount: 0, modalityCount: 0, backgroundCount: 0, hasGear: false, sourceCount: 0 };

const ids = (i: GuideMenuInput) => guideMenu(i).map((r) => r.id);

describe('lijst van het blad Waarom deze training', () => {
  it('alle rijen: hoogstens vier, in één lijst zonder groepen (14 november)', () => {
    expect(ids(alles)).toEqual(['teZwaar', 'varianten', 'weken', 'achtergrond']);
  });

  it('regels onder de rijen zijn feiten uit het plan', () => {
    const rows = guideMenu(alles);
    const sub = (id: string) => rows.find((r) => r.id === id)?.sub;
    expect(sub('varianten')).toBe('3 opties');
    expect(sub('weken')).toBe('Week 2 van 3');
    expect(sub('achtergrond')).toBe('4 delen, 2 bronnen');
    expect(sub('teZwaar')).toBeUndefined();
  });

  it('enkelvoud', () => {
    const rows = guideMenu({ ...alles, modalityCount: 1, backgroundCount: 1, sourceCount: 1 });
    expect(rows.find((r) => r.id === 'varianten')?.sub).toBe('1 optie');
    expect(rows.find((r) => r.id === 'achtergrond')?.sub).toBe('1 deel, 1 bron');
  });

  it('geen rij verlaat het blad: plekken staan op het trainingsscherm en in de Briefing', () => {
    expect(guideMenu(alles).filter((r) => r.page)).toEqual([]);
  });

  it('niets dubbel met het trainingsscherm of Je horloge: geen stappen, plekken, Garmin of datavelden', () => {
    const rows = guideMenu(alles).map((r) => r.id as string);
    for (const weg of ['stappen', 'plekken', 'garmin', 'datavelden']) expect(rows).not.toContain(weg);
  });

  it('zonder plan alleen Achtergrond en bronnen', () => {
    expect(ids({ ...leeg, backgroundCount: 2 })).toEqual(['achtergrond']);
  });

  it('niets te lezen: geen rijen', () => {
    expect(guideMenu(leeg)).toEqual([]);
  });
});

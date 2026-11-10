import { describe, expect, it } from 'vitest';
import { guideMenu, planStepCount, type GuideMenuInput } from './guideMenu';

const plan = {
  totalMinutes: 45,
  items: [
    { step: { label: 'a' } },
    { repeat: 4, steps: [{ label: 'b' }, { label: 'c' }] },
  ] as never,
  garmin: { sport: 'Hardlopen', lines: ['x'] },
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
  showSpots: true,
  watchKind: 'zone2',
  backgroundCount: 4,
  hasGear: true,
  hasGarminNote: true,
  sourceCount: 2,
};
const leeg: GuideMenuInput = { easeOffCount: 0, modalityCount: 0, showSpots: false, backgroundCount: 0, hasGear: false, hasGarminNote: false, sourceCount: 0 };

const ids = (i: GuideMenuInput) => guideMenu(i).map((g) => [g.id, g.rows.map((r) => r.id)]);

describe('menu van het uitlegblad', () => {
  it('alle rijen: twee, vier en twee in drie groepen', () => {
    expect(ids(alles)).toEqual([
      ['doen', ['stappen', 'teZwaar']],
      ['waar', ['varianten', 'plekken', 'garmin', 'datavelden']],
      ['achtergrond', ['weken', 'achtergrond']],
    ]);
  });

  it('regels onder de rijen zijn feiten uit het plan', () => {
    const rows = guideMenu(alles).flatMap((g) => g.rows);
    const sub = (id: string) => rows.find((r) => r.id === id)?.sub;
    expect(sub('stappen')).toBe('±45 min, 3 stappen');
    expect(sub('varianten')).toBe('3 opties');
    expect(sub('weken')).toBe('Week 2 van 3');
    expect(sub('achtergrond')).toBe('4 delen, 2 bronnen');
    expect(sub('teZwaar')).toBeUndefined();
  });

  it('enkelvoud', () => {
    const rows = guideMenu({ ...alles, modalityCount: 1, backgroundCount: 1, sourceCount: 1 }).flatMap((g) => g.rows);
    expect(rows.find((r) => r.id === 'varianten')?.sub).toBe('1 optie');
    expect(rows.find((r) => r.id === 'achtergrond')?.sub).toBe('1 deel, 1 bron');
  });

  it('alleen plekken en datavelden zijn pagina-rijen', () => {
    const pages = guideMenu(alles).flatMap((g) => g.rows).filter((r) => r.page).map((r) => r.id);
    expect(pages).toEqual(['plekken', 'datavelden']);
  });

  it('geen modaliteiten, plekken, Garmin of datavelden: groep Waar en waarmee valt weg, ook de kop', () => {
    const groups = guideMenu({ ...alles, modalityCount: 0, showSpots: false, watchKind: undefined, plan: { ...plan, garmin: undefined } });
    expect(groups.map((g) => g.id)).toEqual(['doen', 'achtergrond']);
    expect(groups.some((g) => g.title === 'Waar en waarmee')).toBe(false);
  });

  it('datavelden uit: de rij is weg, de rest blijft', () => {
    const rows = guideMenu({ ...alles, watchKind: undefined }).flatMap((g) => g.rows).map((r) => r.id);
    expect(rows).not.toContain('datavelden');
    expect(rows).toContain('plekken');
  });

  it('zonder plan alleen Achtergrond en bronnen', () => {
    expect(ids({ ...leeg, backgroundCount: 2 })).toEqual([['achtergrond', ['achtergrond']]]);
  });

  it('niets te lezen: geen groepen', () => {
    expect(guideMenu(leeg)).toEqual([]);
  });

  it('telt de stappen binnen een herhaling mee', () => {
    expect(planStepCount(plan.items)).toBe(3);
  });
});

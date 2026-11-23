import { describe, expect, it } from 'vitest';

// Invariant 6 van docs/visie/Ontwerp Eén plan.md: wat er op een dag staat komt uit het dagbeeld (engine/dayPlan.ts#weekPlan).
// Geen bestand in src/pages/, src/components/vandaag/ of components/WeekPlanner.tsx kiest zelf de rijen van vandaag of van
// een dag (`scheduledDate === today` of `=== date`), en het filter voor wat geen rij is (een opgegeven rustdag, wat een
// periode liet vallen) staat alleen in `hiddenFromDay`. Een nieuwe plek die een dag toont, leest `weekPlan`.
const SOURCES = {
  ...import.meta.glob<string>('../pages/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob<string>('./vandaag/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob<string>('./WeekPlanner.tsx', { query: '?raw', import: 'default', eager: true }),
};
const OWN_DAY = /\.(filter|find)\(\(?\w+\)?\s*=>[^\n]*\.scheduledDate === (today|date)\b/;
const OWN_HIDDEN = /leave\?\.role === 'dropped'/;

describe('een dag uit het dagbeeld', () => {
  const files = Object.entries(SOURCES).filter(([path]) => !path.endsWith('.test.ts') && !path.endsWith('.test.tsx'));

  it('vindt de bestanden', () => {
    expect(files.some(([p]) => p.endsWith('Today.tsx'))).toBe(true);
    expect(files.some(([p]) => p.endsWith('WeekStrip.tsx'))).toBe(true);
    expect(files.some(([p]) => p.endsWith('WeekPlanner.tsx'))).toBe(true);
  });

  it('geen eigen filter op de dag', () => {
    const own = files.filter(([, src]) => OWN_DAY.test(src)).map(([p]) => p);
    expect(own).toEqual([]);
  });

  it('geen eigen kopie van wat geen rij is', () => {
    const own = files.filter(([, src]) => OWN_HIDDEN.test(src)).map(([p]) => p);
    expect(own).toEqual([]);
  });
});

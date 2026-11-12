import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Zone2WeekChart } from './Zone2WeekChart';
import { TrendLineChart } from '../TrendLineChart';
import type { Zone2WeekChart as Chart } from '../../engine/zone2Chart';

// De grafiek op de kaart Tempo bij zone 2 en het eindlabel van TrendLineChart, echt gerenderd zonder DOM.
// Nagemaakte weken.
const dot = (week: string, x: number, paceSec: number, runs = 1) => ({ week, label: `week van ${week}`, x, paceSec, runs });
const threeWeeks: Chart = {
  state: 'eerste-schatting', fromWeek: '2026-08-24', fastSec: 420, slowSec: 460, ticks: [430, 440, 450],
  dots: [dot('2026-10-26', 0.75, 430), dot('2026-11-02', 0.83, 439), dot('2026-11-09', 0.91, 448)],
  end: { x: 0.91, paceSec: 448 },
};
const withLine: Chart = { ...threeWeeks, state: 'uitspraak', line: { x1: 0.6, x2: 0.95, sec1: 450, sec2: 430 }, end: { x: 0.95, paceSec: 430 } };

const render = (chart: Chart) => renderToStaticMarkup(createElement(Zone2WeekChart, { chart }));

describe('Zone2WeekChart', () => {
  it('onder de drempel: stippen zonder lijn, sneller boven en trager onder in de kaart zelf', () => {
    const html = render(threeWeeks);
    expect(html.match(/rounded-full border-2/g)).toHaveLength(3);
    expect(html).not.toMatch(/stroke="var\(--color-progress\)"/);
    expect(html).toContain('>sneller<');
    expect(html).toContain('>trager<');
    expect(html.indexOf('>sneller<')).toBeLessThan(html.indexOf('>trager<'));
    expect(html).toContain('nog zonder lijn');
  });

  it('het eindlabel staat rechts naast de laatste stip, op zijn hoogte, niet in een hoek', () => {
    const html = render(threeWeeks);
    const label = html.match(/<span[^>]*data-end-label[^>]*>7:28<\/span>/)?.[0];
    expect(label).toBeDefined();
    const lastDotLeft = [...html.matchAll(/rounded-full border-2[^>]*left:([\d.]+)%/g)].at(-1)![1];
    expect(label).toContain(`left:${lastDotLeft}%`);
    const lastDotTop = [...html.matchAll(/rounded-full border-2[^>]*top:([\d.]+)%/g)].at(-1)![1];
    expect(label).toContain(`top:${lastDotTop}%`);
    expect(label).toContain('-translate-y-1/2');
    expect(label).not.toMatch(/right-0|top-0/);
  });

  it('met een uitspraak: de lijn, en het eindlabel aan het eind van de lijn', () => {
    const html = render(withLine);
    expect(html).toMatch(/<line[^>]*stroke="var\(--color-progress\)"/);
    expect(html).toMatch(/data-end-label[^>]*>7:10</);
    expect(html).toContain('De lijn gaat van 7:30 naar 7:10 per km');
  });

  it('beweegt nooit: in Vol, Rustig en Uit dezelfde eindstand (geen animatie of overgang)', () => {
    for (const chart of [threeWeeks, withLine]) {
      const html = render(chart);
      expect(html).not.toMatch(/animate|transition|<animate/);
    }
  });

  it('geen weken: niets', () => {
    expect(render({ ...threeWeeks, dots: [], end: undefined })).toBe('');
  });
});

describe('TrendLineChart: het eindlabel bij zijn stip (gedeelde fout, ook Forge en kracht)', () => {
  const points = [{ label: 'a', value: 10 }, { label: 'b', value: 30 }, { label: 'c', value: 20 }];
  it('staat links van en bij de eindstip, niet rechtsboven in de hoek', () => {
    const html = renderToStaticMarkup(createElement(TrendLineChart, { points }));
    const label = html.match(/<div[^>]*data-end-label[^>]*>20<\/div>/)?.[0];
    expect(label).toBeDefined();
    expect(label).not.toMatch(/right-0|top-0/);
    // x van de laatste stip: 320 - 6 = 314 van 320; y van 20 tussen 10 en 30: in het midden.
    expect(label).toContain(`left:${(314 / 320) * 100}%`);
    expect(label).toContain(`top:${(55 / 110) * 100}%`);
  });
  it('een eindstip vlak onder de bovenrand: het label gaat eronder', () => {
    const html = renderToStaticMarkup(createElement(TrendLineChart, { points: [{ label: 'a', value: 1 }, { label: 'b', value: 9 }] }));
    expect(html).toMatch(/translate-y-1[^"]*"[^>]*data-end-label/);
  });
});

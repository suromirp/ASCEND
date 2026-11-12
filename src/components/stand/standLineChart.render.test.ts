import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StandLineChart, type ChartPoint } from './StandLineChart';

// Het grafiekonderdeel van de schermen van Je stand, echt gerenderd (zonder DOM: de eerste render, dus zonder
// vinger). Het schuiven zelf zit in engine/standChart.ts en heeft daar zijn tests.

const points: ChartPoint[] = [
  { x: 0, value: 6 }, { x: 0.25, value: 3 }, { x: 0.5, value: 2 }, { x: 0.75, value: 4, dashed: true }, { x: 1, value: 5, dashed: true },
];
const under = (shown: number) => createElement('p', { 'data-under': shown }, `onder ${shown}`);
const render = (over: Partial<Parameters<typeof StandLineChart>[0]> = {}) => renderToStaticMarkup(createElement(StandLineChart, {
  points, min: 0, max: 20, top: 'low', rest: 2, axis: [{ at: 0, label: '29 okt' }, { at: 0.5, label: 'vandaag', strong: true }],
  label: (i: number) => `L${points[i].value}`, ariaLabel: 'Frisheid', valueText: (i: number) => `dag ${i}`,
  ...over,
}, under as never));

describe('StandLineChart', () => {
  it('het label staat bij de vaste stip (vandaag) en de regel eronder hoort bij die stip', () => {
    const html = render();
    expect(html).toMatch(/data-end-label="true"[^>]*>L2</);
    expect(html).toContain('aria-valuetext="dag 2"');
    expect(html).toContain('data-under="2"');
  });

  it('één lijn: vol tot vandaag, gestippeld erna, nooit een tweede lijn', () => {
    const html = render();
    const paths = html.match(/<path [^>]*>/g) ?? [];
    expect(paths).toHaveLength(2);
    expect(paths.filter((p) => p.includes('stroke-dasharray'))).toHaveLength(1);
    expect(paths.every((p) => p.includes('var(--color-progress)'))).toBe(true);
  });

  it('zonder stippen alleen de gekozen stip, met een rand in gewone inkt en geen mint knop', () => {
    const html = render({ dots: false });
    expect(html.match(/outline:2px solid var\(--color-ink\)/g)).toHaveLength(1);
    expect(html).not.toContain('--color-action');
  });

  it('de grafiek is één tikdoel van ruim 44 px en laat op en neer scrollen', () => {
    const html = render();
    expect(html).toMatch(/role="slider"[^>]*tabindex="0"|tabindex="0"[^>]*role="slider"/i);
    expect(html).toContain('height:120px');
    expect(html).toContain('touch-action:pan-y');
  });

  it('een open stip boven deze week voor wat nog gepland staat', () => {
    const html = render({ points: [{ x: 0, value: 100 }, { x: 1, value: 224, ahead: 424 }], rest: 1, top: 'high', max: 500 });
    expect(html.match(/background:var\(--color-card\);border-color:var\(--color-ink-dim\)/g)).toHaveLength(1);
  });

  it('niets te tekenen: geen grafiek', () => {
    expect(render({ points: [] })).toBe('');
  });
});

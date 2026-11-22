import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { RouteSearchModel } from './useRouteSearch';
import { OtherLoop } from './OtherLoop';

// De knop Andere lus onder de lus, zonder DOM. Alleen het deel van het model dat hij leest.
const other = (over: Partial<RouteSearchModel['other']> = {}): RouteSearchModel => ({ other: { available: true, busy: false, failLine: '', note: '', pick: () => undefined, retry: undefined, ...over } }) as RouteSearchModel;
const html = (m: RouteSearchModel) => renderToStaticMarkup(createElement(OtherLoop, { model: m }));

describe('de knop Andere lus', () => {
  it('staat er onder een lus over paden, in zinsletters en 44 px hoog', () => {
    const out = html(other());
    expect(out).toContain('Andere lus');
    expect(out).toContain('min-h-[44px]');
    expect(out).not.toContain('uppercase');
  });

  it('staat er niet bij een lus die heen en terug gaat', () => {
    expect(html(other({ available: false }))).toBe('');
  });

  it('zegt tijdens het zoeken hoe lang het hoogstens duurt en kan dan niet nog eens', () => {
    const out = html(other({ busy: true }));
    expect(out).toContain('Een andere lus zoeken. Dat duurt hoogstens 30 seconden.');
    expect(out).toContain('disabled');
  });

  it('toont bij mislukken de regel met Opnieuw', () => {
    const out = html(other({ failLine: 'De routeplanner antwoordde niet op tijd. De lus blijft zoals hij was.', retry: () => undefined }));
    expect(out).toContain('De lus blijft zoals hij was.');
    expect(out).toContain('Opnieuw');
  });

  it('toont wat er anders is aan de lus als er die kant op niets lag', () => {
    expect(html(other({ note: 'Naar het oosten liggen binnen 3 km geen paden of hellingen.' }))).toContain('Naar het oosten liggen binnen 3 km geen paden of hellingen.');
  });
});

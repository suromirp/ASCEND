import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { RouteSearchModel } from './useRouteSearch';
import { OtherLoop, OtherLoopRows } from './OtherLoop';
import { RouteMap } from './RouteMap';

vi.mock('./motion', () => ({ useMotionMode: () => 'full' }));

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

  it('Zonder punt staat er alleen als de lus langs een punt gaat', () => {
    expect(html(other())).not.toContain('Zonder punt');
    expect(html(other({ viaActive: true }))).toContain('Zonder punt');
  });
});

describe('het blad Andere lus: Soort en Via een punt', () => {
  const rows = renderToStaticMarkup(createElement(OtherLoopRows, { pick: () => undefined }));

  it('heeft de groep Soort met drie rijen en de rij Via een punt, elk met een regel uitleg', () => {
    for (const word of ['Soort', 'Langs water', 'Door bos of groen', 'Meer onverhard', 'Via een punt', 'Je tikt op de kaart']) expect(rows).toContain(word);
    expect(rows).toContain('Een nieuwe lus langs rivieren, kanalen en plassen.');
    expect(rows).not.toMatch(/Simpel|Avontuurlijk/);
    expect(rows.match(/min-h-\[56px\]/g)!.length).toBeGreaterThanOrEqual(6);
  });
});

describe('de kaart in kiesstand', () => {
  const props = { routes: [], chosen: undefined, base: 'dark' as never, onChoose: () => undefined, onStart: async () => ({ ok: false as const, line: '' }) };
  const map = (viaPick?: { onApply: () => void; onCancel: () => void }) => renderToStaticMarkup(createElement(RouteMap, { ...props, full: true, ...(viaPick ? { viaPick } : {}) }));

  it('zegt Tik waar de lus langs moet en biedt Annuleren, zonder Start hier', () => {
    const out = map({ onApply: () => undefined, onCancel: () => undefined });
    expect(out).toContain('Tik waar de lus langs moet');
    expect(out).toContain('Annuleren');
    expect(out).not.toContain('Start hier');
  });

  it('buiten de kiesstand staat er geen regel en geen Annuleren', () => {
    const out = map();
    expect(out).not.toContain('Tik waar de lus langs moet');
    expect(out).not.toContain('Annuleren');
  });
});

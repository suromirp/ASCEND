import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { YourDay, type YourDayEntry } from './DayRow';
import type { YourDayItem } from '../../engine/yourDay';

// Je dag echt gerenderd (zonder DOM: de eerste render). Nagemaakte rijen.
const entry = (kind: YourDayItem['kind'], word: string, extra: Partial<YourDayItem> = {}): YourDayEntry => ({
  key: `${kind}-${word}`, kind, word, done: false, ...extra,
  node: createElement('li', null, `rij ${word}`),
});
const render = (items: YourDayEntry[]) => renderToStaticMarkup(createElement(YourDay, { items }));
const rows = (html: string) => [...html.matchAll(/<li[ >]/g)].length;

describe('Je dag, gerenderd', () => {
  it('een lege dag: geen kop en geen kaart', () => {
    expect(render([])).toBe('');
  });

  it('training, rekken en gewicht: drie rijen, geen Nog', () => {
    const html = render([entry('training', 'Mobiliteit'), entry('stretch', 'rekken'), entry('weight', 'gewicht')]);
    expect(html).toContain('Je dag');
    expect(rows(html)).toBe(3);
    expect(html).not.toContain('Nog ');
  });

  it('zes dingen: drie rijen en Nog 3 met wat erachter zit, de pijnplekvraag bovenaan', () => {
    const html = render([
      entry('training', 'Mobiliteit'), entry('stretch', 'rekken'), entry('weight', 'gewicht'),
      entry('journey', 'reis'), entry('training', 'Duurloop', { done: true }), entry('checkin', 'pijnplek', { pain: true }),
    ]);
    expect(rows(html)).toBe(4);
    expect(html).toContain('Nog 3');
    expect(html).toContain('Gewicht, reis, Duurloop');
    expect(html.indexOf('rij pijnplek')).toBeLessThan(html.indexOf('rij Mobiliteit'));
    expect(html).not.toContain('rij reis');
    // De rij Nog opent een blad dat eruit groeit.
    expect(html).toMatch(/data-sheet-from=""[^>]*>[\s\S]*Nog 3/);
  });

  it('geen gekleurd woord en geen hex in de rijen', () => {
    const html = render([entry('training', 'Mobiliteit'), entry('weight', 'gewicht')]);
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,6}\b|rgba?\(/);
  });
});

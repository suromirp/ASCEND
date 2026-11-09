import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Pictogram, type PictogramName } from './pictograms';
import { ALL_SPORTS } from '../data/sports';

const ALL: PictogramName[] = ['rust', 'lichaam', 'lopen', 'kracht', 'eigengewicht', 'wandelen', 'rekken', 'bergtocht', 'fietsen', 'zwemmen', 'padel', 'voetbal'];

describe('pictogrammen in stijl C', () => {
  it('elk pictogram tekent drie lagen in currentColor, zonder eigen kleurwaarde', () => {
    for (const name of ALL) {
      const out = renderToStaticMarkup(createElement(Pictogram, { name, size: 32 }));
      expect(out, name).toContain('mx-pic-1');
      expect(out, name).toContain('mx-pic-3');
      expect(out, name).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(out, name).not.toMatch(/rgba?\(/);
    }
  });

  it('elke sport heeft een pictogram dat ook echt iets tekent', () => {
    for (const s of ALL_SPORTS) {
      expect(s.pictogram, s.id).toBeDefined();
      const out = renderToStaticMarkup(createElement(Pictogram, { name: s.pictogram as PictogramName }));
      expect(out, s.id).toMatch(/<(path|circle|rect)/);
    }
  });
});

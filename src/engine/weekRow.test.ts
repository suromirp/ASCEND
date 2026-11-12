import { describe, expect, it } from 'vitest';
import { rowExtra } from './weekRow';

// De tweede regel van een dagrij in Week: hoogstens één ding, in een vaste rang (Ontwerp Week minimaal, hoofdstuk 5).
describe('het ene ding in de tweede regel', () => {
  it('vijf dingen tegelijk: alleen het punt uit Let op, als waarschuwing', () => {
    expect(rowExtra({ concern: '1 dag voor Lange duurloop', moved: true, movedFrom: '2026-11-11', fixed: true, legs: true, pairNote: 'bewust na een rustige loop' }))
      .toEqual({ text: '1 dag voor Lange duurloop', warn: true });
  });

  it('"aangepast" staat er altijd als er een regel is, ook naast een punt uit Let op (het getal op de rij)', () => {
    expect(rowExtra({ concern: 'op je rustdag', adjusted: true })).toEqual({ text: 'op je rustdag', warn: true, also: 'aangepast' });
    expect(rowExtra({ missed: true, adjusted: true })?.text).toBe('aangepast');
  });

  it('daarna de rang: aangepast, verplaatst van, vaste afspraak, zware benen, het toegestane paar; stil, zonder kleur', () => {
    expect(rowExtra({ catchNote: 'verplaatst van wo 28', legs: true })).toEqual({ text: 'verplaatst van wo 28', warn: false });
    expect(rowExtra({ adjusted: true, moved: true, fixed: true })).toEqual({ text: 'aangepast', warn: false });
    expect(rowExtra({ moved: true, movedFrom: '2026-11-11', fixed: true })).toEqual({ text: 'verplaatst van wo 11', warn: false });
    expect(rowExtra({ moved: true })?.text).toBe('verplaatst');
    expect(rowExtra({ fixed: true, legs: true })?.text).toBe('vaste afspraak');
    expect(rowExtra({ legs: true, pairNote: 'p' })?.text).toBe('zware benen');
    expect(rowExtra({ pairNote: 'bewust na een rustige loop' })?.text).toBe('bewust na een rustige loop');
    expect(rowExtra({})).toBeUndefined();
  });

  it('gedaan: geen "verplaatst" meer, wel "aangepast"', () => {
    expect(rowExtra({ done: true, moved: true, catchNote: 'verplaatst van wo 28' })).toBeUndefined();
    expect(rowExtra({ done: true, adjusted: true })?.text).toBe('aangepast');
  });

  it('gemist met greep: het woord gemist, voor de rest', () => {
    expect(rowExtra({ missed: true, legs: true })).toEqual({ text: 'gemist', warn: false });
    expect(rowExtra({ missed: true, concern: 'c' })?.warn).toBe(true);
  });
});

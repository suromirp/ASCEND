import { describe, expect, it } from 'vitest';
import { quoteSourceLabel } from './quotes';

describe('quoteSourceLabel', () => {
  it('zet de Hávamál-bron in het Nederlands', () => {
    expect(quoteSourceLabel('Havamal stanza 77, Bellows translation')).toBe('Hávamál, strofe 77, vertaling Bellows');
  });
  it('laat titels van werken staan en vertaalt alleen de vertaler', () => {
    expect(quoteSourceLabel('Meditations 6.6, George Long translation')).toBe('Meditations 6.6, vertaling George Long');
    expect(quoteSourceLabel('Enchiridion 5, public-domain translation')).toBe('Enchiridion 5, vertaling uit het publieke domein');
    expect(quoteSourceLabel('Odes 1.37')).toBe('Odes 1.37');
  });
  it('valt terug op Bron', () => {
    expect(quoteSourceLabel(undefined)).toBe('Bron');
  });
});

import { describe, expect, it } from 'vitest';
import { QUOTE_LIBRARY } from '../data/quoteLibrary';
import { dailyQuote, isEnglishQuote, quoteSourceLabel } from './quotes';

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

describe('het citaat van de dag', () => {
  it('is in het Engels als dat gekozen is, elke dag van het jaar', () => {
    for (let d = 1; d <= 28; d++) {
      for (const m of ['01', '04', '07', '10']) expect(isEnglishQuote(dailyQuote(`2026-${m}-${String(d).padStart(2, '0')}`, 'en'))).toBe(true);
    }
  });
  it('houdt dezelfde keuze zonder taal als voorheen', () => {
    expect(dailyQuote('2026-11-01')).toEqual(dailyQuote('2026-11-01'));
  });
  it('kent Latijn en Grieks als niet Engels', () => {
    expect(isEnglishQuote(QUOTE_LIBRARY.find((q) => q.id === 'Q025')!)).toBe(false);
    expect(isEnglishQuote(QUOTE_LIBRARY.find((q) => q.id === 'Q057')!)).toBe(false);
    expect(isEnglishQuote(QUOTE_LIBRARY.find((q) => q.id === 'Q004')!)).toBe(true);
  });
});

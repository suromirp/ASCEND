import { describe, expect, it } from 'vitest';
import { resolveQuoteLanguage } from './quoteSettings';

describe('de taal van het citaat op Vandaag', () => {
  it('is Engels als er niets gekozen is, ook in een oude back-up', () => {
    expect(resolveQuoteLanguage(undefined)).toBe('en');
    expect(resolveQuoteLanguage({})).toBe('en');
  });
  it('kent Nederlands en Uit', () => {
    expect(resolveQuoteLanguage({ quoteLanguage: 'nl' })).toBe('nl');
    expect(resolveQuoteLanguage({ quoteLanguage: 'off' })).toBe('off');
  });
  it('valt bij iets geks terug op Engels', () => {
    expect(resolveQuoteLanguage({ quoteLanguage: 'fr' })).toBe('en');
    expect(resolveQuoteLanguage({ quoteLanguage: 3 })).toBe('en');
  });
});

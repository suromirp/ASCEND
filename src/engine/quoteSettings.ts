// ASCEND: de instelling "Citaat op Vandaag". Het citaat onderaan Vandaag staat standaard in het
// Engels (de gangbare vertaling van de stoïcijnen, zoals in data/quoteLibrary.ts); Nederlands of
// Uit kan ook. Optioneel en zonder migratie: ontbreekt de sleutel (een oude back-up) of staat er iets
// geks, dan geldt het advies (Engels). Het citaat na een training heeft een eigen schakelaar.
export type QuoteLanguage = 'en' | 'nl' | 'off';

export const QUOTE_LANGUAGES: QuoteLanguage[] = ['en', 'nl', 'off'];
export const DEFAULT_QUOTE_LANGUAGE: QuoteLanguage = 'en';

export function resolveQuoteLanguage(raw: { quoteLanguage?: unknown } | undefined): QuoteLanguage {
  return QUOTE_LANGUAGES.find((q) => q === raw?.quoteLanguage) ?? DEFAULT_QUOTE_LANGUAGE;
}

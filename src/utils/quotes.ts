import { QUOTE_LIBRARY, type Quote } from '../data/quoteLibrary';
import { AUTHOR_WIKIPEDIA } from '../data/quoteAuthors';
import { QUOTE_NL } from '../data/quoteTranslations';

// "Victory-tier" — milestones cleared on the Ascent Ladder draw from this
// narrower, more triumphant slice instead of the full library.
const VICTORY_CATEGORIES = ['victory', 'completion', 'celebration', 'achievement'];
const VICTORY_POOL = QUOTE_LIBRARY.filter((q) => q.categories.some((c) => VICTORY_CATEGORIES.includes(c)));
const DAILY_POOL = QUOTE_LIBRARY.filter((q) => q.recommended);

function pickRandom(pool: Quote[]): Quote {
  return pool[Math.floor(Math.random() * pool.length)];
}

// A milestone cleared on the Ascent Ladder.
export function pickVictoryQuote(): Quote {
  return pickRandom(VICTORY_POOL.length > 0 ? VICTORY_POOL : QUOTE_LIBRARY);
}

// Any regular session logged — lighter than a milestone win, draws from
// the whole library rather than just the victory-tagged slice.
export function pickCompletionQuote(): Quote {
  return pickRandom(QUOTE_LIBRARY);
}

// Today's home-screen quote: stable for the whole day (same seed date in,
// same quote out), drawn from the source library's own recommended picks
// so the daily card is always a strong one rather than a random draw from
// the full 72.
// Is het citaat in de bibliotheek Engels? Latijnse en Griekse spreuken niet: die hebben geen Engelse tekst.
export function isEnglishQuote(q: Quote): boolean {
  return !QUOTE_NL[q.id]?.latin && !/[\u0370-\u03FF]/.test(q.quote);
}

// Met `language: 'en'` komen alleen citaten in het Engels aan de beurt, zodat de instelling "Engels" klopt.
export function dailyQuote(dateIso: string, language?: 'en' | 'nl'): Quote {
  const base = DAILY_POOL.length > 0 ? DAILY_POOL : QUOTE_LIBRARY;
  const english = language === 'en' ? base.filter(isEnglishQuote) : base;
  const pool = english.length > 0 ? english : base;
  const hash = Array.from(dateIso).reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 0);
  return pool[hash % pool.length];
}

export function authorWikipediaUrl(author: string): string | undefined {
  return AUTHOR_WIKIPEDIA[author];
}

// The source line under a quote in Dutch words: "Havamal stanza 77, Bellows
// translation" reads "Hávamál, strofe 77, vertaling Bellows". Titles of works
// (Meditations, Odes) stay as they are; the quote itself stays in its original
// words on purpose (data/quoteTranslations.ts).
export function quoteSourceLabel(label: string | undefined): string {
  if (!label) return 'Bron';
  return label
    .replace(/^Havamal stanza (\d+)/, 'Hávamál, strofe $1')
    .replace(/, public-domain translation$/, ', vertaling uit het publieke domein')
    .replace(/, ([A-Z][\w. ]+?) translation$/, ', vertaling $1');
}

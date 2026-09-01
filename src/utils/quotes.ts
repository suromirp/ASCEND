import { QUOTE_LIBRARY, type Quote } from '../data/quoteLibrary';

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
export function dailyQuote(dateIso: string): Quote {
  const pool = DAILY_POOL.length > 0 ? DAILY_POOL : QUOTE_LIBRARY;
  const hash = Array.from(dateIso).reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 0);
  return pool[hash % pool.length];
}

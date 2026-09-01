// Wikipedia link per distinct `Quote.author` string in quoteLibrary.ts.
// Keyed by the exact author string (not a slug/id) since the library only
// has ~20 distinct authors shared across 72 quotes — a lookup here is
// simpler than repeating the URL on every quote. A few authors are
// attributed traditions rather than one person (e.g. "Latin proverb
// tradition", "Havamal" — the Eddic poem, not a person) and point to the
// closest real Wikipedia article instead of a person page.
export const AUTHOR_WIKIPEDIA: Record<string, string> = {
  'Marcus Aurelius': 'https://en.wikipedia.org/wiki/Marcus_Aurelius',
  'Epictetus': 'https://en.wikipedia.org/wiki/Epictetus',
  'Epictetus (fragment tradition)': 'https://en.wikipedia.org/wiki/Epictetus',
  'Seneca': 'https://en.wikipedia.org/wiki/Seneca_the_Younger',
  'Virgil': 'https://en.wikipedia.org/wiki/Virgil',
  'Horace': 'https://en.wikipedia.org/wiki/Horace',
  'Terence / Roman proverb tradition': 'https://en.wikipedia.org/wiki/Terence',
  'Havamal': 'https://en.wikipedia.org/wiki/H%C3%A1vam%C3%A1l',
  'Miyamoto Musashi': 'https://en.wikipedia.org/wiki/Miyamoto_Musashi',
  'Laozi / Tao Te Ching tradition': 'https://en.wikipedia.org/wiki/Laozi',
  'Theodore Roosevelt': 'https://en.wikipedia.org/wiki/Theodore_Roosevelt',
  'Julius Caesar': 'https://en.wikipedia.org/wiki/Julius_Caesar',
  'Leonidas I of Sparta (attributed)': 'https://en.wikipedia.org/wiki/Leonidas_I',
  'Special Air Service (SAS)': 'https://en.wikipedia.org/wiki/Special_Air_Service',
  'U.S. Navy SEALs tradition': 'https://en.wikipedia.org/wiki/United_States_Navy_SEALs',
  'Muhammad Ali': 'https://en.wikipedia.org/wiki/Muhammad_Ali',
  'Eliud Kipchoge': 'https://en.wikipedia.org/wiki/Eliud_Kipchoge',
  'Kobe Bryant': 'https://en.wikipedia.org/wiki/Kobe_Bryant',
  'Wayne Gretzky': 'https://en.wikipedia.org/wiki/Wayne_Gretzky',
  'Edmund Hillary': 'https://en.wikipedia.org/wiki/Edmund_Hillary',
  'Latin proverb tradition': 'https://en.wikipedia.org/wiki/List_of_Latin_phrases',
  'Latin motto tradition': 'https://en.wikipedia.org/wiki/List_of_Latin_phrases',
  'Latin proverb / motto tradition': 'https://en.wikipedia.org/wiki/List_of_Latin_phrases',
};

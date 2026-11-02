import { describe, expect, it } from 'vitest';

// De onderrand van de Android-app (docs/architectuur/bediening-en-beweging.md): onder de inhoud ligt
// de gebarenbalk of navigatiebalk. Alles wat aan de onderkant vastzit gebruikt één variabele,
// --rand-onder (src/index.css), nooit env(safe-area-inset-bottom) los: in de webview van de app
// geeft die soms 0 terwijl Capacitor de ruimte wel als --safe-area-inset-bottom doorgeeft.
// Elk blad (animate-sheet-in) krijgt de onderrand als opvulling van het paneel, in één regel in
// index.css (.animate-sheet-in); een blad hoeft er zelf niets voor te doen en zet er dus ook geen
// eigen onderrand bij. De regel zelf is met screenshots gecontroleerd (CSS laadt niet als tekst in vitest).
const SOURCES = import.meta.glob<string>('../**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true });

describe('de onderrand', () => {
  it('geen bestand gebruikt env(safe-area-inset-bottom) los', () => {
    const files = Object.entries(SOURCES)
      .filter(([path]) => !path.endsWith('randOnder.scan.test.ts'))
      .filter(([, src]) => src.includes('safe-area-inset-bottom'))
      .map(([path]) => path);
    expect(files).toEqual([]);
  });
});

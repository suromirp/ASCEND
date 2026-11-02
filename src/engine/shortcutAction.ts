// Snelkoppeling "Training afvinken" op het app-icoon: het adres wordt
// `#/?actie=afvinken`. Vandaag leest die zoekparameter één keer en haalt hem
// daarna uit het adres, zodat een herlaad of terug-knop het niet nog eens doet.

export const SHORTCUT_PARAM = 'actie';
export const SHORTCUT_LOG = 'afvinken';

export const SHORTCUT_MORNING = 'ochtend';

// De snelkoppelingen onder het app-icoon van de Android-app (android/app/src/main/res/xml/
// shortcuts.xml) sturen een adres als `app.ascend.training://open/week`. Dit zet het om naar
// dezelfde adressen als de snelkoppelingen van de PWA; wat niet in de lijst staat, geeft null.
const NATIVE_SHORTCUTS: Record<string, string> = {
  vandaag: '/',
  week: '/week',
  logboek: '/history',
  afvinken: `/?${SHORTCUT_PARAM}=${SHORTCUT_LOG}`,
};

export function routeFromNativeShortcut(url: string): string | null {
  const m = /^app\.ascend\.training:\/\/open\/([a-z]+)\/?$/.exec(url.trim());
  return (m && (Object.hasOwn(NATIVE_SHORTCUTS, m[1]) ? NATIVE_SHORTCUTS[m[1]] : null)) || null;
}

/** Staat de ochtend-actie (de melding "Goedemorgen. Hoe voel je je?") in deze zoekparameters? */
export function wantsMorningLink(search: string): boolean {
  return new URLSearchParams(search).get(SHORTCUT_PARAM) === SHORTCUT_MORNING;
}

/** Staat de afvink-actie in deze zoekparameters? */
export function wantsLogShortcut(search: string): boolean {
  return new URLSearchParams(search).get(SHORTCUT_PARAM) === SHORTCUT_LOG;
}

/** Dezelfde zoekparameters zonder de actie; de rest blijft staan. */
export function withoutShortcut(search: string): string {
  const params = new URLSearchParams(search);
  params.delete(SHORTCUT_PARAM);
  const rest = params.toString();
  return rest ? `?${rest}` : '';
}

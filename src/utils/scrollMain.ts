// De pagina scrolt in <main id="app-scroll"> (App.tsx), niet in het venster:
// window.scrollTo doet hier niets.
export const SCROLLER_ID = 'app-scroll';

export function scrollMainToTop(): void {
  try {
    document.getElementById(SCROLLER_ID)?.scrollTo({ top: 0 });
  } catch {
    // Geen DOM (tests): niets te doen.
  }
}

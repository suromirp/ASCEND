import { useLayoutEffect, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { resolveSky, skyModeAt, type SkyMode } from '../engine/skySettings';

// Zet de lucht bovenaan (licht of donker) als `data-sky` op <html>; de tokens in
// index.css reageren daarop. Bij "Op tijd" kijkt één timer per minuut welke lucht
// er nu hoort (en weer bij terugkeren naar de app), maar hij zet alleen state als
// die lucht verandert: een minuut zonder wissel rendert niets opnieuw. Bij een
// vaste keuze draait er geen timer. De kleur van de statusbalk (theme-color) gaat
// mee: de bovenkant van de lucht overdag, marine 's nachts.

export function useSkyAttribute(): void {
  const { settings } = useAppData();
  const { sky, nightFrom } = resolveSky(settings);
  const [clockMode, setClockMode] = useState<SkyMode>(() => skyModeAt({ sky, skyNightFrom: nightFrom }, new Date()));

  // Dit effect loopt alleen bij een andere keuze (sky, nightFrom), nooit per
  // minuut. De stand wordt eerst vóór het schilderen gezet, zodat een andere
  // "donker vanaf" meteen klopt; daarna houdt de timer hem bij.
  useLayoutEffect(() => {
    if (sky !== 'auto') return;
    const tick = () => setClockMode(skyModeAt({ sky, skyNightFrom: nightFrom }, new Date()));
    tick();
    const id = window.setInterval(tick, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [sky, nightFrom]);

  const mode: SkyMode = sky === 'auto' ? clockMode : sky;
  useLayoutEffect(() => {
    document.documentElement.dataset.sky = mode;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    // De kleur komt uit de tokens (die wisselen met data-sky), niet uit een hex hier.
    const root = getComputedStyle(document.documentElement);
    const color = root.getPropertyValue(mode === 'day' ? '--color-sky-top' : '--color-bg').trim();
    if (color) meta.setAttribute('content', color);
  }, [mode]);
}

import { useEffect, useLayoutEffect, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { skyModeAt, type SkyMode } from '../engine/skySettings';

// Zet de lucht bovenaan (licht of donker) als `data-sky` op <html>; de tokens in
// index.css reageren daarop. Bij "Op tijd" kijkt één timer per minuut of de tijd
// is verstreken (en weer bij terugkeren naar de app); bij een vaste keuze draait
// er geen timer. De kleur van de statusbalk (theme-color) gaat mee.

export function useSkyAttribute(): void {
  const { settings } = useAppData();
  const [now, setNow] = useState(() => new Date());
  const auto = (settings.sky ?? 'auto') === 'auto';

  useEffect(() => {
    if (!auto) return;
    const tick = () => setNow(new Date());
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
  }, [auto]);

  const mode: SkyMode = skyModeAt(settings, now);
  useLayoutEffect(() => {
    document.documentElement.dataset.sky = mode;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    if (!meta.hasAttribute('data-day')) meta.setAttribute('data-day', meta.getAttribute('content') ?? '');
    const night = getComputedStyle(document.documentElement).getPropertyValue('--color-sky-top').trim();
    meta.setAttribute('content', mode === 'night' && night ? night : (meta.getAttribute('data-day') ?? ''));
  }, [mode]);
}

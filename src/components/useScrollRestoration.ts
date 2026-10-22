import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { pageMemory, scrollKey } from '../utils/pageMemory';
import { restoreScroll, type RestoreHandle } from '../utils/scrollRestore';

// De pagina scrolt in <main> (App.tsx), niet in het venster, en <main> blijft
// bestaan als je naar een andere pagina gaat. Zonder hulp nam een nieuwe
// pagina de scrollhoogte van de vorige mee en kwam terug nergens meer waar je
// was. Hier krijgt elke stap in de geschiedenis zijn eigen hoogte:
// - vooruit naar een andere pagina: bovenaan,
// - terug (ook na een herlaad): precies de hoogte van toen, zodra de pagina
//   lang genoeg is (utils/scrollRestore.ts),
// - dezelfde pagina met een andere stap (opnieuw op de tab tikken): blijft.
export function useScrollRestoration(scroller: RefObject<HTMLElement | null>, ready: boolean): void {
  const location = useLocation();
  const navigationType = useNavigationType();
  const keyRef = useRef('');
  const pathRef = useRef<string | null>(null);
  // Tijdens het terugzetten wordt de tussentijdse (afgekapte) hoogte niet bewaard.
  const trackingRef = useRef(true);
  const restoreRef = useRef<RestoreHandle | null>(null);
  const tokenRef = useRef(0);

  // Bewaren: elke scroll van de huidige stap.
  useEffect(() => {
    const el = scroller.current;
    if (!el || !ready) return;
    const onScroll = () => {
      if (trackingRef.current && keyRef.current) pageMemory.set(keyRef.current, Math.round(el.scrollTop));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scroller, ready]);

  // Terugzetten of bovenaan beginnen, voor de eerste tekening van de stap.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !ready) return;
    const key = scrollKey(location);
    const samePath = pathRef.current === location.pathname;
    pathRef.current = location.pathname;
    keyRef.current = key;
    tokenRef.current++;
    restoreRef.current?.cancel();
    restoreRef.current = null;

    let target: number | null = null;
    if (navigationType === 'POP') target = pageMemory.get<number>(key) ?? 0;
    else if (!samePath) target = 0;
    if (target === null) {
      trackingRef.current = true;
      return;
    }

    trackingRef.current = false;
    const token = ++tokenRef.current;
    restoreRef.current = restoreScroll(el, target, () => {
      // Alleen de laatste opdracht zet het bewaren weer aan.
      if (tokenRef.current === token) trackingRef.current = true;
    });
    // Per stap, niet per nieuw locatie-object.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, ready]);
}

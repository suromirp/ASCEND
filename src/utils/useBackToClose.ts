import { useEffect, useRef } from 'react';
import { openBackLayer } from './backLayers';

// De terugknop sluit wat over de pagina ligt (utils/backLayers.ts). Zolang
// `active` waar is, telt dit blad, deze dialoog of dit scherm als een laag:
// de terugknop roept `close` aan in plaats van de pagina te verlaten.
// `canClose` mag nee zeggen (een import die bezig is); de laag blijft dan open.
//
// Sluit de laag op een andere manier (eigen knop, tik op de achtergrond), dan
// verdwijnt de stap in de geschiedenis vanzelf weer.
export function useBackToClose(active: boolean, close: () => void, canClose?: () => boolean): void {
  // Altijd de nieuwste functies, zonder de laag opnieuw aan te melden bij
  // elke render.
  const latest = useRef({ close, canClose });
  useEffect(() => {
    latest.current = { close, canClose };
  });

  useEffect(() => {
    if (!active) return;
    return openBackLayer({
      close: () => latest.current.close(),
      canClose: () => latest.current.canClose?.() ?? true,
    });
  }, [active]);
}

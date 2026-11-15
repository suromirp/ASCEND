// ASCEND: het merkteken van Terug naar de Briefing (engine/briefingReturn.ts), alleen in het geheugen.
// Niet in de opslag: na een herstart van de app opent Terug gewoon de pagina.

import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { briefingReturnFor, type BriefingOrigin, type BriefingReturn } from '../engine/briefingReturn';

let mark: BriefingReturn | undefined;

export function markBriefingReturn(next: Omit<BriefingReturn, 'at'>, now = Date.now()): void {
  mark = { ...next, at: now };
}

export function takeBriefingReturn(here: { path: string; back: boolean; origin: BriefingOrigin }, now = Date.now()): BriefingReturn | undefined {
  const { open, keep } = briefingReturnFor(mark, { ...here, now });
  if (!keep) mark = undefined;
  return open;
}

// Voor tests.
export function clearBriefingReturn(): void {
  mark = undefined;
}

// Eén keer bij het openen van de pagina: opent de Briefing weer als Terug hier uitkwam.
export function useBriefingReturn(origin: BriefingOrigin, open: (mark: BriefingReturn) => void): void {
  const { pathname } = useLocation();
  const back = useNavigationType() === 'POP';
  useEffect(() => {
    const found = takeBriefingReturn({ path: pathname, back, origin });
    if (found) open(found);
    // Alleen bij het openen van de pagina; `open` mag elke render nieuw zijn.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

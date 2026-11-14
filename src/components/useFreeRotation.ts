// ASCEND: draaien mag zolang het scherm dat dit vraagt open is (Groter, RouteMapFull.tsx); daarna staat
// de app weer rechtop (integrations/deviceShell.ts#freeRotation, besluit 2026-11-11-alleen-staand.md).
// `free` is mee te geven voor de test.

import { useEffect } from 'react';
import { deviceShell } from '../integrations/deviceShell';

export function useFreeRotation(free: (() => () => void) | undefined = deviceShell().freeRotation): void {
  useEffect(() => free?.(), [free]);
}

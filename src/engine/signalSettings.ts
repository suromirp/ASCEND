// ASCEND: de schakelaars in het blad "Signalen uit je gegevens" (Instellingen, Lichaam;
// docs/beslissingen/2026-10-31-kansen-stap-0.md). Elk staat aan tenzij je hem uitzet.
//
// Puur: geen React, geen IndexedDB.

import type { AppSettings } from '../storage/database';

export const SIGNAL_KEYS = ['illnessSigns', 'morningRule', 'heatPace', 'weekdayPattern', 'airQuality'] as const satisfies readonly (keyof AppSettings)[];
export type SignalKey = (typeof SIGNAL_KEYS)[number];

export const signalOn = (s: Pick<AppSettings, SignalKey> | undefined, key: SignalKey): boolean => s?.[key] !== false;

export const signalsOnCount = (s: Pick<AppSettings, SignalKey> | undefined): number => SIGNAL_KEYS.filter((k) => signalOn(s, k)).length;

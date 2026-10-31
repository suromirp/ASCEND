// ASCEND: hitte en dauwpunt bij het tempo van een loop (docs/onderzoek/Kansen met gegevens.md,
// kans D; docs/beslissingen/2026-10-31-kansen-stap-0.md).
//
// Marathons liepen trager naarmate het warmer en vochtiger was, langzamere lopers meer dan de
// snelsten (Ely e.a. 2007, bewijs matig; een gemiddelde over duizenden lopers). Daarom geen precies
// doeltempo maar een band, en de raad om op hartslag te lopen. De grenzen zijn een eigen vertaling:
//
// - warm: je voelt minstens 22 graden, of het dauwpunt is 16 of hoger (vochtig);
// - heet: je voelt minstens 28 graden, of het dauwpunt is 20 of hoger.
//
// Alleen bij een loop buiten (niet op de loopband, die beslist het weer niet). Extreme hitte
// blijft het weeroordeel zelf ("Slecht weer"), met de weerruil als voorstel met Akkoord.
//
// Puur: geen React, geen IndexedDB.

import type { SessionWeather } from './weather';

export const WARM_FEELS_C = 22;
export const HOT_FEELS_C = 28;
export const HUMID_DEW_C = 16;
export const MUGGY_DEW_C = 20;

export interface HeatPace {
  level: 'warm' | 'heet';
  // Seconden per km die je tempo ongeveer lager ligt.
  slowerFrom: number;
  slowerTo: number;
  text: string;
}

export function heatPace(w: Pick<SessionWeather, 'feelsC' | 'dewPointC' | 'bad'>): HeatPace | undefined {
  const feels = Math.round(w.feelsC);
  const dew = w.dewPointC === undefined ? undefined : Math.round(w.dewPointC);
  const humid = dew !== undefined && dew >= HUMID_DEW_C;
  const warm = feels >= WARM_FEELS_C || humid;
  if (!warm) return undefined;
  const hot = feels >= HOT_FEELS_C || (dew !== undefined && dew >= MUGGY_DEW_C);
  const [slowerFrom, slowerTo] = hot ? [20, 40] : [10, 20];
  const what = humid ? (feels >= WARM_FEELS_C ? 'Warm en vochtig' : 'Vochtig') : 'Warm';
  const detail = humid ? `voelt als ${feels} graden, dauwpunt ${dew}` : `voelt als ${feels} graden`;
  return {
    level: hot ? 'heet' : 'warm',
    slowerFrom,
    slowerTo,
    text: `${what} (${detail}). Loop op hartslag: je tempo ligt dan zo'n ${slowerFrom} tot ${slowerTo} seconden per km lager, en dat is goed.`,
  };
}

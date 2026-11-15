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
// Alleen vochtig (dauwpunt 16 of hoger) bij een gevoel onder de 22 graden kost minder: een band van
// 5 tot 10 seconden. Bij intervallen of heuvelherhalingen (intensiteit high) geen tempoband en geen
// raad om op hartslag te lopen (een testloop of wedstrijd is geen herhaling en houdt de band): de hartslag loopt achter in korte herhalingen; daar zegt de regel
// dat herhalingen zwaarder voelen en je meer rust neemt (eigenaar 15 november: "Dit klopt niet toch?").
//
// Alleen bij een loop buiten (niet op de loopband, die beslist het weer niet). Extreme hitte
// blijft het weeroordeel zelf ("Slecht weer"), met de weerruil als voorstel met Akkoord.
//
// Puur: geen React, geen IndexedDB.

import type { SessionTemplate } from '../models/training';
import type { SessionWeather } from './weather';
import { isTestOrRace } from './templateRoles';

const WARM_FEELS_C = 22;
const HOT_FEELS_C = 28;
const HUMID_DEW_C = 16;
const MUGGY_DEW_C = 20;

export interface HeatPace {
  level: 'warm' | 'heet';
  // Seconden per km die je tempo ongeveer trager ligt (0 bij herhalingen: daar geen band).
  slowerFrom: number;
  slowerTo: number;
  text: string;
}

export function heatPace(
  w: Pick<SessionWeather, 'feelsC' | 'dewPointC' | 'bad'>,
  run: 'steady' | 'reps' = 'steady',
): HeatPace | undefined {
  const feels = Math.round(w.feelsC);
  const dew = w.dewPointC === undefined ? undefined : Math.round(w.dewPointC);
  const humid = dew !== undefined && dew >= HUMID_DEW_C;
  const warm = feels >= WARM_FEELS_C || humid;
  if (!warm) return undefined;
  const hot = feels >= HOT_FEELS_C || (dew !== undefined && dew >= MUGGY_DEW_C);
  const onlyHumid = !hot && feels < WARM_FEELS_C;
  const [slowerFrom, slowerTo] = hot ? [20, 40] : onlyHumid ? [5, 10] : [10, 20];
  const what = humid ? (feels >= WARM_FEELS_C ? 'Warm en vochtig' : 'Vochtig') : 'Warm';
  const detail = humid ? `voelt als ${feels} graden, dauwpunt ${dew}` : `voelt als ${feels} graden`;
  const level = hot ? 'heet' : 'warm';
  if (run === 'reps') {
    return {
      level,
      slowerFrom: 0,
      slowerTo: 0,
      text: `${what} (${detail}). Herhalingen voelen zwaarder: neem wat meer rust ertussen en drink vooraf.`,
    };
  }
  return {
    level,
    slowerFrom,
    slowerTo,
    text: `${what} (${detail}). Loop op hartslag: je tempo ligt dan zo'n ${slowerFrom} tot ${slowerTo} seconden per km trager, en dat is goed.`,
  };
}

// Welke regel een loop krijgt: herhalingen (intervallen, heuvelherhalingen, heuvelsprints, fartlek:
// intensiteit high) of een doorlopende inspanning. Een testloop of wedstrijd is doorlopend, ook al is
// hij zwaar. Een sjabloon zonder profiel is doorlopend.
export function heatRunKind(template: Pick<SessionTemplate, 'id' | 'roles' | 'baseStressProfile'>): 'steady' | 'reps' {
  if (isTestOrRace(template)) return 'steady';
  return template.baseStressProfile?.intensity === 'high' ? 'reps' : 'steady';
}

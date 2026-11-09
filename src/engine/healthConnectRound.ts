// ASCEND: wat een ronde van Health Connect zegt (docs/beslissingen/2026-11-02-health-connect.md).
// Puur: de dag en tijd van de laatste ronde ("gisteren om 19:07") en een regel per soort wat er
// binnenkwam. De regels zijn tekst; ze veranderen niets aan de planning.

import type { HealthRoundFound } from '../models/healthConnect';
import { addDays, formatShortDateNL, localDateOf } from '../utils/dates';
import { formatClock } from '../utils/clock';

// Hoe ver een ronde terugkijkt.
export const HEALTH_ACTIVITY_DAYS = 7;
export const HEALTH_MORNING_DAYS = 28;

// "vandaag om 19:07", "gisteren om 19:07" of "7 nov om 19:07", in de tijd van het toestel. Een
// moment dat niet te lezen is geeft undefined.
export function fetchedWhen(iso: string, today: string): string | undefined {
  const clock = formatClock(iso);
  if (!clock) return undefined;
  const day = localDateOf(iso);
  if (day === today) return `vandaag om ${clock}`;
  if (day === addDays(today, -1)) return `gisteren om ${clock}`;
  return `${formatShortDateNL(day, today)} om ${clock}`;
}

const count = (n: number, one: string, more: string) => `${n} ${n === 1 ? one : more}`;

// Een regel per soort: "Gewicht: 3 wegingen", "Gewicht: niets gevonden in de laatste 28 dagen",
// "Gewicht: geen toestemming".
export function healthRoundLines(found: HealthRoundFound): string[] {
  const weight =
    found.weight === 'off'
      ? 'staat uit'
      : found.weight === 'denied'
        ? 'geen toestemming'
        : found.weight === 0
          ? `niets gevonden in de laatste ${HEALTH_MORNING_DAYS} dagen`
          : count(found.weight, 'weging', 'wegingen');
  return [
    `Trainingen: ${found.activities === 0 ? `niets gevonden in de laatste ${HEALTH_ACTIVITY_DAYS} dagen` : `${found.activities} gevonden`}`,
    `Ochtenden: ${found.mornings === 0 ? `niets gevonden in de laatste ${HEALTH_MORNING_DAYS} dagen` : `${found.mornings} gevonden`}`,
    `Gewicht: ${weight}`,
  ];
}

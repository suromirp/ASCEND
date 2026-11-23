// ASCEND: de zin boven het blad van een losse sport ("Je deed vandaag padel, 1 uur."). Puur.

import { formatDateNL, weekdayLongNL } from '../utils/dates';

// `sport` is de naam van de sport of "iets nieuws"; `length` is de duur als tekst, of leeg.
export function sportDidLine(sport: string, iso: string, today: string, length: string): string {
  const tail = length ? `, ${length}` : '';
  const when = iso === today ? `vandaag ${sport}` : `${sport} op ${weekdayLongNL(iso)} ${formatDateNL(iso)}`;
  return `Je deed ${when}${tail}.`;
}

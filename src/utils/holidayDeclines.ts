// ASCEND: wat dit toestel onthoudt van "Liever niet" bij een feestdag als vrije dag
// (engine/publicHolidays.ts). Per feestdag (land en datum), zodat alleen een andere feestdag terugkomt.
// Hetzelfde patroon als utils/stepDeclines.ts: een herinnering om niet te zeuren, geen gegeven over je
// training of je planning, dus niet in de back-up en zonder migratie. Zonder opslag (privémodus,
// geweigerd) komt het voorstel gewoon terug; wat voorbij is valt er vanzelf uit (MAX).

const KEY = 'ascend.feestdag.nee';
const MAX = 40;
const ID = /^feestdag:[A-Z]{2}:\d{4}-\d{2}-\d{2}$/;

export function readHolidayDeclines(): string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter((d): d is string => typeof d === 'string' && ID.test(d));
  } catch {
    return [];
  }
}

export function rememberHolidayDecline(id: string): string[] {
  if (!ID.test(id)) return readHolidayDeclines();
  const next = [...readHolidayDeclines().filter((d) => d !== id), id].slice(-MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // geen opslag: het voorstel komt de volgende keer terug, er gaat niets stuk
  }
  return next;
}

// "Alles verwijderen" wist ook deze herinnering (storage/databaseSeed.ts#resetToDemoData).
export function clearHolidayDeclines(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // geen opslag: dan is er ook niets te wissen
  }
}

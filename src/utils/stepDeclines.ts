// ASCEND: wat dit toestel onthoudt van "Liever niet" bij een stapvoorstel op een ladder
// (engine/skillStepProposal.ts). Per voorstel-id (ladder, van- en naar-stap), zodat alleen een andere stap terugkomt.
// Alleen een herinnering om niet te zeuren, geen gegeven over je training: het staat niet in de back-up. Zonder
// opslag (privémodus, geweigerd) komt het voorstel gewoon terug.

const KEY = 'ascend.stap.nee';
const MAX = 24;
const ID = /^[a-z-]{1,30}:[a-z-]{1,40}>[a-z-]{1,40}$/;

export function readStepDeclines(): string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter((d): d is string => typeof d === 'string' && ID.test(d));
  } catch {
    return [];
  }
}

export function rememberStepDecline(id: string): string[] {
  const next = [...readStepDeclines().filter((d) => d !== id), id].slice(-MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // geen opslag: het voorstel komt de volgende keer terug, er gaat niets stuk
  }
  return next;
}

// "Alles verwijderen" wist ook deze herinnering (storage/databaseSeed.ts#resetToDemoData).
export function clearStepDeclines(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // geen opslag: dan is er ook niets te wissen
  }
}

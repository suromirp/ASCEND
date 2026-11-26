// ASCEND: wat dit toestel onthoudt van "Liever niet" bij het voorstel om een ladder van Calisthenics algemeen in een
// krachttraining te zetten (engine/ladderAddProposal.ts). Per ladder, zodat het voorstel één keer komt. Zoals
// utils/stepDeclines.ts: een herinnering om niet te zeuren, geen gegeven over je training, niet in de back-up. Zonder
// opslag (privémodus, geweigerd) komt het voorstel gewoon terug.

const KEY = 'ascend.ladder.erbij.nee';
const MAX = 12;
const ID = /^[a-z-]{1,30}$/;

export function readLadderAddDeclines(): string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter((d): d is string => typeof d === 'string' && ID.test(d));
  } catch {
    return [];
  }
}

export function rememberLadderAddDecline(ladderId: string): string[] {
  const next = [...readLadderAddDeclines().filter((d) => d !== ladderId), ladderId].slice(-MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // geen opslag: het voorstel komt de volgende keer terug, er gaat niets stuk
  }
  return next;
}

// "Alles verwijderen" wist ook deze herinnering (storage/databaseSeed.ts#resetToDemoData).
export function clearLadderAddDeclines(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // geen opslag: dan is er ook niets te wissen
  }
}

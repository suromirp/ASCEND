// De volgorde van de blokken op Je stand, als voorkeur van de gebruiker. Puur en defensief: wat er
// bewaard is kan beschadigd, verouderd of van een nieuwere versie zijn, en de uitkomst bevat elk blok
// altijd precies één keer (docs/beslissingen/2026-10-28-forge-en-volgorde.md).

export type CardPage = 'stand';

export interface CardBlock {
  id: string;
  name: string;
  // Eén regel met wat erin zit, voor in het blad.
  line: string;
  // Het lucht-vlak mag nooit de eerste zijn: hoogstens één vlak lucht halverwege.
  canBeFirst: boolean;
  // Een eigen instelling kan het blok uitzetten; het houdt dan zijn plek in de volgorde.
  settingNote?: string;
}

// De standaardvolgorde is de volgorde waarin de pagina altijd stond.
export const STAND_BLOCKS: CardBlock[] = [
  { id: 'benen', name: 'Benen', line: 'Beenindex, frisheid, kalender', canBeFirst: true },
  { id: 'belasting', name: 'Belasting', line: 'Wekelijkse belasting, intensiteit, afdaling', canBeFirst: true },
  { id: 'kracht', name: 'Kracht', line: 'Forge, krachtprogressie, trainingsverdeling', canBeFirst: true },
  { id: 'vier-regels', name: 'Je stand in vier regels', line: 'Deze week, volgehouden, fase, op rij', canBeFirst: false },
  { id: 'lopen', name: 'Lopen', line: 'Looptrends, tempo bij zone 2', canBeFirst: true },
  { id: 'invloed', name: 'Wat speelde er', line: 'Wat je zelf noteerde bij trainingen en dagen', canBeFirst: true },
  { id: 'doel', name: 'Doel', line: 'Avontuurkaart en les', canBeFirst: true },
];

const BLOCKS: Record<CardPage, CardBlock[]> = { stand: STAND_BLOCKS };

export const defaultOrder = (page: CardPage): string[] => BLOCKS[page].map((b) => b.id);

// Zet een blok dat niet eerst mag staan op plek 2.
function keepFirstAllowed(page: CardPage, order: string[]): string[] {
  const can = new Map(BLOCKS[page].map((b) => [b.id, b.canBeFirst]));
  const out = [...order];
  let guard = out.length;
  while (out.length > 1 && can.get(out[0]) === false && guard-- > 0) {
    [out[0], out[1]] = [out[1], out[0]];
  }
  return out;
}

export function resolveCardOrder(page: CardPage, raw: unknown): string[] {
  const std = defaultOrder(page);
  const known = new Set(std);
  const value = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>)[page] : raw;
  const out: string[] = [];
  if (Array.isArray(value)) {
    for (const id of value) if (typeof id === 'string' && known.has(id) && !out.includes(id)) out.push(id);
  }
  // Een blok dat ontbreekt komt terug direct na het blok dat in de standaard voor hem stond.
  std.forEach((id, i) => {
    if (out.includes(id)) return;
    let at = 0;
    for (let j = i - 1; j >= 0; j -= 1) {
      const k = out.indexOf(std[j]);
      if (k >= 0) { at = k + 1; break; }
    }
    out.splice(at, 0, id);
  });
  return keepFirstAllowed(page, out);
}

export function moveBlock(page: CardPage, order: string[], id: string, to: number): string[] {
  const from = order.indexOf(id);
  if (from < 0) return order;
  const rest = order.filter((x) => x !== id);
  const at = Math.max(0, Math.min(rest.length, Math.trunc(to)));
  rest.splice(at, 0, id);
  return keepFirstAllowed(page, rest);
}

// Welke rij hoort bij dit y op het scherm: de rij waar je in zit, boven de eerste of onder de laatste
// de eerste of de laatste.
export function blockIndexAtY(rects: { top: number; bottom: number }[], y: number): number {
  if (rects.length === 0) return 0;
  for (let i = 0; i < rects.length; i += 1) if (y < rects[i].bottom) return i;
  return rects.length - 1;
}

export const isDefaultOrder = (page: CardPage, order: string[]): boolean => {
  const std = defaultOrder(page);
  return order.length === std.length && order.every((id, i) => id === std[i]);
};

// Alleen een geldige bewaarde volgorde (record van lijsten tekst) blijft; de rest valt weg.
export function cleanCardOrder(raw: unknown): Record<string, string[]> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: Record<string, string[]> = {};
  for (const [page, list] of Object.entries(raw as Record<string, unknown>)) {
    if (page !== 'stand' || !Array.isArray(list) || !list.every((x) => typeof x === 'string')) continue;
    out[page] = list as string[];
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

const nameOf = (page: CardPage, id: string) => BLOCKS[page].find((b) => b.id === id)?.name ?? id;
const ORDINALS = ['eerste', 'tweede', 'derde', 'vierde', 'vijfde', 'zesde', 'zevende', 'achtste', 'negende', 'tiende'];

// De zinnen voor de schermlezer bij het verplaatsen en loslaten.
export function orderAnnouncement(page: CardPage, order: string[], id: string, kind: 'moving' | 'dropped' | 'cancelled'): string {
  const name = nameOf(page, id);
  const i = order.indexOf(id);
  if (kind === 'cancelled') return `${name} blijft op zijn plek.`;
  if (kind === 'dropped') return `${name} staat nu ${ORDINALS[i] ?? `op plek ${i + 1}`}.`;
  return `Plek ${i + 1} van ${order.length}, ${name}.`;
}

export const handleLabel = (page: CardPage, order: string[], id: string): string =>
  `Verplaats ${nameOf(page, id)}, nu op plek ${order.indexOf(id) + 1}. Spatie pakt op, pijltjes verplaatsen, spatie laat los, Escape annuleert.`;

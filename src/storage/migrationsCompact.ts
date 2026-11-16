// Schema 6 van de back-up (I-63): het bestand is kleiner, de gegevens zijn dezelfde.
//
// Voorstellen herhalen dezelfde uitleg bij elk voorstel (de weekcontrole zegt bij elke opening dezelfde zin). In
// een bestand van schema 6 staat zo'n tekst één keer in `proposalTexts` en staat in het voorstel een verwijzing
// `{ "$tekst": "t3" }`. De tabel staat in het bestand zelf, niet in de code: een tekst die de app later anders
// formuleert, verandert zo nooit de geschiedenis van een oude back-up. Bij inlezen zet `unpackProposalTexts` elke
// verwijzing terug, zodat wat in IndexedDB komt precies gelijk is aan wat er bij het maken stond.
//
// Een bestand van schema 5 of ouder heeft geen verwijzingen en gaat ongewijzigd door (de keten in
// migrationsSchema.ts is voor het oude platte bestand; dit is de stap voor de envelop).

import { isRecord } from '../utils/guards';

// Velden met uitleg die vaak terugkomt. Alleen deze worden een verwijzing; ids, datums en getallen nooit.
const TEXT_KEYS = new Set(['issue', 'consequences', 'explanation', 'reason', 'label']);
// Een lijst met teksten: elk onderdeel apart.
const TEXT_LIST_KEYS = new Set(['generatedBy']);
// Korter dan dit levert een verwijzing niets op (de verwijzing zelf is ongeveer zo lang).
const MIN_LENGTH = 24;
const REF = '$tekst';

export interface PackedProposals {
  proposals: unknown[];
  // Sleutel naar tekst, in de volgorde waarin de teksten voor het eerst voorkomen. Leeg als niets herhaalt.
  texts: Record<string, string>;
}

function eachText(value: unknown, visit: (text: string) => string): unknown {
  if (Array.isArray(value)) return value.map((v) => eachText(v, visit));
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    if (TEXT_KEYS.has(key) && typeof v === 'string') out[key] = visit(v);
    else if (TEXT_LIST_KEYS.has(key) && Array.isArray(v)) out[key] = v.map((s) => (typeof s === 'string' ? visit(s) : s));
    else out[key] = eachText(v, visit);
  }
  return out;
}

// Teksten die minstens twee keer voorkomen en lang genoeg zijn, worden een verwijzing. Raakt de lijst zelf niet.
export function packProposalTexts(proposals: readonly unknown[]): PackedProposals {
  const count = new Map<string, number>();
  for (const p of proposals) eachText(p, (t) => {
    if (t.length >= MIN_LENGTH) count.set(t, (count.get(t) ?? 0) + 1);
    return t;
  });
  const keyOf = new Map<string, string>();
  const texts: Record<string, string> = {};
  const packed = proposals.map((p) => eachText(p, (t) => {
    if ((count.get(t) ?? 0) < 2) return t;
    let key = keyOf.get(t);
    if (!key) {
      key = `t${keyOf.size + 1}`;
      keyOf.set(t, key);
      texts[key] = t;
    }
    return { [REF]: key } as unknown as string;
  }));
  return { proposals: packed, texts };
}

function refKey(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  const keys = Object.keys(value);
  return keys.length === 1 && keys[0] === REF && typeof value[REF] === 'string' ? value[REF] : undefined;
}

function resolve(value: unknown, texts: Record<string, string>): unknown {
  const key = refKey(value);
  if (key === undefined) return value;
  // Een sleutel die niet in de tabel staat (een beschadigd bestand): de tekst is weg, het voorstel blijft leesbaar
  // met een lege tekst. Het voorstel zelf is ingelezen en telt dus niet als overgeslagen.
  return Object.prototype.hasOwnProperty.call(texts, key) && typeof texts[key] === 'string' ? texts[key] : '';
}

// Alleen onder de velden die packProposalTexts verpakt (TEXT_KEYS en TEXT_LIST_KEYS) is een object met alleen
// `$tekst` een verwijzing; elders blijft alles zoals het in het bestand staat.
function unpackValue(value: unknown, texts: Record<string, string>): unknown {
  if (Array.isArray(value)) return value.map((v) => unpackValue(v, texts));
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    if (TEXT_KEYS.has(key)) out[key] = resolve(v, texts);
    else if (TEXT_LIST_KEYS.has(key) && Array.isArray(v)) out[key] = v.map((s) => resolve(s, texts));
    else out[key] = unpackValue(v, texts);
  }
  return out;
}

// De leesstap van schema 6 naar het model: elke verwijzing wordt weer de tekst, de tabel gaat eruit. Gooit nooit;
// een payload zonder verwijzingen (schema 5 of ouder, of een kopie van voor een import) komt ongewijzigd terug.
export function unpackProposalTexts(payload: Record<string, unknown>): Record<string, unknown> {
  if (!('proposalTexts' in payload) && !Array.isArray(payload.planChangeProposals)) return payload;
  const { proposalTexts, ...rest } = payload;
  const texts: Record<string, string> = {};
  if (isRecord(proposalTexts)) {
    for (const [k, v] of Object.entries(proposalTexts)) if (typeof v === 'string') texts[k] = v;
  }
  if (Array.isArray(rest.planChangeProposals)) rest.planChangeProposals = rest.planChangeProposals.map((p) => unpackValue(p, texts));
  return rest;
}

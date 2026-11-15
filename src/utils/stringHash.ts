// Een kleine, vaste hash over tekst: alleen om te zien of iets veranderde, nooit
// als beveiliging. Eén plek voor wat eerder op vier plekken stond (backlog I-38).
// Standaard h * 31 + teken vanaf 0; met multiplier 33 en seed 5381 is het djb2.
// Elke stap blijft binnen 32 bits, de uitkomst is zonder teken.

export interface StringHashOptions {
  multiplier?: number;
  seed?: number;
}

export function stringHash(text: string, { multiplier = 31, seed = 0 }: StringHashOptions = {}): number {
  let h = seed | 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(h, multiplier) + text.charCodeAt(i)) | 0;
  return h >>> 0;
}

// The same as a short text (base 36), for an id or a key.
export function stringHashKey(text: string, options?: StringHashOptions): string {
  return stringHash(text, options).toString(36);
}

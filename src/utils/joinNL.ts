// "a, b en c". Eén woord blijft zoals het is, een lege lijst geeft een lege tekst.
export function joinNL(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} en ${items[items.length - 1]}`;
}

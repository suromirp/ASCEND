// Een getal met een nul ervoor tot twee tekens: 5 wordt "05". Voor uren,
// minuten, maanden en dagen in een tijd of datumtekst.
export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

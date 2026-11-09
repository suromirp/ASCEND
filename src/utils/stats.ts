// Gedeelde rekenhulpjes. Een lege lijst geeft NaN (delen door nul, geen midden); de aanroepers bewaken dat
// zelf, zoals ze altijd deden.

export function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// Standaarddeviatie van de hele reeks (delen door n, niet n min 1).
export function stdev(values: number[]): number {
  const m = mean(values);
  return Math.sqrt(values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length);
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ASCEND: hoeveel ruimte de app op dit toestel gebruikt, als tekst voor de rij "Ruimte op dit
// toestel" in Gegevens en back-up (docs/beslissingen/2026-10-31-data-lange-termijn.md).
// De meting zelf (navigator.storage.estimate, met een tijdsgrens) staat in
// storage/storageEstimate.ts; hier staan de drempel en de woorden.
//
// Puur: geen React, geen IndexedDB.

// Boven dit deel van wat de browser geeft, is het krap.
export const STORAGE_TIGHT_SHARE = 0.8;
// Zo lang mag de meting duren.
export const STORAGE_ESTIMATE_MS = 3_000;

export type StorageEstimate =
  | { kind: 'measured'; usage: number; quota?: number }
  | { kind: 'unavailable' }
  | { kind: 'timeout' };

// "850 KB", "12 MB", "1,4 GB": decimaal, zoals de browser en de telefoon het tonen.
export function formatSize(bytes: number): string {
  if (!(bytes >= 0)) return '0 B';
  if (bytes < 1000) return `${Math.round(bytes)} B`;
  if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} KB`;
  const comma = (n: number) => (n < 10 ? (Math.round(n * 10) / 10).toString().replace('.', ',') : String(Math.round(n)));
  if (bytes < 1_000_000_000) return `${comma(bytes / 1_000_000)} MB`;
  return `${comma(bytes / 1_000_000_000)} GB`;
}

export interface StorageUseText {
  value: string;
  sub?: string;
  // Niet gemeten: gedimd.
  dim?: boolean;
  // Krap: een waarschuwing in amber.
  tight?: boolean;
}

export function storageUseText(estimate: StorageEstimate | undefined): StorageUseText | undefined {
  if (!estimate) return undefined;
  if (estimate.kind === 'unavailable') return { value: 'Niet te zien', dim: true, sub: 'Deze browser zegt niet hoeveel ruimte de app gebruikt' };
  if (estimate.kind === 'timeout') return { value: 'Niet te zien', dim: true, sub: 'De browser gaf niet op tijd antwoord. Probeer het later nog eens' };
  const usage = Math.max(0, estimate.usage);
  const quota = estimate.quota && estimate.quota > 0 ? estimate.quota : undefined;
  if (!quota) return { value: formatSize(usage) };
  const share = usage / quota;
  if (share >= STORAGE_TIGHT_SHARE) {
    return { value: formatSize(usage), tight: true, sub: `Bijna vol: ${Math.min(100, Math.round(share * 100))} % van ${formatSize(quota)}. Maak een back-up en ruim reeksen op` };
  }
  return { value: formatSize(usage), sub: `Van de ${formatSize(quota)} die de browser geeft` };
}

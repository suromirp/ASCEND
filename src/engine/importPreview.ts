// De voorvertoning van een import staat voor Akkoord, dus in de toekomende tijd:
// wat erbij komt en wat wordt bijgewerkt, niet wat al veranderd is.

export interface ImportDiffCounts {
  toAdd: number;
  toReplace: number;
  toSkipDuplicate: number;
}

export function importDiffLine(entry: ImportDiffCounts): string {
  const parts = [
    entry.toAdd > 0 && `${entry.toAdd} ${entry.toAdd === 1 ? 'komt' : 'komen'} erbij`,
    entry.toReplace > 0 && `${entry.toReplace} ${entry.toReplace === 1 ? 'wordt' : 'worden'} bijgewerkt`,
    entry.toSkipDuplicate > 0 && `${entry.toSkipDuplicate} ${entry.toSkipDuplicate === 1 ? 'staat' : 'staan'} er al`,
  ].filter(Boolean);
  return parts.join(' · ') || 'Geen wijzigingen';
}

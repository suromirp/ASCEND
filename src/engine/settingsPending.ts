// ASCEND: welke rij op welke bron van de instellingen wacht. Zolang die bron nog niet binnen is,
// staat er "Bezig…" in plaats van een waarde die nog niet klopt. Een bron heeft een eigen grens
// (utils/loadParts.ts), dus het blijft kort.

export type SettingsSource = 'watch' | 'macroFactor' | 'storage' | 'snapshots' | 'autoBackup' | 'streams' | 'storageUse' | 'device' | 'healthConnect';

const ROWS: Record<string, readonly SettingsSource[]> = {
  garmin: ['watch'],
  koppelingen: ['watch', 'macroFactor'],
  'health-connect': ['healthConnect'],
  opslag: ['storage'],
  momentopnamen: ['snapshots'],
  gegevens: ['snapshots'],
  'auto-backup': ['autoBackup'],
  backupmap: ['autoBackup'],
  'ruimte-app': ['storageUse'],
  'reeksen-ruimte': ['streams'],
  toestemmingen: ['device'],
  'bundel-meldingen': ['device'],
};

function leansOn(rowId: string, list: readonly SettingsSource[] | undefined): boolean {
  if (!list || list.length === 0) return false;
  return (ROWS[rowId] ?? []).some((s) => list.includes(s));
}

// De bron is er nog niet (eerste keer): de rij zegt "Bezig…".
export const isRowPending = leansOn;
// De bron gaf geen antwoord op tijd of faalde, en er was nog geen waarde: de rij zegt "Onbekend".
export const isRowUnknown = leansOn;

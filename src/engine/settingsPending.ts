// ASCEND: welke rij op welke bron van de instellingen wacht. Zolang die bron nog niet binnen is,
// staat er "Bezig" in plaats van een waarde die nog niet klopt. Een bron heeft een eigen grens
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
};

export function isRowPending(rowId: string, pending: readonly SettingsSource[] | undefined): boolean {
  if (!pending || pending.length === 0) return false;
  return (ROWS[rowId] ?? []).some((s) => pending.includes(s));
}

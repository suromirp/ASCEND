// Een fout met een zin die ASCEND zelf schreef, voor de gebruiker bedoeld. Andere fouten (van de
// browser of IndexedDB, vaak Engels) gaan naar de console en de gebruiker ziet een vaste zin.
export class BackupMessageError extends Error {
  name = 'BackupMessageError';
}

export function backupErrorText(err: unknown, fallback: string): string {
  if (err instanceof BackupMessageError) return err.message;
  console.warn(fallback, err instanceof Error ? err.message : err);
  return fallback;
}

// ASCEND: "Back-up maken" met de hand, de teksten en namen (puur). Het schrijven zelf staat in
// storage/manualBackup.ts. In de Android-app komt het bestand in Documenten/ASCEND, op dezelfde veilige
// weg als de automatische back-up; in de browser blijft het een download.

import type { AutoBackupFailureReason, BackupWriteStep } from './autoBackup';
import { longDate } from './settingsSummary';
import { localDateOf, localTimeOf } from '../utils/dates';

// Wat er na een tik op "Back-up maken" gebeurde; altijd zichtbaar gemaakt.
export type BackupOutcome =
  | { status: 'saved'; name: string; folder: string }
  | { status: 'downloaded' }
  | { status: 'cancelled' }
  | { status: 'failed'; message: string };

const pad = (n: number) => String(n).padStart(2, '0');

// ascend-JJJJ-MM-DD-UUuMM.ascend-backup.json, met de lokale tijd. Bewust niet in de vorm van de
// automatische back-up (ascend-JJJJ-MM-DD[-n]...): die bestanden ruimt ASCEND zelf op, deze nooit.
// `n` 2 en hoger is een volgnummer als de naam al bezet is.
export function manualBackupName(now: Date, n = 1): string {
  const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}u${pad(now.getMinutes())}`;
  return `ascend-${day}-${time}${n > 1 ? `-${n}` : ''}.ascend-backup.json`;
}

export function savedBackupText(folder: string, name: string): string {
  return `Back-up opgeslagen in ${folder} als ${name}.`;
}

const DOWNLOADED_BACKUP_TEXT = 'Back-up gedownload.';

const REASON_TEXT: Record<AutoBackupFailureReason, string> = {
  permission: 'Geen toegang tot Documents. Geef toegang bij Vaste map en probeer het nog eens',
  folder: 'de map ASCEND in Documents is niet te bereiken',
  write: 'het bestand kon niet worden geschreven. Kijk of er nog ruimte is op je telefoon',
  timeout: 'het duurde te lang. Kijk in de map of hij er toch staat',
};

// Bij 'write' de stap die het echt was: alleen het tijdelijke bestand zelf kan aan ruimte liggen.
const STEP_TEXT: Record<BackupWriteStep, string> = {
  temp: REASON_TEXT.write,
  rename: 'het bestand kon zijn naam niet krijgen. Probeer het nog eens',
  verify: 'het bestand is geschreven, maar teruglezen lukte niet. Probeer het nog eens',
  names: 'er staan al te veel back-ups van deze minuut in de map. Probeer het over een minuut nog eens',
};

export function failedBackupText(reason: AutoBackupFailureReason | 'unknown', step?: BackupWriteStep): string {
  const why = reason === 'unknown' ? 'er ging iets mis. Probeer het nog eens' : reason === 'write' && step ? STEP_TEXT[step] : REASON_TEXT[reason];
  return `Opslaan lukte niet: ${why}.`;
}

// Wanneer de laatste automatische back-up in de map lukte, of dat hij nog niet draaide.
export function lastAutoBackupLine(lastAutoAt: string | undefined, label: string): string {
  return lastAutoAt
    ? `De laatste automatische back-up in ${label} lukte op ${longDate(localDateOf(lastAutoAt))} om ${localTimeOf(lastAutoAt)}.`
    : 'De automatische back-up heeft nog niet gedraaid.';
}

// De zichtbare uitkomst in één zin; niets bij 'cancelled' (de gebruiker brak zelf af).
export function backupOutcomeText(outcome: BackupOutcome): string | null {
  switch (outcome.status) {
    case 'saved':
      return outcome.folder ? savedBackupText(outcome.folder, outcome.name) : `Back-up opgeslagen als ${outcome.name}.`;
    case 'downloaded':
      return DOWNLOADED_BACKUP_TEXT;
    case 'failed':
      return outcome.message;
    case 'cancelled':
      return null;
  }
}

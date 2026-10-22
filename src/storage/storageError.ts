// ASCEND: een fout van de opslag (IndexedDB) in woorden waar je iets mee kunt.
//
// Een AbortError is meestal geen kapotte of geblokkeerde opslag: een transactie
// die nog openstond toen Chrome de app bevroor, wordt afgebroken zodat de opslag
// vrijkomt voor een ander venster (storage/lifecycle.ts). Dan helpt gewoon nog
// een keer proberen; de privévenster-tekst zou de gebruiker op het verkeerde
// spoor zetten.

import { BOOT_LOCK_BUSY_TEXT } from '../engine/bootWatch';

export const ABORTED_WHILE_SAVING = 'ASCEND werd weggelegd terwijl hij iets opsloeg. Probeer het opnieuw.';

function errorName(err: unknown): string {
  return err instanceof DOMException || err instanceof Error ? err.name : '';
}

// Bij het openen: de opslag gaat niet open of een opstartstap mislukt.
export function describeStorageError(err: unknown): string {
  const name = errorName(err);
  if (name === 'BootLockBusy') return BOOT_LOCK_BUSY_TEXT;
  // Een ander venster nam het openen over (Toch openen daar).
  if (name === 'BootLockStolen') return 'ASCEND is in een ander venster geopend.';
  if (name === 'AbortError') return ABORTED_WHILE_SAVING;
  if (name === 'QuotaExceededError') return 'De opslag op dit toestel is vol. Maak ruimte vrij en open ASCEND opnieuw.';
  if (name === 'VersionError') return 'Er draait hier een oudere versie van ASCEND dan je gegevens. ASCEND zoekt de nieuwste versie en werkt zichzelf bij. Tik anders op Bijwerken zodra die knop verschijnt.';
  return 'ASCEND kan op dit toestel geen gegevens opslaan. Gebruik je een privévenster of is opslag voor deze site geblokkeerd? Open de app dan in een normaal venster.';
}

// Tijdens het gebruik: een opslaan dat niet lukte (de melding bovenin).
export function describeWriteError(err: unknown): string {
  const name = errorName(err);
  if (name === 'QuotaExceededError') return 'Opslaan lukt niet: de opslag op dit toestel is vol. Maak een back-up en ruim ruimte op.';
  if (name === 'AbortError') return ABORTED_WHILE_SAVING;
  return 'Opslaan is niet gelukt. Probeer het opnieuw; lukt het niet, maak dan een back-up via Instellingen, Gegevens en back-up.';
}

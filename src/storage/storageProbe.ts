// ASCEND: antwoordt de opslag nog? Een korte proef voor als het openen of een
// back-up blijft hangen: één alleen-lezen transactie op 'meta', met een grens
// van een paar seconden (engine/bootWatch.ts#STORAGE_PROBE_MS). Antwoordt die
// niet, dan houdt iets anders de opslag vast (meestal een bevroren ASCEND,
// docs/beslissingen/2026-10-22-opslag-vrij-bij-wegleggen.md).

import { getDB } from './database';
import { STORAGE_PROBE_MS, type StorageProbe } from '../engine/bootWatch';

export function probeStorage(ms: number = STORAGE_PROBE_MS, read: () => Promise<unknown> = readMeta): Promise<StorageProbe> {
  return new Promise<StorageProbe>((resolve) => {
    const timer = setTimeout(() => resolve('silent'), ms);
    const finish = () => {
      clearTimeout(timer);
      resolve('answers');
    };
    // An error is an answer too: the storage is there, it said no. The screen
    // then shows the error of the step itself.
    read().then(finish, finish);
  });
}

async function readMeta(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('meta', 'readonly');
  await tx.store.get('seeded');
  await tx.done;
}

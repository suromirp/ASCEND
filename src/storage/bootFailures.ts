// De teller van herstelstappen die bij het openen faalden (engine/bootFailures.ts), gelezen voor de
// diagnose onder Versie. Geschreven door storage/bootMigrations.ts. Alleen op dit toestel: niet in de back-up.

import { MetaRepo } from './database';
import { BOOT_FAILURES_KEY, bootFailureDetails, bootFailureLine, type BootFailureRecord } from '../engine/bootFailures';
import { BOOT_STEP_LIMIT_MS } from '../engine/bootWatch';
import { withTimeout } from '../utils/withTimeout';

export interface BootFailureNote {
  line: string;
  // De stapnamen zoals in de code, voor achter Details.
  details: string[];
}

// De zin met de details, of niets als alles lukte of de opslag niet op tijd antwoordt.
export async function bootFailureNote(): Promise<BootFailureNote | undefined> {
  try {
    const rec = await withTimeout(MetaRepo.get<BootFailureRecord>(BOOT_FAILURES_KEY), BOOT_STEP_LIMIT_MS);
    const line = bootFailureLine(rec);
    return line ? { line, details: bootFailureDetails(rec) } : undefined;
  } catch {
    return undefined;
  }
}

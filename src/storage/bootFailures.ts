// De teller van herstelstappen die bij het openen faalden (engine/bootFailures.ts), gelezen voor de
// diagnose onder Versie. Geschreven door storage/bootMigrations.ts. Alleen op dit toestel: niet in de back-up.

import { MetaRepo } from './database';
import { BOOT_FAILURES_KEY, bootFailureLine, type BootFailureRecord } from '../engine/bootFailures';
import { BOOT_STEP_LIMIT_MS } from '../engine/bootWatch';
import { withTimeout } from '../utils/withTimeout';

// De zin, of niets als alles lukte of de opslag niet op tijd antwoordt.
export async function bootFailureNote(): Promise<string | undefined> {
  try {
    return bootFailureLine(await withTimeout(MetaRepo.get<BootFailureRecord>(BOOT_FAILURES_KEY), BOOT_STEP_LIMIT_MS));
  } catch {
    return undefined;
  }
}

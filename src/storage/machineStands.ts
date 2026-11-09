// ASCEND: de standen van een toestel wegschrijven tijdens een training (engine/toestelStanden.ts).
//
// Alles of niets: de nieuwe instellingen worden helemaal uitgerekend en dan in één keer geschreven
// (`write`, in de app `updateSettings`, dat is één put in IndexedDB). Lukt dat niet, dan blijft de oude
// stand staan en zegt de uitkomst het. Het lezen gebeurt vlak voor het schrijven, en twee tikken kort na
// elkaar wachten op elkaar, zodat de tweede stand de eerste niet overschrijft. Een log wordt hier nooit
// gelezen om te schrijven en nooit aangeraakt.

import type { Exercise } from '../models/exercise';
import type { StrengthSettings } from '../engine/strengthSettings';
import { seedOnOpen, standAfterTick, withStandForgotten, type StandSkip } from '../engine/toestelStanden';
import { SettingsRepo } from './databaseSettings';

export interface StandIo {
  read: () => Promise<StrengthSettings | undefined>;
  write: (next: StrengthSettings) => Promise<unknown>;
}

const repoIo: StandIo = {
  read: async () => (await SettingsRepo.get()).strengthModel,
  write: (next) => SettingsRepo.set({ strengthModel: next }),
};

// Hoe lang een schrijfactie mag duren voor de uitkomst "niet gelukt" is (een knop die wacht heeft een grens).
export const STAND_WRITE_TIMEOUT_MS = 4000;

export type StandWrite =
  | { kind: 'learned'; kg: number }
  | { kind: 'seeded' }
  | { kind: 'forgotten'; kg: number }
  | { kind: 'none'; reason: StandSkip | 'off' | 'gone' }
  | { kind: 'failed' };

let queue: Promise<unknown> = Promise.resolve();

// Eén schrijfactie tegelijk, in volgorde.
function serial<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => undefined);
  return run;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => { clearTimeout(timer); resolve(v); }, (e: unknown) => { clearTimeout(timer); reject(e instanceof Error ? e : new Error(String(e))); });
  });
}

async function apply(next: StrengthSettings, io: StandIo): Promise<boolean> {
  try {
    await withTimeout(Promise.resolve(io.write(next)), STAND_WRITE_TIMEOUT_MS);
    return true;
  } catch {
    return false;
  }
}

// Na het afvinken van een set: inlezen als het toestel nog geen sleutel heeft, en het gewicht onthouden
// als het een nieuwe stand is. `usedKg`: de gewichten uit je trainingen in deze sportschool (`usedBefore`).
export function rememberStand(input: { exercise: Exercise | undefined; weightKg: number | undefined; remember: boolean; usedKg?: number[] }, io: StandIo = repoIo): Promise<StandWrite> {
  return serial(async () => {
    const out = standAfterTick(await io.read(), input.exercise, input.weightKg, { remember: input.remember, usedKg: input.usedKg });
    if (out.kind === 'none') return out;
    if (!(await apply(out.settings, io))) return { kind: 'failed' };
    return out.kind === 'learned' ? { kind: 'learned', kg: out.kg } : { kind: 'seeded' };
  });
}

// Bij het openen van een toestel in Forge of in het blad: één keer inlezen.
export function seedStandsNow(input: { exercise: Exercise | undefined; remember: boolean; usedKg?: number[] }, io: StandIo = repoIo): Promise<StandWrite> {
  return serial(async () => {
    const next = seedOnOpen(await io.read(), input.exercise, { remember: input.remember, usedKg: input.usedKg });
    if (!next) return { kind: 'none', reason: 'known' };
    return (await apply(next, io)) ? { kind: 'seeded' } : { kind: 'failed' };
  });
}

// Terugdraaien: alleen die stand weg.
export function forgetStandNow(input: { exercise: Exercise | undefined; weightKg: number }, io: StandIo = repoIo): Promise<StandWrite> {
  return serial(async () => {
    const next = withStandForgotten(await io.read(), input.exercise, input.weightKg);
    if (!next) return { kind: 'none', reason: 'gone' };
    return (await apply(next, io)) ? { kind: 'forgotten', kg: input.weightKg } : { kind: 'failed' };
  });
}

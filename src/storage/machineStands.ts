// ASCEND: de standen van een toestel wegschrijven tijdens een training (engine/toestelStanden.ts).
//
// Alles of niets: de nieuwe instellingen worden helemaal uitgerekend en dan in één keer geschreven
// (`write`, in de app `updateSettings`, dat is één put in IndexedDB). Lukt dat niet, dan blijft de oude
// stand staan en zegt de uitkomst het. Het lezen gebeurt vlak voor het schrijven, en twee tikken kort na
// elkaar wachten op elkaar, zodat de tweede stand de eerste niet overschrijft. Een log wordt hier nooit
// gelezen om te schrijven en nooit aangeraakt.

import type { Exercise } from '../models/exercise';
import type { StrengthSettings } from '../engine/strengthSettings';
import { seedOnOpen, standAfterTick, standsBefore, withStandForgotten, withStandsCleared, withStandsRestored, withStandsSet, type StandsBefore, type StandSkip } from '../engine/toestelStanden';
import { SettingsRepo } from './databaseSettings';

export interface StandIo {
  read: () => Promise<StrengthSettings | undefined>;
  write: (next: StrengthSettings) => Promise<unknown>;
}

const repoIo: StandIo = {
  read: async () => (await SettingsRepo.get()).strengthModel,
  write: (next) => SettingsRepo.set({ strengthModel: next }),
};

// Wat er nu echt is opgeslagen; de app leest hier vlak voor het schrijven.
export const readStandSettings = repoIo.read;

// Hoe lang een schrijfactie mag duren voor de uitkomst "niet gelukt" is (een knop die wacht heeft een grens).
export const STAND_WRITE_TIMEOUT_MS = 4000;

export type StandWrite =
  | { kind: 'learned'; kg: number }
  | { kind: 'seeded' }
  | { kind: 'forgotten'; kg: number }
  | { kind: 'none'; reason: StandSkip | 'off' | 'gone' }
  | { kind: 'failed' };

let queue: Promise<unknown> = Promise.resolve();

// Een hele beurt (lezen en schrijven) duurt hoogstens zo lang; daarna komt de volgende aan de beurt.
export const STAND_JOB_TIMEOUT_MS = 2 * STAND_WRITE_TIMEOUT_MS + 1000;

// Eén schrijfactie tegelijk, in volgorde. Elke beurt heeft een grens in tijd, zodat een hangende lezing of
// schrijfactie de wachtrij nooit voor altijd vasthoudt.
function serial<T>(job: () => Promise<T>): Promise<T> {
  const bounded = () => withTimeout(job(), STAND_JOB_TIMEOUT_MS);
  const run = queue.then(bounded, bounded);
  queue = run.catch(() => undefined);
  return run;
}

// Lezen met een grens in tijd; een lezing die niet lukt is "failed".
const readWithin = (io: StandIo): Promise<StrengthSettings | undefined> => withTimeout(Promise.resolve(io.read()), STAND_WRITE_TIMEOUT_MS);

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
    let raw: StrengthSettings | undefined;
    try { raw = await readWithin(io); } catch { return { kind: 'failed' }; }
    const out = standAfterTick(raw, input.exercise, input.weightKg, { remember: input.remember, usedKg: input.usedKg });
    if (out.kind === 'none') return out;
    if (!(await apply(out.settings, io))) return { kind: 'failed' };
    return out.kind === 'learned' ? { kind: 'learned', kg: out.kg } : { kind: 'seeded' };
  });
}

// Bij het openen van een toestel in Forge of in het blad: één keer inlezen.
export function seedStandsNow(input: { exercise: Exercise | undefined; remember: boolean; usedKg?: number[] }, io: StandIo = repoIo): Promise<StandWrite> {
  return serial(async () => {
    let raw: StrengthSettings | undefined;
    try { raw = await readWithin(io); } catch { return { kind: 'failed' }; }
    const next = seedOnOpen(raw, input.exercise, { remember: input.remember, usedKg: input.usedKg });
    if (!next) return { kind: 'none', reason: 'known' };
    return (await apply(next, io)) ? { kind: 'seeded' } : { kind: 'failed' };
  });
}

// Terugdraaien: alleen die stand weg.
export function forgetStandNow(input: { exercise: Exercise | undefined; weightKg: number }, io: StandIo = repoIo): Promise<StandWrite> {
  return serial(async () => {
    let raw: StrengthSettings | undefined;
    try { raw = await readWithin(io); } catch { return { kind: 'failed' }; }
    const next = withStandForgotten(raw, input.exercise, input.weightKg);
    if (!next) return { kind: 'none', reason: 'gone' };
    return (await apply(next, io)) ? { kind: 'forgotten', kg: input.weightKg } : { kind: 'failed' };
  });
}


// Het blad Standen van dit toestel: opslaan en wissen. Zelfde regels als hierboven: alles of niets, met een
// grens in tijd, achter elkaar. De uitkomst geeft de nieuwe instellingen mee, zodat het scherm er meteen mee kan rekenen.
export type StandsSave = { kind: 'saved'; settings: StrengthSettings } | { kind: 'failed' } | { kind: 'too_many' };

async function saveWith(make: (raw: StrengthSettings | undefined) => StrengthSettings | undefined, io: StandIo): Promise<StandsSave> {
  let raw: StrengthSettings | undefined;
  try {
    raw = await readWithin(io);
  } catch {
    return { kind: 'failed' };
  }
  const next = make(raw);
  if (!next) return { kind: 'too_many' };
  return (await apply(next, io)) ? { kind: 'saved', settings: next } : { kind: 'failed' };
}

export function saveStandsNow(input: { exercise: Exercise | undefined; kg: number[]; only: boolean }, io: StandIo = repoIo): Promise<StandsSave> {
  return serial(() => saveWith((raw) => withStandsSet(raw, input.exercise, input.kg, input.only), io)).catch((): StandsSave => ({ kind: 'failed' }));
}

// Standen wissen. Bij `saved` staat in `before` wat er stond, gelezen in dezelfde beurt als het schrijven,
// zodat Terugdraaien precies dat terugzet.
export type StandsClear = { kind: 'saved'; settings: StrengthSettings; before: StandsBefore } | { kind: 'failed' } | { kind: 'too_many' };

export function clearStandsNow(input: { exercise: Exercise | undefined }, io: StandIo = repoIo): Promise<StandsClear> {
  return serial(async (): Promise<StandsClear> => {
    let raw: StrengthSettings | undefined;
    try {
      raw = await readWithin(io);
    } catch {
      return { kind: 'failed' };
    }
    const before = standsBefore(raw, input.exercise);
    const next = withStandsCleared(raw, input.exercise);
    if (!next || !before) return { kind: 'too_many' };
    return (await apply(next, io)) ? { kind: 'saved', settings: next, before } : { kind: 'failed' };
  }).catch((): StandsClear => ({ kind: 'failed' }));
}

// Terugdraaien na Standen wissen: alles of niets, met dezelfde grens in tijd.
export function restoreStandsNow(input: { before: StandsBefore }, io: StandIo = repoIo): Promise<StandsSave> {
  return serial(() => saveWith((raw) => withStandsRestored(raw, input.before), io)).catch((): StandsSave => ({ kind: 'failed' }));
}

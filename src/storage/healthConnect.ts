// ASCEND: Health Connect op dit toestel (docs/beslissingen/2026-11-02-health-connect.md).
//
// Eén meta-sleutel met de stand: aan of uit, wat Android toestond, wanneer het laatst lukte, de
// laatste fout en de trainingen van de laatste ronde (voor de kaart op Vandaag). De ochtenden
// (slaap, rusthartslag, HRV) gaan in de gewone opslag van RecoveryMetric, met het id
// "health-connect:<datum>", zodat uitzetten precies die terugvindt.
//
// Wat hier nooit gebeurt:
// - een log maken of veranderen. Een training uit Health Connect wordt pas een log als jij op
//   Vandaag Opslaan kiest (of Vanzelf afvinken het doet, zoals bij intervals.icu); een bestaand log
//   blijft zoals het is.
// - de planning veranderen. Wat binnenkomt loopt via de voorstellen die er al zijn.
// - half opslaan. Een ronde haalt eerst alles op en schrijft dan alles in één transactie, of niets.
//
// Niets hiervan gaat mee in de back-up behalve de ochtenden, en die alleen zoals elke ochtend
// (engine/morningBackup.ts).

import { getDB, MetaRepo, RecoveryMetricsRepo, SettingsRepo } from './database';
import { migrateHealthConnectState } from './migrations';
import { planRetire, resolveMorningBackup } from '../engine/morningBackup';
import { KEEP_DAYS } from '../engine/wellnessRange';
import { filterRecovery } from '../engine/watchUse';
import { getWatchState } from './externalActivities';
import type { ExternalActivity } from '../engine/activityImport';
import type { RecoveryMetric } from '../models/metrics';
import {
  HEALTH_CONNECT_ADAPTER_ID,
  HealthConnectError,
  createHealthConnectAdapter,
  healthConnectErrorOf,
  healthConnectPort,
  type HealthConnectPort,
} from '../integrations/healthConnect';
import type { HealthConnectErrorKind, HealthEnableResult, HealthKind, HealthSyncResult } from '../models/healthConnect';

export type { HealthEnableResult, HealthSyncResult } from '../models/healthConnect';
import { addDays, toISODate } from '../utils/dates';
import { withTimeout } from '../utils/withTimeout';

export const HEALTH_CONNECT_KEY = 'healthConnect';
const PREFIX = `${HEALTH_CONNECT_ADAPTER_ID}:`;

// Hoe ver een ronde terugkijkt: de trainingen zoals bij intervals.icu, de ochtenden vier weken
// (het gemiddelde van de ochtendcheck). Health Connect geeft zonder extra toestemming toch niet
// meer dan dertig dagen terug.
const HC_ACTIVITY_DAYS = 7;
const HC_MORNING_DAYS = 28;
// Bij openen van de app, en dan hoogstens eens per drie uur. Na een fout een half uur rust.
export const HC_FETCH_HOURS = 3;
export const HC_RETRY_MINUTES = 30;
// Een hele ronde duurt nooit langer dan dit; daarna is de uitkomst een fout en wordt er niets
// geschreven.
const HC_ROUND_MS = 30_000;

export interface HealthConnectState {
  enabled: boolean;
  // Wat Android de laatste keer toestond.
  granted: HealthKind[];
  // De laatste ronde die lukte, en de laatste poging (ook als die mislukte).
  fetchedAt?: string;
  attemptAt?: string;
  lastError?: { kind: HealthConnectErrorKind; message: string };
  // De trainingen van de laatste ronde, nog geen log.
  activities: ExternalActivity[];
}

export async function getHealthConnectState(): Promise<HealthConnectState> {
  return migrateHealthConnectState(await MetaRepo.get(HEALTH_CONNECT_KEY));
}

async function putState(state: HealthConnectState): Promise<void> {
  await MetaRepo.set(HEALTH_CONNECT_KEY, state);
  notifyHealthConnectChange();
}

// Hetzelfde signaal als bij het horloge: de kaart op Vandaag en de instellingen lezen opnieuw.
const listeners = new Set<() => void>();
export function onHealthConnectChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function notifyHealthConnectChange(): void {
  listeners.forEach((l) => l());
}

// --- de ronde -------------------------------------------------------------------------------

export interface HealthSyncOptions {
  force?: boolean;
  now?: Date;
  port?: HealthConnectPort;
  // Voor tests: een kortere grens.
  roundMs?: number;
}

function isHealthFetchDue(state: Pick<HealthConnectState, 'fetchedAt' | 'attemptAt' | 'lastError'>, now: Date): boolean {
  const since = (iso: string | undefined) => (iso && Number.isFinite(Date.parse(iso)) ? now.getTime() - Date.parse(iso) : Infinity);
  if (state.lastError && since(state.attemptAt) < HC_RETRY_MINUTES * 60_000) return false;
  return since(state.fetchedAt) >= HC_FETCH_HOURS * 3600_000;
}

// Alles in één transactie: de nieuwe ochtenden, wat ouder is dan de grens (met "Ochtendgetallen
// in back-up" aan blijven daarvan de vier getallen, engine/morningBackup.ts#planRetire) en de stand.
// De stand wordt binnen dezelfde transactie gelezen; `next` maakt er de nieuwe van, of geeft
// undefined (bijvoorbeeld: Health Connect is intussen uitgezet), en dan wordt er niets geschreven en
// is de uitkomst false. Gaat er iets mis, dan gaat de hele transactie terug.
export async function commitHealthRound(
  next: (current: HealthConnectState) => HealthConnectState | undefined,
  put: readonly RecoveryMetric[] = [],
  remove: readonly string[] = [],
): Promise<boolean> {
  const db = await getDB();
  const tx = db.transaction(['meta', 'recoveryMetrics'], 'readwrite');
  const done = tx.done;
  done.catch(() => undefined);
  try {
    const state = next(migrateHealthConnectState(await tx.objectStore('meta').get(HEALTH_CONNECT_KEY)));
    if (!state) {
      tx.abort();
      return false;
    }
    const metrics = tx.objectStore('recoveryMetrics');
    const requests: Promise<unknown>[] = [];
    // Elk verzoek meteen met een vangnet: gaat een later verzoek mis, dan breken de eerdere af en
    // die fout hoort bij deze transactie, niet los ergens anders.
    const add = (request: Promise<unknown>) => {
      request.catch(() => undefined);
      requests.push(request);
    };
    for (const id of remove) add(metrics.delete(id));
    for (const m of put) add(metrics.put(m));
    add(tx.objectStore('meta').put(state, HEALTH_CONNECT_KEY));
    await Promise.all(requests);
  } catch (err) {
    try {
      tx.abort();
    } catch {
      // Al afgebroken.
    }
    throw err;
  }
  await done;
  return true;
}

let inflight: Promise<HealthSyncResult> | undefined;

// Haalt de laatste week trainingen en vier weken ochtenden uit Health Connect. Gooit nooit: een
// fout wordt een uitkomst met een zin, en wat er al stond blijft staan. Eén ronde tegelijk: een
// gewone vraag tijdens een ronde krijgt die ronde; met `force` (aanzetten, een knop) komt er na de
// lopende ronde nog een eigen, zodat de nieuwe toestemming of stand echt wordt gebruikt.
export function syncHealthConnect(options: HealthSyncOptions = {}): Promise<HealthSyncResult> {
  if (inflight && !options.force) return inflight;
  const before = inflight ?? Promise.resolve(undefined);
  const mine: Promise<HealthSyncResult> = before
    .catch(() => undefined)
    .then(() => runRound(options))
    .finally(() => {
      if (inflight === mine) inflight = undefined;
    });
  inflight = mine;
  return mine;
}

async function runRound(options: HealthSyncOptions): Promise<HealthSyncResult> {
  const now = options.now ?? new Date();
  const port = options.port ?? healthConnectPort();
  let state: HealthConnectState;
  try {
    state = await getHealthConnectState();
  } catch {
    return { status: 'error', kind: 'failed', message: 'ASCEND kan de stand van Health Connect niet lezen.' };
  }
  if (!state.enabled) return { status: 'off' };
  if (!port.inApp) return { status: 'web' };
  if (!options.force && !isHealthFetchDue(state, now)) return { status: 'too-soon' };

  try {
    // Na de grens telt de ronde als mislukt. Het ophalen zelf schrijft niets, dus een antwoord dat
    // later toch nog komt, gaat nergens heen.
    const fetched = await withTimeout(fetchRound(port, now), options.roundMs ?? HC_ROUND_MS);
    const settings = await SettingsRepo.get();
    // De keuzes slaap, rusthartslag en HRV ("Gebruik van je horloge") gelden ook hier.
    const use = (await getWatchState()).use;
    const mornings = filterRecovery(fetched.mornings, use);
    const existing = (await RecoveryMetricsRepo.getAll()).filter((m) => m.id.startsWith(PREFIX));
    const cutoff = addDays(toISODate(now), -KEEP_DAYS);
    const retire = planRetire(existing.filter((m) => m.date < cutoff), resolveMorningBackup(settings));
    // Uitgezet terwijl de ronde liep: dan wordt er niets bewaard (binnen de transactie gelezen).
    const stored = await commitHealthRound(
      (latest) => (latest.enabled ? { ...latest, granted: fetched.granted, activities: fetched.activities, fetchedAt: now.toISOString(), attemptAt: now.toISOString(), lastError: undefined } : undefined),
      [...retire.put, ...mornings],
      retire.remove,
    );
    if (!stored) return { status: 'off' };
    notifyHealthConnectChange();
    return { status: 'ok', activities: fetched.activities.length, mornings: mornings.length };
  } catch (err) {
    const e = healthConnectErrorOf(err);
    try {
      // Ook de foutregel alleen als het nog aan staat, binnen de transactie gelezen.
      if (await commitHealthRound((latest) => (latest.enabled ? { ...latest, attemptAt: now.toISOString(), lastError: { kind: e.kind, message: e.message } } : undefined))) notifyHealthConnectChange();
    } catch {
      // Opslag die ook hapert: de uitkomst komt toch bij wie vroeg.
    }
    return { status: 'error', kind: e.kind, message: e.message };
  }
}

// Alles ophalen, in het geheugen; pas als alles er is wordt er iets geschreven.
async function fetchRound(port: HealthConnectPort, now: Date): Promise<{ granted: HealthKind[]; activities: ExternalActivity[]; mornings: RecoveryMetric[] }> {
  const available = await port.availability();
  if (available !== 'ready') throw new HealthConnectError(available === 'web' ? 'web' : available);
  const granted = await port.granted();
  // Alles ingetrokken: de koppeling werkt niet meer. Wat er stond blijft, tot jij kiest.
  if (granted.length === 0) throw new HealthConnectError('denied');
  const adapter = createHealthConnectAdapter({ ...port, granted: async () => granted }, { now: () => now });
  const today = toISODate(now);
  const tomorrow = addDays(today, 1);
  const activities = await adapter.fetchExternalActivities!({ from: addDays(today, -HC_ACTIVITY_DAYS), to: tomorrow });
  const mornings = await adapter.fetchRecoveryMetrics!({ from: addDays(today, -HC_MORNING_DAYS), to: tomorrow });
  return { granted, activities, mornings };
}

// --- aan en uit -----------------------------------------------------------------------------

// Aanzetten: pas hier vraagt Android om toestemming. Staat Health Connect niet op de telefoon, of
// sta je niets toe, dan blijft het uit en zegt de uitkomst waarom.
export async function enableHealthConnect(options: { port?: HealthConnectPort; now?: Date } = {}): Promise<HealthEnableResult> {
  const port = options.port ?? healthConnectPort();
  if (!port.inApp) return { status: 'web' };
  try {
    const available = await port.availability();
    if (available !== 'ready') return { status: available };
    const granted = await port.request();
    if (granted.length === 0) return { status: 'denied' };
    const state = await getHealthConnectState();
    await putState({ ...state, enabled: true, granted, lastError: undefined, fetchedAt: undefined, attemptAt: undefined });
    return { status: 'on', granted, sync: await syncHealthConnect({ force: true, port, now: options.now }) };
  } catch (err) {
    return { status: 'error', message: healthConnectErrorOf(err).message };
  }
}

// Uitzetten: niets meer ophalen, en wat er van Health Connect kwam gaat van de telefoon. Met
// "Ochtendgetallen in back-up" aan blijven van de ochtenden alleen de vier getallen, net als bij
// het ontkoppelen van intervals.icu (storage/wellness.ts#clearWellness). Logs blijven: dat is
// historie. In één transactie.
export async function disableHealthConnect(): Promise<void> {
  const ours = (await RecoveryMetricsRepo.getAll()).filter((m) => m.id.startsWith(PREFIX));
  const plan = planRetire(ours, resolveMorningBackup(await SettingsRepo.get()));
  await commitHealthRound((current) => ({ ...current, enabled: false, granted: [], activities: [], fetchedAt: undefined, attemptAt: undefined, lastError: undefined }), plan.put, plan.remove);
  notifyHealthConnectChange();
}

// Het scherm van Health Connect zelf, voor wie de vraag van Android niet meer krijgt.
export async function openHealthConnectSettings(port: HealthConnectPort = healthConnectPort()): Promise<boolean> {
  try {
    await port.openSettings();
    return true;
  } catch {
    return false;
  }
}

// ASCEND: Health Connect als bron in de Android-app (docs/beslissingen/2026-11-02-health-connect.md).
//
// Health Connect is de plek waar Android gezondheidsgegevens van andere apps bewaart (Garmin
// Connect, MacroFactor). ASCEND leest er alleen uit, en alleen wat het gebruikt: trainingen met
// hun afstand, slaap, rusthartslag en HRV. Het schrijft er nooit iets in.
//
// Dit bestand is de enige plek die de plugin @capgo/capacitor-health kent. Alles wat eruit komt
// wordt hier de gewone vorm die elke bron vult (ExternalActivity, RecoveryMetric) met
// `source: 'health-connect'`; geen scherm en geen engine-bestand ziet een veld van de plugin.
// De laag naar de telefoon (`HealthConnectPort`) is klein en vervangbaar, zodat tests hem
// nadoen (`setHealthConnectPort`). In de browser is er geen Health Connect: de laag zegt dat
// (`inApp: false`) en doet verder niets.

import { Capacitor } from '@capacitor/core';
import type { HealthSample, Workout, WorkoutType } from '@capgo/capacitor-health';
import type { DataSourceAdapter, DateRange } from './types';
import type { ExternalActivity, ExternalActivityKind } from '../engine/activityImport';
import type { RecoveryMetric } from '../models/metrics';
import { countedSportOfExternalType, type CountedSportId } from '../data/sports';
import { parseISODate, toISODate } from '../utils/dates';
import { withTimeout } from '../utils/withTimeout';

export const HEALTH_CONNECT_ADAPTER_ID = 'health-connect';

// Wat ASCEND mag vragen, in de namen van de plugin. Precies de leesrechten in
// android/app/src/main/AndroidManifest.xml.
export type HealthKind = 'workouts' | 'distance' | 'sleep' | 'restingHeartRate' | 'heartRateVariability';
export const HEALTH_KINDS: readonly HealthKind[] = ['workouts', 'distance', 'sleep', 'restingHeartRate', 'heartRateVariability'];
export type HealthSampleKind = Exclude<HealthKind, 'workouts'>;

export type HealthAvailability = 'ready' | 'not-installed' | 'needs-update' | 'web';

// --- fouten ----------------------------------------------------------------------------

export type HealthConnectErrorKind = 'web' | 'not-installed' | 'needs-update' | 'denied' | 'timeout' | 'failed';

const MESSAGES: Record<HealthConnectErrorKind, string> = {
  web: 'Health Connect werkt alleen in de Android-app van ASCEND.',
  'not-installed': 'Health Connect staat niet op deze telefoon. Installeer het uit de Play Store en zet het daarna hier aan.',
  'needs-update': 'Health Connect moet eerst worden bijgewerkt in de Play Store.',
  denied: 'ASCEND mag Health Connect niet meer lezen. Zet het uit en weer aan om het opnieuw te vragen, of sta het toe in Health Connect zelf.',
  timeout: 'Health Connect gaf niet op tijd antwoord. ASCEND probeert het straks opnieuw.',
  failed: 'Ophalen uit Health Connect lukte niet. ASCEND probeert het straks opnieuw.',
};

export class HealthConnectError extends Error {
  readonly kind: HealthConnectErrorKind;
  constructor(kind: HealthConnectErrorKind) {
    super(MESSAGES[kind]);
    this.name = 'HealthConnectError';
    this.kind = kind;
  }
}

// Wat er ook misging, het wordt een van de soorten hierboven, met een zin die de gebruiker leest.
export function healthConnectErrorOf(err: unknown): HealthConnectError {
  if (err instanceof HealthConnectError) return err;
  const name = err instanceof Error ? err.name : '';
  const text = err instanceof Error ? err.message : String(err);
  if (name === 'TimeoutError') return new HealthConnectError('timeout');
  if (/security|permission|not granted|toestemming/i.test(text)) return new HealthConnectError('denied');
  return new HealthConnectError('failed');
}

// --- van de plugin naar de gewone vormen ---------------------------------------------------

// "2026-10-20T05:30:00Z" -> "2026-10-20T07:30:00": de tijd op de klok van de telefoon, zonder zone,
// zoals elke activiteit in ASCEND (engine/activityImport.ts#ExternalActivity.start).
export function localStart(iso: string): string | undefined {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${toISODate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Welke soort training het is. De namen van de plugin worden hier vertaald naar de soorten van
// ASCEND, en voor zwemmen, voetbal en yoga naar de vaste typenamen die data/sports.ts al kent.
interface KindOf {
  kind: ExternalActivityKind;
  treadmill?: boolean;
  shared?: string;
}
const WORKOUT_KIND: Partial<Record<WorkoutType, KindOf>> = {
  running: { kind: 'run' },
  trackAndField: { kind: 'run' },
  runningTreadmill: { kind: 'run', treadmill: true },
  hiking: { kind: 'hike' },
  walking: { kind: 'hike' },
  snowshoeing: { kind: 'hike' },
  cycling: { kind: 'ride' },
  handCycling: { kind: 'ride' },
  bikingStationary: { kind: 'ride', treadmill: true },
  strengthTraining: { kind: 'strength' },
  traditionalStrengthTraining: { kind: 'strength' },
  functionalStrengthTraining: { kind: 'strength' },
  weightlifting: { kind: 'strength' },
  calisthenics: { kind: 'strength' },
  swimming: { kind: 'other', shared: 'Swim' },
  swimmingPool: { kind: 'other', shared: 'Swim' },
  swimmingOpenWater: { kind: 'other', shared: 'OpenWaterSwim' },
  soccer: { kind: 'other', shared: 'Soccer' },
  yoga: { kind: 'other', shared: 'Yoga' },
};

const MAX_DISTANCE_M = 300_000;
const positive = (n: unknown): number | undefined => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : undefined);
const timeOf = (iso: string): number => new Date(iso).getTime();

// De afstand van een training: de afstanden van dezelfde bron die binnen de training vallen. Een
// andere bron in dezelfde tijd (de telefoon in je zak) telt niet, anders telt hij dubbel.
export function distanceOf(w: Pick<Workout, 'startDate' | 'endDate' | 'sourceId'>, samples: readonly HealthSample[]): number | undefined {
  if (!w.sourceId) return undefined;
  const from = timeOf(w.startDate);
  const to = timeOf(w.endDate);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return undefined;
  let total = 0;
  for (const s of samples) {
    if (s.dataType !== 'distance' || s.sourceId !== w.sourceId) continue;
    const a = timeOf(s.startDate);
    const b = timeOf(s.endDate);
    if (a >= from - 60_000 && b <= to + 60_000) total += positive(s.value) ?? 0;
  }
  return total > 0 ? total : undefined;
}

export function mapHealthWorkout(w: Workout, distances: readonly HealthSample[] = []): ExternalActivity | undefined {
  const start = localStart(w.startDate);
  const durationSec = positive(w.duration);
  if (!start || durationSec === undefined) return undefined;
  const known = WORKOUT_KIND[w.workoutType];
  const kind = known?.kind ?? 'other';
  const countedSport: CountedSportId | undefined = known?.shared ? countedSportOfExternalType(known.shared) : undefined;
  const distance = positive(w.totalDistance) ?? distanceOf(w, distances);
  return {
    externalId: `${HEALTH_CONNECT_ADAPTER_ID}:${w.platformId || w.startDate}`,
    source: 'health-connect',
    start,
    kind,
    durationSec: Math.round(durationSec),
    ...(kind !== 'strength' && distance !== undefined && distance <= MAX_DISTANCE_M ? { distanceM: Math.round(distance) } : {}),
    treadmill: known?.treadmill === true,
    ...(kind === 'other' && countedSport ? { countedSport } : {}),
    // Een soort die ASCEND niet kent: de naam, zodat je kunt zeggen hoe hij telt (engine/customSport.ts).
    ...(kind === 'other' && !countedSport && !known && w.workoutType !== 'other' ? { otherType: w.workoutType.slice(0, 60) } : {}),
  };
}

// Dezelfde grenzen als bij intervals.icu (integrations/intervalsIcu.ts#mapIntervalsWellnessRecord):
// een getal buiten wat een lichaam kan is een fout van de bron, niet een nacht.
const within = (n: unknown, min: number, max: number): number | undefined => (typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max ? n : undefined);

function asleepMinutes(s: HealthSample): number {
  if (s.stages && s.stages.length > 0) return s.stages.filter((st) => st.stage !== 'awake' && st.stage !== 'inBed').reduce((sum, st) => sum + (positive(st.durationMinutes) ?? 0), 0);
  return positive(s.value) ?? 0;
}

const dayOf = (iso: string): string | undefined => localStart(iso)?.slice(0, 10);

// Eén ochtend per dag. De slaap hoort bij de dag waarop je wakker werd, en van de nachten die op
// die dag eindigen telt de langste (een dutje 's middags is geen nacht). Van rusthartslag en HRV
// telt per dag de laatste meting.
export function mapHealthRecovery(input: Partial<Record<'sleep' | 'restingHeartRate' | 'heartRateVariability', readonly HealthSample[]>>): RecoveryMetric[] {
  const byDate = new Map<string, RecoveryMetric>();
  const day = (date: string) => {
    let m = byDate.get(date);
    if (!m) byDate.set(date, (m = { id: `${HEALTH_CONNECT_ADAPTER_ID}:${date}`, date, source: 'health-connect' }));
    return m;
  };
  for (const s of input.sleep ?? []) {
    const date = dayOf(s.endDate);
    const minutes = within(Math.round(asleepMinutes(s)), 10, 20 * 60);
    if (!date || minutes === undefined) continue;
    const m = day(date);
    if ((m.sleepMinutes ?? 0) < minutes) m.sleepMinutes = minutes;
  }
  const latest = (list: readonly HealthSample[] | undefined, min: number, max: number, put: (m: RecoveryMetric, v: number) => void) => {
    const seen = new Map<string, number>();
    for (const s of [...(list ?? [])].sort((a, b) => timeOf(a.startDate) - timeOf(b.startDate))) {
      const date = dayOf(s.startDate);
      const v = within(s.value, min, max);
      if (date && v !== undefined) seen.set(date, v);
    }
    for (const [date, v] of seen) put(day(date), v);
  };
  latest(input.restingHeartRate, 25, 150, (m, v) => (m.restingHeartRate = Math.round(v)));
  latest(input.heartRateVariability, 1, 400, (m, v) => (m.hrv = Math.round(v * 10) / 10));
  return [...byDate.values()].filter((m) => Object.keys(m).length > 3).sort((a, b) => a.date.localeCompare(b.date));
}

// Een bereik van dagen (`to` niet meer meegeteld, zoals bij intervals.icu) als twee momenten:
// van middernacht tot middernacht, maar nooit verder dan nu. Vandaag telt nog niet als voorbij.
export function rangeBounds(range: DateRange, now: Date): { from: string; to: string } {
  const from = parseISODate(range.from);
  const end = parseISODate(range.to);
  return { from: from.toISOString(), to: (end.getTime() < now.getTime() ? end : now).toISOString() };
}

// --- de laag naar de telefoon ---------------------------------------------------------------

export interface HealthConnectPort {
  // Draait ASCEND als Android-app? Alleen daar bestaat Health Connect.
  readonly inApp: boolean;
  availability(): Promise<HealthAvailability>;
  // Wat ASCEND nu mag lezen, zonder te vragen.
  granted(): Promise<HealthKind[]>;
  // Vraagt het scherm van Health Connect; geeft terug wat daarna mag.
  request(): Promise<HealthKind[]>;
  workouts(from: string, to: string): Promise<Workout[]>;
  samples(kind: HealthSampleKind, from: string, to: string): Promise<HealthSample[]>;
  // Het scherm van Health Connect zelf, voor wie de vraag niet meer krijgt.
  openSettings(): Promise<void>;
}

// Hoe lang een vraag aan de telefoon mag duren. Het toestemmingsscherm duurt zo lang als jij erin
// blijft, dus ruimer.
const CHECK_MS = 6_000;
const READ_MS = 15_000;
const ASK_MS = 120_000;
const MAX_ROWS = 2_000;

export const browserHealthPort: HealthConnectPort = {
  inApp: false,
  availability: async () => 'web',
  granted: async () => [],
  request: async () => [],
  workouts: async () => {
    throw new HealthConnectError('web');
  },
  samples: async () => {
    throw new HealthConnectError('web');
  },
  openSettings: async () => undefined,
};

type Plugin = (typeof import('@capgo/capacitor-health'))['Health'];
type PluginModule = typeof import('@capgo/capacitor-health');

const grantedOf = (status: { readAuthorized?: string[] } | undefined): HealthKind[] => HEALTH_KINDS.filter((k) => status?.readAuthorized?.includes(k));

function androidHealthPort(): HealthConnectPort {
  // Pas laden als hij nodig is: de webbuild opent de plugin nooit. De belofte draagt de module, niet de
  // plugin zelf: een plugin van Capacitor is een proxy die op elke naam een methode teruggeeft, ook op
  // `then`, en een belofte die met zo'n proxy wordt vervuld, wacht dan voor altijd.
  let loaded: Promise<PluginModule> | undefined;
  const load = () => (loaded ??= import('@capgo/capacitor-health')).then((m) => ({ plugin: m.Health }));
  const call = async <T>(ms: number, run: (p: Plugin) => Promise<T>): Promise<T> => {
    try {
      return await withTimeout(load().then(({ plugin }) => run(plugin)), ms);
    } catch (err) {
      throw healthConnectErrorOf(err);
    }
  };
  const read = { read: [...HEALTH_KINDS], write: [] };
  return {
    inApp: true,
    async availability() {
      try {
        const r = await withTimeout(load().then(({ plugin }) => plugin.isAvailable()), CHECK_MS);
        if (r.available) return 'ready';
        return /update/i.test(r.reason ?? '') ? 'needs-update' : 'not-installed';
      } catch {
        // Een app zonder de plugin (een oudere APK) of een telefoon die niet antwoordt.
        return 'not-installed';
      }
    },
    granted: () => call(CHECK_MS, async (p) => grantedOf(await p.checkAuthorization(read))),
    request: () => call(ASK_MS, async (p) => grantedOf(await p.requestAuthorization(read))),
    workouts: (from, to) => call(READ_MS, async (p) => (await p.queryWorkouts({ startDate: from, endDate: to, limit: MAX_ROWS, ascending: true })).workouts ?? []),
    samples: (kind, from, to) => call(READ_MS, async (p) => (await p.readSamples({ dataType: kind, startDate: from, endDate: to, limit: MAX_ROWS, ascending: true })).samples ?? []),
    openSettings: () => call(CHECK_MS, (p) => p.openHealthConnectSettings()),
  };
}

let current: HealthConnectPort | undefined;

export function healthConnectPort(): HealthConnectPort {
  current ??= Capacitor.getPlatform() === 'android' ? androidHealthPort() : browserHealthPort;
  return current;
}

// Voor tests: een nagemaakte laag, of terug naar de echte met undefined.
export function setHealthConnectPort(port: HealthConnectPort | undefined): void {
  current = port;
}

// --- de adapter -----------------------------------------------------------------------------

// De adapter in de vorm van src/integrations/types.ts. Hij geeft ExternalActivity, geen log: een
// log wordt het pas via de kaart op Vandaag, net als bij intervals.icu (engine/activityImport.ts).
export function createHealthConnectAdapter(port: HealthConnectPort, options: { now?: () => Date } = {}): DataSourceAdapter {
  const now = options.now ?? (() => new Date());
  const allowed = async (): Promise<Set<HealthKind>> => {
    if (!port.inApp) throw new HealthConnectError('web');
    return new Set(await port.granted());
  };
  return {
    id: HEALTH_CONNECT_ADAPTER_ID,
    label: 'Health Connect',
    isConnected: () => port.inApp,
    fetchExternalActivities: async (range) => {
      const ok = await allowed();
      if (!ok.has('workouts')) return [];
      const at = now();
      const { from, to } = rangeBounds(range, at);
      const workouts = await port.workouts(from, to);
      const distances = ok.has('distance') && workouts.length > 0 ? await port.samples('distance', from, to) : [];
      const seen = new Set<string>();
      const out: ExternalActivity[] = [];
      for (const w of workouts) {
        // Een training die nog loopt of in de toekomst eindigt, is nog niet voorbij.
        if (!(timeOf(w.endDate) <= at.getTime())) continue;
        const a = mapHealthWorkout(w, distances);
        if (!a || seen.has(a.externalId)) continue;
        seen.add(a.externalId);
        out.push(a);
      }
      return out;
    },
    fetchRecoveryMetrics: async (range) => {
      const ok = await allowed();
      const at = now();
      const { from, to } = rangeBounds(range, at);
      // Een nacht die op de eerste dag eindigt, begon de avond ervoor.
      const sleepFrom = new Date(new Date(from).getTime() - 12 * 3600_000).toISOString();
      const input: Partial<Record<'sleep' | 'restingHeartRate' | 'heartRateVariability', HealthSample[]>> = {};
      if (ok.has('sleep')) input.sleep = await port.samples('sleep', sleepFrom, to);
      if (ok.has('restingHeartRate')) input.restingHeartRate = await port.samples('restingHeartRate', from, to);
      if (ok.has('heartRateVariability')) input.heartRateVariability = await port.samples('heartRateVariability', from, to);
      return mapHealthRecovery(input).filter((m) => m.date >= range.from && m.date < range.to);
    },
  };
}

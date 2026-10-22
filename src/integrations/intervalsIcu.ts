// ASCEND — intervals.icu adapter: activities from the user's own watch.
//
// Garmin sends every activity to intervals.icu; this reads the last days
// from there with the user's own athlete id and API key, straight from the
// phone (no server of ours, no account). Reading is the default; writing only
// happens when the owner switches on "Trainingen naar je horloge sturen". The key lives
// on this device (storage/externalActivities.ts) and never in an export.
//
// Paths and field names were checked against the official OpenAPI
// description (https://intervals.icu/api/v1/docs): GET
// /api/v1/athlete/{id}/activities with `oldest` and `newest`, GET
// /api/v1/athlete/{id}/wellness.json with `oldest` and `newest` (one record
// per day: restingHR, hrv, sleepSecs, sleepScore), Basic authentication with
// the user name "API_KEY" and the key as password.
//
// Since October 2026 it also WRITES, but only the planned workouts ASCEND
// itself puts in the agenda (see "workouts" below): POST
// /api/v1/athlete/{id}/events/bulk?upsert=true (create or update on
// external_id), PUT /events/{eventId}, PUT /events/bulk-delete. The browser's
// CORS preflight allows POST, PUT and DELETE from any origin with the
// Authorization and Content-Type headers (tested with curl, 22 October 2026).
//
// The mapping from intervals.icu fields to the general ExternalActivity
// (engine/activityImport.ts) is the only place that knows those field names.

import type { DataSourceAdapter, DateRange } from './types';
import type { ExternalActivity, ExternalActivityKind } from '../engine/activityImport';
import { WATCH_EXTERNAL_PREFIX, type TrackedWorkout, type WatchWorkout } from '../engine/watchWorkout';
import type { SubjectiveFeel } from '../models/training';
import type { RecoveryMetric } from '../models/metrics';
import type { RunDynamics, StreamKind, StreamSet } from '../models/activityDetail';

export const INTERVALS_BASE_URL = 'https://intervals.icu';
export const INTERVALS_ADAPTER_ID = 'intervals.icu';

export interface IntervalsConnection {
  athleteId: string;
  apiKey: string;
}

export type IntervalsErrorKind = 'input' | 'auth' | 'athlete' | 'rate' | 'server' | 'network' | 'response' | 'write' | 'rejected';

// An error whose message is already something to show the user.
export class IntervalsError extends Error {
  kind: IntervalsErrorKind;
  constructor(kind: IntervalsErrorKind, message: string) {
    super(message);
    this.name = 'IntervalsError';
    this.kind = kind;
  }
}

const MESSAGES: Record<Exclude<IntervalsErrorKind, 'input'>, string> = {
  auth: 'intervals.icu herkent je API-sleutel niet. Kopieer de sleutel opnieuw uit de instellingen van intervals.icu.',
  athlete: 'Met deze sleutel is er geen toegang tot deze athlete-id. Controleer de id; die begint met een i, bijvoorbeeld i12345.',
  rate: 'intervals.icu vraagt even te wachten met opnieuw proberen. Probeer het over een paar minuten nog eens.',
  server: 'intervals.icu heeft op dit moment een storing. Probeer het later nog eens; je eigen gegevens in ASCEND zijn niet geraakt.',
  network: 'Geen verbinding met intervals.icu. Controleer je internet en probeer het later opnieuw.',
  response: 'intervals.icu gaf een antwoord dat ASCEND niet begrijpt. Probeer het later nog eens.',
  write: 'Met deze sleutel mag ASCEND geen trainingen in je agenda zetten. Maak in intervals.icu een nieuwe API-sleutel aan en plak hem opnieuw in ASCEND.',
  rejected: 'intervals.icu nam de training niet aan. Probeer het later nog eens; blijft het gebeuren, laat het dan weten.',
};

export function normalizeConnection(raw: { athleteId: string; apiKey: string }): IntervalsConnection {
  const athleteId = raw.athleteId.trim();
  const apiKey = raw.apiKey.trim();
  if (!athleteId) throw new IntervalsError('input', 'Vul je athlete-id in. Je vindt hem in de instellingen van intervals.icu.');
  if (!/^[A-Za-z0-9_-]+$/.test(athleteId)) throw new IntervalsError('input', 'Je athlete-id mag alleen letters en cijfers bevatten, bijvoorbeeld i12345.');
  if (!apiKey) throw new IntervalsError('input', 'Vul je API-sleutel in. Je maakt hem aan in de instellingen van intervals.icu, onder Developer.');
  return { athleteId, apiKey };
}

export function basicAuthHeader(apiKey: string): string {
  return `Basic ${btoa(`API_KEY:${apiKey}`)}`;
}

export function activitiesUrl(athleteId: string, range: DateRange): string {
  const query = new URLSearchParams({ oldest: range.from, newest: range.to });
  return `${INTERVALS_BASE_URL}/api/v1/athlete/${encodeURIComponent(athleteId)}/activities?${query.toString()}`;
}

export function wellnessUrl(athleteId: string, range: DateRange): string {
  const query = new URLSearchParams({ oldest: range.from, newest: range.to });
  return `${INTERVALS_BASE_URL}/api/v1/athlete/${encodeURIComponent(athleteId)}/wellness.json?${query.toString()}`;
}

// --- mapping: intervals.icu fields -> ExternalActivity --------------------------

// The fields we read of an intervals.icu activity. An activity that comes
// from Strava is returned as an empty stub (no start date), which the
// mapping drops.
export interface IntervalsActivity {
  id?: string | number;
  start_date_local?: string;
  type?: string;
  name?: string;
  source?: string;
  device_name?: string;
  moving_time?: number;
  elapsed_time?: number;
  distance?: number;
  total_elevation_gain?: number;
  total_elevation_loss?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  icu_rpe?: number;
  feel?: number;
  trainer?: boolean;
  deleted?: boolean;
  // Running dynamics (averages) and the list of series the activity has.
  // Units as the forum of the provider gives them (14 July to 31 August 2026),
  // not as the OpenAPI description, which has none.
  average_stance_time?: number;
  average_stance_time_percent?: number;
  average_stance_time_balance?: number;
  average_vertical_oscillation?: number;
  average_vertical_ratio?: number;
  average_step_length?: number;
  average_vertical_speed?: number;
  average_leg_spring_stiffness?: number;
  average_impact_loading_rate?: number;
  stream_types?: string[];
}

const RUN_TYPES = new Set(['Run', 'TrailRun', 'VirtualRun']);
const HIKE_TYPES = new Set(['Hike', 'Walk']);
const RIDE_TYPES = new Set(['Ride', 'GravelRide', 'MountainBikeRide', 'EBikeRide', 'EMountainBikeRide', 'Cyclocross', 'TrackRide', 'VirtualRide', 'Velomobile']);

export function kindOf(type: string | undefined): ExternalActivityKind {
  if (!type) return 'other';
  if (RUN_TYPES.has(type)) return 'run';
  if (HIKE_TYPES.has(type)) return 'hike';
  if (RIDE_TYPES.has(type)) return 'ride';
  if (type === 'WeightTraining') return 'strength';
  return 'other';
}

// intervals.icu's "feel" runs 1 to 5: 1 strong, 2 good, 3 normal, 4 poor,
// 5 weak. The direction was reported reversed once on the forum, so the card
// shows the value it read and the owner can compare it with the watch.
// This is the one place to flip if the data says otherwise.
export function feelOf(feel: number | undefined): SubjectiveFeel | undefined {
  if (feel === undefined || !Number.isFinite(feel)) return undefined;
  if (feel >= 1 && feel <= 2) return 'better';
  if (feel === 3) return 'normal';
  if (feel >= 4 && feel <= 5) return 'worse';
  return undefined;
}

// intervals.icu gives the cadence of a run per foot on some sources (about 85)
// and as steps per minute on others (about 170); a runner's steps per minute
// are never below 120, so a smaller number is doubled. Walking and cycling
// stay as they are.
export function cadenceOf(kind: ExternalActivityKind, cadence: unknown): number | undefined {
  if (typeof cadence !== 'number' || !Number.isFinite(cadence) || cadence <= 0 || cadence > 300) return undefined;
  const perMinute = kind === 'run' && cadence < 120 ? cadence * 2 : cadence;
  return Math.round(perMinute);
}

const positive = (n: unknown): number | undefined => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : undefined);

// --- running dynamics and the series an activity has --------------------------------

// The provider's name of a series, and what ASCEND calls it. The only place
// that knows these names; the request for the series (further on) uses the same
// table in the other direction.
export const STREAM_NAMES: Record<StreamKind, string> = {
  time: 'time',
  distance: 'distance',
  heartRate: 'heartrate',
  speed: 'velocity_smooth',
  altitude: 'altitude',
  cadence: 'cadence',
  position: 'latlng',
  power: 'watts',
  stanceTime: 'stance_time',
  stanceBalance: 'stance_time_balance',
  verticalOscillation: 'vertical_oscillation',
  verticalRatio: 'vertical_ratio',
  stepLength: 'step_length',
};

const KIND_OF_STREAM = new Map<string, StreamKind>((Object.entries(STREAM_NAMES) as [StreamKind, string][]).map(([kind, name]) => [name, kind]));

// Only the series ASCEND knows; the rest of the list is not our business.
export function streamKindsOf(raw: unknown): StreamKind[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const kinds = new Set<StreamKind>();
  for (const name of raw) {
    const kind = typeof name === 'string' ? KIND_OF_STREAM.get(name) : undefined;
    if (kind) kinds.add(kind);
  }
  return [...kinds];
}

const inRange = (n: unknown, min: number, max: number): number | undefined => (typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max ? n : undefined);

// A step length is millimetres in the provider's forum and could as well be
// metres: nobody's step is below 30 cm or above 3 m, so the magnitude says
// which it is.
function stepLengthMetres(n: unknown): number | undefined {
  if (typeof n !== 'number' || !Number.isFinite(n)) return undefined;
  if (n >= 0.3 && n <= 3) return n;
  if (n >= 300 && n <= 3000) return n / 1000;
  return undefined;
}

// The averages of the running dynamics. A value outside what a body can do is a
// glitch of the source and is dropped on its own. Undefined when nothing is left.
export function dynamicsOf(raw: IntervalsActivity): RunDynamics | undefined {
  const out: RunDynamics = {};
  const put = <K extends keyof RunDynamics>(key: K, value: number | undefined, decimals = 0) => {
    if (value !== undefined) out[key] = (Math.round(value * 10 ** decimals) / 10 ** decimals) as RunDynamics[K];
  };
  put('stanceTimeMs', inRange(raw.average_stance_time, 80, 600));
  put('stanceTimePercent', inRange(raw.average_stance_time_percent, 5, 80), 1);
  put('stanceBalanceLeftPct', inRange(raw.average_stance_time_balance, 30, 70), 1);
  put('verticalOscillationMm', inRange(raw.average_vertical_oscillation, 20, 200));
  put('verticalRatioPct', inRange(raw.average_vertical_ratio, 2, 20), 1);
  put('stepLengthM', stepLengthMetres(raw.average_step_length), 2);
  put('verticalSpeedMs', inRange(raw.average_vertical_speed, -5, 5), 2);
  put('legSpringStiffness', positive(raw.average_leg_spring_stiffness), 1);
  put('impactLoadingRate', positive(raw.average_impact_loading_rate), 1);
  return Object.keys(out).length > 0 ? out : undefined;
}

export function mapIntervalsActivity(raw: IntervalsActivity): ExternalActivity | undefined {
  if (!raw || raw.deleted) return undefined;
  if (raw.id === undefined || raw.id === null || raw.id === '') return undefined;
  if (typeof raw.start_date_local !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw.start_date_local)) return undefined;
  const durationSec = positive(raw.moving_time) ?? positive(raw.elapsed_time);
  if (durationSec === undefined) return undefined;

  const kind = kindOf(raw.type);
  const fromGarmin = raw.source === 'GARMIN_CONNECT' || /garmin|forerunner|fenix|enduro|venu|vivoactive/i.test(raw.device_name ?? '');
  const rpe = positive(raw.icu_rpe);
  // Strength has no running form; a treadmill has contact times too, so only
  // the kind decides.
  const dynamics = kind === 'strength' ? undefined : dynamicsOf(raw);
  const streams = kind === 'strength' ? undefined : streamKindsOf(raw.stream_types);
  return {
    externalId: `${INTERVALS_ADAPTER_ID}:${raw.id}`,
    source: fromGarmin ? 'garmin' : 'import',
    start: raw.start_date_local.slice(0, 19),
    kind,
    name: typeof raw.name === 'string' && raw.name ? raw.name : undefined,
    durationSec,
    distanceM: positive(raw.distance),
    elevationGainM: typeof raw.total_elevation_gain === 'number' && raw.total_elevation_gain >= 0 ? raw.total_elevation_gain : undefined,
    // Some sources write the descent as a negative number.
    elevationLossM: typeof raw.total_elevation_loss === 'number' && Number.isFinite(raw.total_elevation_loss) ? Math.abs(raw.total_elevation_loss) : undefined,
    avgHeartRate: positive(raw.average_heartrate),
    maxHeartRate: positive(raw.max_heartrate),
    avgCadence: kind === 'strength' ? undefined : cadenceOf(kind, raw.average_cadence),
    rpe: rpe !== undefined && rpe <= 10 ? rpe : undefined,
    feel: feelOf(raw.feel),
    treadmill: kind !== 'strength' && (raw.trainer === true || raw.type === 'VirtualRun' || raw.type === 'VirtualRide'),
    ...(dynamics ? { dynamics } : {}),
    ...(streams ? { streamsAvailable: streams } : {}),
  };
}

export function mapIntervalsActivities(raw: unknown): ExternalActivity[] {
  if (!Array.isArray(raw)) throw new IntervalsError('response', MESSAGES.response);
  const seen = new Set<string>();
  const out: ExternalActivity[] = [];
  for (const item of raw) {
    const mapped = mapIntervalsActivity(item as IntervalsActivity);
    if (!mapped || seen.has(mapped.externalId)) continue;
    seen.add(mapped.externalId);
    out.push(mapped);
  }
  return out;
}

// --- the series of one activity -------------------------------------------------------

// "intervals.icu:i123" -> "i123"; undefined for an id of another provider.
export function intervalsActivityId(externalId: string): string | undefined {
  const prefix = `${INTERVALS_ADAPTER_ID}:`;
  return externalId.startsWith(prefix) && externalId.length > prefix.length ? externalId.slice(prefix.length) : undefined;
}

// Always with `types`: without it the provider sends every series it has.
export function streamsUrl(activityId: string, kinds: StreamKind[]): string {
  const types = kinds.map((k) => STREAM_NAMES[k]).join(',');
  return `${INTERVALS_BASE_URL}/api/v1/activity/${encodeURIComponent(activityId)}/streams.json?types=${types}`;
}

// What ASCEND asks for of an activity: everything the research found useful
// (docs/onderzoek/Loopgegevens en vooruitgang.md) that the activity has. The
// power series is left out on purpose: a watch of this kind gives no running
// power, and nothing here reads it.
export const WANTED_STREAMS: StreamKind[] = [
  'time', 'distance', 'heartRate', 'speed', 'altitude', 'cadence', 'position',
  'stanceTime', 'stanceBalance', 'verticalOscillation', 'verticalRatio', 'stepLength',
];

export function streamsToRequest(available: StreamKind[] | undefined): StreamKind[] {
  if (!available) return [];
  const have = new Set(available);
  return WANTED_STREAMS.filter((k) => have.has(k));
}

const toSeries = (data: unknown, length: number, convert: (v: number) => number | null = (v) => v): (number | null)[] | undefined => {
  if (!Array.isArray(data) || data.length === 0) return undefined;
  const out: (number | null)[] = [];
  for (let i = 0; i < length; i++) {
    const v = data[i];
    out.push(typeof v === 'number' && Number.isFinite(v) ? convert(v) : null);
  }
  return out.some((v) => v !== null) ? out : undefined;
};

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// The answer of the streams request -> the general StreamSet. Nothing else of
// the answer is kept, and of the position only the first point, rounded to two
// decimals (about a kilometre), for the weather lookup.
export function mapIntervalsStreams(raw: unknown, kind: ExternalActivityKind = 'run'): StreamSet | undefined {
  if (!Array.isArray(raw)) throw new IntervalsError('response', MESSAGES.response);
  const byType = new Map<string, { data?: unknown; data2?: unknown }>();
  for (const item of raw) {
    const it = item as { type?: unknown; data?: unknown; data2?: unknown } | null;
    if (it && typeof it.type === 'string' && Array.isArray(it.data)) byType.set(it.type, it);
  }
  const get = (kindName: StreamKind) => byType.get(STREAM_NAMES[kindName]);
  const timeRaw = get('time')?.data as unknown[] | undefined;
  const length = Math.max(0, ...[...byType.values()].map((s) => (s.data as unknown[]).length));
  if (length === 0) return undefined;
  const timeSec = Array.isArray(timeRaw) && timeRaw.length === length && timeRaw.every((v) => typeof v === 'number' && Number.isFinite(v))
    ? (timeRaw as number[])
    : Array.from({ length }, (_, i) => i);

  const cadenceRaw = toSeries(get('cadence')?.data, length);
  // Per foot on some sources, steps per minute on others (see cadenceOf).
  const cadenceValues = cadenceRaw?.filter((v): v is number => v !== null && v > 0) ?? [];
  const doubled = kind === 'run' && cadenceValues.length > 0 && median(cadenceValues) < 120;

  const set: StreamSet = { timeSec };
  const put = <K extends keyof StreamSet>(key: K, value: StreamSet[K]) => {
    if (value !== undefined) set[key] = value;
  };
  put('distanceM', toSeries(get('distance')?.data, length));
  put('heartRate', toSeries(get('heartRate')?.data, length, (v) => (v > 0 ? v : null)));
  put('speedMs', toSeries(get('speed')?.data, length, (v) => (v >= 0 ? v : null)));
  put('altitudeM', toSeries(get('altitude')?.data, length));
  put('cadence', cadenceRaw?.map((v) => (v === null || v <= 0 ? null : doubled ? v * 2 : v)));
  put('stanceTimeMs', toSeries(get('stanceTime')?.data, length, (v) => (v >= 80 && v <= 600 ? v : null)));
  put('stanceBalanceLeftPct', toSeries(get('stanceBalance')?.data, length, (v) => (v >= 30 && v <= 70 ? v : null)));
  put('verticalOscillationMm', toSeries(get('verticalOscillation')?.data, length, (v) => (v >= 20 && v <= 200 ? v : null)));
  put('verticalRatioPct', toSeries(get('verticalRatio')?.data, length, (v) => (v >= 2 && v <= 20 ? v : null)));
  // Millimetres at the provider, metres once through here (see stepLengthMetres).
  put('stepLengthM', toSeries(get('stepLength')?.data, length, (v) => (v >= 300 && v <= 3000 ? v / 1000 : v >= 0.3 && v <= 3 ? v : null)));

  const position = get('position');
  if (position && Array.isArray(position.data) && Array.isArray(position.data2)) {
    for (let i = 0; i < Math.min(position.data.length, position.data2.length); i++) {
      const lat = position.data[i];
      const lon = position.data2[i];
      if (typeof lat === 'number' && typeof lon === 'number' && Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
        set.start = { lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 };
        break;
      }
    }
  }
  return set;
}

// --- mapping: intervals.icu wellness -> RecoveryMetric -------------------------

// The fields we read of an intervals.icu wellness record. `id` is the local
// day ("2026-10-22"). A field is simply absent when nothing filled it: the
// Garmin synchronisation for wellness is a switch in intervals.icu itself.
export interface IntervalsWellness {
  id?: string;
  restingHR?: number;
  hrv?: number;
  sleepSecs?: number;
  sleepScore?: number;
}

// A value outside what a body can do is a glitch of the source, not a night:
// it is dropped on its own and the rest of the day is kept.
function within(n: unknown, min: number, max: number): number | undefined {
  return typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max ? n : undefined;
}

export function mapIntervalsWellnessRecord(raw: IntervalsWellness): RecoveryMetric | undefined {
  if (!raw || typeof raw.id !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.id)) return undefined;
  const restingHeartRate = within(raw.restingHR, 25, 150);
  const hrv = within(raw.hrv, 1, 400);
  const sleepScore = within(raw.sleepScore, 0, 100);
  const sleepSecs = within(raw.sleepSecs, 600, 20 * 3600);
  if (restingHeartRate === undefined && hrv === undefined && sleepScore === undefined && sleepSecs === undefined) return undefined;
  const metric: RecoveryMetric = {
    id: `${INTERVALS_ADAPTER_ID}:${raw.id}`,
    date: raw.id,
    // The record does not say who measured it (a watch, or a value typed by
    // hand in intervals.icu), so it is "import", not "garmin".
    source: 'import',
  };
  if (restingHeartRate !== undefined) metric.restingHeartRate = Math.round(restingHeartRate);
  if (hrv !== undefined) metric.hrv = Math.round(hrv * 10) / 10;
  if (sleepScore !== undefined) metric.sleepScore = Math.round(sleepScore);
  if (sleepSecs !== undefined) metric.sleepMinutes = Math.round(sleepSecs / 60);
  return metric;
}

export function mapIntervalsWellness(raw: unknown): RecoveryMetric[] {
  if (!Array.isArray(raw)) throw new IntervalsError('response', MESSAGES.response);
  const byDate = new Map<string, RecoveryMetric>();
  for (const item of raw) {
    const mapped = mapIntervalsWellnessRecord(item as IntervalsWellness);
    if (mapped) byDate.set(mapped.date, mapped);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// --- the request ----------------------------------------------------------------

const TIMEOUT_MS = 15_000;

export interface FetchOptions {
  fetchImpl?: typeof fetch;
}

// One GET with the user's own key. The error mapping is the same for every
// endpoint, so the user reads the same sentence for the same problem.
async function getJson(connection: IntervalsConnection, urlFor: (athleteId: string) => string, options: FetchOptions): Promise<unknown> {
  const { athleteId, apiKey } = normalizeConnection(connection);
  const doFetch = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await doFetch(urlFor(athleteId), {
      method: 'GET',
      headers: { Authorization: basicAuthHeader(apiKey), Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch {
    // Offline, blocked, timed out: all the same to the user.
    throw new IntervalsError('network', MESSAGES.network);
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401) throw new IntervalsError('auth', MESSAGES.auth);
  if (response.status === 403 || response.status === 404) throw new IntervalsError('athlete', MESSAGES.athlete);
  if (response.status === 429) throw new IntervalsError('rate', MESSAGES.rate);
  if (response.status >= 500) throw new IntervalsError('server', MESSAGES.server);
  if (!response.ok) throw new IntervalsError('response', MESSAGES.response);

  try {
    return await response.json();
  } catch {
    throw new IntervalsError('response', MESSAGES.response);
  }
}

export async function fetchIntervalsActivities(
  connection: IntervalsConnection,
  range: DateRange,
  options: FetchOptions = {},
): Promise<ExternalActivity[]> {
  return mapIntervalsActivities(await getJson(connection, (id) => activitiesUrl(id, range), options));
}

export async function fetchIntervalsWellness(
  connection: IntervalsConnection,
  range: DateRange,
  options: FetchOptions = {},
): Promise<RecoveryMetric[]> {
  return mapIntervalsWellness(await getJson(connection, (id) => wellnessUrl(id, range), options));
}

// The series of one stored activity, in one request. Undefined when the
// activity has none of the series ASCEND uses.
export async function fetchIntervalsStreams(
  connection: IntervalsConnection,
  activity: Pick<ExternalActivity, 'externalId' | 'kind' | 'streamsAvailable'>,
  options: FetchOptions = {},
): Promise<StreamSet | undefined> {
  const id = intervalsActivityId(activity.externalId);
  const kinds = streamsToRequest(activity.streamsAvailable);
  if (!id || kinds.length === 0) return undefined;
  return mapIntervalsStreams(await getJson(connection, () => streamsUrl(id, kinds), options), activity.kind);
}

// What to tell the user about any error from this file; anything that is not
// ours reads as a connection problem rather than a crash.
export function intervalsErrorMessage(err: unknown): string {
  return err instanceof IntervalsError ? err.message : MESSAGES.network;
}

// The adapter in the shape of src/integrations/types.ts. It hands out
// ExternalActivity (not SessionLog): turning those into a log is the user's
// tap on the Today card, via engine/activityImport.ts.
export function createIntervalsIcuAdapter(connection: IntervalsConnection | null, options: FetchOptions = {}): DataSourceAdapter {
  return {
    id: INTERVALS_ADAPTER_ID,
    label: 'intervals.icu',
    isConnected: () => !!connection,
    fetchExternalActivities: async (range) => {
      if (!connection) return [];
      return fetchIntervalsActivities(connection, range, options);
    },
    // Sleep, resting heart rate and HRV: the same RecoveryMetric shape any
    // other source would fill.
    fetchRecoveryMetrics: async (range) => {
      if (!connection) return [];
      return fetchIntervalsWellness(connection, range, options);
    },
    // The series of one activity, for the compact profile on its log.
    fetchActivityStreams: async (activity) => {
      if (!connection) return undefined;
      return fetchIntervalsStreams(connection, activity, options);
    },
  };
}

// --- workouts: ASCEND's planned trainings in the agenda -------------------------
//
// Everything below only ever touches events ASCEND created itself: it sends
// external_ids of the form "ascend:<plannedSessionId>", and it deletes and
// updates only the ones it was handed (the caller takes them from its own
// list). An event the owner put in intervals.icu himself is never in that
// list, so it is never touched.

export function eventsBulkUrl(athleteId: string): string {
  return `${INTERVALS_BASE_URL}/api/v1/athlete/${encodeURIComponent(athleteId)}/events/bulk?upsert=true`;
}

export function eventUrl(athleteId: string, eventId: number): string {
  return `${INTERVALS_BASE_URL}/api/v1/athlete/${encodeURIComponent(athleteId)}/events/${encodeURIComponent(String(eventId))}`;
}

export function eventsBulkDeleteUrl(athleteId: string): string {
  return `${INTERVALS_BASE_URL}/api/v1/athlete/${encodeURIComponent(athleteId)}/events/bulk-delete`;
}

// The event as intervals.icu wants it. The description is the workout text;
// intervals.icu reads the steps from it and builds the file for the watch.
// `target` says which kind of goal the steps use (heart rate or pace).
export function workoutEventBody(w: WatchWorkout) {
  return {
    category: 'WORKOUT',
    start_date_local: `${w.date}T00:00:00`,
    type: w.type,
    name: w.name,
    description: w.description,
    moving_time: w.movingTimeSec,
    external_id: w.externalId,
    target: w.target,
    indoor: false,
  };
}

// Result of one write request: the parsed body (when there is one), or the
// error the user should read. 404 on a delete is not an error: it is gone.
async function writeRequest(
  connection: IntervalsConnection,
  url: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body: unknown,
  options: FetchOptions,
  accept404 = false,
): Promise<{ status: number; body: unknown }> {
  const { apiKey } = normalizeConnection(connection);
  const doFetch = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await doFetch(url, {
      method,
      headers: { Authorization: basicAuthHeader(apiKey), Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new IntervalsError('network', MESSAGES.network);
  } finally {
    clearTimeout(timer);
  }
  if (response.status === 401) throw new IntervalsError('auth', MESSAGES.auth);
  if (response.status === 403) throw new IntervalsError('write', MESSAGES.write);
  if (response.status === 404) {
    if (accept404) return { status: 404, body: undefined };
    throw new IntervalsError('athlete', MESSAGES.athlete);
  }
  if (response.status === 429) throw new IntervalsError('rate', MESSAGES.rate);
  if (response.status >= 500) throw new IntervalsError('server', MESSAGES.server);
  if (response.status === 400 || response.status === 422) throw new IntervalsError('rejected', MESSAGES.rejected);
  if (!response.ok) throw new IntervalsError('response', MESSAGES.response);
  let parsed: unknown;
  try {
    const text = await response.text();
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    throw new IntervalsError('response', MESSAGES.response);
  }
  return { status: response.status, body: parsed };
}

const eventIdOf = (e: unknown): number | undefined => {
  const id = (e as { id?: unknown } | null)?.id;
  return typeof id === 'number' && Number.isFinite(id) ? id : undefined;
};

// Creates the workouts, or updates the ones that already have the same
// external_id (upsert), in one request. Returns the event id of each.
export async function createWorkoutEvents(
  connection: IntervalsConnection,
  workouts: WatchWorkout[],
  options: FetchOptions = {},
): Promise<Map<string, number | undefined>> {
  const ids = new Map<string, number | undefined>();
  if (workouts.length === 0) return ids;
  if (workouts.some((w) => !w.externalId.startsWith(WATCH_EXTERNAL_PREFIX))) throw new IntervalsError('input', 'Interne fout: een training zonder ASCEND-id wordt niet verstuurd.');
  const { body } = await writeRequest(connection, eventsBulkUrl(normalizeConnection(connection).athleteId), 'POST', workouts.map(workoutEventBody), options);
  if (!Array.isArray(body)) throw new IntervalsError('response', MESSAGES.response);
  const byExternal = new Map<string, number | undefined>();
  for (const e of body) {
    const ext = (e as { external_id?: unknown } | null)?.external_id;
    if (typeof ext === 'string') byExternal.set(ext, eventIdOf(e));
  }
  for (const w of workouts) ids.set(w.externalId, byExternal.get(w.externalId));
  return ids;
}

// Changes one event ASCEND created before. When the event is gone from the
// agenda (the owner deleted it), it is created again instead.
export async function updateWorkoutEvent(
  connection: IntervalsConnection,
  workout: WatchWorkout,
  eventId: number | undefined,
  options: FetchOptions = {},
): Promise<number | undefined> {
  if (eventId !== undefined) {
    const { status, body } = await writeRequest(connection, eventUrl(normalizeConnection(connection).athleteId, eventId), 'PUT', workoutEventBody(workout), options, true);
    if (status !== 404) return eventIdOf(body) ?? eventId;
  }
  return (await createWorkoutEvents(connection, [workout], options)).get(workout.externalId);
}

// Deletes events ASCEND created before, by id when known and else by its own
// external_id. Events that are already gone are fine.
export async function deleteWorkoutEvents(connection: IntervalsConnection, tracked: TrackedWorkout[], options: FetchOptions = {}): Promise<void> {
  // Belt and braces: whatever the caller hands over, only ASCEND's own ids.
  const own = tracked.filter((t) => t.externalId.startsWith(WATCH_EXTERNAL_PREFIX));
  if (own.length === 0) return;
  const { athleteId } = normalizeConnection(connection);
  await writeRequest(
    connection,
    eventsBulkDeleteUrl(athleteId),
    'PUT',
    own.map((t) => (t.eventId !== undefined ? { id: t.eventId } : { external_id: t.externalId })),
    options,
    true,
  );
}

// --- finding what ASCEND once sent -----------------------------------------------

export interface AgendaEvent {
  id: number;
  externalId: string;
  date: string;
}

export function eventsListUrl(athleteId: string, range: { from: string; to: string }): string {
  return `${INTERVALS_BASE_URL}/api/v1/athlete/${encodeURIComponent(athleteId)}/events?oldest=${range.from}&newest=${range.to}&category=WORKOUT`;
}

// The events in the agenda that ASCEND put there: a workout whose external_id
// starts with "ascend:". Everything else in the answer is dropped on the spot,
// so no caller can ever delete it.
export async function fetchAscendEvents(
  connection: IntervalsConnection,
  range: { from: string; to: string },
  options: FetchOptions = {},
): Promise<AgendaEvent[]> {
  const raw = await getJson(connection, (id) => eventsListUrl(id, range), options);
  if (!Array.isArray(raw)) throw new IntervalsError('response', MESSAGES.response);
  const out: AgendaEvent[] = [];
  for (const e of raw as Record<string, unknown>[]) {
    const id = eventIdOf(e);
    const ext = e?.external_id;
    if (id === undefined || typeof ext !== 'string' || !ext.startsWith(WATCH_EXTERNAL_PREFIX)) continue;
    if (e.category !== undefined && e.category !== 'WORKOUT') continue;
    const start = typeof e.start_date_local === 'string' ? e.start_date_local.slice(0, 10) : '';
    out.push({ id, externalId: ext, date: start });
  }
  return out;
}

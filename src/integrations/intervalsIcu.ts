// ASCEND — intervals.icu adapter: activities from the user's own watch.
//
// Garmin sends every activity to intervals.icu; this reads the last days
// from there with the user's own athlete id and API key, straight from the
// phone (no server of ours, no account). It only ever READS. The key lives
// on this device (storage/externalActivities.ts) and never in an export.
//
// Paths and field names were checked against the official OpenAPI
// description (https://intervals.icu/api/v1/docs): GET
// /api/v1/athlete/{id}/activities with `oldest` and `newest`, Basic
// authentication with the user name "API_KEY" and the key as password.
//
// The mapping from intervals.icu fields to the general ExternalActivity
// (engine/activityImport.ts) is the only place that knows those field names.

import type { DataSourceAdapter, DateRange } from './types';
import type { ExternalActivity, ExternalActivityKind } from '../engine/activityImport';
import type { SubjectiveFeel } from '../models/training';

export const INTERVALS_BASE_URL = 'https://intervals.icu';
export const INTERVALS_ADAPTER_ID = 'intervals.icu';

export interface IntervalsConnection {
  athleteId: string;
  apiKey: string;
}

export type IntervalsErrorKind = 'input' | 'auth' | 'athlete' | 'rate' | 'server' | 'network' | 'response';

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
  icu_rpe?: number;
  feel?: number;
  trainer?: boolean;
  deleted?: boolean;
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

const positive = (n: unknown): number | undefined => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : undefined);

export function mapIntervalsActivity(raw: IntervalsActivity): ExternalActivity | undefined {
  if (!raw || raw.deleted) return undefined;
  if (raw.id === undefined || raw.id === null || raw.id === '') return undefined;
  if (typeof raw.start_date_local !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw.start_date_local)) return undefined;
  const durationSec = positive(raw.moving_time) ?? positive(raw.elapsed_time);
  if (durationSec === undefined) return undefined;

  const kind = kindOf(raw.type);
  const fromGarmin = raw.source === 'GARMIN_CONNECT' || /garmin|forerunner|fenix|enduro|venu|vivoactive/i.test(raw.device_name ?? '');
  const rpe = positive(raw.icu_rpe);
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
    rpe: rpe !== undefined && rpe <= 10 ? rpe : undefined,
    feel: feelOf(raw.feel),
    treadmill: kind !== 'strength' && (raw.trainer === true || raw.type === 'VirtualRun' || raw.type === 'VirtualRide'),
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

// --- the request ----------------------------------------------------------------

const TIMEOUT_MS = 15_000;

export interface FetchOptions {
  fetchImpl?: typeof fetch;
}

export async function fetchIntervalsActivities(
  connection: IntervalsConnection,
  range: DateRange,
  options: FetchOptions = {},
): Promise<ExternalActivity[]> {
  const { athleteId, apiKey } = normalizeConnection(connection);
  const doFetch = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await doFetch(activitiesUrl(athleteId, range), {
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

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new IntervalsError('response', MESSAGES.response);
  }
  return mapIntervalsActivities(body);
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
  };
}

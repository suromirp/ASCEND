// ASCEND: packing the series of a run into binary numbers, and back.
//
// A series is stored at the moments the watch wrote it, one typed array per series:
// heart rate as one byte, speed as millimetres per second in two bytes, and so on
// (docs/onderzoek/Run in detail.md, hoofdstuk 8). Each series says its type, its scale
// and the number that stands for a gap. That is about 34 bytes per reading with all
// fifteen series, some 120 KB for an hour of running.
//
// The track (`StreamSet.position`) is not in this table and is never packed.
//
// The numbers are written in the byte order of the device (every phone is little-endian);
// a backup file carries them as base64 of those bytes.
//
// Pure: no React, no IndexedDB.

import type { StreamSet } from '../models/activityDetail';
import type {
  ActivityStreams,
  PackType,
  SerializedActivityStreams,
  SerializedSeries,
  StoredSeries,
  StreamKindStored,
} from '../models/activityStreams';

interface PackSpec {
  kind: StreamKindStored;
  field: keyof StreamSet;
  type: PackType;
  // value = raw * scale
  scale: number;
  // Decimals kept when unpacking.
  decimals: number;
}

const U8_GAP = 255;
const U16_GAP = 65535;
const I16_GAP = -32768;

export const PACK_SPECS: PackSpec[] = [
  { kind: 'time', field: 'timeSec', type: 'u32', scale: 1, decimals: 0 },
  { kind: 'distance', field: 'distanceM', type: 'f32', scale: 1, decimals: 2 },
  { kind: 'heartRate', field: 'heartRate', type: 'u8', scale: 1, decimals: 0 },
  { kind: 'speed', field: 'speedMs', type: 'u16', scale: 0.001, decimals: 3 },
  { kind: 'altitude', field: 'altitudeM', type: 'f32', scale: 1, decimals: 2 },
  { kind: 'cadence', field: 'cadence', type: 'u8', scale: 1, decimals: 0 },
  { kind: 'power', field: 'powerW', type: 'u16', scale: 1, decimals: 0 },
  { kind: 'stanceTime', field: 'stanceTimeMs', type: 'u16', scale: 1, decimals: 0 },
  { kind: 'stanceBalance', field: 'stanceBalanceLeftPct', type: 'u16', scale: 0.01, decimals: 2 },
  { kind: 'verticalOscillation', field: 'verticalOscillationMm', type: 'u16', scale: 0.1, decimals: 1 },
  { kind: 'verticalRatio', field: 'verticalRatioPct', type: 'u16', scale: 0.01, decimals: 2 },
  { kind: 'stepLength', field: 'stepLengthM', type: 'u16', scale: 0.001, decimals: 3 },
  { kind: 'respiration', field: 'respirationRpm', type: 'u16', scale: 0.1, decimals: 1 },
  { kind: 'temperature', field: 'temperatureC', type: 'i16', scale: 0.1, decimals: 1 },
  { kind: 'verticalSpeed', field: 'verticalSpeedMs', type: 'i16', scale: 0.001, decimals: 3 },
];

const SPEC_BY_KIND = new Map(PACK_SPECS.map((s) => [s.kind, s]));

const BYTES: Record<PackType, number> = { u8: 1, u16: 2, i16: 2, u32: 4, f32: 4 };
const GAP: Record<PackType, number> = { u8: U8_GAP, u16: U16_GAP, i16: I16_GAP, u32: 0xffffffff, f32: Number.NaN };
// The largest raw number that is a real reading (one below the gap marker).
const MAX_RAW: Record<PackType, number> = { u8: 254, u16: 65534, i16: 32767, u32: 0xfffffffe, f32: Number.POSITIVE_INFINITY };
const MIN_RAW: Record<PackType, number> = { u8: 0, u16: 0, i16: -32767, u32: 0, f32: Number.NEGATIVE_INFINITY };

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function arrayFor(type: PackType, length: number): Uint8Array | Uint16Array | Int16Array | Uint32Array | Float32Array {
  switch (type) {
    case 'u8': return new Uint8Array(length);
    case 'u16': return new Uint16Array(length);
    case 'i16': return new Int16Array(length);
    case 'u32': return new Uint32Array(length);
    case 'f32': return new Float32Array(length);
  }
}

function viewOf(type: PackType, buffer: ArrayBuffer) {
  switch (type) {
    case 'u8': return new Uint8Array(buffer);
    case 'u16': return new Uint16Array(buffer);
    case 'i16': return new Int16Array(buffer);
    case 'u32': return new Uint32Array(buffer);
    case 'f32': return new Float32Array(buffer);
  }
}

function packOne(values: readonly (number | null | undefined)[], spec: PackSpec): StoredSeries | undefined {
  const out = arrayFor(spec.type, values.length);
  let any = false;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    let raw = GAP[spec.type];
    if (isNum(v)) {
      const r = spec.type === 'f32' ? v : Math.round(v / spec.scale);
      if (r >= MIN_RAW[spec.type] && r <= MAX_RAW[spec.type]) {
        raw = r;
        any = true;
      }
    }
    out[i] = raw;
  }
  if (!any) return undefined;
  return { type: spec.type, scale: spec.scale, missing: GAP[spec.type], data: out.buffer.slice(0) as ArrayBuffer };
}

function unpackOne(series: StoredSeries, spec: PackSpec): (number | null)[] {
  const view = viewOf(series.type, series.data);
  const out: (number | null)[] = new Array(view.length);
  const factor = 10 ** spec.decimals;
  for (let i = 0; i < view.length; i++) {
    const raw = view[i];
    if (series.type === 'f32' ? !Number.isFinite(raw) : raw === series.missing) {
      out[i] = null;
    } else {
      const value = series.type === 'f32' ? raw : raw * series.scale;
      out[i] = Math.round(value * factor) / factor;
    }
  }
  return out;
}

export interface PackMeta {
  logId: string;
  externalId: string;
  fetchedAt: string;
  wholeKm: number;
  wholeMinutes: number;
  headwindKmh?: (number | null)[];
  laps?: ActivityStreams['laps'];
  unknownKinds?: string[];
}

// The series of a run as they are kept. `time` always comes along (every other series is
// aligned to it); a series with no reading at all is left out. Undefined when there is no
// time or nothing else to keep.
export function packStreams(set: StreamSet, meta: PackMeta): ActivityStreams | undefined {
  if (!set.timeSec || set.timeSec.length < 2) return undefined;
  const series: ActivityStreams['series'] = {};
  for (const spec of PACK_SPECS) {
    const values = set[spec.field] as readonly (number | null | undefined)[] | undefined;
    if (!values) continue;
    const packed = packOne(values, spec);
    if (packed) series[spec.kind] = packed;
  }
  if (!series.time) return undefined;
  if (Object.keys(series).length < 2) return undefined;
  const out: ActivityStreams = {
    logId: meta.logId,
    externalId: meta.externalId,
    version: 1,
    fetchedAt: meta.fetchedAt,
    wholeKm: meta.wholeKm,
    wholeMinutes: meta.wholeMinutes,
    sampleCount: set.timeSec.length,
    series,
  };
  if (meta.headwindKmh && meta.headwindKmh.length > 0) out.headwindKmh = meta.headwindKmh;
  if (meta.laps && meta.laps.length > 0) out.laps = meta.laps;
  if (meta.unknownKinds && meta.unknownKinds.length > 0) out.unknownKinds = meta.unknownKinds;
  return out;
}

// Back to the shape the engine works with. No position: there is none.
export function unpackStreams(stored: ActivityStreams): StreamSet | undefined {
  const time = stored.series.time;
  if (!time) return undefined;
  const timeSec = unpackOne(time, SPEC_BY_KIND.get('time')!).map((v) => v ?? 0);
  const set: StreamSet = { timeSec };
  for (const spec of PACK_SPECS) {
    if (spec.kind === 'time') continue;
    const s = stored.series[spec.kind];
    if (!s) continue;
    const values = unpackOne(s, spec);
    if (values.length !== timeSec.length) continue;
    (set as unknown as Record<string, unknown>)[spec.field] = values;
  }
  return set;
}

// The bytes the series take, not counting the small fields around them.
export function streamsBytes(stored: ActivityStreams): number {
  let n = 0;
  for (const s of Object.values(stored.series)) n += s?.data.byteLength ?? 0;
  return n;
}

// --- base64, for the backup file --------------------------------------------------------

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let text = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) text += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(text);
}

function fromBase64(text: string): ArrayBuffer | undefined {
  try {
    const raw = atob(text);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes.buffer;
  } catch {
    return undefined;
  }
}

export function serializeStreams(stored: ActivityStreams): SerializedActivityStreams {
  const series: SerializedActivityStreams['series'] = {};
  for (const [kind, s] of Object.entries(stored.series) as [StreamKindStored, StoredSeries][]) {
    // NaN is not JSON: a float gap is written as null.
    series[kind] = { type: s.type, scale: s.scale, missing: Number.isFinite(s.missing) ? s.missing : null, data: toBase64(s.data) };
  }
  return { ...stored, series };
}

const TYPES: PackType[] = ['u8', 'u16', 'i16', 'u32', 'f32'];

function readSeries(raw: unknown, kind: StreamKindStored): StoredSeries | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const r = raw as Partial<SerializedSeries>;
  const spec = SPEC_BY_KIND.get(kind);
  // The type and scale are fixed per series; a file that says otherwise is not trusted.
  if (!spec || r.type !== spec.type || r.scale !== spec.scale || typeof r.data !== 'string') return undefined;
  if (!TYPES.includes(r.type)) return undefined;
  const data = fromBase64(r.data);
  if (!data || data.byteLength === 0 || data.byteLength % BYTES[r.type] !== 0) return undefined;
  return { type: r.type, scale: r.scale, missing: GAP[r.type], data };
}

// A series set as it comes out of a backup file. Undefined when it is damaged beyond use
// (no key, no time, series of different lengths); a single bad series is dropped on its own.
export function deserializeStreams(raw: unknown): ActivityStreams | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const r = raw as Partial<SerializedActivityStreams>;
  if (typeof r.logId !== 'string' || r.logId === '' || r.logId.length > 80 || typeof r.externalId !== 'string' || r.version !== 1) return undefined;
  if (!isNum(r.wholeKm) || !isNum(r.wholeMinutes) || typeof r.fetchedAt !== 'string' || !r.series || typeof r.series !== 'object') return undefined;
  const series: ActivityStreams['series'] = {};
  for (const spec of PACK_SPECS) {
    const s = readSeries((r.series as Record<string, unknown>)[spec.kind], spec.kind);
    if (s) series[spec.kind] = s;
  }
  const time = series.time;
  if (!time) return undefined;
  const length = time.data.byteLength / BYTES[time.type];
  for (const kind of Object.keys(series) as StreamKindStored[]) {
    const s = series[kind]!;
    if (s.data.byteLength / BYTES[s.type] !== length) delete series[kind];
  }
  if (Object.keys(series).length < 2) return undefined;
  const out: ActivityStreams = {
    logId: r.logId,
    externalId: r.externalId,
    version: 1,
    fetchedAt: r.fetchedAt,
    wholeKm: r.wholeKm,
    wholeMinutes: r.wholeMinutes,
    sampleCount: length,
    series,
  };
  if (Array.isArray(r.headwindKmh) && r.headwindKmh.every((v) => v === null || isNum(v))) out.headwindKmh = r.headwindKmh;
  if (Array.isArray(r.laps)) {
    const laps = r.laps.filter((l) => l && isNum(l.startSec) && isNum(l.endSec) && l.endSec > l.startSec);
    if (laps.length > 0) out.laps = laps;
  }
  if (Array.isArray(r.unknownKinds)) {
    const names = r.unknownKinds.filter((n): n is string => typeof n === 'string' && n.length > 0 && n.length <= 40).slice(0, 30);
    if (names.length > 0) out.unknownKinds = names;
  }
  return out;
}

// The size as a person reads it: "820 KB", "12 MB".
export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${Math.round(bytes)} B`;
  if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} KB`;
  const mb = bytes / 1_000_000;
  return `${mb < 10 ? (Math.round(mb * 10) / 10).toString().replace('.', ',') : Math.round(mb)} MB`;
}

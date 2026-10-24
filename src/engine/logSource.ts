// Where the numbers of a logged training come from, in words for the log sheet,
// and the line that tells which hand-made numbers are kept
// (docs/beslissingen/2026-10-22-garmin-is-leidend.md).
//
// Pure: no React, no IndexedDB.

import type { MeasuredField, MetricSource, SessionLog } from '../models/training';
import { durationLabel } from './activityImport';
import { isAligned, MEASURED_FIELDS } from './watchAlign';
import { formatNumberNL } from '../utils/number';

export type LogSourceIcon = 'horloge' | 'notitie';

export interface LogSourceInfo {
  label: string;
  icon: LogSourceIcon;
}

const LABEL: Record<MetricSource, string> = {
  garmin: 'Garmin',
  manual: 'Zelf ingevuld',
  macrofactor: 'MacroFactor',
  'health-connect': 'Health Connect',
  import: 'Geïmporteerd',
};

const fromIntervals = (log: SessionLog) => !!log.externalId && log.externalId.startsWith('intervals.icu');

// The source of the block that holds the numbers goes first; an id of
// intervals.icu is a watch activity, so it reads as Garmin.
export function logSource(log: SessionLog): LogSourceInfo {
  const block = log.outdoorData?.source ?? log.cardioData?.source;
  let source: MetricSource = block && block !== 'manual' ? block : (log.source ?? 'manual');
  if ((source === 'manual' || source === 'import') && fromIntervals(log)) source = 'garmin';
  return { label: LABEL[source], icon: source === 'manual' ? 'notitie' : 'horloge' };
}

// Whose numbers go when you put your own back: "Garmin", "de import".
export function sourceNoun(info: LogSourceInfo): string {
  return info.label === LABEL.import ? 'de import' : info.label;
}

const TEXT: Partial<Record<MeasuredField, (n: number) => string>> = {
  durationMinutes: (n) => durationLabel(n * 60),
  distanceKm: (n) => `${formatNumberNL(n, 1)} km`,
  elevationGainM: (n) => `${formatNumberNL(n, 0)} m D+`,
  elevationLossM: (n) => `${formatNumberNL(n, 0)} m D−`,
  avgHeartRate: (n) => `hartslag ${n}`,
  maxHeartRate: (n) => `hoogste hartslag ${n}`,
  cadence: (n) => `cadans ${n}`,
};

// "Je eigen getallen staan bewaard: 55 min, 41 m D+". Only for a log the watch
// took over, and only the fields that were really yours.
export function keptNumbersLine(log: SessionLog): string | undefined {
  if (!isAligned(log) || !log.manualMeasured) return undefined;
  const parts: string[] = [];
  for (const field of MEASURED_FIELDS) {
    const v = log.manualMeasured.values[field];
    if (typeof v === 'number') parts.push(TEXT[field]?.(v) ?? '');
  }
  const told = parts.filter(Boolean);
  return told.length > 0 ? `Je eigen getallen staan bewaard: ${told.join(', ')}` : 'Je eigen getallen staan bewaard.';
}

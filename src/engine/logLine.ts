// De regel onder een training in het Logboek, als losse stukken (de aanroeper
// zet er een middenpunt tussen). Geen sport die twee keer genoemd wordt en geen
// stuk dat hetzelfde zegt als een ander.

import { formatNumberNL } from '../utils/number';

export interface LogLineInput {
  kind: string;
  minutes: number;
  modalityLabel?: string;
  environment?: string;
  garminType?: string;
  feel?: 'better' | 'normal' | 'worse';
  elevationGainM?: number;
  elevationEstimated?: boolean;
  distanceKm?: number;
  steps?: number;
}

const has = (a: string, b: string) => a.toLowerCase().includes(b.toLowerCase());

export function logLineParts(i: LogLineInput): string[] {
  const parts: string[] = [];
  const env = i.environment === 'treadmill' ? 'Loopband' : i.environment === 'outdoor' ? 'Buiten' : undefined;
  const how = i.modalityLabel ?? env;
  if (how && has(how, i.kind)) parts.push(how);
  else {
    parts.push(i.kind);
    if (how) parts.push(how);
  }
  parts.push(`${i.minutes} min`);
  const g = i.garminType;
  if (g && !parts.some((p) => has(p, g) || has(g, p))) parts.push(`Garmin: ${g}`);
  if (i.distanceKm) parts.push(`${formatNumberNL(i.distanceKm, 1)} km`);
  if (i.elevationGainM) parts.push(`${formatNumberNL(i.elevationGainM, 0)} m D+${i.elevationEstimated ? ' (geschat)' : ''}`);
  if (i.steps) parts.push(`${i.steps} verdiepingen`);
  if (i.feel === 'better') parts.push('voelde beter');
  if (i.feel === 'worse') parts.push('voelde slechter');
  return parts;
}

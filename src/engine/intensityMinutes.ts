// ASCEND: de minuten van een training in rustig, middel en hard, naar de hartslag
// (docs/beslissingen/2026-10-25-intensiteit-gemeten.md).
//
// Rustig is zone 1 en 2 (en alles eronder), middel is zone 3, hard is zone 4 en
// hoger, met de zones van engine/heartRateZones.ts. De bron is het compacte
// profiel op de log (48 stukjes met elk een gemiddelde hartslag). Is er te weinig
// hartslag, of geen drempel en geen maximum, dan geeft de functie niets terug en
// valt de aanroeper terug op de bedoeling van de training.
//
// Puur: geen React, geen IndexedDB.

import type { SessionLog } from '../models/training';
import { zoneBpm, type HeartRateSettings } from './heartRateZones';

export interface ZoneMinutes {
  easy: number;
  middle: number;
  hard: number;
}

// Minder hartslag dan dit deel van de tijd en het profiel zegt te weinig.
export const MIN_HEART_RATE_COVERAGE_PCT = 80;

export function minutesByZone(log: SessionLog, hr: HeartRateSettings | undefined): ZoneMinutes | undefined {
  const detail = log.detail;
  const zone3 = zoneBpm(3, hr);
  const zone4 = zoneBpm(4, hr);
  if (!detail || !zone3 || !zone4) return undefined;
  if (detail.quality.heartRateCoveragePct < MIN_HEART_RATE_COVERAGE_PCT) return undefined;
  const slices = detail.slices.filter((s) => s.sec > 0 && typeof s.heartRate === 'number' && s.heartRate > 0);
  const seconds = slices.reduce((sum, s) => sum + s.sec, 0);
  if (seconds <= 0 || log.durationMinutes <= 0) return undefined;
  const out: ZoneMinutes = { easy: 0, middle: 0, hard: 0 };
  for (const s of slices) {
    const bpm = s.heartRate as number;
    const kind = bpm >= zone4[0] ? 'hard' : bpm >= zone3[0] ? 'middle' : 'easy';
    out[kind] += (s.sec / seconds) * log.durationMinutes;
  }
  return out;
}

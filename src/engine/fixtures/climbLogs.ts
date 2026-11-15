// Nagemaakte bergtochten met klim- en dalstukken, genoeg voor een eigen klimtempo (engine/climbPace.ts:
// zes klimmen uit drie tochten). Ongeveer 470 m per uur omhoog en 750 omlaag. Geen echte data.

import type { SessionLog } from '../../models/training';
import type { ActivityDetail, TerrainStretch } from '../../models/activityDetail';

function stretch(kind: 'climb' | 'descent', metres: number, metresPerHour: number, gradientPct = 10): TerrainStretch {
  const sec = Math.round((metres / metresPerHour) * 3600);
  return { kind, startSec: 0, sec, distanceM: Math.round(metres / (gradientPct / 100)), metres, gradientPct };
}

function detail(stretches: TerrainStretch[]): ActivityDetail {
  return { version: 1, source: 'garmin', sliceCount: 0, slices: [], stretches, movingSec: 3600, quality: { heartRateCoveragePct: 100 } };
}

function hike(id: string, date: string, stretches: TerrainStretch[], packKg?: number): SessionLog {
  return {
    id, templateId: 'tpl_mountain_hike', type: 'hiking', sport: 'hiking',
    completedDate: date, completedAt: `${date}T12:00:00.000Z`, variant: 'full', durationMinutes: 240, source: 'garmin',
    outdoorData: { durationMinutes: 240, distanceKm: 14, elevationGainM: 800, elevationLossM: 800, ...(packKg !== undefined ? { backpackWeightKg: packKg } : {}) },
    detail: detail(stretches),
  } as SessionLog;
}

// Drie tochten in september en oktober 2026, elk met twee klimmen en een daling, met `packKg` op je rug.
export function climbHikes(packKg?: number): SessionLog[] {
  return [
    hike('climb_log_1', '2026-09-05', [stretch('climb', 200, 400), stretch('climb', 120, 450), stretch('descent', 300, 700)], packKg),
    hike('climb_log_2', '2026-09-20', [stretch('climb', 180, 500), stretch('climb', 110, 420), stretch('descent', 250, 800)], packKg),
    hike('climb_log_3', '2026-10-11', [stretch('climb', 250, 480), stretch('climb', 100, 520), stretch('descent', 280, 750)], packKg),
  ];
}

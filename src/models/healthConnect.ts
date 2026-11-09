// ASCEND: de gedeelde woorden voor Health Connect (docs/beslissingen/2026-11-02-health-connect.md).
// Geen React, geen opslag, geen plugin: integrations/healthConnect.ts, storage/healthConnect.ts en
// de engine lezen alle drie deze vormen.

// Wat ASCEND mag lezen, in de namen van de plugin. Precies de leesrechten in
// android/app/src/main/AndroidManifest.xml.
export type HealthKind = 'workouts' | 'distance' | 'sleep' | 'restingHeartRate' | 'heartRateVariability' | 'weight' | 'bodyFat';

export type HealthConnectErrorKind = 'web' | 'not-installed' | 'needs-update' | 'denied' | 'timeout' | 'failed';

// Wat een ronde per soort opleverde. `weight`: een aantal dagen met een weging, of waarom er niets
// gelezen werd ('off': de schakelaar Gewicht uit Health Connect staat uit, 'denied': Android liet het niet toe).
export interface HealthRoundFound {
  activities: number;
  mornings: number;
  weight: number | 'off' | 'denied';
}

// De uitkomst van een ronde.
export type HealthSyncResult =
  | { status: 'off' }
  | { status: 'web' }
  | { status: 'too-soon' }
  // `weights`: hoeveel dagen gewicht nieuw of anders binnenkwamen (docs/beslissingen/2026-11-04-gewicht-uit-health-connect.md).
  | { status: 'ok'; activities: number; mornings: number; weights: number; found?: HealthRoundFound }
  | { status: 'error'; kind: HealthConnectErrorKind; message: string };

// De uitkomst van aanzetten.
export type HealthEnableResult =
  | { status: 'on'; granted: HealthKind[]; sync: HealthSyncResult }
  | { status: 'web' | 'not-installed' | 'needs-update' | 'denied' }
  | { status: 'error'; message: string };

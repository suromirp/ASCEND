import { describe, expect, it } from 'vitest';
import type { HealthSample, Workout } from '@capgo/capacitor-health';
import {
  HEALTH_CONNECT_ADAPTER_ID,
  HealthConnectError,
  createHealthConnectAdapter,
  distanceOf,
  healthConnectErrorOf,
  localStart,
  mapHealthRecovery,
  mapHealthWorkout,
  rangeBounds,
  type HealthConnectPort,
} from './healthConnect';

// Nagemaakte trainingen en nachten. De tijden worden in lokale tijd gemaakt, zodat de test in
// elke tijdzone hetzelfde zegt.
const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m).toISOString();

function workout(extra: Partial<Workout> = {}): Workout {
  return { workoutType: 'running', duration: 40 * 60, startDate: at(20, 7, 30), endDate: at(20, 8, 10), platformId: 'p1', sourceId: 'com.example.watch', ...extra };
}

function sample(dataType: HealthSample['dataType'], value: number, start: string, end = start, extra: Partial<HealthSample> = {}): HealthSample {
  return { dataType, value, unit: 'count', startDate: start, endDate: end, ...extra };
}

describe('een training uit Health Connect', () => {
  it('wordt de gewone vorm, met de bron health-connect', () => {
    expect(mapHealthWorkout(workout({ totalDistance: 6400 }))).toEqual({
      externalId: 'health-connect:p1',
      source: 'health-connect',
      start: '2026-10-20T07:30:00',
      kind: 'run',
      durationSec: 2400,
      distanceM: 6400,
      treadmill: false,
    });
  });

  it('kent loopband, wandelen, fietsen, kracht en de sporten die kunnen meetellen', () => {
    expect(mapHealthWorkout(workout({ workoutType: 'runningTreadmill' }))?.treadmill).toBe(true);
    expect(mapHealthWorkout(workout({ workoutType: 'hiking' }))?.kind).toBe('hike');
    expect(mapHealthWorkout(workout({ workoutType: 'walking' }))?.kind).toBe('hike');
    expect(mapHealthWorkout(workout({ workoutType: 'cycling' }))?.kind).toBe('ride');
    expect(mapHealthWorkout(workout({ workoutType: 'bikingStationary' }))).toMatchObject({ kind: 'ride', treadmill: true });
    expect(mapHealthWorkout(workout({ workoutType: 'strengthTraining' }))).toMatchObject({ kind: 'strength', treadmill: false });
    expect(mapHealthWorkout(workout({ workoutType: 'swimmingPool' }))).toMatchObject({ kind: 'other', countedSport: 'swimming' });
    expect(mapHealthWorkout(workout({ workoutType: 'tableTennis' }))).toMatchObject({ kind: 'other', otherType: 'tableTennis' });
    const unknown = mapHealthWorkout(workout({ workoutType: 'other' }));
    expect(unknown?.kind).toBe('other');
    expect(unknown?.otherType).toBeUndefined();
  });

  it('zonder duur, zonder geldige start of met een onzinafstand geen of minder', () => {
    expect(mapHealthWorkout(workout({ duration: 0 }))).toBeUndefined();
    expect(mapHealthWorkout(workout({ startDate: 'kapot' }))).toBeUndefined();
    expect(mapHealthWorkout(workout({ totalDistance: 900_000 }))?.distanceM).toBeUndefined();
  });

  it('zonder eigen id een id uit de start', () => {
    expect(mapHealthWorkout(workout({ platformId: undefined }))?.externalId).toBe(`${HEALTH_CONNECT_ADAPTER_ID}:${at(20, 7, 30)}`);
  });

  it('de afstand komt uit de afstanden van dezelfde bron binnen de training', () => {
    const w = workout();
    const samples = [
      sample('distance', 3000, at(20, 7, 30), at(20, 7, 50), { sourceId: 'com.example.watch' }),
      sample('distance', 3100, at(20, 7, 50), at(20, 8, 10), { sourceId: 'com.example.watch' }),
      // De telefoon in je zak telt mee met een andere bron: niet dubbel.
      sample('distance', 6000, at(20, 7, 30), at(20, 8, 10), { sourceId: 'com.example.phone' }),
      // Buiten de training.
      sample('distance', 900, at(20, 12, 0), at(20, 12, 10), { sourceId: 'com.example.watch' }),
    ];
    expect(distanceOf(w, samples)).toBe(6100);
    expect(distanceOf(workout({ sourceId: undefined }), samples)).toBeUndefined();
    expect(mapHealthWorkout(w, samples)?.distanceM).toBe(6100);
  });

  it('de lokale tijd van een moment, zonder zone', () => {
    expect(localStart(at(3, 6, 5))).toBe('2026-10-03T06:05:00');
    expect(localStart('geen tijd')).toBeUndefined();
  });
});

describe('ochtenden uit Health Connect', () => {
  it('slaap op de dag dat je wakker werd, met rusthartslag en HRV van die dag', () => {
    const sleep = [sample('sleep', 450, at(19, 23, 0), at(20, 6, 30))];
    const rhr = [sample('restingHeartRate', 49, at(20, 6, 0)), sample('restingHeartRate', 48, at(20, 9, 0))];
    const hrv = [sample('heartRateVariability', 61.24, at(20, 6, 0))];
    expect(mapHealthRecovery({ sleep, restingHeartRate: rhr, heartRateVariability: hrv })).toEqual([
      { id: 'health-connect:2026-10-20', date: '2026-10-20', source: 'health-connect', sleepMinutes: 450, restingHeartRate: 48, hrv: 61.2 },
    ]);
  });

  it('telt bij slaapfasen alleen de echte slaap, en neemt per nacht de langste', () => {
    const night = sample('sleep', 480, at(19, 22, 30), at(20, 6, 30), {
      stages: [
        { startDate: at(19, 22, 30), endDate: at(20, 2, 30), stage: 'light', durationMinutes: 240 },
        { startDate: at(20, 2, 30), endDate: at(20, 3, 0), stage: 'awake', durationMinutes: 30 },
        { startDate: at(20, 3, 0), endDate: at(20, 6, 30), stage: 'deep', durationMinutes: 210 },
      ],
    });
    const nap = sample('sleep', 30, at(20, 14, 0), at(20, 14, 30));
    expect(mapHealthRecovery({ sleep: [nap, night] })[0].sleepMinutes).toBe(450);
  });

  it('een getal buiten wat een lichaam kan valt weg, de rest van de dag blijft', () => {
    const out = mapHealthRecovery({ restingHeartRate: [sample('restingHeartRate', 400, at(21, 6))], heartRateVariability: [sample('heartRateVariability', 55, at(21, 6))] });
    expect(out).toEqual([{ id: 'health-connect:2026-10-21', date: '2026-10-21', source: 'health-connect', hrv: 55 }]);
    expect(mapHealthRecovery({ restingHeartRate: [sample('restingHeartRate', 400, at(21, 6))] })).toEqual([]);
  });
});

describe('het bereik en de fouten', () => {
  it('van middernacht tot hoogstens nu: vandaag telt nog niet als voorbij', () => {
    const now = new Date(2026, 9, 22, 10, 15);
    const b = rangeBounds({ from: '2026-10-15', to: '2026-10-23' }, now);
    expect(b.from).toBe(new Date(2026, 9, 15).toISOString());
    expect(b.to).toBe(now.toISOString());
    expect(rangeBounds({ from: '2026-10-15', to: '2026-10-18' }, now).to).toBe(new Date(2026, 9, 18).toISOString());
  });

  it('een geweigerde toestemming, een time-out en de rest worden een eigen soort fout', () => {
    expect(healthConnectErrorOf(new Error('SecurityException: Caller doesn\'t have android.permission.health.READ_EXERCISE')).kind).toBe('denied');
    expect(healthConnectErrorOf(Object.assign(new Error('Het duurde te lang.'), { name: 'TimeoutError' })).kind).toBe('timeout');
    expect(healthConnectErrorOf(new Error('Rate limited request quota has been exceeded')).kind).toBe('failed');
    const own = new HealthConnectError('not-installed');
    expect(healthConnectErrorOf(own)).toBe(own);
    expect(own.message).toMatch(/Play Store/);
  });
});

describe('de adapter', () => {
  function port(over: Partial<HealthConnectPort> = {}): HealthConnectPort {
    return {
      inApp: true,
      availability: async () => 'ready',
      granted: async () => ['workouts', 'distance', 'sleep', 'restingHeartRate', 'heartRateVariability'],
      request: async () => [],
      workouts: async () => [workout(), workout({ platformId: 'p1' }), workout({ platformId: 'p2', workoutType: 'hiking', startDate: at(21, 9), endDate: at(21, 12), duration: 3 * 3600 })],
      samples: async (kind) => (kind === 'restingHeartRate' ? [sample('restingHeartRate', 50, at(21, 6))] : []),
      openSettings: async () => undefined,
      ...over,
    };
  }
  const range = { from: '2026-10-15', to: '2026-10-23' };
  const now = new Date(2026, 9, 22, 10);

  it('vult dezelfde vormen als elke andere bron, zonder dubbele ids', async () => {
    const adapter = createHealthConnectAdapter(port(), { now: () => now });
    expect(adapter.id).toBe(HEALTH_CONNECT_ADAPTER_ID);
    expect(adapter.isConnected()).toBe(true);
    const acts = await adapter.fetchExternalActivities!(range);
    expect(acts.map((a) => a.externalId)).toEqual(['health-connect:p1', 'health-connect:p2']);
    expect(await adapter.fetchRecoveryMetrics!(range)).toEqual([{ id: 'health-connect:2026-10-21', date: '2026-10-21', source: 'health-connect', restingHeartRate: 50 }]);
  });

  it('een training die nog niet voorbij is, komt niet mee', async () => {
    const running = workout({ platformId: 'p9', startDate: at(22, 9, 45), endDate: at(22, 10, 30) });
    const adapter = createHealthConnectAdapter(port({ workouts: async () => [running] }), { now: () => now });
    expect(await adapter.fetchExternalActivities!(range)).toEqual([]);
  });

  it('vraagt alleen wat toegestaan is', async () => {
    const asked: string[] = [];
    const adapter = createHealthConnectAdapter(
      port({
        granted: async () => ['sleep'],
        workouts: async () => {
          asked.push('workouts');
          return [];
        },
        samples: async (kind) => {
          asked.push(kind);
          return [];
        },
      }),
      { now: () => now },
    );
    expect(await adapter.fetchExternalActivities!(range)).toEqual([]);
    await adapter.fetchRecoveryMetrics!(range);
    expect(asked).toEqual(['sleep']);
  });

  it('niet in de app: niet verbonden en niets op te halen', async () => {
    const adapter = createHealthConnectAdapter(port({ inApp: false }), { now: () => now });
    expect(adapter.isConnected()).toBe(false);
    await expect(adapter.fetchExternalActivities!(range)).rejects.toMatchObject({ kind: 'web' });
  });
});

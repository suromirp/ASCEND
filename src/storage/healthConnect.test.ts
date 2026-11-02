import { beforeEach, describe, expect, it } from 'vitest';
import type { HealthSample, Workout } from '@capgo/capacitor-health';
import { MetaRepo, PlannedSessionsRepo, RecoveryMetricsRepo, SessionLogsRepo, SettingsRepo, wipeAllData } from './database';
import {
  HC_FETCH_HOURS,
  HC_RETRY_MINUTES,
  HEALTH_CONNECT_KEY,
  commitHealthRound,
  disableHealthConnect,
  enableHealthConnect,
  getHealthConnectState,
  syncHealthConnect,
} from './healthConnect';
import { migrateHealthConnectState } from './migrations';
import { getRecoveryMetrics } from './wellness';
import { buildBackupEnvelope } from './backup';
import { HEALTH_KINDS, type HealthConnectPort, type HealthKind, type HealthSampleKind } from '../integrations/healthConnect';
import { offeredActivities } from '../engine/sourcePrecedence';
import { pendingProposals, type ExternalActivity } from '../engine/activityImport';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import type { RecoveryMetric } from '../models/metrics';
import type { LeavePeriod } from '../models/leave';

// Nagemaakte trainingen, nachten en plannen, geen echte persoon. De tijden in lokale tijd, zodat de
// test in elke tijdzone hetzelfde zegt.
const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m);
const iso = (d: number, h: number, m = 0) => at(d, h, m).toISOString();
const NOW = at(22, 10);

function workout(id: string, d: number, h: number, minutes: number, type: Workout['workoutType'] = 'running'): Workout {
  return { workoutType: type, duration: minutes * 60, startDate: iso(d, h), endDate: new Date(at(d, h).getTime() + minutes * 60_000).toISOString(), platformId: id, sourceId: 'com.example.watch' };
}

const rhr = (d: number, v: number): HealthSample => ({ dataType: 'restingHeartRate', value: v, unit: 'bpm', startDate: iso(d, 6), endDate: iso(d, 6) });

interface FakeOptions {
  available?: 'ready' | 'not-installed' | 'needs-update';
  granted?: HealthKind[];
  askGives?: HealthKind[];
  workouts?: Workout[] | (() => Promise<Workout[]>);
  samples?: Partial<Record<HealthSampleKind, HealthSample[] | (() => Promise<HealthSample[]>)>>;
}

function fake(o: FakeOptions = {}): HealthConnectPort & { asked: number } {
  const port = {
    asked: 0,
    inApp: true,
    availability: async () => o.available ?? 'ready',
    granted: async () => o.granted ?? [...HEALTH_KINDS],
    request: async () => {
      port.asked++;
      return o.askGives ?? [...HEALTH_KINDS];
    },
    workouts: async () => (typeof o.workouts === 'function' ? o.workouts() : (o.workouts ?? [])),
    samples: async (kind: HealthSampleKind) => {
      const s = o.samples?.[kind];
      return typeof s === 'function' ? s() : (s ?? []);
    },
    openSettings: async () => undefined,
  };
  return port;
}

const later = (hours: number) => new Date(NOW.getTime() + hours * 3600_000);

beforeEach(async () => {
  await wipeAllData();
});

describe('Health Connect aanzetten', () => {
  it('staat standaard uit en haalt dan niets op', async () => {
    expect((await getHealthConnectState()).enabled).toBe(false);
    expect(await syncHealthConnect({ port: fake(), now: NOW })).toEqual({ status: 'off' });
  });

  it('op het web: geen vraag en geen fout, alleen de uitkomst', async () => {
    const port = { ...fake(), inApp: false };
    expect(await enableHealthConnect({ port, now: NOW })).toEqual({ status: 'web' });
    expect((await getHealthConnectState()).enabled).toBe(false);
  });

  it('niet geinstalleerd of te oud: het blijft uit en er wordt niets gevraagd', async () => {
    const missing = fake({ available: 'not-installed' });
    expect(await enableHealthConnect({ port: missing, now: NOW })).toEqual({ status: 'not-installed' });
    expect(missing.asked).toBe(0);
    expect(await enableHealthConnect({ port: fake({ available: 'needs-update' }), now: NOW })).toEqual({ status: 'needs-update' });
    expect((await getHealthConnectState()).enabled).toBe(false);
  });

  it('geweigerd: het blijft uit', async () => {
    const port = fake({ askGives: [] });
    expect(await enableHealthConnect({ port, now: NOW })).toEqual({ status: 'denied' });
    expect(port.asked).toBe(1);
    expect((await getHealthConnectState()).enabled).toBe(false);
  });

  it('toegestaan: aan, en meteen een ronde', async () => {
    const port = fake({ workouts: [workout('w1', 21, 7, 40)], samples: { restingHeartRate: [rhr(21, 50)] } });
    const result = await enableHealthConnect({ port, now: NOW });
    expect(result).toMatchObject({ status: 'on', sync: { status: 'ok', activities: 1, mornings: 1 } });
    const state = await getHealthConnectState();
    expect(state.enabled).toBe(true);
    expect(state.activities.map((a) => [a.externalId, a.source])).toEqual([['health-connect:w1', 'health-connect']]);
    expect(await RecoveryMetricsRepo.getAll()).toEqual([{ id: 'health-connect:2026-10-21', date: '2026-10-21', source: 'health-connect', restingHeartRate: 50 }]);
  });
});

describe('een ronde', () => {
  async function turnOn(port: HealthConnectPort) {
    await enableHealthConnect({ port, now: NOW });
  }

  it('hoogstens eens per paar uur, tenzij je zelf vraagt', async () => {
    const port = fake({ workouts: [workout('w1', 21, 7, 40)] });
    await turnOn(port);
    expect(await syncHealthConnect({ port, now: later(1) })).toEqual({ status: 'too-soon' });
    expect(await syncHealthConnect({ port, now: later(1), force: true })).toMatchObject({ status: 'ok' });
    expect(await syncHealthConnect({ port, now: later(1 + HC_FETCH_HOURS) })).toMatchObject({ status: 'ok' });
  });

  it('een fout halverwege: alles of niets, wat er stond blijft staan', async () => {
    await turnOn(fake({ workouts: [workout('w1', 21, 7, 40)], samples: { restingHeartRate: [rhr(21, 50)] } }));
    const before = await RecoveryMetricsRepo.getAll();
    const broken = fake({
      workouts: [workout('w2', 22, 7, 30)],
      samples: {
        restingHeartRate: [rhr(22, 47)],
        sleep: async () => {
          throw new Error('Rate limited request quota has been exceeded');
        },
      },
    });
    const result = await syncHealthConnect({ port: broken, now: later(4) });
    expect(result).toMatchObject({ status: 'error', kind: 'failed' });
    const state = await getHealthConnectState();
    expect(state.activities.map((a) => a.externalId)).toEqual(['health-connect:w1']);
    expect(state.lastError?.kind).toBe('failed');
    expect(await RecoveryMetricsRepo.getAll()).toEqual(before);
  });

  it('de transactie zelf: gaat een rij mis, dan blijven ook de stand en de andere rijen weg', async () => {
    const good: RecoveryMetric = { id: 'health-connect:2026-10-20', date: '2026-10-20', source: 'health-connect', hrv: 50 };
    const bad = { id: 'health-connect:2026-10-21', date: '2026-10-21', source: 'health-connect', hrv: () => 1 } as unknown as RecoveryMetric;
    const state = migrateHealthConnectState({ enabled: true, granted: ['sleep'] });
    await expect(commitHealthRound(state, [good, bad])).rejects.toBeTruthy();
    expect(await RecoveryMetricsRepo.getAll()).toEqual([]);
    expect(await MetaRepo.get(HEALTH_CONNECT_KEY)).toBeUndefined();
  });

  it('een koppeling die verlopen is (alles ingetrokken): een zichtbare fout, de stand blijft aan en niets verdwijnt', async () => {
    await turnOn(fake({ workouts: [workout('w1', 21, 7, 40)] }));
    const result = await syncHealthConnect({ port: fake({ granted: [] }), now: later(4) });
    expect(result).toMatchObject({ status: 'error', kind: 'denied' });
    expect(result.status === 'error' && result.message).toMatch(/niet meer lezen/);
    const state = await getHealthConnectState();
    expect(state.enabled).toBe(true);
    expect(state.activities).toHaveLength(1);
  });

  it('tijdelijk kapot: na een half uur opnieuw, en dan gewoon weer', async () => {
    const port = fake({ workouts: [workout('w1', 21, 7, 40)] });
    await turnOn(port);
    const flaky = fake({
      workouts: async () => {
        throw new Error('remote exception');
      },
    });
    expect(await syncHealthConnect({ port: flaky, now: later(4) })).toMatchObject({ status: 'error', kind: 'failed' });
    expect(await syncHealthConnect({ port, now: later(4.2) })).toEqual({ status: 'too-soon' });
    expect(await syncHealthConnect({ port, now: new Date(later(4).getTime() + HC_RETRY_MINUTES * 60_000) })).toMatchObject({ status: 'ok' });
    expect((await getHealthConnectState()).lastError).toBeUndefined();
  });

  it('een time-out: een fout met een zin, en een antwoord dat later toch komt schrijft niets', async () => {
    await turnOn(fake({ workouts: [workout('w1', 21, 7, 40)] }));
    let release: (w: Workout[]) => void = () => undefined;
    const slow = fake({ workouts: () => new Promise<Workout[]>((r) => (release = r)) });
    const result = await syncHealthConnect({ port: slow, now: later(4), roundMs: 30 });
    expect(result).toMatchObject({ status: 'error', kind: 'timeout' });
    release([workout('w9', 22, 8, 30)]);
    await new Promise((r) => setTimeout(r, 20));
    expect((await getHealthConnectState()).activities.map((a) => a.externalId)).toEqual(['health-connect:w1']);
  });

  it('de dag zelf: een training die nog niet voorbij is komt niet mee, de ochtend van vandaag wordt later bijgewerkt', async () => {
    const running = workout('w-nu', 22, 9, 90);
    const port = fake({ workouts: [workout('w1', 22, 7, 40), running], samples: { restingHeartRate: [rhr(22, 52)] } });
    await turnOn(port);
    expect((await getHealthConnectState()).activities.map((a) => a.externalId)).toEqual(['health-connect:w1']);
    const afterwards = fake({ workouts: [workout('w1', 22, 7, 40), running], samples: { restingHeartRate: [rhr(22, 49)] } });
    await syncHealthConnect({ port: afterwards, now: later(HC_FETCH_HOURS) });
    expect((await getHealthConnectState()).activities.map((a) => a.externalId)).toEqual(['health-connect:w1', 'health-connect:w-nu']);
    expect((await RecoveryMetricsRepo.getAll()).find((m) => m.date === '2026-10-22')?.restingHeartRate).toBe(49);
  });

  it('uitgezet terwijl de ronde liep: er wordt niets bewaard', async () => {
    await turnOn(fake());
    let release: (w: Workout[]) => void = () => undefined;
    const slow = fake({ workouts: () => new Promise<Workout[]>((r) => (release = r)) });
    const round = syncHealthConnect({ port: slow, now: later(4) });
    await new Promise((r) => setTimeout(r, 10));
    await disableHealthConnect();
    release([workout('w9', 22, 8, 30)]);
    expect(await round).toEqual({ status: 'off' });
    expect((await getHealthConnectState()).activities).toEqual([]);
  });
});

describe('historie en planning blijven zoals ze waren', () => {
  const { templates } = buildDefaultProgramData();
  const vacation: LeavePeriod = { id: 'leave-1', kind: 'no_training', startDate: '2026-10-19', endDate: '2026-10-20' };
  const trek: LeavePeriod = { id: 'leave-2', kind: 'trek', startDate: '2026-10-21', endDate: '2026-10-21', trek: { name: 'Proeftocht', terrain: 'mountain', tent: false } as LeavePeriod['trek'] };
  const trekDay: PlannedSession = { id: 'ps-trek', templateId: 'tpl_mountain_hike', scheduledDate: '2026-10-21', weekStartDate: '2026-10-19', status: 'planned', order: 0, leaveMark: { periodId: 'leave-2', role: 'placed', from: '2026-10-21' } } as PlannedSession;
  const icuLog: SessionLog = {
    id: 'log-icu',
    templateId: 'tpl_easy_run',
    type: 'cardio',
    completedDate: '2026-10-18',
    completedAt: new Date(at(18, 7).getTime() + 40 * 60_000).toISOString(),
    variant: 'custom',
    durationMinutes: 40,
    externalId: 'intervals.icu:i7',
    source: 'garmin',
  };

  it('een rij in een vakantie of tocht loopt via de gewone voorstellen; de planning en de logs veranderen niet', async () => {
    await SettingsRepo.set({ leavePeriods: [vacation, trek] });
    await PlannedSessionsRepo.put(trekDay);
    await SessionLogsRepo.put(icuLog);
    const before = { planned: await PlannedSessionsRepo.getAll(), logs: await SessionLogsRepo.getAll(), leave: (await SettingsRepo.get()).leavePeriods };

    const port = fake({
      workouts: [
        // Dezelfde loop als het log uit intervals.icu, twee minuten later begonnen.
        workout('dup', 18, 7, 41),
        // Een wandeling in de vakantie, en de bergtocht van de tocht.
        workout('v1', 20, 10, 60, 'walking'),
        workout('t1', 21, 8, 240, 'hiking'),
      ],
    });
    await enableHealthConnect({ port, now: NOW });

    expect(await PlannedSessionsRepo.getAll()).toEqual(before.planned);
    expect(await SessionLogsRepo.getAll()).toEqual(before.logs);
    expect((await SettingsRepo.get()).leavePeriods).toEqual(before.leave);

    const state = await getHealthConnectState();
    const offered = offeredActivities([], state.activities, before.logs);
    expect(offered.map((a: ExternalActivity) => a.externalId)).toEqual(['health-connect:v1', 'health-connect:t1']);
    const proposals = pendingProposals(offered, [], before.planned, templates, before.logs);
    const byId = new Map(proposals.map((p) => [p.activity.externalId, p]));
    // De tochtdag: het voorstel hoort bij de geplande bergtocht van de tocht.
    expect(byId.get('health-connect:t1')?.match?.session.id).toBe('ps-trek');
    // De vakantie: niets gepland, dus een losse training zonder geplande sessie.
    expect(byId.get('health-connect:v1')?.match).toBeUndefined();
    expect(byId.get('health-connect:v1')?.template).toBeDefined();
  });

  it('uitzetten laat de logs staan; de ochtenden blijven alleen als ze in de back-up meegaan', async () => {
    await SessionLogsRepo.put({ ...icuLog, id: 'log-hc', externalId: 'health-connect:w1', source: 'health-connect' });
    await enableHealthConnect({ port: fake({ workouts: [workout('w2', 21, 7, 40)], samples: { restingHeartRate: [rhr(21, 50)] } }), now: NOW });
    await disableHealthConnect();
    expect((await SessionLogsRepo.getAll()).map((l) => l.id)).toEqual(['log-hc']);
    const state = await getHealthConnectState();
    expect([state.enabled, state.activities.length]).toEqual([false, 0]);
    expect((await RecoveryMetricsRepo.getAll()).map((m) => m.id)).toEqual(['health-connect:2026-10-21']);

    await SettingsRepo.set({ morningInBackup: false });
    await enableHealthConnect({ port: fake({ samples: { restingHeartRate: [rhr(21, 50)] } }), now: NOW });
    await disableHealthConnect();
    expect(await RecoveryMetricsRepo.getAll()).toEqual([]);
  });
});

describe('de ochtenden naast die van intervals.icu', () => {
  it('intervals.icu gaat voor; Health Connect vult aan waar intervals.icu niets heeft', async () => {
    await RecoveryMetricsRepo.putAll([{ id: 'intervals.icu:2026-10-21', date: '2026-10-21', source: 'import', restingHeartRate: 46 }]);
    await enableHealthConnect({ port: fake({ samples: { restingHeartRate: [rhr(21, 50), rhr(20, 51)] } }), now: NOW });
    const list = await getRecoveryMetrics();
    expect(list.map((m) => m.id)).toEqual(['intervals.icu:2026-10-21', 'health-connect:2026-10-20', 'health-connect:2026-10-21']);
    expect(list.find((m) => m.date === '2026-10-21')?.restingHeartRate).toBe(46);
  });
});

describe('de back-up', () => {
  it('de stand van Health Connect gaat niet mee; een ochtend van Health Connect wel, als gewone ochtend', async () => {
    await enableHealthConnect({ port: fake({ workouts: [workout('w1', 21, 7, 40)], samples: { restingHeartRate: [rhr(21, 50)] } }), now: NOW });
    const envelope = await buildBackupEnvelope();
    expect(JSON.stringify(envelope)).not.toContain('"healthConnect"');
    expect(JSON.stringify(envelope)).not.toContain('health-connect:w1');
    expect((envelope.payload as { mornings?: RecoveryMetric[] }).mornings).toEqual([{ id: 'health-connect:2026-10-21', date: '2026-10-21', source: 'health-connect', restingHeartRate: 50 }]);
  });

  it('een oudere of beschadigde stand op het toestel leest als uit', () => {
    expect(migrateHealthConnectState(undefined)).toEqual({ enabled: false, granted: [], activities: [] });
    expect(migrateHealthConnectState({ enabled: 'ja', granted: ['sleep', 'weight'], fetchedAt: 'kapot', lastError: { kind: 'onbekend', message: 'x' }, activities: [{ externalId: 'intervals.icu:i1', start: '2026-10-20T07:00:00', durationSec: 60, kind: 'run' }, null] })).toEqual({ enabled: false, granted: ['sleep'], activities: [] });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MetaRepo, RecoveryMetricsRepo, SettingsRepo, wipeAllData } from './database';
import { applyImportPlan, createImportPlan, createPreImportSnapshot, listSnapshots } from './backupApply';
import { buildBackupEnvelope } from './backupExport';
import { buildImportPreview } from './backupPreview';
import { defaultActionsForMode, defaultPlanPolicyForMode } from './backupMerge';
import { normalizeBackupToCurrentModel } from './backupNormalize';
import { clearConnection, saveConnection } from './externalActivities';
import { clearWellness, getRecoveryMetrics, syncWellness, tidyDoubleMornings } from './wellness';
import { archivedMornings } from './morningArchive';
import { missingBootSteps, runBootMigrations } from './bootMigrations';
import { BOOT_MIGRATIONS } from '../engine/bootWatch';
import { dayRecord } from '../engine/wellnessCheck';
import type { RecoveryMetric } from '../models/metrics';
import { addDays } from '../utils/dates';

// I-84, docs/beslissingen/2026-11-20-ochtend-dubbel.md. Nagemaakte ochtenden en een nagemaakte oude
// back-up (ochtenden zonder id), geen echte persoon.

const TODAY = '2026-11-20';
const CONNECTION = { athleteId: 'i12345', apiKey: 'nagemaakte-sleutel-0123' };

const fetched = (date: string, extra: Partial<RecoveryMetric> = {}): RecoveryMetric => ({ id: `intervals.icu:${date}`, date, source: 'import', restingHeartRate: 50, hrv: 60, sleepMinutes: 440, sleepScore: 82, ...extra });
const sourceless = (date: string, extra: Partial<RecoveryMetric> = {}): RecoveryMetric => ({ id: `import:${date}`, date, source: 'import', restingHeartRate: 58, sleepMinutes: 300, ...extra });
// Zoals een oud bestand ze had: zonder id, zonder bron.
const oldRow = (date: string, numbers: Partial<RecoveryMetric> = { restingHeartRate: 58, sleepMinutes: 300 }) => ({ date, ...numbers });

async function oldBackup(mornings: unknown[]) {
  const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
  envelope.payload.mornings = mornings;
  return envelope;
}

async function planFor(payload: unknown) {
  const backup = normalizeBackupToCurrentModel(payload);
  const selections = { ...defaultActionsForMode('full_restore'), app_settings: 'replace' as const };
  const policy = defaultPlanPolicyForMode('full_restore');
  const preview = await buildImportPreview(backup, selections, policy);
  const snapshot = await createPreImportSnapshot();
  return { backup, plan: createImportPlan(backup, 'full_restore', selections, policy, preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id) };
}

async function importEnvelope(payload: unknown) {
  const { backup, plan } = await planFor(payload);
  await applyImportPlan(backup, plan);
}

// Het antwoord van intervals.icu op de vraag naar de ochtenden.
const wellnessFetch = (rows: unknown[], status = 200) => vi.fn(async () => new Response(JSON.stringify(rows), { status })) as unknown as typeof fetch;
const row = (date: string, extra: Record<string, unknown> = {}) => ({ id: date, restingHR: 50, hrv: 60, sleepSecs: 440 * 60, sleepScore: 82, ...extra });

const stored = async () => (await RecoveryMetricsRepo.getAll()).map((m) => m.id).sort();

beforeEach(async () => {
  await wipeAllData();
});

describe('een oude back-up zonder id per ochtend', () => {
  it('nagespeeld: naast een opgehaalde ochtend komt er geen tweede, en de dag toont de opgehaalde', async () => {
    // Voor I-84 stonden hier import:2026-11-10 en intervals.icu:2026-11-10, en toonde de dag een
    // mengsel: rusthartslag 58 en slaap 300 uit het bestand, HRV 60 en score 82 van het horloge.
    await RecoveryMetricsRepo.putAll([fetched('2026-11-10')]);
    await importEnvelope(await oldBackup([oldRow('2026-11-10')]));
    const all = await getRecoveryMetrics();
    expect(all.map((m) => m.id)).toEqual(['intervals.icu:2026-11-10']);
    expect(dayRecord('2026-11-10', all)).toEqual(fetched('2026-11-10'));
  });

  it('blijft importeerbaar: op een leeg toestel komen de ochtenden terug als ochtend zonder bron', async () => {
    const envelope = await oldBackup([oldRow('2026-11-10'), oldRow('2026-11-11')]);
    await wipeAllData();
    await importEnvelope(envelope);
    expect(await stored()).toEqual(['import:2026-11-10', 'import:2026-11-11']);
    expect(dayRecord('2026-11-10', await getRecoveryMetrics())).toMatchObject({ restingHeartRate: 58, sleepMinutes: 300 });
  });

  it('een getal dat alleen het bestand heeft gaat niet verloren, en de opgehaalde ochtend leest voor', async () => {
    await RecoveryMetricsRepo.putAll([fetched('2026-11-10', { hrv: undefined })]);
    await importEnvelope(await oldBackup([oldRow('2026-11-10', { restingHeartRate: 58, hrv: 71 })]));
    const all = await getRecoveryMetrics();
    expect(all.map((m) => m.id)).toEqual(['intervals.icu:2026-11-10', 'import:2026-11-10']);
    // Eén ochtend op het scherm: de rusthartslag van het horloge, de HRV uit het bestand.
    expect(dayRecord('2026-11-10', all)).toMatchObject({ id: 'intervals.icu:2026-11-10', restingHeartRate: 50, hrv: 71 });
  });

  it('een fout halverwege de import: niets geschreven, de kopie voor Ongedaan maken blijft', async () => {
    await RecoveryMetricsRepo.putAll([fetched('2026-11-10'), sourceless('2026-11-09')]);
    const before = await RecoveryMetricsRepo.getAll();
    const { backup, plan } = await planFor(await oldBackup([oldRow('2026-11-08'), oldRow('2026-11-07')]));
    // De tweede ochtend kan niet opgeslagen worden; de eerste staat dan al in de rij.
    (backup.mornings![1] as unknown as Record<string, unknown>).hrv = () => 'geen kloon';
    await expect(applyImportPlan(backup, plan)).rejects.toThrow();
    expect(await RecoveryMetricsRepo.getAll()).toEqual(before);
    expect((await listSnapshots()).map((s) => s.id)).toContain(plan.preImportSnapshotId);
  });
});

describe('ophalen na een oude back-up', () => {
  it('de dag zelf: de ochtend van vandaag uit het bestand wijkt voor die van het horloge', async () => {
    await importEnvelope(await oldBackup([oldRow(TODAY)]));
    expect(await stored()).toEqual([`import:${TODAY}`]);
    const result = await syncWellness(CONNECTION, { fetchImpl: wellnessFetch([row(TODAY)]), today: TODAY });
    expect(result).toEqual({ status: 'ok', days: 1, today: true });
    const all = await getRecoveryMetrics();
    expect(all.map((m) => m.id)).toEqual([`intervals.icu:${TODAY}`]);
    expect(dayRecord(TODAY, all)).toMatchObject({ restingHeartRate: 50, sleepMinutes: 440 });
  });

  it('de dag zelf, horloge nog zonder slaap: het getal uit het bestand vult aan tot het horloge het heeft', async () => {
    await RecoveryMetricsRepo.putAll([sourceless(TODAY)]);
    await syncWellness(CONNECTION, { fetchImpl: wellnessFetch([row(TODAY, { sleepSecs: undefined, sleepScore: undefined })]), today: TODAY });
    expect(dayRecord(TODAY, await getRecoveryMetrics())).toMatchObject({ id: `intervals.icu:${TODAY}`, restingHeartRate: 50, sleepMinutes: 300 });
    await syncWellness(CONNECTION, { fetchImpl: wellnessFetch([row(TODAY)]), today: TODAY });
    expect(await stored()).toEqual([`intervals.icu:${TODAY}`]);
  });

  it('een rij ochtenden in een vakantie: per dag één, ook waar het horloge niets gaf', async () => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(TODAY, -8 + i));
    await importEnvelope(await oldBackup(days.map((d) => oldRow(d))));
    // Het horloge lag drie dagen thuis: daarvan geeft de bron niets.
    const given = [days[0], days[1], days[5], days[6]];
    await syncWellness(CONNECTION, { fetchImpl: wellnessFetch(given.map((d) => row(d))), today: TODAY });
    const all = await getRecoveryMetrics();
    expect(all).toHaveLength(7);
    expect(new Set(all.map((m) => m.date)).size).toBe(7);
    for (const d of days) expect(dayRecord(d, all)!.id).toBe(given.includes(d) ? `intervals.icu:${d}` : `import:${d}`);
  });

  it.each([
    ['een verlopen sleutel', () => wellnessFetch([], 401)],
    ['een bron die tijdelijk stuk is', () => wellnessFetch([], 500)],
    ['geen netwerk', () => vi.fn(async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch],
    ['een antwoord dat geen lijst is', () => vi.fn(async () => new Response('<html>storing</html>', { status: 200 })) as unknown as typeof fetch],
  ])('%s haalt nooit iets weg', async (_name, makeFetch) => {
    await RecoveryMetricsRepo.putAll([sourceless(TODAY), sourceless(addDays(TODAY, -1), { hrv: 66 }), fetched(addDays(TODAY, -1), { hrv: undefined })]);
    const before = await RecoveryMetricsRepo.getAll();
    const result = await syncWellness(CONNECTION, { fetchImpl: makeFetch(), today: TODAY });
    expect(result.status).toBe('error');
    expect(await RecoveryMetricsRepo.getAll()).toEqual(before);
  });

  it('een ronde zonder ochtenden (de bron geeft een lege lijst) haalt niets weg', async () => {
    await RecoveryMetricsRepo.putAll([sourceless(TODAY), sourceless(addDays(TODAY, -1))]);
    const result = await syncWellness(CONNECTION, { fetchImpl: wellnessFetch([]), today: TODAY });
    expect(result).toEqual({ status: 'ok', days: 0, today: false });
    expect(await stored()).toEqual([`import:${addDays(TODAY, -1)}`, `import:${TODAY}`]);
  });
});

describe('een dubbele ochtend die al in de opslag zit', () => {
  const seed = () => RecoveryMetricsRepo.putAll([
    sourceless('2026-11-10'), fetched('2026-11-10'),
    sourceless('2026-11-11', { hrv: 66 }), fetched('2026-11-11', { hrv: undefined }),
    sourceless('2026-11-12'),
    { id: 'manual:2026-11-13', date: '2026-11-13', source: 'manual', restingHeartRate: 49 }, fetched('2026-11-13'),
    sourceless('2026-11-14'), { id: 'health-connect:2026-11-14', date: '2026-11-14', source: 'health-connect', restingHeartRate: 52, sleepMinutes: 400 },
  ]);
  const after = ['health-connect:2026-11-14', 'import:2026-11-11', 'import:2026-11-12', 'intervals.icu:2026-11-10', 'intervals.icu:2026-11-11', 'intervals.icu:2026-11-13', 'manual:2026-11-13'];

  it('gaat bij het openen weg, één keer, en alleen waar hij niets toevoegt', async () => {
    await seed();
    expect(BOOT_MIGRATIONS.map((m) => m.id)).toContain('tidyDoubleMornings');
    expect(missingBootSteps()).toEqual([]);
    await runBootMigrations({ build: 'test-1' });
    expect(await stored()).toEqual(after);
    // Een tweede start leest of schrijft hier niets meer.
    await RecoveryMetricsRepo.putAll([sourceless('2026-11-10')]);
    await runBootMigrations({ build: 'test-1' });
    expect(await stored()).toContain('import:2026-11-10');
    // Een nieuwe versie van de app kijkt opnieuw.
    await runBootMigrations({ build: 'test-2' });
    expect(await stored()).toEqual(after);
  });

  it('de stap zelf: zegt hoeveel er weggingen en doet daarna niets meer', async () => {
    await seed();
    expect(await tidyDoubleMornings()).toBe(2);
    expect(await tidyDoubleMornings()).toBe(0);
    expect(await stored()).toEqual(after);
  });
});

describe('ontkoppelen', () => {
  const manual: RecoveryMetric = { id: 'manual:2026-11-12', date: '2026-11-12', source: 'manual', restingHeartRate: 49, hrv: 70 };
  const health: RecoveryMetric = { id: 'health-connect:2026-11-13', date: '2026-11-13', source: 'health-connect', sleepMinutes: 400 };
  const seed = () => RecoveryMetricsRepo.putAll([
    fetched('2026-11-10', { bodyBattery: 60 }), sourceless('2026-11-10'),
    sourceless('2026-11-11'),
    manual, sourceless('2026-11-12', { sleepMinutes: undefined }),
    health,
  ]);

  it('met "Ochtendgetallen in back-up" aan: per dag één ochtend, niets wat je zelf invulde weg', async () => {
    await seed();
    await clearWellness();
    expect(await stored()).toEqual(['health-connect:2026-11-13', 'import:2026-11-11', 'intervals.icu:2026-11-10', 'manual:2026-11-12']);
    const all = await RecoveryMetricsRepo.getAll();
    expect(all.find((m) => m.id === 'intervals.icu:2026-11-10')!.bodyBattery).toBeUndefined();
    expect(all.find((m) => m.id === manual.id)).toEqual(manual);
  });

  it('met die instelling uit: ook de ochtenden zonder bron gaan weg, met de hand ingevuld blijft', async () => {
    await SettingsRepo.set({ morningInBackup: false });
    await seed();
    await clearWellness();
    expect(await stored()).toEqual(['health-connect:2026-11-13', 'manual:2026-11-12']);
    expect((await RecoveryMetricsRepo.getAll()).find((m) => m.id === manual.id)).toEqual(manual);
  });

  it('via de knop Ontkoppelen (clearConnection) loopt dezelfde weg', async () => {
    await SettingsRepo.set({ morningInBackup: false });
    await saveConnection(CONNECTION);
    await seed();
    await clearConnection();
    expect(await stored()).toEqual(['health-connect:2026-11-13', 'manual:2026-11-12']);
    expect(await MetaRepo.get('wellnessCoveredFrom')).toBeUndefined();
  });

  it('"Ochtendgetallen in back-up" uitzetten zonder koppeling noemt ook de ochtenden zonder bron', async () => {
    await seed();
    const { linked, list } = await archivedMornings(TODAY);
    expect(linked).toBe(false);
    expect(list.map((m) => m.id).sort()).toEqual(['import:2026-11-10', 'import:2026-11-11', 'import:2026-11-12', 'intervals.icu:2026-11-10']);
  });
});

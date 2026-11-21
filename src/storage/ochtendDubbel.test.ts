import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MetaRepo, RecoveryMetricsRepo, SettingsRepo, wipeAllData } from './database';
import { applyImportPlan, createImportPlan, createPreImportSnapshot, listSnapshots } from './backupApply';
import { buildBackupEnvelope } from './backupExport';
import { buildImportPreview } from './backupPreview';
import { defaultActionsForMode, defaultPlanPolicyForMode } from './backupMerge';
import { normalizeBackupToCurrentModel } from './backupNormalize';
import { clearConnection, getWatchState, saveConnection, setWatchUse } from './externalActivities';
import { clearWellness, getRecoveryMetrics, syncWellness, tidyDoubleMornings } from './wellness';
import { archivedMornings } from './morningArchive';
import { missingBootSteps, runBootMigrations } from './bootMigrations';
import { BOOT_MIGRATIONS } from '../engine/bootWatch';
import { dayRecord } from '../engine/wellnessCheck';
import { filterRecovery } from '../engine/watchUse';
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

// Herstel na Warden (docs/beslissingen/2026-11-20-ochtend-zonder-bron.md): een ochtend zonder bron is
// van de gebruiker, niet van de koppeling. Hij gaat alleen weg als hij gedekt is.
describe('ontkoppelen', () => {
  const manual: RecoveryMetric = { id: 'manual:2026-11-12', date: '2026-11-12', source: 'manual', restingHeartRate: 49, hrv: 70 };
  const health: RecoveryMetric = { id: 'health-connect:2026-11-13', date: '2026-11-13', source: 'health-connect', sleepMinutes: 400 };
  const seed = () => RecoveryMetricsRepo.putAll([
    fetched('2026-11-10', { bodyBattery: 60 }), sourceless('2026-11-10'),
    sourceless('2026-11-11'),
    manual, sourceless('2026-11-12', { sleepMinutes: undefined }),
    health,
  ]);
  // De dag met een opgehaalde ochtend verliest die bij ontkoppelen; de ochtend uit het bestand blijft.
  const afterOff = ['health-connect:2026-11-13', 'import:2026-11-10', 'import:2026-11-11', 'manual:2026-11-12'];

  it('met "Ochtendgetallen in back-up" aan: de bewaarde opgehaalde ochtend dekt, de rest blijft', async () => {
    await seed();
    await clearWellness();
    expect(await stored()).toEqual(['health-connect:2026-11-13', 'import:2026-11-11', 'intervals.icu:2026-11-10', 'manual:2026-11-12']);
    const all = await RecoveryMetricsRepo.getAll();
    expect(all.find((m) => m.id === 'intervals.icu:2026-11-10')!.bodyBattery).toBeUndefined();
    expect(all.find((m) => m.id === manual.id)).toEqual(manual);
    expect(all.find((m) => m.id === 'import:2026-11-11')).toEqual(sourceless('2026-11-11'));
  });

  it('met die instelling uit: alleen de opgehaalde ochtenden gaan weg, een ochtend zonder bron blijft', async () => {
    await SettingsRepo.set({ morningInBackup: false });
    await seed();
    await clearWellness();
    // import:2026-11-12 was al gedekt door wat je met de hand invulde; dat is de enige die weggaat.
    expect(await stored()).toEqual(afterOff);
    const all = await RecoveryMetricsRepo.getAll();
    expect(all.find((m) => m.id === 'import:2026-11-10')).toEqual(sourceless('2026-11-10'));
    expect(all.find((m) => m.id === manual.id)).toEqual(manual);
  });

  it('via de knop Ontkoppelen (clearConnection) loopt dezelfde weg', async () => {
    await SettingsRepo.set({ morningInBackup: false });
    await saveConnection(CONNECTION);
    await seed();
    await clearConnection();
    expect(await stored()).toEqual(afterOff);
    expect(await MetaRepo.get('wellnessCoveredFrom')).toBeUndefined();
  });

  it('"Ochtendgetallen in back-up" uitzetten noemt nooit een ochtend zonder bron, met of zonder koppeling', async () => {
    await seed();
    await RecoveryMetricsRepo.putAll([sourceless('2025-01-10'), fetched('2025-01-10')]);
    const without = await archivedMornings(TODAY);
    expect(without.linked).toBe(false);
    expect(without.list.map((m) => m.id).sort()).toEqual(['intervals.icu:2025-01-10', 'intervals.icu:2026-11-10']);
    await saveConnection(CONNECTION);
    const linked = await archivedMornings(TODAY);
    expect(linked.linked).toBe(true);
    expect(linked.list.map((m) => m.id)).toEqual(['intervals.icu:2025-01-10']);
  });
});

describe('de grens van 400 dagen', () => {
  // 2025-01-10 ligt ruim voor de grens; de bron geeft die dag niet meer.
  const OLD = '2025-01-10';
  const seed = () => RecoveryMetricsRepo.putAll([sourceless(OLD, { hrv: 66 }), fetched(OLD, { hrv: undefined }), sourceless('2025-01-11')]);

  it('met "Ochtendgetallen in back-up" uit: de opgehaalde ochtend gaat, die zonder bron blijft zoals hij was', async () => {
    await SettingsRepo.set({ morningInBackup: false });
    await seed();
    const result = await syncWellness(CONNECTION, { fetchImpl: wellnessFetch([row(TODAY)]), today: TODAY });
    expect(result.status).toBe('ok');
    expect(await stored()).toEqual(['import:2025-01-10', 'import:2025-01-11', `intervals.icu:${TODAY}`]);
    expect((await RecoveryMetricsRepo.getAll()).find((m) => m.id === `import:${OLD}`)).toEqual(sourceless(OLD, { hrv: 66 }));
  });

  it('met die instelling aan: beide blijven, want die zonder bron heeft een getal dat de andere mist', async () => {
    await seed();
    await syncWellness(CONNECTION, { fetchImpl: wellnessFetch([row(TODAY)]), today: TODAY });
    expect(await stored()).toEqual(['import:2025-01-10', 'import:2025-01-11', 'intervals.icu:2025-01-10', `intervals.icu:${TODAY}`]);
  });
});

describe('een soort uitzetten onder "Wat ASCEND van je horloge gebruikt"', () => {
  const OLD = '2025-01-10';
  const shown = async (date: string) => dayRecord(date, filterRecovery(await getRecoveryMetrics(), (await getWatchState()).use));

  it('laat de opslag van een ochtend zonder bron gelijk, de dag toont de soort niet, en aanzetten brengt hem terug', async () => {
    const onlyHrv: RecoveryMetric = { id: `import:${OLD}`, date: OLD, source: 'import', hrv: 66 };
    const mixed = sourceless('2026-11-10', { hrv: 71 });
    await RecoveryMetricsRepo.putAll([onlyHrv, mixed, fetched('2026-11-12')]);
    await setWatchUse({ hrv: false });
    const all = await RecoveryMetricsRepo.getAll();
    expect(all.find((m) => m.id === onlyHrv.id)).toEqual(onlyHrv);
    expect(all.find((m) => m.id === mixed.id)).toEqual(mixed);
    // Wat opgehaald is verliest de soort wel in de opslag: de bron levert hem opnieuw.
    expect(all.find((m) => m.id === 'intervals.icu:2026-11-12')!.hrv).toBeUndefined();
    // Het scherm leest door het filter (useWellness, useRecoveryMetrics, useInfluence).
    expect(await shown(OLD)).toBeUndefined();
    expect(await shown('2026-11-10')).toEqual({ ...mixed, hrv: undefined });
    expect((await shown('2026-11-10'))!.hrv).toBeUndefined();
    await setWatchUse({ hrv: true });
    expect(await shown(OLD)).toEqual(onlyHrv);
    expect((await shown('2026-11-10'))!.hrv).toBe(71);
  });

  it('slaap uit: ook dan blijft de ochtend zonder bron heel in de opslag en in de back-up', async () => {
    await RecoveryMetricsRepo.putAll([sourceless('2026-11-10')]);
    await setWatchUse({ sleep: false });
    expect(await RecoveryMetricsRepo.getAll()).toEqual([sourceless('2026-11-10')]);
    expect((await shown('2026-11-10'))!.sleepMinutes).toBeUndefined();
    expect((JSON.parse(JSON.stringify(await buildBackupEnvelope())) as { payload: { mornings: unknown } }).payload.mornings).toEqual([{ id: 'import:2026-11-10', date: '2026-11-10', source: 'import', restingHeartRate: 58, sleepMinutes: 300 }]);
  });
});

// I-97: een import schrijft een ochtend zonder bron heel, ook met een soort uit. Het lezen filtert.
describe('een back-up importeren met een soort uit', () => {
  const OLD = '2025-01-10';
  const shown = async (date: string) => dayRecord(date, filterRecovery(await getRecoveryMetrics(), (await getWatchState()).use));
  const byId = async (id: string) => (await RecoveryMetricsRepo.getAll()).find((m) => m.id === id);
  const whole: RecoveryMetric = { id: `import:${OLD}`, date: OLD, source: 'import', restingHeartRate: 58, hrv: 66, sleepMinutes: 300 };

  it('een oud bestand (ochtenden zonder id): de ochtend zonder bron komt heel in de opslag, de dag toont de soort niet, aanzetten brengt hem terug', async () => {
    await setWatchUse({ hrv: false });
    await importEnvelope(await oldBackup([oldRow(OLD, { restingHeartRate: 58, hrv: 66, sleepMinutes: 300 })]));
    expect(await byId(`import:${OLD}`)).toEqual(whole);
    // Het lezen filtert: de dag heeft geen HRV zolang de soort uit staat.
    expect((await shown(OLD))!.hrv).toBeUndefined();
    expect((await shown(OLD))!.restingHeartRate).toBe(58);
    await setWatchUse({ hrv: true });
    expect(await shown(OLD)).toEqual(whole);
  });

  it('een ochtend zonder bron met alleen de uitgezette soort valt niet meer weg bij de import', async () => {
    await setWatchUse({ hrv: false });
    await importEnvelope(await oldBackup([oldRow(OLD, { hrv: 66 })]));
    expect(await stored()).toEqual([`import:${OLD}`]);
    expect(await shown(OLD)).toBeUndefined();
    await setWatchUse({ hrv: true });
    expect((await shown(OLD))!.hrv).toBe(66);
  });

  it('slaap uit: slaapduur en slaapscore blijven in de opslag en gaan weer mee in de volgende back-up', async () => {
    await setWatchUse({ sleep: false });
    await importEnvelope(await oldBackup([oldRow(OLD, { restingHeartRate: 58, sleepMinutes: 300, sleepScore: 70 })]));
    expect(await byId(`import:${OLD}`)).toEqual({ id: `import:${OLD}`, date: OLD, source: 'import', restingHeartRate: 58, sleepMinutes: 300, sleepScore: 70 });
    expect((await shown(OLD))!.sleepMinutes).toBeUndefined();
    const again = JSON.parse(JSON.stringify(await buildBackupEnvelope())) as { payload: { mornings: unknown[] } };
    expect(again.payload.mornings).toEqual([{ id: `import:${OLD}`, date: OLD, source: 'import', restingHeartRate: 58, sleepMinutes: 300, sleepScore: 70 }]);
  });

  it('een ochtend met een bron uit het bestand verliest de uitgezette soort wel: de bron levert hem opnieuw', async () => {
    await setWatchUse({ hrv: false });
    await importEnvelope(await oldBackup([fetched('2026-11-12'), { id: 'intervals.icu:2026-11-13', date: '2026-11-13', source: 'import', hrv: 61 }, oldRow(OLD, { hrv: 66 })]));
    expect((await byId('intervals.icu:2026-11-12'))!.hrv).toBeUndefined();
    expect((await byId('intervals.icu:2026-11-12'))!.restingHeartRate).toBe(50);
    // Alleen de uitgezette soort: die ochtend met een bron komt niet, die zonder bron wel.
    expect(await stored()).toEqual([`import:${OLD}`, 'intervals.icu:2026-11-12']);
  });

  it('de dag zelf: een ochtend zonder bron van vandaag komt heel, en een opgehaalde van vandaag gaat bij het lezen voor', async () => {
    await RecoveryMetricsRepo.putAll([fetched(TODAY, { sleepMinutes: undefined, sleepScore: undefined, hrv: undefined })]);
    await setWatchUse({ hrv: false });
    await importEnvelope(await oldBackup([oldRow(TODAY, { restingHeartRate: 58, hrv: 66 })]));
    // Hij heeft een getal (HRV) dat de opgehaalde mist, dus hij blijft als aanvulling, heel.
    expect(await byId(`import:${TODAY}`)).toEqual({ id: `import:${TODAY}`, date: TODAY, source: 'import', restingHeartRate: 58, hrv: 66 });
    expect((await shown(TODAY))!.restingHeartRate).toBe(50);
    expect((await shown(TODAY))!.hrv).toBeUndefined();
  });

  it('een fout halverwege: geen ochtend geschreven, de kopie van voor de import blijft', async () => {
    await setWatchUse({ hrv: false });
    await RecoveryMetricsRepo.putAll([sourceless('2026-11-10')]);
    const { backup, plan } = await planFor(await oldBackup([oldRow(OLD, { hrv: 66 })]));
    (backup.mornings![0] as unknown as Record<string, unknown>).note = () => 'geen kloon';
    await expect(applyImportPlan(backup, plan)).rejects.toThrow('Er is niets gewijzigd');
    expect(await RecoveryMetricsRepo.getAll()).toEqual([sourceless('2026-11-10')]);
    expect((await getWatchState()).use.hrv).toBe(false);
    expect((await listSnapshots()).some((s) => s.id === plan.preImportSnapshotId)).toBe(true);
  });
});

describe('opruimen in één transactie', () => {
  it('leest en wist niet in twee losse stappen', async () => {
    await RecoveryMetricsRepo.putAll([sourceless('2026-11-10'), fetched('2026-11-10'), sourceless('2026-11-11')]);
    const read = vi.spyOn(RecoveryMetricsRepo, 'getAll');
    const wipe = vi.spyOn(RecoveryMetricsRepo, 'deleteMany');
    try {
      expect(await tidyDoubleMornings()).toBe(1);
      expect(read).not.toHaveBeenCalled();
      expect(wipe).not.toHaveBeenCalled();
    } finally {
      read.mockRestore();
      wipe.mockRestore();
    }
    expect(await stored()).toEqual(['import:2026-11-11', 'intervals.icu:2026-11-10']);
  });
});

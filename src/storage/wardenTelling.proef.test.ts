// Proeftests van Warden bij claude/backup-telling (74b5f18). Nagemaakte gegevens. Elke test is groen op de
// branch en legt vast wat de code NU doet; waar dat een bevinding is staat het erbij (B = bevinding).
import { beforeEach, describe, expect, it } from 'vitest';
import { PlannedSessionsRepo, SessionLogsRepo, SettingsRepo, wipeAllData, resetToDemoData } from './database';
import { buildBackupEnvelope } from './backupExport';
import { normalizeBackupToCurrentModel } from './backupNormalize';
import { buildImportPreview } from './backupPreview';
import { applyImportPlan, createImportPlan, createPreImportSnapshot, restoreSnapshot } from './backupApply';
import { defaultActionsForMode, defaultPlanPolicyForMode } from './backupMerge';
import { backupMadeSettings, logsNotInLastBackup, readLastBackupLogs } from '../engine/backupSince';
import { forgetAutoBackupFolder, forgetHalfWritten, readAutoBackupState, runAutoBackupIfDue } from './autoBackup';
import { forgetManualBackupAttempts, saveManualBackup } from './manualBackup';
import { isAttemptRest, newAttemptId, writeThroughTemp, type AppBackupFolder, type AutoBackupTarget, type TempFs } from '../integrations/backupFolder';
import { manualBackupName } from '../engine/manualBackup';
import type { PlannedSession, SessionLog } from '../models/training';

const log = (id: string, completedAt: string): SessionLog => ({
  id, templateId: 'tpl', type: 'cardio', completedDate: completedAt.slice(0, 10), completedAt, variant: 'full', durationMinutes: 40, source: 'manual',
});
const count = async () => logsNotInLastBackup(await SessionLogsRepo.getAll(), await SettingsRepo.get());

async function restore(payload: unknown, mode: 'full_restore' | 'merge' = 'full_restore') {
  const backup = normalizeBackupToCurrentModel(payload);
  const categorySelections = defaultActionsForMode(mode);
  const planPolicy = defaultPlanPolicyForMode(mode);
  const preview = await buildImportPreview(backup, categorySelections, planPolicy);
  const snapshot = await createPreImportSnapshot();
  const plan = createImportPlan(backup, mode, categorySelections, planPolicy, preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id);
  await applyImportPlan(backup, plan);
  return snapshot;
}
// Een gewone back-up zoals de app hem maakt, met daarna Laatste back-up bijgewerkt.
async function makeBackup(at: string) {
  const envelope = await buildBackupEnvelope();
  const ids = (envelope.payload as { sessionLogs: { id: string }[] }).sessionLogs.map((l) => l.id);
  await SettingsRepo.set(backupMadeSettings(at, ids));
  return JSON.parse(JSON.stringify(envelope)) as unknown;
}

describe('proef: de telling (I-55)', () => {
  beforeEach(async () => { await wipeAllData(); });

  it('in beeld: een Forge-log van gisteren, bewaard na de back-up van vandaag, telt mee', () => {
    const s = backupMadeSettings('2026-11-15T19:00:00.000Z', ['a']);
    expect(logsNotInLastBackup([log('a', '2026-11-14T10:00:00.000Z'), log('forge', '2026-11-14T18:00:00.000Z')], s)).toBe(1);
  });

  it('weg: een log uit de lijst dat van het toestel verdween geeft nul, nooit een negatief getal', () => {
    expect(logsNotInLastBackup([], backupMadeSettings('2026-11-15T19:00:00.000Z', ['a', 'b']))).toBe(0);
  });

  it('kapot veld: elke vorm die geen { at, ids[] } is valt terug op completedAt', () => {
    const logs = [log('a', '2026-11-14T10:00:00.000Z'), log('b', '2026-11-16T10:00:00.000Z')];
    for (const kapot of [null, 'x', 7, [], {}, { at: 5, ids: [] }, { at: '2026-11-15T19:00:00.000Z', ids: 'a' }, { at: '2026-11-15T19:00:00.000Z' }]) {
      expect(readLastBackupLogs(kapot)).toBeUndefined();
      expect(logsNotInLastBackup(logs, { lastExportedAt: '2026-11-15T19:00:00.000Z', lastBackupLogs: kapot })).toBe(1);
    }
    // Het tijdstip klopt maar de ids zijn geen teksten: alles telt als "niet in de back-up" (te veel, nooit te weinig).
    expect(logsNotInLastBackup(logs, { lastExportedAt: '2026-11-15T19:00:00.000Z', lastBackupLogs: { at: '2026-11-15T19:00:00.000Z', ids: [1, 2] } })).toBe(2);
  });

  it('grootte: het veld groeit met het aantal logs, zonder grens; gemeten bij 5000 en 20000', () => {
    const ids = (n: number) => Array.from({ length: n }, (_, i) => `log_${(1_700_000_000_000 + i).toString(36)}_${i.toString(36).padStart(6, '0')}`);
    const size = (n: number) => JSON.stringify(backupMadeSettings('2026-11-15T19:00:00.000Z', ids(n)).lastBackupLogs).length;
    const s5 = size(5000);
    const s20 = size(20000);
    console.log(`lastBackupLogs: 5000 logs = ${s5} tekens, 20000 logs = ${s20} tekens`);
    expect(s20).toBeGreaterThan(3.5 * s5);
    const logs = ids(20000).map((id) => ({ id, completedAt: '2026-11-01T10:00:00.000Z' }));
    const s = backupMadeSettings('2026-11-15T19:00:00.000Z', ids(20000));
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) logsNotInLastBackup(logs, s);
    console.log(`logsNotInLastBackup bij 20000 logs: ${((performance.now() - t0) / 20).toFixed(2)} ms per aanroep (staat in de render van Vandaag, zonder useMemo)`);
  });

  it('B1 lek: de kopie van voor een import neemt het veld mee, en die kopie is te downloaden (GegevensSheets.tsx#download)', async () => {
    await SessionLogsRepo.put(log('a', '2026-11-14T10:00:00.000Z'));
    await makeBackup('2026-11-15T19:00:00.000Z');
    const snap = await createPreImportSnapshot();
    // Dit is letterlijk wat download() in een bestand zet.
    const bestand = JSON.parse(JSON.stringify(snap.envelope)) as { payload: { settings: { lastBackupLogs?: unknown } } };
    expect(bestand.payload.settings.lastBackupLogs).toEqual({ at: '2026-11-15T19:00:00.000Z', ids: ['a'] });
    // Op een ander (leeg) toestel teruggezet komt de lijst van het eerste toestel mee.
    await wipeAllData();
    await restore(bestand);
    expect((await SettingsRepo.get()).lastBackupLogs).toEqual({ at: '2026-11-15T19:00:00.000Z', ids: ['a'] });
  });

  it('Alles verwijderen: het veld is weg en de telling is nul', async () => {
    await SessionLogsRepo.put(log('a', '2026-11-14T10:00:00.000Z'));
    await makeBackup('2026-11-15T19:00:00.000Z');
    await resetToDemoData();
    const s = await SettingsRepo.get();
    expect(s.lastBackupLogs).toBeUndefined();
    expect(s.lastExportedAt).toBeUndefined();
    expect(await count()).toBe(0);
  });

  it('B2 na een import van je eigen back-up: Laatste back-up springt terug naar het tijdstip IN het bestand en de telling valt terug op tijd; het Forge-log van I-55 telt dan weer niet', async () => {
    await SessionLogsRepo.put(log('a', '2026-11-01T10:00:00.000Z'));
    await makeBackup('2026-11-08T19:00:00.000Z');
    await SessionLogsRepo.put(log('b', '2026-11-10T10:00:00.000Z'));
    const bestand = await makeBackup('2026-11-15T19:00:00.000Z'); // bevat a en b; in het bestand staat lastExportedAt 8 november
    expect(await count()).toBe(0);
    // Forge-training van 7 november (laatste set), pas na de back-up van 15 november afgerond.
    await SessionLogsRepo.put(log('forge', '2026-11-07T18:00:00.000Z'));
    expect(await count()).toBe(1); // goed: op id
    await restore(bestand, 'merge');
    const s = await SettingsRepo.get();
    console.log('na import (merge):', s.lastExportedAt, JSON.stringify(s.lastBackupLogs), 'telling', await count());
    await restore(bestand, 'full_restore');
    const s2 = await SettingsRepo.get();
    console.log('na import (full_restore):', s2.lastExportedAt, JSON.stringify(s2.lastBackupLogs), 'telling', await count());
    expect(s2.lastExportedAt).toBe('2026-11-08T19:00:00.000Z');
    expect(s2.lastBackupLogs?.at).toBe('2026-11-15T19:00:00.000Z');
    // Op tijd vanaf 8 november: b (10 nov) telt, terwijl b in de back-up van 15 november staat; forge (7 nov) telt
    // niet, terwijl forge in geen enkele back-up staat. Eerlijk is 1 (forge); de app zegt 1 (b): het verkeerde log.
    const logs = await SessionLogsRepo.getAll();
    expect(logs.filter((l) => l.completedAt > s2.lastExportedAt!).map((l) => l.id)).toEqual(['b']);
    expect(await count()).toBe(1);
  });

  it('Terugzetten van een kopie: tijdstip en lijst komen samen terug; wat daarna is bewaard telt weer mee (te veel, nooit te weinig)', async () => {
    await SessionLogsRepo.put(log('a', '2026-11-01T10:00:00.000Z'));
    const bestand = await makeBackup('2026-11-08T19:00:00.000Z');
    const kopie = await restore(bestand); // de kopie van voor deze import: 8 november met [a]
    await SettingsRepo.set(backupMadeSettings('2026-11-08T19:00:00.000Z', ['a']));
    await SessionLogsRepo.put(log('b', '2026-11-10T10:00:00.000Z'));
    await makeBackup('2026-11-15T19:00:00.000Z');
    expect(await count()).toBe(0);
    await restoreSnapshot(kopie.id);
    const s = await SettingsRepo.get();
    expect(s.lastBackupLogs).toEqual({ at: '2026-11-08T19:00:00.000Z', ids: ['a'] });
    expect(s.lastExportedAt).toBe('2026-11-08T19:00:00.000Z');
    expect((await SessionLogsRepo.getAll()).map((l) => l.id).sort()).toEqual(['a', 'b']);
    expect(await count()).toBe(1);
  });
});

// ---- I-50 ------------------------------------------------------------------------------------

const session: PlannedSession = { id: 'ps_a', templateId: 'tpl_easy_run', scheduledDate: '2026-11-03', weekStartDate: '2026-11-02', status: 'planned', order: 0 };
const MONDAY = new Date(2026, 10, 2, 8, 0);
const AUTO = 'ascend-2026-11-02.ascend-backup.json';

// Een map die schrijft zoals de Android-map: via writeThroughTemp op een geheugen-fs.
function tempTarget(files = new Map<string, string>()) {
  let gate: Promise<void> | undefined;
  let open: (() => void) | undefined;
  const fs: TempFs = {
    exists: async (n) => files.has(n),
    writeFile: async (n, t) => { if (gate) await gate; files.set(n, t); },
    // Zoals de plugin: het doel gaat eerst weg.
    rename: async (from, to) => { if (!files.has(from)) throw new Error('File does not exist'); files.set(to, files.get(from)!); files.delete(from); },
    remove: async (n) => { files.delete(n); },
    holds: async (n, t) => (!files.has(n) ? 'absent' : files.get(n) === t ? 'same' : 'different'),
    pauseMs: 0,
  };
  const target: AutoBackupTarget = {
    platform: 'app',
    access: async () => 'ready',
    where: async () => ({ kind: 'folder', label: 'Documenten > ASCEND' }),
    exists: fs.exists,
    write: (n, t, id, opts) => writeThroughTemp(fs, n, t, id, opts),
    tidy: async (n) => { for (const f of [...files.keys()]) if (isAttemptRest(f, n)) files.delete(f); },
    verify: async (n, bytes) => (!files.has(n) ? 'unknown' : new TextEncoder().encode(files.get(n)!).length === bytes ? 'ok' : 'broken'),
    remove: async (n) => { files.delete(n); },
    installId: async () => 'installatie-a',
  };
  return { target, files, hang: () => { gate = new Promise((r) => { open = r; }); }, release: () => { const o = open; gate = undefined; open = undefined; o?.(); } };
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('proef: een laat antwoord (I-50), automatisch', () => {
  beforeEach(async () => { forgetHalfWritten(); await wipeAllData(); await PlannedSessionsRepo.put(session); });

  it('laat antwoord voor de tweede poging, via de echte schrijflaag: een bestand, geen -2, geen rest, niets weg', async () => {
    const t = tempTarget();
    t.hang();
    expect(await runAutoBackupIfDue({ now: MONDAY, target: t.target, timeoutMs: 20, verifyPauseMs: 0 })).toBe('failed');
    t.release();
    await wait(30);
    expect([...t.files.keys()]).toEqual([AUTO]);
    expect(await runAutoBackupIfDue({ now: new Date(MONDAY.getTime() + 2 * 3_600_000), target: t.target, verifyPauseMs: 0 })).toBe('saved');
    expect([...t.files.keys()]).toEqual([AUTO]);
    expect((await readAutoBackupState()).files).toEqual([AUTO]);
  });

  it('een vreemd bestand en een eigen woord blijven staan na een gelukte back-up met opruimen', async () => {
    const vreemd = [`${AUTO}.mijnkopie12345678.old`, `${AUTO}.old`, `${AUTO}.zondagavond22.tmp`, 'notities.txt', 'ascend-2026-11-01.ascend-backup.json'];
    const t = tempTarget(new Map(vreemd.map((n) => [n, 'van jou'])));
    t.files.set(`${AUTO}.${newAttemptId(MONDAY)}.tmp`, 'rest');
    expect(await runAutoBackupIfDue({ now: MONDAY, target: t.target, verifyPauseMs: 0 })).toBe('saved');
    expect([...t.files.keys()].sort()).toEqual([...vreemd, AUTO].sort());
    for (const n of vreemd) expect(t.files.get(n)).toBe('van jou');
  });

  it('B3 laat antwoord NA de tweede poging: de oude schrijfactie zet haar oudere tekst over de nieuwe back-up; de nieuwe staat alleen nog als .old en de telling zegt nul', async () => {
    await SessionLogsRepo.put(log('a', '2026-11-01T10:00:00.000Z'));
    const t = tempTarget();
    t.hang();
    expect(await runAutoBackupIfDue({ now: MONDAY, target: t.target, timeoutMs: 20, verifyPauseMs: 0 })).toBe('failed');
    // Tussen de twee pogingen train je.
    await SessionLogsRepo.put(log('b', '2026-11-02T09:00:00.000Z'));
    // De tweede poging schrijft zonder haperen (de eerste hangt nog in writeFile van haar eigen tijdelijke bestand).
    const t2 = { ...t.target, write: ((n, text, id, opts) => { return writeThroughTemp({ exists: async (x) => t.files.has(x), writeFile: async (x, y) => { t.files.set(x, y); }, rename: async (f, to) => { t.files.set(to, t.files.get(f)!); t.files.delete(f); }, remove: async (x) => { t.files.delete(x); }, holds: async (x, y) => (!t.files.has(x) ? 'absent' : t.files.get(x) === y ? 'same' : 'different'), pauseMs: 0 }, n, text, id, opts); }) as AutoBackupTarget['write'] };
    expect(await runAutoBackupIfDue({ now: new Date(MONDAY.getTime() + 2 * 3_600_000), target: t2, verifyPauseMs: 0 })).toBe('saved');
    expect([...t.files.keys()]).toEqual([AUTO]);
    expect(t.files.get(AUTO)).toContain('"id": "b"');
    expect(await count()).toBe(0);
    // Nu antwoordt de telefoon alsnog op de eerste schrijfactie.
    t.release();
    await wait(30);
    const names = [...t.files.keys()].sort();
    console.log('B3 na het late antwoord:', names);
    // Onder de echte naam staat nu de OUDE tekst, zonder training b.
    expect(t.files.get(AUTO)).not.toContain('"id": "b"');
    // De goede, nieuwere back-up staat er alleen nog als rest (.old), die de volgende opruimbeurt weghaalt.
    const old = names.find((n) => n.endsWith('.old'));
    expect(old && isAttemptRest(old, AUTO)).toBe(true);
    expect(t.files.get(old!)).toContain('"id": "b"');
    // En de app zegt: niets sinds je laatste back-up.
    expect(await count()).toBe(0);
  });

  it('B4 een andere map gekozen na een time-out: de onthouden naam verhuist mee en de app schrijft over een vreemd bestand met die naam', async () => {
    const a = tempTarget();
    a.hang();
    expect(await runAutoBackupIfDue({ now: MONDAY, target: a.target, timeoutMs: 20, verifyPauseMs: 0 })).toBe('failed');
    await forgetAutoBackupFolder(); // zoals chooseBackupFolder na het kiezen van een andere map
    // De nieuwe map (bijvoorbeeld gedeeld met een ander toestel) heeft al een bestand met de naam van vandaag.
    const b = tempTarget(new Map([[AUTO, 'back-up van een ander toestel']]));
    const target: AutoBackupTarget = { ...b.target, platform: 'browser', where: async () => ({ kind: 'folder', label: 'Een andere map' }) };
    expect(await runAutoBackupIfDue({ now: new Date(MONDAY.getTime() + 2 * 3_600_000), target, verifyPauseMs: 0 })).toBe('saved');
    console.log('B4 nieuwe map:', [...b.files.keys()]);
    // Verwacht was: het vreemde bestand blijft en de app schrijft -2. Nu: vervangen.
    expect([...b.files.keys()]).toEqual([AUTO]);
    expect(b.files.get(AUTO)).not.toBe('back-up van een ander toestel');
  });
});

describe('proef: een laat antwoord (I-50), met de hand', () => {
  beforeEach(() => { forgetManualBackupAttempts(); });

  function folderOn(t: ReturnType<typeof tempTarget>): AppBackupFolder {
    return { ...t.target, platform: 'app', requestAccess: async () => true };
  }

  it('B5 in de app zelf valt een tik na een opgegeven poging (60 s) altijd in een andere minuut: een andere naam, dus Abort.writing vervangt daar niets', async () => {
    const t = tempTarget();
    const folder = folderOn(t);
    const start = new Date(2026, 10, 2, 14, 30, 0);
    t.hang();
    await expect(saveManualBackup(folder, 'een', { now: start, limitMs: 10, verifyPauseMs: 0 })).rejects.toMatchObject({ reason: 'timeout' });
    // Zoals backupFileAdapter.ts: zonder `now`, dus de klok. Zestig seconden later is het 14u31.
    const later = new Date(start.getTime() + 60_000);
    expect(manualBackupName(later)).not.toBe(manualBackupName(start));
    const second = saveManualBackup(folder, 'twee', { now: later, staleMs: 0, verifyPauseMs: 0, limitMs: 500 });
    t.release();
    expect(await second).toEqual({ name: manualBackupName(later) });
    await wait(30);
    // Twee bestanden met elk een eigen tijd; geen -2, niets weg.
    expect([...t.files.keys()].sort()).toEqual([manualBackupName(start), manualBackupName(later)].sort());
  });

  it('een leesfout bij het nakijken haalt het bestand niet weg', async () => {
    const t = tempTarget();
    const folder: AppBackupFolder = { ...folderOn(t), verify: async () => 'unknown' };
    const now = new Date(2026, 10, 2, 14, 30, 0);
    await expect(saveManualBackup(folder, 'een', { now, verifyPauseMs: 0 })).rejects.toMatchObject({ reason: 'write' });
    expect([...t.files.keys()]).toEqual([manualBackupName(now)]);
    // De tweede tik vervangt het eigen bestand: geen -2.
    // Dezelfde map (de app onthoudt eigen namen per map), nu wel te lezen.
    folder.verify = t.target.verify;
    expect(await saveManualBackup(folder, 'twee', { now, verifyPauseMs: 0 })).toEqual({ name: manualBackupName(now) });
    expect([...t.files.entries()]).toEqual([[manualBackupName(now), 'twee']]);
  });
});

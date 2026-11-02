import { beforeEach, describe, expect, it } from 'vitest';
import { MetaRepo, PlannedSessionsRepo, SettingsRepo, wipeAllData } from './database';
import { forgetAutoBackupFolder, getAutoBackupStatus, noteBackupMade, readAutoBackupState, runAutoBackupIfDue } from './autoBackup';
import { CURRENT_BACKUP_SCHEMA_VERSION } from './backupTypes';
import { buildBackupEnvelope, normalizeBackupToCurrentModel } from './backup';
import { migrateAutoBackupSettings } from './migrations';
import { AutoBackupError, NameTakenError, type AutoBackupFailureReason } from '../engine/autoBackup';
import type { AutoBackupTarget, FolderAccess } from '../integrations/backupFolder';
import type { PlannedSession } from '../models/training';

// Nagemaakte gegevens: één geplande training, zodat er iets te bewaren is. 2 november 2026 is een maandag.
const session: PlannedSession = { id: 'ps_a', templateId: 'tpl_easy_run', scheduledDate: '2026-11-03', weekStartDate: '2026-11-02', status: 'planned', order: 0 };
const MONDAY = new Date(2026, 10, 2, 8, 0);
const name = (day: string) => `ascend-${day}.ascend-backup.json`;

const INSTALL = 'installatie-a';

// Een map in het geheugen, met de bestanden die er al stonden. `foreign` zijn bestanden die niet van
// de automatische back-up zijn: die weigert de map te overschrijven, zodat een test faalt als het toch
// gebeurt.
function fakeTarget(opts: {
  access?: FolderAccess;
  fail?: AutoBackupFailureReason | 'hang' | 'boom';
  files?: string[];
  foreign?: string[];
  label?: string;
  install?: string;
  corrupt?: boolean;
  hangAccess?: boolean;
  hidden?: string[];
} = {}) {
  const files = new Map<string, string>([...(opts.files ?? []), ...(opts.foreign ?? [])].map((f) => [f, '{}']));
  const foreign = new Set(opts.foreign ?? []);
  const removed: string[] = [];
  const overwritten: string[] = [];
  const attempts: string[] = [];
  const hidden = new Set(opts.hidden ?? []);
  const target: AutoBackupTarget = {
    platform: 'app',
    access: async () => (opts.hangAccess ? new Promise<FolderAccess>(() => undefined) : opts.access ?? 'ready'),
    where: async () => ({ kind: 'folder', label: opts.label ?? 'Interne opslag > Documents > ASCEND' }),
    exists: async (n) => files.has(n),
    write: async (n, text, attemptId) => {
      attempts.push(attemptId);
      if (hidden.has(n)) throw new NameTakenError(n);
      if (opts.fail === 'hang') return new Promise<void>(() => undefined);
      if (opts.fail === 'boom') throw new Error('kapot');
      if (opts.fail) throw new AutoBackupError(opts.fail);
      if (foreign.has(n)) throw new Error(`vreemd bestand overschreven: ${n}`);
      if (files.has(n)) overwritten.push(n);
      files.set(n, opts.corrupt ? text.slice(0, 10) : text);
    },
    verify: async (n, bytes) => new TextEncoder().encode(files.get(n) ?? '').length === bytes,
    remove: async (n) => {
      if (foreign.has(n)) throw new Error(`vreemd bestand weggehaald: ${n}`);
      removed.push(n);
      files.delete(n);
    },
    installId: async () => opts.install ?? INSTALL,
  };
  return { target, files, removed, overwritten, attempts };
}

describe('de automatische back-up', () => {
  beforeEach(async () => {
    await wipeAllData();
    await PlannedSessionsRepo.put(session);
  });

  it('maakt op het moment hetzelfde bestand als Back-up maken, met de datum in de naam', async () => {
    const { target, files } = fakeTarget();
    expect(await runAutoBackupIfDue({ now: MONDAY, target })).toBe('saved');
    const [[file, text]] = [...files];
    expect(file).toMatch(/^ascend-\d{4}-\d{2}-\d{2}\.ascend-backup\.json$/);
    const envelope = JSON.parse(text);
    expect(envelope.backupSchemaVersion).toBe(CURRENT_BACKUP_SCHEMA_VERSION);
    // Hetzelfde schema, dezelfde import.
    expect(normalizeBackupToCurrentModel(envelope).plannedSessions?.map((s) => s.id)).toEqual(['ps_a']);
    expect((await SettingsRepo.get()).lastExportedAt).toBe(MONDAY.toISOString());
    const state = await readAutoBackupState();
    expect(state.where).toEqual({ kind: 'folder', label: 'Interne opslag > Documents > ASCEND' });
    expect(state.files).toEqual([file]);
  });

  it('wacht als het moment er nog niet is, of als hij uit staat', async () => {
    const { target, files } = fakeTarget();
    await SettingsRepo.set({ lastExportedAt: new Date(2026, 10, 1, 19).toISOString() });
    expect(await runAutoBackupIfDue({ now: MONDAY, target })).toBe('not-due');
    await SettingsRepo.set({ lastExportedAt: undefined, autoBackup: 'off' });
    expect(await runAutoBackupIfDue({ now: MONDAY, target })).toBe('off');
    expect(files.size).toBe(0);
  });

  it('een lege app krijgt geen back-up', async () => {
    await wipeAllData();
    const { target, files } = fakeTarget();
    expect(await runAutoBackupIfDue({ now: MONDAY, target })).toBe('not-due');
    expect(files.size).toBe(0);
  });

  it('de browser zonder stille map: geen fout, de kaart op Vandaag neemt het over', async () => {
    const { target, files } = fakeTarget({ access: 'needs-tap' });
    expect(await runAutoBackupIfDue({ now: MONDAY, target })).toBe('needs-tap');
    expect(files.size).toBe(0);
    expect((await readAutoBackupState()).failure).toBeUndefined();
    expect(getAutoBackupStatus()).toMatchObject({ checked: true, outcome: 'needs-tap' });
  });

  it('geen toegang: nooit stil, de reden wordt bewaard en de laatste back-up blijft zoals hij was', async () => {
    const { target } = fakeTarget({ access: 'denied' });
    expect(await runAutoBackupIfDue({ now: MONDAY, target })).toBe('failed');
    expect((await readAutoBackupState()).failure).toEqual({ at: MONDAY.toISOString(), reason: 'permission' });
    expect((await SettingsRepo.get()).lastExportedAt).toBeUndefined();
    expect(getAutoBackupStatus().failure?.reason).toBe('permission');
  });

  it('schrijven mislukt: na een uur opnieuw, en een gelukte poging haalt de regel weg', async () => {
    expect(await runAutoBackupIfDue({ now: MONDAY, target: fakeTarget({ fail: 'write' }).target })).toBe('failed');
    const working = fakeTarget();
    expect(await runAutoBackupIfDue({ now: new Date(2026, 10, 2, 8, 30), target: working.target })).toBe('failed');
    expect(working.files.size).toBe(0);
    expect(await runAutoBackupIfDue({ now: new Date(2026, 10, 2, 9, 5), target: working.target })).toBe('saved');
    expect((await readAutoBackupState()).failure).toBeUndefined();
  });

  it('een onbekende fout telt als niet opgeslagen, een poging die blijft hangen stopt na de tijdsgrens', async () => {
    expect(await runAutoBackupIfDue({ now: MONDAY, target: fakeTarget({ fail: 'boom' }).target })).toBe('failed');
    expect((await readAutoBackupState()).failure?.reason).toBe('write');
    await MetaRepo.set('autoBackupState', { files: [] });
    expect(await runAutoBackupIfDue({ now: MONDAY, target: fakeTarget({ fail: 'hang' }).target, timeoutMs: 20 })).toBe('failed');
    expect((await readAutoBackupState()).failure?.reason).toBe('timeout');
  });

  it('houdt de laatste 8 eigen bestanden en ruimt alleen eigen oudere op', async () => {
    const own = ['2026-09-06', '2026-09-13', '2026-09-20', '2026-09-27', '2026-10-04', '2026-10-11', '2026-10-18', '2026-10-25', '2026-11-01'].map(name);
    // Een back-up die je zelf in de map zette, met dezelfde vorm van naam: die is niet van ASCEND.
    const yours = name('2026-08-30');
    await MetaRepo.set('autoBackupState', { files: own, filesIn: 'In Documenten/ASCEND', filesBy: INSTALL });
    const { target, files, removed } = fakeTarget({ files: own, foreign: [yours, 'notities.txt'] });
    expect(await runAutoBackupIfDue({ now: MONDAY, target })).toBe('saved');
    expect(removed).toEqual([name('2026-09-06'), name('2026-09-13')]);
    expect(files.has(yours)).toBe(true);
    expect(files.has('notities.txt')).toBe(true);
    expect((await readAutoBackupState()).files).toHaveLength(8);
  });

  it('een staat met het oude label van de map blijft eigen en wordt omgezet', async () => {
    const own = ['2026-09-06', '2026-09-13', '2026-09-20', '2026-09-27', '2026-10-04', '2026-10-11', '2026-10-18', '2026-10-25', '2026-11-01'].map(name);
    await MetaRepo.set('autoBackupState', { files: own, filesIn: 'In Documenten/ASCEND', where: { kind: 'folder', label: 'Documenten/ASCEND' }, filesBy: INSTALL });
    const state = await readAutoBackupState();
    expect(state.filesIn).toBe('In Interne opslag > Documents > ASCEND');
    expect(state.where).toEqual({ kind: 'folder', label: 'Interne opslag > Documents > ASCEND' });
    // De opslag herkent de lijst als eigen en ruimt de oudste op.
    const { target, removed } = fakeTarget({ files: own, label: 'Interne opslag > Documents > ASCEND' });
    expect(await runAutoBackupIfDue({ now: MONDAY, target })).toBe('saved');
    expect(removed).toEqual([name('2026-09-06'), name('2026-09-13')]);
  });

  it('alles bewaren ruimt niets op', async () => {
    const own = ['2026-09-06', '2026-09-13', '2026-09-20', '2026-09-27', '2026-10-04', '2026-10-11', '2026-10-18', '2026-10-25', '2026-11-01'].map(name);
    await MetaRepo.set('autoBackupState', { files: own, filesIn: 'In Documenten/ASCEND', filesBy: INSTALL });
    await SettingsRepo.set({ autoBackupKeep: 0 });
    const { target, removed } = fakeTarget({ files: own });
    expect(await runAutoBackupIfDue({ now: MONDAY, target })).toBe('saved');
    expect(removed).toEqual([]);
  });

  it('namen uit een andere map worden nooit in deze map opgeruimd', async () => {
    const own = ['2026-09-06', '2026-09-13', '2026-09-20', '2026-09-27', '2026-10-04', '2026-10-11', '2026-10-18', '2026-10-25', '2026-11-01'].map(name);
    await MetaRepo.set('autoBackupState', { files: own, filesIn: 'In oude-map', filesBy: INSTALL });
    const { target, removed } = fakeTarget({ files: own, label: 'nieuwe-map' });
    expect(await runAutoBackupIfDue({ now: MONDAY, target })).toBe('saved');
    expect(removed).toEqual([]);
    expect((await readAutoBackupState()).files).toHaveLength(1);
  });

  it('een andere map kiezen vergeet de oude namen en de mislukte poging', async () => {
    await MetaRepo.set('autoBackupState', { files: [name('2026-11-01')], failure: { at: MONDAY.toISOString(), reason: 'folder' } });
    await forgetAutoBackupFolder();
    const state = await readAutoBackupState();
    expect(state.files).toEqual([]);
    expect(state.failure).toBeUndefined();
  });

  it('Back-up maken met de hand zegt waar hij staat en lost een mislukte poging op', async () => {
    await MetaRepo.set('autoBackupState', { files: [], failure: { at: MONDAY.toISOString(), reason: 'write' } });
    await noteBackupMade({ kind: 'download' }, MONDAY.toISOString());
    const state = await readAutoBackupState();
    expect(state.failure).toBeUndefined();
    expect(state.where).toEqual({ kind: 'download' });
    expect(state.lastAt).toBe(MONDAY.toISOString());
  });

  it('een kapotte staat leest als leeg, nooit als fout', async () => {
    await MetaRepo.set('autoBackupState', { files: 'veel', failure: { reason: 'onbekend' }, where: { kind: 'wolk' } });
    expect(await readAutoBackupState()).toEqual({ files: [] });
  });

  it('een vreemd bestand met de naam van vandaag blijft staan: de back-up krijgt een volgnummer', async () => {
    const yours = name('2026-11-02');
    const { target, files } = fakeTarget({ foreign: [yours] });
    expect(await runAutoBackupIfDue({ now: MONDAY, target })).toBe('saved');
    expect(files.get(yours)).toBe('{}');
    expect(files.has('ascend-2026-11-02-2.ascend-backup.json')).toBe(true);
    expect((await readAutoBackupState()).files).toEqual(['ascend-2026-11-02-2.ascend-backup.json']);
  });

  it('een naam die vrij leek maar bezet is (een onzichtbaar bestand): het volgende volgnummer', async () => {
    const { target, files } = fakeTarget({ hidden: [name('2026-11-02')] });
    expect(await runAutoBackupIfDue({ now: MONDAY, target })).toBe('saved');
    expect([...files.keys()]).toEqual(['ascend-2026-11-02-2.ascend-backup.json']);
    expect((await readAutoBackupState()).files).toEqual(['ascend-2026-11-02-2.ascend-backup.json']);
  });

  it('te veel bezette namen achter elkaar: mislukt, niet eindeloos doorgaan', async () => {
    const hidden = [name('2026-11-02'), ...[2, 3, 4, 5, 6, 7].map((n) => `ascend-2026-11-02-${n}.ascend-backup.json`)];
    const { target, files } = fakeTarget({ hidden });
    expect(await runAutoBackupIfDue({ now: MONDAY, target })).toBe('failed');
    expect(files.size).toBe(0);
    expect((await readAutoBackupState()).failure?.reason).toBe('write');
  });

  it('elke poging heeft een eigen id voor zijn tijdelijke bestand', async () => {
    const first = fakeTarget({ fail: 'write' });
    await runAutoBackupIfDue({ now: MONDAY, target: first.target });
    const second = fakeTarget();
    await runAutoBackupIfDue({ now: new Date(2026, 10, 2, 9, 5), target: second.target });
    expect(first.attempts).toHaveLength(1);
    expect(second.attempts).toHaveLength(1);
    expect(first.attempts[0]).not.toBe(second.attempts[0]);
  });

  it('een eigen bestand van vandaag mag wel worden overschreven', async () => {
    await MetaRepo.set('autoBackupState', { files: [name('2026-11-02')], filesIn: 'In Documenten/ASCEND', filesBy: INSTALL });
    const { target, overwritten } = fakeTarget({ files: [name('2026-11-02')] });
    expect(await runAutoBackupIfDue({ now: MONDAY, target })).toBe('saved');
    expect(overwritten).toEqual([name('2026-11-02')]);
  });

  it('een eigen naam van een andere installatie telt als vreemd', async () => {
    await MetaRepo.set('autoBackupState', { files: [name('2026-11-02')], filesIn: 'In Documenten/ASCEND', filesBy: 'oude-telefoon' });
    const { target, overwritten, files } = fakeTarget({ foreign: [name('2026-11-02')] });
    expect(await runAutoBackupIfDue({ now: MONDAY, target })).toBe('saved');
    expect(overwritten).toEqual([]);
    expect(files.has('ascend-2026-11-02-2.ascend-backup.json')).toBe(true);
  });

  it('een lijst van een andere installatie (de back-up van Android) ruimt niets op', async () => {
    const own = ['2026-09-06', '2026-09-13', '2026-09-20', '2026-09-27', '2026-10-04', '2026-10-11', '2026-10-18', '2026-10-25', '2026-11-01'].map(name);
    await MetaRepo.set('autoBackupState', { files: own, filesIn: 'In Documenten/ASCEND', filesBy: 'oude-telefoon' });
    const { target, removed } = fakeTarget({ foreign: own });
    expect(await runAutoBackupIfDue({ now: MONDAY, target })).toBe('saved');
    expect(removed).toEqual([]);
    const state = await readAutoBackupState();
    expect(state.files).toEqual([name('2026-11-02')]);
    expect(state.filesBy).toBe(INSTALL);
  });

  it('eerst nakijken, dan opruimen: een bestand dat niet heel staat is mislukt en ruimt niets op', async () => {
    const own = ['2026-09-06', '2026-09-13', '2026-09-20', '2026-09-27', '2026-10-04', '2026-10-11', '2026-10-18', '2026-10-25', '2026-11-01'].map(name);
    await MetaRepo.set('autoBackupState', { files: own, filesIn: 'In Documenten/ASCEND', filesBy: INSTALL });
    const { target, removed } = fakeTarget({ files: own, corrupt: true });
    expect(await runAutoBackupIfDue({ now: MONDAY, target })).toBe('failed');
    expect(removed).toEqual([]);
    expect((await readAutoBackupState()).failure?.reason).toBe('write');
    expect((await SettingsRepo.get()).lastExportedAt).toBeUndefined();
  });

  it('een fout na een gelukt bestand maakt de back-up niet mislukt', async () => {
    const { target } = fakeTarget();
    const outcome = await runAutoBackupIfDue({ now: MONDAY, target, onSaved: () => Promise.reject(new Error('app-staat weg')) });
    expect(outcome).toBe('saved');
    expect((await readAutoBackupState()).failure).toBeUndefined();
  });

  it('een poging die ergens blijft hangen stopt na de tijdsgrens, en de volgende kan weer', async () => {
    expect(await runAutoBackupIfDue({ now: MONDAY, target: fakeTarget({ hangAccess: true }).target, attemptMs: 30 })).toBe('failed');
    expect((await readAutoBackupState()).failure?.reason).toBe('timeout');
    expect(await runAutoBackupIfDue({ now: new Date(2026, 10, 2, 10), target: fakeTarget().target })).toBe('saved');
  });

  it('"Niet nu" op de kaart houdt de stille back-up niet tegen', async () => {
    await SettingsRepo.set({ lastExportReminderDismissedAt: new Date(2026, 10, 2, 7).toISOString() });
    const { target, files } = fakeTarget();
    expect(await runAutoBackupIfDue({ now: MONDAY, target })).toBe('saved');
    expect(files.size).toBe(1);
  });

  it('de staat van de automatische back-up reist nooit mee in een back-up', async () => {
    await MetaRepo.set('autoBackupState', { files: [name('2026-11-01')], where: { kind: 'folder', label: 'Documenten/ASCEND' } });
    const { target, files } = fakeTarget();
    await runAutoBackupIfDue({ now: MONDAY, target });
    const [text] = [...files.values()];
    expect(text).not.toContain('autoBackupState');
    expect(text).not.toContain('Documents > ASCEND');
  });
});

describe('de instelling in een back-up', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('reist mee en komt terug', async () => {
    await SettingsRepo.set({ autoBackup: 'daily', autoBackupKeep: 16 });
    const back = normalizeBackupToCurrentModel(JSON.parse(JSON.stringify(await buildBackupEnvelope())));
    expect(back.settings?.autoBackup).toBe('daily');
    expect(back.settings?.autoBackupKeep).toBe(16);
  });

  it('een oudere back-up zonder de velden importeert zoals eerst: het advies geldt', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    delete envelope.payload.settings.autoBackup;
    delete envelope.payload.settings.autoBackupKeep;
    const back = normalizeBackupToCurrentModel(envelope);
    expect(back.settings?.autoBackup).toBeUndefined();
    expect(back.settings?.autoBackupKeep).toBeUndefined();
  });

  it('een beschadigde waarde wordt weggelaten en geteld', () => {
    expect(migrateAutoBackupSettings({ autoBackup: 'elk uur', autoBackupKeep: 7 })).toEqual({ value: {}, skipped: 2 });
    expect(migrateAutoBackupSettings({ autoBackup: 'off', autoBackupKeep: 0 })).toEqual({ value: { autoBackup: 'off', autoBackupKeep: 0 }, skipped: 0 });
    expect(migrateAutoBackupSettings({})).toEqual({ value: {}, skipped: 0 });
  });

  it('een beschadigde waarde in een back-up valt weg, de rest blijft', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    envelope.payload.settings = { ...envelope.payload.settings, autoBackup: 'elk uur', autoBackupKeep: 8 };
    const back = normalizeBackupToCurrentModel(envelope);
    expect(back.settings?.autoBackup).toBeUndefined();
    expect(back.settings?.autoBackupKeep).toBe(8);
  });
});

// Een import schrijft alleen nieuw (backlog I-38, besluit 2026-11-15-import-alleen-nieuw.md), getoetst
// over elke oude vorm van een back-up, elke fout halverwege en de randgevallen. Opgezet door Warden.
// Alle data is nagemaakt.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionLogsRepo, InjuryNotesRepo, GoalMilestoneProgressRepo, GoalMilestonesRepo, TrainingGoalsRepo, PlannedSessionsRepo, SessionTemplatesRepo, ProgramsRepo, PlanChangeProposalsRepo, SettingsRepo, MetaRepo, BackupSnapshotsRepo, StretchCompletionRepo, GoalEngineConfigRepo, applyBackupWrites, wipeAllData, clearAllStores, resetToDemoData, milestoneProgressId, getDB } from './database';
import { normalizeBackupToCurrentModel } from './backupNormalize';
import { buildImportPreview } from './backupPreview';
import { createImportPlan, createPreImportSnapshot, applyImportPlan, restoreSnapshot } from './backupApply';
import { defaultActionsForMode } from './backupMerge';
import { PLACES_KEY, SAVED_ROUTES_KEY } from './places';
import type { ImportMode } from './backupTypes';
import type { SessionLog } from '../models/training';
import { stringHash, stringHashKey } from '../utils/stringHash';

const log = (id: string, extra: Partial<SessionLog> = {}): SessionLog => ({
  id, templateId: 't1', type: 'hiking', completedDate: '2026-08-01',
  completedAt: '2026-08-01T10:00:00.000Z', variant: 'full', durationMinutes: 60, source: 'manual', ...extra,
});
const template = { id: 't1', name: 'Wandeling', type: 'hiking' };
const planned = { id: 'p1', templateId: 't1', scheduledDate: '2026-08-03', weekStartDate: '2026-08-03', status: 'planned' };
const program = { id: 'prog1', name: 'Proef', startDate: '2026-06-01', weeks: 12 };
const goal = { id: 'goal1', name: 'Tocht', requirements: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', status: 'active', targetDate: '2027-08-02' };
const milestone = { id: 'ms1', goalId: 'goal1', title: 'Eerste', order: 1, requirement: { kind: 'manual' } };
const progress = { id: 'pr_old', goalId: 'goal1', milestoneId: 'ms1', clearedDate: '2026-07-01' };

const base = { program, templates: [template], plannedSessions: [planned], sessionLogs: [log('b1'), log('b2', { completedDate: '2026-07-20' })], injuryNotes: [{ id: 'n1', date: '2026-08-01', bodyPart: 'Knie', severity: 'licht', note: 'x' }], settings: { restDay: 3 } };
const legacy = { objectives: [{ id: 'obj1', name: 'Tocht', targetDate: '2027-08-02', milestones: [{ id: 'm_a', title: 'A', order: 1, requirement: { kind: 'manual' } }] }], milestoneProgress: [{ id: 'mp1', objectiveId: 'obj1', milestoneId: 'm_a', clearedDate: '2026-07-01' }] };
const modern = { trainingGoals: [goal], goalMilestones: [milestone], goalMilestoneProgress: [progress] };
const v4 = { planChangeProposals: [{ id: 'pc1', trigger: 'plan_check', issue: 'x', changes: [], alternatives: [], consequences: '', explanation: '', createdAt: '2026-08-01T00:00:00.000Z' }], strengthProgramStrategies: [], strengthProgramRecommendations: [], adviceResponses: {} };

// Een nagemaakte oude back-up per versie.
const OLD: Record<string, unknown> = {
  'plat (schemaVersion 1, voor de envelop)': { schemaVersion: 1, exportDate: '2026-03-01T00:00:00.000Z', ...base, ...legacy },
  v1: { backupSchemaVersion: 1, createdAt: '2026-04-01T00:00:00.000Z', payload: { version: 1, ...base, ...legacy } },
  v2: { backupSchemaVersion: 2, createdAt: '2026-05-01T00:00:00.000Z', payload: { version: 2, ...base, ...modern } },
  v3: { backupSchemaVersion: 3, createdAt: '2026-06-01T00:00:00.000Z', payload: { version: 3, ...base, ...modern, capabilityEvidence: [] } },
  v4: { backupSchemaVersion: 4, createdAt: '2026-07-01T00:00:00.000Z', payload: { version: 4, ...base, ...modern, capabilityEvidence: [], ...v4 } },
  v5: { backupSchemaVersion: 5, createdAt: '2026-08-01T00:00:00.000Z', payload: { version: 5, ...base, ...modern, capabilityEvidence: [], ...v4 } },
};

async function importFile(raw: unknown, mode: ImportMode = 'full_restore', between?: () => Promise<void>) {
  const backup = normalizeBackupToCurrentModel(structuredClone(raw));
  const selections = defaultActionsForMode(mode);
  const policy = mode === 'full_restore' ? 'restore_backup_plan' : 'keep_current_plan';
  const preview = await buildImportPreview(backup, selections, policy);
  const snapshot = await createPreImportSnapshot();
  await between?.();
  await applyImportPlan(backup, createImportPlan(backup, mode, selections, policy, preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id));
  return backup;
}

// Telt elke put en clear per opslag (de kopie van voor de import telt niet mee).
function countWrites() {
  const counts: Record<string, number> = {};
  const proto = (globalThis as unknown as { IDBObjectStore: { prototype: unknown } }).IDBObjectStore.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
  const realPut = proto.put;
  const realClear = proto.clear;
  proto.put = function (this: { name: string }, ...a: unknown[]) { if (this.name !== 'backupSnapshots') counts[this.name] = (counts[this.name] ?? 0) + 1; return realPut.apply(this, a); };
  proto.clear = function (this: { name: string }, ...a: unknown[]) { counts[`${this.name}:clear`] = (counts[`${this.name}:clear`] ?? 0) + 1; return realClear.apply(this, a); };
  return { counts, stop: () => { proto.put = realPut; proto.clear = realClear; } };
}

const HISTORY = ['sessionLogs', 'goalMilestoneProgress', 'planChangeProposals', 'strengthProgramRecommendations', 'activityStreams', 'recoveryMetrics'];

async function dump() {
  const db = await getDB();
  const out: Record<string, unknown> = {};
  for (const name of [...db.objectStoreNames]) {
    if (name === 'backupSnapshots') continue;
    if (name === 'meta') {
      const keys = await db.getAllKeys('meta');
      out.meta = Object.fromEntries(await Promise.all(keys.map(async (k) => [String(k), await db.get('meta', k)])));
    } else out[name] = await db.getAll(name as never);
  }
  return out;
}

beforeEach(async () => { await wipeAllData(); });
afterEach(() => { vi.restoreAllMocks(); });

describe.each(Object.entries(OLD))('oude back-up %s', (_name, raw) => {
  it('komt op een leeg toestel volledig binnen', async () => {
    await importFile(raw);
    expect((await SessionLogsRepo.getAll()).map((l) => l.id).sort()).toEqual(['b1', 'b2']);
    expect((await PlannedSessionsRepo.getAll()).map((p) => p.id)).toEqual(['p1']);
    expect((await ProgramsRepo.getAll()).map((p) => p.id)).toEqual(['prog1']);
    expect((await SessionTemplatesRepo.getAll()).map((t) => t.id)).toContain('t1');
    expect((await TrainingGoalsRepo.getAll()).length).toBe(1);
    expect((await GoalMilestoneProgressRepo.getAll()).length).toBe(1);
    expect((await SettingsRepo.get()).restDay).toBe(3);
    expect(await MetaRepo.get('appliedRestDay')).toBe(3);
  });

  it('twee keer importeren schrijft de tweede keer geen geschiedenis en laat alles gelijk', async () => {
    await importFile(raw);
    const before = await dump();
    const w = countWrites();
    try { await importFile(raw); } finally { w.stop(); }
    for (const store of HISTORY) expect(w.counts[store] ?? 0, store).toBe(0);
    for (const store of HISTORY) expect(w.counts[`${store}:clear`] ?? 0, `${store}:clear`).toBe(0);
    const after = await dump();
    for (const store of HISTORY) expect(after[store], store).toEqual(before[store]);
    expect((await GoalMilestoneProgressRepo.getAll()).length).toBe(1);
  });

  it('samenvoegen op een gevuld toestel: eigen logs blijven byte voor byte, alleen nieuw komt erbij', async () => {
    const mine = log('b1', { durationMinutes: 45, trim: { at: '2026-09-02T10:00:00.000Z', startSec: 0, endSec: 2700, totalSec: 3600, block: 'cardioData', original: { durationMinutes: 60 } } } as Partial<SessionLog>);
    const own = log('own', { completedDate: '2026-09-09' });
    await SessionLogsRepo.put(mine);
    await SessionLogsRepo.put(own);
    const w = countWrites();
    try { await importFile(raw, 'merge'); } finally { w.stop(); }
    const logs = await SessionLogsRepo.getAll();
    expect(logs.find((l) => l.id === 'b1')).toEqual(mine);
    expect(logs.find((l) => l.id === 'own')).toEqual(own);
    expect(logs.map((l) => l.id).sort()).toEqual(['b1', 'b2', 'own']);
    expect(w.counts.sessionLogs).toBe(1);
  });

  it('een log dat het toestel schrijft tussen voorbeeld en Akkoord wint van de rij in het bestand', async () => {
    const mine = log('b2', { durationMinutes: 33, notes: 'van het toestel' });
    await importFile(raw, 'merge', async () => { await SessionLogsRepo.put(mine); });
    expect((await SessionLogsRepo.getAll()).find((l) => l.id === 'b2')).toEqual(mine);
  });

  it('een fout halverwege een volledige terugzetting laat het toestel zoals het was', async () => {
    await SessionLogsRepo.put(log('own'));
    await PlannedSessionsRepo.put({ ...planned, id: 'mine_p' } as never);
    await InjuryNotesRepo.put({ id: 'mine_n', date: '2026-08-01', bodyPart: 'Enkel', severity: 'licht', note: 'eigen' });
    await SettingsRepo.set({ restDay: 5 });
    await MetaRepo.set('appliedRestDay', 5);
    const before = await dump();
    const backup = normalizeBackupToCurrentModel(structuredClone(raw));
    // Kapot op de laatste opslag die geschreven wordt: alles ervoor staat al in de rij.
    (backup.injuryNotes[0] as unknown as Record<string, unknown>).note = () => 'geen kloon';
    const selections = defaultActionsForMode('full_restore');
    const snapshot = await createPreImportSnapshot();
    await expect(applyImportPlan(backup, createImportPlan(backup, 'full_restore', selections, 'restore_backup_plan', [], snapshot.id))).rejects.toThrow('Er is niets gewijzigd');
    expect(await dump()).toEqual(before);
  });
});

describe('fout halverwege, elk pad van applyBackupWrites', () => {
  const seed = async () => {
    await SessionLogsRepo.put(log('own'));
    await InjuryNotesRepo.put({ id: 'keep', date: '2026-08-01', bodyPart: 'Knie', severity: 'licht', note: 'blijft' });
    await SettingsRepo.set({ restDay: 5 });
  };
  const broken = () => 'geen kloon';

  it('een kapotte rij in een gewone put, na een clear en na alleen-nieuw', async () => {
    await seed();
    const before = await dump();
    await expect(applyBackupWrites({
      plannedSessions: { clear: true, puts: [planned as never] },
      sessionLogs: { clear: false, onlyNew: true, puts: [log('n1'), log('n2')] },
      injuryNotes: { clear: true, puts: [{ id: 'x', note: broken } as never] },
      settings: { ...(await SettingsRepo.get()), restDay: 2 },
    })).rejects.toThrow();
    expect(await dump()).toEqual(before);
  });

  it('een kapotte rij in alleen-nieuw (de put gebeurt pas na het kijken)', async () => {
    await seed();
    const before = await dump();
    await expect(applyBackupWrites({
      injuryNotes: { clear: true, puts: [] },
      sessionLogs: { clear: false, onlyNew: true, puts: [log('n1'), { ...log('bad'), notes: broken } as never, log('n3')] },
      meta: { vlag: 1 },
    })).rejects.toThrow();
    expect(await dump()).toEqual(before);
  });

  it('een alleen-nieuw rij zonder sleutel', async () => {
    await seed();
    const before = await dump();
    await expect(applyBackupWrites({
      injuryNotes: { clear: true, puts: [] },
      sessionLogs: { clear: false, onlyNew: true, puts: [log('n1'), { templateId: 't1' } as never] },
    })).rejects.toThrow();
    expect(await dump()).toEqual(before);
  });

  it('een kapotte mijlpaalregel', async () => {
    await seed();
    const before = await dump();
    await expect(applyBackupWrites({
      sessionLogs: { clear: false, onlyNew: true, puts: [log('n1')] },
      goalMilestoneProgress: { clear: false, onlyNew: true, puts: [{ ...progress, note: broken } as never] },
    })).rejects.toThrow();
    expect(await dump()).toEqual(before);
  });

  it('een functie voor instellingen of meta die gooit', async () => {
    await seed();
    const before = await dump();
    await expect(applyBackupWrites({
      plannedSessions: { clear: true, puts: [planned as never] },
      sessionLogs: { clear: false, onlyNew: true, puts: [log('n1')] },
      settings: () => { throw new Error('boem'); },
    })).rejects.toThrow('boem');
    expect(await dump()).toEqual(before);
    await expect(applyBackupWrites({
      sessionLogs: { clear: false, onlyNew: true, puts: [log('n1')] },
      meta: { a: 1, b: () => { throw new Error('boem2'); } },
    })).rejects.toThrow('boem2');
    expect(await dump()).toEqual(before);
  });

  it('een waarde in meta die niet bewaard kan worden', async () => {
    await seed();
    const before = await dump();
    await expect(applyBackupWrites({
      sessionLogs: { clear: false, onlyNew: true, puts: [log('n1')] },
      meta: { a: 1, b: { f: broken } },
    })).rejects.toThrow();
    expect(await dump()).toEqual(before);
  });

  it('na een afgebroken ronde werkt de volgende gewoon', async () => {
    await seed();
    await expect(applyBackupWrites({ sessionLogs: { clear: false, onlyNew: true, puts: [{ ...log('bad'), notes: broken } as never] } })).rejects.toThrow();
    await applyBackupWrites({ sessionLogs: { clear: false, onlyNew: true, puts: [log('n1'), log('own', { durationMinutes: 1 })] } });
    const logs = await SessionLogsRepo.getAll();
    expect(logs.map((l) => l.id).sort()).toEqual(['n1', 'own']);
    expect(logs.find((l) => l.id === 'own')?.durationMinutes).toBe(60);
  });
});

describe('alleen-nieuw, randgevallen', () => {
  it('twee rijen met hetzelfde id in één bestand: de eerste blijft', async () => {
    await applyBackupWrites({ sessionLogs: { clear: false, onlyNew: true, puts: [log('d', { durationMinutes: 10 }), log('d', { durationMinutes: 20 })] } });
    const logs = await SessionLogsRepo.getAll();
    expect(logs.length).toBe(1);
    expect(logs[0].durationMinutes).toBe(10);
  });

  it('via de normalisatie: twee logs met hetzelfde id in een bestand', async () => {
    const raw = { backupSchemaVersion: 5, createdAt: '2026-08-01T00:00:00.000Z', payload: { version: 5, sessionLogs: [log('d', { durationMinutes: 10 }), log('d', { durationMinutes: 20 })] } };
    await importFile(raw, 'merge');
    const logs = await SessionLogsRepo.getAll();
    expect(logs.length).toBe(1);
    expect(logs[0].durationMinutes).toBe(10);
  });

  it('een bestand met twee regels voor dezelfde mijlpaal op een leeg toestel: één regel, de eerste', async () => {
    const raw = { backupSchemaVersion: 5, createdAt: '2026-08-01T00:00:00.000Z', payload: { version: 5, ...modern, goalMilestoneProgress: [progress, { ...progress, id: 'pr_two', clearedDate: '2026-07-05', sourceSessionLogId: 'b1' }] } };
    const backup = normalizeBackupToCurrentModel(structuredClone(raw));
    const preview = await buildImportPreview(backup, defaultActionsForMode('full_restore'), 'restore_backup_plan');
    // Het voorbeeld telt wat er geschreven wordt: doel, mijlpaal en één regel.
    expect(preview.diffByCategory.find((d) => d.category === 'objectives_and_milestones')?.toAdd).toBe(3);
    await importFile(raw);
    expect((await GoalMilestoneProgressRepo.getAll()).map((p) => p.id)).toEqual(['pr_old']);
  });

  it('een regel met het vaste id op het toestel en een oude regel in het bestand: geen tweede', async () => {
    await TrainingGoalsRepo.put(goal as never);
    await GoalMilestonesRepo.put(milestone as never);
    const mine = { id: milestoneProgressId('goal1', 'ms1'), goalId: 'goal1', milestoneId: 'ms1', clearedDate: '2026-09-01' };
    await GoalMilestoneProgressRepo.put(mine);
    await importFile(OLD.v5);
    expect(await GoalMilestoneProgressRepo.getAll()).toEqual([mine]);
  });

  it('addOnce: tien schrijvers tegelijk geven één regel', async () => {
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => GoalMilestoneProgressRepo.addOnce({ id: i % 2 ? `rand_${i}` : milestoneProgressId('g', 'm'), goalId: 'g', milestoneId: 'm', clearedDate: '2026-09-01' })));
    expect(results.filter(Boolean).length).toBe(1);
    expect((await GoalMilestoneProgressRepo.getAll()).length).toBe(1);
  });

  it('een voorstel dat het toestel afsloot blijft afgesloten, ook bij volledig terugzetten', async () => {
    await importFile(OLD.v5);
    const [p] = await PlanChangeProposalsRepo.getAll();
    const closed = { ...p, resolvedAt: '2026-09-01T00:00:00.000Z', resolution: 'accepted' };
    await PlanChangeProposalsRepo.put(closed as never);
    await importFile(OLD.v5);
    expect(await PlanChangeProposalsRepo.getAll()).toEqual([closed]);
  });
});

describe('terugzetten van de kopie van voor een import', () => {
  it('logs van daarna blijven, een log dat daarna is ingekort blijft ingekort', async () => {
    await SessionLogsRepo.put(log('a'));
    const snap = await createPreImportSnapshot();
    const trimmed = log('a', { durationMinutes: 45 });
    await SessionLogsRepo.put(trimmed);
    await SessionLogsRepo.put(log('later'));
    await restoreSnapshot(snap.id);
    const logs = await SessionLogsRepo.getAll();
    expect(logs.find((l) => l.id === 'a')).toEqual(trimmed);
    expect(logs.map((l) => l.id).sort()).toEqual(['a', 'later']);
    expect((await BackupSnapshotsRepo.getAll()).length).toBe(2);
  });
});

describe('instellingen en meta bij het schrijven', () => {
  it('een instelling die tegelijk met de import wordt gezet gaat niet verloren in de geschiedenislijsten', async () => {
    await SettingsRepo.set({ restDay: 5, weightEntries: [{ date: '2026-08-01', kg: 80, source: 'manual' }] } as never);
    const raw = { backupSchemaVersion: 5, createdAt: '2026-08-01T00:00:00.000Z', payload: { version: 5, settings: { restDay: 3, weightEntries: [{ date: '2026-07-01', kg: 81, source: 'manual' }] } } };
    await importFile(raw, 'full_restore', async () => {
      await SettingsRepo.set({ weightEntries: [{ date: '2026-08-01', kg: 80, source: 'manual' }, { date: '2026-09-01', kg: 79, source: 'manual' }] } as never);
    });
    const s = await SettingsRepo.get() as unknown as { restDay: number; weightEntries: { date: string }[] };
    expect(s.restDay).toBe(3);
    expect(s.weightEntries.map((w) => w.date).sort()).toEqual(['2026-07-01', '2026-08-01', '2026-09-01']);
  });

  it('MetaRepo.update: een change die gooit schrijft niets en blokkeert de volgende niet', async () => {
    await MetaRepo.set('k', 1);
    await expect(MetaRepo.update<number>('k', () => { throw new Error('x'); })).rejects.toThrow('x');
    expect(await MetaRepo.get('k')).toBe(1);
    expect(await MetaRepo.update<number>('k', (v) => (v ?? 0) + 1)).toBe(2);
  });

  it('twintig set-aanroepen tegelijk over drie repos blijven allemaal staan', async () => {
    await Promise.all([
      ...Array.from({ length: 10 }, (_, i) => MetaRepo.update<Record<string, number>>('teller', (v) => ({ ...(v ?? {}), [`k${i}`]: i }))),
      SettingsRepo.set({ restDay: 4 }), SettingsRepo.set({ keepStreams: false } as never),
      StretchCompletionRepo.set({ morning: '2026-09-01' } as never), StretchCompletionRepo.set({ evening: '2026-09-01' } as never),
      GoalEngineConfigRepo.set({} as never),
    ]);
    expect(Object.keys((await MetaRepo.get<Record<string, number>>('teller')) ?? {}).length).toBe(10);
    const s = await SettingsRepo.get() as unknown as { restDay: number; keepStreams: boolean };
    expect([s.restDay, s.keepStreams]).toEqual([4, false]);
    expect(Object.keys(await StretchCompletionRepo.get()).sort()).toEqual(['evening', 'morning']);
  });
});

describe('routes zonder plekken', () => {
  const place = (id: string) => ({ id, name: `Plek ${id}`, lat: 1.5, lon: 2.5, source: 'map', createdAt: '2026-08-01' });
  const route = (id: string, placeId: string) => ({ id, placeId, name: `Route ${id}`, source: 'import', distanceM: 5000, ascentM: 50, points: [{ lat: 1.5, lon: 2.5 }, { lat: 1.51, lon: 2.51 }], createdAt: '2026-08-01' });

  it('een bestand met alleen routes: de routes van het bestand vervangen die van het toestel, gefilterd op de plekken van het toestel', async () => {
    await MetaRepo.set(PLACES_KEY, [place('A'), place('B')]);
    await MetaRepo.set(SAVED_ROUTES_KEY, [route('r_own', 'A')]);
    const raw = { backupSchemaVersion: 5, createdAt: '2026-08-01T00:00:00.000Z', payload: { version: 5, settings: {}, savedRoutes: [route('r1', 'A'), route('r2', 'B'), route('r3', 'C')] } };
    await importFile(raw);
    expect(((await MetaRepo.get<{ id: string }[]>(SAVED_ROUTES_KEY)) ?? []).map((r) => r.id)).toEqual(['r1', 'r2']);
    expect(((await MetaRepo.get<{ id: string }[]>(PLACES_KEY)) ?? []).map((p) => p.id)).toEqual(['A', 'B']);
  });
});

describe('alles wissen', () => {
  it('resetToDemoData en wipeAllData laten geen log, kopie of instelling achter', async () => {
    await importFile(OLD.v5);
    expect((await BackupSnapshotsRepo.getAll()).length).toBeGreaterThan(0);
    await resetToDemoData();
    expect(await SessionLogsRepo.getAll()).toEqual([]);
    expect(await BackupSnapshotsRepo.getAll()).toEqual([]);
    expect((await SettingsRepo.get()).restDay).not.toBe(3);
    expect(await ProgramsRepo.getAll()).toEqual([]);
  });

  it('clearAllStores met een vlag die niet bewaard kan worden wist niets', async () => {
    await importFile(OLD.v5);
    const before = await dump();
    await expect(clearAllStores({ ok: 1, stuk: () => 1 })).rejects.toThrow();
    expect(await dump()).toEqual(before);
  });
});

describe('stringhash tegen de oude kopieën', () => {
  const rand = (n: number, seed: number) => { let s = seed; let out = ''; for (let i = 0; i < n; i++) { s = (s * 1103515245 + 12345) >>> 0; out += String.fromCharCode(s % 0xffff); } return out; };
  const samples = ['', 'a', '2026-11-15', 'ëäïö ß 漢字', 'x'.repeat(20000), ...Array.from({ length: 300 }, (_, i) => rand(1 + (i % 97), i + 1))];
  const oldSimple = (t: string) => { let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  const oldDjb2 = (t: string) => { let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  const oldQuote = (t: string) => Array.from(t).reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 0);
  const newFacts = (parts: (string | number | undefined)[]) => `${parts.length}:${stringHashKey(parts.map((p) => `${String(p)}|`).join(''), { multiplier: 33, seed: 5381 })}`;

  it('adviesid (opgeslagen) en horlogevingerafdruk (opgeslagen) zijn gelijk', () => {
    for (const s of samples) {
      expect(stringHashKey(s)).toBe(oldSimple(s));
      expect(stringHashKey(s, { multiplier: 33, seed: 5381 })).toBe(oldDjb2(s));
    }
  });
  it('quote van de dag: gelijk voor elke datum van 2020 tot 2040', () => {
    for (let d = Date.UTC(2020, 0, 1); d < Date.UTC(2040, 0, 1); d += 86400000) {
      const iso = new Date(d).toISOString().slice(0, 10);
      expect(stringHash(iso)).toBe(oldQuote(iso));
    }
  });
  it('factsCache: andere inhoud geeft een andere sleutel, dezelfde inhoud dezelfde (alleen in het geheugen)', () => {
    const parts = ['log1', '2026-08-01T10:00:00.000Z', 't1', undefined, 12, 1, 0];
    expect(newFacts(parts)).toBe(newFacts([...parts]));
    expect(newFacts(parts)).not.toBe(newFacts(['log1', '2026-08-01T10:00:00.000Z', 't1', undefined, 13, 1, 0]));
    expect(newFacts(['ab', 'c'])).not.toBe(newFacts(['a', 'bc']));
  });
});

describe('vast id en Terugzetten', () => {
  // Het vaste id is van de mijlpaal, niet van het log: Terugzetten wist alleen een regel van dat log.
  it('Terugzetten van een geimporteerd log wist de eigen mijlpaalregel van het toestel met hetzelfde vaste id', async () => {
    const { restoreAlignments } = await import('./watchAlign');
    await TrainingGoalsRepo.put(goal as never);
    await GoalMilestonesRepo.put(milestone as never);
    // Op het toestel met de hand behaald (geen log erbij).
    const fixed = milestoneProgressId('goal1', 'ms1');
    const mine = { id: fixed, goalId: 'goal1', milestoneId: 'ms1', clearedDate: '2026-09-01' };
    await GoalMilestoneProgressRepo.put(mine);
    // In het bestand: een log dat het horloge overnam en daarbij dezelfde mijlpaal haalde.
    const taken = log('x1', { externalId: 'ext1', cardioData: { durationMinutes: 60, source: 'garmin' }, manualMeasured: { at: '2026-08-02T00:00:00.000Z', block: 'cardioData', values: { durationMinutes: 50 }, clearedProgressIds: [fixed] } } as never);
    const raw = { backupSchemaVersion: 5, createdAt: '2026-08-03T00:00:00.000Z', payload: { version: 5, sessionLogs: [taken], ...modern, goalMilestoneProgress: [{ ...mine, clearedDate: '2026-08-02', sourceSessionLogId: 'x1' }] } };
    await importFile(raw, 'merge');
    expect(await GoalMilestoneProgressRepo.getAll()).toEqual([mine]);
    expect(await restoreAlignments(['x1'])).toBe(1);
    const left = await GoalMilestoneProgressRepo.getAll();
    // Zo hoort het: de eigen regel van het toestel blijft.
    expect(left).toEqual([mine]);
  });
});

// Een import schrijft alleen nieuwe of gewijzigde rijen (backlog I-38): nooit de eigen
// rijen van het toestel terug uit de kopie die het voorbeeld las. Daartussen kan het
// toestel een log hebben veranderd (inkorten, koppelen, ontkoppelen), en dat mag een
// import nooit terugdraaien.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionLogsRepo, InjuryNotesRepo, PlanChangeProposalsRepo, GoalMilestoneProgressRepo, applyBackupWrites, wipeAllData } from './database';
import { normalizeBackupToCurrentModel } from './backupNormalize';
import { buildImportPreview } from './backupPreview';
import { createImportPlan, createPreImportSnapshot, applyImportPlan } from './backupApply';
import { resolveListCategory } from './backupMerge';
import type { BackupDataCategory, CategoryAction } from './backupTypes';
import type { SessionLog } from '../models/training';
import type { InjuryNote } from '../models/injury';
import type { PlanChangeProposal } from '../models/planChange';

const log = (id: string, extra: Partial<SessionLog> = {}): SessionLog => ({
  id, templateId: 't1', type: 'hiking', completedDate: '2026-08-01',
  completedAt: '2026-08-01T10:00:00.000Z', variant: 'full', durationMinutes: 60, source: 'manual', ...extra,
});

function backupWith(payload: Record<string, unknown>) {
  return normalizeBackupToCurrentModel({
    backupSchemaVersion: 1,
    createdAt: '2026-09-01T00:00:00.000Z',
    payload: { version: 1, program: null, templates: [], plannedSessions: [], sessionLogs: [], objectives: [], milestoneProgress: [], injuryNotes: [], settings: {}, ...payload },
  });
}

// `beforeApply` runs between the preview (and its snapshot) and the writing: what the
// device does while the owner reads the preview.
async function importMerge(backup: ReturnType<typeof backupWith>, selections: Partial<Record<BackupDataCategory, CategoryAction>> = { training_history: 'merge' }, beforeApply?: () => void) {
  const preview = await buildImportPreview(backup, selections, 'keep_current_plan');
  const snapshot = await createPreImportSnapshot();
  beforeApply?.();
  const plan = createImportPlan(backup, 'custom', selections, 'keep_current_plan', preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id);
  await applyImportPlan(backup, plan);
}

describe('resolveListCategory: wat een merge schrijft', () => {
  const a = { id: 'a', v: 1 };
  const b = { id: 'b', v: 1 };

  it('nieuw: alleen de rij die het toestel nog niet heeft', () => {
    const r = resolveListCategory('merge', [a, b], [a], false);
    expect(r.writes).toEqual([b]);
    expect(r.final).toEqual([a, b]);
  });

  it('gelijk: niets', () => {
    expect(resolveListCategory('merge', [a], [a], false).writes).toEqual([]);
    expect(resolveListCategory('merge', [a], [a], true).writes).toEqual([]);
  });

  it('gewijzigd: geschiedenis schrijft niets, een veranderlijke lijst de nieuwe versie', () => {
    const a2 = { id: 'a', v: 2 };
    expect(resolveListCategory('merge', [a2], [a], false).writes).toEqual([]);
    expect(resolveListCategory('merge', [a2], [a], true).writes).toEqual([a2]);
  });

  it('niet aanraken schrijft niets, vervangen de hele lijst', () => {
    expect(resolveListCategory('keep_current', [b], [a], true).writes).toEqual([]);
    expect(resolveListCategory('replace', [b], [a], true).writes).toEqual([b]);
  });
});

describe('import schrijft alleen nieuwe of gewijzigde rijen', () => {
  beforeEach(async () => {
    await wipeAllData();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Het voorbeeld las de logs vóór een wijziging op het toestel: de lezing in
  // applyImportPlan geeft die oude kopie, terwijl de opslag al verder is.
  function readStale(logs: SessionLog[]) {
    const real = SessionLogsRepo.getAll;
    vi.spyOn(SessionLogsRepo, 'getAll').mockImplementationOnce(async () => {
      await real();
      return logs;
    });
  }

  it('nieuw: een log uit de back-up komt erbij, het eigen log blijft', async () => {
    await SessionLogsRepo.put(log('mine'));
    await importMerge(backupWith({ sessionLogs: [log('mine'), log('theirs', { completedDate: '2026-07-01' })] }));
    const ids = (await SessionLogsRepo.getAll()).map((l) => l.id).sort();
    expect(ids).toEqual(['mine', 'theirs']);
  });

  it('gelijk: een log dat het toestel al zo had wordt niet teruggeschreven uit de kopie', async () => {
    // Inkorten op het toestel na de lezing van het voorbeeld.
    const before = log('l1', { durationMinutes: 60 });
    const trimmed = log('l1', { durationMinutes: 45, trim: { at: '2026-09-02T10:00:00.000Z', startSec: 0, endSec: 2700, totalSec: 3600, block: 'cardioData', original: { durationMinutes: 60 } } });
    await SessionLogsRepo.put(trimmed);
    await importMerge(backupWith({ sessionLogs: [before] }), undefined, () => readStale([before]));
    expect(await SessionLogsRepo.getAll()).toEqual([trimmed]);
  });

  it('gewijzigd: een ander log met hetzelfde id wordt nooit overschreven', async () => {
    await SessionLogsRepo.put(log('l1'));
    await importMerge(backupWith({ sessionLogs: [log('l1', { durationMinutes: 90 })] }));
    expect(await SessionLogsRepo.getAll()).toEqual([log('l1')]);
  });

  it('gewijzigd: een veranderlijke lijst krijgt de nieuwe versie, de rest blijft ongemoeid', async () => {
    const note: InjuryNote = { id: 'n1', date: '2026-08-01', bodyPart: 'Knie', severity: 'licht', note: 'oud' };
    const other: InjuryNote = { id: 'n2', date: '2026-08-02', bodyPart: 'Enkel', severity: 'licht', note: 'eigen' };
    await InjuryNotesRepo.put(note);
    await InjuryNotesRepo.put(other);
    await importMerge(backupWith({ injuryNotes: [{ ...note, note: 'nieuw' }] }), { injuries: 'merge' });
    const byId = new Map((await InjuryNotesRepo.getAll()).map((n) => [n.id, n]));
    expect(byId.get('n1')?.note).toBe('nieuw');
    expect(byId.get('n2')).toEqual(other);
  });

  it('een uitzondering die terug werd gezet blijft terug: een ontkoppeld log wordt niet weer gekoppeld', async () => {
    // De back-up is gemaakt toen het log achteraf gekoppeld was (linkedLater). Op het toestel
    // is het ontkoppeld nadat het voorbeeld las (unlinkLog).
    const linked = log('l1', { plannedSessionId: 'ps1', linkedLater: { at: '2026-08-02T08:00:00.000Z' } });
    const unlinked = log('l1');
    await SessionLogsRepo.put(unlinked);
    await importMerge(backupWith({ sessionLogs: [linked] }), undefined, () => readStale([linked]));
    expect(await SessionLogsRepo.getAll()).toEqual([unlinked]);
  });

  it('een uitzondering op het toestel wint van de back-up zonder die uitzondering', async () => {
    const restored = log('l1', { durationMinutes: 50 });
    const withManual = log('l1', { durationMinutes: 50, manualMeasured: { at: '2026-08-03T08:00:00.000Z' } } as Partial<SessionLog>);
    await SessionLogsRepo.put(withManual);
    await importMerge(backupWith({ sessionLogs: [restored] }));
    expect(await SessionLogsRepo.getAll()).toEqual([withManual]);
  });

  it('een voorstel dat het toestel intussen afsloot wordt niet weer open gezet', async () => {
    const open: PlanChangeProposal = { id: 'pc1', trigger: 'plan_check', issue: 'Weekcontrole', changes: [], alternatives: [], consequences: '', explanation: '', createdAt: '2026-08-01T00:00:00.000Z' };
    const closed: PlanChangeProposal = { ...open, resolvedAt: '2026-09-02T00:00:00.000Z', resolution: 'accepted' };
    await PlanChangeProposalsRepo.put(closed);
    const real = PlanChangeProposalsRepo.getAll;
    // A file of version 4 and up carries the change log; set it directly on the read file.
    const backup = backupWith({});
    backup.planChangeProposals = [open];
    await importMerge(backup, undefined, () => {
      vi.spyOn(PlanChangeProposalsRepo, 'getAll').mockImplementationOnce(async () => {
        await real();
        return [open];
      });
    });
    expect(await PlanChangeProposalsRepo.getAll()).toEqual([closed]);
  });

  it('een mijlpaalregel die er al staat blijft zoals hij was', async () => {
    const row = { id: 'p1', goalId: 'g1', milestoneId: 'm1', clearedDate: '2026-08-01' };
    await GoalMilestoneProgressRepo.put(row);
    await applyBackupWrites({ goalMilestoneProgress: { clear: false, onlyNew: true, puts: [{ ...row, clearedDate: '2026-07-01' }, { ...row, id: 'p2', milestoneId: 'm2' }] } });
    const byId = new Map((await GoalMilestoneProgressRepo.getAll()).map((p) => [p.id, p]));
    expect(byId.get('p1')).toEqual(row);
    expect(byId.get('p2')?.milestoneId).toBe('m2');
  });
});

describe('een import die halverwege faalt', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('schrijft niets: ook wat ervoor in dezelfde ronde stond niet', async () => {
    await SessionLogsRepo.put(log('mine'));
    const broken = { id: 'n1', date: '2026-08-01', bodyPart: 'Knie', severity: 'licht', note: () => 'geen kloon' } as unknown as InjuryNote;
    await expect(applyBackupWrites({
      sessionLogs: { clear: false, onlyNew: true, puts: [log('new1')] },
      injuryNotes: { clear: true, puts: [broken] },
    })).rejects.toThrow();
    expect((await SessionLogsRepo.getAll()).map((l) => l.id)).toEqual(['mine']);
    expect(await InjuryNotesRepo.getAll()).toEqual([]);
  });

  it('schrijft niets als een rij met alleen-nieuw faalt', async () => {
    await InjuryNotesRepo.put({ id: 'keep', date: '2026-08-01', bodyPart: 'Knie', severity: 'licht', note: 'blijft' });
    const broken = { ...log('bad'), notes: () => 'geen kloon' } as unknown as SessionLog;
    await expect(applyBackupWrites({
      injuryNotes: { clear: true, puts: [] },
      sessionLogs: { clear: false, onlyNew: true, puts: [log('new1'), broken] },
    })).rejects.toThrow();
    expect(await SessionLogsRepo.getAll()).toEqual([]);
    expect((await InjuryNotesRepo.getAll()).map((n) => n.id)).toEqual(['keep']);
  });

  it('meldt dat er niets gewijzigd is', async () => {
    await SessionLogsRepo.put(log('mine'));
    const backup = backupWith({ sessionLogs: [log('theirs')], injuryNotes: [{ id: 'n1', date: '2026-08-01', bodyPart: 'Knie', severity: 'licht', note: 'x' }] });
    // Een kapotte rij die pas bij het schrijven blijkt.
    (backup.injuryNotes[0] as unknown as Record<string, unknown>).note = () => 'geen kloon';
    await expect(importMerge(backup, { training_history: 'merge', injuries: 'merge' })).rejects.toThrow('Er is niets gewijzigd');
    expect((await SessionLogsRepo.getAll()).map((l) => l.id)).toEqual(['mine']);
    vi.restoreAllMocks();
  });
});

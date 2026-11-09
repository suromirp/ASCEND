import { describe, expect, it } from 'vitest';
import { migrateSkillGoals, readSkillGoalStore } from './migrations';
import { addSkillGoal, removeSkillGoal, type SkillGoalsMeta } from './skillGoals';
import { buildGeneralGoal, liveGeneralGoal, liveSkillGoals } from '../engine/skillGoal';
import type { SkillGoal, SkillGoalStore } from '../models/skillGoals';

// Alles nagemaakt.
const NOW = '2026-11-09T08:00:00.000Z';
const TODAY = '2026-11-09';
const skill = (over: Partial<SkillGoal> = {}): SkillGoal => ({ id: 'skill_a', name: 'Pull-Up', ladderId: 'pull-up', targetStep: 4, createdAt: '2026-11-01T08:00:00.000Z', updatedAt: '2026-11-01T08:00:00.000Z', ...over });
const general = (id = 'alg_a', now = NOW) => buildGeneralGoal({ id, now, today: TODAY, logs: [] });

function memory(): SkillGoalsMeta & { value: unknown; writes: number } {
  const m = {
    value: undefined as unknown,
    writes: 0,
    get: async () => m.value,
    set: async (_k: string, v: unknown) => { m.writes++; m.value = JSON.parse(JSON.stringify(v)); },
  };
  return m;
}

describe('de opslag van het algemene doel', () => {
  it('een fout halverwege laat de oude opslag staan', async () => {
    const m = memory();
    await addSkillGoal(skill(), [], TODAY, m);
    const before = JSON.stringify(m.value);
    const failing: SkillGoalsMeta = { get: m.get, set: async () => { throw new Error('schijf vol'); } };
    await expect(addSkillGoal(general(), [], TODAY, failing)).rejects.toThrow();
    expect(JSON.stringify(m.value)).toBe(before);
  });

  it('een tweede algemeen doel verandert niets en schrijft niet', async () => {
    const m = memory();
    await addSkillGoal(general(), [], TODAY, m);
    const before = JSON.stringify(m.value);
    const writes = m.writes;
    const back = await addSkillGoal(general('alg_b', '2026-11-10T08:00:00.000Z'), [], TODAY, m);
    expect(m.writes).toBe(writes);
    expect(JSON.stringify(m.value)).toBe(before);
    expect(back.goals.map((g) => g.id)).toEqual(['alg_a']);
    // Een gewone vaardigheid kan er wel bij.
    await addSkillGoal(skill(), [], TODAY, m);
    expect((m.value as SkillGoalStore).goals.map((g) => g.id)).toEqual(['alg_a', 'skill_a']);
  });

  it('weghalen zet removedAt, daarna mag er weer een bij', async () => {
    const m = memory();
    await addSkillGoal(general(), [], TODAY, m);
    const after = await removeSkillGoal('alg_a', '2026-11-12T09:00:00.000Z', m);
    expect(after.goals[0]).toMatchObject({ id: 'alg_a', removedAt: '2026-11-12T09:00:00.000Z' });
    expect(liveGeneralGoal(after)).toBeUndefined();
    const again = await addSkillGoal(general('alg_b', '2026-11-12T10:00:00.000Z'), [], TODAY, m);
    expect(again.goals.map((g) => g.id)).toEqual(['alg_a', 'alg_b']);
    expect(liveGeneralGoal(again)?.id).toBe('alg_b');
    // Een algemeen doel schrijft geen gehaalde stappen.
    expect(again.progress).toEqual([]);
  });
});

describe('migrateSkillGoals met een algemeen doel', () => {
  it('een bestaande back-up zonder general leest byte voor byte gelijk', () => {
    const raw = {
      goals: [skill(), skill({ id: 'b', ladderId: 'planche', targetStep: 6, removedAt: '2026-11-03T00:00:00.000Z' })],
      progress: [{ id: 'p1', goalId: 'skill_a', ladderId: 'pull-up', step: 1, exerciseId: 'dead-hang', clearedDate: '2026-11-02' }],
    };
    const read = migrateSkillGoals(JSON.parse(JSON.stringify(raw)));
    expect(JSON.stringify(read.store)).toBe(JSON.stringify(raw));
    expect(read.skipped).toBe(0);
  });

  it('een geldig algemeen doel blijft zoals het is', () => {
    const g = general();
    const read = migrateSkillGoals({ goals: [g], progress: [] });
    expect(read).toEqual({ store: { goals: [g], progress: [] }, skipped: 0 });
  });

  it('de migratie schoont general niet op: een vreemde lijst of baseline blijft ongewijzigd staan', () => {
    const many = Array.from({ length: 14 }, (_, i) => `ladder-${i}`);
    const g = { ...general(), general: { ladderIds: ['push-up', 7, 'push-up', '', null, ...many], startDate: TODAY, baseline: { 'push-up': 4, dip: -1, pistol: 2.5, onbekend: 3, extra: 'twee' } } };
    expect(migrateSkillGoals({ goals: [g], progress: [] })).toEqual({ store: { goals: [g], progress: [] }, skipped: 0 });
  });

  it('een onbekende ladder en velden van een nieuwere versie blijven staan', () => {
    const g = { ...general(), level: 'nieuw', general: { ladderIds: ['planche', 'push-up'], startDate: TODAY, baseline: { planche: 2 }, mode: 'week' } };
    expect(migrateSkillGoals({ goals: [g], progress: [] })).toEqual({ store: { goals: [g], progress: [] }, skipped: 0 });
  });

  it('een kapotte general: het doel blijft ongewijzigd bewaard en is verborgen', () => {
    const base = general();
    const broken = [
      { ...base, id: 'a', general: 'rommel' },
      { ...base, id: 'c', general: [] },
      { ...base, id: 'd', general: { ...base.general, ladderIds: [] } },
      { ...base, id: 'e', general: { ...base.general, ladderIds: [{ id: 'push-up' }] } },
      { ...base, id: 'f', general: { ...base.general, ladderIds: 'push-up' } },
      { ...base, id: 'g', general: { ...base.general, startDate: '2026-02-31' } },
      { ...base, id: 'h', general: { ...base.general, startDate: 'gisteren' } },
      { ...base, id: 'i', general: { ...base.general, baseline: [] } },
    ];
    const read = migrateSkillGoals({ goals: [skill(), ...broken, base], progress: [] });
    expect(read.skipped).toBe(0);
    expect(read.store!.goals).toEqual([skill(), ...broken, base]);
    // Verborgen: geen van de kapotte is het algemene doel, en geen is een vaardigheid.
    expect(liveGeneralGoal(read.store!)?.id).toBe(base.id);
    const onlyBroken = { goals: broken as unknown as SkillGoal[], progress: [] };
    expect(liveGeneralGoal(onlyBroken)).toBeUndefined();
    expect(liveSkillGoals(onlyBroken)).toEqual([]);
  });

  it('heen en terug: lezen, schrijven en weer lezen geeft hetzelfde', () => {
    const raw = { goals: [skill(), { ...general(), general: { ladderIds: ['push-up', 'push-up', 'planche'], startDate: TODAY, baseline: { 'push-up': 3, dip: 2 } } }], progress: [] };
    const once = readSkillGoalStore(raw);
    const twice = readSkillGoalStore(JSON.parse(JSON.stringify(once)));
    expect(twice).toEqual(once);
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
  });
});

// De regel in de importpreview: met een algemeen doel heet het een calisthenicsdoel, niet een vaardigheid.
describe('skillGoalImportNote met een algemeen doel', () => {
  it('noemt het een calisthenicsdoel', async () => {
    const { skillGoalImportNote } = await import('./backupPreview');
    const general = { id: 'g1', name: 'Algemeen sterk met eigen gewicht', ladderId: 'algemeen', targetStep: 1, createdAt: '2026-10-20T08:00:00.000Z', updatedAt: '2026-10-20T08:00:00.000Z', general: { ladderIds: ['push-up'], startDate: '2026-10-20', baseline: {} } };
    const skill = { id: 's1', name: 'Pull-Up', ladderId: 'pull-up', targetStep: 4, createdAt: '2026-10-20T08:00:00.000Z', updatedAt: '2026-10-20T08:00:00.000Z' };
    expect(skillGoalImportNote({ goals: [general], progress: [] }, 'merge')).toBe('Deze back-up heeft één calisthenicsdoel. Het komt erbij; wat op dit toestel staat blijft. Ascend toont één algemeen doel tegelijk.');
    expect(skillGoalImportNote({ goals: [general, skill], progress: [] }, 'replace')).toBe('Deze back-up heeft 2 calisthenicsdoelen. Ze komen erbij; wat op dit toestel staat blijft. Ascend toont één algemeen doel tegelijk.');
  });
});

import { describe, expect, it } from 'vitest';
import { migrateSkillGoals, readSkillGoalStore } from './migrations';
import { addSkillGoal, removeSkillGoal, type SkillGoalsMeta } from './skillGoals';
import { buildGeneralGoal, liveGeneralGoal } from '../engine/skillGoal';
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

  it('de lijst: alleen tekst, geen dubbelen, hoogstens 12, elk hoogstens 60 tekens', () => {
    const long = 'x'.repeat(61);
    const many = Array.from({ length: 14 }, (_, i) => `ladder-${i}`);
    const g = { ...general(), general: { ladderIds: ['push-up', 7, 'push-up', '', long, null, 'planche'], startDate: TODAY, baseline: {} } };
    expect(migrateSkillGoals({ goals: [g], progress: [] }).store!.goals[0].general!.ladderIds).toEqual(['push-up', 'planche']);
    const g2 = { ...general(), general: { ladderIds: many, startDate: TODAY, baseline: {} } };
    expect(migrateSkillGoals({ goals: [g2], progress: [] }).store!.goals[0].general!.ladderIds).toEqual(many.slice(0, 12));
  });

  it('de baseline: alleen gehele getallen van 0 tot 50 met een ladder uit de lijst', () => {
    const g = { ...general(), general: { ladderIds: ['push-up', 'pull-up', 'dip', 'pistol', 'l-sit', 'planche'], startDate: TODAY, baseline: { 'push-up': 4, 'pull-up': 0, dip: -1, pistol: 2.5, 'l-sit': 51, planche: 50, onbekend: 3, extra: 'twee' } } };
    expect(migrateSkillGoals({ goals: [g], progress: [] }).store!.goals[0].general!.baseline).toEqual({ 'push-up': 4, 'pull-up': 0, planche: 50 });
  });

  it('een onbekende ladder en velden van een nieuwere versie blijven staan', () => {
    const g = { ...general(), level: 'nieuw', general: { ladderIds: ['planche', 'push-up'], startDate: TODAY, baseline: { planche: 2 }, mode: 'week' } };
    expect(migrateSkillGoals({ goals: [g], progress: [] })).toEqual({ store: { goals: [g], progress: [] }, skipped: 0 });
  });

  it('een kapotte general: het doel valt weg en telt als overgeslagen, de rest blijft', () => {
    const base = general();
    const broken = [
      { ...base, id: 'a', general: 'rommel' },
      { ...base, id: 'b', general: null },
      { ...base, id: 'c', general: [] },
      { ...base, id: 'd', general: { ...base.general, ladderIds: [] } },
      { ...base, id: 'e', general: { ...base.general, ladderIds: [3, ''] } },
      { ...base, id: 'f', general: { ...base.general, ladderIds: 'push-up' } },
      { ...base, id: 'g', general: { ...base.general, startDate: '2026-02-31' } },
      { ...base, id: 'h', general: { ...base.general, startDate: 'gisteren' } },
      { ...base, id: 'i', general: { ...base.general, baseline: [] } },
    ];
    const read = migrateSkillGoals({ goals: [skill(), ...broken, base], progress: [] });
    expect(read.store!.goals.map((g) => g.id)).toEqual(['skill_a', 'alg_a']);
    expect(read.skipped).toBe(broken.length);
  });

  it('heen en terug: lezen, schrijven en weer lezen geeft hetzelfde', () => {
    const raw = { goals: [skill(), { ...general(), general: { ladderIds: ['push-up', 'push-up', 'planche'], startDate: TODAY, baseline: { 'push-up': 3, dip: 2 } } }], progress: [] };
    const once = readSkillGoalStore(raw);
    const twice = readSkillGoalStore(JSON.parse(JSON.stringify(once)));
    expect(twice).toEqual(once);
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
  });
});

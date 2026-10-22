import { describe, it, expect } from 'vitest';
import { missionFacts } from './missionFacts';
import { buildSessionBrief } from './sessionBrief';
import { racePaces } from './racePaces';
import { buildDefaultProgramData } from '../data/defaultProgram';

const { templates, program } = buildDefaultProgramData();
const byId = new Map(templates.map((t) => [t.id, t]));
const DATE = '2026-11-04';
const brief = (id: string) => buildSessionBrief(byId.get(id)!, DATE, program, { templates });
// Nagemaakt: 5 km in 29:05 is een VDOT van 32.
const paces = racePaces([{ date: '2026-10-29', km: 5, minutes: 29 + 5 / 60 }])!;

describe('missionFacts', () => {
  it('geeft drie chips: duur, zone en een algemene aanwijzing, zonder test', () => {
    const f = missionFacts('tpl_easy_run', brief('tpl_easy_run'), undefined);
    expect(f.chips).toHaveLength(3);
    expect(f.chips[0].kind).toBe('duur');
    expect(f.chips[0].text).toMatch(/min$/);
    expect(f.chips[1]).toMatchObject({ text: 'Zone 2', kind: 'zone' });
    expect(f.chips[2].text).toBe('Praten kan');
    expect(f.paceNote).toBeUndefined();
  });

  it('zet het tempo uit de test in de plaats van "Praten kan" bij een rustige loop', () => {
    const f = missionFacts('tpl_easy_run', brief('tpl_easy_run'), paces);
    expect(f.chips).toHaveLength(3);
    expect(f.chips[2]).toEqual({ text: '7:15 tot 8:20 /km', kind: 'tempo' });
    expect(f.paceNote).toBe('Tempo uit je testloop van 29 oktober.');
  });

  it('een tempoloop krijgt het drempeltempo', () => {
    const f = missionFacts('tpl_tempo_run', brief('tpl_tempo_run'), paces);
    expect(f.chips.at(-1)).toEqual({ text: '6:05 tot 6:20 /km', kind: 'tempo' });
  });

  it('een getal als hoogtemeters blijft staan, het tempo komt erbij', () => {
    const f = missionFacts('tpl_long_run', brief('tpl_long_run'), paces);
    expect(f.chips.some((c) => c.kind === 'tempo')).toBe(true);
    expect(f.chips.length).toBeGreaterThanOrEqual(3);
  });

  it('een training zonder eigen tempo blijft zoals hij was, ook met een test', () => {
    const f = missionFacts('tpl_lower_a', brief('tpl_lower_a'), paces);
    expect(f.chips.some((c) => c.kind === 'tempo')).toBe(false);
    expect(f.paceNote).toBeUndefined();
    expect(f.chips.map((c) => c.text)).toContain('Zwaarte volgens MacroFactor');
  });

  it('geeft een getal zijn uitleg mee', () => {
    const f = missionFacts('tpl_hill_intervals', brief('tpl_hill_intervals'), undefined);
    expect(f.chips[1].text).toMatch(/× .* min hard bergop$/);
  });
});

import { describe, expect, it } from 'vitest';
import { beginnerWeek, beginnerWeekNumber } from './beginnerStart';
import { BEGINNER_LADDER, BEGINNER_STEP_LIMIT, REFERENCE_SETS, type BeginnerLadderWeek } from '../data/beginnerLadder';
import { buildDefaultProgramData } from '../data/defaultProgram';

// De ladder van "heel licht" (docs/visie/Ontwerp beginner heel licht.md, deel 1 en de tests van stap 1).

// De bestanden in docs/, alleen de namen (zoals src/werkbriefjes.scan.test.ts).
const DOCS = new Set(Object.keys(import.meta.glob('../../docs/**/*.md')).map((p) => p.replace(/^\.\.\/\.\.\//, '')));
const existsSync = (file: string) => DOCS.has(file);

const weeks = BEGINNER_LADDER.map((_, i) => beginnerWeek(i + 1)!);
const strengthTemplates = buildDefaultProgramData().templates.filter((t) => t.type === 'strength' && t.exercises?.length);
const setsOf = (t: (typeof strengthTemplates)[number]) => (t.exercises ?? []).reduce((n, e) => n + e.sets, 0);
// Het deel dribbelen van een week; gewoon lopen is alles.
const jogShare = (w: { walkJog: { jog: number; walk: number } | null }) => (w.walkJog ? w.walkJog.jog / (w.walkJog.jog + w.walkJog.walk) : 1);
// De rem van de app op één sessie: 110% van de vorige, op 5 minuten afgerond (engine/substitutions.ts).
const stepCap = (prev: number) => Math.round((prev * BEGINNER_STEP_LIMIT) / 5) * 5;

describe('beginnerWeek: de ladder van heel licht', () => {
  it('vier weken, daarna en ervoor het gewone plan', () => {
    expect(weeks).toHaveLength(4);
    expect(beginnerWeek(0)).toBeUndefined();
    expect(beginnerWeek(5)).toBeUndefined();
    expect(beginnerWeek(1.5)).toBeUndefined();
    expect(beginnerWeek(-1)).toBeUndefined();
  });

  it('elke week vraagt hoogstens wat de week erna vraagt', () => {
    for (let i = 0; i + 1 < weeks.length; i++) {
      const [a, b] = [weeks[i], weeks[i + 1]];
      expect(a.strengthMinutes, `week ${i + 1} kracht`).toBeLessThanOrEqual(b.strengthMinutes);
      expect(a.strengthSets, `week ${i + 1} sets`).toBeLessThanOrEqual(b.strengthSets);
      expect(a.shortMinutes, `week ${i + 1} kort`).toBeLessThanOrEqual(b.shortMinutes);
      expect(a.longMinutes, `week ${i + 1} lang`).toBeLessThanOrEqual(b.longMinutes);
      expect(jogShare(a), `week ${i + 1} dribbelen`).toBeLessThanOrEqual(jogShare(b));
      for (const t of strengthTemplates) expect(beginnerWeek(i + 1, setsOf(t))!.strengthSets, t.id).toBeLessThanOrEqual(beginnerWeek(i + 2, setsOf(t))!.strengthSets);
    }
  });

  it('week 1: kracht 30 tot 40 minuten en hoogstens de helft van de sets', () => {
    expect(weeks[0].strengthMinutes).toBeGreaterThanOrEqual(30);
    expect(weeks[0].strengthMinutes).toBeLessThanOrEqual(40);
    expect(weeks[0].strengthSets).toBeLessThanOrEqual(REFERENCE_SETS / 2);
    for (const t of strengthTemplates) expect(beginnerWeek(1, setsOf(t))!.strengthSets, t.id).toBeLessThanOrEqual(setsOf(t) / 2);
    for (let full = 0; full <= 40; full++) expect(beginnerWeek(1, full)!.strengthSets, `${full} sets`).toBeLessThanOrEqual(full / 2);
  });

  it('Bovenlichaam A is de maat: precies de sets van het ontwerp', () => {
    const upperA = strengthTemplates.find((t) => t.id === 'tpl_upper_a')!;
    expect(setsOf(upperA)).toBe(REFERENCE_SETS);
    expect(weeks.map((w) => w.strengthSets)).toEqual([10, 13, 17, 20]);
    // Week 3 is de korte versie (zonder extra oefeningen) met volle sets.
    expect((upperA.exercises ?? []).filter((e) => e.priority !== 'optional').reduce((n, e) => n + e.sets, 0)).toBe(weeks[2].strengthSets);
  });

  it('nooit meer sets dan het gewone plan', () => {
    for (let w = 1; w <= weeks.length; w++) for (let full = 0; full <= 40; full++) expect(beginnerWeek(w, full)!.strengthSets).toBeLessThanOrEqual(full);
  });

  it('geen training langer dan 30 minuten in week 1, behalve kracht', () => {
    expect(weeks[0].shortMinutes).toBeLessThanOrEqual(30);
    expect(weeks[0].longMinutes).toBeLessThanOrEqual(30);
  });

  it('de lange sessie groeit nooit meer dan 10% per stap (op 5 minuten, zoals de rem in de app)', () => {
    expect(weeks.map((w) => w.longMinutes)).toEqual([30, 35, 40, 45]);
    for (let i = 0; i + 1 < weeks.length; i++) expect(weeks[i + 1].longMinutes, `week ${i + 2}`).toBeLessThanOrEqual(stepCap(weeks[i].longMinutes));
  });

  it('de week van de start uit de kalender', () => {
    expect(beginnerWeekNumber('2026-11-04', '2026-11-02')).toBe(1);
    expect(beginnerWeekNumber('2026-11-04', '2026-11-08')).toBe(1);
    expect(beginnerWeekNumber('2026-11-04', '2026-11-09')).toBe(2);
    expect(beginnerWeekNumber('2026-11-04', '2026-10-31')).toBe(0);
  });

  it('een nieuwe uitkomst is een kopie: de ladder blijft zoals hij is', () => {
    const w = beginnerWeek(1)!;
    w.walkJog!.jog = 99;
    expect(BEGINNER_LADDER[0].walkJog.value).toEqual({ jog: 1, walk: 2 });
  });
});

describe('BEGINNER_LADDER: elk getal met bewijslabel en bron', () => {
  const fields: (keyof BeginnerLadderWeek)[] = ['strengthMinutes', 'strengthSets', 'shortMinutes', 'longMinutes', 'walkJog'];
  it('de bron bestaat en noemt een deel', () => {
    for (const [i, rung] of BEGINNER_LADDER.entries()) {
      for (const f of fields) {
        const n = rung[f];
        const [file, part] = n.source.split(', ');
        expect(existsSync(file), `week ${i + 1} ${f}: ${file}`).toBe(true);
        expect(part?.length ?? 0, `week ${i + 1} ${f}`).toBeGreaterThan(0);
      }
    }
  });
  it('elke week om de beurt dribbelen en wandelen, het dribbelstuk groeit hoogstens 1 minuut per week (Scout, 15 november)', () => {
    expect(weeks.map((w) => w.walkJog)).toEqual([{ jog: 1, walk: 2 }, { jog: 2, walk: 2 }, { jog: 3, walk: 2 }, { jog: 4, walk: 2 }]);
    for (let i = 0; i + 1 < weeks.length; i++) expect(weeks[i + 1].walkJog!.jog - weeks[i].walkJog!.jog).toBeLessThanOrEqual(1);
  });
  it('een verhouding met meer dan afgeleid heeft een bron in het onderzoek', () => {
    for (const rung of BEGINNER_LADDER) {
      if (rung.walkJog.evidence === 'afgeleid') continue;
      expect(rung.walkJog.source.startsWith('docs/onderzoek/'), rung.walkJog.source).toBe(true);
    }
  });
});

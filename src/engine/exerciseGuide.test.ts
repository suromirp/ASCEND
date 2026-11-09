import { describe, expect, it } from 'vitest';
import { EXERCISES, exerciseById } from '../data/exercises';
import { EXERCISE_GUIDES } from '../data/exerciseGuides';
import { SKILL_LADDERS } from '../data/skillLadders';
import { cleanSettings } from '../storage/backupClean';
import { resolveGuideOpen } from './exerciseArtSettings';
import { GUIDE_CARE, guideLinks, readMoreWords } from './exerciseGuide';
import { ADVICE_SPECS } from './settingsDiff';

// Bronbestanden als tekst, relatief aan src/engine (zonder Node-types).
const RAW = import.meta.glob<string>(['../data/*.ts', '../components/*.tsx'], { query: '?raw', import: 'default', eager: true });
const src = (p: string) => {
  const text = RAW[p];
  if (text === undefined) throw new Error(`Geen bron gevonden voor ${p}`);
  return text;
};
const asBase = { strengthTrackedExternally: false, introSoundEnabled: true };

describe('resolveGuideOpen', () => {
  it('een oude instelling of back-up zonder het veld leest als uit', () => {
    expect(resolveGuideOpen(undefined)).toBe(false);
    expect(resolveGuideOpen({})).toBe(false);
    expect(resolveGuideOpen({ guideOpen: 'ja' })).toBe(false);
    expect(resolveGuideOpen({ guideOpen: 1 })).toBe(false);
  });
  it('alleen een echte true is aan', () => {
    expect(resolveGuideOpen({ guideOpen: true })).toBe(true);
    expect(resolveGuideOpen({ guideOpen: false })).toBe(false);
  });
  it('een back-up met iets geks in het veld schrapt het en telt het', () => {
    const skipped = { n: 0 };
    const clean = cleanSettings({ guideOpen: 'misschien' }, skipped);
    expect(clean && 'guideOpen' in clean).toBe(false);
    expect(skipped.n).toBe(1);
    const ok = cleanSettings({ guideOpen: true }, { n: 0 });
    expect(ok?.guideOpen).toBe(true);
    const none = cleanSettings({}, { n: 0 });
    expect(none && 'guideOpen' in none).toBe(false);
  });
});

describe('de rij Uitleg standaard uitgeklapt', () => {
  it('staat standaard uit en volgt de instelling', () => {
    const spec = ADVICE_SPECS.find((s) => s.id === 'forge-uitleg-open');
    expect(spec).toBeDefined();
    expect(spec!.differs(asBase)).toBe(false);
    expect(spec!.differs({ ...asBase, guideOpen: true })).toBe(true);
    expect(spec!.reset({ ...asBase, guideOpen: true })).toEqual({ guideOpen: undefined });
  });
  it('heeft een rij in zoeken, indeling en samenvatting', () => {
    expect(src('../data/settingsIndex.ts')).toContain("id: 'forge-uitleg-open'");
    expect(src('../data/settingsLayout.ts')).toContain("'forge-uitleg-open'");
    expect(src('../data/settingsHelp.ts')).toContain('forgeUitlegOpen:');
  });
});

describe('guideLinks', () => {
  const guide = EXERCISE_GUIDES['pull-up'];
  it('geeft een tik naar een oefening die bestaat', () => {
    const links = guideLinks(guide, exerciseById);
    expect(links.easier).toEqual({ id: 'negative-chin-up', name: exerciseById('negative-chin-up')!.name });
    expect(links.harder).toBeNull();
  });
  it('geeft geen tik als het id niet bestaat', () => {
    const links = guideLinks({ ...guide, easier: 'bestaat-niet', harder: 'ook-niet' }, exerciseById);
    expect(links.easier).toBeNull();
    expect(links.harder).toBeNull();
  });
  it('geeft geen tik zonder id', () => {
    const { easier, harder, ...rest } = guide;
    void easier; void harder;
    expect(guideLinks(rest, exerciseById)).toEqual({ easier: null, harder: null });
  });
});

describe('oefeningen zonder uitleg', () => {
  it('houden hun drie oude regels en krijgen geen guide', () => {
    const without = EXERCISES.filter((e) => !EXERCISE_GUIDES[e.id]);
    expect(without.length).toBeGreaterThan(100);
    for (const e of without) {
      expect(e.guide, e.id).toBeUndefined();
      expect(e.cues.length, e.id).toBeGreaterThanOrEqual(3);
    }
    expect(exerciseById('dip')!.guide).toBeUndefined();
  });
  it('geen oefening met uitleg raakt zijn oude regels kwijt', () => {
    for (const id of Object.keys(EXERCISE_GUIDES)) {
      const e = exerciseById(id)!;
      expect(e.guide).toBe(EXERCISE_GUIDES[id]);
      expect(e.cues.length, id).toBeGreaterThanOrEqual(3);
    }
  });
  it('de 45 graden incline press zegt 45 graden, geen lichte helling', () => {
    const e = exerciseById('incline-bench-press')!;
    expect(e.name).toContain('45°');
    expect(e.cues.join(' ')).not.toMatch(/lichte helling|kleine helling/);
    expect(e.cues.join(' ')).toContain('45 graden');
  });
});

describe('alle uitleg', () => {
  const entries = Object.entries(EXERCISE_GUIDES);
  const FORBIDDEN_DASH = /[–—]/;
  it('heeft de vijf proefteksten en de 23 stappen van de overige calisthenicsladders (F4f)', () => {
    const f4f = SKILL_LADDERS.filter((l) => !['push-up', 'pull-up', 'dip'].includes(l.id)).flatMap((l) => l.steps.map((s) => s.exerciseId));
    expect(f4f).toHaveLength(23);
    expect(Object.keys(EXERCISE_GUIDES).sort()).toEqual([...['incline-bench-press', 'pull-up', 'push-up', 'romanian-deadlift', 'step-down'], ...f4f].sort());
  });
  for (const [id, g] of entries) {
    it(`${id}: precies drie korte regels van hoogstens 60 tekens`, () => {
      expect(exerciseById(id), 'bestaat').toBeDefined();
      expect(g.short).toHaveLength(3);
      for (const line of g.short) expect(line.length, line).toBeLessThanOrEqual(60);
    });
    it(`${id}: Lees verder hoogstens 130 woorden en elke fout heeft een oplossing`, () => {
      expect(readMoreWords(g)).toBeLessThanOrEqual(130);
      expect(g.mistakes.length).toBe(2);
      for (const m of g.mistakes) {
        expect(m.fault.length).toBeGreaterThan(0);
        expect(m.fix.length).toBeGreaterThan(0);
      }
    });
    it(`${id}: geen gedachtestreepjes`, () => {
      expect(FORBIDDEN_DASH.test(JSON.stringify(g))).toBe(false);
    });
    it(`${id}: easier en harder bestaan, en wijzen niet naar zichzelf`, () => {
      for (const ref of [g.easier, g.harder]) {
        if (ref === undefined) continue;
        expect(exerciseById(ref), ref).toBeDefined();
        expect(ref).not.toBe(id);
      }
    });
    it(`${id}: geen bron zonder licentie`, () => {
      if (g.source) expect(g.source.license.length).toBeGreaterThan(0);
    });
  }
  it('de zorgzin is vast en staat niet in een uitleg zelf', () => {
    expect(GUIDE_CARE).toBe('Doet het pijn, stop dan en vraag een arts of fysiotherapeut.');
    expect(FORBIDDEN_DASH.test(GUIDE_CARE)).toBe(false);
    expect(JSON.stringify(EXERCISE_GUIDES)).not.toContain('fysiotherapeut');
  });
});

describe('de weergave van de uitleg', () => {
  const component = src('../components/ExerciseGuide.tsx');
  it('geen uppercase-opmaak en geen hex of rgba', () => {
    expect(component).not.toMatch(/uppercase/);
    expect(component).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(component).not.toMatch(/rgba?\(/);
  });
  it('Lees verder is een TextButton van minstens 44 px en klapt uit met het bestaande patroon', () => {
    expect(component).toContain('<TextButton');
    expect(component).toContain('mx-unfold');
    expect(component).toContain('aria-expanded');
  });
  it('de zorgzin staat buiten het uitklapdeel', () => {
    const care = component.indexOf('GUIDE_CARE}');
    const unfold = component.indexOf('className="mx-unfold"');
    expect(care).toBeGreaterThan(0);
    expect(unfold).toBeGreaterThan(care);
  });
  it('Rustig en Uit: het uitklappen is alleen .mx-unfold, dat in index.css bij Rustig en Uit op de eindstand staat', () => {
    // Geen eigen overgang of animatie: wat .mx-unfold doet (0,25 s ease-out; Rustig zonder overgang; Uit en
    // prefers-reduced-motion op 0,01 ms) is al vastgelegd in index.css en geldt dus ook hier.
    expect(component).not.toMatch(/transition|animate-|animation|duration/);
    expect(component).toContain('className="mx-unfold"');
  });
  it('het blad zonder uitleg gebruikt nog de oude regels', () => {
    const sheet = src('../components/ExerciseArtSheet.tsx');
    expect(sheet).toContain('splitCues(exercise.cues)');
    expect(sheet).toMatch(/exercise\.guide \?/);
  });
});

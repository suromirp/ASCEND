import { describe, expect, it } from 'vitest';
import { ART_ORDER, EXERCISE_ART, artOrder } from '../data/exerciseArt';
import { EXERCISES } from '../data/exercises';
import { DRAWING_VERSION, artPhase, artSlugForId, artSlugsForNames, drawingUrl, isArtOrder, orderedDrawing, parseDrawing, splitCues } from './exerciseArtData';
import { RESEARCH_SOURCES } from '../data/researchSources';

// De bestanden als tekst, zonder Node-types (zoals components/sheetDrag.scan.test.ts).
const JSONS = import.meta.glob<string>('../../public/exercise-art/*.json', { query: '?raw', import: 'default', eager: true });
const DOCS = import.meta.glob<string>('../../public/exercise-art/*.md', { query: '?raw', import: 'default', eager: true });
const files = new Map(Object.entries(JSONS).map(([path, text]) => [path.split('/').pop()!, text]));
const docs = new Map(Object.entries(DOCS).map(([path, text]) => [path.split('/').pop()!, text]));

describe('de koppeling van oefeningen aan tekeningen', () => {
  it('verwijst alleen naar oefeningen die bestaan, en geeft varianten een regel', () => {
    const ids = new Set(EXERCISES.map((e) => e.id));
    for (const [id, link] of Object.entries(EXERCISE_ART)) {
      expect(ids.has(id), id).toBe(true);
      if (link.match === 'variant') expect(link.note, id).toBeTruthy();
      else expect(link.note, id).toBeUndefined();
    }
  });

  it('telt 76 exacte, 32 varianten en 12 oefeningen zonder tekening', () => {
    const links = Object.values(EXERCISE_ART);
    expect(links.filter((l) => l.match === 'zeker')).toHaveLength(76);
    expect(links.filter((l) => l.match === 'variant')).toHaveLength(32);
    expect(EXERCISES.filter((e) => !EXERCISE_ART[e.id])).toHaveLength(12);
    expect(new Set(links.map((l) => l.slug)).size).toBe(89);
  });

  it('laat weg wat een verkeerd of vaag plaatje geeft', () => {
    for (const id of ['pallof-press', 'hack-squat', 'ab-wheel-rollout', 'barbell-rollout', 'cable-high-row']) {
      expect(EXERCISE_ART[id], id).toBeUndefined();
    }
  });

  it('noemt bij een afwijkende tekening wat er anders is', () => {
    expect(EXERCISE_ART['lat-pulldown']).toMatchObject({ match: 'variant', note: 'een bovenhandse greep' });
    expect(EXERCISE_ART['barbell-row']).toMatchObject({ match: 'variant', note: 'een brede greep, bovenhands' });
    expect(EXERCISE_ART['dumbbell-bench-press']?.match).toBe('variant');
    expect(EXERCISE_ART['low-incline-dumbbell-fly']?.note).toBe('een steilere bank');
    expect(EXERCISE_ART['low-to-high-cable-fly']?.note).toMatch(/schuine bank/);
    expect(EXERCISE_ART['bodyweight-calf-raise']?.match).toBe('variant');
  });

  it('geeft elke slug een order die een rangschikking van 0, 1 en 2 is, en alleen voor bestaande tekeningen', () => {
    const slugs = new Set(Object.values(EXERCISE_ART).map((l) => l.slug));
    for (const [slug, order] of Object.entries(ART_ORDER)) {
      expect(slugs.has(slug), slug).toBe(true);
      expect(isArtOrder(order), slug).toBe(true);
    }
    for (const slug of slugs) expect(isArtOrder(artOrder(slug)), slug).toBe(true);
    expect(artOrder('squat')).toEqual([0, 1, 2]);
    expect(artOrder('pull-up')).toEqual([2, 1, 0]);
  });

  it('heeft voor elke slug een bestand met drie bruikbare paden en een zinnige viewBox', () => {
    const slugs = new Set(Object.values(EXERCISE_ART).map((l) => l.slug));
    for (const slug of slugs) {
      const text = files.get(`${slug}.json`);
      expect(text, slug).toBeTruthy();
      const drawing = parseDrawing(JSON.parse(text!));
      expect(drawing, slug).not.toBeNull();
      expect(new Set(drawing!.frames).size, `${slug}: drie verschillende beelden`).toBeGreaterThan(1);
    }
  });

  it('bewaart geen losse bestanden zonder oefening', () => {
    const slugs = new Set(Object.values(EXERCISE_ART).map((l) => `${l.slug}.json`));
    expect([...files.keys()].filter((f) => !slugs.has(f))).toEqual([]);
  });

  it('heeft geen kleurwaarden in de tekeningen', () => {
    for (const [f, text] of files) expect(text, f).not.toMatch(/#[0-9a-f]{3,6}|rgb|fill/i);
  });

  it('heeft LICENSE en ATTRIBUTION naast de tekeningen', () => {
    expect(docs.get('LICENSE.md')).toBeTruthy();
    const attribution = docs.get('ATTRIBUTION.md') ?? '';
    expect(attribution).toMatch(/Everkinetic/);
    expect(attribution).toMatch(/Bryl Lim/);
    expect(attribution).toMatch(/CC BY-SA 4\.0/);
    expect(attribution).toMatch(/drie standen van de beweging, in de volgorde begin, midden, eind/);
  });

  it('heeft de licentie als bron bij Afbeeldingen, met de pagina in het Nederlands', () => {
    const licence = RESEARCH_SOURCES.find((x) => x.url === 'https://creativecommons.org/licenses/by-sa/4.0/deed.nl');
    expect(licence?.category).toBe('afbeeldingen');
    expect(licence?.title).toMatch(/Licentie CC BY-SA 4\.0/);
  });
});

describe('parseDrawing', () => {
  const path = `M10 10c5 5 10 10 20 20s${'1 2 3 4 '.repeat(8)}z`;
  const ok = { v: [10, 10, 300, 400], d: [path, path, path] };

  it('neemt een goed bestand over', () => {
    expect(parseDrawing(ok)).toEqual({ viewBox: [10, 10, 300, 400], frames: [path, path, path] });
  });

  it('weigert alles wat niet klopt', () => {
    expect(parseDrawing(null)).toBeNull();
    expect(parseDrawing('tekst')).toBeNull();
    expect(parseDrawing({ ...ok, v: [0, 0, 300] })).toBeNull();
    expect(parseDrawing({ ...ok, v: [0, 0, 0, 400] })).toBeNull();
    expect(parseDrawing({ ...ok, v: [0, 0, 9000, 400] })).toBeNull();
    expect(parseDrawing({ ...ok, v: [0, 0, Number.NaN, 400] })).toBeNull();
    expect(parseDrawing({ ...ok, d: [path, path] })).toBeNull();
    expect(parseDrawing({ ...ok, d: [path, path, ''] })).toBeNull();
    expect(parseDrawing({ ...ok, d: [path, path, '<script>alert(1)</script>'.padEnd(60, 'M')] })).toBeNull();
  });
});

describe('artSlugsForNames', () => {
  it('geeft de tekeningen van je eigen oefeningen, zonder dubbelen en zonder wat geen tekening heeft', () => {
    const slugs = artSlugsForNames(['Barbell Back Squat', 'Back Squat', 'Pause Back Squat', 'Kelso Shrug', 'iets onbekends']);
    expect(slugs).toEqual(['squat']);
  });
  it('vindt de slug van een oefening op id', () => {
    expect(artSlugForId('bench-press')).toBe('bench-press');
    expect(artSlugForId('kelso-shrug')).toBeUndefined();
    expect(artSlugForId('bestaat-niet')).toBeUndefined();
  });
});

describe('drawingUrl', () => {
  it('zet het pad achter het basispad, met of zonder schuine streep, en het versienummer erachter', () => {
    expect(drawingUrl('/ascend/', 'squat')).toBe(`/ascend/exercise-art/squat.json?v=${DRAWING_VERSION}`);
    expect(drawingUrl('/ascend', 'squat')).toBe('/ascend/exercise-art/squat.json?v=1');
  });
});

describe('orderedDrawing', () => {
  const drawing = { viewBox: [0, 0, 100, 100] as [number, number, number, number], frames: ['a', 'b', 'c'] as [string, string, string] };
  it('zet de beelden in de volgorde van de beweging', () => {
    expect(orderedDrawing(drawing, [2, 1, 0]).frames).toEqual(['c', 'b', 'a']);
    expect(orderedDrawing(drawing, [1, 2, 0]).frames).toEqual(['b', 'c', 'a']);
    expect(orderedDrawing(drawing, [0, 1, 2]).frames).toEqual(['a', 'b', 'c']);
  });
  it('laat de volgorde van het bestand staan bij een order die niet klopt', () => {
    expect(orderedDrawing(drawing, [0, 0, 1])).toBe(drawing);
    expect(orderedDrawing(drawing, [0, 1])).toBe(drawing);
    expect(orderedDrawing(drawing, [0, 1, 3])).toBe(drawing);
  });
  it('herkent een rangschikking', () => {
    expect(isArtOrder([1, 0, 2])).toBe(true);
    expect(isArtOrder([1, 1, 2])).toBe(false);
  });
});

describe('artPhase', () => {
  const drawing = { viewBox: [0, 0, 100, 100] as [number, number, number, number], frames: ['a', 'b', 'c'] as [string, string, string] };
  it('wacht tot anderhalve seconde en laat dan de spierkaart zien', () => {
    expect(artPhase(true, undefined, false)).toBe('waiting');
    expect(artPhase(true, undefined, true)).toBe('none');
  });
  it('laat de tekening winnen als hij alsnog komt, ook na het wachten', () => {
    expect(artPhase(true, drawing, true)).toBe('drawing');
    expect(artPhase(true, drawing, false)).toBe('drawing');
  });
  it('toont zonder tekening of bij een mislukte tekening de spierkaart', () => {
    expect(artPhase(false, undefined, false)).toBe('none');
    expect(artPhase(true, null, false)).toBe('none');
  });
});

describe('splitCues', () => {
  it('splitst elke oefening in Doen, Let op en Vaak fout', () => {
    for (const e of EXERCISES) {
      const cues = splitCues(e.cues);
      expect(cues.map((c) => c.label), e.id).toEqual(['Doen', 'Let op', 'Vaak fout']);
      for (const c of cues) expect(c.text.length, e.id).toBeGreaterThan(3);
    }
  });
  it('laat een regel zonder voorvoegsel staan zonder kopje', () => {
    expect(splitCues(['Zomaar een regel.'])).toEqual([{ label: null, text: 'Zomaar een regel.' }]);
  });
});

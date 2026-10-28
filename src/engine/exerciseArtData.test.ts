import { describe, expect, it } from 'vitest';
import { EXERCISE_ART } from '../data/exerciseArt';
import { EXERCISES } from '../data/exercises';
import { artSlugForId, artSlugsForNames, drawingUrl, parseDrawing, splitCues } from './exerciseArtData';

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

  it('telt 85 exacte, 28 varianten en 7 oefeningen zonder tekening', () => {
    const links = Object.values(EXERCISE_ART);
    expect(links.filter((l) => l.match === 'zeker')).toHaveLength(85);
    expect(links.filter((l) => l.match === 'variant')).toHaveLength(28);
    expect(EXERCISES.filter((e) => !EXERCISE_ART[e.id])).toHaveLength(7);
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
  it('zet het pad achter het basispad, met of zonder schuine streep', () => {
    expect(drawingUrl('/ascend/', 'squat')).toBe('/ascend/exercise-art/squat.json');
    expect(drawingUrl('/ascend', 'squat')).toBe('/ascend/exercise-art/squat.json');
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

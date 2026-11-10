import { describe, expect, it } from 'vitest';
import { WATCH_FACE, WATCH_MIN_CELL, WATCH_MODELS, type WatchModel } from '../data/watchModels';
import {
  WATCH_KINDS,
  cleanWatchFieldStore,
  copyOfAdvice,
  WATCH_BOTH_TAKEN,
  canPickField,
  firstFreeSlot,
  pickField,
  restoreVersion,
  saveLine,
  resolveVersion,
  resolveWatchModel,
  storeWith,
  versionDiff,
  watchAdvice,
  watchFieldsShown,
  watchKindOf,
  watchSteps,
  withField,
  withFieldCount,
  withPageAdded,
  withPageRemoved,
} from './watchFields';

const model = resolveWatchModel(undefined);

describe('de datalijst per model', () => {
  it.each(Object.values(WATCH_MODELS))('$name: unieke velden, elk in een bekende groep', (m) => {
    const ids = m.fields.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    const groups = new Set(m.groups.map((g) => g.id));
    expect(m.fields.every((f) => groups.has(f.group))).toBe(true);
    expect(m.fields.every((f) => /^[A-Za-z][A-Za-z0-9]{0,39}$/.test(f.id))).toBe(true);
  });

  it.each(Object.values(WATCH_MODELS))('$name: elke plek is een tikdoel en valt binnen het ronde scherm', (m) => {
    const mid = WATCH_FACE.size / 2;
    for (const count of [1, 2, 3, 4]) {
      const layout = m.layouts[count];
      expect(layout.cells).toHaveLength(count);
      expect(layout.main).toBeLessThan(count);
      for (const cell of layout.cells) {
        expect(cell.w).toBeGreaterThanOrEqual(WATCH_MIN_CELL);
        expect(cell.h).toBeGreaterThanOrEqual(WATCH_MIN_CELL);
        // Niets kleiner dan 12 px, ook niet als de tekening tot 0,89 krimpt.
        expect(cell.valueSize * 0.89).toBeGreaterThanOrEqual(12);
        for (const [x, y] of [[cell.x, cell.y], [cell.x + cell.w, cell.y], [cell.x, cell.y + cell.h], [cell.x + cell.w, cell.y + cell.h]]) {
          expect(Math.hypot(x - mid, y - mid)).toBeLessThanOrEqual(WATCH_FACE.radius);
        }
      }
      // Plekken overlappen niet.
      layout.cells.forEach((a, i) => layout.cells.slice(i + 1).forEach((b) => {
        const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
        expect(apart).toBe(true);
      }));
      // Het stuurveld heeft het grootste cijfer.
      expect(layout.cells[layout.main].valueSize).toBe(Math.max(...layout.cells.map((c) => c.valueSize)));
    }
  });

  it.each(Object.values(WATCH_MODELS))('$name: elke naam en uitleg is een hele tekst', (m) => {
    for (const f of m.fields) {
      // Geen afgekapte naam ("Gem") en geen uitleg die midden in een zin begint.
      expect(f.label.length, f.id).toBeGreaterThanOrEqual(3);
      expect(f.label, f.id).not.toMatch(/^(Gem|Max|Min)\.?$/);
      if (f.note !== undefined) {
        expect(f.note, f.id).toMatch(/^[A-Z0-9]/);
        expect(f.note.endsWith('.'), f.id).toBe(true);
        expect(f.note, f.id).not.toMatch(/Alleen (bij )?hardlopen|intervaltraining/);
      }
      expect(f.short ?? f.label, f.id).not.toMatch(/[\u2013\u2014]/);
    }
    // Een meter hoort bij dezelfde activiteit als zijn getal.
    for (const group of ['power', 'runningDynamics'] as const) expect(m.fields.filter((f) => f.group === group).every((f) => f.only === 'run')).toBe(true);
    expect(m.fields.find((f) => f.id === 'powerGauge')?.only).toBe('run');
    expect(m.pathInApp).not.toMatch(/Gegevensschermen|Activiteiten en apps/);
  });

  it('een onbekend of kapot model valt terug op het eerste model', () => {
    expect(resolveWatchModel('bestaat-niet').id).toBe('fr255');
    expect(resolveWatchModel(42).id).toBe('fr255');
    expect(resolveWatchModel('constructor').id).toBe('fr255');
  });
});

describe('watchAdvice', () => {
  it.each(WATCH_KINDS)('$label: twee of drie pagina\'s, elk veld bestaat op het horloge, één zin waarom', ({ id }) => {
    const advice = watchAdvice(id, model)!;
    expect(advice.pages.length).toBeGreaterThanOrEqual(2);
    const known = new Set(model.fields.map((f) => f.id));
    for (const page of advice.pages) {
      expect(page.fields.length).toBeGreaterThanOrEqual(1);
      expect(page.fields.length).toBeLessThanOrEqual(4);
      expect(new Set(page.fields).size).toBe(page.fields.length);
      expect(page.fields.every((f) => known.has(f))).toBe(true);
      expect(page.why.endsWith('.')).toBe(true);
      expect(page.why).not.toMatch(/[–—]/);
    }
  });

  it('zet het stuurveld op de grootste plek van de indeling', () => {
    const zone2 = watchAdvice('zone2', model)!;
    // Drie velden: de middelste rij is het grootst.
    expect(zone2.pages[0].fields).toEqual(['hrZone', 'heartRate', 'timer']);
    expect(zone2.pages[0].why).toBe('Hartslag groot, want daar stuur je op.');
    // Vier velden: bovenaan.
    expect(watchAdvice('intervals', model)!.pages[0].fields[0]).toBe('lapTime');
  });

  it('een tocht hoort bij Hiken of Wandelen, een loop bij Hardlopen', () => {
    expect(watchAdvice('packHike', model)!.activity).toBe('Hiken of Wandelen');
    expect(watchAdvice('longRun', model)!.activity).toBe('Hardlopen');
  });

  it('een soort zonder advies geeft niets', () => {
    expect(watchAdvice('strength', model)).toBeUndefined();
    expect(watchAdvice(undefined, model)).toBeUndefined();
    expect(watchAdvice('toString', model)).toBeUndefined();
  });

  it('een model dat een veld niet kent: het veld valt weg, een pagina zonder stuurveld ook', () => {
    const small: WatchModel = { ...model, fields: model.fields.filter((f) => !['hrZone', 'cadence'].includes(f.id)) };
    const advice = watchAdvice('zone2', small)!;
    expect(advice.pages).toHaveLength(2);
    expect(advice.pages[0].fields).toEqual(['heartRate', 'timer']);
    const none: WatchModel = { ...model, fields: model.fields.filter((f) => f.id === 'steps') };
    expect(watchAdvice('zone2', none)).toBeUndefined();
  });

  it('het veld dat een zin groot noemt staat op de plek met het grootste cijfer en heet zo op het horloge', () => {
    for (const { id } of WATCH_KINDS) {
      for (const page of watchAdvice(id, model)!.pages) {
        const named = /^(.+) groot,/.exec(page.why)?.[1];
        if (!named) continue;
        const layout = model.layouts[page.fields.length];
        const main = model.fields.find((f) => f.id === page.fields[layout.main])!;
        expect(main.label, page.why).toBe(named);
        const biggest = Math.max(...layout.cells.map((c) => c.valueSize));
        expect(layout.cells[layout.main].valueSize, page.why).toBe(biggest);
        // Bij twee velden zijn beide plekken even groot: een pagina van twee velden mag dus geen veld groot noemen.
        expect(layout.cells.filter((c) => c.valueSize === biggest), page.why).toHaveLength(1);
      }
    }
  });
});

describe('watchKindOf', () => {
  it('kent de trainingen van het programma', () => {
    expect(watchKindOf({ id: 'tpl_easy_run', type: 'cardio' })).toBe('zone2');
    expect(watchKindOf({ id: 'tpl_hill_intervals', type: 'cardio' })).toBe('hills');
    expect(watchKindOf({ id: 'tpl_intervals', type: 'cardio' })).toBe('intervals');
    expect(watchKindOf({ id: 'tpl_long_run', type: 'cardio' })).toBe('longRun');
    expect(watchKindOf({ id: 'tpl_mountain_hike', type: 'hiking' })).toBe('packHike');
  });

  it('een training zonder advies geeft niets', () => {
    expect(watchKindOf({ id: 'tpl_upper_a', type: 'strength' })).toBeUndefined();
    expect(watchKindOf({ id: 'tpl_test_run', type: 'cardio' })).toBeUndefined();
    expect(watchKindOf({ id: 'tpl_bike', type: 'cardio' })).toBeUndefined();
    expect(watchKindOf(undefined)).toBeUndefined();
  });

  it('een eigen training volgt haar rollen', () => {
    expect(watchKindOf({ id: 'eigen_1', type: 'cardio', roles: ['long'] })).toBe('longRun');
    expect(watchKindOf({ id: 'eigen_2', type: 'cardio', roles: ['easy_pace'] })).toBe('zone2');
    expect(watchKindOf({ id: 'eigen_3', type: 'cardio', roles: ['hard_run'] })).toBe('intervals');
    expect(watchKindOf({ id: 'eigen_4', type: 'hiking', roles: ['long'] })).toBe('packHike');
    expect(watchKindOf({ id: 'eigen_5', type: 'cardio', roles: ['race'] })).toBeUndefined();
    // Een id dat toevallig een ingebouwde sleutel is geeft geen soort.
    expect(watchKindOf({ id: 'constructor', type: 'strength' })).toBeUndefined();
    expect(watchKindOf({ id: '__proto__', type: 'strength' })).toBeUndefined();
  });
});

describe('de bewaarde versies', () => {
  it('een oude back-up zonder het veld: geen versies, niets weggevallen, het advies werkt', () => {
    expect(cleanWatchFieldStore(undefined)).toEqual({ dropped: false });
    expect(resolveVersion(undefined, 'zone2', 'v2', model)).toBeUndefined();
    expect(firstFreeSlot(undefined, 'zone2')).toBe('v2');
    expect(watchFieldsShown({})).toBe(true);
    expect(watchFieldsShown({ watchFieldsShown: false })).toBe(false);
  });

  it('houdt een geldige versie en laat een kapotte weg', () => {
    const good = { pages: [['heartRate', 'timer'], ['distance']] };
    const out = cleanWatchFieldStore({
      zone2: { v2: good, v3: { pages: [] } },
      hills: { v2: { pages: [['a', 'b', 'c', 'd', 'e']] } },
      onzin: { v2: good },
      longRun: 'kapot',
      intervals: { v4: good, v2: { pages: [[42]] } },
      packHike: { v3: { pages: [['heart rate']] } },
    });
    expect(out.store).toEqual({ zone2: { v2: good } });
    expect(out.dropped).toBe(true);
    expect(cleanWatchFieldStore('kapot')).toEqual({ dropped: true });
    expect(cleanWatchFieldStore([])).toEqual({ dropped: true });
    expect(cleanWatchFieldStore({ zone2: { v2: good } })).toEqual({ store: { zone2: { v2: good } }, dropped: false });
  });

  it('een veld dat het model niet (meer) kent: bij het lezen komt het veld uit het advies ervoor in de plaats', () => {
    const store = { zone2: { v2: { pages: [['hrZone', 'bestaatNiet', 'timer'], ['weg1', 'weg2']] } } };
    const out = resolveVersion(store, 'zone2', 'v2', model)!;
    // Pagina 1, plek 2 is in het advies Hartslag.
    expect(out.version.pages[0]).toEqual(['hrZone', 'heartRate', 'timer']);
    expect(out.replaced).toBe(3);
    const known = new Set(model.fields.map((f) => f.id));
    expect(out.version.pages.flat().every((f) => known.has(f))).toBe(true);
    expect(new Set(out.version.pages[1]).size).toBe(2);
    // De bewaarde waarde zelf is niet aangeraakt.
    expect(store.zone2.v2.pages[0][1]).toBe('bestaatNiet');
  });

  it('staat het veld uit het advies al op de pagina, dan komt het eerste vrije veld', () => {
    const store = { zone2: { v2: { pages: [['heartRate', 'bestaatNiet']] } } };
    expect(resolveVersion(store, 'zone2', 'v2', model)!.version.pages[0]).toEqual(['heartRate', 'timer']);
  });

  it('meer pagina\'s dan het model kent: de eerste blijven', () => {
    const pages = Array.from({ length: 7 }, () => ['timer']);
    expect(resolveVersion({ hills: { v3: { pages } } }, 'hills', 'v3', model)!.version.pages).toHaveLength(model.maxPages);
  });

  it('storeWith zet een versie, en terug naar advies haalt hem in één keer weg', () => {
    const advice = watchAdvice('zone2', model)!;
    const one = storeWith(undefined, 'zone2', 'v2', copyOfAdvice(advice))!;
    expect(firstFreeSlot(one, 'zone2')).toBe('v3');
    const two = storeWith(one, 'zone2', 'v3', { pages: [['timer']] })!;
    expect(firstFreeSlot(two, 'zone2')).toBeUndefined();
    expect(firstFreeSlot(two, 'hills')).toBe('v2');
    const back = storeWith(two, 'zone2', 'v2', undefined)!;
    expect(back).toEqual({ zone2: { v3: { pages: [['timer']] } } });
    expect(storeWith(back, 'zone2', 'v3', undefined)).toBeUndefined();
    // De invoer blijft zoals hij was.
    expect(two.zone2?.v2).toBeDefined();
  });
});

describe('bewerken', () => {
  const advice = watchAdvice('zone2', model)!;
  const base = copyOfAdvice(advice);

  it('een ander veld op een plek', () => {
    const next = withField(base, 0, 2, 'cadence');
    expect(next.pages[0]).toEqual(['hrZone', 'heartRate', 'cadence']);
    expect(base.pages[0]).toEqual(['hrZone', 'heartRate', 'timer']);
    expect(withField(base, 9, 0, 'cadence')).toBe(base);
  });

  it('een veld dat al op de pagina staat wisselt van plek', () => {
    expect(withField(base, 0, 0, 'timer').pages[0]).toEqual(['timer', 'heartRate', 'hrZone']);
  });

  it('minder velden houdt de eerste, meer vult aan zonder dubbel veld', () => {
    expect(withFieldCount(base, 0, 2, model, advice).pages[0]).toEqual(['hrZone', 'heartRate']);
    const two = withFieldCount(base, 2, 1, model, advice);
    expect(two.pages[2]).toHaveLength(1);
    const four = withFieldCount(two, 2, 4, model, advice);
    expect(four.pages[2]).toHaveLength(4);
    expect(new Set(four.pages[2]).size).toBe(4);
    // Het eerstvolgende veld uit het advies voor die pagina komt eerst terug.
    expect(four.pages[2][1]).toBe(advice.pages[2].fields.find((f) => f !== two.pages[2][0]));
    expect(withFieldCount(base, 0, 5, model, advice)).toBe(base);
    expect(withFieldCount(base, 0, 0, model, advice)).toBe(base);
  });

  it('een pagina erbij tot de grens van het model, en de laatste pagina blijft', () => {
    let v = base;
    for (let i = 0; i < 10; i++) v = withPageAdded(v, model);
    expect(v.pages).toHaveLength(model.maxPages);
    let w = base;
    for (let i = 0; i < 10; i++) w = withPageRemoved(w, 0);
    expect(w.pages).toHaveLength(1);
  });

  it('versionDiff noemt elk verschil in een zin, en niets bij een kopie', () => {
    expect(versionDiff(base, advice, model)).toEqual([]);
    const changed = withPageAdded(withFieldCount(withField(base, 0, 2, 'cadence'), 1, 2, model, advice), model);
    expect(versionDiff(changed, advice, model)).toEqual([
      'Pagina 1, veld 3: Cadans in plaats van Timer.',
      'Pagina 2: 2 velden in plaats van 3.',
      'Pagina 4 staat niet in het advies.',
    ]);
    expect(versionDiff(withPageRemoved(base, 2), advice, model)).toEqual(['Pagina 3 uit het advies staat er niet in.']);
  });

  it('watchSteps: het pad met de activiteit, dan per scherm de velden', () => {
    const hike = watchAdvice('packHike', model)!;
    const out = watchSteps(hike.pages.map((p) => p.fields), model, hike);
    expect(out.steps[1]).toBe('Kies Hiken of Wandelen en dan de activiteitinstellingen.');
    expect(out.steps).toContain('Pagina 3: 3 velden. Tijd, Zon onder, Batterijniveau.');
    // Eerst het hele pad op het horloge, ook een scherm erbij, dan pas de pagina's.
    expect(out.steps.indexOf('Kies Voeg nieuw toe voor een extra scherm.')).toBeLessThan(out.steps.indexOf('Pagina 1: 4 velden. Totale stijging, Afstand, Timer, Tijd.'));
    expect(out.steps.at(-1)).toBe('Pagina 3: 3 velden. Tijd, Zon onder, Batterijniveau.');
    expect(out.steps.join(' ')).not.toContain('{activiteit}');
    expect(out.notes.join(' ')).not.toContain('{activiteit}');
    const hills = watchAdvice('hills', model)!;
    expect(watchSteps([['timer']], model, hills).notes[0]).toContain('rondeknop');
    expect(watchSteps([['timer']], model, hills).steps).toContain('Pagina 1: 1 veld. Timer.');
  });
});

describe('een veld kiezen en ongedaan maken', () => {
  const advice = watchAdvice('zone2', model)!;

  it('in het advies: de keuze komt als kopie in Versie 2, daarna in Versie 3, en het advies blijft', () => {
    const first = pickField(undefined, 'zone2', 'advice', 0, 2, 'cadence', model);
    expect(first).toMatchObject({ changed: true, tab: 'v2', notice: 'Dit staat nu in Versie 2. Het advies blijft zoals het was.' });
    expect(first.store?.zone2?.v2?.pages[0]).toEqual(['hrZone', 'heartRate', 'cadence']);
    expect(first.store?.zone2?.v2?.pages.slice(1)).toEqual(advice.pages.slice(1).map((p) => p.fields));
    const second = pickField(first.store, 'zone2', 'advice', 1, 0, 'steps', model);
    expect(second).toMatchObject({ changed: true, tab: 'v3', notice: 'Dit staat nu in Versie 3. Het advies blijft zoals het was.' });
    expect(second.store?.zone2?.v2).toEqual(first.store?.zone2?.v2);
    expect(watchAdvice('zone2', model)).toEqual(advice);
  });

  it('beide versies bezet: er verandert niets en de regel zegt waarom', () => {
    const full = { zone2: { v2: { pages: [['timer']] }, v3: { pages: [['distance']] } } };
    expect(canPickField(full, 'zone2', 'advice')).toBe(false);
    expect(canPickField(full, 'zone2', 'v2')).toBe(true);
    expect(canPickField(full, 'hills', 'advice')).toBe(true);
    expect(pickField(full, 'zone2', 'advice', 0, 0, 'cadence', model)).toEqual({ changed: false, tab: 'advice', notice: WATCH_BOTH_TAKEN });
  });

  it('hetzelfde veld, een onbekend veld of een plek die niet bestaat doet niets', () => {
    expect(pickField(undefined, 'zone2', 'advice', 0, 1, 'heartRate', model).changed).toBe(false);
    expect(pickField(undefined, 'zone2', 'advice', 0, 1, 'bestaatNiet', model).changed).toBe(false);
    expect(pickField(undefined, 'zone2', 'advice', 9, 0, 'cadence', model).changed).toBe(false);
    const own = { zone2: { v2: { pages: [['timer', 'distance']] } } };
    expect(pickField(own, 'zone2', 'v2', 0, 0, 'timer', model).changed).toBe(false);
    expect(pickField(own, 'zone2', 'v3', 0, 0, 'cadence', model).changed).toBe(false);
  });

  it('in een versie: alleen die versie verandert', () => {
    const own = { zone2: { v2: { pages: [['timer', 'distance']] }, v3: { pages: [['steps']] } }, hills: { v2: { pages: [['laps']] } } };
    const out = pickField(own, 'zone2', 'v2', 0, 1, 'cadence', model);
    expect(out).toMatchObject({ changed: true, tab: 'v2' });
    expect(out.notice).toBeUndefined();
    expect(out.store).toEqual({ ...own, zone2: { v2: { pages: [['timer', 'cadence']] }, v3: own.zone2.v3 } });
  });

  it('ongedaan maken zet de oude versie terug, maar nooit over iets nieuws heen', () => {
    const old = { pages: [['timer', 'cadence']] };
    const emptied = storeWith({ zone2: { v2: old } }, 'zone2', 'v2', undefined);
    expect(restoreVersion(emptied, 'zone2', 'v2', old)).toEqual({ ok: true, store: { zone2: { v2: old } } });
    // Na Terug naar advies koos de gebruiker opnieuw een veld in het advies: dat kwam in dezelfde plek.
    const again = pickField(emptied, 'zone2', 'advice', 0, 0, 'steps', model).store;
    expect(again?.zone2?.v2).toBeDefined();
    expect(restoreVersion(again, 'zone2', 'v2', old)).toEqual({ ok: false });
  });
});

describe('saveLine', () => {
  it('zegt alleen dat opslaan mislukte als het schrijven zelf faalde', () => {
    expect(saveLine('idle')).toBeUndefined();
    expect(saveLine('slow')).toBe('Opslaan duurt langer dan normaal. Even geduld.');
    expect(saveLine('slow')).not.toContain('lukte niet');
    expect(saveLine('failed')).toBe('Opslaan lukte niet. Probeer het opnieuw.');
  });
});

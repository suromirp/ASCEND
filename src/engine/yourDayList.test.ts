import { describe, it, expect } from 'vitest';
import {
  arrangeYourDay, moreRowText, trainingRowsForYourDay, journeyRowOnToday, journeyWhenText, resolveJourneyOnToday,
  journeyNowLine, standLines, type YourDayItem,
} from './yourDay';
import { LOAD_JUMP } from './standing';
import { JOURNEY_TASKS } from '../data/journeyTasks';
import { pickJourneyTask, journeyWeeksLeft, taskDates } from './journey';

// Je dag (docs/visie/Ontwerp Je dag.md, 3 en 6). Nagemaakte voorbeelden.
const item = (kind: YourDayItem['kind'], done = false, extra: Partial<YourDayItem> = {}): YourDayItem => ({ key: `${kind}-${extra.word ?? ''}`, kind, done, word: kind, ...extra });
const kinds = (xs: YourDayItem[]) => xs.map((x) => x.key);

describe('arrangeYourDay', () => {
  it('een lege dag geeft niets', () => {
    expect(arrangeYourDay([])).toEqual({ shown: [], more: [] });
  });

  it('training, rekken en gewicht: drie rijen, open eerst in de vaste volgorde', () => {
    const r = arrangeYourDay([item('weight'), item('stretch', true), item('training', false, { word: 'Bovenlichaam B' })]);
    expect(kinds(r.shown)).toEqual(['training-Bovenlichaam B', 'weight-', 'stretch-']);
    expect(r.more).toEqual([]);
  });

  it('vier rijen passen precies, zonder Nog', () => {
    const r = arrangeYourDay([item('journey'), item('weight'), item('stretch'), item('checkin')]);
    expect(r.shown).toHaveLength(4);
    expect(r.more).toHaveLength(0);
  });

  it('vijf of meer: drie rijen en de rest achter Nog, gedane rijen eerst daarachter', () => {
    const r = arrangeYourDay([item('journey', false, { word: 'reis' }), item('weight'), item('stretch'), item('checkin'), item('training', true, { word: 'Duurloop' })]);
    expect(kinds(r.shown)).toEqual(['checkin-', 'stretch-', 'weight-']);
    expect(kinds(r.more)).toEqual(['journey-reis', 'training-Duurloop']);
    expect(moreRowText(r.more)).toEqual({ title: 'Nog 2', line: 'Reis, Duurloop' });
  });

  it('zes dingen: de regel onder Nog noemt wat erachter zit', () => {
    const six = [item('checkin'), item('training', false, { word: 'Mobiliteit' }), item('stretch'), item('weight', false, { word: 'gewicht' }), item('journey', false, { word: 'reis' }), item('training', true, { word: 'Duurloop' })];
    const r = arrangeYourDay(six);
    expect(r.shown).toHaveLength(3);
    expect(moreRowText(r.more)).toEqual({ title: 'Nog 3', line: 'Gewicht, reis, Duurloop' });
  });

  it('de pijnplekvraag valt nooit achter Nog, ook niet als hij gedaan-gesorteerd zou worden', () => {
    const pain = item('checkin', false, { pain: true, word: 'pijnplek' });
    const r = arrangeYourDay([item('training', false, { word: 'A' }), item('training', false, { word: 'B' }), item('training', false, { word: 'C' }), item('stretch'), pain]);
    expect(r.shown).toContain(pain);
    expect(r.shown[0]).toBe(pain);
    // Zelfs met een kleiner maximum blijft hij staan.
    const tight = arrangeYourDay([item('training', false, { word: 'A' }), item('training', false, { word: 'B' }), pain], 2);
    expect(tight.shown).toContain(pain);
  });
});

describe('trainingRowsForYourDay', () => {
  const sessions = [{ id: 'eerste' }, { id: 'tweede' }];
  it('de training van de grote kaart staat er niet, een tweede wel', () => {
    expect(trainingRowsForYourDay(sessions, 'eerste', () => 'planned').map((s) => s.id)).toEqual(['tweede']);
  });
  it('een gedane of overgeslagen training blijft als rij, de weg naar zijn actieblad', () => {
    expect(trainingRowsForYourDay(sessions, 'eerste', (s) => (s.id === 'eerste' ? 'completed' : 'planned'))).toHaveLength(2);
    expect(trainingRowsForYourDay(sessions, 'eerste', (s) => (s.id === 'eerste' ? 'skipped' : 'planned'))).toHaveLength(2);
  });
  it('zonder training op de grote kaart (rustdag, alles gedaan) blijven alle rijen', () => {
    expect(trainingRowsForYourDay(sessions, undefined, () => 'completed')).toHaveLength(2);
  });
});

describe('reistaak op Vandaag', () => {
  const task = { window: [10, 6] as [number, number] };
  const todo = { task, state: 'todo' as const };

  it('de standaard is alleen in de laatste week; onzin valt daarop terug', () => {
    expect(resolveJourneyOnToday(undefined)).toBe('last-week');
    expect(resolveJourneyOnToday('rommel')).toBe('last-week');
    expect(resolveJourneyOnToday('every-week')).toBe('every-week');
  });

  it('laatste week: alleen als de weken tot het doel het eind van het venster zijn', () => {
    expect(journeyRowOnToday(todo, 6, 'last-week')).toBe(true);
    expect(journeyRowOnToday(todo, 8, 'last-week')).toBe(false);
    expect(journeyRowOnToday(todo, 10, 'last-week')).toBe(false);
    // Na het venster komt hij niet op Vandaag: hij blijft op de Reisplanner.
    expect(journeyRowOnToday(todo, 5, 'last-week')).toBe(false);
  });

  it('elke week zoals vroeger; nooit is nooit', () => {
    expect(journeyRowOnToday(todo, 8, 'every-week')).toBe(true);
    expect(journeyRowOnToday(todo, 6, 'never')).toBe(false);
  });

  it('geen doel of uitgesteld: geen rij; gedaan in de laatste week blijft als gedane rij', () => {
    expect(journeyRowOnToday(undefined, 6, 'last-week')).toBe(false);
    expect(journeyRowOnToday({ task, state: 'postponed' }, 6, 'last-week')).toBe(false);
    expect(journeyRowOnToday({ task, state: 'done' }, 6, 'last-week')).toBe(true);
  });

  it('de regel ernaast: kan nog tot zondag, kan tot een datum, of niets na het venster', () => {
    const day = () => 'zondag';
    const date = () => '6 december';
    expect(journeyWhenText(task.window, 6, '2026-12-06', day, date)).toBe('kan nog tot zondag');
    expect(journeyWhenText(task.window, 8, '2026-12-06', day, date)).toBe('kan tot 6 december');
    expect(journeyWhenText(task.window, 5, '2026-12-06', day, date)).toBeUndefined();
  });

  it('met de echte taken: in de laatste week van de gekozen taak staat hij er, een week eerder niet', () => {
    // Nagemaakt doel; we zoeken de week waarin de taak van die week zijn laatste week heeft.
    const goal = '2027-08-01';
    let found = false;
    for (let w = 40; w >= 2 && !found; w--) {
      const today = new Date(Date.parse(`${goal}T12:00:00Z`) - w * 7 * 86400000).toISOString().slice(0, 10);
      const pick = pickJourneyTask(JOURNEY_TASKS, undefined, today, goal);
      const left = journeyWeeksLeft(today, goal);
      if (pick && left === pick.task.window[1]) {
        expect(journeyRowOnToday(pick, left, 'last-week')).toBe(true);
        expect(taskDates(pick.task, goal).closesOn >= today).toBe(true);
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  it('op Ascend staat de taak van nu, anders de telling', () => {
    const progress = { done: 3, total: 20 };
    const day = () => 'zondag';
    const date = () => '6 december';
    const t = { title: 'Besluit hoeveel dagen je loopt', window: [10, 6] as [number, number] };
    expect(journeyNowLine({ task: t, state: 'todo' }, 8, '2026-12-06', progress, day, date)).toBe('Nu: Besluit hoeveel dagen je loopt · kan tot 6 december');
    expect(journeyNowLine({ task: t, state: 'todo' }, 4, '2026-12-06', progress, day, date)).toBe('Nu: Besluit hoeveel dagen je loopt');
    expect(journeyNowLine({ task: t, state: 'done' }, 8, '2026-12-06', progress, day, date)).toBe('3 van 20 taken gedaan');
    expect(journeyNowLine(undefined, 0, undefined, progress, day, date)).toBe('3 van 20 taken gedaan');
  });
});

describe('Stand en morgen', () => {
  const base = { legsWord: 'Fris', legsLevel: 0, loadJump: LOAD_JUMP };

  it('fris: benen zonder stip, en morgen', () => {
    const lines = standLines({ ...base, tomorrow: { kind: 'training', name: 'Bovenlichaam B', minutes: 60 } });
    expect(lines.map((l) => [l.label, l.value, l.warn, l.to])).toEqual([
      ['Benen', 'Fris', false, '/stand/benen'],
      ['Morgen', 'Bovenlichaam B, 60 min', false, '/week'],
    ]);
  });

  it('vermoeid: een stip, nooit een gekleurd woord', () => {
    expect(standLines({ ...base, legsWord: 'Vermoeid', legsLevel: 2 })[0]).toMatchObject({ label: 'Benen', value: 'Vermoeid', warn: true });
    expect(standLines({ ...base, legsWord: 'Wat vermoeid', legsLevel: 1 })[0].warn).toBe(false);
  });

  it('een zware week: een derde regel met stip, tussen benen en morgen', () => {
    const lines = standLines({ ...base, load: { doneRatio: 1.35 }, tomorrow: { kind: 'rest' } });
    // De regel Week opent het scherm Belasting, niet de bovenkant van Je stand (Stand minimaal, spoor 6).
    expect(lines.find((l) => l.key === 'week')?.to).toBe('/stand/belasting');
    expect(lines.map((l) => l.key)).toEqual(['legs', 'week', 'tomorrow']);
    expect(lines[1]).toMatchObject({ value: '35% zwaarder dan de 4 weken ervoor', warn: true });
  });

  it('een gewone week, of minder dan drie weken gegevens: geen weekregel en geen telling', () => {
    expect(standLines({ ...base, load: { doneRatio: 1.0 } }).map((l) => l.key)).toEqual(['legs']);
    expect(standLines({ ...base, load: undefined }).map((l) => l.key)).toEqual(['legs']);
    expect(standLines({ ...base, load: { doneRatio: 1.0 } }).some((l) => /van \d+ gedaan/.test(l.value))).toBe(false);
  });

  it('rustdag morgen en niets morgen; zegt de grote kaart het al, dan geen regel', () => {
    expect(standLines({ ...base, tomorrow: { kind: 'rest' } })[1].value).toBe('Rustdag, wandelen mag');
    expect(standLines({ ...base, tomorrow: { kind: 'none' } })[1].value).toBe('Niets gepland');
    expect(standLines({ ...base, tomorrow: undefined })).toHaveLength(1);
  });
});

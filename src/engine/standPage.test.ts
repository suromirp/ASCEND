import { describe, expect, it } from 'vitest';
import { defaultOrder, resolveCardOrder } from './cardOrder';
import { influenceRowShown, influenceRowValue, runRowValue, standLayout, standListRows, standSentenceShown, standWarnings } from './standPage';
import { standLines } from './yourDay';
import { LOAD_JUMP } from './standing';
import { weightCardOn } from './weightCard';

// Je stand in drie blokken (docs/visie/Ontwerp Stand minimaal.md): wat waar staat. Alleen weergave.

describe('de bewaarde volgorde op regels en rijen', () => {
  it('de standaard: Benen, Belasting, Ritme bovenaan; Kracht, Lopen, Wat speelde er in de lijst', () => {
    expect(standLayout(resolveCardOrder('stand', undefined))).toEqual({ lines: ['benen', 'belasting', 'ritme'], list: ['kracht', 'lopen', 'invloed'] });
  });

  it('een bewaarde volgorde van voor de wijziging blijft gelden, zonder migratie', () => {
    // Zo stond hij in een back-up van vóór 12 november: Ritme nog als "vier-regels", Kracht onderaan.
    const saved = { stand: ['invloed', 'vier-regels', 'lopen', 'benen', 'belasting', 'kracht'] };
    expect(standLayout(resolveCardOrder('stand', saved))).toEqual({ lines: ['ritme', 'benen', 'belasting'], list: ['invloed', 'lopen', 'kracht'] });
  });

  it('Terug naar standaard geeft de standaardregels en -rijen terug', () => {
    expect(standLayout(defaultOrder('stand'))).toEqual(standLayout(resolveCardOrder('stand', undefined)));
  });

  it('een beschadigde of halve volgorde geeft toch elke regel en rij precies één keer', () => {
    const { lines, list } = standLayout(resolveCardOrder('stand', { stand: ['lopen', 'lopen', 42, 'onbekend'] }));
    expect([...lines].sort()).toEqual(['belasting', 'benen', 'ritme']);
    expect([...list].sort()).toEqual(['invloed', 'kracht', 'lopen']);
  });
});

describe('de amber stip: dezelfde grenzen als Stand en morgen op Vandaag', () => {
  const today = (legsLevel: number, doneRatio?: number) =>
    standLines({ legsWord: 'x', legsLevel, load: doneRatio === undefined ? undefined : { doneRatio }, loadJump: LOAD_JUMP });

  it('fris en in lijn: geen stip', () => {
    expect(standWarnings({ legsWord: 'Fris', legsLevel: 0, load: { doneRatio: 1 } })).toEqual({ benen: false, belasting: false, ritme: false });
  });

  it('vermoeide benen: een stip bij Benen, en op Vandaag ook', () => {
    expect(standWarnings({ legsWord: 'Vermoeid', legsLevel: 2 }).benen).toBe(true);
    expect(today(2).find((l) => l.key === 'legs')?.warn).toBe(true);
    // Wat vermoeid is nog geen let op, op beide plekken niet.
    expect(standWarnings({ legsWord: 'Wat vermoeid', legsLevel: 1 }).benen).toBe(false);
    expect(today(1).find((l) => l.key === 'legs')?.warn).toBe(false);
  });

  it('een sprong in belasting: een stip bij Belasting precies boven LOAD_JUMP, net als de regel Week op Vandaag', () => {
    for (const ratio of [LOAD_JUMP - 0.01, LOAD_JUMP, LOAD_JUMP + 0.01, 2]) {
      const onToday = today(0, ratio).some((l) => l.key === 'week' && l.warn);
      expect(standWarnings({ legsWord: 'Fris', legsLevel: 0, load: { doneRatio: ratio } }).belasting).toBe(onToday);
    }
    expect(standWarnings({ legsWord: 'Fris', legsLevel: 0, load: { doneRatio: LOAD_JUMP + 0.01 } }).belasting).toBe(true);
  });

  it('minder dan drie weken gegevens: geen verhouding, dus geen stip', () => {
    expect(standWarnings({ legsWord: 'Fris', legsLevel: 0, load: undefined }).belasting).toBe(false);
  });

  it('Ritme krijgt nooit een stip: achter is een feit, geen waarschuwing', () => {
    expect(standWarnings({ legsWord: 'Vermoeid', legsLevel: 2, load: { doneRatio: 3 } }).ritme).toBe(false);
  });
});

describe('de zin onder de titel', () => {
  it('alleen zonder een enkele training of in een rustweek', () => {
    expect(standSentenceShown({ empty: false, restWeek: false })).toBe(false);
    expect(standSentenceShown({ empty: true, restWeek: false })).toBe(true);
    expect(standSentenceShown({ empty: false, restWeek: true })).toBe(true);
  });
});

describe('de lijst', () => {
  const forge = { off: false, line: '1 oefening ging omhoog in 8 weken' };
  const all = { order: ['kracht', 'lopen', 'invloed'] as const, forge, run: 'Klimmen, beter', influence: '3 redenen vastgelegd', weight: '78,4 kg, trend' };

  it('met een doel: Kracht, Lopen, Wat speelde er in de volgorde, Gewicht onderaan, geen Je week', () => {
    expect(standListRows({ ...all, order: [...all.order] }).map((r) => r.label)).toEqual(['Kracht', 'Lopen', 'Wat speelde er', 'Gewicht']);
  });

  it('zonder doel komt Je week er als eerste rij bij', () => {
    expect(standListRows({ ...all, order: [...all.order], week: '40 van 150 minuten' })[0]).toEqual({ id: 'week', label: 'Je week', value: '40 van 150 minuten' });
  });

  it('een eigen volgorde schuift de rijen mee', () => {
    expect(standListRows({ ...all, order: ['invloed', 'kracht', 'lopen'] }).map((r) => r.id)).toEqual(['invloed', 'kracht', 'lopen', 'gewicht']);
  });

  it('een instelling uit of niets erachter: de rij is er niet', () => {
    const rows = standListRows({ order: ['kracht', 'lopen', 'invloed'], forge });
    expect(rows.map((r) => r.id)).toEqual(['kracht']);
  });

  it('geen enkele training: alleen Kracht, zodat Forge te vinden blijft', () => {
    expect(standListRows({ order: ['kracht', 'lopen', 'invloed'], forge: { off: false, line: 'Nog geen krachttrainingen ingelezen uit MacroFactor.' } })).toHaveLength(1);
  });

  it('Kracht meerekenen uit: de rij blijft, met Aanzetten', () => {
    const [kracht] = standListRows({ order: ['kracht'], forge: { off: true, line: 'Kracht meerekenen staat uit.' } });
    expect(kracht).toEqual({ id: 'kracht', label: 'Kracht', value: 'Kracht meerekenen staat uit', off: true });
  });

  it('Kracht in één regel: alleen de eerste zin van Forge', () => {
    const [kracht] = standListRows({ order: ['kracht'], forge: { off: false, line: '1 oefening ging omhoog in 8 weken. Voor je volgende training staat een voorstel klaar.' } });
    expect(kracht.value).toBe('1 oefening ging omhoog in 8 weken');
  });

  it('Wat speelde er uit in Instellingen: geen rij, ook met redenen', () => {
    expect(influenceRowShown(false, 3, true)).toBe(false);
    expect(influenceRowShown(undefined, 3, false)).toBe(true);
    expect(influenceRowShown(true, 0, false)).toBe(false);
    expect(influenceRowShown(true, 0, true)).toBe(true);
  });

  it('Gewicht op Je stand uit: geen rij', () => {
    const entries = [{ date: '2026-11-01', kg: 78.4 }, { date: '2026-11-08', kg: 78.1 }] as never;
    expect(weightCardOn(false, entries)).toBe(false);
  });

  it('de waarde van Lopen: het opvallende woord, zonder Efficiëntie', () => {
    const rows = [
      { key: 'efficiency', title: 'Efficiëntie', word: 'Beter' },
      { key: 'longDays', title: 'Lange dagen', word: 'Normaal' },
      { key: 'climbing', title: 'Klimmen', word: 'Beter' },
    ];
    expect(runRowValue(rows, false)).toBe('Klimmen, beter');
    expect(runRowValue(rows.slice(0, 2), false)).toBe('Lange dagen, normaal');
    // Alleen Efficiëntie met gegevens: dat staat al op de kaart Tempo bij zone 2.
    expect(runRowValue(rows.slice(0, 1), false)).toBeUndefined();
    expect(runRowValue([{ key: 'form', title: 'Loopvorm', word: 'Te weinig gegevens' }], true)).toBe('Tempo naast je test');
  });

  it('de waarde van Wat speelde er', () => {
    expect(influenceRowValue(1, 0)).toBe('1 reden vastgelegd');
    expect(influenceRowValue(3, 2)).toBe('3 redenen vastgelegd');
    expect(influenceRowValue(0, 2)).toBe('2 redenen met een uitkomst');
  });
});

import { describe, expect, it } from 'vitest';
import { STAND_BLOCKS, blockIndexAtY, cleanCardOrder, defaultOrder, handleLabel, isDefaultOrder, moveBlock, orderAnnouncement, resolveCardOrder } from './cardOrder';

const STD = defaultOrder('stand');
const allOnce = (order: string[]) => expect([...order].sort()).toEqual([...STD].sort());

describe('resolveCardOrder', () => {
  it('zonder instelling is de volgorde zoals de pagina altijd stond', () => {
    expect(resolveCardOrder('stand', undefined)).toEqual(['benen', 'belasting', 'kracht', 'vier-regels', 'lopen', 'invloed', 'doel']);
  });
  it('geeft de standaard bij niets', () => {
    for (const raw of [undefined, null, {}, [], 'x', 5]) expect(resolveCardOrder('stand', raw)).toEqual(STD);
  });
  it('geeft de standaard bij beschadigde invoer', () => {
    expect(resolveCardOrder('stand', { stand: 'kracht' })).toEqual(STD);
    expect(resolveCardOrder('stand', { stand: [1, 2, null, {}] })).toEqual(STD);
  });
  it('leest een geldige volgorde', () => {
    const order = ['kracht', 'benen', 'belasting', 'vier-regels', 'lopen', 'invloed', 'doel'];
    expect(resolveCardOrder('stand', { stand: order })).toEqual(order);
  });
  it('laat onbekende en dubbele id\'s vallen', () => {
    const r = resolveCardOrder('stand', { stand: ['kracht', 'bestaat-niet', 'kracht', 'benen'] });
    expect(r[0]).toBe('kracht');
    expect(r.indexOf('benen')).toBeGreaterThan(0);
    allOnce(r);
    expect(r).toHaveLength(STD.length);
  });
  it('zet een ontbrekend blok terug direct na zijn voorganger uit de standaard', () => {
    const saved = ['benen', 'belasting', 'vier-regels', 'lopen', 'invloed', 'doel'];
    const r = resolveCardOrder('stand', { stand: saved });
    expect(r).toEqual(STD);
    const saved2 = ['doel', 'benen', 'belasting', 'vier-regels', 'lopen', 'invloed'];
    const r2 = resolveCardOrder('stand', { stand: saved2 });
    expect(r2.indexOf('kracht')).toBe(r2.indexOf('belasting') + 1);
    allOnce(r2);
  });
  it('zet een ontbrekend eerste blok vooraan', () => {
    const r = resolveCardOrder('stand', { stand: ['doel'] });
    allOnce(r);
    expect(r[0]).toBe('benen');
  });
  it('zet het lucht-vlak nooit eerst', () => {
    const r = resolveCardOrder('stand', { stand: ['vier-regels', 'doel', 'benen'] });
    expect(r[0]).not.toBe('vier-regels');
    expect(r[1]).toBe('vier-regels');
    allOnce(r);
  });
});

describe('moveBlock', () => {
  it('verplaatst naar een plek', () => {
    const r = moveBlock('stand', STD, 'kracht', 0);
    expect(r[0]).toBe('kracht');
    allOnce(r);
  });
  it('verplaatst naar dezelfde plek zonder verandering', () => {
    expect(moveBlock('stand', STD, 'belasting', 1)).toEqual(STD);
  });
  it('begin en eind, ook buiten het bereik', () => {
    expect(moveBlock('stand', STD, 'benen', 99).at(-1)).toBe('benen');
    expect(moveBlock('stand', STD, 'doel', -5)[0]).toBe('doel');
  });
  it('stuurt het lucht-vlak van plek 1 naar plek 2', () => {
    const r = moveBlock('stand', STD, 'vier-regels', 0);
    expect(r[0]).not.toBe('vier-regels');
    expect(r[1]).toBe('vier-regels');
    allOnce(r);
  });
  it('laat een onbekend blok met rust', () => {
    expect(moveBlock('stand', STD, 'nee', 2)).toEqual(STD);
  });
  it('bevat altijd elk blok precies één keer', () => {
    let order = STD;
    for (let i = 0; i < 40; i += 1) order = moveBlock('stand', order, STD[(i * 3) % STD.length], (i * 5) % 9);
    allOnce(order);
    expect(STAND_BLOCKS.find((b) => b.id === order[0])?.canBeFirst).toBe(true);
  });
});

describe('blockIndexAtY', () => {
  const rects = [0, 1, 2].map((i) => ({ top: i * 52, bottom: i * 52 + 52 }));
  it('vindt de rij onder de vinger', () => {
    expect(blockIndexAtY(rects, 60)).toBe(1);
    expect(blockIndexAtY(rects, 155)).toBe(2);
  });
  it('klemt boven en onder', () => {
    expect(blockIndexAtY(rects, -30)).toBe(0);
    expect(blockIndexAtY(rects, 900)).toBe(2);
    expect(blockIndexAtY([], 5)).toBe(0);
  });
});

describe('isDefaultOrder en cleanCardOrder', () => {
  it('herkent de standaard', () => {
    expect(isDefaultOrder('stand', STD)).toBe(true);
    expect(isDefaultOrder('stand', moveBlock('stand', STD, 'doel', 0))).toBe(false);
  });
  it('houdt alleen een geldig record', () => {
    expect(cleanCardOrder({ stand: ['a', 'b'] })).toEqual({ stand: ['a', 'b'] });
    expect(cleanCardOrder({ stand: [1] })).toBeUndefined();
    expect(cleanCardOrder([])).toBeUndefined();
    expect(cleanCardOrder('x')).toBeUndefined();
    expect(cleanCardOrder({ vandaag: ['a'] })).toBeUndefined();
  });
});

describe('zinnen voor de schermlezer', () => {
  it('zegt plek en naam, zonder gedachtestreepjes', () => {
    const order = moveBlock('stand', STD, 'kracht', 1);
    expect(orderAnnouncement('stand', order, 'kracht', 'moving')).toBe('Plek 2 van 7, Kracht.');
    expect(orderAnnouncement('stand', order, 'kracht', 'dropped')).toBe('Kracht staat nu tweede.');
    expect(orderAnnouncement('stand', order, 'kracht', 'cancelled')).toBe('Kracht blijft op zijn plek.');
    expect(handleLabel('stand', order, 'kracht')).toBe('Verplaats Kracht, nu op plek 2. Spatie pakt op, pijltjes verplaatsen, spatie laat los, Escape annuleert.');
    for (const b of STAND_BLOCKS) expect(`${b.name}${b.line}`).not.toMatch(/[–—]/);
  });
});

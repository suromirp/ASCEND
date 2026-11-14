import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// De lopende training in opslag (profiel afbreker, 14 november, backlog N): bewaren, parkeren, weggooien, twee
// tabbladen en een tweede training. Nagemaakte concepten, een nep-localStorage en een nep-venster.
function fakeStorage() {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

const KEY = 'ascend.afvinkconcept.ps_di17:forge';
const OTHER = 'ascend.afvinkconcept.ps_wo18:forge';
const POINTER = 'ascend.forge.sessie';
const start = Date.parse('2026-11-17T21:30:00Z');
const row = (id: string, done: boolean, kind = 'work') => ({ id, kind, done, weightKg: 40, reps: 8 });
const draft = (over: Record<string, unknown> = {}) => ({
  v: 1,
  savedAt: start + 40 * 60_000,
  startedAt: start,
  lastActionAt: start + 40 * 60_000,
  pauses: [],
  column: 'target',
  exercises: [
    { slot: 'a', rows: [row('w1', true, 'warmup'), row('r1', true), row('r2', true), row('r3', false)] },
    { slot: 'b', rows: [row('r4', true), row('r5', false)] },
  ],
  log: [{ id: 'fe1', kind: 'spotter', exerciseId: 'bench' }],
  ...over,
});
const pointer = { key: KEY, templateId: 'tpl_upper_a', name: 'Bovenlichaam A', plannedSessionId: 'ps_di17', scheduledDate: '2026-11-17' };

let store: ReturnType<typeof fakeStorage>;
let win: EventTarget;
async function fresh() {
  vi.resetModules();
  return import('./forgeSessionStore');
}

beforeEach(() => {
  store = fakeStorage();
  win = new EventTarget();
  vi.stubGlobal('localStorage', store);
  vi.stubGlobal('sessionStorage', fakeStorage());
  vi.stubGlobal('window', win);
});
afterEach(() => vi.unstubAllGlobals());

describe('herladen en terug: het concept blijft', () => {
  it('herladen midden in een set: dezelfde sessie, met de afgevinkte werksets (geen opwarmset) en je laatste handeling', async () => {
    store.setItem(POINTER, JSON.stringify(pointer));
    store.setItem(KEY, JSON.stringify(draft()));
    const s1 = (await fresh()).readSession();
    // Een nieuwe module is een herladen app: alles komt uit opslag.
    const s2 = (await fresh()).readSession();
    expect(s2).toEqual(s1);
    expect(s2?.doneSets).toBe(3);
    expect(s2?.lastActionAt).toBe(start + 40 * 60_000);
    expect(s2?.pointer.plannedSessionId).toBe('ps_di17');
  });

  it('een concept zonder lastActionAt valt terug op savedAt; een kapot concept is geen sessie', async () => {
    store.setItem(POINTER, JSON.stringify(pointer));
    store.setItem(KEY, JSON.stringify(draft({ lastActionAt: undefined, savedAt: start + 5 * 60_000 })));
    expect((await fresh()).readSession()?.lastActionAt).toBe(start + 5 * 60_000);
    store.setItem(KEY, '{kapot');
    expect((await fresh()).readSession()).toBeUndefined();
  });
});

describe('parkSession: Verder en Afronden met een concept', () => {
  it('de stilte wordt een pauze; sets en verloop blijven precies zoals ze waren', async () => {
    store.setItem(POINTER, JSON.stringify(pointer));
    store.setItem(KEY, JSON.stringify(draft()));
    const m = await fresh();
    const morning = Date.parse('2026-11-18T08:05:00Z');
    const fired = vi.fn();
    m.subscribeSession(fired);
    expect(m.parkSession(pointer, morning)).toBe(true);
    const after = JSON.parse(store.getItem(KEY)!);
    const before = draft();
    expect(after.exercises).toEqual(before.exercises);
    expect(after.log).toEqual(before.log);
    expect(after.startedAt).toBe(start);
    expect(after.pauses).toEqual([{ from: start + 40 * 60_000, to: morning }]);
    expect(after.lastActionAt).toBe(morning);
    expect(fired).toHaveBeenCalled();
  });

  it('zonder concept verandert er niets', async () => {
    const m = await fresh();
    expect(m.parkSession(pointer, Date.now())).toBe(false);
    expect(store.getItem(KEY)).toBeNull();
  });
});

describe('discardSession: Weggooien na bevestiging', () => {
  it('alleen het concept en de wijzer van deze sessie gaan weg', async () => {
    store.setItem(POINTER, JSON.stringify(pointer));
    store.setItem(KEY, JSON.stringify(draft()));
    store.setItem(OTHER, JSON.stringify(draft()));
    store.setItem('ascend.iets.anders', 'blijft');
    const m = await fresh();
    m.discardSession(pointer);
    expect(store.getItem(KEY)).toBeNull();
    expect(store.getItem(POINTER)).toBeNull();
    expect(store.getItem(OTHER)).not.toBeNull();
    expect(store.getItem('ascend.iets.anders')).toBe('blijft');
    expect(m.readSession()).toBeUndefined();
  });
});

describe('een andere training starten terwijl er een loopt', () => {
  it('één sessie tegelijk: de tweede wijzer wordt geweigerd tot de eerste weg is', async () => {
    store.setItem(POINTER, JSON.stringify(pointer));
    store.setItem(KEY, JSON.stringify(draft()));
    const m = await fresh();
    const second = { ...pointer, key: OTHER, plannedSessionId: 'ps_wo18', scheduledDate: '2026-11-18' };
    expect(m.writeSessionPointer(second)).toBe(false);
    expect(m.readPointer()?.key).toBe(KEY);
    m.discardSession(pointer);
    expect(m.writeSessionPointer(second)).toBe(true);
    expect(m.readPointer()?.key).toBe(OTHER);
  });
});

describe('twee tabbladen', () => {
  it('een ander tabblad dat afvinkt of weggooit, komt hier binnen via het storage-event', async () => {
    store.setItem(POINTER, JSON.stringify(pointer));
    store.setItem(KEY, JSON.stringify(draft()));
    const m = await fresh();
    const fired = vi.fn();
    m.subscribeSession(fired);
    expect(m.readSession()?.doneSets).toBe(3);
    // Het andere tabblad vinkt een set af.
    const more = draft();
    more.exercises[0].rows[3].done = true;
    store.setItem(KEY, JSON.stringify(more));
    win.dispatchEvent(Object.assign(new Event('storage'), { key: KEY }));
    expect(fired).toHaveBeenCalledTimes(1);
    expect(m.readSession()?.doneSets).toBe(4);
    // Het andere tabblad gooit de training weg.
    store.removeItem(KEY);
    store.removeItem(POINTER);
    win.dispatchEvent(Object.assign(new Event('storage'), { key: POINTER }));
    expect(fired).toHaveBeenCalledTimes(2);
    expect(m.readSession()).toBeUndefined();
    // Een ander sleutel van de app laat de pil met rust.
    win.dispatchEvent(Object.assign(new Event('storage'), { key: 'ascend.iets.anders' }));
    expect(fired).toHaveBeenCalledTimes(2);
  });
});

describe('openen op Afronden', () => {
  it('requestOpenSession("finish") opent Forge op het afrondblad; een gewoon verzoek niet', async () => {
    const m = await fresh();
    m.requestOpenSession('finish');
    expect(m.openRequestSnapshot()).toBe(true);
    expect(m.openRequestFinishes()).toBe(true);
    m.clearOpenRequest();
    expect(m.openRequestFinishes()).toBe(false);
    m.requestOpenSession();
    expect(m.openRequestFinishes()).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import type { RouteProposal } from '../models/route';
import type { RoutePlans } from './routePlanner';
import { NO_ADJUST, type LoopAdjust } from './routeAdjust';
import { INITIAL_SEARCH_STATE, MEMORY_SIZE, answerFor, currentAdjust, failLineFor, needsSearch, pendingStale, searchKey, searchReducer, type SearchEvent, type SearchState } from './routeSearchState';

// Nagemaakte lussen: alleen de vorm telt hier.
const loop = (distanceM: number): RouteProposal => ({ style: 'adventure', source: 'brouter', points: [{ lat: 52.1, lon: 5.9 }, { lat: 52.11, lon: 5.9 }], distanceM, ascentM: 40, repeatedShare: 0 });
const plans = (km: number, adventureOk = true): RoutePlans => ({
  adventure: adventureOk ? { ok: true, proposal: loop(km * 1000) } : { ok: false, reason: 'nothing' },
  simple: { ok: true, proposal: { ...loop(km * 1000), style: 'simple' } },
});

const BASE = '52.1|5.9|10|40';
const KB = '0|52.1|5.9';
const LONGER: LoopAdjust = { ...NO_ADJUST, deltaKm: 1 };
const K0 = searchKey(KB, NO_ADJUST);
const K1 = searchKey(KB, LONGER);

const run = (events: SearchEvent[], from: SearchState = INITIAL_SEARCH_STATE) => events.reduce(searchReducer, from);
// De lus van de training staat er: 10 km, gelukt.
const ready = run([{ type: 'answer', key: K0, answer: { kind: 'plans', plans: plans(10) }, currentKey: K0 }]);
const longer = (s: SearchState) => run([{ type: 'adjust', base: BASE, attempt: 0, keyBase: KB, next: LONGER, action: 'longer', style: 'adventure' }], s);

describe('nooit zoeken voor een sleutel die er al is', () => {
  it('een gelukt antwoord staat in het geheugen: geen nieuwe zoektocht voor die sleutel', () => {
    expect(needsSearch(ready, K0)).toBe(false);
  });
  it('een mislukt antwoord (geen netwerk) voor de sleutel van nu: ook niet vanzelf opnieuw', () => {
    const s = run([{ type: 'answer', key: K0, answer: { kind: 'offline' }, currentKey: K0 }]);
    expect(answerFor(s, K0)).toEqual({ kind: 'offline' });
    expect(needsSearch(s, K0)).toBe(false);
    // Opnieuw zoeken is een nieuwe poging: een nieuwe sleutel.
    expect(needsSearch(s, searchKey('1|52.1|5.9', NO_ADJUST))).toBe(true);
  });
});

describe('een bijsturing die niet lukt', () => {
  it('offline: terug naar de lus die er was, met de regel; de oude sleutel zoekt niet opnieuw', () => {
    const s = run([{ type: 'answer', key: K1, answer: { kind: 'offline' }, currentKey: K1 }], longer(ready));
    expect(currentAdjust(s, BASE)).toEqual(NO_ADJUST);
    // De regel hoort bij de lus die er weer staat; bij een andere poging zwijgt hij.
    expect(failLineFor(s, searchKey('1|52.1|5.9', NO_ADJUST))).toBe('');
    expect(failLineFor(s, K0)).toBe('Zonder netwerk kan de lus niet bijgestuurd worden. De lus blijft zoals hij was.');
    expect(needsSearch(s, K0)).toBe(false);
    expect(answerFor(s, K0)).toEqual({ kind: 'plans', plans: plans(10) });
  });

  it('time-out, en het antwoord dat daarna nog binnenkomt: telt niet, de lus blijft de oude', () => {
    const back = run([{ type: 'answer', key: K1, answer: { kind: 'timeout' }, currentKey: K1 }], longer(ready));
    expect(back.failLine).toBe('De routeplanner antwoordde niet op tijd. De lus blijft zoals hij was.');
    // Na de terugval geldt K0 weer; een laat antwoord voor K1 of K0 verandert niets.
    const late = run([
      { type: 'answer', key: K1, answer: { kind: 'plans', plans: plans(8.4) }, currentKey: K0 },
      { type: 'answer', key: 'oud', answer: { kind: 'timeout' }, currentKey: K0 },
    ], back);
    expect(late).toEqual(back);
    expect(answerFor(late, K0)).toEqual({ kind: 'plans', plans: plans(10) });
  });

  it('het enige pad: de bijgestuurde lus kwam er niet, terug met de regel', () => {
    const avoid: LoopAdjust = { ...NO_ADJUST, avoid: [{ lat: 52.105, lon: 5.9, radiusM: 100 }] };
    const KA = searchKey(KB, avoid);
    const s = run([
      { type: 'adjust', base: BASE, attempt: 0, keyBase: KB, next: avoid, action: 'avoid', style: 'adventure' },
      { type: 'answer', key: KA, answer: { kind: 'plans', plans: plans(10, false) }, currentKey: KA },
    ], ready);
    expect(currentAdjust(s, BASE)).toEqual(NO_ADJUST);
    expect(s.failLine).toBe('Om dit stuk ligt geen andere weg. De lus blijft zoals hij was.');
    // Een mislukte bijsturing laat niets achter in het geheugen.
    expect(needsSearch(s, KA)).toBe(true);
  });

  it('een tweede tik na een fout zoekt echt opnieuw, en lukt die, dan blijft hij', () => {
    const failed = run([{ type: 'answer', key: K1, answer: { kind: 'offline' }, currentKey: K1 }], longer(ready));
    const again = longer(failed);
    expect(again.failLine).toBe('');
    expect(needsSearch(again, K1)).toBe(true);
    const ok = run([{ type: 'answer', key: K1, answer: { kind: 'plans', plans: plans(11) }, currentKey: K1 }], again);
    expect(currentAdjust(ok, BASE)).toEqual(LONGER);
    expect(ok.pending).toBeUndefined();
    expect(needsSearch(ok, K1)).toBe(false);
  });

  it('een bijsturing die al eens lukte, staat er meteen weer, zonder zoektocht', () => {
    const ok = run([{ type: 'answer', key: K1, answer: { kind: 'plans', plans: plans(11) }, currentKey: K1 }], longer(ready));
    const back = run([{ type: 'reset', base: BASE }], ok);
    const again = longer(back);
    expect(again.pending).toBeUndefined();
    expect(currentAdjust(again, BASE)).toEqual(LONGER);
  });
});

describe('ander startpunt tijdens het zoeken', () => {
  it('de bijsturing vervalt zonder regel; bij dat startpunt geldt weer wat ervoor gold', () => {
    const s = longer(ready);
    expect(pendingStale(s, BASE, 0)).toBe(false);
    expect(pendingStale(s, 'ander|punt', 0)).toBe(true);
    expect(pendingStale(s, BASE, 1)).toBe(true);
    const dropped = run([{ type: 'drop' }], s);
    expect(dropped.pending).toBeUndefined();
    expect(dropped.failLine).toBe('');
    expect(currentAdjust(dropped, BASE)).toEqual(NO_ADJUST);
    // Bij het nieuwe startpunt begint alles bij de training.
    expect(currentAdjust(dropped, 'ander|punt')).toEqual(NO_ADJUST);
  });
});

describe('het antwoord van de training en een tweede tik', () => {
  it('na vijf keer Langer staat de lus van de training er nog: Zoals je training zoekt niet opnieuw', () => {
    let s = ready;
    for (let d = 1; d <= MEMORY_SIZE + 1; d++) {
      const next: LoopAdjust = { ...NO_ADJUST, deltaKm: d };
      s = run([
        { type: 'adjust', base: BASE, attempt: 0, keyBase: KB, next, action: 'longer', style: 'adventure' },
        { type: 'answer', key: searchKey(KB, next), answer: { kind: 'plans', plans: plans(10 + d) }, currentKey: searchKey(KB, next) },
      ], s);
    }
    expect(s.memory.length).toBeLessThanOrEqual(MEMORY_SIZE);
    const back = run([{ type: 'reset', base: BASE }], s);
    expect(needsSearch(back, K0)).toBe(false);
  });

  it('een tweede tik terwijl de eerste nog zoekt: mislukt die, dan terug naar wat er voor de eerste gold', () => {
    const LONGER2: LoopAdjust = { ...NO_ADJUST, deltaKm: 2 };
    const K2 = searchKey(KB, LONGER2);
    const s = run([
      { type: 'adjust', base: BASE, attempt: 0, keyBase: KB, next: LONGER, action: 'longer', style: 'adventure' },
      { type: 'adjust', base: BASE, attempt: 0, keyBase: KB, next: LONGER2, action: 'longer', style: 'adventure' },
      { type: 'answer', key: K2, answer: { kind: 'offline' }, currentKey: K2 },
    ], ready);
    expect(currentAdjust(s, BASE)).toEqual(NO_ADJUST);
    expect(failLineFor(s, K0)).toBe('Zonder netwerk kan de lus niet bijgestuurd worden. De lus blijft zoals hij was.');
  });

  it('een andere start na een mislukte bijsturing: de regel staat niet onder de andere lus', () => {
    const failed = run([{ type: 'answer', key: K1, answer: { kind: 'offline' }, currentKey: K1 }], longer(ready));
    expect(failLineFor(failed, searchKey('0|52.2|5.8', NO_ADJUST))).toBe('');
  });
});

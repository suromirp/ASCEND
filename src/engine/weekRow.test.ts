import { describe, expect, it } from 'vitest';
import { doneOnOtherDay, rowExtra } from './weekRow';

// De tweede regel van een dagrij in Week: hoogstens één ding, in een vaste rang (Ontwerp Week minimaal, hoofdstuk 5).
describe('het ene ding in de tweede regel', () => {
  it('vijf dingen tegelijk: alleen het punt uit Let op, als waarschuwing', () => {
    expect(rowExtra({ concern: '1 dag voor Lange duurloop', moved: true, movedFrom: '2026-11-11', fixed: true, legs: true, pairNote: 'bewust na een rustige loop' }))
      .toEqual({ text: '1 dag voor Lange duurloop', warn: true });
  });

  it('"aangepast" staat er altijd als er een regel is, ook naast een punt uit Let op (het getal op de rij)', () => {
    expect(rowExtra({ concern: 'op je rustdag', adjusted: true })).toEqual({ text: 'op je rustdag', warn: true, also: 'aangepast' });
    // Gemist met een greep heeft geen teken rechts: gemist voorop, aangepast erbij (Warden, 15 november).
    expect(rowExtra({ missed: true, adjusted: true })).toEqual({ text: 'gemist', warn: false, also: 'aangepast' });
  });

  it('daarna de rang: aangepast, verplaatst van, vaste afspraak, zware benen, het toegestane paar; stil, zonder kleur', () => {
    expect(rowExtra({ catchNote: 'verplaatst van wo 28', legs: true })).toEqual({ text: 'verplaatst van wo 28', warn: false, tail: 'wo 28' });
    expect(rowExtra({ adjusted: true, moved: true, fixed: true })).toEqual({ text: 'aangepast', warn: false });
    expect(rowExtra({ moved: true, movedFrom: '2026-11-11', fixed: true })).toEqual({ text: 'verplaatst van wo 11', warn: false, tail: 'wo 11' });
    expect(rowExtra({ moved: true })?.text).toBe('verplaatst');
    expect(rowExtra({ fixed: true, legs: true })?.text).toBe('vaste afspraak');
    expect(rowExtra({ legs: true, pairNote: 'p' })?.text).toBe('zware benen');
    expect(rowExtra({ pairNote: 'bewust na een rustige loop' })?.text).toBe('bewust na een rustige loop');
    expect(rowExtra({})).toBeUndefined();
  });

  it('gedaan: geen "verplaatst" meer, wel "aangepast"', () => {
    expect(rowExtra({ done: true, moved: true, catchNote: 'verplaatst van wo 28' })).toBeUndefined();
    expect(rowExtra({ done: true, adjusted: true })?.text).toBe('aangepast');
  });

  it('gemist met greep: het woord gemist, voor de rest', () => {
    expect(rowExtra({ missed: true, legs: true })).toEqual({ text: 'gemist', warn: false });
    expect(rowExtra({ missed: true, concern: 'c' })?.warn).toBe(true);
  });
});

// Een training op een andere dag gedaan dan gepland telt in Week op de geplande dag; de rij zegt waar hij gedaan is
// (Pathfinder, 15 november, I-43).
describe('gedaan op een andere dag', () => {
  const session = { id: 'p1', scheduledDate: '2026-11-12' };

  it('de rij zegt "gedaan vr 13", met de dag als vaste staart', () => {
    expect(rowExtra({ done: true, doneOn: 'vr 13', legs: true, fixed: true })).toEqual({ text: 'gedaan vr 13', warn: false, tail: 'vr 13' });
    expect(rowExtra({ done: true, doneOn: 'vr 13', adjusted: true })).toEqual({ text: 'gedaan vr 13', warn: false, tail: 'vr 13', also: 'aangepast' });
    expect(rowExtra({ done: true, doneOn: 'vr 6 nov' })).toEqual({ text: 'gedaan vr 6 nov', warn: false, tail: 'vr 6 nov' });
    expect(rowExtra({ done: true, doneOn: 'vr 13', concern: 'c' })?.warn).toBe(true);
    // Alleen als hij gedaan is: een open rij met een oude dag zegt niets over gedaan.
    expect(rowExtra({ doneOn: 'vr 13' })).toBeUndefined();
  });

  it('dezelfde dag als in de grafiek: een log van een andere dag wel, dezelfde dag en MacroFactor over middernacht niet', () => {
    expect(doneOnOtherDay(session, { completedDate: '2026-11-13', plannedSessionId: 'p1', source: 'manual' })).toBe('vr 13');
    expect(doneOnOtherDay(session, { completedDate: '2026-11-10', plannedSessionId: 'p1', source: 'garmin' })).toBe('di 10');
    // Zes dagen weg nog zonder maand, zeven dagen en verder met: achteraf gekoppeld leest anders als dezelfde week.
    expect(doneOnOtherDay(session, { completedDate: '2026-11-18', plannedSessionId: 'p1', source: 'manual' })).toBe('wo 18');
    expect(doneOnOtherDay(session, { completedDate: '2026-11-19', plannedSessionId: 'p1', source: 'manual' })).toBe('do 19 nov');
    expect(doneOnOtherDay(session, { completedDate: '2026-10-12', plannedSessionId: 'p1', source: 'manual' })).toBe('ma 12 okt');
    expect(doneOnOtherDay(session, { completedDate: '2026-11-12', plannedSessionId: 'p1', source: 'manual' })).toBeUndefined();
    expect(doneOnOtherDay(session, { completedDate: '2026-11-11', plannedSessionId: 'p1', source: 'macrofactor' })).toBeUndefined();
    expect(doneOnOtherDay(session, undefined)).toBeUndefined();
  });
});

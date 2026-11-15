import { describe, expect, it } from 'vitest';
import { BRIEFING_RETURN_MS, briefingReturnFor, type BriefingReturn } from './briefingReturn';

const AT = 1_000_000;
const MARK: BriefingReturn = { origin: 'sheet', templateId: 'tpl-run', date: '2026-11-15', sessionId: 'ps-1', path: '/week', at: AT };
const here = (over: Partial<Parameters<typeof briefingReturnFor>[1]> = {}) => ({ path: '/week', back: true, now: AT + 60_000, origin: 'sheet' as const, ...over });

describe('briefingReturnFor: Terug vanaf de pagina opent de Briefing weer (I-37)', () => {
  it('terug op dezelfde pagina binnen een half uur: de Briefing gaat open', () => {
    expect(briefingReturnFor(MARK, here())).toEqual({ open: MARK, keep: false });
  });
  it('geen stap terug (de tabbalk, een link): niet openen, en het merkteken is op', () => {
    expect(briefingReturnFor(MARK, here({ back: false }))).toEqual({ open: undefined, keep: false });
  });
  it('een andere pagina, te lang weg of een klok die terugsprong: niet openen', () => {
    expect(briefingReturnFor(MARK, here({ path: '/' })).open).toBeUndefined();
    expect(briefingReturnFor(MARK, here({ now: AT + BRIEFING_RETURN_MS + 1 })).open).toBeUndefined();
    expect(briefingReturnFor(MARK, here({ now: AT - 1 })).open).toBeUndefined();
  });
  it('een andere laag op dezelfde pagina laat het merkteken liggen voor de juiste laag', () => {
    expect(briefingReturnFor(MARK, here({ origin: 'mission' }))).toEqual({ open: undefined, keep: true });
  });
  it('het blad van een training zonder geplande training kan niet open', () => {
    expect(briefingReturnFor({ ...MARK, sessionId: undefined }, here()).open).toBeUndefined();
  });
  it('geen merkteken: niets', () => {
    expect(briefingReturnFor(undefined, here())).toEqual({ open: undefined, keep: false });
  });
});


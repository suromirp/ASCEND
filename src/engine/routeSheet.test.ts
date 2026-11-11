import { describe, expect, it } from 'vitest';
import type { RouteProposal, RouteTarget } from '../models/route';
import { proposalNotes } from './routePlanner';
import { ROUTE_MAP_HEIGHT, loopLines, mapFallbackLine, pickTransition, routeSheetParts, routeSheetStage, type StageInput } from './routeSheet';

const base: StageInput = { hasPlace: true, consent: true, asked: true, savedKnown: true, waitingForPoint: false, search: { kind: 'plans' } };
const target: RouteTarget = { distanceKm: 10, ascentM: 200 };
const loop = (over: Partial<RouteProposal> = {}): RouteProposal => ({ style: 'adventure', source: 'brouter', points: [], distanceM: 10_000, ascentM: 210, repeatedShare: 0, hills: 2, ...over });

describe('het blad Route: de stand', () => {
  it('eerste keer (nog geen keuze voor het startpunt): de bestaande eerste vraag', () => {
    expect(routeSheetStage({ ...base, asked: false })).toBe('first-question');
    // Nog geen ja: ook de eerste vraag, nooit zoeken.
    expect(routeSheetStage({ ...base, consent: false, asked: false })).toBe('first-question');
  });
  it('zolang de toestemming of het startpunt gelezen wordt: lezen, geen zoektocht', () => {
    expect(routeSheetStage({ ...base, consent: undefined, asked: false })).toBe('reading');
    expect(routeSheetStage({ ...base, savedKnown: false })).toBe('reading');
  });
  it('geen plaats: de bestaande regel, voor al het andere', () => {
    expect(routeSheetStage({ ...base, hasPlace: false, consent: undefined })).toBe('no-place');
  });
  it('vast punt zonder punt vraagt eerst een punt', () => {
    expect(routeSheetStage({ ...base, waitingForPoint: true })).toBe('needs-point');
  });
  it('geen netwerk of een routeplanner die te laat is: een eigen stand', () => {
    expect(routeSheetStage({ ...base, search: { kind: 'offline' } })).toBe('offline');
    expect(routeSheetStage({ ...base, search: { kind: 'timeout' } })).toBe('timeout');
    expect(routeSheetStage({ ...base, search: 'busy' })).toBe('searching');
  });
});

describe('het blad Route: de volgorde', () => {
  it('de kaart bovenaan, dan de gekozen lus met de hoofdknop, dan de lussen als rijen', () => {
    const parts = routeSheetParts('plans', { anyOk: true, anyFailed: false });
    expect(parts.slice(0, 3)).toEqual(['map', 'chosen', 'loops']);
    expect(parts).not.toContain('retry');
    expect(parts.at(-1)).toBe('sources');
  });
  it('een lus die mislukte: Opnieuw zoeken, onder de rijen', () => {
    const parts = routeSheetParts('plans', { anyOk: true, anyFailed: true });
    expect(parts.indexOf('retry')).toBeGreaterThan(parts.indexOf('loops'));
  });
  it('geen enkele lus: de kaart met je start en de rijen als tekst, geen gekozen lus', () => {
    expect(routeSheetParts('plans', { anyOk: false, anyFailed: true })).toEqual(['map', 'loops', 'found', 'retry', 'sources']);
  });
  it('geen netwerk of planner te laat: alleen het vak op de plek van de kaart (met Opnieuw zoeken)', () => {
    expect(routeSheetParts('offline')).toEqual(['failure']);
    expect(routeSheetParts('timeout')).toEqual(['failure']);
  });
  it('zoeken: alleen de zoekstand, met dezelfde vaste hoogte als de kaart', () => {
    expect(routeSheetParts('searching')).toEqual(['searching']);
    expect(ROUTE_MAP_HEIGHT).toMatch(/^clamp\(\d+px, \d+vh, 340px\)$/);
  });
  it('eerste keer en lezen: geen kaart', () => {
    expect(routeSheetParts('first-question')).toEqual([]);
    expect(routeSheetParts('reading')).toEqual([]);
  });
});

describe('het blad Route: kaart kan niet tekenen', () => {
  it('zegt het en wijst naar de lussen als tekst', () => {
    expect(mapFallbackLine('unsupported', true)).toBe('Deze telefoon kan de kaart niet tekenen. De lussen staan hieronder.');
    expect(mapFallbackLine('failed', true)).toBe('De kaart kon niet laden. De lussen staan hieronder.');
    expect(mapFallbackLine('failed', false)).toBe('De kaart kon niet laden.');
  });
});

describe('het blad Route: meldingen in amber', () => {
  it('een te korte lus zegt dat in een eigen regel als melding', () => {
    const p = loop({ distanceM: 8_500 });
    const { warn, info } = loopLines(p, target, proposalNotes(p, target));
    expect(warn).toEqual(['8,5 km, korter dan de 10 km van je training.']);
    expect(info).toEqual([]);
  });
  it('te weinig hoogtemeters: de melding van de lus zelf', () => {
    const p = loop({ ascentM: 60, notice: 'Deze lus stijgt 60 m; de training vraagt 200 m.' });
    const { warn } = loopLines(p, target, proposalNotes(p, target));
    expect(warn).toEqual(['Deze lus stijgt 60 m; de training vraagt 200 m.']);
  });
  it('uitleg blijft uitleg', () => {
    const p = loop({ repeatedShare: 0.3, distanceM: 9_600 });
    const { warn, info } = loopLines(p, target, proposalNotes(p, target));
    expect(warn).toEqual([]);
    expect(info).toContain('Een deel loop je twee keer.');
  });
});

describe('het blad Route: Beweging', () => {
  it('een andere lus kiezen beweegt 150 ms in Vol en staat in Rustig en Uit meteen goed', () => {
    expect(pickTransition('full')).toContain('150ms ease-out');
    expect(pickTransition('calm')).toBe('none');
    expect(pickTransition('off')).toBe('none');
  });
});

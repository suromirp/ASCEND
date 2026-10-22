import { describe, it, expect } from 'vitest';
import { buildDepartureLetter, letterGaps } from './departureLetter';
import { buildItinerary } from './routePlan';
import { EMPTY_ROUTE_PLAN, EMPTY_SOLO_PLAN, type RoutePlan, type SoloPlan } from '../models/routePlan';
import { GR5_STAGES } from '../data/gr5Stages';

// Nagemaakte gegevens: niets hier hoort bij een echt persoon.
const plan: RoutePlan = { choices: { t1e1: { sleep: 'tent' }, t1e2: { sleep: 'bivak', restAfter: true }, t1e3: { sleep: 'gite' } }, updatedAt: 'x' };
const solo: SoloPlan = { who: 'Sam', checkInTime: '20:00', ifMissing: 'bel me na twee uur en na zes uur 112', satellite: 'ja', satelliteNote: 'een inReach', gear: 'groene tent, oranje rugzak', updatedAt: 'x' };

describe('vertrekbrief', () => {
  const days = buildItinerary(plan, '2027-08-01');
  const letter = buildDepartureLetter(days, solo);

  it('noemt route, data en slaapplekken per dag', () => {
    expect(letter).toContain('Hoi Sam,');
    expect(letter).toContain('Ik start op zo 1 augustus 2027 in Saint-Gingolph en kom aan in Nice op');
    expect(letter).toContain('- zo 1 augustus: Saint-Gingolph naar chalets de Bise (12 km, 1.701 m omhoog), slaapplek: tent');
    expect(letter).toContain('- ma 2 augustus: chalets de Bise naar refuge de Trébentaz (12,8 km, 1.171 m omhoog), slaapplek: bivak bij refuge');
    expect(letter).toContain('- di 3 augustus: rustdag in refuge de Trébentaz, slaapplek: bivak bij refuge');
    expect(letter).toContain('- wo 4 augustus: refuge de Trébentaz naar refuge de Chésery');
  });

  it('noemt uitrusting, afspraak, satelliet en alarmnummers', () => {
    expect(letter).toContain('groene tent, oranje rugzak');
    expect(letter).toContain('Elke dag rond 20:00 stuur ik je een bericht');
    expect(letter).toContain('Komt mijn bericht niet: bel me na twee uur en na zes uur 112');
    expect(letter).toContain('Ik heb een satellietcommunicator bij me: een inReach.');
    expect(letter).toContain('bel je 112');
    expect(letter).toContain('sms naar 114');
    expect(letter).toContain('alarmeert niemand');
  });

  it('zegt eerlijk wat nog open is', () => {
    const empty = buildDepartureLetter(buildItinerary(EMPTY_ROUTE_PLAN), EMPTY_SOLO_PLAN);
    expect(empty).toContain('Hoi,');
    expect(empty).toContain('De datums volgen nog.');
    expect(empty).toContain('Dag 1: Saint-Gingolph naar chalets de Bise');
    expect(empty).toContain('slaapplek nog niet gekozen');
    expect(empty).toContain('Het tijdstip van mijn dagelijkse bericht volgt nog.');
    expect(empty).toContain('vul ik nog in');
  });

  it('beschrijft een tocht zonder satellietcommunicator', () => {
    expect(buildDepartureLetter(days, { ...solo, satellite: 'nee', satelliteNote: '' })).toContain('Ik heb geen satellietcommunicator bij me.');
  });

  it('bevat geen gedachtestreepjes', () => {
    expect(letter).not.toMatch(/[–—]/);
  });

  it('somt op wat nog ontbreekt', () => {
    expect(letterGaps(EMPTY_SOLO_PLAN, buildItinerary(EMPTY_ROUTE_PLAN))).toEqual([
      'voor wie de brief is',
      'hoe laat je elke dag een bericht stuurt',
      'wat thuis doet als je bericht uitblijft',
      'of je een satellietcommunicator meeneemt',
      'hoe men jou en je tent herkent',
      'de startdatum van je tocht',
      'een slaapplek bij elke dag',
    ]);
    const everywhere: RoutePlan = { choices: Object.fromEntries(GR5_STAGES.map((s) => [s.id, { sleep: 'tent' as const }])), updatedAt: 'x' };
    expect(letterGaps(solo, buildItinerary(everywhere, '2027-08-01'))).toEqual([]);
  });
});

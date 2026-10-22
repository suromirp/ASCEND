import { describe, expect, it } from 'vitest';
import { emptyCounts, openProposals, runProgressLabel, runStoppedMessage, runSummary, type ReadyProposal } from './macrofactorRun';

const row = (id: string): ReadyProposal => ({ kind: 'enrich', workout: { externalId: id } } as unknown as ReadyProposal);

describe('de rijen die nog open staan', () => {
  it('laat weg wat deze ronde al deed, ook als de app de nieuwe stand nog niet heeft gelezen', () => {
    const ready = [row('a'), row('b'), row('c')];
    expect(openProposals(ready, ['b']).map((p) => p.workout.externalId)).toEqual(['a', 'c']);
    expect(openProposals(ready, [])).toBe(ready);
  });
});

describe('de woorden', () => {
  it('voortgang op de knop', () => {
    expect(runProgressLabel(3, 10)).toBe('3 van 10 verwerkt');
  });

  it('een duidelijke uitkomst', () => {
    expect(runSummary({ ...emptyCounts(), enriched: 10, enrichedWhat: ['de herhalingen in reserve en de opwarmsets'] }, true)).toBe(
      'Verwerkt: 10 aangevuld met de herhalingen in reserve en de opwarmsets.',
    );
    expect(runSummary({ ...emptyCounts(1), created: 2, changed: 1, failed: 1 }, true)).toBe('Verwerkt: 2 nieuw opgeslagen en 1 bijgewerkt met MacroFactor. 1 lukte niet. 1 liet je liggen.');
    expect(runSummary({ ...emptyCounts(), changed: 1 }, false)).toBe('Verwerkt: 1 aangevuld.');
  });

  it('wat al gedaan was, heet geen fout', () => {
    expect(runSummary({ ...emptyCounts(), already: 3 }, true)).toBe('Alles was al verwerkt.');
    expect(runSummary({ ...emptyCounts(), enriched: 1, enrichedWhat: ['de opwarmsets'], already: 2 }, true)).toBe('Verwerkt: 1 aangevuld met de opwarmsets. 2 waren al verwerkt.');
  });

  it('een eerlijke melding als het stopt', () => {
    expect(runStoppedMessage(3, 10, 'timeout')).toContain('(3 van 10), blijft bewaard');
    expect(runStoppedMessage(0, 10, 'error')).toContain('Er is niets veranderd.');
  });

  it('zonder gedachtestreepjes', () => {
    const all = [runSummary({ ...emptyCounts(2), created: 1, already: 1, failed: 1 }, true), runStoppedMessage(1, 2, 'timeout'), runStoppedMessage(0, 2, 'error')].join(' ');
    expect(all).not.toMatch(new RegExp('[\\u2013\\u2014]'));
  });
});

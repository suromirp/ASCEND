import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// Tempo bij zone 2 zonder één loop met details: de lege regel staat op de hoogte van de grafiek, zodat er op
// Je stand niets verspringt als de eerste stip er is (docs/visie/Ontwerp Stand minimaal.md, blok 2).
vi.mock('../../state/AppDataContext', () => ({ useAppData: () => ({ sessionLogs: [], templates: [], program: undefined, settings: {} }) }));
vi.mock('../influence/useExcludedLogIds', () => ({ useExcludedLogIds: () => new Set<string>() }));

const { AerobicTrendCard } = await import('../AerobicTrendCard');
const { ZONE2_CHART_H } = await import('./Zone2WeekChart');

describe('Tempo bij zone 2 zonder loop', () => {
  it('de lege regel op dezelfde hoogte als de grafiek', () => {
    const html = renderToStaticMarkup(createElement(AerobicTrendCard));
    expect(html).toContain('Nog geen loopjes. Elke week met een loop wordt hier een stip.');
    expect(html).toContain('data-zone2-empty');
    expect(html).toContain(`min-height:${ZONE2_CHART_H}px`);
  });
});

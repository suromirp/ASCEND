import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { RouteProposal, RouteTarget } from '../models/route';
import { ChosenLoop, RouteFailure } from './RoutePanel';
import { OFFLINE_LINE, ROUTE_MAP_HEIGHT, TIMEOUT_LINE } from '../engine/routeSheet';

// Het blad Route echt gerenderd (zonder DOM: de eerste render, zoals de server hem zou maken).
const target: RouteTarget = { distanceKm: 10, ascentM: 200 };
const loop = (over: Partial<RouteProposal> = {}): RouteProposal => ({ style: 'adventure', source: 'brouter', points: [{ lat: 0, lon: 0 }, { lat: 0.01, lon: 0 }], distanceM: 10_000, ascentM: 210, repeatedShare: 0, hills: 2, ...over });
const chosen = (p: RouteProposal, sender = false) => renderToStaticMarkup(createElement(ChosenLoop, { style: p.style, proposal: p, date: '2026-11-12', target, sender: sender ? ({ send: async () => ({ kind: 'offered' }) } as never) : null }));
const amber = (html: string) => [...html.matchAll(/<p[^>]*color:var\(--color-warning\)[^>]*>([^<]*)<\/p>/g)].map((m) => m[1]);

describe('het blad Route, gerenderd', () => {
  it('de gekozen lus: afstand en hoogtemeters, dan de hoofdknop; zonder melding geen amber', () => {
    const html = chosen(loop());
    expect(html).toContain('10 km · 210 hoogtemeters');
    expect(html.indexOf('hoogtemeters')).toBeLessThan(html.indexOf('mx-primary'));
    expect(html).toMatch(/mx-primary[^>]*>GPX downloaden</);
    expect(amber(html)).toEqual([]);
  });
  it('met een weg naar Garmin Connect is dat de hoofdknop en GPX downloaden een tekstknop', () => {
    const html = chosen(loop(), true);
    expect(html).toMatch(/mx-primary[^>]*>Naar Garmin Connect</);
    expect(html).toContain('>GPX downloaden<');
  });
  it('een te korte lus: de melding in amber, in een eigen regel', () => {
    expect(amber(chosen(loop({ distanceM: 8_500 })))).toEqual(['8,5 km, korter dan de 10 km van je training.']);
  });
  it('te weinig hoogtemeters: de melding van de lus in amber', () => {
    const notice = 'Deze lus stijgt 60 m; de training vraagt 200 m.';
    expect(amber(chosen(loop({ ascentM: 60, notice })))).toEqual([notice]);
  });
  it('geen netwerk en planner te laat: de regel en Opnieuw zoeken op de plek van de kaart, met de vaste hoogte', () => {
    for (const [kind, line] of [['offline', OFFLINE_LINE], ['timeout', TIMEOUT_LINE]] as const) {
      const html = renderToStaticMarkup(createElement(RouteFailure, { kind, onRetry: () => undefined }));
      expect(html).toContain(line);
      expect(html).toContain('>Opnieuw zoeken<');
      expect(html).toContain(`height:${ROUTE_MAP_HEIGHT}`);
    }
  });
});

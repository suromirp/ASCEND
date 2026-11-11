import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { RouteProposal, RouteTarget } from '../models/route';
import { ChosenLoop, LoopRow, RouteFailure } from './RoutePanel';
import { OFFLINE_LINE, ROUTE_MAP_HEIGHT, TIMEOUT_LINE } from '../engine/routeSheet';

// Het blad Route echt gerenderd (zonder DOM: de eerste render, zoals de server hem zou maken).
const target: RouteTarget = { distanceKm: 10, ascentM: 200 };
const loop = (over: Partial<RouteProposal> = {}): RouteProposal => ({ style: 'adventure', source: 'brouter', points: [{ lat: 0, lon: 0 }, { lat: 0.01, lon: 0 }], distanceM: 10_000, ascentM: 210, repeatedShare: 0, hills: 2, ...over });
const chosen = (p: RouteProposal, sender = false) => renderToStaticMarkup(createElement(ChosenLoop, { style: p.style, proposal: p, date: '2026-11-12', target, sender: sender ? ({ send: async () => ({ kind: 'offered' }) } as never) : null }));
const amber = (html: string) => [...html.matchAll(/<(?:p|span)[^>]*color:var\(--color-warning\)[^>]*>([^<]*)<\/(?:p|span)>/g)].map((m) => m[1]);
const row = (p: RouteProposal, picked = false, motion: 'full' | 'calm' | 'off' = 'full') => renderToStaticMarkup(createElement(LoopRow, { style: p.style, outcome: { ok: true, proposal: p }, picked, onMap: true, target, motion, onChoose: () => undefined }));

describe('het blad Route, gerenderd', () => {
  it('onder de rijen alleen de hoofdknop: geen titel of feiten nog eens, en voor een tik geen uitleg', () => {
    const html = chosen(loop());
    expect(html).toMatch(/mx-primary[^>]*>GPX downloaden</);
    expect(html).not.toContain('hoogtemeters');
    expect(html).not.toContain('Eén lus');
    expect(html).not.toContain('Garmin Connect en sla');
  });
  it('met een weg naar Garmin Connect is dat de hoofdknop en GPX downloaden een tekstknop', () => {
    const html = chosen(loop(), true);
    expect(html).toMatch(/mx-primary[^>]*>Naar Garmin Connect</);
    expect(html).toContain('>GPX downloaden<');
  });
  it('de rij: soort, titel en feiten één keer, gekozen met vinkje; zonder melding geen amber', () => {
    const html = row(loop(), true);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('10 km · 210 hoogtemeters');
    expect(html.match(/hoogtemeters/g)?.length).toBe(1);
    expect(amber(html)).toEqual([]);
  });
  it('een te korte lus: de melding in amber, in een eigen regel in de rij', () => {
    expect(amber(row(loop({ distanceM: 8_500 })))).toEqual(['8,5 km, korter dan de 10 km van je training.']);
  });
  it('te weinig hoogtemeters: de melding van de lus in amber in de rij', () => {
    const notice = 'Deze lus stijgt 60 m; de training vraagt 200 m.';
    expect(amber(row(loop({ ascentM: 60, notice })))).toEqual([notice]);
  });
  it('Rustig en Uit: geen overgang bij kiezen', () => {
    expect(row(loop(), false, 'off')).toContain('transition:none');
    expect(row(loop(), false, 'calm')).toContain('transition:none');
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

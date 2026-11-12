import { describe, expect, it } from 'vitest';
import search from './useRouteSearch.ts?raw';
import panel from './RoutePanel.tsx?raw';
import briefing from './TrainingBriefing.tsx?raw';
import searching from './RouteSearching.tsx?raw';
import map from './RouteMap.tsx?raw';

// CSS komt als ?raw leeg binnen in vitest; daarom van schijf.
const nodeFs = (await import('node:' + 'fs')) as { readFileSync: (url: URL, encoding: string) => string };
const css = nodeFs.readFileSync(new URL('./settings/settings.css', import.meta.url), 'utf8');

// Start bij (besluit docs/beslissingen/2026-11-11-route-start.md): wat de engine niet kan toetsen omdat het in de regie zit.
describe('Start bij in de regie en op het scherm', () => {
  it('een locatie-antwoord telt alleen voor de poging die hem stelde, en er is één vraag per poging', () => {
    expect(search).toContain('locateAnswerCounts(askedFor.current, attempt)) setHere(');
    expect(search).toContain('askedFor.current === attempt) return;');
  });
  it('sluiten stopt ook de vraag om je plek; een nieuwe controller per mount', () => {
    expect(search).toContain('if (closing) locateStop.current.abort();');
    expect(search).toContain('locateStop.current = stop;');
  });
  it('Thuis niet gelezen is een eigen stand: geen Maak dit Thuis', () => {
    expect(search).toContain("setSaved('unread')");
    expect(search).toContain('makeHome: homeUnread ? undefined : makeHome');
  });
  it('de rij Start bij is neutraal (één mint accent), Waar train je? houdt de mint', () => {
    expect(panel).toContain('<Chip tone="quiet"');
    expect(briefing).not.toContain('tone="quiet"');
    expect(css).toMatch(/\.st-chip\.quiet\[aria-pressed="true"\] \{ border-color: var\(--color-control-border\); background: var\(--color-track\); color: var\(--color-ink\); font-weight: 600; \}/);
  });
  it('de regel onder de chips in de Briefing heeft een vaste hoogte', () => {
    expect(briefing).toContain('className="min-h-[40px] text-sm leading-snug" style={dim}>{model.startLine}');
  });
  it('de balk stopt zijn frames na twee keer de grens', () => {
    expect(searching).toContain('BAR_STOP_FACTOR * limitMs) frame = requestAnimationFrame(tick)');
  });
  it('de naamsvermelding onder de kaart heeft een raakvlak van 44 px', () => {
    expect(map).toContain('inline-flex min-h-[44px] min-w-[44px] max-w-[85%] items-end justify-end');
  });
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { RhythmCard, RhythmSheet } from './RhythmCard';
import { LegFatigueInfoSheet } from '../LegFatigueInfoSheet';
import { IntensityMixCard } from './IntensityMixCard';
import { StandSummary } from './StandSummary';
import type { Rhythm } from '../../engine/standRhythm';
import type { IntensityMix } from '../../engine/standing';

// Bladen gaan via een portaal naar document.body; in deze tests (Node, zonder DOM) gewoon ter plekke.
vi.mock('../Portal', () => ({ Portal: ({ children }: { children: unknown }) => children }));

const html = (el: ReturnType<typeof createElement>) => renderToStaticMarkup(el).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const noop = () => undefined;

describe('Je stand, de teksten van de onderdelen', () => {
  it('het blad Ritme legt de stipjes en de telling uit', () => {
    const out = html(createElement(RhythmSheet, { onClose: noop }));
    expect(out).toContain('Wat je hier ziet');
    expect(out).toContain('Elke kolom is een week, elk stipje een geplande training.');
    expect(out).toContain('Mint is gedaan, grijs is niet gedaan, een open rondje komt deze week nog.');
    expect(out).toContain('Deze week telt nog niet mee.');
  });

  it('het blad Benen zegt wat het getal is en waar de grenzen liggen', () => {
    const out = html(createElement(LegFatigueInfoSheet, { onClose: noop }));
    expect(out).toContain('Hoe fris zijn je benen?');
    expect(out).toContain('Het getal bij Benen is een schatting');
    expect(out).toContain('Fris genoeg voor een testloop.');
    expect(out).toContain('Gebruik hem als kompas, niet als weegschaal.');
  });

  it('de kaart Ritme: het oordeel en de zin, of eerlijk dat er nog te weinig is', () => {
    const week = { weekStart: '2026-10-19', done: 3, planned: 4, missed: 1, open: 0, current: false };
    const enough: Rhythm = { enough: true, status: 'nearly', verdict: 'Bijna op koers', sentence: 'Laatste 2 weken: 6 van 8 gedaan.', fact: '6 van 8', weeks: [week, { ...week, weekStart: '2026-10-26' }] };
    const out = html(createElement(RhythmCard, { rhythm: enough, mainPast: false }));
    expect(out).toContain('Bijna op koers');
    expect(out).toContain('Laatste 2 weken: 6 van 8 gedaan.');
    const few: Rhythm = { enough: false, fact: 'nog niets', weeks: [week] };
    expect(html(createElement(RhythmCard, { rhythm: few, mainPast: false }))).toContain('Na twee volle weken zie je hier je ritme.');
    expect(html(createElement(RhythmCard, { rhythm: few, mainPast: true }))).toContain('Na je hoofddoel staat er niets meer gepland.');
  });

  it('de samenvatting: label, woord en feit per kolom', () => {
    const out = html(createElement(StandSummary, { columns: [{ id: 'belasting', label: 'Belasting', word: 'Zwaar', fact: 'wordt 475, gewoonlijk 300', target: 'stand-belasting' }] }));
    expect(out).toContain('Belasting Zwaar wordt 475, gewoonlijk 300');
  });

  it('Intensiteit: elke regel van de legenda heeft een bolletje in de tint van zijn deel van de balk', () => {
    const mix: IntensityMix = {
      sessions: { easy: 6, middle: 2, hard: 1 }, minutes: { easy: 300, middle: 60, hard: 40 }, totalMinutes: 400,
      measuredSessions: 9, plannedSessions: 0, unit: 'minutes', easyShare: 0.75, easyTooHard: [], total: 9,
    };
    const raw = renderToStaticMarkup(createElement(IntensityMixCard, { mix }));
    expect(raw.match(/rounded-full align-middle/g)).toHaveLength(3);
    // Elk deel blijft heel: bolletje, getal, woord en minuten breken niet los van elkaar.
    expect(raw.match(/<span class="whitespace-nowrap">/g)).toHaveLength(3);
    for (const o of ['0.4', '0.7', '1']) expect(raw).toContain(`opacity:${o}`);
    const out = html(createElement(IntensityMixCard, { mix }));
    expect(out).toContain('75% rustig (300 min)');
    expect(out).toContain('Goede duursporters doen ongeveer 80% rustig.');
    expect(out).toContain('Uit je hartslag.');
  });
});

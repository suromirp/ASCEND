import { describe, it, expect } from 'vitest';
import { aerobicTrend, bandPhrase } from './aerobicTrend';
import { zone2Chart, zone2Explanation, dotLabel } from './zone2Chart';
import type { Zone2Piece } from '../models/zone2Pieces';
import type { SessionLog } from '../models/training';
import { buildDefaultProgramData } from '../data/defaultProgram';

// Nagemaakte lopen: zone 2 is 145 tot 159 (lthr 179), de vaste hartslag 152.
const { templates, program } = buildDefaultProgramData();
const hr = { lthr: 179 };
const TODAY = '2026-10-19';
const DATES = ['2026-08-26', '2026-09-01', '2026-09-07', '2026-09-13', '2026-09-19', '2026-09-25', '2026-10-01', '2026-10-07', '2026-10-13', '2026-10-19'];

const piece = (over: Partial<Zone2Piece> = {}): Zone2Piece => ({ from: 'stream', startSec: 700, endSec: 1900, sec: 1200, distanceM: 3600, hr: 152, paceSecKm: 333, flat: true, gradePct: 0, ...over });
const pieceRun = (id: string, date: string, pieces: Zone2Piece[], feelsC?: number): SessionLog => {
  const l: SessionLog = {
    id, templateId: 'tpl_easy_run', type: templates.find((t) => t.id === 'tpl_easy_run')!.type, completedDate: date, completedAt: `${date}T17:00:00Z`, variant: 'full', durationMinutes: 48, source: 'manual', sport: 'running',
    cardioData: { durationMinutes: 48, distanceKm: 8, avgHeartRate: 150, elevationGainM: 0, source: 'manual' },
  };
  l.zone2Pieces = { version: 1, wholeKm: 8, wholeMinutes: 48, builtAt: '', pieces };
  if (feelsC !== undefined) l.detail = { version: 1, source: 'import', sliceCount: 0, slices: [], stretches: [], movingSec: 2880, quality: { heartRateCoveragePct: 100 }, conditions: { source: 'lookup', feelsC } };
  return l;
};
const build = (logs: SessionLog[], today = TODAY) => {
  const trend = aerobicTrend(logs, templates, program, hr, today);
  const chart = zone2Chart(trend, today);
  const text = zone2Explanation(chart, trend.statement, { pieces: true, zones: true, referenceHr: trend.referenceHr });
  return { trend, chart, text: text.join(' ') };
};
// Een loop per datum, van `from` naar `to` seconden per km.
const series = (from: number, to: number, wobble = 0, dates = DATES) => dates.map((d, i) => pieceRun(`s${i}`, d, [piece({ paceSecKm: from + ((to - from) * i) / (dates.length - 1) + (i % 2 ? wobble : -wobble) })]));

describe('zone2Chart: wat de grafiek draagt', () => {
  it('0 stukken: geen stip, geen lijn, en de tekst zegt dat er te weinig is', () => {
    const { chart, text } = build([pieceRun('a', '2026-10-15', [])]);
    expect(chart.state).toBe('leeg');
    expect(chart.dots).toEqual([]);
    expect(chart.line).toBeUndefined();
    expect(chart.ticks).toEqual([]);
    expect(text).toMatch(/nog geen loop die meetelt/);
    expect(text).toMatch(/zegt ASCEND nog niets/);
    expect(text).not.toMatch(/sneller per km|langzamer per km/);
  });

  it('1 stuk: één stip, een eerste schatting, geen lijn', () => {
    const { chart, text } = build([pieceRun('a', '2026-10-15', [piece()])]);
    expect(chart.state).toBe('eerste-schatting');
    expect(chart.dots).toHaveLength(1);
    expect(chart.dots[0]).toMatchObject({ logId: 'a', counts: true, pieces: 1 });
    expect(chart.line).toBeUndefined();
    expect(chart.fan).toBeUndefined();
    expect(chart).toMatchObject({ runs: 1, pieces: 1 });
    expect(text).toMatch(/Dit rust op één loop met samen één stuk/);
    expect(text).toMatch(/minstens 8 lopen nodig, verspreid over minstens 4 weken en 3 verschillende weken/);
    expect(text).toMatch(/eerste schatting/);
    // Eén stuk is geen reden om over één meting per loop te beginnen.
    expect(text).not.toMatch(/Stukken uit dezelfde loop/);
  });

  it('3 stukken in één loop: nog steeds één meting en een eerste schatting', () => {
    const { chart, text } = build([pieceRun('a', '2026-10-15', [piece(), piece({ startSec: 2000, endSec: 2400, sec: 400 }), piece({ startSec: 2500, endSec: 2900, sec: 400 })])]);
    expect(chart.dots).toHaveLength(1);
    expect(chart).toMatchObject({ state: 'eerste-schatting', runs: 1, pieces: 3 });
    expect(text).toMatch(/één loop met samen 3 stukken/);
    expect(text).toMatch(/Stukken uit dezelfde loop tellen samen als één meting/);
  });

  it('3 stukken in drie lopen: drie stippen, nog geen uitspraak', () => {
    const { chart, text } = build(series(340, 330, 0, DATES.slice(-3)));
    expect(chart.dots).toHaveLength(3);
    expect(chart).toMatchObject({ state: 'eerste-schatting', runs: 3, pieces: 3 });
    expect(chart.line).toBeUndefined();
    expect(text).toMatch(/3 lopen met samen 3 stukken/);
  });

  it('8 stukken in één lange loop zijn geen uitspraak: het telt per loop', () => {
    const many = Array.from({ length: 8 }, (_, i) => piece({ startSec: 700 + i * 400, endSec: 1000 + i * 400, sec: 300 }));
    const { chart } = build([pieceRun('lang', '2026-10-15', many)]);
    expect(chart).toMatchObject({ state: 'eerste-schatting', runs: 1, pieces: 8 });
  });

  it('8 of meer lopen over vier weken: een lijn met waaier, uit dezelfde uitspraak als de kaart', () => {
    const { trend, chart, text } = build(series(345, 325, 1));
    expect(trend.statement?.kind).toBe('uitspraak');
    expect(chart.state).toBe('uitspraak');
    // Het venster van de uitspraak is 8 weken: de oudste loop (26 augustus) valt er net buiten.
    expect(chart.runs).toBe(trend.statement!.runs);
    expect(chart.dots).toHaveLength(trend.statement!.runs);
    expect(chart.pieces).toBe(chart.runs);
    const s = trend.statement!;
    if (s.kind !== 'uitspraak') throw new Error('uitspraak verwacht');
    expect(chart.line).toMatchObject({ sec1: s.line.fromSec, sec2: s.line.toSec, x2: 1 });
    // Sneller: de lijn zakt in seconden; de waaier ligt om de lijn en is aan de randen het breedst.
    expect(chart.line!.sec2).toBeLessThan(chart.line!.sec1);
    const f = chart.fan!;
    expect(f.fast1).toBeLessThan(f.slow1);
    expect(f.fast2).toBeLessThan(f.slow2);
    expect(f.fast2).toBeLessThanOrEqual(chart.line!.sec2);
    expect(f.slow2).toBeGreaterThanOrEqual(chart.line!.sec2);
    // De as omvat alles, met sneller boven (minder seconden).
    expect(chart.fastSec).toBeLessThan(Math.min(...chart.dots.map((d) => d.paceSec), f.fast1, f.fast2));
    expect(chart.slowSec).toBeGreaterThan(Math.max(...chart.dots.map((d) => d.paceSec), f.slow1, f.slow2));
    expect(chart.ticks.length).toBeGreaterThanOrEqual(1);
    expect(chart.ticks.length).toBeLessThanOrEqual(4);
    // De tekst noemt dezelfde band als de kaart, en hoeveel lopen hij draagt.
    expect(text).toContain(bandPhrase(s));
    expect(text).toContain(`De lijn loopt door ${chart.runs} lopen met samen ${chart.pieces} stukken uit de laatste 8 weken`);
  });

  it('te veel verschil: geen lijn en de tekst zwijgt over sneller of trager', () => {
    const { trend, chart, text } = build(series(335, 335, 40));
    expect(trend.statement).toMatchObject({ kind: 'uitspraak', verdict: 'te-veel-verschil' });
    expect(chart.state).toBe('te-veel-verschil');
    expect(chart.line).toBeUndefined();
    expect(chart.fan).toBeUndefined();
    expect(chart.dots.length).toBeGreaterThan(0);
    expect(text).toMatch(/zegt ASCEND niets over sneller of trager/);
    expect(text).not.toMatch(/waarschijnlijk tussen twee grenzen/);
  });

  it('een warme loop staat gedimd, telt niet mee en wordt genoemd', () => {
    const { chart, text } = build([pieceRun('a', '2026-10-13', [piece()]), pieceRun('w', '2026-10-15', [piece()], 28)]);
    expect(chart.dots.map((d) => d.counts)).toEqual([true, false]);
    expect(chart).toMatchObject({ runs: 1, warmRuns: 1 });
    expect(text).toMatch(/Eén warme loop staat gedimd/);
    expect(dotLabel(chart.dots[1])).toMatch(/warm, telt niet mee/);
  });

  it('zonder hartslag noemt de tekst geen zone 2 als midden, en vraagt hem in te vullen', () => {
    const trend = aerobicTrend([pieceRun('a', '2026-10-15', [piece()])], templates, program, undefined, TODAY);
    const text = zone2Explanation(zone2Chart(trend, TODAY), trend.statement, { pieces: true, zones: false, referenceHr: trend.referenceHr }).join(' ');
    expect(text).not.toMatch(/het midden van je zone 2/);
    expect(text).toMatch(/Vul hem in bij Instellingen, Lichaam/);
  });

  it('met de instelling uit noemt de tekst de hele loop en geen stukken', () => {
    const { chart, trend } = build([pieceRun('a', '2026-10-15', [piece()])]);
    const text = zone2Explanation(chart, trend.statement, { pieces: false, zones: true, referenceHr: 152 }).join(' ');
    expect(text).toMatch(/Tempo uit stabiele stukken staat uit/);
    expect(text).not.toMatch(/samen één stuk/);
  });

  it('geen gedachtestreepjes in de tekst', () => {
    const { text } = build(series(345, 325, 1));
    expect(text).not.toMatch(/[\u2013\u2014]/);
  });
});

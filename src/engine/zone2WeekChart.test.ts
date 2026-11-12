import { describe, it, expect } from 'vitest';
import { aerobicTrend, formatPace, trendHeadline } from './aerobicTrend';
import { zone2CardCaption, zone2WeekChart } from './zone2Chart';
import type { Zone2Piece } from '../models/zone2Pieces';
import type { SessionLog } from '../models/training';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { addDays } from '../utils/dates';

// De grafiek op de kaart Tempo bij zone 2 (besluit 2026-11-12-zone2-kaart). Nagemaakte lopen:
// zone 2 is 145 tot 159 (lthr 179), de vaste hartslag 152. Vandaag is een donderdag.
const { templates, program } = buildDefaultProgramData();
const hr = { lthr: 179 };
const TODAY = '2026-11-12';

const piece = (paceSecKm: number): Zone2Piece => ({ from: 'stream', startSec: 700, endSec: 1900, sec: 1200, distanceM: 3600, hr: 152, paceSecKm, flat: true, gradePct: 0 });
const run = (id: string, date: string, paceSecKm: number): SessionLog => ({
  id, templateId: 'tpl_easy_run', type: templates.find((t) => t.id === 'tpl_easy_run')!.type, completedDate: date, completedAt: `${date}T17:00:00Z`, variant: 'full', durationMinutes: 48, source: 'manual', sport: 'running',
  cardioData: { durationMinutes: 48, distanceKm: 8, avgHeartRate: 150, elevationGainM: 0, source: 'manual' },
  zone2Pieces: { version: 1, wholeKm: 8, wholeMinutes: 48, builtAt: '', pieces: [piece(paceSecKm)] },
});
// `n` lopen, elke `every` dagen tot vandaag, van `from` naar `to` seconden per km.
const runs = (n: number, every: number, from = 440, to = 440) =>
  Array.from({ length: n }, (_, i) => run(`r${i}`, addDays(TODAY, -every * (n - 1 - i)), n === 1 ? from : from + ((to - from) * i) / (n - 1)));
const build = (logs: SessionLog[]) => {
  const trend = aerobicTrend(logs, templates, program, hr, TODAY);
  return { trend, chart: zone2WeekChart(trend, TODAY), caption: zone2CardCaption(trend), head: trendHeadline(trend) };
};

describe('zone2WeekChart: stippen per week, een lijn pas na de drempel', () => {
  it('0 lopen: geen stip, geen lijn, geen eindlabel en geen zin', () => {
    const { chart, caption } = build([]);
    expect(chart).toMatchObject({ state: 'leeg', dots: [] });
    expect(chart.line).toBeUndefined();
    expect(chart.end).toBeUndefined();
    expect(caption).toBeUndefined();
  });

  it('1 loop: één stip zonder lijn, het eindlabel bij die stip en een zin over de ene loop', () => {
    const { chart, caption, head } = build(runs(1, 7));
    expect(chart.state).toBe('eerste-schatting');
    expect(chart.dots).toHaveLength(1);
    expect(chart.line).toBeUndefined();
    expect(chart.end).toEqual({ x: chart.dots[0].x, paceSec: chart.dots[0].paceSec });
    expect(caption).toBe(`${formatPace(head!.paceSec)} is je ene loop van de laatste 8 weken. De stip is het gemiddelde van die week.`);
  });

  it('3 lopen die trager worden: drie stippen, geen lijn en dus geen richting; de zin legt kop en eindlabel uit', () => {
    // Zoals de afdruk van de eigenaar: kop is het gemiddelde, de laatste week is trager.
    const { chart, caption, head } = build(runs(3, 7, 430, 448));
    expect(chart.state).toBe('eerste-schatting');
    expect(chart.dots).toHaveLength(3);
    expect(chart.line).toBeUndefined();
    const last = chart.dots.at(-1)!;
    expect(chart.end).toEqual({ x: last.x, paceSec: last.paceSec });
    expect(formatPace(chart.end!.paceSec)).not.toBe(formatPace(head!.paceSec));
    expect(caption).toBe(`${formatPace(head!.paceSec)} is het gemiddelde van je 3 lopen van de laatste 8 weken. ${formatPace(last.paceSec)} is je laatste week. Elke stip is het gemiddelde van een week.`);
  });

  it('sneller staat boven: de as loopt van het snelste tempo (boven) naar het traagste', () => {
    const { chart } = build(runs(3, 7, 430, 448));
    expect(chart.fastSec).toBeLessThan(Math.min(...chart.dots.map((d) => d.paceSec)));
    expect(chart.slowSec).toBeGreaterThan(Math.max(...chart.dots.map((d) => d.paceSec)));
  });

  it('7 lopen over ruim vier weken: nog onder de drempel, alleen stippen', () => {
    const { trend, chart } = build(runs(7, 6));
    expect(trend.statement?.kind).toBe('eerste-schatting');
    expect(chart.line).toBeUndefined();
  });

  it('8 lopen over 27 dagen: net onder de drempel van 4 weken, alleen stippen', () => {
    const logs = runs(8, 4).map((l, i) => (i === 0 ? { ...l, completedDate: addDays(TODAY, -27), completedAt: `${addDays(TODAY, -27)}T17:00:00Z` } : l));
    const { trend, chart } = build(logs);
    expect(trend.statement?.kind).toBe('eerste-schatting');
    expect(chart.line).toBeUndefined();
  });

  it('precies op de drempel (8 lopen, 28 dagen): de lijn van de uitspraak, eindigend vandaag op het getal in de kop', () => {
    const { trend, chart, caption, head } = build(runs(8, 4, 450, 430));
    expect(trend.statement?.kind).toBe('uitspraak');
    expect(chart.state).toBe('uitspraak');
    expect(chart.line).toBeDefined();
    expect(chart.end).toEqual({ x: chart.line!.x2, paceSec: chart.line!.sec2 });
    expect(formatPace(chart.end!.paceSec)).toBe(formatPace(head!.paceSec));
    expect(caption).toBe(`${formatPace(head!.paceSec)} is waar de lijn door je 8 lopen nu staat. Elke stip is het gemiddelde van een week.`);
  });

  it('10 lopen: een lijn, en sneller lopen is een lijn die stijgt (minder seconden aan het eind)', () => {
    const { chart } = build(runs(10, 4, 460, 430));
    expect(chart.line!.sec2).toBeLessThan(chart.line!.sec1);
  });

  it('één week met meerdere lopen is één stip, met het aantal lopen erbij', () => {
    const logs = [run('a', '2026-11-09', 430), run('b', '2026-11-10', 440), run('c', '2026-11-11', 450)];
    const { chart } = build(logs);
    expect(chart.dots).toHaveLength(1);
    expect(chart.dots[0]).toMatchObject({ week: '2026-11-09', runs: 3 });
    expect(chart.dots[0].paceSec).toBeCloseTo(440, 5);
  });

  it('een week zonder lopen ertussen laat een gat: de stippen staan op hun eigen week', () => {
    const logs = [run('a', '2026-10-27', 440), run('b', '2026-11-10', 440)];
    const { chart } = build(logs);
    expect(chart.dots.map((d) => d.week)).toEqual(['2026-10-26', '2026-11-09']);
    const step = 7 / (7 * 12);
    expect(chart.dots[1].x - chart.dots[0].x).toBeCloseTo(2 * step, 5);
  });

  it('te veel verschil: een uitspraak, maar geen lijn; de zin zegt waarom', () => {
    const logs = runs(10, 4).map((l, i) => run(l.id, l.completedDate, i % 2 ? 380 : 520));
    const { trend, chart, caption } = build(logs);
    expect(trend.statement).toMatchObject({ kind: 'uitspraak', verdict: 'te-veel-verschil' });
    expect(chart.state).toBe('te-veel-verschil');
    expect(chart.line).toBeUndefined();
    expect(caption).toMatch(/Ze verschillen te veel om de lijn te tekenen\./);
    // Het getal bij de laatste stip staat ook in de zin, zodat het geen onverklaard tweede getal is.
    expect(caption).toContain(formatPace(chart.end!.paceSec));
  });

  it('geen stip valt rechts van vandaag, ook niet in de week van vandaag', () => {
    const { chart } = build(runs(3, 1));
    const today = (8 * 7 + 3 + 3 * 7 + 0.5) / 84; // donderdag in de laatste van 12 weken
    for (const d of chart.dots) expect(d.x).toBeLessThanOrEqual(today + 1e-9);
  });
});

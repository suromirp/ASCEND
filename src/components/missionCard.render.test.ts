import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';
import { missionFacts } from '../engine/missionFacts';
import { buildSessionBrief } from '../engine/sessionBrief';
import { resolveEffectiveFullDuration } from '../engine/substitutions';
import { zoneOfTemplate } from './vandaag/zone';
import missionSrc from './TodayMissionCard.tsx?raw';
import todaySrc from '../pages/Today.tsx?raw';

// De missiekaart op Vandaag, echt gerenderd zonder DOM (besluit 2026-11-12-missiekaart.md). Nagemaakte trainingen
// uit het demoprogramma; het horloge dat afvinkt wordt nagespeeld met de uitkomst van missionButton.
const app = vi.hoisted(() => ({ watchTicks: false, paces: false }));
vi.mock('./Portal', () => ({ Portal: ({ children }: { children: ReactNode }) => children }));
vi.mock('./motion', () => ({ useMotionMode: () => 'full' }));
vi.mock('../engine/briefing', async (orig) => {
  const real = await orig<typeof import('../engine/briefing')>();
  return { ...real, missionButton: (input: Parameters<typeof real.missionButton>[0]) => (app.watchTicks && real.briefingEntry(input.template) ? 'briefing' : 'done') };
});
vi.mock('../state/AppDataContext', () => ({
  useAppData: () => ({
    settings: { overviews: {} },
    sessionLogs: [],
    plannedSessions: [],
    templates: program.templates,
    program: program.program,
    weather: {},
    illnessEpisodes: [],
    trainingGoals: [],
    goalMilestones: [],
    leavePeriods: [],
    journeyTasks: [],
    updateSettings: async () => undefined,
  }),
}));

const program = (() => {
  const data = buildDefaultProgramData();
  return { templates: data.templates, program: data.program };
})();
const TODAY = '2026-11-12';
const tpl = (id: string) => program.templates.find((t) => t.id === id)!;

const { TodayMissionCard } = await import('./TodayMissionCard');
const { QuietDayCard, DoneTodayCard } = await import('./vandaag/QuietDayCard');
const { ForecastAdjustmentBanner } = await import('./ForecastAdjustmentBanner');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${TODAY}T08:00:00`));
  app.watchTicks = false;
});
afterEach(() => {
  vi.useRealTimers();
});

function card(id: string, { quickComplete = false, coachLine }: { quickComplete?: boolean; coachLine?: string } = {}) {
  const template = tpl(id);
  const session: PlannedSession = { id: `ps-${id}`, templateId: id, scheduledDate: TODAY, status: 'planned' } as PlannedSession;
  const fullDuration = resolveEffectiveFullDuration(template, TODAY, program.program);
  // Met tempo uit een testloop, zodat de kaart iets te verbergen heeft.
  const r = { fast: 330, slow: 360 };
  const paces = { test: { date: '2026-11-01' }, vdot: 45, easy: r, threshold: r, interval: r } as unknown as Parameters<typeof missionFacts>[2];
  const facts = missionFacts(id, buildSessionBrief(template, TODAY, program.program, { templates: program.templates }), paces, fullDuration);
  return renderToStaticMarkup(
    createElement(MemoryRouter, null,
      createElement(TodayMissionCard, {
        session,
        template,
        fullDuration,
        chips: facts.chips,
        paceNote: facts.paceNote,
        zone: zoneOfTemplate(template, TODAY, program.program, program.templates),
        quickComplete,
        coachLine,
        onStart: () => undefined,
        onLog: () => undefined,
        onShowPlan: () => undefined,
        onMove: () => undefined,
        onSkip: () => undefined,
        suggestions: [],
        onPickSuggestion: () => undefined,
      })),
  );
}

const mint = (html: string) => (html.match(/mx-primary/g) ?? []).length;
// Een omlijnde mint knop (SecondaryButton of de oude NotFitLink outlined).
const outlinedMint = (html: string) => (html.match(/border:1\.5px solid color-mix\(in srgb, var\(--color-action\)/g) ?? []).length;

describe('de missiekaart: één mint, de rest stil', () => {
  for (const [name, id, opts] of [
    ['een loop zonder horloge dat afvinkt', 'tpl_easy_run', {}],
    ['kracht in ASCEND', 'tpl_upper_a', {}],
    ['kracht in MacroFactor', 'tpl_upper_a', { quickComplete: true }],
    ['een tocht', 'tpl_mountain_hike', {}],
    ['een testloop', 'tpl_test_run', {}],
  ] as const) {
    it(`${name}: precies één gevulde mint knop, Verplaatsen en Niet fit? zonder mint rand`, () => {
      const html = card(id, opts);
      expect(mint(html)).toBe(1);
      expect(outlinedMint(html)).toBe(0);
      expect(html).toContain('>Verplaatsen<');
      expect(html).toContain('Niet fit?');
      // Geen mint woord in een zin: de zone in gewone inkt.
      expect(html).not.toContain('color:var(--color-progress)');
    });
  }

  it('met een horloge dat afvinkt: de knop is Briefing, nog steeds één mint', () => {
    app.watchTicks = true;
    const html = card('tpl_long_run');
    expect(mint(html)).toBe(1);
    expect(html).toMatch(/mx-primary[^>]*>Briefing</);
    expect(html).toContain('Je horloge vinkt hem af na je loop.');
  });

  it('zonder horloge dat afvinkt: de knop is Gedaan', () => {
    expect(card('tpl_long_run')).toMatch(/mx-primary[^>]*>.*Gedaan/);
  });

  it('kracht in ASCEND: Training starten; kracht in MacroFactor: het korte formulier', () => {
    expect(card('tpl_upper_a')).toMatch(/mx-primary[^>]*>Training starten</);
    expect(card('tpl_upper_a', { quickComplete: true })).not.toContain('Training starten');
  });
});

describe('de naam opent de Briefing, met een zichtbaar teken', () => {
  for (const id of ['tpl_easy_run', 'tpl_long_run', 'tpl_mountain_hike', 'tpl_test_run', 'tpl_ruck_walk']) {
    it(`${id}: de naam is een knop met een pijltje`, () => {
      const html = card(id);
      expect(html).toContain('data-mission-name-opens=""');
      expect(html).toMatch(/aria-label="Briefing: [^"]+"[^>]*>[\s\S]*?<h2[\s\S]*?<\/h2><span[^>]*aria-hidden="true"><svg/);
    });
  }
  it('kracht heeft geen Briefing en dus geen pijltje bij de naam', () => {
    expect(card('tpl_upper_a')).not.toContain('data-mission-name-opens');
    expect(card('tpl_upper_a', { quickComplete: true })).not.toContain('data-mission-name-opens');
  });
});

describe('geen herhaling van wat de Briefing toont (regel 1)', () => {
  for (const id of ['tpl_easy_run', 'tpl_long_run', 'tpl_test_run', 'tpl_mountain_hike']) {
    it(`${id}: geen zonebalk, geen zonezin en geen praattest; het tempo hoogstens als stille regel`, () => {
      const html = card(id);
      expect(html).not.toContain('aria-label="Zone ');
      expect(html).not.toMatch(/Zone \d\./);
      expect(html).not.toMatch(/Praten kan|hele zinnen/i);
      // Het tempo staat nog niet in de Briefing: een stille regel, nooit een groot getal of een chip.
      expect(html).not.toContain('/km');
      expect(html).not.toMatch(/text-\[28px\][^>]*>\d+:\d\d/);
      // Wat de kaart wel zegt: de naam en de minuten.
      expect(html).toContain(tpl(id).name);
      expect(html).toContain('minuten');
    });
  }
  it('een training zonder Briefing (fietsen) houdt zijn zone, in gewone inkt', () => {
    const html = card('tpl_bike');
    const zone = zoneOfTemplate(tpl('tpl_bike'), TODAY, program.program, program.templates);
    if (zone) expect(html).toMatch(/<span class="font-semibold">Zone \d\.<\/span>/);
    expect(html).not.toContain('data-mission-name-opens');
  });
});

describe('het tempo bij een training met een Briefing', () => {
  // Besluit 2026-11-12-briefing-per-manier.md: tempo en testloopzin staan in de Briefing, niet meer op de kaart
  // (bewust meebewogen; eerder één stille regel onder de minuten).
  it('een rustige loop met een testloop: geen tempo en geen testloopzin op de kaart', () => {
    const html = card('tpl_easy_run');
    expect(html).not.toMatch(/\d+:\d\d tot \d+:\d\d/);
    expect(html).not.toContain('Tempo uit je testloop van');
  });
  it('fietsen zonder Briefing houdt het oude blok', () => {
    expect(card('tpl_bike')).not.toContain('text-sm tabular-nums" style="color:var(--color-ink-dim)">');
  });
});

describe('de coachregel en opwarmen staan onder de knop', () => {
  it('de tip komt na de hoofdknop en Verplaatsen', () => {
    const html = card('tpl_easy_run', { coachLine: 'Rustig blijven, ook bergop.' });
    expect(html.indexOf('Rustig blijven, ook bergop.')).toBeGreaterThan(html.indexOf('mx-primary'));
    expect(html.indexOf('Rustig blijven, ook bergop.')).toBeGreaterThan(html.indexOf('>Verplaatsen<'));
    expect(html).not.toMatch(/border-color:var\(--color-action\)[^"]*"[^>]*>Rustig blijven/);
  });
  it('opwarmen bij kracht na de knop, met het vlammetje gedempt', () => {
    const html = card('tpl_lower_a');
    expect(html.indexOf('Opwarmen')).toBeGreaterThan(html.indexOf('Training starten'));
    expect(html).toContain('stroke="var(--color-ink-dim)"');
  });
});

describe('de andere missies: rustdag en al gedaan', () => {
  it('een rustdag: geen gevulde knop; een hersteldag met Gedaan: precies één', () => {
    const rest = renderToStaticMarkup(createElement(QuietDayCard, { title: 'Rustdag', body: 'Rust.', linkLabel: 'Toch gewandeld?', onLink: () => undefined }));
    expect(mint(rest)).toBe(0);
    const active = renderToStaticMarkup(createElement(QuietDayCard, { title: 'Hersteldag', body: 'Licht.', doneLabel: 'Gedaan', onDone: () => undefined, linkLabel: 'Invullen wat je deed', onLink: () => undefined }));
    expect(mint(active)).toBe(1);
  });
  it('al gedaan: een vinkje, geen knop', () => {
    const done = renderToStaticMarkup(createElement(DoneTodayCard, { title: 'Vandaag zit erop', line: 'Rustige duurloop gedaan, 40 min' }));
    expect(mint(done)).toBe(0);
    expect(done).not.toContain('<button');
  });
});

describe('Beweging: Rustig en Uit', () => {
  // Rustig en Uit zetten alles op de eindstand via data-motion op <html>; de kaart voegt geen beweging toe, dus er is
  // in die standen niets wat kan blijven hangen. Dit bewijst dat de kaart geen eigen beweging heeft, niet de standen zelf.
  it('de kaart heeft geen eigen animatie of overgang (de adem staat in index.css en volgt data-motion)', () => {
    expect(missionSrc).not.toMatch(/animate-|transition|mx-(?!primary)/);
  });
});

describe('Komende weken bijgesteld: een melding is één rij (regel 6)', () => {
  it('één rij met een pijltje naar een blad, zonder knop op Vandaag en zonder de hele tekst', () => {
    const html = renderToStaticMarkup(createElement(ForecastAdjustmentBanner, { summary: 'Je lange loop van volgende week is 10 minuten korter.', onDismiss: () => undefined }));
    expect(html).toContain('Komende weken bijgesteld');
    expect(html).toContain('data-sheet-from=""');
    expect(html).not.toContain('Begrepen');
    expect(html).not.toContain('10 minuten korter');
    expect(mint(html)).toBe(0);
    expect(outlinedMint(html)).toBe(0);
  });
  it('staat direct onder de missie, voor de ochtendvraag en ver voor Je dag', () => {
    const mission = todaySrc.indexOf('{missionCard}</div>');
    const row = todaySrc.indexOf('<ForecastAdjustmentBanner');
    expect(row).toBeGreaterThan(mission);
    expect(row).toBeLessThan(todaySrc.indexOf('{placement.underMission.map(around)}'));
    expect(todaySrc.match(/<ForecastAdjustmentBanner/g)).toHaveLength(1);
  });
  it('Stand en morgen krijgt Morgen alleen naast de kaart van een training', () => {
    expect(todaySrc).toContain('<StandSummaryCard tomorrow={standTomorrow(tomorrow, !!(primary && primaryTemplate && mission))} />');
  });
});

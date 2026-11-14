import { describe, expect, it, vi, type Mock } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { SessionLog } from '../models/training';
import type { AfterRunQuestions } from '../engine/afterRun';
import sheetSrc from './WatchAskSheet.tsx?raw';
import watchSrc from './WatchActivityCard.tsx?raw';
import todaySrc from '../pages/Today.tsx?raw';

// Het blad Hoe ging het? na een training van je horloge (spoor 6), echt gerenderd zonder DOM. Nagemaakte logs.
const app = vi.hoisted(() => ({ settings: {} as Record<string, unknown> }));
vi.mock('./Portal', () => ({ Portal: ({ children }: { children: ReactNode }) => children }));
vi.mock('./motion', () => ({ useMotionMode: () => 'full' }));
vi.mock('../state/AppDataContext', () => ({
  useAppData: () => ({ settings: app.settings, saveSweat: async () => undefined, plannedSessions: [], program: null, trainingGoals: [], goalMilestones: [], trimWatchActivity: async () => undefined }),
}));

const { WatchAskSheet } = await import('./WatchAskSheet');
const { templates } = buildDefaultProgramData();
const tpl = (id: string) => templates.find((t) => t.id === id)!;
const TODAY = '2026-11-14';

function log(extra: Partial<SessionLog> = {}): SessionLog {
  return { id: 'l1', templateId: 'tpl_long_run', type: 'cardio', completedDate: TODAY, completedAt: `${TODAY}T08:10:00.000Z`, variant: 'custom', durationMinutes: 76, source: 'garmin', externalId: 'test:1', plannedSessionId: 'p1', ...extra };
}
const render = (opts: { log?: SessionLog; templateId?: string; mode?: AfterRunQuestions; canReject?: boolean; settings?: Record<string, unknown> } = {}) => {
  app.settings = opts.settings ?? {};
  const l = opts.log ?? log();
  return renderToStaticMarkup(createElement(WatchAskSheet, {
    log: l, template: tpl(opts.templateId ?? l.templateId), mode: opts.mode ?? 'short', canReject: opts.canReject ?? true,
    onAnswer: (async () => undefined) as Mock & (() => Promise<void>), onReject: async () => undefined, onClose: () => undefined,
  }));
};
const count = (html: string, re: RegExp) => [...html.matchAll(re)].length;
// De rij Meer naar stap 2: de titel met eronder wat erachter zit (SheetRow). SweatAfterRow heeft een eigen tekstknop Meer.
const MORE_ROW = />Meer<\/span><span[^>]*>[^<]+</;

describe('het blad Hoe ging het? na je horloge', () => {
  it('loop buiten, Kort: titel, één regel feiten, de drie vragen, Meer, Opslaan en de twee tekstknoppen', () => {
    const html = render({ log: log({ outdoorData: { source: 'garmin', distanceKm: 11.4, elevationGainM: 310 } as SessionLog['outdoorData'] }) });
    expect(html).toContain('Lange duurloop is afgevinkt');
    expect(html).toContain('76 min, 11,4 km, +310 m, vandaag');
    expect(html).toContain('Ten opzichte van normaal');
    expect(html).toContain('Pijn op een plek?');
    expect(html).toContain('Zwaarte, 1 tot 10');
    expect(html.indexOf('Ten opzichte van normaal')).toBeLessThan(html.indexOf('Pijn op een plek?'));
    expect(html.indexOf('Pijn op een plek?')).toBeLessThan(html.indexOf('Zwaarte, 1 tot 10'));
    expect(html).toMatch(MORE_ROW);
    expect(html).toContain('Klopt niet');
    expect(html).toContain('Niet nu');
    // Zonder antwoord heet de knop Klaar, zoals de oude kaart.
    expect(html).toContain('>Klaar<');
    // Achter Meer, niet in stap 1.
    expect(html).not.toContain('Gewicht na (kg)');
  });

  it('de uitleg staat achter de i, niet op het blad', () => {
    const html = render();
    expect(html).not.toContain('Dit deed ASCEND zelf');
    expect(html).toContain('aria-label="Waarom afgevinkt?"');
  });

  it('één gevulde mint knop: Klopt niet en Niet nu zijn gedempte tekstknoppen', () => {
    const html = render();
    expect(count(html, /btn-primary|data-primary/g) <= 1).toBe(true);
    expect(sheetSrc.match(/<PrimaryButton/g)).toHaveLength(1);
    expect(sheetSrc).toMatch(/<TextButton tone="dim" onClick=\{\(\) => void reject\(\)\} disabled=\{busy\}>\{AFTER_RUN_TEXT\.reject\}/);
    expect(sheetSrc).toMatch(/<TextButton tone="dim" onClick=\{requestClose\} disabled=\{busy && !slow\}>\{AFTER_RUN_TEXT\.later\}/);
    expect(sheetSrc).not.toMatch(/<TextButton(?! tone="dim")/);
  });

  it('de zwaarte van je horloge staat vooraf ingevuld, met de regel waar hij vandaan komt', () => {
    const html = render({ log: log({ rpe: 4 }) });
    expect(html).toMatch(/aria-checked="true"[^>]*>4</);
    expect(html).toContain('Zo stond het op je horloge.');
    expect(html).toContain('>Opslaan<');
  });

  it('Alles: geen Meer; de weging staat in stap 1 als die gevraagd wordt', () => {
    const html = render({ mode: 'all', settings: { askSweat: true } });
    expect(html).not.toMatch(MORE_ROW);
    expect(html).toContain('Gewicht na (kg)');
    expect(render({ settings: { askSweat: true } })).not.toContain('Gewicht na (kg)');
  });

  it('loopband: afstand zonder hoogtemeters', () => {
    const html = render({ log: log({ durationMinutes: 40, cardioData: { distanceKm: 8 } as SessionLog['cardioData'] }) });
    expect(html).toContain('40 min, 8 km, vandaag');
  });

  it('fiets binnen zonder afstand en zonder Strava-tekst: alleen minuten, en geen lege rij Meer', () => {
    const html = render({ log: log({ templateId: 'tpl_bike', durationMinutes: 45 }), settings: { stravaText: false, askSweat: false } });
    expect(html).toContain('45 min, vandaag');
    expect(html).toContain('Pijn op een plek?');
    expect(html).not.toMatch(MORE_ROW);
  });

  it('rustdag: geen vragen, alleen Klaar', () => {
    const html = render({ log: log({ templateId: 'tpl_herstel', type: 'recovery', durationMinutes: 30 }) });
    expect(html).not.toContain('Ten opzichte van normaal');
    expect(html).not.toContain('Zwaarte, 1 tot 10');
    expect(html).toContain('>Klaar<');
  });

  it('Klopt niet mag niet meer: de knop staat er niet', () => {
    expect(render({ canReject: false })).not.toContain('Klopt niet');
  });

  it('elk tikdoel 44 px: de keuzes van gevoel, pijn en zwaarte', () => {
    const html = render();
    expect(html).toContain('min-h-[44px]');
  });

  it('het blad gaat door useSheetClose met SheetGrip (via SheetFrame), en wacht met sluiten tijdens het opslaan tot de grens', () => {
    expect(sheetSrc).toMatch(/useSheetClose\(onClose, 200, \(\) => !busyRef\.current \|\| slowRef\.current\)/);
    expect(sheetSrc).toMatch(/<SheetFrame closing=\{closing\} sheetRef=\{sheetRef\}/);
    expect(sheetSrc).toMatch(/attemptWithin\(action,/);
    expect(sheetSrc).not.toMatch(/#[0-9a-fA-F]{3,6}\b|rgba?\(/);
  });
});

describe('de plek: een rij in Je dag, geen kaart op Vandaag', () => {
  it('Vandaag zet de rij in Je dag en opent het blad; de kaart vraagt het niet meer', () => {
    expect(todaySrc).toMatch(/kind: 'watch'/);
    expect(todaySrc).toMatch(/<WatchAskSheet/);
    expect(todaySrc).not.toMatch(/WatchAskCard/);
    expect(watchSrc).not.toMatch(/WatchAskCard|pendingQuestions|setLogFeedback|undoLog/);
  });

  it('de training van de vraag staat niet nog eens als gedaan in Je dag', () => {
    expect(todaySrc).toMatch(/withoutAskedTraining\(/);
  });
});

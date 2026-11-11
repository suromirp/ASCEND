// De Briefing zonder scherm (engine/briefing.ts). Nagemaakte trainingen, logs en weer; de klok staat op
// Europe/Amsterdam zoals bij de eigenaar.
(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';

import { describe, expect, it } from 'vitest';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { makeForecast } from './fixtures/weatherFixture';
import { resolveWatchModel } from './watchFields';
import { BRIEFING_TEXT, briefing, hasBriefing, type BriefingInput } from './briefing';
import { drinkLine } from './eveningBefore';
import { fuelForTraining, fuelShortText } from './fuelOnTheGo';
import { routeTarget, targetText } from './routeTarget';

const { templates } = buildDefaultProgramData();
const byId = (id: string) => templates.find((t) => t.id === id) as SessionTemplate;
const EASY = byId('tpl_easy_run');
const TEST = byId('tpl_test_run');
const RACE = byId('tpl_race');
const RUCK = byId('tpl_ruck_walk');
const LONG = byId('tpl_long_run');

// Woensdag 11 november 2026, 08:00.
const TODAY = '2026-11-11';
const NOW = new Date(2026, 10, 11, 8, 0);
const plan = (templateId: string, date = TODAY, id = 'p1'): PlannedSession => ({
  id, templateId, scheduledDate: date, weekStartDate: '2026-11-09', status: 'planned', order: 0,
});

function input(over: Partial<BriefingInput> = {}): BriefingInput {
  return {
    template: EASY,
    session: plan('tpl_easy_run'),
    date: TODAY,
    now: NOW,
    program: null,
    logs: [],
    routeOn: true,
    watchLink: { linked: true, autoTick: true, activities: true },
    watch: { showStatus: true, fieldsShown: true, model: resolveWatchModel(undefined), store: undefined, hasZonesNote: false },
    watchStatus: { kind: 'sent', sentAt: new Date(2026, 10, 11, 7, 18).toISOString() },
    forecast: makeForecast(TODAY, () => ({ tempC: 9, feelsC: 8 })),
    weatherOn: true,
    clothingOn: true,
    fuelOn: true,
    ...over,
  };
}

const tile = (view: ReturnType<typeof briefing>, id: string) => view?.tiles.find((t) => t.id === id);

describe('voor welke training', () => {
  it('een loop en een wandeling buiten, geen kracht en geen rust', () => {
    expect(hasBriefing(EASY)).toBe(true);
    expect(hasBriefing(RUCK)).toBe(true);
    expect(hasBriefing(byId('tpl_upper_a'))).toBe(false);
    expect(briefing(input({ template: byId('tpl_upper_a') }))).toBeUndefined();
  });
});

describe('een loop met gekoppeld horloge', () => {
  const view = briefing(input());
  it('je horloge vinkt af, de knop stuurt de route naar Garmin Connect', () => {
    expect(view?.stand).toEqual({ kind: 'watch', line: BRIEFING_TEXT.watchTicks, manualLabel: 'Zelf invullen' });
    expect(view?.footer).toEqual({ kind: 'route', label: 'Route naar Garmin Connect' });
  });
  it('Buiten is gekozen en op de plek van de kaart staat de route, die vandaag bij het openen zoekt', () => {
    expect(view?.place).toBe('run_outdoor');
    const target = routeTarget({ template: EASY, date: TODAY });
    expect(view?.map).toEqual({ kind: 'route', target, line: targetText(target), search: 'open' });
  });
  it('vier vakken behalve eten en drinken bij een korte loop, elk met één korte regel', () => {
    expect(view?.tiles.map((t) => t.id)).toEqual(['run', 'watch', 'weather']);
    expect(tile(view, 'run')?.line).toMatch(/^\d+ min, zone 2$/);
    expect(tile(view, 'watch')?.line).toBe('Staat erop, 07:18');
    expect(tile(view, 'weather')?.line).toMatch(/^9 graden, /);
    for (const t of view?.tiles ?? []) expect(t.line).not.toMatch(/[\u2013\u2014]/);
  });
  it('morgen zoekt hij ook bij het openen, verder weg pas na een tik', () => {
    expect(briefing(input({ date: '2026-11-12', session: plan('tpl_easy_run', '2026-11-12') }))?.map).toMatchObject({ search: 'open' });
    expect(briefing(input({ date: '2026-11-14', session: plan('tpl_easy_run', '2026-11-14') }))?.map).toMatchObject({ search: 'tap' });
  });
  it('versturen mislukt: het vak horloge is amber', () => {
    expect(tile(briefing(input({ watchStatus: { kind: 'failed', reason: 'geen verbinding' } })), 'watch')).toMatchObject({ line: 'Versturen lukte niet', tone: 'warn' });
  });
});

describe('zonder koppeling', () => {
  it('zelf invullen, en de knop in de onderbalk is Zelf invullen', () => {
    const view = briefing(input({ watchLink: { linked: false, autoTick: true, activities: true }, watchStatus: { kind: 'unlinked' } }));
    expect(view?.stand).toEqual({ kind: 'manual', reason: 'unlinked' });
    expect(view?.footer).toEqual({ kind: 'manual', label: 'Zelf invullen' });
    // De route blijft: de kaart hoort bij Buiten, niet bij de koppeling.
    expect(view?.map.kind).toBe('route');
    expect(tile(view, 'watch')?.line).toBe('Zelf nabouwen');
  });
  it('zolang de koppeling gelezen wordt: de veilige kant, zelf invullen', () => {
    expect(briefing(input({ watchLink: undefined }))?.stand).toEqual({ kind: 'manual', reason: 'unknown' });
  });
  it('Vanzelf afvinken uit, of geen trainingen van je horloge: zelf invullen', () => {
    expect(briefing(input({ watchLink: { linked: true, autoTick: false, activities: true } }))?.stand).toMatchObject({ reason: 'autoTickOff' });
    expect(briefing(input({ watchLink: { linked: true, autoTick: true, activities: false } }))?.stand).toMatchObject({ reason: 'noActivities' });
  });
});

describe('een stille koppeling', () => {
  // Vier dagen geen activiteit van het horloge terwijl je twee keer zelf iets invulde.
  const typed = (id: string, date: string): SessionLog => ({ id, templateId: 'tpl_easy_run', completedDate: date, type: 'cardio', variant: 'full', durationMinutes: 40, source: 'manual' } as SessionLog);
  const watchSource = {
    today: TODAY,
    linked: true,
    fetchedAt: new Date(2026, 10, 11, 7, 0).toISOString(),
    activitiesOn: true,
    morningsOn: false,
    activityDays: ['2026-11-06'],
    morningDays: [],
    logs: [typed('l1', '2026-11-08'), typed('l2', '2026-11-09')],
  };
  it('zelf invullen, met de zin van de bronbewaking', () => {
    const view = briefing(input({ watchSource }));
    expect(view?.stand).toMatchObject({ kind: 'manual', reason: 'silent' });
    expect(view?.stand.kind === 'manual' && view.stand.line).toMatch(/^Sinds /);
    expect(view?.footer.kind).toBe('manual');
  });
  it('alleen stille ochtenden: het horloge vinkt nog gewoon af', () => {
    const mornings = { ...watchSource, activitiesOn: false, morningsOn: true, morningDays: ['2026-11-06'], activityDays: [] };
    expect(briefing(input({ watchSource: mornings }))?.stand.kind).toBe('watch');
  });
});

describe('loopband', () => {
  const view = briefing(input({ storedPlace: 'run_treadmill' }));
  it('geen kaart en geen zoektocht: wat je op de band instelt', () => {
    expect(view?.place).toBe('run_treadmill');
    expect(view?.map.kind).toBe('place');
    expect(view?.map.kind === 'place' && view.map.title).toBe('Hardlopen, loopband');
  });
  it('geen weer en geen route-knop; je horloge vinkt nog steeds af', () => {
    expect(view?.tiles.map((t) => t.id)).toEqual(['run', 'watch']);
    expect(view?.stand.kind).toBe('watch');
    expect(view?.footer).toEqual({ kind: 'close', label: 'Sluiten' });
  });
  it('Buiten weer gekozen: de kaart is terug', () => {
    expect(briefing(input({ storedPlace: 'run_outdoor' }))?.map.kind).toBe('route');
  });
});

describe('testloop en wedstrijd', () => {
  it('een testloop vul je zelf in, ook met gekoppeld horloge', () => {
    const view = briefing(input({ template: TEST, session: plan('tpl_test_run') }));
    expect(view?.stand).toEqual({ kind: 'manual', reason: 'testOrRace', line: 'Een testloop vul je zelf in.' });
    expect(view?.footer.kind).toBe('manual');
  });
  it('een wedstrijd ook', () => {
    expect(briefing(input({ template: RACE, session: plan('tpl_race') }))?.stand).toMatchObject({ reason: 'testOrRace', line: 'Een wedstrijd vul je zelf in.' });
  });
});

describe('geen weer', () => {
  it('zonder voorspelling zegt het vak dat er nog geen weer is', () => {
    expect(tile(briefing(input({ forecast: undefined })), 'weather')?.line).toBe('Nog geen weer');
  });
  it('weer en kleding allebei uit: geen vak', () => {
    expect(tile(briefing(input({ weatherOn: false, clothingOn: false })), 'weather')).toBeUndefined();
  });
  it('slecht weer: amber', () => {
    const storm = makeForecast(TODAY, () => ({ tempC: 9, feelsC: 5, windKmh: 70, gustKmh: 100 }));
    expect(tile(briefing(input({ forecast: storm })), 'weather')?.tone).toBe('warn');
  });
});

describe('eten en drinken', () => {
  const long = (over: Partial<BriefingInput> = {}) => input({ template: LONG, session: { ...plan('tpl_long_run'), plannedMinutes: 100 }, ...over });
  it('geen drinkregel en geen eten bij een korte loop: geen vak', () => {
    expect(tile(briefing(input()), 'fuel')).toBeUndefined();
  });
  it('een lange loop buiten: drinken uit je zweettempo en eten onderweg, kort, uit dezelfde regels als De avond ervoor', () => {
    const line = tile(briefing(long()), 'fuel')?.line;
    const fuel = fuelForTraining(LONG, 100)!;
    expect(line).toMatch(new RegExp(`^[\\d,]+ liter en ${fuelShortText(fuel)} mee$`));
    const evening = drinkLine({ template: LONG, minutes: 100, forecast: input().forecast, logs: [], date: TODAY, now: NOW });
    expect(evening).toContain(line!.split(' en ')[0]);
  });
  it('zonder weer weet hij alleen dat je drinken meeneemt', () => {
    expect(tile(briefing(long({ forecast: undefined })), 'fuel')?.line).toBe(`Drinken en ${fuelShortText(fuelForTraining(LONG, 100)!)} mee`);
  });
  it('Eten onderweg uit: alleen drinken', () => {
    expect(tile(briefing(long({ fuelOn: false })), 'fuel')?.line).toMatch(/^[\d,]+ liter mee$/);
  });
  it('op de loopband geen drinkregel uit het weer van buiten, wel eten', () => {
    expect(tile(briefing(long({ storedPlace: 'long_run_treadmill' })), 'fuel')?.line).toBe(`${fuelShortText(fuelForTraining(LONG, 100)!).replace(/^./, (c) => c.toUpperCase())} mee`);
  });
});

describe('een rugzaktraining', () => {
  it('het gewicht staat in Wat je loopt, en buiten zonder lus van de planner staan de plekken in de buurt', () => {
    const view = briefing(input({ template: RUCK, session: plan('tpl_ruck_walk') }));
    expect(tile(view, 'run')?.line).toMatch(/rugzak \d/);
    expect(view?.map.kind).toBe('nearby');
  });
});

describe('een training die vandaag al gelogd is', () => {
  it('niets klaar te leggen: geen kaart, geen zoektocht, de knop is Sluiten', () => {
    const log = { id: 'l1', templateId: 'tpl_easy_run', plannedSessionId: 'p1', completedDate: TODAY, type: 'cardio', variant: 'full', durationMinutes: 40 } as SessionLog;
    const view = briefing(input({ logs: [log] }));
    expect(view?.stand).toEqual({ kind: 'done', line: 'Deze training is al gedaan.' });
    expect(view?.map.kind).toBe('none');
    expect(view?.footer.kind).toBe('close');
  });
});

describe('een oude back-up of een toestel zonder bewaarde keuze', () => {
  it('geen keuze, een kapotte of een onbekende: de standaard, Buiten', () => {
    for (const stored of [undefined, null, 42, { key: 'run_treadmill' }, 'bestaat_niet']) {
      const view = briefing(input({ storedPlace: stored }));
      expect(view?.place).toBe('run_outdoor');
      expect(view?.map.kind).toBe('route');
    }
  });
});

describe('fietsen op een loopdag', () => {
  it('buiten op de fiets: geen looplus en geen plekken om te wandelen', () => {
    expect(briefing(input({ storedPlace: 'bike_outdoor' }))?.map.kind).toBe('none');
  });
});

describe('Route voorstellen uit', () => {
  it('geen kaart, wel de vakken; de knop is Sluiten', () => {
    const view = briefing(input({ routeOn: false }));
    expect(view?.map.kind).toBe('none');
    expect(view?.tiles.length).toBeGreaterThan(0);
    expect(view?.footer.kind).toBe('close');
  });
});

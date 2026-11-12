// De Briefing zonder scherm (engine/briefing.ts). Nagemaakte trainingen, logs en weer; de klok staat op
// Europe/Amsterdam zoals bij de eigenaar.
(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';

import { describe, expect, it } from 'vitest';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { makeForecast } from './fixtures/weatherFixture';
import { resolveWatchModel } from './watchFields';
import { BRIEFING_TEXT, ZONE_FACT, briefing, briefingEntry, briefingRowLine, doTodayOpens, entryAction, footerNow, kmText, hasBriefing, missionButton, placeTransition, resolveRouteSearch, type BriefingInput } from './briefing';
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

// De rijen van de lijst (spoor 3 van docs/visie/Ontwerp trainingsscherm minimaal.md); eerder vier vakken.
const tile = (view: ReturnType<typeof briefing>, id: string) => view?.rows.find((t) => t.id === id);

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
    // Zonder lus geen onderbalk: de terugknop sluit (spoor 3, eerder Sluiten).
    expect(view?.footer).toEqual({ kind: 'route', label: 'Route naar Garmin Connect', fallback: { kind: 'none' } });
  });
  it('Buiten is gekozen en op de plek van de kaart staat de route, die vandaag bij het openen zoekt', () => {
    expect(view?.place).toBe('run_outdoor');
    const target = routeTarget({ template: EASY, date: TODAY });
    // Alleen de kilometers: de hoogtemeters staan in de hartkaart.
    expect(view?.map).toEqual({ kind: 'route', target, line: kmText(target), search: 'open' });
    expect(targetText(target).startsWith(kmText(target))).toBe(true);
  });
  it('één lijst: horloge, weer en voor en na, behalve eten bij een korte loop, elk met één korte regel', () => {
    expect(view?.rows.map((t) => t.id)).toEqual(['watch', 'weather', 'stretch']);
    expect(tile(view, 'watch')?.line).toBe('Staat erop, 07:18. Vinkt zelf af.');
    expect(tile(view, 'weather')?.line).toMatch(/^9 graden, /);
    for (const t of view?.rows ?? []) expect(t.line).not.toMatch(/[\u2013\u2014]/);
  });
  it('morgen zoekt hij ook bij het openen, verder weg pas na een tik', () => {
    expect(briefing(input({ date: '2026-11-12', session: plan('tpl_easy_run', '2026-11-12') }))?.map).toMatchObject({ search: 'open' });
    expect(briefing(input({ date: '2026-11-14', session: plan('tpl_easy_run', '2026-11-14') }))?.map).toMatchObject({ search: 'tap' });
  });
  it('versturen mislukt: de rij horloge krijgt een amber stip en de volledige tekst', () => {
    expect(tile(briefing(input({ watchStatus: { kind: 'failed', reason: 'geen verbinding' } })), 'watch')).toMatchObject({ line: 'Versturen lukte niet. Vinkt zelf af.', tone: 'warn' });
  });
});

describe('zonder koppeling', () => {
  it('zelf invullen; met een lus blijft de route naar je horloge de knop, zonder lus Gedaan', () => {
    const view = briefing(input({ watchLink: { linked: false, autoTick: true, activities: true }, watchStatus: { kind: 'unlinked' } }));
    expect(view?.stand).toEqual({ kind: 'manual', reason: 'unlinked' });
    expect(view?.footer).toEqual({ kind: 'route', label: 'Route naar Garmin Connect', fallback: { kind: 'manual', label: 'Gedaan' } });
    // De route blijft: de kaart hoort bij Buiten, niet bij de koppeling.
    expect(view?.map.kind).toBe('route');
    expect(tile(view, 'watch')?.line).toBe('Workout zelf instellen');
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
    expect(view?.footer.kind === 'route' && view.footer.fallback.kind).toBe('manual');
  });
  it('alleen stille ochtenden: het horloge vinkt nog gewoon af', () => {
    const mornings = { ...watchSource, activitiesOn: false, morningsOn: true, morningDays: ['2026-11-06'], activityDays: [] };
    expect(briefing(input({ watchSource: mornings }))?.stand.kind).toBe('watch');
  });
});

describe('loopband', () => {
  const view = briefing(input({ storedPlace: 'run_treadmill' }));
  it('geen kaart en geen zoektocht: wat je op de band instelt staat in de regel onder de chips', () => {
    expect(view?.place).toBe('run_treadmill');
    expect(view?.map.kind).toBe('place');
    expect(view?.placeLine).toMatch(/^(Ook goed|Als het niet anders kan)\. /);
  });
  it('geen weer en geen route-knop; je horloge vinkt nog steeds af; geen onderbalk', () => {
    expect(view?.rows.map((t) => t.id)).toEqual(['watch', 'stretch']);
    expect(view?.stand.kind).toBe('watch');
    expect(view?.footer).toEqual({ kind: 'none' });
  });
  it('Buiten weer gekozen: de kaart is terug', () => {
    expect(briefing(input({ storedPlace: 'run_outdoor' }))?.map.kind).toBe('route');
  });
});

describe('testloop en wedstrijd', () => {
  it('een testloop vul je zelf in, ook met gekoppeld horloge', () => {
    const view = briefing(input({ template: TEST, session: plan('tpl_test_run') }));
    expect(view?.stand).toEqual({ kind: 'manual', reason: 'testOrRace', line: 'Een testloop vul je zelf in.' });
    expect(view?.footer.kind === 'route' && view.footer.fallback.kind).toBe('manual');
  });
  it('een wedstrijd ook', () => {
    expect(briefing(input({ template: RACE, session: plan('tpl_race') }))?.stand).toMatchObject({ reason: 'testOrRace', line: 'Een wedstrijd vul je zelf in.' });
  });
});

describe('geen weer', () => {
  it('zonder voorspelling zegt de rij dat er nog geen weer is', () => {
    expect(tile(briefing(input({ forecast: undefined })), 'weather')?.line).toBe('Nog geen weer');
  });
  it('weer en kleding allebei uit: geen rij', () => {
    expect(tile(briefing(input({ weatherOn: false, clothingOn: false })), 'weather')).toBeUndefined();
  });
  it('slecht weer: een amber stip', () => {
    const storm = makeForecast(TODAY, () => ({ tempC: 9, feelsC: 5, windKmh: 70, gustKmh: 100 }));
    expect(tile(briefing(input({ forecast: storm })), 'weather')?.tone).toBe('warn');
  });
});

describe('eten en drinken', () => {
  const long = (over: Partial<BriefingInput> = {}) => input({ template: LONG, session: { ...plan('tpl_long_run'), plannedMinutes: 100 }, ...over });
  it('geen drinkregel en geen eten bij een korte loop: geen rij', () => {
    expect(tile(briefing(input()), 'fuel')).toBeUndefined();
  });
  it('een lange loop buiten: drinken uit je zweettempo en eten onderweg, kort, uit dezelfde regels als De avond ervoor', () => {
    const line = tile(briefing(long()), 'fuel')?.line;
    const fuel = fuelForTraining(LONG, 100)!;
    // De rij heet Mee; het woord staat niet meer achter de waarde.
    expect(line).toMatch(new RegExp(`^[\\d,]+ liter en ${fuelShortText(fuel)}$`));
    const evening = drinkLine({ template: LONG, minutes: 100, forecast: input().forecast, logs: [], date: TODAY, now: NOW });
    expect(evening).toContain(line!.split(' en ')[0]);
  });
  it('zonder weer weet hij alleen dat je drinken meeneemt', () => {
    expect(tile(briefing(long({ forecast: undefined })), 'fuel')?.line).toBe(`Drinken en ${fuelShortText(fuelForTraining(LONG, 100)!)}`);
  });
  it('Eten onderweg uit: alleen drinken', () => {
    expect(tile(briefing(long({ fuelOn: false })), 'fuel')?.line).toMatch(/^[\d,]+ liter$/);
  });
  it('op de loopband geen drinkregel uit het weer van buiten, wel eten', () => {
    expect(tile(briefing(long({ storedPlace: 'long_run_treadmill' })), 'fuel')?.line).toBe(`${fuelShortText(fuelForTraining(LONG, 100)!).replace(/^./, (c) => c.toUpperCase())}`);
  });
});

describe('een rugzaktraining', () => {
  it('het gewicht staat in de hartkaart, en buiten zonder lus van de planner staan de plekken in de buurt', () => {
    const view = briefing(input({ template: RUCK, session: plan('tpl_ruck_walk') }));
    expect(view?.heart.facts.find((f) => f.label === 'rugzak')?.value).toMatch(/^\d/);
    expect(view?.map.kind).toBe('nearby');
  });
});

describe('een training die vandaag al gelogd is', () => {
  it('niets klaar te leggen: geen kaart, geen zoektocht, geen knop', () => {
    const log = { id: 'l1', templateId: 'tpl_easy_run', plannedSessionId: 'p1', completedDate: TODAY, type: 'cardio', variant: 'full', durationMinutes: 40 } as SessionLog;
    const view = briefing(input({ logs: [log] }));
    expect(view?.stand).toEqual({ kind: 'done', line: 'Deze training is al gedaan.' });
    expect(view?.map.kind).toBe('none');
    expect(view?.footer.kind).toBe('none');
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
  it('geen kaart, wel de lijst; geen onderbalk', () => {
    const view = briefing(input({ routeOn: false }));
    expect(view?.map.kind).toBe('none');
    expect(view?.rows.length).toBeGreaterThan(0);
    expect(view?.footer.kind).toBe('none');
  });
});

describe('Lus zoeken (spoor 5)', () => {
  it('het advies is zoeken bij het openen, ook voor een oude back-up zonder de instelling of een kapotte waarde', () => {
    expect(resolveRouteSearch(undefined)).toBe('open');
    expect(resolveRouteSearch('open')).toBe('open');
    expect(resolveRouteSearch(42)).toBe('open');
    expect(resolveRouteSearch('tap')).toBe('tap');
    expect(briefing(input({ routeSearch: undefined }))?.map).toMatchObject({ search: 'open' });
  });
  it('Na een tik: ook vandaag pas zoeken na een tik', () => {
    expect(briefing(input({ routeSearch: 'tap' }))?.map).toMatchObject({ kind: 'route', search: 'tap' });
  });
});

describe('Zelf invullen vooraf', () => {
  it('een training van morgen zonder koppeling: zonder lus geen onderbalk, invullen kan op de dag zelf', () => {
    const view = briefing(input({ date: '2026-11-12', session: plan('tpl_easy_run', '2026-11-12'), watchLink: { linked: false, autoTick: true, activities: true } }));
    expect(view?.stand.kind).toBe('manual');
    expect(view?.footer).toEqual({ kind: 'route', label: 'Route naar Garmin Connect', fallback: { kind: 'none' } });
  });
});

describe('de ingang en de knop op Vandaag (spoor 6)', () => {
  const linked = { linked: true, autoTick: true, activities: true };
  // Spoor 1 van docs/visie/Ontwerp trainingsscherm minimaal.md: elke training te voet, ook wandelen.
  it('de ingang: elke training te voet, ook wandelen en rugzak; niet kracht, rust of fietsen', () => {
    expect(briefingEntry(EASY)).toBe(true);
    expect(briefingEntry(LONG)).toBe(true);
    expect(briefingEntry(TEST)).toBe(true);
    expect(briefingEntry(RUCK)).toBe(true);
    expect(briefingEntry(byId('tpl_mountain_hike'))).toBe(true);
    expect(briefingEntry(byId('tpl_bergconditie'))).toBe(true);
    for (const t of templates) expect(briefingEntry(t)).toBe(hasBriefing(t));
    expect(briefingEntry(byId('tpl_upper_a'))).toBe(false);
    expect(briefingEntry(byId('tpl_herstel'))).toBe(false);
    expect(briefingEntry(byId('tpl_bike'))).toBe(false);
  });
  it('gekoppeld horloge dat afvinkt: Briefing', () => {
    expect(missionButton({ template: EASY, session: plan('tpl_easy_run'), logs: [], watchLink: linked })).toBe('briefing');
  });
  it('geen koppeling, of de koppeling wordt nog gelezen: Gedaan', () => {
    expect(missionButton({ template: EASY, session: plan('tpl_easy_run'), logs: [], watchLink: { ...linked, linked: false } })).toBe('done');
    expect(missionButton({ template: EASY, session: plan('tpl_easy_run'), logs: [] })).toBe('done');
  });
  it('een stille koppeling: Gedaan', () => {
    const typed = (id: string, date: string): SessionLog => ({ id, templateId: 'tpl_easy_run', completedDate: date, type: 'cardio', variant: 'full', durationMinutes: 40, source: 'manual' } as SessionLog);
    const watchSource = { today: TODAY, linked: true, fetchedAt: new Date(2026, 10, 11, 7, 0).toISOString(), activitiesOn: true, morningsOn: false, activityDays: ['2026-11-06'], morningDays: [], logs: [typed('l1', '2026-11-08'), typed('l2', '2026-11-09')] };
    expect(missionButton({ template: EASY, session: plan('tpl_easy_run'), logs: [], watchLink: linked, watchSource })).toBe('done');
  });
  it('testloop en wedstrijd: Gedaan, zoals de uitzondering in Vanzelf afvinken', () => {
    expect(missionButton({ template: TEST, session: plan('tpl_test_run'), logs: [], watchLink: linked })).toBe('done');
    expect(missionButton({ template: RACE, session: plan(RACE.id), logs: [], watchLink: linked })).toBe('done');
  });
  // Besluit 2026-11-12-trainingsscherm-sporen-1-4.md: een wandeling volgt nu dezelfde regel als een loop.
  it('kracht: Gedaan; een wandeling met een horloge dat afvinkt: Briefing, zonder koppeling Gedaan', () => {
    expect(missionButton({ template: byId('tpl_upper_a'), session: plan('tpl_upper_a'), logs: [], watchLink: linked })).toBe('done');
    expect(missionButton({ template: RUCK, session: plan('tpl_ruck_walk'), logs: [], watchLink: linked })).toBe('briefing');
    expect(missionButton({ template: RUCK, session: plan('tpl_ruck_walk'), logs: [], watchLink: { ...linked, linked: false } })).toBe('done');
    expect(missionButton({ template: RUCK, session: plan('tpl_ruck_walk'), logs: [] })).toBe('done');
  });
});

describe('beweging bij wisselen van plek', () => {
  it('in Vol 200 ms, in Rustig en Uit direct op de eindstand', () => {
    expect(placeTransition('full')).toMatch(/200ms ease-out/);
    expect(placeTransition('calm')).toBeUndefined();
    expect(placeTransition('off')).toBeUndefined();
  });
});

describe('het vak weer en kleding is kort', () => {
  it('alleen de eerste zin van de kleding: geen tweede zin in een smal vak', () => {
    const cold = briefing(input({ forecast: makeForecast(TODAY, () => ({ tempC: 4, feelsC: 1 })) }));
    const line = tile(cold, 'weather')?.line ?? '';
    expect(line).toMatch(/^4 graden, /);
    expect(line).not.toContain('.');
  });
});

describe('de regel onder de rij Briefing in Week', () => {
  it('zonder route, horloge, weer en eten: Wat je loopt', () => {
    const bare = briefing(input({ routeOn: false, weatherOn: false, clothingOn: false, watch: { ...input().watch, showStatus: false, fieldsShown: false }, watchLink: { linked: false, autoTick: false, activities: false } }))!;
    expect(briefingRowLine({ ...bare, rows: bare.rows.filter((r) => r.id === 'stretch') })).toBe(BRIEFING_TEXT.run);
  });
  it('wat er echt in staat: geen eten bij een korte loop', () => {
    expect(briefingRowLine(briefing(input())!)).toBe('Route, horloge en weer');
  });
  it('een lange loop: ook eten', () => {
    expect(briefingRowLine(briefing(input({ template: LONG, session: { ...plan('tpl_long_run'), plannedMinutes: 100 } }))!)).toMatch(/^Route, horloge, weer en eten$/);
  });
  it('loopband: geen route en geen weer', () => {
    expect(briefingRowLine(briefing(input({ storedPlace: 'run_treadmill' }))!)).toBe('Loopband en horloge');
  });
});

// ---- sporen 1 tot 4 van docs/visie/Ontwerp trainingsscherm minimaal.md -------------------------

const INTERVALS = byId('tpl_intervals');
const views = (over: Partial<BriefingInput> = {}) => briefing(input(over))!;
// Alle tekst die de Briefing toont, behalve de stopregels (die zeggen zelf iets over praten).
const screenText = (v: NonNullable<ReturnType<typeof briefing>>) =>
  [v.head.eyebrow, v.head.purpose, v.head.dayLine, ...v.heart.facts.map((f) => `${f.value} ${f.label}`), v.placeLine ?? '', ...v.rows.map((r) => `${r.label} ${r.line}`), v.stand.kind !== 'watch' ? v.stand.line ?? '' : ''].join(' | ');

describe('spoor 1: de ingang', () => {
  it('Hoe je het doet en Training starten worden de Briefing voor een training te voet, ook op een dag die voorbij is', () => {
    expect(entryAction('preview', EASY)).toBe('briefing');
    expect(entryAction('start', LONG)).toBe('briefing');
    expect(entryAction('preview', RUCK)).toBe('briefing');
    expect(entryAction('done', EASY)).toBe('done');
    expect(entryAction('doToday', EASY)).toBe('doToday');
    expect(entryAction('move', RUCK)).toBe('move');
  });
  it('kracht, rust en fietsen houden hun eigen scherm', () => {
    expect(entryAction('start', byId('tpl_upper_a'))).toBe('start');
    expect(entryAction('preview', byId('tpl_bike'))).toBe('preview');
    expect(entryAction('start', byId('tpl_herstel'))).toBe('start');
  });
  it('de knop op Vandaag volgt de stand voor elke training te voet, ook een wandeling en een training op de loopband', () => {
    const linked = { linked: true, autoTick: true, activities: true };
    for (const t of templates.filter((x) => hasBriefing(x))) {
      const want = briefing(input({ template: t, session: plan(t.id) }))!.stand.kind === 'watch' ? 'briefing' : 'done';
      expect(missionButton({ template: t, session: plan(t.id), logs: [], watchLink: linked })).toBe(want);
    }
    expect(missionButton({ template: byId('tpl_bergconditie'), session: plan('tpl_bergconditie'), logs: [], watchLink: linked })).toBe('briefing');
  });
  it('testloop en wedstrijd: altijd zelf invullen, ook via Vandaag al doen', () => {
    const linked = { linked: true, autoTick: true, activities: true };
    for (const t of [TEST, RACE]) {
      expect(missionButton({ template: t, session: plan(t.id), logs: [], watchLink: linked })).toBe('done');
      expect(doTodayOpens(t)).toBe('log');
    }
  });
  it('Vandaag al doen: te voet het invullen, kracht zijn eigen scherm', () => {
    expect(doTodayOpens(LONG)).toBe('log');
    expect(doTodayOpens(RUCK)).toBe('log');
    expect(doTodayOpens(byId('tpl_upper_a'))).toBe('start');
    expect(doTodayOpens(byId('tpl_bike'))).toBe('start');
  });
});

describe('spoor 2: de kop en de hartkaart', () => {
  const long = views({ template: LONG, session: plan('tpl_long_run') });
  it('de kop: het kopje van de training, één zin uitleg en de dag', () => {
    expect(long.head.eyebrow).toMatch(/^HARDLOPEN/);
    expect(long.head.purpose.match(/[.!?](\s|$)/g)?.length ?? 1).toBeLessThanOrEqual(1);
    expect(long.head.dayLine).toMatch(/^Wo 11 november/);
  });
  it('een lange duurloop: de duur en de hoogtemeters, de zonebalk op zone 2; zone en praattest niet als getal', () => {
    expect(long.heart.zone).toBe(2);
    expect(long.heart.steps).toBe(false);
    expect(long.heart.facts.map((f) => f.label)).toEqual(['totaal', 'omhoog als het kan']);
    expect(long.heart.facts.some((f) => ZONE_FACT.test(f.value))).toBe(false);
  });
  it('een interval: het profiel van de stappen, geen zonebalk', () => {
    const v = views({ template: INTERVALS, session: plan('tpl_intervals') });
    expect(v.heart.steps).toBe(true);
    expect(v.heart.zone).toBeUndefined();
    expect(v.heart.facts[0].label).toBe('totaal');
  });
  it('een wandeling met rugzak: de rugzak in het hart, de praattest één keer (onder de balk)', () => {
    const v = views({ template: RUCK, session: plan('tpl_ruck_walk') });
    expect(v.heart.facts.some((f) => f.label === 'rugzak')).toBe(true);
    expect(v.heart.facts.some((f) => ZONE_FACT.test(f.value))).toBe(false);
  });
  it('zonder hartslaggegevens en zonder testtempo: dezelfde hartkaart, niets verzonnen', () => {
    const a = views({ easyPace: undefined });
    const b = views({ easyPace: { fast: 330, slow: 360 } });
    expect(a.heart).toEqual(b.heart);
  });
  it('het vak Wat je loopt bestaat niet meer: de lijst heeft geen rij voor de duur of de zone', () => {
    for (const v of [views(), views({ template: LONG, session: plan('tpl_long_run') }), views({ template: RUCK, session: plan('tpl_ruck_walk') })]) {
      expect(v.rows.map((r) => r.id)).not.toContain('run');
      for (const r of v.rows) expect(r.line).not.toMatch(/zone|min\b|praten/i);
    }
  });
});

describe('spoor 3: één lijst, het horloge één keer, één knop', () => {
  it('de tekst van het scherm noemt zone en praattest nergens buiten de balk, en de duur één keer', () => {
    for (const v of [views(), views({ template: LONG, session: plan('tpl_long_run') })]) {
      const text = screenText(v);
      expect(text).not.toMatch(/zone \d|praten/i);
      const minutes = v.heart.facts[0].value;
      expect(text.split(minutes).length - 1).toBe(1);
    }
  });
  it('het horloge één keer: alleen de rij Horloge, en die zegt ook wie afvinkt', () => {
    const v = views();
    const text = screenText(v).toLowerCase();
    expect(text.split('horloge').length - 1).toBe(1);
    expect(tile(v, 'watch')?.line).toContain(BRIEFING_TEXT.watchTicks);
  });
  it('zonder horloge dat afvinkt: de rij zegt alleen wat er op je horloge staat', () => {
    const v = views({ watchLink: { linked: false, autoTick: true, activities: true }, watchStatus: { kind: 'unlinked' } });
    expect(tile(v, 'watch')?.line).not.toContain(BRIEFING_TEXT.watchTicks);
  });
  it('verstuurd op een andere dag: sinds die dag', () => {
    const v = views({ watchStatus: { kind: 'sent', sentAt: new Date(2026, 10, 9, 20, 0).toISOString() } });
    expect(tile(v, 'watch')?.line).toBe('Staat erop sinds 9 november. Vinkt zelf af.');
  });
  it('de regel Je training noemt alleen de kilometers, ook met hoogtemeters', () => {
    const v = views({ template: LONG, session: plan('tpl_long_run') });
    expect(v.map.kind === 'route' && v.map.line).toMatch(/^[\d,]+ km$/);
  });
  it('opwarmen en rekken in één rij, die het blad opent', () => {
    expect(tile(views({ template: LONG, session: plan('tpl_long_run') }), 'stretch')).toMatchObject({ label: 'Voor en na', opens: true });
  });
  it('de onderbalk: de route, of Gedaan op de dag zelf zonder horloge dat afvinkt, of geen', () => {
    expect(views().footer).toMatchObject({ kind: 'route', fallback: { kind: 'none' } });
    expect(views({ routeOn: false, watchLink: { linked: false, autoTick: true, activities: true } }).footer).toEqual({ kind: 'manual', label: 'Gedaan' });
    expect(views({ routeOn: false }).footer).toEqual({ kind: 'none' });
    const ahead = views({ routeOn: false, date: '2026-11-14', session: plan('tpl_easy_run', '2026-11-14'), watchLink: undefined });
    expect(ahead.footer).toEqual({ kind: 'none' });
  });
  it('een wedstrijd en een testloop: zelf invullen, met hun eigen regel; het horloge vinkt niet af', () => {
    for (const t of [TEST, RACE]) {
      const v = views({ template: t, session: plan(t.id) });
      expect(v.stand.kind).toBe('manual');
      expect(tile(v, 'watch')?.line ?? '').not.toContain(BRIEFING_TEXT.watchTicks);
    }
  });
  it('een stille koppeling: zelf invullen, en de zin staat er volledig', () => {
    const typed = (id: string, date: string): SessionLog => ({ id, templateId: 'tpl_easy_run', completedDate: date, type: 'cardio', variant: 'full', durationMinutes: 40, source: 'manual' } as SessionLog);
    const watchSource = { today: TODAY, linked: true, fetchedAt: new Date(2026, 10, 11, 7, 0).toISOString(), activitiesOn: true, morningsOn: false, activityDays: ['2026-11-06'], morningDays: [], logs: [typed('l1', '2026-11-08'), typed('l2', '2026-11-09')] };
    const v = views({ watchSource });
    expect(v.stand.kind === 'manual' && v.stand.line).toMatch(/^Sinds .*\.$/);
    expect(tile(v, 'watch')?.line).not.toContain(BRIEFING_TEXT.watchTicks);
  });
  it('al gedaan: geen kaart, geen knop, wel de regel', () => {
    const log = { id: 'l1', templateId: 'tpl_easy_run', plannedSessionId: 'p1', completedDate: TODAY, type: 'cardio', variant: 'full', durationMinutes: 40 } as SessionLog;
    const v = views({ logs: [log] });
    expect(v.footer.kind).toBe('none');
    expect(v.stand).toMatchObject({ kind: 'done', line: BRIEFING_TEXT.done });
  });
  it('geen gedachtestreepjes in wat de Briefing zegt', () => {
    for (const v of [views(), views({ template: LONG, session: plan('tpl_long_run') }), views({ template: INTERVALS, session: plan('tpl_intervals') }), views({ template: RUCK, session: plan('tpl_ruck_walk') }), views({ storedPlace: 'run_treadmill' })]) {
      expect(screenText(v)).not.toMatch(/[\u2013\u2014]/);
      for (const s of v.stopSignals) expect(s).not.toMatch(/[\u2013\u2014]/);
    }
  });
});

describe('spoor 4: de stopregels en de regel onder de chips', () => {
  it('de stopregels staan er volledig bij elke plek', () => {
    for (const t of [EASY, LONG, INTERVALS, RUCK]) {
      for (const c of (placeChoicesOf(t))) {
        const v = views({ template: t, session: plan(t.id), storedPlace: c });
        expect(v.stopSignals.length).toBeGreaterThan(0);
      }
    }
  });
  it('bij de standaard geen regel onder de chips; bij een andere keuze het oordeel en wat je anders doet', () => {
    expect(views().placeLine).toBeUndefined();
    expect(views({ storedPlace: 'run_outdoor' }).placeLine).toBeUndefined();
    const hike = views({ template: LONG, session: plan('tpl_long_run'), storedPlace: 'long_hike_outdoor' }).placeLine;
    expect(hike).toMatch(/^Ook goed\. /);
    expect(hike).toContain('Dit telt als wandelen, niet als hardlopen.');
  });
  it('een kapotte bewaarde keuze is de standaard: geen regel', () => {
    expect(views({ storedPlace: 42 }).placeLine).toBeUndefined();
  });
});

function placeChoicesOf(t: SessionTemplate): string[] {
  return (briefing(input({ template: t, session: plan(t.id) }))?.places ?? []).filter((p) => !p.locked).map((p) => p.key);
}

describe('spoor 1 met het blad in Week: de oorzaak bij de Lange duurloop', () => {
  it('een dag die voorbij is, of vooraf, of de dag zelf: nergens nog Hoe je het doet voor een training te voet', async () => {
    const { sessionSheetActions } = await import('./sessionActions');
    for (const date of ['2026-11-09', TODAY, '2026-11-15']) {
      for (const t of [LONG, RUCK]) {
        const planned = sessionSheetActions({ date, today: TODAY, skipped: false, canComeBack: false, kind: 'log', briefing: briefingEntry(t) });
        const all = [planned.main, ...planned.rows].map((a) => entryAction(a, t));
        expect(all).not.toContain('start');
        expect(all).not.toContain('preview');
        expect(all).toContain('briefing');
      }
    }
  });
});

describe('de knop die nu onderaan staat', () => {
  const route = { kind: 'route', label: BRIEFING_TEXT.sendRoute, fallback: { kind: 'manual', label: 'Gedaan' } } as const;
  it('de route zodra de lus er is; zolang hij zoekt (of pas na een tik) Gedaan', () => {
    expect(footerNow(route, true, true)).toBe('route');
    expect(footerNow(route, false, true)).toBe('manual');
  });
  it('zonder weg naar het invullen (vooraf): geen onderbalk', () => {
    expect(footerNow(route, false, false)).toBe('none');
    expect(footerNow({ kind: 'manual', label: 'Gedaan' }, false, false)).toBe('none');
    expect(footerNow({ kind: 'route', label: BRIEFING_TEXT.sendRoute, fallback: { kind: 'none' } }, false, true)).toBe('none');
  });
});

import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { pendingProposals, proposeImport, type ExternalActivity, type ImportFit } from './activityImport';
import { autoTickMatch, planAutoTicks } from './autoTick';
import { coachReaction, EXTRA_TRAINING_TEXT } from './coach';
import { linkCandidates } from './missedTraining';
import { hardEffort, isEasyRun, isWalkLike, isWalkPaced, logSizeFits, paceText, resolveWatchKindCheck } from './activityFit';
import { SHORT_TRAINING_TEXT } from './shortTraining';

// Alles nagemaakt: stand, lopen en hartslag.
const templates: SessionTemplate[] = buildDefaultProgramData().templates;
const byId = (id: string) => templates.find((t) => t.id === id)!;
const DAY = '2026-11-05';
// LTHR 170: zone 2 gaat tot 151, hard vanaf 157 gemiddeld.
const FIT: ImportFit = { hr: { lthr: 170 }, kindCheck: true };

function planned(id: string, templateId: string, scheduledDate = DAY, extra: Partial<PlannedSession> = {}): PlannedSession {
  return { id, templateId, scheduledDate, weekStartDate: '2026-11-02', status: 'planned', order: 0, ...extra };
}

function act(id: string, extra: Partial<ExternalActivity> = {}): ExternalActivity {
  return { externalId: `test:${id}`, source: 'garmin', start: `${DAY}T07:30:00`, kind: 'run', durationSec: 42 * 60, distanceM: 6800, avgHeartRate: 142, treadmill: false, ...extra };
}

function watchLog(id: string, extra: Partial<SessionLog> = {}): SessionLog {
  return {
    id, templateId: 'tpl_easy_run', type: 'cardio', sport: 'running', completedDate: DAY, completedAt: `${DAY}T08:10:00.000Z`, variant: 'custom', durationMinutes: 42,
    source: 'garmin', externalId: `test:${id}`, cardioData: { durationMinutes: 42, distanceKm: 6.8, avgHeartRate: 142, environment: 'outdoor', source: 'garmin' }, ...extra,
  } as SessionLog;
}

describe('de toetsen zelf', () => {
  it('wandeltempo vanaf 10 min per km, niet onder een halve km', () => {
    expect(isWalkPaced({ minutes: 55, km: 4.2 })).toBe(true); // 13:06 per km
    expect(isWalkPaced({ minutes: 59, km: 6 })).toBe(false); // 9:50 per km
    expect(isWalkPaced({ minutes: 10, km: 0.4 })).toBe(false);
    expect(isWalkPaced({ minutes: 55 })).toBe(false);
    expect(paceText(786)).toBe('13:06');
  });

  it('hard: hartslag meer dan 5 boven zone 2; zonder hartslag het tempo; zonder beide geen oordeel', () => {
    expect(hardEffort({ minutes: 44, km: 10, avgHr: 172 }, FIT)).toEqual({ by: 'hr', value: 172, limit: 151 });
    expect(hardEffort({ minutes: 44, km: 10, avgHr: 156 }, FIT)).toBeUndefined();
    const easyPace = { fast: 340, slow: 380 };
    expect(hardEffort({ minutes: 44, km: 10 }, { easyPace })).toEqual({ by: 'pace', value: 264, limit: 340 });
    expect(hardEffort({ minutes: 44, km: 10, treadmill: true }, { easyPace })).toBeUndefined();
    expect(hardEffort({ minutes: 44, km: 10 }, {})).toBeUndefined();
    expect(hardEffort({ minutes: 44, km: 10, avgHr: 172 }, {})).toBeUndefined();
  });

  it('een rustige duurloop is rustig, een tempoloop niet', () => {
    expect(isEasyRun(byId('tpl_easy_run'), DAY, null)).toBe(true);
    expect(isEasyRun(byId('tpl_tempo_run'), DAY, null)).toBe(false);
    expect(isEasyRun(byId('tpl_test_run'), DAY, null)).toBe(false);
  });

  it('de keuze staat standaard aan', () => {
    expect(resolveWatchKindCheck(undefined)).toBe(true);
    expect(resolveWatchKindCheck(false)).toBe(false);
  });
});

describe('inloop plus loop op één dag', () => {
  // Zondag 15 november in het profiel: 's ochtends een inloop van 9 min, daarna de lange duurloop van 90 min.
  const plan = [planned('long', 'tpl_long_run', DAY, { plannedMinutes: 70 })];
  const warm = act('warm', { start: `${DAY}T08:00:00`, durationSec: 9 * 60, distanceM: 1500 });
  const long = act('long', { start: `${DAY}T08:15:00`, durationSec: 90 * 60, distanceM: 14000 });

  it('de lange loop houdt de training, de inloop komt los met een regel waarom', () => {
    const proposals = pendingProposals([warm, long], [], plan, templates, [], undefined, FIT);
    expect(proposals.map((p) => [p.activity.externalId, p.match?.session.id])).toEqual([['test:long', 'long'], ['test:warm', undefined]]);
    expect(proposals[1].fitNote).toBe('Een andere activiteit van die dag past beter bij lange duurloop.');
  });

  it('ook als de inloop de nieuwste is, kiest de kaart niet stil de nieuwste', () => {
    // Do 5 november: 42 min 's ochtends, 12 min 's avonds, gepland 35.
    const morning = act('am', { start: `${DAY}T07:00:00` });
    const evening = act('pm', { start: `${DAY}T19:00:00`, durationSec: 12 * 60, distanceM: 2000 });
    const proposals = pendingProposals([evening, morning], [], [planned('easy', 'tpl_easy_run', DAY, { plannedMinutes: 35 })], templates, [], undefined, FIT);
    expect(proposals[0]).toMatchObject({ activity: { externalId: 'test:am' }, match: { session: { id: 'easy' } } });
    expect(proposals[1].match).toBeUndefined();
  });

  it('vanzelf afvinken: alleen de lange loop', () => {
    const ticks = planAutoTicks([warm, long], [], [], plan, templates, [], DAY, undefined, FIT);
    expect(ticks.map((t) => t.activity.externalId)).toEqual(['test:long']);
  });
});

describe('een loop van 12 min bij 45 gepland', () => {
  const plan = [planned('easy', 'tpl_easy_run', DAY, { plannedMinutes: 45 })];
  const short = act('short', { durationSec: 12 * 60, distanceM: 2000 });

  it('wordt niet vanzelf afgevinkt, en de kaart zegt dat hij kort is', () => {
    expect(autoTickMatch(short, plan, templates, [], DAY, undefined, FIT)).toBeUndefined();
    const p = proposeImport(short, plan, templates, [], undefined, undefined, FIT)!;
    expect(p.match?.session.id).toBe('easy');
    expect(p.fitNote).toBe('Kort voor rustige duurloop: 12 van 45 min. Hoort hij er niet bij, kies dan Andere training.');
  });

  it('opgeslagen heet hij geen "zoals gepland"', () => {
    const log = watchLog('short', { plannedSessionId: 'easy', durationMinutes: 12, cardioData: { durationMinutes: 12, distanceKm: 2, avgHeartRate: 140, source: 'garmin' } });
    expect(coachReaction(log, byId('tpl_easy_run'), null, [], FIT)).toBe(SHORT_TRAINING_TEXT);
  });

  it('een kracht van 28 min tegen 60 ook niet', () => {
    const log = { id: 's', templateId: 'tpl_upper_a', type: 'strength', completedDate: DAY, completedAt: `${DAY}T19:00:00Z`, variant: 'custom', durationMinutes: 28, plannedSessionId: 'x', source: 'garmin', externalId: 'test:s' } as SessionLog;
    const upper = { ...byId('tpl_upper_a'), durationVariants: { ...byId('tpl_upper_a').durationVariants, full: 60 } };
    expect(coachReaction(log, upper, null, [], FIT)).toBe(SHORT_TRAINING_TEXT);
  });
});

describe('een harde loop bij een rustige training', () => {
  const plan = [planned('easy', 'tpl_easy_run', DAY, { plannedMinutes: 45 })];
  const hard = act('hard', { durationSec: 44 * 60, distanceM: 10000, avgHeartRate: 172 });

  it('geen vinkje vanzelf; de kaart zegt harder dan gepland, met de getallen', () => {
    expect(autoTickMatch(hard, plan, templates, [], DAY, undefined, FIT)).toBeUndefined();
    // Zonder zones of tempo's is er geen oordeel: dan blijft vanzelf afvinken zoals het was.
    expect(autoTickMatch(hard, plan, templates, [], DAY)?.session.id).toBe('easy');
    const p = proposeImport(hard, plan, templates, [], undefined, undefined, FIT)!;
    expect(p.fitNote).toBe('Harder dan gepland: gemiddeld 172 bpm, zone 2 gaat tot 151.');
  });

  it('opgeslagen: harder dan gepland, niet zoals gepland', () => {
    const log = watchLog('hard', { plannedSessionId: 'easy', durationMinutes: 44, cardioData: { durationMinutes: 44, distanceKm: 10, avgHeartRate: 172, source: 'garmin' } });
    expect(coachReaction(log, byId('tpl_easy_run'), null, [], FIT)).toBe('Harder dan gepland: gemiddeld 172 bpm, zone 2 gaat tot 151. Een rustige training loop je in zone 2.');
  });

  it('een harde loop zonder training wordt een tempoloop, met de keuze uit blijft hij rustig', () => {
    const free = proposeImport(hard, [], templates, [], undefined, undefined, FIT)!;
    expect(free.template?.id).toBe('tpl_tempo_run');
    expect(free.fitNote).toBe('Harder dan rustig: gemiddeld 172 bpm, zone 2 gaat tot 151. Dit wordt een tempoloop.');
    expect(proposeImport(hard, [], templates, [], undefined, undefined, { ...FIT, kindCheck: false })!.template?.id).toBe('tpl_easy_run');
  });

  it('een losse log zonder planning heet een extra training', () => {
    const log = watchLog('free', { templateId: 'tpl_tempo_run', durationMinutes: 44 });
    expect(coachReaction(log, byId('tpl_tempo_run'), null, [], FIT)).toBe(EXTRA_TRAINING_TEXT);
  });
});

describe('een wandeling van 4 km bij een lange duurloop', () => {
  // Ma 2 november: type Run, 4,2 km in 55 min, hartslag 104.
  const walk = act('walk', { start: '2026-11-02T10:00:00', durationSec: 55 * 60, distanceM: 4200, avgHeartRate: 104 });

  it('op de kaart een wandeling, met de reden; Andere training houdt de loop', () => {
    const p = proposeImport(walk, [planned('long', 'tpl_long_run', '2026-11-02')], templates, [], undefined, undefined, FIT)!;
    expect(p.activity.kind).toBe('hike');
    expect(p.original?.kind).toBe('run');
    expect(p.match).toBeUndefined();
    expect(p.template?.id).toBe('tpl_herstel');
    expect(p.fitNote).toBe('Wandeltempo, 13:06 per km: dit wordt een herstelwandeling. Was het een loop? Kies dan Andere training.');
    expect(autoTickMatch(walk, [planned('long', 'tpl_long_run', '2026-11-02')], templates, [], '2026-11-02', undefined, FIT)).toBeUndefined();
  });

  it('met de keuze uit blijft het een loop', () => {
    const p = proposeImport(walk, [], templates, [], undefined, undefined, { ...FIT, kindCheck: false })!;
    expect(p.activity.kind).toBe('run');
    expect(p.original).toBeUndefined();
  });

  it('de koppelkaart achteraf noemt hem niet de lange duurloop', () => {
    const log = watchLog('walk', { completedDate: '2026-11-02', completedAt: '2026-11-02T11:00:00Z', durationMinutes: 55, cardioData: { durationMinutes: 55, distanceKm: 4.2, avgHeartRate: 104, source: 'garmin' } });
    const plan = [planned('long', 'tpl_long_run', '2026-11-01')];
    expect(linkCandidates({ plannedSessions: plan, logs: [log], templates, today: '2026-11-03' }).size).toBe(0);
    // Een echte loop van 60 min wel.
    const real = watchLog('real', { completedDate: '2026-11-02', completedAt: '2026-11-02T11:00:00Z', durationMinutes: 60, cardioData: { durationMinutes: 60, distanceKm: 10, source: 'garmin' } });
    expect([...linkCandidates({ plannedSessions: plan, logs: [real], templates, today: '2026-11-03' }).keys()]).toEqual(['long']);
  });

  it('een inloop van 9 min ook niet; kracht houdt zijn eigen lengte', () => {
    const warm = watchLog('w', { durationMinutes: 9, cardioData: { durationMinutes: 9, distanceKm: 1.5, source: 'garmin' } });
    expect(logSizeFits(warm, byId('tpl_long_run'), 70)).toBe(false);
    const strength = { id: 's', templateId: 'tpl_upper_a', type: 'strength', durationMinutes: 20 } as SessionLog;
    expect(logSizeFits(strength, byId('tpl_upper_a'), 60)).toBe(true);
  });
});

describe('geen hartslag in de data', () => {
  const plan = [planned('easy', 'tpl_easy_run', DAY, { plannedMinutes: 45 })];
  const noHr = act('nohr', { durationSec: 44 * 60, distanceM: 10000, avgHeartRate: undefined });

  it('zonder tempo\'s: geen oordeel over hard, vanzelf afvinken zoals het was', () => {
    expect(autoTickMatch(noHr, plan, templates, [], DAY, undefined, FIT)?.session.id).toBe('easy');
    expect(proposeImport(noHr, plan, templates, [], undefined, undefined, FIT)!.fitNote).toBeUndefined();
    const log = watchLog('nohr', { plannedSessionId: 'easy', durationMinutes: 44, cardioData: { durationMinutes: 44, distanceKm: 10, source: 'garmin' } });
    expect(coachReaction(log, byId('tpl_easy_run'), null, [], FIT)).toBe('Gedaan zoals gepland. Zo bouw je op.');
  });

  it('met je rustige tempo telt het tempo', () => {
    const withPace: ImportFit = { ...FIT, easyPace: { fast: 340, slow: 380 } };
    expect(autoTickMatch(noHr, plan, templates, [], DAY, undefined, withPace)).toBeUndefined();
    expect(proposeImport(noHr, plan, templates, [], undefined, undefined, withPace)!.fitNote).toBe('Harder dan gepland: tempo 4:24 per km, rustig is vanaf 5:40.');
  });
});

describe('de tekst voor Strava', () => {
  it('een harde loop bij een rustige training heet niet "zone 2 · rustige duurloop"', async () => {
    const { stravaText } = await import('./activityText');
    const hard = watchLog('h', { plannedSessionId: 'easy', durationMinutes: 44, cardioData: { durationMinutes: 44, distanceKm: 10, avgHeartRate: 172, source: 'garmin' } });
    expect(stravaText({ log: hard, template: byId('tpl_easy_run'), fit: FIT }).title).toBe('Duurloop');
    expect(stravaText({ log: watchLog('e', { plannedSessionId: 'easy' }), template: byId('tpl_easy_run'), fit: FIT }).title).toBe('Zone 2 · rustige duurloop');
    // Zonder zones: zoals het was.
    expect(stravaText({ log: hard, template: byId('tpl_easy_run') }).title).toBe('Zone 2 · rustige duurloop');
  });
});

describe('na de review', () => {
  it('een loop in wandeltempo vinkt nooit vanzelf af, ook met de keuze uit', async () => {
    const walk = act('w90', { durationSec: 90 * 60, distanceM: 9000, avgHeartRate: undefined });
    const plan = [planned('long', 'tpl_long_run', DAY, { plannedMinutes: 90 })];
    expect(autoTickMatch(walk, plan, templates, [], DAY, undefined, { kindCheck: false })).toBeUndefined();
    expect(autoTickMatch(walk, plan, templates, [], DAY)).toBeUndefined();
  });

  it('een ingekorte training telt met zijn eigen geplande minuten', async () => {
    const { looseStandIns } = await import('./looseLog');
    const plan = [planned('long', 'tpl_long_run', DAY, { plannedMinutes: 30 })];
    const log = watchLog('l35', { durationMinutes: 35, cardioData: { durationMinutes: 35, distanceKm: 6, source: 'garmin' } });
    const covered = looseStandIns({ plannedSessions: plan, logs: [log], templates, minutesOf: (s, t) => s.plannedMinutes ?? t.durationVariants.full });
    expect([...covered]).toEqual(['long']);
    // Met de volle 75 min was hij te kort.
    expect([...looseStandIns({ plannedSessions: plan, logs: [log], templates, minutesOf: () => 75 })]).toEqual([]);
  });

  it('zonder afstand geen tempo-oordeel en geen wandeltempo', () => {
    const noKm = act('nokm', { distanceM: undefined, avgHeartRate: undefined, durationSec: 60 * 60 });
    expect(isWalkPaced({ minutes: 60 })).toBe(false);
    expect(proposeImport(noKm, [planned('easy', 'tpl_easy_run', DAY, { plannedMinutes: 45 })], templates, [], undefined, undefined, { ...FIT, easyPace: { fast: 340, slow: 380 } })!.fitNote).toBeUndefined();
  });

  it('drie activiteiten voor één training: de best passende houdt hem, de andere twee komen los', () => {
    const plan = [planned('easy', 'tpl_easy_run', DAY, { plannedMinutes: 40 })];
    const a = act('a', { start: `${DAY}T07:00:00`, durationSec: 10 * 60, distanceM: 1600 });
    const b = act('b', { start: `${DAY}T08:00:00`, durationSec: 41 * 60 });
    const c = act('c', { start: `${DAY}T18:00:00`, durationSec: 15 * 60, distanceM: 2500 });
    const proposals = pendingProposals([a, b, c], [], plan, templates, [], undefined, FIT);
    expect(proposals.map((p) => [p.activity.externalId, p.match?.session.id])).toEqual([['test:b', 'easy'], ['test:c', undefined], ['test:a', undefined]]);
  });
});

describe('herstelronde Warden: tempo zegt niets over de soort bij klimmen of op een loopband', () => {
  // Heuvelsprints en afdalen, met wandelend terug: 45 min, 4 km, 180 m klim (11:15 per km).
  const hills = act('hills', { durationSec: 45 * 60, distanceM: 4000, elevationGainM: 180, avgHeartRate: undefined });
  const flatSlow = act('flat', { durationSec: 45 * 60, distanceM: 4000, elevationGainM: 20, avgHeartRate: undefined });

  it('een heuveltraining met wandelend terug blijft een loop en hoort bij de geplande training', () => {
    const plan = [planned('h', 'tpl_hills_descent', DAY, { plannedMinutes: 45 })];
    const p = proposeImport(flatSlow, plan, templates, [], undefined, undefined, FIT)!;
    // Ook zonder klim: een niet-rustige looptraining van die dag mag traag zijn.
    expect(p.activity.kind).toBe('run');
    expect(p.match?.session.id).toBe('h');
    expect(p.fitNote).toBe('Wandeltempo, 11:15 per km. Hoort hij er niet bij, kies dan Andere training.');
    // Met de klim van 180 m: niets te melden.
    expect(proposeImport(hills, plan, templates, [], undefined, undefined, FIT)!.fitNote).toBeUndefined();
    // Vanzelf afvinken mag weigeren.
    expect(autoTickMatch(flatSlow, plan, templates, [], DAY, undefined, FIT)).toBeUndefined();
  });

  it('een klim van 30 m per km of meer: geen wandeling, ook zonder planning', () => {
    expect(proposeImport(hills, [], templates, [], undefined, undefined, FIT)!.activity.kind).toBe('run');
    expect(proposeImport(act('c29', { durationSec: 45 * 60, distanceM: 4000, elevationGainM: 116 }), [], templates, [], undefined, undefined, FIT)!.activity.kind).toBe('hike');
    expect(proposeImport(act('c30', { durationSec: 45 * 60, distanceM: 4000, elevationGainM: 120 }), [], templates, [], undefined, undefined, FIT)!.activity.kind).toBe('run');
  });

  it('een loopband met helling: geen wandeling', () => {
    const treadmill = act('tm', { durationSec: 40 * 60, distanceM: 3500, treadmill: true, avgHeartRate: undefined });
    expect(proposeImport(treadmill, [planned('easy', 'tpl_easy_run', DAY)], templates, [], undefined, undefined, FIT)!.match?.session.id).toBe('easy');
  });

  it('bij een rustige loop wel: een vlakke wandeling blijft een wandeling', () => {
    expect(proposeImport(flatSlow, [planned('easy', 'tpl_easy_run', DAY)], templates, [], undefined, undefined, FIT)!.activity.kind).toBe('hike');
  });

  it('achteraf te koppelen aan de heuveltraining, niet aan een rustige duurloop', () => {
    const log = watchLog('hl', { completedDate: '2026-11-04', completedAt: '2026-11-04T11:00:00Z', durationMinutes: 45, cardioData: { durationMinutes: 45, distanceKm: 4, elevationGainM: 20, source: 'garmin' } });
    expect([...linkCandidates({ plannedSessions: [planned('h', 'tpl_hills_descent', '2026-11-03', { plannedMinutes: 45 })], logs: [log], templates, today: '2026-11-05' }).keys()]).toEqual(['h']);
    expect(linkCandidates({ plannedSessions: [planned('e', 'tpl_easy_run', '2026-11-03')], logs: [log], templates, today: '2026-11-05' }).size).toBe(0);
    const climbing = { ...log, cardioData: { ...log.cardioData!, elevationGainM: 180 } } as SessionLog;
    expect(logSizeFits(climbing, byId('tpl_easy_run'), 40)).toBe(true);
    const onBand = { ...log, cardioData: { ...log.cardioData!, environment: 'treadmill' } } as SessionLog;
    expect(logSizeFits(onBand, byId('tpl_easy_run'), 40)).toBe(true);
  });
});

describe('grenzen', () => {
  it('precies 10:00 per km is wandeltempo, 9:59 niet', () => {
    expect(isWalkPaced({ minutes: 50, km: 5 })).toBe(true);
    expect(isWalkPaced({ minutes: 49.9, km: 5 })).toBe(false);
  });
  it('157 bpm bij zone 2 tot 151 is hard, 156 niet', () => {
    expect(hardEffort({ minutes: 40, km: 7, avgHr: 157 }, FIT)?.value).toBe(157);
    expect(hardEffort({ minutes: 40, km: 7, avgHr: 156 }, FIT)).toBeUndefined();
  });
  it('een losse rustige log die hard was: harder dan rustig, niet harder dan gepland', () => {
    const log = watchLog('loose', { durationMinutes: 44, cardioData: { durationMinutes: 44, distanceKm: 10, avgHeartRate: 172, source: 'garmin' } });
    expect(coachReaction(log, byId('tpl_easy_run'), null, [], FIT)).toBe('Harder dan rustig: gemiddeld 172 bpm, zone 2 gaat tot 151.');
  });
  it('kort toetst aan de geplande minuten van de sessie', () => {
    const log = watchLog('s20', { plannedSessionId: 'easy', durationMinutes: 20, cardioData: { durationMinutes: 20, distanceKm: 3.5, avgHeartRate: 140, source: 'garmin' } });
    expect(coachReaction(log, byId('tpl_easy_run'), null, [], { ...FIT, sessionMinutes: 30 })).toBe('Gedaan zoals gepland. Zo bouw je op.');
    expect(coachReaction(log, byId('tpl_easy_run'), null, [], { ...FIT, sessionMinutes: 60 })).toBe(SHORT_TRAINING_TEXT);
  });
});

describe('twee trainingen en drie activiteiten op één dag', () => {
  it('elke training krijgt de activiteit die het best past, de derde komt los', () => {
    const plan = [planned('easy', 'tpl_easy_run', DAY, { plannedMinutes: 40 }), planned('long', 'tpl_long_run', DAY, { plannedMinutes: 80, order: 1 })];
    const warm = act('warm', { start: `${DAY}T06:50:00`, durationSec: 8 * 60, distanceM: 1300 });
    const short = act('short', { start: `${DAY}T07:00:00`, durationSec: 41 * 60 });
    const long = act('long', { start: `${DAY}T17:00:00`, durationSec: 82 * 60, distanceM: 13000 });
    const proposals = pendingProposals([warm, short, long], [], plan, templates, [], undefined, FIT);
    const by = Object.fromEntries(proposals.map((p) => [p.activity.externalId, p.match?.session.id]));
    expect(by).toEqual({ 'test:short': 'easy', 'test:long': 'long', 'test:warm': undefined });
  });
});

describe('klimgrens', () => {
  it('29,9 m per km is wandelen, 30 klimmen; zonder afstand geen klimuitzondering nodig', () => {
    expect(isWalkLike({ minutes: 50, km: 4, gainM: 119.6 })).toBe(true);
    expect(isWalkLike({ minutes: 50, km: 4, gainM: 120 })).toBe(false);
    expect(isWalkLike({ minutes: 50, gainM: 300 })).toBe(false);
  });
});

describe('herstelronde 2', () => {
  it('de harde losse loop wordt de Tempoloop, in welke volgorde de templates ook staan', async () => {
    const { hardRunTemplate } = await import('./activityImport');
    const byKey = [...templates].sort((a, b) => a.id.localeCompare(b.id));
    expect(hardRunTemplate(byKey)?.id).toBe('tpl_tempo_run');
    expect(hardRunTemplate([...byKey].reverse())?.id).toBe('tpl_tempo_run');
    expect(hardRunTemplate(templates)?.id).toBe('tpl_tempo_run');
    const hard = act('hk', { durationSec: 44 * 60, distanceM: 10000, avgHeartRate: 172 });
    expect(proposeImport(hard, [], byKey, [], undefined, undefined, FIT)!.template?.id).toBe('tpl_tempo_run');
  });

  it('een handmatig log van de hele training (full) is kort onder de helft', async () => {
    const { isShortTraining } = await import('./shortTraining');
    const hand = { id: 'm', templateId: 'tpl_easy_run', type: 'cardio', completedDate: DAY, completedAt: `${DAY}T10:00:00Z`, variant: 'full', durationMinutes: 14, source: 'manual' } as SessionLog;
    expect(isShortTraining(hand, byId('tpl_easy_run'), null, 30)).toBe(true);
    expect(isShortTraining({ ...hand, durationMinutes: 15 }, byId('tpl_easy_run'), null, 30)).toBe(false);
  });

  it('de harde titel: zonder "rustig" en zonder zone', async () => {
    const { stravaText } = await import('./activityText');
    const hard = (templateId: string) => watchLog('t', { templateId, plannedSessionId: 'p', durationMinutes: 40, cardioData: { durationMinutes: 40, distanceKm: 8, avgHeartRate: 172, source: 'garmin' } });
    expect(stravaText({ log: hard('tpl_hill_easy'), template: byId('tpl_hill_easy'), fit: FIT }).title).toBe('Heuvelloop');
    expect(stravaText({ log: hard('tpl_recovery_run'), template: byId('tpl_recovery_run'), fit: FIT }).title).toBe('Herstelloop');
  });
});

describe('isEasyRun zonder plan valt terug op het profiel', () => {
  it('de lange duurloop (laag, geen zones) is rustig: hard gelopen is harder dan gepland', () => {
    expect(isEasyRun(byId('tpl_long_run'), DAY, null)).toBe(true);
    const log = watchLog('lr', { templateId: 'tpl_long_run', plannedSessionId: 'long', durationMinutes: 80, cardioData: { durationMinutes: 80, distanceKm: 15, avgHeartRate: 165, source: 'garmin' } });
    expect(coachReaction(log, byId('tpl_long_run'), null, [], FIT)).toBe('Harder dan gepland: gemiddeld 165 bpm, zone 2 gaat tot 151. Een rustige training loop je in zone 2.');
  });
});

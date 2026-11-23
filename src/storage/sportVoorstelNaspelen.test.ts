// Naspeeltest I-23 punt 10 (stap 0, docs/visie/Ontwerp Losse sport.md): het voorstel "Je speelde gisteren padel.
// Benen B staat er vlak na." verdween zonder keuze en zonder spoor. Het werd bij elke opening opnieuw afgeleid en
// nergens bewaard. Van de drie wegen (de dag is voorbij, de sport is ouder dan 4 dagen, gedekt door een voorstel op
// Vandaag) ligt de eerste het meest voor de hand: zonder ochtendantwoord staat er op de beendag geen voorstel op
// Vandaag, en de sport wordt pas ouder dan 4 dagen ruim na de beendag. Is de beendag voorbij zonder log, dan leest
// de weekcontrole hem niet meer en is de melding weg.
//
// Alleen nagemaakte gegevens: het demoprogramma, een padelpartij op donderdag en Benen B die je zelf op vrijdag zette.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import { wipeAllData, syncProgramHorizon, SettingsRepo, SessionLogsRepo, PlannedSessionsRepo, SessionTemplatesRepo } from './database';
import { primePlanningRegisters } from '../state/planningSync';
import { withCountingSports } from '../engine/sportTemplate';
import { weekConcerns } from '../engine/weekConcerns';
import { mondayOfWeek } from '../utils/dates';
import { lapsedSportRests, liveSportRests, parseSportRestOffers, shownRows } from '../engine/sportRestOffer';
import { appendSportRestOffers } from './sportRestOffers';
import type { PlannedSession, SessionLog } from '../models/training';

const THU = '2026-11-26';
const FRI = '2026-11-27';
const SAT = '2026-11-28';

const padel: SessionLog = {
  id: 'nep_padel', templateId: 'sport_padel', type: 'cardio', countedSport: 'padel', completedDate: THU, completedAt: `${THU}T20:30:00`,
  variant: 'custom', durationMinutes: 90, rpe: 7, source: 'manual',
};
const legs: PlannedSession = {
  id: 'nep_benen', templateId: 'tpl_lower_b', scheduledDate: FRI, weekStartDate: mondayOfWeek(FRI), status: 'planned', order: 0,
  lock: { by: 'user', at: `${THU}T08:00:00` },
};

// Een opening van de app zoals de skill naspelen hem doet.
async function openAt(moment: string) {
  vi.setSystemTime(new Date(moment));
  await runBootMigrations({ build: moment });
  await primePlanningRegisters();
  await syncProgramHorizon();
}

// Wat Week ziet: de melding over de sport, zoals de app hem afleidt.
async function state(today: string) {
  const settings = await SettingsRepo.get();
  const templates = withCountingSports(await SessionTemplatesRepo.getAll(), settings);
  const sessions = await PlannedSessionsRepo.getAll();
  const logs = await SessionLogsRepo.getAll();
  const concerns = weekConcerns({ sessions, logs, templates, today, restDay: settings.restDay ?? 1 }, mondayOfWeek(today));
  return { settings, templates, sessions, logs, concerns };
}
async function sportConcern(today: string) {
  return (await state(today)).concerns.find((c) => c.rule === 'LEG-SPACING' && c.finding.fromSport && c.finding.sessionIds.includes(legs.id));
}
// Week laat de melding zien en schrijft de eerste regel (components/sports/useSportRest.ts#useSportRestSeenInWeek).
async function weekSees(today: string) {
  const { settings, sessions, logs, concerns } = await state(today);
  const list = parseSportRestOffers(settings.sportRestOffers, today).list ?? [];
  await appendSportRestOffers(shownRows(list, liveSportRests(concerns, sessions, logs), today, `${today}T07:31:00Z`), today);
}

describe('I-23 punt 10: een voorstel na een zware sport', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${THU}T08:00:00`));
    await wipeAllData();
    await SettingsRepo.set({ sportHandling: { padel: { role: 'count' } } });
    await runBootMigrations({ seedProgram: true });
    await SessionLogsRepo.put(padel);
    await PlannedSessionsRepo.put(legs);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('staat er op donderdagavond en vrijdag, en is zaterdag weg: de dag is voorbij', async () => {
    await openAt(`${THU}T21:00:00`);
    expect((await sportConcern(THU))?.headline).toBe('Je speelde vandaag padel. Benen B staat er vlak na.');
    await openAt(`${FRI}T07:30:00`);
    expect((await sportConcern(FRI))?.headline).toBe('Je speelde gisteren padel. Benen B staat er vlak na.');
    await openAt(`${SAT}T08:00:00`);
    expect(await sportConcern(SAT)).toBeUndefined();
    // Benen B staat nog op vrijdag, zonder log: niets verplaatste hem en niemand koos.
    expect((await PlannedSessionsRepo.getAll()).find((s) => s.id === legs.id)?.scheduledDate).toBe(FRI);
  });

  it('laat een spoor na: wat Week liet zien staat bewaard, en zaterdag zegt Vandaag dat het verviel', async () => {
    await openAt(`${FRI}T07:30:00`);
    expect(await sportConcern(FRI)).toBeDefined();
    await weekSees(FRI);
    await openAt(`${SAT}T08:00:00`);
    const { settings, sessions, logs, templates } = await state(SAT);
    const list = parseSportRestOffers(settings.sportRestOffers, SAT).list ?? [];
    expect(list.map((r) => r.state)).toEqual(['shown']);
    expect(lapsedSportRests({ list, sessions, logs, templates, today: SAT }).map((l) => l.line)).toEqual(['Je voorstel na padel is vervallen. Benen B was gisteren.']);
  });
});

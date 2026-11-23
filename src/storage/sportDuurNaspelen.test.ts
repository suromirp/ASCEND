// Naspeeltest I-23 punt 9 (stap 0 en 4, docs/visie/Ontwerp Losse sport.md, Ontwerp 9): een duur of soort verandert
// niet stil na een sport.
//
// Op main zette de weekcontrole met een vaste afspraak op Zwaar (voetbal op zaterdag) de laatste harde loop van
// ASCEND in die week vanzelf om naar een rustige loop (HARD-DAYS), met alleen de melding Planning bijgewerkt in het
// geheugen en een auditrecord met `changes: []`. Na een herlading was niet meer te zien dat er iets veranderde.
//
// Alleen nagemaakte gegevens: het demoprogramma, een paar verzonnen loopjes en voetbal op zaterdag. Draai met
// TZ=Europe/Amsterdam; de registers gaan via primePlanningRegisters, zoals de skill naspelen het doet.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import { wipeAllData, syncProgramHorizon, SettingsRepo, SessionLogsRepo, PlannedSessionsRepo, SessionTemplatesRepo, ProgramsRepo } from './database';
import { primePlanningRegisters } from '../state/planningSync';
import { addDays, mondayOfWeek } from '../utils/dates';
import type { SessionLog } from '../models/training';
import type { SportHandlingMap } from '../engine/sportRole';
import { isHardRun } from '../engine/scheduler';
import { withCountingSports } from '../engine/sportTemplate';
import { patternDays } from '../engine/planPass';
import { weekNotice } from '../engine/weekFixProposal';
import { applyPlanChangeItems } from '../engine/proposalEngine';
import { resolveVariantDuration } from '../engine/substitutions';
import { planCheckRecord } from '../engine/repairAudit';
import type { CheckInput } from '../engine/weekValidator';
import type { PlannedSession, SessionTemplate } from '../models/training';

const NOW = '2026-11-23T08:00:00';
const TODAY = '2026-11-23';
// Voetbal op dinsdag en donderdag en padel op vrijdag, alle drie Zwaar: met de heuvelintervallen op zaterdag vier
// harde dagen in een week van zes trainingsdagen, grens drie (weekValidator.ts#hardDayLimit).
const FOOTBALL: SportHandlingMap = {
  football: { role: 'fixed', fixed: [{ day: 2, minutes: 90, intensity: 'high' }, { day: 4, minutes: 90, intensity: 'high' }] },
  padel: { role: 'fixed', fixed: [{ day: 5, minutes: 60, intensity: 'high' }] },
};

function fakeLog(i: number, daysAgo: number, templateId: string, minutes: number, km: number): SessionLog {
  const date = addDays(TODAY, -daysAgo);
  return {
    id: `fake_log_${i}`, templateId, type: 'cardio', completedDate: date, completedAt: `${date}T18:00:00`, variant: 'full', durationMinutes: minutes, rpe: 6, source: 'manual',
    cardioData: { durationMinutes: minutes, distanceKm: km, environment: 'outdoor', source: 'manual' },
  };
}

async function open(build: string) {
  await runBootMigrations({ build });
  await primePlanningRegisters();
  return syncProgramHorizon();
}

// De harde lopen van ASCEND in deze en volgende week, zoals ze nu staan.
async function hardRunsNear() {
  const templates = new Map((await SessionTemplatesRepo.getAll()).map((t) => [t.id, t]));
  const until = addDays(mondayOfWeek(TODAY), 13);
  return (await PlannedSessionsRepo.getAll())
    .filter((s) => s.scheduledDate >= TODAY && s.scheduledDate <= until && s.status !== 'skipped' && !s.fixed)
    .filter((s) => { const t = templates.get(s.templateId); return !!t && isHardRun(t); })
    .map((s) => `${s.id}|${s.templateId}|${s.plannedMinutes ?? ''}`)
    .sort();
}

// Wat Week leest: de opgeslagen planning, met de sporten als sjabloon, zoals state/adviceAndWeek.ts#weekCheckInput.
async function weekInput(): Promise<CheckInput> {
  const [sessions, logs, stored, programs, settings] = await Promise.all([PlannedSessionsRepo.getAll(), SessionLogsRepo.getAll(), SessionTemplatesRepo.getAll(), ProgramsRepo.getAll(), SettingsRepo.get()]);
  const templates = withCountingSports(stored, settings);
  const program = programs[0] ?? null;
  const restDay = settings.restDay ?? 1;
  return {
    sessions, logs, templates, today: TODAY, restDay, program, slotDays: patternDays(templates, settings, restDay),
    minutesOf: (s: PlannedSession, t: SessionTemplate) => resolveVariantDuration(t, 'full', s.scheduledDate, program),
  };
}

// De rijen zoals ze opgeslagen staan, zonder wat elke opening opnieuw zet.
async function rows() {
  return (await PlannedSessionsRepo.getAll()).map((s) => `${s.id}|${s.templateId}|${s.scheduledDate}|${s.status}|${s.plannedMinutes ?? ''}`).sort();
}

describe('I-23 punt 9: een duur of soort verandert niet stil na een sport', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(NOW));
    await wipeAllData();
    await runBootMigrations({ seedProgram: true });
    for (const l of [fakeLog(1, 2, 'tpl_easy_run', 40, 6), fakeLog(2, 4, 'tpl_long_run', 75, 11), fakeLog(3, 9, 'tpl_easy_run', 35, 5.5), fakeLog(4, 16, 'tpl_easy_run', 45, 7)]) await SessionLogsRepo.put(l);
    // De stand zonder sport: de eerste opening mag de planning bijwerken.
    await open('stand');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('voetbal op Zwaar erbij: de harde loop blijft hard tot je Akkoord geeft (het advies)', async () => {
    const before = await hardRunsNear();
    expect(before.length).toBeGreaterThan(0);
    await SettingsRepo.set({ sportHandling: FOOTBALL });
    const sync = await open('voetbal');
    // Geen stille omzetting van een harde training in deze of volgende week.
    expect(sync.repairs?.lines.filter((l) => l.includes('harde training minder')) ?? []).toEqual([]);
    expect(await hardRunsNear()).toEqual(before);
  });

  it('met Vanzelf, met melding: wel omgezet, en het auditrecord krijgt de wijziging met de minuten ervoor en erna', async () => {
    await SettingsRepo.set({ sportHandling: FOOTBALL, sportDurationChange: 'auto' });
    const sync = await open('voetbal-vanzelf');
    const hard = sync.repairs?.lines.filter((l) => l.includes('harde training minder')) ?? [];
    expect(hard.length).toBeGreaterThan(0);
    const items = sync.repairs?.items ?? [];
    expect(items.some((c) => c.templateId === 'tpl_easy_run' && typeof c.fromMinutes === 'number' && typeof c.toMinutes === 'number')).toBe(true);
  });

  it('Week toont het als Let op met een voorstel, met de minuten ervoor en erna; na Akkoord blijft de rustige loop staan', async () => {
    await SettingsRepo.set({ sportHandling: FOOTBALL });
    await open('voetbal');
    const monday = mondayOfWeek(TODAY);
    let found: { concern: ReturnType<typeof weekNotice>['concerns'][number]; fix: ReturnType<typeof weekNotice>['fixes'][string] } | undefined;
    for (const week of [monday, addDays(monday, 7)]) {
      const notice = weekNotice(await weekInput(), week, true);
      const concern = notice.concerns.find((c) => c.rule === 'HARD-DAYS');
      if (concern && notice.fixes[concern.key]) { found = { concern, fix: notice.fixes[concern.key] }; break; }
    }
    expect(found).toBeDefined();
    const { concern, fix } = found!;
    expect(concern.headline).toMatch(/^Met (voetbal|padel) op \w+ past er deze week een harde training minder\.$/);
    expect(fix.effect).toMatch(/rustige duurloop van \d+ minuten in plaats van \d+\./);
    const change = fix.proposal!.changes.find((c) => c.templateId === 'tpl_easy_run');
    expect(change).toBeDefined();
    expect(typeof change!.fromMinutes).toBe('number');
    expect(typeof change!.toMinutes).toBe('number');

    // Akkoord: de wijziging met slot, opgeslagen zoals planChangeActions het doet.
    const applied = applyPlanChangeItems(fix.proposal!.changes, await PlannedSessionsRepo.getAll(), undefined, { by: 'proposal', proposalId: fix.proposal!.id, at: NOW });
    expect(applied.unsupported).toEqual([]);
    for (const s of applied.sessions) await PlannedSessionsRepo.put(s);
    await open('na-akkoord');
    const after = (await PlannedSessionsRepo.getAll()).find((s) => s.id === change!.plannedSessionId);
    expect(after?.templateId).toBe('tpl_easy_run');
  });

  it('drie openingen achter elkaar: de tweede en derde veranderen niets en melden niets', async () => {
    await SettingsRepo.set({ sportHandling: FOOTBALL });
    await open('een');
    const first = await rows();
    for (const build of ['twee', 'drie']) {
      const sync = await open(build);
      expect(sync.repairs?.lines ?? []).toEqual([]);
      expect(await rows()).toEqual(first);
    }
  });

  it('het auditrecord van een ronde op Vanzelf bevat de wijzigingen, een nieuw record per ronde', async () => {
    await SettingsRepo.set({ sportHandling: FOOTBALL, sportDurationChange: 'auto' });
    const sync = await open('voetbal-vanzelf');
    const record = planCheckRecord(sync.repairs!, 'plan_check_1', NOW);
    expect(record.trigger).toBe('plan_check');
    expect(record.resolution).toBe('accepted');
    expect(record.changes.length).toBeGreaterThan(0);
    for (const c of record.changes) {
      expect(c.action).toBe('move');
      expect(typeof c.fromMinutes).toBe('number');
      expect(typeof c.toMinutes).toBe('number');
    }
    // Daarna is er niets meer te doen: geen tweede record.
    const again = await open('voetbal-vanzelf-2');
    expect(again.repairs?.lines ?? []).toEqual([]);
  });

  it('zonder sport maakt de instelling niets uit', async () => {
    await SettingsRepo.set({ sportDurationChange: 'auto' });
    const auto = await open('zonder-auto');
    const autoRows = await rows();
    await SettingsRepo.set({ sportDurationChange: 'propose' });
    const propose = await open('zonder-voorstel');
    expect(auto.repairs?.lines ?? []).toEqual([]);
    expect(propose.repairs?.lines ?? []).toEqual([]);
    expect(await rows()).toEqual(autoRows);
  });
});

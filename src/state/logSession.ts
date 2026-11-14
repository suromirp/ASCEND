// ASCEND: een log schrijven na Gedaan, zonder React (de hook in logActions.ts geeft het door).
// Besluit docs/beslissingen/2026-11-12-dubbel-log.md.

import type { SessionLog } from '../models/training';
import { ProgramsRepo, SessionTemplatesRepo, SessionLogsRepo, SettingsRepo, MetaRepo, type AppSettings } from '../storage/database';
import type { SavedMoment } from '../engine/savedMoments';
import { recordClearedMilestones } from '../storage/milestoneClearing';
import { LogStoredFollowUpFailed } from '../storage/storageError';
import { todayISO } from '../utils/dates';
import { makeId } from '../utils/id';
import { excludedLogIds } from '../engine/influence';
import { coachReaction } from '../engine/coach';
import { aerobicTrend, celebratedChange, progressMoment, tempoPiecesOn, type ProgressCelebrated } from '../engine/aerobicTrend';
import type { LogSessionInput } from './appDataTypes';

export interface LogSessionDeps {
  settings: Pick<AppSettings, 'heartRate' | 'tempoStablePieces'>;
  loggingInFlight: { current: Set<string> };
  reportStorageError: (err: unknown) => void;
  refresh: () => Promise<void>;
  announceSaved: (batch: SavedMoment[]) => void;
}

// Een losse training die nog onderweg is: een tweede tik met precies dezelfde invulling wacht op de eerste
// en krijgt haar uitkomst, in plaats van een tweede log te schrijven. Een geplande training die nog onderweg
// is (loggingInFlight) geeft de tweede nee.
const pending = new Map<string, Promise<boolean>>();

// Een horloge-activiteit die nog onderweg is, met of zonder geplande training erbij: elke volgende poging met
// dezelfde externalId krijgt nee, ook met een andere keuze (gepland of los, of een andere geplande training).
// Kijken en schrijven is niet één transactie, dus zonder dit geeft opnieuw tikken twee logs van één activiteit.
const externalInFlight = new Set<string>();

function pendingKey(input: LogSessionInput): string | undefined {
  if (input.plannedSessionId || input.externalId) return undefined;
  return `loose:${JSON.stringify(input)}`;
}

// Ja betekent: het log staat in de opslag. Nee: er is niets geschreven (het schrijven mislukte, of deze
// geplande training of horloge-activiteit had al een log). Faalt een stap na het schrijven (mijlpalen,
// opnieuw lezen, het moment na Gedaan), dan blijft het ja en gaat de fout apart naar de melding bovenin
// (LogStoredFollowUpFailed), zodat geen scherm opnieuw laat opslaan.
export function runLogSession(input: LogSessionInput, opts: { batch?: SavedMoment[] } | undefined, deps: LogSessionDeps): Promise<boolean> {
  const externalId = input.externalId;
  if (externalId) {
    // Al onderweg: nee, zoals wanneer haar log er al staat (de aanroeper doet dan niets dubbel).
    if (externalInFlight.has(externalId)) return Promise.resolve(false);
    externalInFlight.add(externalId);
    return writeLog(input, opts, deps).finally(() => externalInFlight.delete(externalId));
  }
  const key = pendingKey(input);
  if (!key) return writeLog(input, opts, deps);
  const running = pending.get(key);
  if (running) return running;
  const mine = writeLog(input, opts, deps).finally(() => pending.delete(key));
  pending.set(key, mine);
  return mine;
}

async function writeLog(input: LogSessionInput, opts: { batch?: SavedMoment[] } | undefined, deps: LogSessionDeps): Promise<boolean> {
  const { settings, loggingInFlight, reportStorageError, refresh, announceSaved } = deps;
  const plannedId = input.plannedSessionId;
  if (plannedId) {
    if (loggingInFlight.current.has(plannedId)) return false;
    loggingInFlight.current.add(plannedId);
  }
  try {
    const existing = plannedId || input.externalId ? await SessionLogsRepo.getAll() : [];
    if (plannedId && existing.some((l) => l.plannedSessionId === plannedId)) return false;
    // The same watch activity is never stored twice.
    if (input.externalId && existing.some((l) => l.externalId === input.externalId)) return false;
    const log: SessionLog = {
      id: makeId('log'),
      plannedSessionId: input.plannedSessionId,
      templateId: input.templateId,
      type: input.type,
      sport: input.sport,
      ...(input.countedSport ? { countedSport: input.countedSport } : {}),
      ...(input.customSport ? { customSport: input.customSport } : {}),
      completedDate: input.completedDate ?? todayISO(),
      completedAt: input.completedAt ?? new Date().toISOString(),
      variant: input.variant,
      durationMinutes: input.durationMinutes,
      rpe: input.rpe,
      ...(input.rpeAssumed && input.rpe !== undefined ? { rpeAssumed: true as const } : {}),
      notes: input.notes,
      strengthData: input.strengthData,
      cardioData: input.cardioData,
      outdoorData: input.outdoorData,
      subjectiveFeel: input.subjectiveFeel,
      painAreas: input.painAreas && input.painAreas.length > 0 ? input.painAreas : undefined,
      painReports: input.painReports && input.painReports.length > 0 ? input.painReports : undefined,
      workout: input.workout,
      strengthRir: input.strengthRir,
      ...(input.gymProfileId ? { gymProfileId: input.gymProfileId } : {}),
      ...(input.fileDurationMinutes ? { fileDurationMinutes: input.fileDurationMinutes } : {}),
      ...(input.forgeLog && input.forgeLog.length > 0 ? { forgeLog: input.forgeLog } : {}),
      legsAtStart: input.legsAtStart,
      externalId: input.externalId,
      sourceSync: input.sourceSync,
      source: input.source ?? 'manual',
    };
    await SessionLogsRepo.put(log);
    // Vanaf hier staat het log er: wat nu nog faalt maakt de uitkomst geen nee meer.
    const followUpFailed = (err: unknown) => reportStorageError(new LogStoredFollowUpFailed(err));

    // If this log satisfies the current front-of-ladder milestone on any
    // goal, record the historical moment it was cleared. Progress and logs
    // are read fresh from storage: a copy from the closure would let a log
    // ticked off right after another clear the same milestone twice.
    let clearedTitle: string | undefined;
    let failed = false;
    try {
      clearedTitle = await recordClearedMilestones(log);
    } catch (err) {
      failed = true;
      followUpFailed(err);
    }

    try {
      await refresh();
    } catch (err) {
      // Het scherm kon niet opnieuw lezen: geen moment na Gedaan over een log dat je nog niet ziet.
      // Hooguit één melding per log.
      if (!failed) followUpFailed(err);
      return true;
    }
    try {
      // Ticked off by itself from the watch (engine/autoTick.ts): no moment
      // after Gedaan, unless it cleared a milestone.
      if (input.quiet && !clearedTitle) return true;
      // Every completion gets a quote: a regular session a lighter one, a
      // milestone clear (if this same log happened to satisfy one) the
      // bigger victory-tier treatment with the milestone's title attached.
      // The coach reacts in one line to what you filled in (engine/coach.ts).
      const allTemplates = await SessionTemplatesRepo.getAll();
      const currentProgram = (await ProgramsRepo.getAll())[0] ?? null;
      const allLogs = await SessionLogsRepo.getAll();
      let coachNote = coachReaction(log, allTemplates.find((t) => t.id === log.templateId), currentProgram, allLogs);
      // Faster at the same heart rate over weeks: said once, right after
      // an easy run (engine/aerobicTrend.ts#progressMoment).
      // A training set to "Niet meetellen voor hartslag" stays out of the trend (engine/influence.ts).
      const excluded = excludedLogIds((await SettingsRepo.get()).influences);
      const pieces = { pieces: tempoPiecesOn({ tempoStablePieces: settings.tempoStablePieces }) };
      const trend = aerobicTrend(allLogs, allTemplates, currentProgram, settings.heartRate, log.completedDate, excluded, pieces);
      const lastProgress = await MetaRepo.get<ProgressCelebrated>('aerobicProgressCelebrated');
      const counted = trend.runs > aerobicTrend(allLogs.filter((l) => l.id !== log.id), allTemplates, currentProgram, settings.heartRate, log.completedDate, excluded, pieces).runs;
      const progress = counted ? progressMoment(trend, lastProgress, log.completedDate) : undefined;
      const near = celebratedChange(trend);
      if (progress && near !== undefined) {
        coachNote = `${coachNote} ${progress}`;
        await MetaRepo.set('aerobicProgressCelebrated', { date: log.completedDate, changeSec: near });
      }
      const moment: SavedMoment = { logId: log.id, recovery: log.type === 'recovery', clearedTitle, coachNote, auto: input.quiet };
      if (opts?.batch) opts.batch.push(moment);
      else announceSaved([moment]);
    } catch (err) {
      // Een melding is genoeg: een fout bij de mijlpalen is al gemeld.
      if (!failed) followUpFailed(err);
    }
    return true;
  } catch (err) {
    reportStorageError(err);
    return false;
  } finally {
    if (plannedId) loggingInFlight.current.delete(plannedId);
  }
}

// Nee van logSession is niet altijd "niet opgeslagen": een geplande training of horloge-activiteit die al een log
// had geeft ook nee. Wie bij nee iets weggooit of vastlegt (een concept, een sportkeuze) vraagt dit eerst.
export class LogNotSaved extends Error {
  constructor() {
    super('Opslaan lukte niet.');
    this.name = 'LogNotSaved';
  }
}

export async function logStoredFor(input: Pick<LogSessionInput, 'plannedSessionId' | 'externalId'>): Promise<boolean> {
  if (!input.plannedSessionId && !input.externalId) return false;
  try {
    const logs = await SessionLogsRepo.getAll();
    return logs.some((l) => (input.plannedSessionId && l.plannedSessionId === input.plannedSessionId) || (input.externalId && l.externalId === input.externalId));
  } catch {
    return false;
  }
}

// Ja: opgeslagen. Nee: het log stond er al (er is niets dubbel geschreven). Gooit LogNotSaved als er geen log is:
// dan blijft alles zoals het was en kan de aanroeper opnieuw proberen.
export async function settleLogOutcome(saved: boolean, input: Pick<LogSessionInput, 'plannedSessionId' | 'externalId'>): Promise<boolean> {
  if (saved) return true;
  if (await logStoredFor(input)) return false;
  throw new LogNotSaved();
}

// Logs maken, terugnemen en bijwerken: het moment na Gedaan, de horlogecijfers, inkorten, correcties
// van de bron, MacroFactor en een gemiste training.

import { useCallback, useEffect } from 'react';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { GoalMilestoneProgress } from '../models/goals';
import type { CelebrationEvent } from '../components/CompletionMoment';
import { haptics } from '../utils/haptics';
import { playMilestoneChime, playSessionCompleteChime } from '../utils/sound';
import { pickCompletionQuote, pickVictoryQuote } from '../utils/quotes';
import {
  SessionTemplatesRepo,
  PlannedSessionsRepo,
  SessionLogsRepo,
  GoalMilestoneProgressRepo,
  type AppSettings,
} from '../storage/database';
import { linkLogNow, skipMissedNow } from '../storage/missedTraining';
import { askLine, autoSkipNotice, resolveMissedSettings } from '../engine/missedTraining';
import { syncWatchWorkoutsAfterPlanChange } from '../storage/watchWorkouts';
import { applyFeedback, type FeedbackPatch } from '../engine/autoTick';
import { announcementFor, type SavedMoment } from '../engine/savedMoments';
import { applyAlignments, inTurn, restoreAlignments, type AlignRequest } from '../storage/watchAlign';
import { trimStoredLog, undoTrimStoredLog } from '../storage/trim';
import { onSourceCorrected, restoreSourceUpdateStored, takeOverOfferedStored } from '../storage/sourceCorrection';
import type { StreamSet } from '../models/activityDetail';
import { applyStrengthTakeovers, restoreStrengthTakeovers, type TakeoverRequest } from '../storage/macrofactorLead';
import { snapshotWritten } from '../storage/undoPlanChange';
import type { RecentPlanChange } from '../models/planChange';
import { makeId } from '../utils/id';
import { showCompletionQuote } from '../engine/overviewSettings';
import type { LogSessionInput } from './appDataTypes';
import { bumpPlanRevision, planSettled } from './planningSync';
import { runLogSession } from './logSession';
import type { Dispatch, SetStateAction, RefObject } from 'react';

export function useLogActions(deps: {
  goalMilestoneProgress: GoalMilestoneProgress[];
  settings: AppSettings;
  setCelebration: Dispatch<SetStateAction<CelebrationEvent | null>>;
  setRecentChange: Dispatch<SetStateAction<RecentPlanChange | null>>;
  setDebriefLogId: Dispatch<SetStateAction<string | null>>;
  loggingInFlight: RefObject<Set<string>>;
  reportStorageError: (err: unknown) => void;
  refresh: (fromOtherWindow?: boolean) => Promise<void>;
}) {
  const { goalMilestoneProgress, settings, setCelebration, setRecentChange, setDebriefLogId, loggingInFlight, reportStorageError, refresh } = deps;
  // One moment after Gedaan for what one caller saved (engine/savedMoments.ts):
  // a single log gets its own, several (Alles opslaan) one summary. The debrief
  // follows for a single log the user ticked off, not for one ticked off by
  // itself. A cleared milestone gets the bigger quote and chime.
  const announceSaved = useCallback((batch: SavedMoment[]) => {
    const saved = batch.splice(0, batch.length);
    const announcement = announcementFor(saved);
    if (!announcement) return;
    haptics.success();
    if (settings.introSoundEnabled) {
      if (announcement.kind === 'milestone') playMilestoneChime();
      else playSessionCompleteChime();
    }
    // "Citaten na een training" uit: het scherm blijft, alleen het citaat
    // (voor een behaalde mijlpaal blijft het) valt weg.
    const withQuote = showCompletionQuote(settings.overviews, announcement.kind === 'milestone');
    setCelebration({
      id: makeId('celebration'),
      kind: announcement.kind,
      title: announcement.title,
      quote: withQuote ? (announcement.kind === 'milestone' ? pickVictoryQuote() : pickCompletionQuote()) : undefined,
      coachNote: announcement.coachNote,
      logIds: announcement.logIds,
    });
    // The debrief (components/DebriefSheet.tsx) opens after the moment.
    if (announcement.debriefLogId) setDebriefLogId(announcement.debriefLogId);
  }, [settings.introSoundEnabled, settings.overviews, setCelebration, setDebriefLogId]);

  const { heartRate, tempoStablePieces } = settings;
  // Het schrijven zelf staat in state/logSession.ts (zonder React, met tests).
  const logSession = useCallback(
    (input: LogSessionInput, opts?: { batch?: SavedMoment[] }): Promise<boolean> =>
      runLogSession(input, opts, { settings: { heartRate, tempoStablePieces }, loggingInFlight, reportStorageError, refresh, announceSaved }),
    [refresh, heartRate, tempoStablePieces, reportStorageError, announceSaved, loggingInFlight],
  );

  // Undoing a log also removes any milestone auto-cleared by it (matched
  // via sourceSessionLogId) — otherwise the Ascent Ladder would keep
  // showing a milestone as cleared with no log left to back it up.
  // Manually-cleared milestones (no sourceSessionLogId) are untouched.
  const undoLog = useCallback(
    async (logId: string) => {
      await SessionLogsRepo.delete(logId);
      for (const p of goalMilestoneProgress) {
        if (p.sourceSessionLogId === logId) await GoalMilestoneProgressRepo.delete(p.id);
      }
      await refresh();
    },
    [goalMilestoneProgress, refresh],
  );

  const setLogFeedback = useCallback(
    async (logId: string, patch: FeedbackPatch) => {
      // In the same queue as trimming and aligning with the watch, so a stale
      // copy never writes over a trim that landed in between.
      const written = await inTurn(async () => {
        const log = (await SessionLogsRepo.getAll()).find((l) => l.id === logId);
        if (!log) return false;
        await SessionLogsRepo.put(applyFeedback(log, patch));
        return true;
      });
      if (written) await refresh();
    },
    [refresh],
  );

  // The notice is set before the refresh, so a repair the week check makes
  // because of the new numbers joins it and one undo takes both back.
  const alignWithWatch = useCallback(
    async (requests: AlignRequest[]): Promise<number> => {
      const outcome = await applyAlignments(requests);
      if (outcome.logIds.length === 0) return 0;
      const n = outcome.logIds.length;
      const now = new Date().toISOString();
      setRecentChange({
        id: makeId('watchalign'),
        trigger: 'new_training_data',
        title: 'Bijgewerkt met je horloge',
        summary: n === 1 ? outcome.lines[0] : `${n} trainingen kregen de cijfers van je horloge`,
        lines: outcome.lines,
        why: 'Garmin is leidend: voor een training die je zelf invulde nam ASCEND de lengte, afstand, hartslag en hoogtemeters van je horloge over. Wat jij zelf invulde, zoals gevoel, inspanning en pijn, bleef staan. Je eigen cijfers zijn bewaard; met Ongedaan maken, of later via Terugzetten bij Garmin koppelen, komen ze terug.',
        before: [],
        addedIds: [],
        written: [],
        alignedLogIds: outcome.logIds,
        createdAt: now,
      });
      // The leg index and the week load count with the new numbers: the plan
      // is checked again, and what the system planned itself may follow.
      bumpPlanRevision();
      await refresh();
      void syncWatchWorkoutsAfterPlanChange();
      return n;
    },
    [refresh, setRecentChange],
  );

  // "Niet gedaan" or "Zelf overslaan": only the status of the planned training changes, never a log.
  const skipMissed = useCallback(
    async (sessionIds: string[], how: 'answer' | 'auto'): Promise<number> => {
      await planSettled();
      const now = new Date().toISOString();
      // Your answer is yours; what ASCEND skipped by itself carries no lock (a past row is history anyway).
      const before = await skipMissedNow(sessionIds, how === 'answer' ? { by: 'user', at: now } : undefined);
      if (before.length === 0) return 0;
      const tpl = new Map((await SessionTemplatesRepo.getAll()).map((t) => [t.id, t]));
      const items = before.map((session) => ({ session, template: tpl.get(session.templateId) })).filter((m): m is { session: PlannedSession; template: SessionTemplate } => !!m.template);
      const days = resolveMissedSettings(settings).days;
      const notice = how === 'auto'
        ? autoSkipNotice(items, days)
        : { title: `${items[0]?.template.name ?? 'Training'} overgeslagen`, lines: items.map((m) => `${askLine(m.session, m.template)} overgeslagen`), why: 'Je zei dat hij niet doorging. Hij staat nu op overgeslagen; er is geen training verzonnen en je historie blijft zoals hij was.' };
      setRecentChange({
        id: makeId('missed'),
        trigger: 'session_skipped',
        title: notice.title,
        summary: notice.lines.length === 1 ? notice.lines[0] : undefined,
        lines: notice.lines,
        why: notice.why,
        before,
        addedIds: [],
        written: await snapshotWritten(before, []),
        createdAt: now,
      });
      bumpPlanRevision();
      await refresh();
      return before.length;
    },
    [refresh, settings, setRecentChange],
  );

  return { announceSaved, logSession, undoLog, setLogFeedback, alignWithWatch, skipMissed };
}

// Een los log koppelen, en de cijfers van het horloge, intervals.icu en MacroFactor overnemen of terugzetten.
export function useWatchAndSourceActions(deps: {
  setRecentChange: Dispatch<SetStateAction<RecentPlanChange | null>>;
  refresh: (fromOtherWindow?: boolean) => Promise<void>;
}) {
  const { setRecentChange, refresh } = deps;
  // "Hoort die bij elkaar?" Akkoord: the loose log gets the reference to its planned training.
  const linkMissedLog = useCallback(
    async (logId: string, sessionId: string): Promise<boolean> => {
      await planSettled();
      const now = new Date().toISOString();
      const ok = await linkLogNow(logId, sessionId, now);
      if (!ok) return false;
      const session = (await PlannedSessionsRepo.getAll()).find((s) => s.id === sessionId);
      const template = session ? (await SessionTemplatesRepo.getAll()).find((t) => t.id === session.templateId) : undefined;
      const line = session && template ? `${askLine(session, template)} gekoppeld` : 'Gekoppeld';
      setRecentChange({
        id: makeId('missedlink'),
        trigger: 'session_completed',
        title: template ? `${template.name} gekoppeld` : 'Training gekoppeld',
        summary: line,
        lines: [line],
        why: 'Je gaf Akkoord: de training van je horloge of MacroFactor hoort bij deze geplande training. Alleen de koppeling is nieuw; de cijfers van de log blijven zoals ze waren. Met Ongedaan maken staat hij weer los.',
        before: [],
        addedIds: [],
        written: [],
        linkedLogIds: [logId],
        createdAt: now,
      });
      bumpPlanRevision();
      await refresh();
      return true;
    },
    [refresh, setRecentChange],
  );

  const restoreFromWatch = useCallback(
    async (logIds: string[]): Promise<number> => {
      const n = await restoreAlignments(logIds);
      if (n > 0) {
        setRecentChange((prev) => (prev?.alignedLogIds ? null : prev));
        bumpPlanRevision();
        await refresh();
        void syncWatchWorkoutsAfterPlanChange();
      }
      return n;
    },
    [refresh, setRecentChange],
  );

  // A cut changes the length, the distance and the climb of a training: the leg
  // index, the week load and the Ascent meters count with the new numbers, so the
  // plan is checked again, like after a putting back.
  const trimWatchActivity = useCallback(
    async (logId: string, streams: StreamSet, startSec: number, endSec: number): Promise<boolean> => {
      const written = await trimStoredLog(logId, streams, startSec, endSec);
      if (written) {
        bumpPlanRevision();
        await refresh();
        void syncWatchWorkoutsAfterPlanChange();
      }
      return written;
    },
    [refresh],
  );

  const undoTrimWatchActivity = useCallback(
    async (logId: string): Promise<boolean> => {
      const written = await undoTrimStoredLog(logId);
      if (written) {
        bumpPlanRevision();
        await refresh();
        void syncWatchWorkoutsAfterPlanChange();
      }
      return written;
    },
    [refresh],
  );

  const restoreSourceUpdate = useCallback(
    async (logId: string): Promise<boolean> => {
      const written = await restoreSourceUpdateStored(logId);
      if (written) {
        bumpPlanRevision();
        await refresh();
      }
      return written;
    },
    [refresh],
  );

  const takeOverSourceNumbers = useCallback(
    async (logId: string): Promise<boolean> => {
      const written = await takeOverOfferedStored(logId);
      if (written) {
        bumpPlanRevision();
        await refresh();
      }
      return written;
    },
    [refresh],
  );

  // A fetch from intervals.icu rewrote logs (a correction at the source): read them again.
  useEffect(
    () =>
      onSourceCorrected(() => {
        bumpPlanRevision();
        void refresh();
      }),
    [refresh],
  );

  // The leg index and the week load count with the new numbers: the plan is
  // checked again, like after the watch's numbers took over.
  const takeOverFromMacroFactor = useCallback(
    async (requests: TakeoverRequest[], batch: SavedMoment[]): Promise<number> => {
      const outcome = await applyStrengthTakeovers(requests);
      if (outcome.moments.length === 0) return 0;
      // Nothing the user just did: no debrief afterwards (auto).
      for (const m of outcome.moments) batch.push({ logId: m.logId, recovery: false, clearedTitle: m.clearedTitle, auto: true });
      bumpPlanRevision();
      await refresh();
      void syncWatchWorkoutsAfterPlanChange();
      return outcome.moments.length;
    },
    [refresh],
  );

  const restoreFromMacroFactor = useCallback(
    async (logIds: string[]): Promise<number> => {
      const n = await restoreStrengthTakeovers(logIds);
      if (n > 0) {
        bumpPlanRevision();
        await refresh();
        void syncWatchWorkoutsAfterPlanChange();
      }
      return n;
    },
    [refresh],
  );

  const setLogWorkout = useCallback(
    async (logId: string, workout: SessionLog['workout']) => {
      // The stored log, not the one on screen: the run profile may have come in since.
      // In the queue of trimming and aligning, like setLogFeedback.
      const written = await inTurn(async () => {
        const log = (await SessionLogsRepo.getAll()).find((l) => l.id === logId);
        if (!log) return false;
        await SessionLogsRepo.put({ ...log, workout });
        return true;
      });
      if (written) await refresh();
    },
    [refresh],
  );

  return { linkMissedLog, restoreFromWatch, trimWatchActivity, undoTrimWatchActivity, restoreSourceUpdate, takeOverSourceNumbers, takeOverFromMacroFactor, restoreFromMacroFactor, setLogWorkout };
}

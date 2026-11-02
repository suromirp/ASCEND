import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { ActivityStreamsRepo } from '../../storage/database';
import { isOpenOn, isSoreness } from '../../engine/injuryKind';
import { effectiveAmbition } from '../../engine/ambition';
import { hasBodyFat } from '../../engine/bodyFat';
import { currentBodyKg, latestWeight, weightsInUse } from '../../engine/bodyWeight';
import { predictDuration } from '../../engine/durationLearning';
import { usableSweatEntries } from '../../engine/sweat';
import { journeyProgress, normalizeJourneyState, withBootsDone, withDerivedDone } from '../../engine/journey';
import { bootBreakInStatus, bootGoalKm, breakInTotals } from '../../engine/bootBreakIn';
import { baseWeightGrams, resolvePackItems } from '../../engine/packList';
import { JOURNEY_TASKS } from '../../data/journeyTasks';
import { programAnchorDate } from '../../engine/programLayout';
import { checkDataKey, quietCheck } from '../../engine/strengthHistory';
import { easedLogIds } from '../../engine/legDayEase';
import { checkModelKey, resolveStrengthSettings, type StrengthSettings } from '../../engine/strengthSettings';
import { DEFAULT_WATCH_USE } from '../../engine/watchUse';
import type { IntervalsHrBasis } from '../../engine/watchHeartRate';
import type { SettingsFacts } from '../../engine/settingsSummary';
import { getConnection, getWatchState, onWatchChange, type WatchActivityState } from '../../storage/externalActivities';
import { getWatchWorkoutState } from '../../storage/watchWorkouts';
import { getMacroFactorState, onMacroFactorChange, type MacroFactorState } from '../../storage/macrofactor';
import { getPersistenceStatus, type PersistenceStatus } from '../../storage/persistence';
import { estimateStorage } from '../../storage/storageEstimate';
import type { StorageEstimate } from '../../engine/storageUse';
import { listSnapshots } from '../../storage/backup';
import { webBackupFileAdapter, webFolderTarget } from '../../storage/backupFileAdapter';
import { autoBackupTarget, readAutoBackupState, subscribeAutoBackup } from '../../storage/autoBackup';
import { buildLabel } from '../../utils/buildLabel';
import { noticeSupport } from '../../engine/morningNotice';
import { readNoticeEnvironment } from '../../utils/morningNotice';
import { nativeNoticeSupport, type DevicePermissions } from '../../engine/deviceNotices';
import { notificationPort } from '../../integrations/notifications';
import { liveUpdatePort } from '../../integrations/liveUpdate';
import { withTimeout } from '../../utils/withTimeout';
import { resolveProgramWeek, todayISO } from '../../utils/dates';
import { mainGoal as findMainGoal } from '../../engine/mainGoal';
import { listedGoals } from '../../engine/goalList';

// Alles wat de instellingen over je weten, als de feiten die engine/settingsSummary.ts
// leest. De opslag die niet in de app-staat zit (horloge, MacroFactor, back-up) wordt
// hier ingelezen en volgt wijzigingen. Tot het binnen is, staat er niets "verbonden".
interface Loaded {
  linked: boolean;
  watch: WatchActivityState | null;
  sendEnabled: boolean;
  hrBasis?: IntervalsHrBasis;
  macroFactor: MacroFactorState | null;
  storage: PersistenceStatus | undefined;
  snapshots: number;
  folderChosen: boolean;
  streamsBytes?: number;
  storageUse?: StorageEstimate;
  notice: SettingsFacts['notice'];
  device?: DevicePermissions | 'unknown';
  // Het lezen van de koppelstatus mislukte.
  watchUnreadable?: boolean;
  autoBackup?: SettingsFacts['autoBackup'];
}

// De automatische back-up: in de app altijd de map van de app, in de browser alleen de vaste map.
async function readAutoBackupFacts(folderChosen: boolean): Promise<SettingsFacts['autoBackup']> {
  const target = autoBackupTarget();
  const state = await readAutoBackupState();
  const folderWhere = target.platform === 'app' ? await target.where() : folderChosen ? await webFolderTarget.where() : undefined;
  return {
    platform: target.platform,
    ...(state.where ? { where: state.where } : {}),
    ...(folderWhere?.kind === 'folder' ? { folder: folderWhere.label } : {}),
    ...(state.failure ? { failure: state.failure.reason } : {}),
  };
}

const EMPTY: Loaded = { linked: false, watch: null, sendEnabled: false, macroFactor: null, storage: undefined, snapshots: 0, folderChosen: false, notice: undefined };

export function useSettingsFacts(): { facts: SettingsFacts; reload: () => void } {
  const app = useAppData();
  const [loaded, setLoaded] = useState<Loaded>(EMPTY);
  const [tick, setTick] = useState(0);
  const reload = () => setTick((n) => n + 1);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      let unreadable = false;
      const unread = () => {
        unreadable = true;
        return null;
      };
      const [connection, watch, workouts, macroFactor, storage, snapshots, folder, noticeEnv, streamSize, storageUse, device] = await Promise.all([
        getConnection().catch(unread),
        getWatchState().catch(unread),
        getWatchWorkoutState().catch(() => null),
        getMacroFactorState().catch(() => null),
        getPersistenceStatus().catch(() => undefined),
        listSnapshots().catch(() => []),
        webBackupFileAdapter.supportsPreferredDirectory() ? (webBackupFileAdapter.hasPreferredDirectory?.() ?? Promise.resolve(false)).catch(() => false) : Promise.resolve(false),
        readNoticeEnvironment().catch(() => undefined),
        ActivityStreamsRepo.totalBytes().catch(() => undefined),
        // Met een eigen tijdsgrens (storage/storageEstimate.ts): wacht nooit langer dan een paar seconden.
        estimateStorage(),
        // Wat de telefoon toestaat; hoogstens twee seconden, daarna "Onbekend".
        withTimeout(notificationPort().permissions(), 2000).catch(() => 'unknown' as const),
      ]);
      const autoBackup = await readAutoBackupFacts(!!folder).catch(() => undefined);
      if (!alive) return;
      setLoaded({ autoBackup, linked: !!connection, watch, sendEnabled: !!workouts?.enabled, hrBasis: workouts?.hrBasis, macroFactor, storage, snapshots: snapshots.length, folderChosen: !!folder, streamsBytes: streamSize?.bytes, storageUse, device, watchUnreadable: unreadable,
        // In de app komt de ochtendvraag als melding op tijd; dan telt alleen of meldingen mogen.
        notice: device !== 'unknown' && device.timed
          ? { support: nativeNoticeSupport(device.notifications), granted: device.notifications === 'granted' }
          : noticeEnv ? { support: noticeSupport(noticeEnv), granted: noticeEnv.permission === 'granted' } : undefined });
    };
    void load();
    const offWatch = onWatchChange(() => void load());
    const offMf = onMacroFactorChange(() => void load());
    const offBackup = subscribeAutoBackup(() => void load());
    return () => {
      alive = false;
      offWatch();
      offMf();
      offBackup();
    };
  }, [tick]);

  const { settings, goalEngineConfig, program, trainingGoals, goalMilestones, injuryNotes, templates, plannedSessions, templateById, sessionLogs, strengthExternal } = app;

  // Raak rekent alle krachtgeschiedenis door. Een schakelaar op een instellingenpagina laat de
  // gegevens opnieuw inlezen in nieuwe arrays, dus de identiteit van de lijsten zegt niets: de
  // memo hangt aan een vingerafdruk van de inhoud (checkDataKey) en van de instelling
  // (checkModelKey).
  const checkKey = checkModelKey(settings.strengthModel);
  const bodyKg = currentBodyKg(settings.weightEntries, settings.weightFromMacroFactor);
  // Spierpijn en een gekozen Lichter horen erbij: ze bepalen of een training telt (engine/legDayEase.ts).
  const easeKey = JSON.stringify([settings.legEaseDays, settings.morningCheckIns?.filter((c) => c.legs).map((c) => [c.date, c.legs, c.soreWhere]), injuryNotes.filter((n) => n.kind === 'spierpijn').map((n) => [n.date, n.bodyPart, n.resolvedDate])]);
  const dataKey = checkDataKey(sessionLogs, templates, program, bodyKg) + easeKey;
  const strengthCheck = useMemo(() => {
    const resolved = resolveStrengthSettings(JSON.parse(checkKey) as StrengthSettings);
    if (!resolved.enabled) return undefined;
    return quietCheck(sessionLogs, templates, { logs: sessionLogs, templates, program, bodyKg, sore: { injuries: injuryNotes, checkIns: settings.morningCheckIns ?? [] } }, resolved, easedLogIds(sessionLogs, settings.legEaseDays));
    // De lijsten zelf staan er bewust niet in: de vingerafdruk (dataKey) is hun inhoud.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [checkKey, dataKey]);

  const facts = useMemo<SettingsFacts>(() => {
    const today = todayISO();
    const position = program ? resolveProgramWeek(program, today) : null;
    const goalDate = programAnchorDate(trainingGoals, goalMilestones, today);
    const ladder = new Set(goalMilestones.map((m) => m.goalId));
    const mainGoal = findMainGoal(trainingGoals, ladder);
    const mainIsTrek = !!mainGoal?.requirements.some((r) => r.discipline === 'hiking' || r.kind === 'elevationGain' || r.kind === 'elevationLoss');
    const periods = (settings.leavePeriods ?? []).filter((p) => p.endDate >= today);
    const w = latestWeight(weightsInUse(settings.weightEntries, settings.weightFromMacroFactor));
    const estimates = settings.sessionDurationEstimates ?? {};
    const strength = templates.filter(
      (t) => t.type === 'strength' && !t.weeklyProgression && (t.defaultDayOfWeek || plannedSessions.some((s) => s.templateId === t.id && s.scheduledDate >= today)),
    );
    const journeyState = normalizeJourneyState(settings.journey).state;
    const boots = bootBreakInStatus({ boots: journeyState?.boots, logs: sessionLogs, goalKm: bootGoalKm(settings.bootBreakInKm), today, departure: goalDate });
    const progress = goalDate ? journeyProgress(JOURNEY_TASKS, withBootsDone(withDerivedDone(journeyState, usableSweatEntries(settings.sweatEntries, sessionLogs)), boots, today)) : undefined;
    const use = loaded.watch?.use ?? DEFAULT_WATCH_USE;
    return {
      today,
      settings,
      dailyTimeBudget: goalEngineConfig.availability.dailyTimeBudget,
      pairing: goalEngineConfig.strategy.sameDayPairingPreference,
      position: position ? { weekInProgram: position.weekInProgram, totalWeeks: position.totalWeeksInProgram, phaseName: position.phase.name } : null,
      goal: mainGoal && mainGoal.status === 'active' && goalDate ? { name: mainGoal.name, date: mainGoal.targetDate } : null,
      treks: periods.filter((p) => p.trek).length,
      vacations: periods.filter((p) => !p.trek).length,
      activeInjuries: injuryNotes.filter((n) => isOpenOn(n, today) && !isSoreness(n)).length,
      strengthExternal,
      ambition: effectiveAmbition(settings.ambition, sessionLogs, templateById, program, today),
      hasBodyFat: hasBodyFat(weightsInUse(settings.weightEntries, settings.weightFromMacroFactor)),
      weight: w ? { kg: w.kg, source: w.source, date: w.date } : null,
      watch: loaded.watch
        ? { linked: loaded.linked, syncedAt: loaded.watch.fetchedAt, use, autoTick: loaded.watch.autoTick, leads: loaded.watch.garminLeads, corrections: loaded.watch.takeCorrections, sendEnabled: loaded.sendEnabled, hrBasis: loaded.hrBasis }
        : null,
      macroFactor: loaded.macroFactor ? { readAt: loaded.macroFactor.readAt, leads: loaded.macroFactor.leads } : null,
      strengthDurations: strength.map((t) => {
        const p = predictDuration(t, sessionLogs, estimates[t.id]);
        return { name: t.name, minutes: p.minutes, source: p.source, basedOn: p.basedOn };
      }),
      strengthCheck,
      bootKm: journeyState?.boots ? breakInTotals(sessionLogs, journeyState.boots.since).km : undefined,
      journeyOpen: progress ? progress.total - progress.done : undefined,
      packKg: Math.round(baseWeightGrams(resolvePackItems(settings.packList)) / 100) / 10,
      folderSupported: webBackupFileAdapter.supportsPreferredDirectory(),
      folderChosen: loaded.folderChosen,
      autoBackup: loaded.autoBackup,
      storage: loaded.storage,
      streamsBytes: loaded.streamsBytes,
      storageUse: loaded.storageUse,
      snapshots: loaded.snapshots,
      buildLabel: buildLabel(),
      longSundayVisible: !mainIsTrek || settings.longSundaySession === 'run',
      noGoal: listedGoals(trainingGoals, ladder, today).length === 0 && !!program && plannedSessions.length > 0,
      notice: loaded.notice,
      device: loaded.device,
      liveUpdate: liveUpdatePort().available,
      watchUnreadable: loaded.watchUnreadable,
    };
  }, [settings, goalEngineConfig, program, trainingGoals, goalMilestones, injuryNotes, templates, plannedSessions, templateById, sessionLogs, strengthExternal, loaded, strengthCheck]);

  return { facts, reload };
}

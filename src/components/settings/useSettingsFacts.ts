import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { effectiveAmbition } from '../../engine/ambition';
import { hasBodyFat } from '../../engine/bodyFat';
import { currentBodyKg, latestWeight, weightsInUse } from '../../engine/bodyWeight';
import { predictDuration } from '../../engine/durationLearning';
import { journeyProgress } from '../../engine/journey';
import { baseWeightGrams, resolvePackItems } from '../../engine/packList';
import { JOURNEY_TASKS } from '../../data/journeyTasks';
import { programAnchorDate } from '../../engine/programLayout';
import { checkDataKey, quietCheck } from '../../engine/strengthHistory';
import { checkModelKey, resolveStrengthSettings, type StrengthSettings } from '../../engine/strengthSettings';
import { DEFAULT_WATCH_USE } from '../../engine/watchUse';
import type { IntervalsHrBasis } from '../../engine/watchHeartRate';
import type { SettingsFacts } from '../../engine/settingsSummary';
import { getConnection, getWatchState, onWatchChange, type WatchActivityState } from '../../storage/externalActivities';
import { getWatchWorkoutState } from '../../storage/watchWorkouts';
import { getMacroFactorState, onMacroFactorChange, type MacroFactorState } from '../../storage/macrofactor';
import { getPersistenceStatus, type PersistenceStatus } from '../../storage/persistence';
import { listSnapshots } from '../../storage/backup';
import { webBackupFileAdapter } from '../../storage/backupFileAdapter';
import { buildLabel } from '../../utils/buildLabel';
import { noticeSupport } from '../../engine/morningNotice';
import { readNoticeEnvironment } from '../../utils/morningNotice';
import { resolveProgramWeek, todayISO } from '../../utils/dates';

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
  notice: SettingsFacts['notice'];
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
      const [connection, watch, workouts, macroFactor, storage, snapshots, folder, noticeEnv] = await Promise.all([
        getConnection().catch(() => null),
        getWatchState().catch(() => null),
        getWatchWorkoutState().catch(() => null),
        getMacroFactorState().catch(() => null),
        getPersistenceStatus().catch(() => undefined),
        listSnapshots().catch(() => []),
        webBackupFileAdapter.supportsPreferredDirectory() ? (webBackupFileAdapter.hasPreferredDirectory?.() ?? Promise.resolve(false)).catch(() => false) : Promise.resolve(false),
        readNoticeEnvironment().catch(() => undefined),
      ]);
      if (!alive) return;
      setLoaded({ linked: !!connection, watch, sendEnabled: !!workouts?.enabled, hrBasis: workouts?.hrBasis, macroFactor, storage, snapshots: snapshots.length, folderChosen: !!folder, notice: noticeEnv ? { support: noticeSupport(noticeEnv), granted: noticeEnv.permission === 'granted' } : undefined });
    };
    void load();
    const offWatch = onWatchChange(() => void load());
    const offMf = onMacroFactorChange(() => void load());
    return () => {
      alive = false;
      offWatch();
      offMf();
    };
  }, [tick]);

  const { settings, goalEngineConfig, program, trainingGoals, goalMilestones, injuryNotes, templates, plannedSessions, templateById, sessionLogs, strengthExternal } = app;

  // Raak rekent alle krachtgeschiedenis door. Een schakelaar op een instellingenpagina laat de
  // gegevens opnieuw inlezen in nieuwe arrays, dus de identiteit van de lijsten zegt niets: de
  // memo hangt aan een vingerafdruk van de inhoud (checkDataKey) en van de instelling
  // (checkModelKey).
  const checkKey = checkModelKey(settings.strengthModel);
  const bodyKg = currentBodyKg(settings.weightEntries, settings.weightFromMacroFactor);
  const dataKey = checkDataKey(sessionLogs, templates, program, bodyKg);
  const strengthCheck = useMemo(() => {
    const resolved = resolveStrengthSettings(JSON.parse(checkKey) as StrengthSettings);
    if (!resolved.enabled) return undefined;
    return quietCheck(sessionLogs, templates, { logs: sessionLogs, templates, program, bodyKg }, resolved);
    // De lijsten zelf staan er bewust niet in: de vingerafdruk (dataKey) is hun inhoud.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [checkKey, dataKey]);

  const facts = useMemo<SettingsFacts>(() => {
    const today = todayISO();
    const position = program ? resolveProgramWeek(program, today) : null;
    const goalDate = programAnchorDate(trainingGoals, goalMilestones, today);
    const ladder = new Set(goalMilestones.map((m) => m.goalId));
    const mainGoal = trainingGoals.find((g) => g.status === 'active' && ladder.has(g.id));
    const mainIsTrek = !!mainGoal?.requirements.some((r) => r.discipline === 'hiking' || r.kind === 'elevationGain' || r.kind === 'elevationLoss');
    const periods = (settings.leavePeriods ?? []).filter((p) => p.endDate >= today);
    const w = latestWeight(weightsInUse(settings.weightEntries, settings.weightFromMacroFactor));
    const estimates = settings.sessionDurationEstimates ?? {};
    const strength = templates.filter(
      (t) => t.type === 'strength' && !t.weeklyProgression && (t.defaultDayOfWeek || plannedSessions.some((s) => s.templateId === t.id && s.scheduledDate >= today)),
    );
    const progress = goalDate ? journeyProgress(JOURNEY_TASKS, settings.journey) : undefined;
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
      activeInjuries: injuryNotes.filter((n) => !n.resolvedDate).length,
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
      journeyOpen: progress ? progress.total - progress.done : undefined,
      packKg: Math.round(baseWeightGrams(resolvePackItems(settings.packList)) / 100) / 10,
      folderSupported: webBackupFileAdapter.supportsPreferredDirectory(),
      folderChosen: loaded.folderChosen,
      storage: loaded.storage,
      snapshots: loaded.snapshots,
      buildLabel: buildLabel(),
      longSundayVisible: !mainIsTrek || settings.longSundaySession === 'run',
      notice: loaded.notice,
    };
  }, [settings, goalEngineConfig, program, trainingGoals, goalMilestones, injuryNotes, templates, plannedSessions, templateById, sessionLogs, strengthExternal, loaded, strengthCheck]);

  return { facts, reload };
}

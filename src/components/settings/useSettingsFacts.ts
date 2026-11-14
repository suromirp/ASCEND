import { hasTrekGoal } from '../../engine/journeyAccess';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { isOpenOn, isSoreness } from '../../engine/injuryKind';
import { effectiveAmbition } from '../../engine/ambition';
import { hasBodyFat } from '../../engine/bodyFat';
import { weightsInUse } from '../../engine/bodyWeight';
import { loadBodyKg, weightShown } from '../../engine/weightTrend';
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
import type { SettingsFacts } from '../../engine/settingsSummary';
import { onHealthConnectChange } from '../../storage/healthConnect';
import { onWatchChange } from '../../storage/externalActivities';
import { onMacroFactorChange } from '../../storage/macrofactor';
import { subscribeAutoBackup } from '../../storage/autoBackup';
import { webBackupFileAdapter } from '../../storage/backupFileAdapter';
import { buildLabel } from '../../utils/buildLabel';
import { liveUpdatePort } from '../../integrations/liveUpdate';
import { ALL_SOURCES, EMPTY, settingsParts, type Loaded } from './settingsFactsParts';
import { startFactsLoading, type LoaderState, type SourceLink } from './factsLoader';
import { resolveProgramWeek, todayISO } from '../../utils/dates';
import { mainGoal as findMainGoal } from '../../engine/mainGoal';
import { listedGoals } from '../../engine/goalList';

const FACT_LINKS: SourceLink[] = [
  { subscribe: onWatchChange, sources: ['watch'] },
  { subscribe: onMacroFactorChange, sources: ['macroFactor'] },
  { subscribe: subscribeAutoBackup, sources: ['autoBackup', 'snapshots'] },
  { subscribe: onHealthConnectChange, sources: ['healthConnect'] },
];

export function useSettingsFacts(): { facts: SettingsFacts; reload: () => void } {
  const app = useAppData();
  // De laadstand per bron (components/settings/factsLoader.ts): wat al bekend is blijft staan.
  const [state, setState] = useState<LoaderState<Loaded>>({ loaded: EMPTY, pending: ALL_SOURCES, unknown: [] });
  const control = useRef<{ reload: () => void } | null>(null);
  const reload = useCallback(() => control.current?.reload(), []);

  useEffect(() => {
    const run = startFactsLoading(settingsParts, EMPTY, ALL_SOURCES, FACT_LINKS, setState);
    control.current = run;
    return () => {
      control.current = null;
      run.stop();
    };
  }, []);
  const { loaded, pending, unknown } = state;

  const { settings, goalEngineConfig, program, trainingGoals, goalMilestones, injuryNotes, templates, plannedSessions, templateById, sessionLogs, strengthExternal } = app;

  // Raak rekent alle krachtgeschiedenis door. Een schakelaar op een instellingenpagina laat de
  // gegevens opnieuw inlezen in nieuwe arrays, dus de identiteit van de lijsten zegt niets: de
  // memo hangt aan een vingerafdruk van de inhoud (checkDataKey) en van de instelling
  // (checkModelKey).
  const checkKey = checkModelKey(settings.strengthModel);
  const bodyKg = loadBodyKg(settings);
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
    const shown = weightShown(weightsInUse(settings.weightEntries, settings.weightFromMacroFactor, settings.weightFromHealthConnect), settings.weightTrend);
    const w = shown?.latest;
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
      templates,
      dailyTimeBudget: goalEngineConfig.availability.dailyTimeBudget,
      pairing: goalEngineConfig.strategy.sameDayPairingPreference,
      position: position ? { weekInProgram: position.weekInProgram, totalWeeks: position.totalWeeksInProgram, phaseName: position.phase.name } : null,
      goal: mainGoal && mainGoal.status === 'active' && goalDate ? { name: mainGoal.name, date: mainGoal.targetDate } : null,
      treks: periods.filter((p) => p.trek).length,
      vacations: periods.filter((p) => !p.trek).length,
      activeInjuries: injuryNotes.filter((n) => isOpenOn(n, today) && !isSoreness(n)).length,
      strengthExternal,
      ambition: effectiveAmbition(settings.ambition, sessionLogs, templateById, program, today),
      hasBodyFat: hasBodyFat(weightsInUse(settings.weightEntries, settings.weightFromMacroFactor, settings.weightFromHealthConnect)),
      weight: w ? { kg: w.kg, source: w.source, date: w.date, ...(shown?.trend ? { trendKg: shown.trend.kg } : {}) } : null,
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
      mainIsTrek,
      trekGoal: hasTrekGoal(trainingGoals, ladder, today),
      longSundayVisible: !mainIsTrek || settings.longSundaySession === 'run',
      noGoal: listedGoals(trainingGoals, ladder, today).length === 0 && !!program && plannedSessions.length > 0,
      notice: loaded.notice,
      device: loaded.device,
      liveUpdate: liveUpdatePort().available,
      watchUnreadable: loaded.watchUnreadable,
      healthConnect: loaded.healthConnect,
      pending,
      unknown,
    };
  }, [settings, goalEngineConfig, program, trainingGoals, goalMilestones, injuryNotes, templates, plannedSessions, templateById, sessionLogs, strengthExternal, loaded, pending, unknown, strengthCheck]);

  return { facts, reload };
}

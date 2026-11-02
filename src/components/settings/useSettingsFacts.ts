import { webBackupFileAdapter } from '../../storage/backupFileAdapter';
import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '../../state/AppDataContext';
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
import type { SettingsFacts } from '../../engine/settingsSummary';
import { onHealthConnectChange } from '../../storage/healthConnect';
import { onWatchChange } from '../../storage/externalActivities';
import { onMacroFactorChange } from '../../storage/macrofactor';
import { subscribeAutoBackup } from '../../storage/autoBackup';
import { buildLabel } from '../../utils/buildLabel';
import { liveUpdatePort } from '../../integrations/liveUpdate';
import { loadParts } from '../../utils/loadParts';
import { ALL_SOURCES, EMPTY, settingsParts, type Loaded } from './settingsFactsParts';
import type { SettingsSource } from '../../engine/settingsPending';
import { resolveProgramWeek, todayISO } from '../../utils/dates';
import { mainGoal as findMainGoal } from '../../engine/mainGoal';
import { listedGoals } from '../../engine/goalList';

export function useSettingsFacts(): { facts: SettingsFacts; reload: () => void } {
  const app = useAppData();
  const [loaded, setLoaded] = useState<Loaded>(EMPTY);
  // De bronnen die de eerste keer nog niet binnen zijn; bij een volgende ronde blijft de oude waarde staan.
  const [pending, setPending] = useState<readonly SettingsSource[]>(ALL_SOURCES);
  const [tick, setTick] = useState(0);
  const reload = () => setTick((n) => n + 1);

  useEffect(() => {
    let alive = true;
    const load = (only?: readonly SettingsSource[]) =>
      loadParts(
        settingsParts().filter((p) => !only || only.includes(p.key)),
        (key, patch) => {
          if (!alive) return;
          setLoaded((prev) => ({ ...prev, ...patch }));
          setPending((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : prev));
        },
      );
    void load();
    // Een wijziging vraagt alleen de bron die erbij hoort; de zware tellingen lopen niet mee.
    const offWatch = onWatchChange(() => void load(['watch']));
    const offMf = onMacroFactorChange(() => void load(['macroFactor']));
    const offBackup = subscribeAutoBackup(() => void load(['autoBackup', 'snapshots']));
    const offHealth = onHealthConnectChange(() => void load(['healthConnect']));
    return () => {
      alive = false;
      offHealth();
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
      healthConnect: loaded.healthConnect,
      pending,
    };
  }, [settings, goalEngineConfig, program, trainingGoals, goalMilestones, injuryNotes, templates, plannedSessions, templateById, sessionLogs, strengthExternal, loaded, pending, strengthCheck]);

  return { facts, reload };
}

import { useMemo } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { legAnswerHistory, legLearning, resolveLegLearning, type LegLearning } from '../../engine/legIndexLearning';
import { loadBodyKg } from '../../engine/weightTrend';
import { todayISO } from '../../utils/dates';

// Je eigen beenindex (engine/legIndexLearning.ts): wat je ochtenden over de index zeggen, voor het blad
// Index en je benen en de rij in Je stand. Alleen lezen; een besluit bewaart LegLearningBlock.
export function useLegLearning(): LegLearning {
  const { sessionLogs, templates, settings } = useAppData();
  const today = todayISO();
  return useMemo(() => {
    const bodyKg = loadBodyKg({ weightEntries: settings.weightEntries, weightFromMacroFactor: settings.weightFromMacroFactor, weightFromHealthConnect: settings.weightFromHealthConnect, weightForLoad: settings.weightForLoad });
    return legLearning({
      today, logs: sessionLogs, templates, bodyKg,
      answers: legAnswerHistory(settings.legAnswers, settings.morningCheckIns),
      illness: settings.illnessEpisodes, leave: settings.leavePeriods,
      mode: resolveLegLearning(settings.legIndexLearning), factorLog: settings.legFactorLog,
    });
  }, [today, sessionLogs, templates, settings.weightEntries, settings.weightFromMacroFactor, settings.weightFromHealthConnect, settings.weightForLoad, settings.legAnswers, settings.morningCheckIns, settings.illnessEpisodes, settings.leavePeriods, settings.legIndexLearning, settings.legFactorLog]);
}

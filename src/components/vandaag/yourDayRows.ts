// ASCEND: of de rijen van Je dag er vandaag staan (docs/visie/Ontwerp Je dag.md), met dezelfde regels
// als de rijen zelf, zodat Vandaag kan tellen en ordenen (engine/yourDay.ts#arrangeYourDay). De rijen
// gebruiken dezelfde hooks: wat hier staat en wat de rij doet kan niet uit elkaar lopen.

import { useAppData } from '../../state/AppDataContext';
import { checkInFor, shouldAskCheckIn } from '../../engine/wellbeing';
import { morningFromHour } from '../../engine/overviewSettings';
import { freshLinkedWeight, weightDue, weightsInUse, WEIGHT_REMINDER_DAYS } from '../../engine/bodyWeight';
import { activeIllness } from '../../engine/illness';
import { journeyWeeksLeft, taskDates } from '../../engine/journey';
import { isLastJourneyWeek, journeyRowOnToday, journeyWhenText, resolveJourneyOnToday } from '../../engine/yourDay';
import { formatDateNL, todayISO, weekdayLongNL } from '../../utils/dates';
import { useJourney } from '../reis/useJourney';

// Of de regel Gevoel er vandaag staat, met dezelfde regels als de regel zelf, zodat Je dag kan
// tellen en ordenen (engine/yourDay.ts#arrangeYourDay). `pain`: alleen de vraag naar een pijnplek,
// nog open; die valt nooit achter "Nog".
export function useCheckInRow({ painOnly = false, hideTodo = false }: { painOnly?: boolean; hideTodo?: boolean } = {}): { shown: boolean; done: boolean; pain: boolean } {
  const { settings, sessionLogs, plannedSessions, templates } = useAppData();
  const today = todayISO();
  const existing = checkInFor(today, settings.morningCheckIns);
  const ask = shouldAskCheckIn(today, settings.morningCheckIns, sessionLogs, plannedSessions, templates);
  const hidden = (!ask && !existing)
    || (!existing && !painOnly && new Date().getHours() < morningFromHour(settings.overviews))
    || hideTodo;
  return { shown: !hidden, done: !!existing, pain: !hidden && !existing && painOnly };
}

// Of de regel Gewicht er vandaag staat, zodat Je dag kan tellen (engine/yourDay.ts#arrangeYourDay).
export function useWeightRow(): { shown: boolean } {
  const { settings } = useAppData();
  const today = todayISO();
  const entries = weightsInUse(settings.weightEntries, settings.weightFromMacroFactor, settings.weightFromHealthConnect);
  if (activeIllness(settings.illnessEpisodes) || !weightDue(entries, settings.weightReminderSnoozedAt, today, settings.weightReminderDays ?? WEIGHT_REMINDER_DAYS)) return { shown: false };
  // The weight comes from MacroFactor or Health Connect and is recent: nothing to ask.
  if (freshLinkedWeight(settings.weightEntries, settings.weightFromMacroFactor, settings.weightFromHealthConnect, today)) return { shown: false };
  return { shown: true };
}

// Of de reistaak vandaag in Je dag staat (instelling "Reistaak op Vandaag", engine/yourDay.ts),
// met de regel ernaast ("kan nog tot zondag") en of het de laatste week is.
export function useJourneyRow() {
  const { settings } = useAppData();
  const journey = useJourney();
  const { pick, goalDate } = journey;
  const today = todayISO();
  const weeksLeft = goalDate ? journeyWeeksLeft(today, goalDate) : 0;
  const shown = !!goalDate && journeyRowOnToday(pick, weeksLeft, resolveJourneyOnToday(settings.journeyOnToday));
  const when = shown && pick && goalDate
    ? journeyWhenText(pick.task.window, weeksLeft, taskDates(pick.task, goalDate).closesOn, weekdayLongNL, formatDateNL)
    : undefined;
  const lastWeek = !!pick && isLastJourneyWeek(pick.task.window, weeksLeft);
  return { shown, done: pick?.state === 'done', when, lastWeek, journey };
}

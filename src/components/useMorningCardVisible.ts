import { useAppData } from '../state/AppDataContext';
import { checkInFor } from '../engine/wellbeing';
import { morningFromHour, showMorningCardSetting } from '../engine/overviewSettings';
import { showMorningCard } from '../engine/morningCard';
import { logDay, plannedByIdOf } from '../engine/logDay';
import { todayISO } from '../utils/dates';

// De dag waarop je de ochtendkaart in dit bezoek beantwoordde: dan blijft de kaart
// staan, klein, met Wijzigen en Ongedaan maken, zodat je ziet wat je koos.
let answeredOn: string | null = null;
export function markMorningAnswered(day: string) {
  answeredOn = day;
}

// Staat de ochtendkaart er nu? (engine/morningCard.ts#showMorningCard)
export function useMorningCardVisible(): boolean {
  const { settings, sessionLogs, plannedSessions } = useAppData();
  const today = todayISO();
  const plannedById = plannedByIdOf(plannedSessions);
  // Beantwoord of net ongedaan gemaakt in dit bezoek: de kaart blijft, ook na twaalven,
  // zodat Ongedaan maken de vraag terugbrengt in plaats van alles te laten verdwijnen.
  if (answeredOn === today && showMorningCardSetting(settings.overviews)) return true;
  return showMorningCard({
    enabled: showMorningCardSetting(settings.overviews),
    hour: new Date().getHours(),
    fromHour: morningFromHour(settings.overviews),
    checkIn: checkInFor(today, settings.morningCheckIns),
    trainedToday: sessionLogs.some((l) => logDay(l, plannedById) === today),
  });
}

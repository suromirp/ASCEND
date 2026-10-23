import { useAppData } from '../state/AppDataContext';
import { checkInFor } from '../engine/wellbeing';
import { showMorningCardSetting } from '../engine/overviewSettings';
import { showMorningCard } from '../engine/morningCard';
import { todayISO } from '../utils/dates';

// Staat de ochtendkaart er nu? (engine/morningCard.ts#showMorningCard)
export function useMorningCardVisible(): boolean {
  const { settings, sessionLogs } = useAppData();
  const today = todayISO();
  return showMorningCard({
    enabled: showMorningCardSetting(settings.overviews),
    hour: new Date().getHours(),
    checkIn: checkInFor(today, settings.morningCheckIns),
    trainedToday: sessionLogs.some((l) => l.completedDate === today),
  });
}

import { resolveIntensityCounting } from '../engine/intensitySettings';
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import { morningNoticeSchedule, nextWeekNoticeAt, resolveDeviceNotices, weekNoticeSchedule, weekNoticeText } from '../engine/deviceNotices';
import { buildWeekReview } from '../engine/weekReview';
import { plannedByIdOf } from '../engine/logDay';
import { morningFromHour, resolveOverviews } from '../engine/overviewSettings';
import { notificationPort, syncTimedNotices } from '../integrations/notifications';
import { mondayOfWeek, toISODate, todayISO } from '../utils/dates';

// De vaste meldingen van de app: de ochtendvraag en de weekmelding op zondag. Wat er komt en wanneer
// beslist engine/deviceNotices.ts; dit onderdeel geeft het door aan de laag
// (integrations/notifications.ts) als er iets verandert en als je de app weer opent. In de browser
// doet de laag niets. Een tik op een melding opent het adres dat erbij hoort.
export function DeviceNoticesHost() {
  const { settings, plannedSessions, sessionLogs, templates, program, planChangeLog } = useAppData();
  const navigate = useNavigate();
  const port = notificationPort();
  const notices = resolveDeviceNotices(settings);
  const haptics = settings.haptics !== false;
  const counting = resolveIntensityCounting(settings);

  // De tekst van de weekmelding: de weekterugblik van de week met de eerstvolgende zondag.
  const weekText = useMemo(() => {
    if (!port.timed || !notices.week) return null;
    const sunday = toISODate(nextWeekNoticeAt(new Date(), notices.weekTime));
    const weekStart = mondayOfWeek(sunday);
    const review = buildWeekReview({ weekStart, plannedById: plannedByIdOf(plannedSessions), plannedSessions, logs: sessionLogs, templates, program, planChangeLog, asOf: todayISO(), illnessEpisodes: settings.illnessEpisodes, weeklyChecks: settings.weeklyHealthChecks, heartRate: settings.heartRate, intensityCounting: counting });
    return weekNoticeText(review);
  }, [port.timed, notices.week, notices.weekTime, plannedSessions, sessionLogs, templates, program, planChangeLog, settings.illnessEpisodes, settings.weeklyHealthChecks, settings.heartRate, counting]);

  const morningKey = JSON.stringify([notices.morning, resolveOverviews(settings.overviews).morningCheckIn, morningFromHour(settings.overviews), (settings.morningCheckIns ?? []).map((c) => c.date).slice(-3)]);

  useEffect(() => {
    if (!port.timed) return;
    const plan = () => {
      const now = new Date();
      const morning = morningNoticeSchedule({
        now,
        enabled: notices.morning.enabled,
        time: notices.morning.time,
        morningFromHour: morningFromHour(settings.overviews),
        checkInOn: resolveOverviews(settings.overviews).morningCheckIn,
        checkedIn: (settings.morningCheckIns ?? []).map((c) => c.date),
        haptics,
      });
      const week = weekNoticeSchedule({ now, enabled: notices.week, time: notices.weekTime, text: weekText, haptics });
      void syncTimedNotices(port, [...morning, ...(week ? [week] : [])]).catch(() => undefined);
    };
    // Even wachten: een reeks wijzigingen achter elkaar plant maar één keer.
    const timer = window.setTimeout(plan, 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') plan();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // morningKey vat de ochtend samen; de lijsten zelf zouden bij elke render opnieuw plannen.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [port, morningKey, notices.week, notices.weekTime, weekText, haptics]);

  useEffect(() => port.onTap((link) => navigate(link.replace(/^#/, '') || '/')), [port, navigate]);

  return null;
}

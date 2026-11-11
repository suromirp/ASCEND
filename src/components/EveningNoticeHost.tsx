// ASCEND: de melding van De avond ervoor (engine/eveningBefore.ts), alleen in de Android-app en alleen
// als je hem aanzet. Op de tijd van de omslag, met dezelfde regels als de kaart, uitgerekend met wat
// de app nu weet. Elke keer dat er iets verandert of je de app opent wordt hij opnieuw gezet; is er
// niets klaar te leggen, of staat hij uit, dan gaat hij weg. Plant niets en verandert niets.

import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { EVENING_NOTICE_ID, eveningNotice, eveningNoticeAt, resolveEveningBefore } from '../engine/eveningBefore';
import { generalChannel } from '../engine/deviceNotices';
import type { NotificationPort } from '../integrations/notifications';
import { useEveningNoticeView } from './useEveningBefore';

export function EveningNoticeHost({ port }: { port: NotificationPort }) {
  const { settings } = useAppData();
  const evening = resolveEveningBefore(settings);
  const active = port.timed && evening.on && evening.notice;
  // Het moment van vanavond; bij terugkomen in de app opnieuw bekeken.
  const [stamp, setStamp] = useState(() => Date.now());
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setStamp(Date.now());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
  const at = useMemo(() => (active ? eveningNoticeAt(new Date(stamp), evening.time) : undefined), [active, stamp, evening.time]);
  const view = useEveningNoticeView(at);
  const notice = eveningNotice(view, at, generalChannel(settings.haptics !== false));
  const key = notice ? JSON.stringify([notice.at, notice.title, notice.largeBody, notice.channel]) : '';

  useEffect(() => {
    if (!port.timed) return;
    // Even wachten: een reeks wijzigingen achter elkaar plant maar één keer.
    const timer = window.setTimeout(() => {
      const job = notice ? port.schedule([notice]) : port.cancel([EVENING_NOTICE_ID]);
      void job.catch(() => undefined);
    }, 1000);
    return () => window.clearTimeout(timer);
    // key vat de melding samen; het object zelf is elke render nieuw.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [port, key]);

  return null;
}

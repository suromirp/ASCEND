import { useEffect } from 'react';
import { REST_NOTICE_ID, restNotice, restNoticePreemptDelay, restNoticeStep } from '../../engine/deviceNotices';
import type { RestAlert } from '../../engine/strengthSettings';
import { notificationPort } from '../../integrations/notifications';

// Het einde van de rust als melding op de echte eindtijd (engine/deviceNotices.ts), zodat je
// telefoon ook met het scherm uit of met de app op de achtergrond trilt. Start of verandert de
// rust, dan wordt de melding (opnieuw) gepland; stopt hij, of sluit je Forge, dan wordt hij
// geschrapt. Staat het scherm aan als de rust bijna om is, dan neemt Forge het signaal zelf over en
// verdwijnt de melding, zodat je niet twee keer trilt. In de browser doet de laag niets.
export function useRestNotice(rest: { endsAt: number; name: string } | undefined, enabled: boolean, alert: RestAlert): void {
  const endsAt = rest?.endsAt;
  const name = rest?.name ?? '';
  useEffect(() => {
    const port = notificationPort();
    if (!port.timed) return;
    if (restNoticeStep({ endsAt, enabled, now: Date.now() }) === 'cancel' || endsAt === undefined) {
      void port.cancel([REST_NOTICE_ID]).catch(() => undefined);
      return;
    }
    const notice = restNotice({ endsAt, name }, alert);
    void port.schedule([notice]).catch(() => undefined);
    const preempt = window.setTimeout(() => {
      if (document.visibilityState === 'visible') void port.cancel([REST_NOTICE_ID]).catch(() => undefined);
    }, restNoticePreemptDelay(endsAt, Date.now()));
    // Gaat het scherm uit vlak na het overnemen, dan komt de melding er weer.
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && endsAt > Date.now()) void port.schedule([notice]).catch(() => undefined);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(preempt);
      document.removeEventListener('visibilitychange', onVisibility);
      void port.cancel([REST_NOTICE_ID]).catch(() => undefined);
    };
  }, [endsAt, name, enabled, alert]);
}

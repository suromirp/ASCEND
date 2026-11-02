import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { backPressDecision, EXIT_WINDOW_MS } from '../engine/backPress';
import { deviceShell } from '../integrations/deviceShell';
import { layerIdOf } from '../utils/backLayers';

// De Android-app: de terugknop van de telefoon (engine/backPress.ts). De knop gaat door dezelfde geschiedenis als in de browser, dus
// een open blad sluit eerst (utils/backLayers.ts); op Vandaag sluit pas een tweede druk binnen
// twee seconden de app. In de browser is er geen terugknop van Capacitor en doet dit niets.
export function DeviceShellHost() {
  const shell = deviceShell();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const where = useRef(pathname);
  const lastPress = useRef<number | undefined>(undefined);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    where.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!shell.onBackButton) return;
    return shell.onBackButton((canGoBack) => {
      const now = Date.now();
      const decision = backPressDecision({ layerOpen: layerIdOf(window.history.state) !== 0, atHome: where.current === '/', canGoBack, lastPressAt: lastPress.current, now });
      if (decision === 'back') window.history.back();
      else if (decision === 'home') navigate('/');
      else if (decision === 'exit') shell.exitApp?.();
      else {
        lastPress.current = now;
        setHint(true);
      }
    });
  }, [shell, navigate]);

  useEffect(() => {
    if (!hint) return;
    const timer = window.setTimeout(() => setHint(false), EXIT_WINDOW_MS);
    return () => window.clearTimeout(timer);
  }, [hint]);

  if (!hint) return null;
  return (
    // Bovenaan, zodat hij nooit onder of over een melding onderaan valt (ChangeNotice, nieuwe versie).
    <div className="animate-fade-in pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4" style={{ top: 'calc(env(safe-area-inset-top) + 0.75rem)' }}>
      <p role="status" className="rounded-xl border px-4 py-3 text-sm shadow-lg" style={{ background: 'var(--color-raised)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}>
        Druk nog een keer om ASCEND te sluiten.
      </p>
    </div>
  );
}

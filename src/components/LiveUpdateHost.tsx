import { useEffect, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { liveUpdatePort } from '../integrations/liveUpdate';
import { Icon } from './icons';
import { TextLink } from './TextButton';

const DISMISSED_KEY = 'ascend-nieuwe-app-niet-nu';

function dismissed(): string | null {
  try {
    return localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

// De Android-app werkt zijn webdeel zelf bij (integrations/liveUpdate.ts). Zodra de app goed gestart
// is, meldt dit onderdeel dat (anders valt de app bij de volgende start terug op de vorige werkende
// versie) en kijkt het stil of er een nieuwere versie is. Vraagt die een nieuwere app, dan staat er
// één rustige regel met een link naar de download. In de browser doet het niets.
export function LiveUpdateHost({ ready }: { ready: boolean }) {
  const { settings } = useAppData();
  const port = liveUpdatePort();
  const enabled = settings.autoUpdate !== false;
  const [needsApp, setNeedsApp] = useState(false);

  useEffect(() => {
    if (!ready || !port.available) return;
    let alive = true;
    void (async () => {
      await port.ready();
      const result = await port.check(enabled);
      if (alive && result === 'needs-app' && dismissed() !== new Date().toISOString().slice(0, 10)) setNeedsApp(true);
    })();
    return () => {
      alive = false;
    };
  }, [ready, port, enabled]);

  if (!needsApp) return null;
  return (
    <div className="animate-rise-in fixed inset-x-0 z-50 flex justify-center px-4" style={{ bottom: 'calc(4.5rem + max(env(safe-area-inset-bottom), 8px) + 0.75rem)' }}>
      <div role="status" className="flex w-full max-w-md items-center justify-between gap-2 rounded-xl border py-1 pl-4 pr-1 shadow-lg" style={{ background: 'var(--color-raised)', borderColor: 'var(--color-card-border)' }}>
        <p className="min-w-0 text-sm" style={{ color: 'var(--color-ink)' }}>Er staat een nieuwe versie van de app klaar.</p>
        <div className="flex shrink-0 items-center">
          {port.releasesUrl && <TextLink href={port.releasesUrl}>Downloaden</TextLink>}
          <button
            type="button"
            aria-label="Niet nu"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center"
            style={{ color: 'var(--color-ink-dim)' }}
            onClick={() => {
              try {
                localStorage.setItem(DISMISSED_KEY, new Date().toISOString().slice(0, 10));
              } catch {
                // Zonder opslag komt de regel bij de volgende start terug.
              }
              setNeedsApp(false);
            }}
          >
            <Icon name="sluiten" size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

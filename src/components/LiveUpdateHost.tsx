import { useEffect, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { liveUpdatePort } from '../integrations/liveUpdate';
import { Icon } from './icons';
import { TextLink } from './TextButton';

const DISMISSED_KEY = 'ascend-nieuwe-app-niet-nu';
// Zoals ChangeNotice: een paar seconden de regel, dan een ronde knop van 44 px, na tien minuten weg.
const SHOW_MS = 6_000;
const CHIP_MS = 10 * 60_000;

function dismissed(): string | null {
  try {
    return localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

type View = 'full' | 'chip' | 'gone';

// De Android-app werkt zijn webdeel zelf bij (integrations/liveUpdate.ts). Zodra de app goed gestart
// is, meldt dit onderdeel dat (anders valt de app bij de volgende start terug op de vorige werkende
// versie) en kijkt het stil of er een nieuwere versie is. Vraagt die een nieuwere app, dan staat er
// één rustige regel met een link naar de download; hij klapt in zoals ChangeNotice. In de browser
// doet het niets.
export function LiveUpdateHost({ ready }: { ready: boolean }) {
  const { settings } = useAppData();
  const port = liveUpdatePort();
  const enabled = settings.autoUpdate !== false;
  const [view, setView] = useState<View>('gone');

  useEffect(() => {
    if (!ready || !port.available) return;
    let alive = true;
    void (async () => {
      await port.ready();
      const result = await port.check(enabled);
      if (alive && result === 'needs-app' && dismissed() !== new Date().toISOString().slice(0, 10)) setView('full');
    })();
    return () => {
      alive = false;
    };
  }, [ready, port, enabled]);

  useEffect(() => {
    if (view === 'gone') return;
    const t = window.setTimeout(() => setView(view === 'full' ? 'chip' : 'gone'), view === 'full' ? SHOW_MS : CHIP_MS);
    return () => window.clearTimeout(t);
  }, [view]);

  if (view === 'gone') return null;
  const anchor = 'pointer-events-none fixed inset-x-0 z-40 flex px-4';
  const anchorStyle = { bottom: 'calc(4.5rem + var(--rand-onder))' };

  if (view === 'chip') {
    // Links, zodat hij nooit op de ronde knop van ChangeNotice rechts valt.
    return (
      <div className={`${anchor} justify-start`} style={anchorStyle}>
        <button
          type="button"
          onClick={() => setView('full')}
          aria-label="Er staat een nieuwe versie van de app klaar. Open om te downloaden."
          className="animate-fade-in pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border shadow-lg"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-card-border)', color: 'var(--color-action)' }}
        >
          <Icon name="omlaag" size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className={`${anchor} justify-center`} style={anchorStyle}>
      <div role="status" className="mx-notice-in pointer-events-auto flex w-full max-w-md items-center justify-between gap-2 rounded-2xl border py-1 pl-4 pr-1 shadow-lg" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-card-border)' }}>
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
              setView('gone');
            }}
          >
            <Icon name="sluiten" size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

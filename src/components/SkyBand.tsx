import { useId, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AppMark } from './AppMark';
import { SettingsGear } from './SettingsGear';

// De lichte lucht bovenaan elke tab (docs/beslissingen/2026-10-24-thema-zee-en-berg.md).
// Van zacht blauw naar een vleugje mint, met onderin twee rijen bergen: achter
// saliegroen, voor donker groenblauw dat overloopt in het marine van de pagina.
// Bovenin de kop: het merkteken links, het tandwiel rechts. Daaronder wat de
// pagina meegeeft (kopje, titel, de eerste kaart). Alles erop is donker op licht
// (`.on-light` in index.css), dus een Card wordt vanzelf de lichte kaart.
//
// `variant`: `tall` (standaard) draagt kop, titel en de eerste kaart; `low` is de
// lagere band van Week, met alleen kop en titel. `actions` staat direct links van
// het tandwiel: pictogrammen zonder cirkel, elk een tikdoel van 44 bij 44 px, op
// dezelfde hoogte en in dezelfde kleur. Rechts trekt de groep 10 px de
// paginamarge in, zodat het pictogram zelf op de rand van de kaarten eindigt en
// niet het lege deel van het tikdoel. Geen animatie, dus niets voor
// prefers-reduced-motion om uit te zetten.

// Het silhouet: rechte flanken met licht afgeronde toppen, op een vlak van 390
// bij 64; het rekt mee met de breedte.
const BACK_RIDGE =
  'M0 40 L29.2 31.4 Q34 30 38.9 31.0 L57.1 35.0 Q62 36 66.4 33.7 L95.6 18.3 Q100 16 104.5 18.1 L121.5 25.9 Q126 28 130.8 26.6 L141.2 23.4 Q146 22 150.6 23.9 L179.4 36.1 Q184 38 188.7 36.3 L217.3 25.7 Q222 24 226.9 25.1 L243.1 28.9 Q248 30 252.4 27.7 L277.6 14.3 Q282 12 286.5 14.1 L303.5 21.9 Q308 24 312.9 22.9 L321.1 21.1 Q326 20 330.7 21.8 L353.3 30.2 Q358 32 362.9 30.8 L390 24 L390 64 L0 64 Z';
const FRONT_RIDGE =
  'M0 52 L38.1 42.9 Q42 42 45.9 42.7 L62.1 45.3 Q66 46 69.8 44.8 L106.2 33.2 Q110 32 113.8 33.4 L128.2 38.6 Q132 40 135.9 39.3 L152.1 36.7 Q156 36 159.7 37.4 L188.3 48.6 Q192 50 195.9 48.9 L224.1 41.1 Q228 40 231.9 40.7 L248.1 43.3 Q252 44 255.8 42.6 L292.2 29.4 Q296 28 299.7 29.5 L316.3 36.5 Q320 38 323.9 37.3 L338.1 34.7 Q342 34 345.7 35.4 L370.3 44.6 Q374 46 377.9 45.0 L390 42 L390 64 L0 64 Z';

export function SkyBand({
  children,
  variant = 'tall',
  actions,
  gear = true,
}: {
  children?: ReactNode;
  variant?: 'tall' | 'low';
  actions?: ReactNode;
  // Het tandwiel is er op elke tab; op Instellingen zelf en de groepen ervan niet.
  gear?: boolean;
}) {
  const { pathname } = useLocation();
  const gradientId = useId();
  return (
    <div className="sky-band on-light" data-variant={variant}>
      <div className="flex min-h-[44px] items-center justify-between gap-2">
        <AppMark />
        <div className="-mr-2.5 flex items-center">
          {actions}
          {gear && <SettingsGear from={pathname} />}
        </div>
      </div>
      {children}
      <svg className="sky-ridge" viewBox="0 0 390 64" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0.35" style={{ stopColor: 'var(--color-mountain-front)' }} />
            <stop offset="1" style={{ stopColor: 'var(--color-bg)' }} />
          </linearGradient>
        </defs>
        <path d={BACK_RIDGE} style={{ fill: 'var(--color-mountain-back)' }} />
        <path d={FRONT_RIDGE} fill={`url(#${gradientId})`} />
      </svg>
    </div>
  );
}

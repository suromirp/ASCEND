// ASCEND: Vandaag, bovenaan als veiligheid: onweer, zware windstoten, hitte of lawinegevaar op de dag
// van een tocht of een lange training buiten, of de dag ervoor (engine/weatherWarnings.ts,
// engine/avalanche.ts). Het droge feit eerst, en de tekst staat er altijd helemaal: niets achter een tik
// of in een ingeklapt deel. Geen knop die iets aan je planning doet; alleen twee vaste verwijzingen.

import type { WeatherWarningsState } from './useWeatherWarnings';
import { mountainUpdatedLabel } from '../engine/mountainWeather';
import { EAWS_SITE } from '../integrations/eaws';
import { todayISO } from '../utils/dates';
import { Card, Eyebrow } from './ui';
import { Icon } from './icons';

const METEOALARM = 'https://meteoalarm.org/';

function Link({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center self-start text-xs underline underline-offset-2" style={{ color: 'var(--color-action)' }}>
      {children}<Icon name="buiten" size={14} className="ml-1 inline align-[-2px]" />
    </a>
  );
}

export function WeatherWarningCard({ state }: { state: WeatherWarningsState }) {
  if (!state.shown) return null;
  const { lines, avalanche, fetchedAt } = state;
  return (
    <Card className="flex flex-col gap-2" role="status">
      <Eyebrow tone="var(--color-warning)">Let op</Eyebrow>
      {lines.map((line) => (
        <p key={line} className="text-base leading-relaxed tabular-nums" style={{ color: 'var(--color-ink)' }}>{line}</p>
      ))}
      {avalanche && <p className="text-base leading-relaxed tabular-nums" style={{ color: 'var(--color-ink)' }}>{avalanche}</p>}
      {lines.length > 0 && (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
          Uit het weermodel van Open-Meteo{fetchedAt ? `, ${mountainUpdatedLabel(fetchedAt, todayISO())}` : ''}. Geen officiële waarschuwing; kijk ook bij de weerdienst.
        </p>
      )}
      {avalanche && (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>Uit het bulletin van de Europese lawinediensten. Lees het hele bulletin voor je vertrekt.</p>
      )}
      <div className="flex flex-wrap gap-x-4">
        {lines.length > 0 && <Link href={METEOALARM}>Meteoalarm</Link>}
        {avalanche && <Link href={EAWS_SITE}>Lawinebulletin</Link>}
      </div>
    </Card>
  );
}

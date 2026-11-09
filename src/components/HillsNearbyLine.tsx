// ASCEND: één regel onder het weer bij een heuveltraining of trap- of bergconditie: "Op 1,2 km een
// helling van 60 m", met een link naar de kaart op openstreetmap.org (buiten de app). Voor een andere
// training en zonder plek (op een dag zonder sportschool met Heuvels in de buurt ook bij een loop), zonder netwerk of zonder antwoord staat er niets. De eerste keer vraagt
// een korte kaart of ASCEND mag zoeken, met wat er naar OpenStreetMap gaat. De regel verandert de
// planning nooit (engine/nearbyTerrain.ts).

import { useEffect, useState } from 'react';
import type { SessionTemplate } from '../models/training';
import { useAppData } from '../state/AppDataContext';
import { showHillsNearby } from '../engine/overviewSettings';
import { terrainLine, terrainWishOn, type TerrainLine } from '../engine/nearbyTerrain';
import { getNearbyTerrain, grantTerrainConsent, hasTerrainConsent, refreshNearbyTerrain } from '../storage/nearbyTerrain';
import { TextButton } from './TextButton';
import { Icon } from './icons';

export function HillsNearbyLine({ template, date, className = '' }: { template: SessionTemplate; date: string; className?: string }) {
  const { settings, updateSettings } = useAppData();
  const place = settings.homeLocation;
  const lat = place?.lat;
  const lon = place?.lon;
  const wish = terrainWishOn(template, date, settings.leavePeriods);
  const wanted = showHillsNearby(settings.overviews) && lat !== undefined && lon !== undefined && wish !== undefined;
  const [consent, setConsent] = useState<boolean | undefined>();
  const [line, setLine] = useState<TerrainLine | undefined>();

  useEffect(() => {
    if (!wanted) return;
    let alive = true;
    void hasTerrainConsent().then((ok) => {
      if (alive) setConsent(ok);
    });
    return () => {
      alive = false;
    };
  }, [wanted]);

  useEffect(() => {
    if (!wanted || !consent || lat === undefined || lon === undefined) return;
    let alive = true;
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    // Offline blijft een eerder bewaard resultaat van deze plek gewoon bruikbaar.
    const found = offline ? getNearbyTerrain({ name: '', lat, lon }) : refreshNearbyTerrain({ name: '', lat, lon });
    void found.then((t) => {
      if (alive) setLine(terrainLine(template, t, wish));
    });
    return () => {
      alive = false;
    };
  }, [wanted, consent, lat, lon, template, wish]);

  if (!wanted || consent === undefined) return null;

  if (!consent) {
    return (
      <div className={`flex flex-col ${className}`}>
        <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          Zoeken naar een helling of trap in de buurt? Daarvoor gaat je plek, afgerond op ongeveer een kilometer, naar OpenStreetMap. Er gaat geen naam of adres mee.
        </p>
        <div className="flex flex-wrap gap-x-4">
          <TextButton size="xs" onClick={() => { void grantTerrainConsent().then(() => setConsent(true)); }}>Ja, zoek</TextButton>
          <TextButton size="xs" tone="dim" onClick={() => void updateSettings({ overviews: { ...settings.overviews, hillsNearby: false } })}>Liever niet</TextButton>
        </div>
      </div>
    );
  }

  if (!line) return null;
  return (
    <p className={`text-xs leading-snug ${className}`} style={{ color: 'var(--color-ink-dim)' }}>
      {line.text}{' '}
      <a href={line.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center underline underline-offset-2" style={{ color: 'var(--color-ink-dim)' }}>
        {line.linkLabel}<Icon name="buiten" size={14} className="ml-1 inline align-[-2px]" />
      </a>
    </p>
  );
}

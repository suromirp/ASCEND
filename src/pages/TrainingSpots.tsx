// ASCEND — Trainingsplekken: where to train climbing and descending in the
// Netherlands (data/trainingSpots.ts), sorted by distance from your home
// (engine/trainingSpots.ts), with how to get there: on foot, by bike (the
// ride counts as training) or by car/train.

import { formatNumberNL } from '../utils/number';
import { useState } from 'react';
import { BackButton } from '../components/BackButton';
import { useAppData } from '../state/AppDataContext';
import { FLAT_COUNTRY_TIPS, HOME_PLACES, TRAINING_SPOTS, type SpotUse, type TrainingSpot } from '../data/trainingSpots';
import { spotsByDistance, travelAdvice, type HomeLocation } from '../engine/trainingSpots';
import { Card, Eyebrow } from '../components/ui';

const USE_FILTERS: { use?: SpotUse; label: string }[] = [
  { label: 'Alles' },
  { use: 'bergaf', label: 'Bergaf' },
  { use: 'bergop', label: 'Bergop' },
  { use: 'trap', label: 'Trap' },
  { use: 'rugzak', label: 'Met rugzak' },
  { use: 'lange tocht', label: 'Lange tocht' },
];

const USE_LABEL: Record<SpotUse, string> = {
  bergop: 'bergop', bergaf: 'bergaf', trap: 'trap', rugzak: 'rugzak', heuvelintervallen: 'heuvelintervallen', 'lange tocht': 'lange tocht',
};

export function TrainingSpotsPage() {
  const { settings, updateSettings } = useAppData();
  const [use, setUse] = useState<SpotUse | undefined>(undefined);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const home = settings.homeLocation;
  const spots = spotsByDistance(TRAINING_SPOTS, home, use);

  function setHome(next: HomeLocation) {
    void updateSettings({ homeLocation: next });
  }

  function useMyLocation() {
    if (!('geolocation' in navigator)) {
      setLocError('Je browser kan je locatie niet bepalen. Kies een plaats.');
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        // Rounded to ~1 km: enough for distances, nothing more is kept.
        setHome({ name: 'Mijn locatie', lat: Math.round(pos.coords.latitude * 100) / 100, lon: Math.round(pos.coords.longitude * 100) / 100 });
      },
      () => {
        setLocating(false);
        setLocError('Locatie niet beschikbaar. Kies een plaats uit de lijst.');
      },
      { timeout: 10000, maximumAge: 600000 },
    );
  }

  return (
    <div className="animate-page-in flex flex-col gap-4 px-4 pb-10 pt-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <p className="font-display text-lg" style={{ color: 'var(--color-bronze)' }}>TRAININGSPLEKKEN</p>
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Waar je in Nederland hoogtemeters maakt, bergop en bergaf</p>
        </div>
      </div>

      <Card className="flex flex-col gap-2">
        <Eyebrow>VANAF</Eyebrow>
        <div className="flex items-center gap-2">
          <select
            value={home && home.name !== 'Mijn locatie' ? home.name : ''}
            onChange={(e) => { const place = HOME_PLACES.find((p) => p.name === e.target.value); if (place) setHome(place); }}
            className="flex-1 rounded-xl border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)', color: 'var(--color-ink)' }}
            aria-label="Woonplaats"
          >
            <option value="">{home?.name === 'Mijn locatie' ? 'Mijn locatie' : 'Kies je woonplaats'}</option>
            {HOME_PLACES.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
          <button
            onClick={useMyLocation}
            disabled={locating}
            className="shrink-0 rounded-xl border px-3 py-2 text-xs disabled:opacity-40"
            style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
          >
            {locating ? 'Zoeken…' : 'Mijn locatie'}
          </button>
        </div>
        <p className="text-[11px] leading-snug" style={{ color: locError ? 'var(--color-warning)' : 'var(--color-ink-dim)' }}>
          {locError ?? 'Je locatie blijft alleen op dit toestel. Afstanden zijn schattingen.'}
        </p>
      </Card>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {USE_FILTERS.map((f) => {
          const active = use === f.use;
          return (
            <button
              key={f.label}
              onClick={() => setUse(f.use)}
              className="shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs"
              style={{ borderColor: active ? 'var(--color-gold)' : 'var(--color-card-border)', color: active ? 'var(--color-gold)' : 'var(--color-ink-dim)' }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        {spots.map((s) => <SpotCard key={s.id} spot={s} home={home} />)}
      </div>

      <Card className="flex flex-col gap-2">
        <Eyebrow>GEEN HEUVEL IN DE BUURT?</Eyebrow>
        {FLAT_COUNTRY_TIPS.map((t) => (
          <p key={t} className="flex gap-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
            <span style={{ color: 'var(--color-gold)' }}>·</span>
            <span>{t}</span>
          </p>
        ))}
      </Card>
    </div>
  );
}

// A small elevation glyph: the height of one climb against a 120 m scale.
function ClimbGlyph({ climbM }: { climbM?: number }) {
  const h = climbM ? Math.max(0.18, Math.min(1, climbM / 120)) : 0.25;
  const top = 34 - 30 * h;
  return (
    <svg viewBox="0 0 64 36" width="64" height="36" aria-hidden>
      <path d={`M0 34 L22 ${top + 4} L30 ${top} L40 ${top + 6} L64 34 Z`} fill="var(--color-bronze-dark)" opacity="0.55" />
      <path d={`M0 34 L22 ${top + 4} L30 ${top} L40 ${top + 6} L64 34`} fill="none" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function SpotCard({ spot, home }: { spot: TrainingSpot; home?: HomeLocation }) {
  const [open, setOpen] = useState(false);
  const travel = home ? travelAdvice(home, spot) : undefined;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lon}`;
  return (
    <Card className="flex flex-col gap-2" texture={spot.uses.includes('bergaf')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium tracking-[0.16em]" style={{ color: 'var(--color-bronze)' }}>
            {spot.kind.toUpperCase()} · {spot.place.toUpperCase()}
          </p>
          <p className="mt-0.5 font-display text-lg leading-tight" style={{ color: 'var(--color-ink)' }}>{spot.name}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <ClimbGlyph climbM={spot.climbM} />
          <span className="text-[10px] tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
            {spot.climbM ? `±${spot.climbM} m per klim` : spot.topM ? `top ${spot.topM} m` : ''}
          </span>
        </div>
      </div>

      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{spot.example}</p>

      <div className="flex flex-wrap gap-1.5">
        {spot.uses.map((u) => (
          <span key={u} className="rounded-full px-2.5 py-0.5 text-[11px]" style={{ background: 'var(--color-charcoal)', color: u === 'bergaf' ? 'var(--color-gold)' : 'var(--color-ink-dim)' }}>{USE_LABEL[u]}</span>
        ))}
      </div>

      {travel && (
        <p className="text-xs leading-snug" style={{ color: 'var(--color-sky)' }}>{travel.text}</p>
      )}

      <button onClick={() => setOpen((v) => !v)} className="self-start text-xs underline" style={{ color: 'var(--color-ink-dim)' }} aria-expanded={open}>
        {open ? 'minder' : 'tip, toegang en bronnen'}
      </button>
      {open && (
        <div className="flex flex-col gap-1.5 border-t pt-2 text-xs leading-relaxed" style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink-dim)' }}>
          <p><span style={{ color: 'var(--color-ink)' }}>Tip:</span> {spot.tip}</p>
          <p><span style={{ color: 'var(--color-ink)' }}>Ondergrond:</span> {spot.terrain}</p>
          <p><span style={{ color: 'var(--color-ink)' }}>Toegang:</span> {spot.access}</p>
          {spot.station && <p><span style={{ color: 'var(--color-ink)' }}>Station:</span> {spot.station.name}, ±{formatNumberNL(spot.station.km, 1)} km hemelsbreed</p>}
          {spot.caveat && <p style={{ color: 'var(--color-warning)' }}>Let op: {spot.caveat}</p>}
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {spot.sources.map((src) => (
              <a key={src.url} href={src.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: 'var(--color-sky)' }}>{src.label} ↗</a>
            ))}
          </div>
        </div>
      )}

      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="self-start text-xs font-medium underline underline-offset-2" style={{ color: 'var(--color-gold)' }}>
        Route ernaartoe ↗
      </a>
    </Card>
  );
}

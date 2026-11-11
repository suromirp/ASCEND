// ASCEND: de kaart bij Route voorstellen. Alle voorgestelde lussen (de gekozen doorgetrokken in mint,
// de andere licht gestreept op een donkere rand), het startpunt als ring en je plek als ijsblauwe stip.
// Tik op een lus kiest hem; tik op de kaart zet een ring neer en Start hier maakt dat punt je vaste
// punt en zoekt opnieuw. Rendert alleen: de regie staat in routeMapView.ts, de stijlen en vormen in
// engine/routeMap.ts, het bewaren van het punt in storage/routeStart.ts#startFromMap.
// Docs: docs/beslissingen/2026-11-11-route-kaart.md.

import { useEffect, useRef, useState } from 'react';
import type { RoutePoint, RouteStyle } from '../models/route';
import { readMapColors, type MapBase, type MapRoute } from '../engine/routeMap';
import { hasWebGL2, loadMapLibre } from '../integrations/mapLibre';
import { OSM_COPYRIGHT } from '../integrations/overpass';
import { withTimeout } from '../utils/withTimeout';
import { createRouteMapView, whereAmI, type MapViewState, type RouteMapView } from './routeMapView';
import { useMotionMode } from './motion';
import { TextButton } from './TextButton';
import { Icon } from './icons';

type StartAnswer = { ok: true; point: RoutePoint } | { ok: false; line: string };

// Weet de browser al dat je plek mag, dan staat je stip er meteen. Anders pas na een tik.
async function placeAllowed(): Promise<boolean> {
  try {
    const status = await withTimeout(navigator.permissions.query({ name: 'geolocation' }), 1_000);
    return status.state === 'granted';
  } catch {
    return false;
  }
}

// Een ronde knop op de kaart (uitzondering op de primitives, zie het besluit): 44 bij 44, woord als label.
function MapButton({ icon, label, onClick, disabled }: { icon: 'locatie' | 'inbeeld'; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-full border disabled:opacity-60"
      style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
    >
      <Icon name={icon} size={20} />
    </button>
  );
}

export function RouteMap({ routes, chosen, start, base, onChoose, onStart, offerHere = true }: {
  routes: MapRoute[];
  chosen: RouteStyle | undefined;
  // Waar de lus begint (of waar het paneel zoekt, zolang er nog geen lus is).
  start: RoutePoint;
  base: MapBase;
  onChoose: (style: RouteStyle) => void;
  // Start hier (een getikt punt) of Gebruik waar ik nu ben ('here'); heeft zelf een grens in tijd.
  onStart: (from: { tap: RoutePoint } | 'here') => Promise<StartAnswer>;
  // Gebruik waar ik nu ben als vast punt; niet bij Waar je nu bent, daar is de lus al vanaf je plek.
  offerHere?: boolean;
}) {
  const motion = useMotionMode();
  const box = useRef<HTMLDivElement>(null);
  const view = useRef<RouteMapView | undefined>(undefined);
  const [state, setState] = useState<MapViewState>({ kind: 'loading' });
  const [pick, setPick] = useState<RoutePoint | undefined>();
  const [me, setMe] = useState<RoutePoint | undefined>();
  const [busy, setBusy] = useState<'me' | 'here' | 'tap' | undefined>();
  const [line, setLine] = useState('');
  const alive = useRef(true);
  // Wat de kaart nodig heeft, ook binnen de callbacks van de kaart zelf.
  const latest = useRef({ routes, chosen, dots: { start, me, pick }, motion, onChoose });
  useEffect(() => {
    latest.current = { routes, chosen, dots: { start, me, pick }, motion, onChoose };
  });

  useEffect(() => {
    alive.current = true;
    const el = box.current;
    if (!el) return;
    const v = createRouteMapView(el, base, latest.current, {
      onState: (s) => setState(s),
      onRouteTap: (style) => {
        setPick(undefined);
        latest.current.onChoose(style);
      },
      onMapTap: (point) => {
        setPick(point);
        setLine('');
      },
    }, {
      load: loadMapLibre,
      colors: () => readMapColors((token) => getComputedStyle(document.documentElement).getPropertyValue(token)),
      online: () => typeof navigator === 'undefined' || navigator.onLine !== false,
      webgl: hasWebGL2,
      motion: () => latest.current.motion,
    });
    view.current = v;
    return () => {
      alive.current = false;
      view.current = undefined;
      v.destroy();
    };
  }, [base]);

  useEffect(() => {
    view.current?.update({ routes, chosen, dots: { start, me, pick } });
  }, [routes, chosen, start, me, pick]);

  // Nieuwe lussen of een nieuw startpunt: alles in beeld, één keer.
  const fitKey = `${routes.map((r) => `${r.style}:${r.points.length}`).join(',')}|${start.lat}|${start.lon}`;
  const ready = state.kind === 'ready';
  useEffect(() => {
    if (ready) view.current?.fitAll();
  }, [fitKey, ready]);

  // Je stip: een grove plek is genoeg, zonder de vraag om je precieze plek.
  useEffect(() => {
    let on = true;
    void placeAllowed().then(async (ok) => {
      if (!ok || !on) return;
      const found = await whereAmI();
      if (on && found.ok) setMe(found.point);
    });
    return () => {
      on = false;
    };
  }, []);

  async function goToMe() {
    setBusy('me');
    setLine('');
    const found = await whereAmI();
    if (!alive.current) return;
    setBusy(undefined);
    if (!found.ok) {
      setLine(found.line);
      return;
    }
    setMe(found.point);
    view.current?.goTo(found.point);
  }

  // Een startpunt telt alleen met een precieze plek (dezelfde grens als in de instelling).
  async function startAt(from: { tap: RoutePoint } | 'here') {
    setBusy(from === 'here' ? 'here' : 'tap');
    setLine('');
    const found = await onStart(from);
    if (!alive.current) return;
    setBusy(undefined);
    if (!found.ok) {
      setLine(found.line);
      return;
    }
    setPick(undefined);
    if (from === 'here') setMe(found.point);
  }

  const dim = { color: 'var(--color-ink-dim)' };
  if (state.kind === 'unsupported' || state.kind === 'failed') {
    const first = state.kind === 'unsupported' ? 'Deze telefoon kan de kaart niet tekenen.' : 'De kaart kon niet laden.';
    return <p role="status" className="text-sm leading-snug" style={dim}>{routes.length > 0 ? `${first} De lussen staan hieronder.` : first}</p>;
  }

  const status = busy === 'here' ? 'Je locatie wordt bepaald. Dat duurt hoogstens 15 seconden.' : busy === 'me' ? 'Je locatie wordt bepaald.' : line;

  return (
    <div className="flex flex-col gap-1">
      {/* Slepen en knijpen horen bij de kaart: niet bij het blad en niet bij de pagina. Ongeveer vierkant,
          maar nooit zo hoog dat de knoppen eronder op een kleine telefoon uit beeld vallen. */}
      <div data-no-sheet-drag="" className="relative w-full overflow-hidden rounded-xl border" style={{ aspectRatio: '1 / 1', maxHeight: '58vh', borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)', touchAction: 'none', overscrollBehavior: 'contain' }}>
        {/* MapLibre zet zelf position: relative op dit vak; daarom de volle maat, niet absolute. */}
        <div ref={box} style={{ width: '100%', height: '100%' }} />
        {state.kind === 'loading' && <p role="status" className="absolute bottom-1 left-2 text-xs" style={dim}>De kaart wordt geladen.</p>}
        <div className="absolute right-2 top-2 flex flex-col gap-2">
          <MapButton icon="locatie" label="Naar mijn plek" disabled={busy !== undefined} onClick={() => void goToMe()} />
          <MapButton icon="inbeeld" label="Alles in beeld" onClick={() => view.current?.fitAll()} />
        </div>
        {state.kind === 'ready' && state.attribution && (
          <a href={OSM_COPYRIGHT} target="_blank" rel="noopener noreferrer" className="absolute bottom-0 right-0 inline-flex items-end">
            <span className="rounded-tl-md bg-bg/80 px-1.5 text-xs leading-5 underline-offset-2 hover:underline" style={dim}>{state.attribution}</span>
          </a>
        )}
      </div>
      <p className="text-xs leading-snug" style={dim}>
        De ring is de start. Tik op de kaart voor een ander startpunt; Start hier bewaart dat punt als je vaste punt en zet Startpunt van je lus op Vast punt.
      </p>
      <div className="flex flex-wrap gap-x-5">
        {pick && <TextButton tone="dim" disabled={busy !== undefined} onClick={() => void startAt({ tap: pick })}>Start hier</TextButton>}
        {offerHere && <TextButton tone="dim" disabled={busy !== undefined} onClick={() => void startAt('here')}>Gebruik waar ik nu ben</TextButton>}
      </div>
      {status && <p role="status" className="text-xs leading-snug" style={dim}>{status}</p>}
    </div>
  );
}

// ASCEND: de kaart bij Route voorstellen. Alle voorgestelde lussen (de gekozen in mint, de andere
// gedempt en gestreept), het startpunt als ring en je plek als ijsblauwe stip. Tik op een lus kiest
// hem; tik op de kaart zet een ring neer en Start hier zoekt opnieuw vanaf dat punt. Rendert alleen:
// de regie staat in routeMapView.ts, de stijlen en vormen in engine/routeMap.ts.
// Docs: docs/beslissingen/2026-11-11-route-kaart.md.

import { useEffect, useRef, useState } from 'react';
import type { RoutePoint, RouteStyle } from '../models/route';
import { readMapColors, type MapBase, type MapRoute } from '../engine/routeMap';
import { hasWebGL2, loadMapLibre } from '../integrations/mapLibre';
import { withTimeout } from '../utils/withTimeout';
import { createRouteMapView, whereAmI, type MapViewState, type RouteMapView } from './routeMapView';
import { useMotionMode } from './motion';
import { TextButton } from './TextButton';
import { Icon } from './icons';

const MAP_HEIGHT = 280;

// Weet de browser al dat je plek mag, dan staat je stip er meteen. Anders pas na een tik.
async function placeAllowed(): Promise<boolean> {
  try {
    const status = await withTimeout(navigator.permissions.query({ name: 'geolocation' }), 1_000);
    return status.state === 'granted';
  } catch {
    return false;
  }
}

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

export function RouteMap({ routes, chosen, start, base, onChoose, onPickStart }: {
  routes: MapRoute[];
  chosen: RouteStyle | undefined;
  // Waar de lus begint (of waar het paneel zoekt, zolang er nog geen lus is).
  start: RoutePoint;
  base: MapBase;
  onChoose: (style: RouteStyle) => void;
  onPickStart: (point: RoutePoint) => void;
}) {
  const motion = useMotionMode();
  const box = useRef<HTMLDivElement>(null);
  const view = useRef<RouteMapView | undefined>(undefined);
  const [state, setState] = useState<MapViewState>({ kind: 'loading' });
  const [pick, setPick] = useState<RoutePoint | undefined>();
  const [me, setMe] = useState<RoutePoint | undefined>();
  const [locating, setLocating] = useState<'me' | 'start' | undefined>();
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

  async function locate(then: 'me' | 'start') {
    setLocating(then);
    setLine(then === 'start' ? 'Je locatie wordt bepaald. Dat duurt hoogstens 15 seconden.' : '');
    const found = await whereAmI();
    if (!alive.current) return;
    setLocating(undefined);
    if (!found.ok) {
      setLine(found.line);
      return;
    }
    setMe(found.point);
    setLine('');
    if (then === 'me') view.current?.goTo(found.point);
    else {
      setPick(undefined);
      onPickStart(found.point);
    }
  }

  const dim = { color: 'var(--color-ink-dim)' };
  if (state.kind === 'unsupported' || state.kind === 'failed') {
    return (
      <p role="status" className="text-sm leading-snug" style={dim}>
        {state.kind === 'unsupported' ? 'Deze telefoon kan de kaart niet tekenen. De lussen staan hieronder.' : 'De kaart kon niet laden. De lussen staan hieronder.'}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Slepen en knijpen horen bij de kaart: niet bij het blad en niet bij de pagina. */}
      <div data-no-sheet-drag="" className="relative w-full overflow-hidden rounded-xl border" style={{ height: MAP_HEIGHT, borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)', touchAction: 'none', overscrollBehavior: 'contain' }}>
        {/* MapLibre zet zelf position: relative op dit vak; daarom de volle maat, niet absolute. */}
        <div ref={box} style={{ width: '100%', height: '100%' }} />
        {state.kind === 'loading' && <p role="status" className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm" style={dim}>De kaart wordt geladen.</p>}
        <div className="absolute right-2 top-2 flex flex-col gap-2">
          <MapButton icon="locatie" label="Naar mijn plek" disabled={locating !== undefined} onClick={() => void locate('me')} />
          <MapButton icon="inbeeld" label="Alles in beeld" onClick={() => view.current?.fitAll()} />
        </div>
        {state.kind === 'ready' && state.attribution && (
          <p className="absolute bottom-0 right-0 rounded-tl-md bg-bg/80 px-1.5 text-xs leading-5" style={dim}>{state.attribution}</p>
        )}
      </div>
      <p className="text-xs leading-snug" style={dim}>
        {routes.length > 1 ? 'Mint is de gekozen lus; tik een gestreepte lus om hem te kiezen. ' : ''}De ring is de start. Tik op de kaart voor een ander startpunt.
      </p>
      <div className="flex flex-wrap gap-x-5">
        {pick && <TextButton disabled={locating !== undefined} onClick={() => { setPick(undefined); onPickStart(pick); }}>Start hier</TextButton>}
        <TextButton tone="dim" disabled={locating !== undefined} onClick={() => void locate('start')}>Gebruik waar ik nu ben</TextButton>
      </div>
      <p role="status" className="min-h-[20px] text-xs leading-snug" style={dim}>{locating === 'me' ? 'Je locatie wordt bepaald.' : line}</p>
    </div>
  );
}

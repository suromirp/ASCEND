// ASCEND: de kaart bij Route voorstellen. Alle voorgestelde lussen (de gekozen doorgetrokken in mint,
// de andere licht gestreept op een donkere rand), het startpunt als ring en je plek als ijsblauwe stip.
// Tik op een lus kiest hem; tik op de kaart zet een ring neer en Start hier maakt dat punt je vaste
// punt en zoekt opnieuw. Rechtsboven wissel je tussen Kaart en Luchtfoto (de keuze wordt onthouden in de
// instelling Kaart of luchtfoto); laadt de luchtfoto niet, dan staat de kaart er met één regel. De uitleg daarover staat achter de i van het blad. Rendert alleen: de regie staat in routeMapView.ts, de stijlen en vormen in
// engine/routeMap.ts, het bewaren van het punt in storage/routeStart.ts#startFromMap.
// Docs: docs/beslissingen/2026-11-11-route-kaart.md.

import { useEffect, useRef, useState } from 'react';
import type { RoutePoint, RouteStyle } from '../models/route';
import { photoFallbackLine, photoOffered, readMapColors, type MapBase, type MapPhoto, type MapRoute } from '../engine/routeMap';
import { ROUTE_MAP_HEIGHT, mapFallbackLine } from '../engine/routeSheet';
import { hasWebGL2, loadMapLibre } from '../integrations/mapLibre';
import { AERIAL_SOURCES } from '../integrations/aerialImagery';
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

// Kaart of Luchtfoto, op de kaart zelf (zelfde uitzondering als de ronde knoppen): twee woorden in één
// strook van 44 px hoog. De gekozen kant is lichter en vet, zonder mint: dat blijft van de lus.
function PhotoSwitch({ value, onPick }: { value: MapPhoto; onPick: (v: MapPhoto) => void }) {
  const options: { v: MapPhoto; label: string }[] = [{ v: 'map', label: 'Kaart' }, { v: 'photo', label: 'Luchtfoto' }];
  return (
    <div role="group" aria-label="Kaart of luchtfoto" className="flex h-11 overflow-hidden rounded-full border" style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}>
      {options.map((o) => {
        const on = o.v === value;
        return (
          <button
            key={o.v}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(o.v)}
            className={`min-w-[44px] px-3 text-sm ${on ? 'font-semibold' : ''}`}
            style={on ? { background: 'var(--color-raised)', color: 'var(--color-ink)' } : { color: 'var(--color-ink-dim)' }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function RouteMap({ routes, chosen, start, base, onChoose, onStart, offerHere = true, onNoMap, height, photo = 'map', onPhoto }: {
  routes: MapRoute[];
  chosen: RouteStyle | undefined;
  // Waar de lus begint (of waar het paneel zoekt, zolang er nog geen lus is).
  start: RoutePoint;
  base: MapBase;
  onChoose: (style: RouteStyle) => void;
  // Start hier (een getikt punt) of Zet mijn plek als start ('here'); heeft zelf een grens in tijd.
  onStart: (from: { tap: RoutePoint } | 'here') => Promise<StartAnswer>;
  // Zet mijn plek als start (als vast punt); niet bij Waar je nu bent, daar is de lus al vanaf je plek.
  offerHere?: boolean;
  // De kaart kan niet tekenen of laden: dan staan de lussen alleen als tekst en zeggen de rijen niet hoe ze op de kaart staan.
  onNoMap?: () => void;
  // De lagere stand in de Briefing (engine/routeSheet.ts#BRIEFING_MAP_HEIGHT); anders die van het blad.
  height?: string;
  // Kaart of Luchtfoto, uit de instelling; onPhoto bewaart een tik op de schakelaar.
  photo?: MapPhoto;
  onPhoto?: (v: MapPhoto) => void;
}) {
  const motion = useMotionMode();
  const box = useRef<HTMLDivElement>(null);
  const view = useRef<RouteMapView | undefined>(undefined);
  const [state, setState] = useState<MapViewState>({ kind: 'loading' });
  const [pick, setPick] = useState<RoutePoint | undefined>();
  const [me, setMe] = useState<RoutePoint | undefined>();
  const [busy, setBusy] = useState<'me' | 'here' | 'tap' | undefined>();
  const [line, setLine] = useState('');
  const [fullCredit, setFullCredit] = useState(false);
  const alive = useRef(true);
  // Wat de kaart nodig heeft, ook binnen de callbacks van de kaart zelf.
  const latest = useRef({ routes, chosen, dots: { start, me, pick }, motion, onChoose, photo });
  useEffect(() => {
    latest.current = { routes, chosen, dots: { start, me, pick }, motion, onChoose, photo };
  });
  // De keuze geldt meteen op het scherm; het bewaren (onPhoto) volgt, en lukt dat niet, dan wisselt hij toch.
  const [picked, setPicked] = useState<MapPhoto>(photo);
  const [fromSetting, setFromSetting] = useState<MapPhoto>(photo);
  if (fromSetting !== photo) {
    setFromSetting(photo);
    setPicked(photo);
  }
  const showPhoto = photoOffered(base) && picked === 'photo';
  const photoShown = useRef(showPhoto);

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
    }, photoShown.current);
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

  // Een tik op de schakelaar (of de instelling): dezelfde kaart, een andere ondergrond.
  useEffect(() => {
    if (photoShown.current === showPhoto) return;
    photoShown.current = showPhoto;
    view.current?.setPhoto(showPhoto);
  }, [showPhoto]);

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

  const noMap = state.kind === 'unsupported' || state.kind === 'failed';
  const onNoMapRef = useRef(onNoMap);
  useEffect(() => {
    onNoMapRef.current = onNoMap;
  });
  useEffect(() => {
    if (noMap) onNoMapRef.current?.();
  }, [noMap]);

  const dim = { color: 'var(--color-ink-dim)' };
  if (state.kind === 'unsupported' || state.kind === 'failed') {
    return <p role="status" className="text-sm leading-snug" style={dim}>{mapFallbackLine(state.kind, routes.length > 0)}</p>;
  }

  const photoFailed = state.kind === 'ready' && state.photoFailed === true;
  const online = typeof navigator === 'undefined' || navigator.onLine !== false;
  const status = busy === 'here' ? 'Je locatie wordt bepaald. Dat duurt hoogstens 15 seconden.' : busy === 'me' ? 'Je locatie wordt bepaald.' : line || photoFallbackLine(photoFailed, online);
  // Wat je ziet: viel de luchtfoto weg, dan staat de schakelaar op Kaart; de instelling blijft Luchtfoto,
  // en een tik op Luchtfoto probeert het opnieuw.
  const switchValue: MapPhoto = showPhoto && !photoFailed ? 'photo' : 'map';
  const pickPhoto = (v: MapPhoto) => {
    if (v === picked) {
      // Luchtfoto na een fout: opnieuw proberen, zonder de oude regel en met de schakelaar op Luchtfoto.
      if (v === 'photo') {
        setState((s) => (s.kind === 'ready' ? { kind: s.kind, stage: s.stage, attribution: s.attribution, ...(s.aerial ? { aerial: s.aerial } : {}) } : s));
        view.current?.setPhoto(true);
      }
      return;
    }
    // Ook Kaart terwijl de schakelaar na een fout al op Kaart stond: dan wordt Kaart de bewaarde keuze.
    setPicked(v);
    onPhoto?.(v);
  };

  return (
    <div className="flex flex-col gap-1">
      {/* Slepen en knijpen horen bij de kaart: niet bij het blad en niet bij de pagina. Een vaste hoogte
          (engine/routeSheet.ts), zodat de gekozen lus en de hoofdknop eronder op 360 px nog in beeld staan. */}
      <div data-no-sheet-drag="" className="relative w-full overflow-hidden rounded-xl border" style={{ height: ROUTE_MAP_HEIGHT, ...(height ? { height } : {}), borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)', touchAction: 'none', overscrollBehavior: 'contain' }}>
        {/* MapLibre zet zelf position: relative op dit vak; daarom de volle maat, niet absolute. */}
        <div ref={box} style={{ width: '100%', height: '100%' }} />
        {state.kind === 'loading' && <p role="status" className="absolute bottom-1 left-2 text-xs" style={dim}>De kaart wordt geladen.</p>}
        {photoOffered(base) && onPhoto && (
          <div className="absolute right-[60px] top-2">
            <PhotoSwitch value={switchValue} onPick={pickPhoto} />
          </div>
        )}
        <div className="absolute right-2 top-2 flex flex-col gap-2">
          <MapButton icon="locatie" label="Naar mijn plek" disabled={busy !== undefined} onClick={() => void goToMe()} />
          <MapButton icon="inbeeld" label="Alles in beeld" onClick={() => view.current?.fitAll()} />
        </div>
        {state.kind === 'ready' && state.attribution && (state.aerial && !fullCredit ? (
          // De luchtfoto: eerst de korte vorm (de volle van EOX is drie regels en bedekt de lus); een tik toont
          // de volle naamsvermelding met de link. Zo werkt de vermelding van MapLibre zelf ook.
          <button type="button" aria-label={`Naamsvermelding: ${state.attribution}`} onClick={() => setFullCredit(true)} className="absolute bottom-0 right-0 inline-flex items-end">
            <span className="rounded-tl-md bg-bg/80 px-1.5 text-xs leading-5" style={dim}>© {AERIAL_SOURCES[state.aerial].short}</span>
          </button>
        ) : (
          <a href={state.aerial ? AERIAL_SOURCES[state.aerial].href : OSM_COPYRIGHT} target="_blank" rel="noopener noreferrer" className="absolute bottom-0 right-0 inline-flex max-w-[85%] items-end">
            <span className="rounded-tl-md bg-bg/80 px-1.5 text-right text-xs leading-5 underline-offset-2 hover:underline" style={dim}>{state.attribution}</span>
          </a>
        ))}
      </div>
      {/* De uitleg over de ring en Start hier staat achter de i van het blad (MAP_HINT). */}
      {(pick || offerHere) && (
        <div className="flex flex-wrap gap-x-5">
          {pick && <TextButton tone="dim" disabled={busy !== undefined} onClick={() => void startAt({ tap: pick })}>Start hier</TextButton>}
          {offerHere && <TextButton tone="dim" disabled={busy !== undefined} onClick={() => void startAt('here')}>Zet mijn plek als start</TextButton>}
        </div>
      )}
      {status && <p role="status" className="text-xs leading-snug" style={dim}>{status}</p>}
    </div>
  );
}

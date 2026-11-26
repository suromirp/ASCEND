// ASCEND: het Route-blok van de Briefing met een bewaarde route (I-160, docs/visie/Plek route per training.md).
// De stille kaart met de lus, de getallen, Andere route en Route verwijderen (met bevestigen). Naar Garmin Connect
// is de knop onderaan de Briefing. Geen zoektocht en geen netwerk nodig voor de lus zelf; alleen de kaarttegels
// kunnen ontbreken. Rendert alleen; de route komt uit engine/sessionRoute.ts, bewaren uit storage/sessionRoutes.ts.

import { useState } from 'react';
import type { SessionRoute } from '../models/sessionRoute';
import type { MapBase, MapPhoto } from '../engine/routeMap';
import { BRIEFING_MAP_HEIGHT } from '../engine/routeSheet';
import { footStartLine } from '../engine/routePlanner';
import { ROUTE_STYLE_NAME, SAVED_ROUTE_TEXT, sessionRouteFacts } from '../engine/sessionRoute';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { RouteMap } from './RouteMap';
import { SheetHeader } from './SheetHeader';
import { TextButton } from './TextButton';
import { Card, Eyebrow, SheetGrip } from './ui';


// Een tik op de kaart in de Briefing: alleen de lus, groot; Start hier hoort bij zoeken, niet hier.
const NO_START_HERE = 'Kies Andere route om ergens anders te beginnen.';

export function SavedRouteBlock({ route, title, base, photo, onOther, onRemove }: {
  route: SessionRoute;
  // De naam van de training, voor de kop van de grote kaart.
  title: string;
  base: MapBase;
  photo: MapPhoto;
  onOther: () => void;
  onRemove: () => Promise<boolean>;
}) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [big, setBig] = useState(false);
  const mapRoutes = [{ style: route.style, points: route.points }];

  async function remove() {
    setBusy(true);
    setFailed(false);
    const ok = await onRemove();
    setBusy(false);
    if (!ok) {
      setFailed(true);
      setAsking(false);
    }
  }

  return (
    <div className="flex flex-col gap-2" data-saved-route="">
      <RouteMap
        routes={mapRoutes}
        chosen={route.style}
        start={route.points[0]}
        base={base}
        photo={photo}
        onChoose={() => undefined}
        onStart={async () => ({ ok: false, line: NO_START_HERE })}
        height={BRIEFING_MAP_HEIGHT}
        onOpen={() => setBig(true)}
      />
      <div className="min-h-[44px]">
        <Eyebrow tone="var(--color-ink-dim)">{ROUTE_STYLE_NAME[route.style]}</Eyebrow>
        <p className="text-sm tabular-nums leading-snug" style={{ color: 'var(--color-ink)' }}>{sessionRouteFacts(route)}</p>
        {/* Dezelfde regel als bij een nieuwe lus (engine/routePlanner.ts#footStartLine): waar de lus begint en hoe je er komt. */}
        {footStartLine(route) && <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{footStartLine(route)}</p>}
      </div>
      {asking ? (
        <div className="flex flex-col items-start">
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{SAVED_ROUTE_TEXT.ask}</p>
          <div className="flex gap-4">
            <TextButton tone="danger" disabled={busy} onClick={() => void remove()}>{SAVED_ROUTE_TEXT.confirm}</TextButton>
            <TextButton tone="dim" disabled={busy} onClick={() => setAsking(false)}>Annuleren</TextButton>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-4">
          <TextButton tone="dim" icon="verder" onClick={onOther}>{SAVED_ROUTE_TEXT.other}</TextButton>
          <TextButton tone="danger" onClick={() => setAsking(true)}>{SAVED_ROUTE_TEXT.remove}</TextButton>
        </div>
      )}
      {failed && <p role="status" className="text-sm leading-snug" style={{ color: 'var(--color-warning)' }}>{SAVED_ROUTE_TEXT.removeFailed}</p>}
      {big && <SavedRouteMapSheet route={route} title={title} base={base} photo={photo} onClose={() => setBig(false)} />}
    </div>
  );
}

// De lus op de hele kaart: slepen en knijpen, zonder knoppen om te zoeken.
function SavedRouteMapSheet({ route, title, base, photo, onClose }: { route: SessionRoute; title: string; base: MapBase; photo: MapPhoto; onClose: () => void }) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef} className={`relative h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <SheetGrip />
          <Card className="flex min-h-full flex-col gap-3 rounded-b-none border-b-0 pb-[max(var(--rand-onder),32px)]">
            <div className="-mt-2"><SheetHeader eyebrow={title} title="Je route" onClose={requestClose} /></div>
            <RouteMap
              routes={[{ style: route.style, points: route.points }]}
              chosen={route.style}
              start={route.points[0]}
              base={base}
              photo={photo}
              onChoose={() => undefined}
              onStart={async () => ({ ok: false, line: NO_START_HERE })}
              full
            />
            <p className="text-sm tabular-nums leading-snug" style={{ color: 'var(--color-ink)' }}>{sessionRouteFacts(route)}</p>
          </Card>
        </div>
      </div>
    </Portal>
  );
}

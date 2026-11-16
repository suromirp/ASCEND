// ASCEND: Hele kaart, de kaart van Route voorstellen op volle hoogte met een terugknop
// (besluit 2026-11-14-route-kaart-vervolg.md). Om te kijken en een lus te kiezen; bijsturen doe je in het
// blad. Dezelfde regie (useRouteSearch): een lus die je hier kiest is de lus in het blad en in de Briefing. Alleen hier
// mag de telefoon liggend (deviceShell.freeRotation); bij terug, de terugknop van de telefoon of sluiten
// staat de app weer rechtop. Rendert alleen.

import { useFreeRotation } from './useFreeRotation';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { Icon } from './icons';
import { Eyebrow } from './ui';
import { RouteMap } from './RouteMap';
import type { RouteSearchModel } from './useRouteSearch';
import type { RoutePoint } from '../models/route';

export function RouteMapFull({ model, piece, onClose }: { model: RouteSearchModel; piece?: RoutePoint[]; onClose: () => void }) {
  // Geen sheetRef: een kaart sleep je, dit scherm sluit niet door omlaag te vegen. Wel de terugknop.
  const { closing, requestClose } = useSheetClose(onClose);
  useFreeRotation();
  const start = model.mapStartPoint;
  // Je plek lukte niet: de kaart zonder lus, met alleen een midden (nooit een startpunt); een tik zet de ring.
  const askCenter = model.stage === 'ask' ? model.askCenter : undefined;
  return (
    <Portal>
      <div
        role="dialog"
        aria-label="Hele kaart: de kaart met je lus"
        className={`fixed inset-0 z-[60] flex flex-col bg-bg ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
        // Liggend zit de inkeping of de ronde hoek links of rechts: daar blijft de kaart vandaan.
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'max(var(--rand-onder), 8px)', paddingLeft: 'max(env(safe-area-inset-left, 0px), 8px)', paddingRight: 'max(env(safe-area-inset-right, 0px), 8px)' }}
      >
        <div className="flex h-11 shrink-0 items-center">
          <button type="button" onClick={requestClose} aria-label="Terug" className="flex h-11 min-w-[44px] items-center gap-1 pr-2 text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
            <Icon name="terug" size={20} />
            Terug
          </button>
          <div className="min-w-0 flex-1 truncate text-right"><Eyebrow tone="var(--color-ink-dim)">Route voorstellen</Eyebrow></div>
        </div>
        <div className="min-h-0 flex-1">
          {/* Tijdens een nieuwe zoektocht (na Langer of een andere start) blijft Groter open, met één regel. */}
          {!askCenter && (!start || model.stage !== 'plans') && <p role="status" className="py-2 text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{model.stage === 'searching' ? 'Lussen zoeken…' : 'Er is nu geen lus om te tonen.'}</p>}
          {askCenter && (
            <RouteMap
              full
              routes={[]}
              chosen={undefined}
              center={askCenter.kind === 'overview' ? undefined : askCenter.point}
              base={model.base}
              onChoose={() => undefined}
              onStart={model.startOnMap}
              onNoMap={model.markNoMap}
              photo={model.photo}
              onPhoto={model.setPhoto}
              me={model.mePoint}
              tapped={model.tapPoint}
              hasHome={model.hasHome}
              onMakeHome={model.makeHome}
            />
          )}
          {start && model.stage === 'plans' && (
            <RouteMap
              full
              routes={model.mapRoutes}
              chosen={model.picked}
              start={start}
              base={model.base}
              onChoose={model.setChosen}
              onStart={model.startOnMap}
              onNoMap={model.markNoMap}
              photo={model.photo}
              onPhoto={model.setPhoto}
              me={model.mePoint}
              tapped={model.tapPoint}
              hasHome={model.hasHome}
              onMakeHome={model.makeHome}
              keepName={model.keepName}
              onKeep={model.keepPlace}
              piece={piece}
            />
          )}
        </div>
      </div>
    </Portal>
  );
}

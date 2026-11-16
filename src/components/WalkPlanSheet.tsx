// ASCEND: Wandeling plannen, het blad achter de + op Vandaag (LogOrPlan.tsx) en de rij op Ascend. Een afstand, hooguit
// een wens voor de hoogtemeters en waar je begint; Stel route voor zoekt met de bestaande regie
// (useRouteSearch met `walk`) en tekent met RoutePanelView: geen tweede zoektocht. De wandeling is geen
// training: geen geplande sessie, geen voorstel, geen log; de laatst gekozen afstand wordt niet onthouden
// (besluit 2026-11-15-wandeling-plannen.md). Rekenwerk in engine/walkPlan.ts.

import { useMemo, useRef, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { useSheetClose } from '../utils/useSheetClose';
import { todayISO } from '../utils/dates';
import {
  WALK_ASCENT_RANGE_LINE, WALK_CLIMB_CHOICES, WALK_CLIMB_LABEL, WALK_KM_CHOICES, WALK_KM_RANGE_LINE, WALK_LOG_LINE,
  resolveWalkKm, validWalkAscent, validWalkKm, walkDurationLine, walkPlanTarget, type WalkClimb, type WalkWish,
} from '../engine/walkPlan';
import { Portal } from './Portal';
import { SheetHeader } from './SheetHeader';
import { Card, Chip, Eyebrow, InfoButton, PrimaryButton, SecondaryButton, SheetGrip } from './ui';
import { NumberField } from './NumberField';
import { RoutePanelView, StartChips } from './RoutePanel';
import { RouteInfoSheet } from './RouteProposalLine';
import { useRouteSearch } from './useRouteSearch';
import type { RouteTarget } from '../models/route';
import { useMotionMode } from './motion';
import { NO_PLACE_LINE } from '../engine/routeSheet';

type KmPick = number | 'other';
type ClimbPick = WalkClimb | 'other';

// De wens uit het formulier, of undefined als een eigen getal (Anders) nog niet klopt.
function wishOf(km: KmPick, ownKm: number | undefined, climb: ClimbPick, ownM: number | undefined): WalkWish | undefined {
  const distance = km === 'other' ? ownKm : km;
  if (!validWalkKm(distance)) return undefined;
  if (climb !== 'other') return { km: distance, climb };
  return validWalkAscent(ownM) ? { km: distance, climb: 'none', ascentM: ownM } : undefined;
}

export function WalkPlanSheet({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings } = useAppData();
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  const motion = useMotionMode();
  const [info, setInfo] = useState(false);
  // De afstand begint bij de instelling Afstand van een wandeling; een keuze hier geldt alleen voor dit blad.
  const [km, setKm] = useState<KmPick>(() => resolveWalkKm(settings.walkPlanKm));
  const [ownKm, setOwnKm] = useState<number | undefined>();
  const [climb, setClimb] = useState<ClimbPick>('none');
  const [ownM, setOwnM] = useState<number | undefined>();
  // De wens waarmee gezocht wordt: pas na een tik op Stel route voor.
  const [searched, setSearched] = useState<WalkWish | undefined>();
  const result = useRef<HTMLDivElement>(null);
  const date = useMemo(() => todayISO(), []);

  const wish = wishOf(km, ownKm, climb, ownM);
  const formTarget = wish ? walkPlanTarget(wish) : undefined;
  const searchedSig = searched ? JSON.stringify(walkPlanTarget(searched)) : '';
  // Stabiel op de inhoud: een nieuw object met dezelfde wens begint geen nieuwe zoektocht.
  const walkSig = JSON.stringify(walkPlanTarget(searched ?? wish ?? { km: resolveWalkKm(settings.walkPlanKm), climb: 'none' }));
  const walk = useMemo(() => JSON.parse(walkSig) as RouteTarget, [walkSig]);
  const model = useRouteSearch({ walk, date, closing, enabled: searched !== undefined });
  const same = !!formTarget && JSON.stringify(formTarget) === searchedSig;
  const avoidBigRoads = settings.routeAvoidBigRoads !== false;
  // De chips Start bij pas als ASCEND mag zoeken; anders stelt de eerste vraag na de tik dezelfde keuze.
  const startShown = model.stage !== 'no-place' && model.stage !== 'reading' && model.stage !== 'first-question';
  // Zonder plaats kan er niets gezocht worden: dat staat er voor de tik, en de knop wacht niet op niets.
  const noPlace = model.stage === 'no-place';

  function propose() {
    if (!wish) return;
    setSearched(wish);
    // Na de tik de route in beeld; in Rustig en Uit zonder te glijden.
    requestAnimationFrame(() => result.current?.scrollIntoView({ block: 'start', behavior: motion === 'full' ? 'smooth' : 'auto' }));
  }

  const dim = { color: 'var(--color-ink-dim)' };
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        {/* Een vaste hoogte: het blad springt niet omhoog als de lussen er na het zoeken zijn. */}
        <div ref={sheetRef} className={`relative h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <SheetGrip />
          <Card className="flex min-h-full flex-col gap-4 rounded-b-none border-b-0 pb-[max(var(--rand-onder),32px)]">
            <div className="-mt-2"><SheetHeader eyebrow="Wandelen" title="Wandeling plannen" info={<InfoButton label="Zo werkt de kaart" onClick={() => setInfo(true)} />} onClose={requestClose} /></div>

            <div className="flex flex-col gap-1">
              <Eyebrow tone="var(--color-ink-dim)">Afstand</Eyebrow>
              <div role="group" aria-label="Afstand" className="flex flex-wrap gap-2">
                {WALK_KM_CHOICES.map((n) => <Chip key={n} tone="quiet" selected={km === n} onClick={() => setKm(n)}>{`${n} km`}</Chip>)}
                <Chip tone="quiet" selected={km === 'other'} onClick={() => setKm('other')}>Anders</Chip>
              </div>
              {km === 'other' && <div className="max-w-[10rem] pt-1"><NumberField label="Eigen afstand" value={ownKm} onChange={setOwnKm} unit="km" decimals={1} tall /></div>}
              <p role="status" className="text-sm leading-snug" style={dim}>{formTarget ? walkDurationLine(formTarget) : km === 'other' && !validWalkKm(ownKm) ? WALK_KM_RANGE_LINE : ''}</p>
            </div>

            <div className="flex flex-col gap-1">
              <Eyebrow tone="var(--color-ink-dim)">Hoogtemeters</Eyebrow>
              <div role="group" aria-label="Hoogtemeters" className="flex flex-wrap gap-2">
                {WALK_CLIMB_CHOICES.map((c) => <Chip key={c} tone="quiet" selected={climb === c} onClick={() => setClimb(c)}>{WALK_CLIMB_LABEL[c]}</Chip>)}
                <Chip tone="quiet" selected={climb === 'other'} onClick={() => setClimb('other')}>Anders</Chip>
              </div>
              {climb === 'other' && (
                <div className="max-w-[10rem] pt-1"><NumberField label="Eigen hoogtemeters" value={ownM} onChange={setOwnM} unit="m" tall helper={validWalkAscent(ownM) ? undefined : WALK_ASCENT_RANGE_LINE} /></div>
              )}
            </div>

            {startShown && <StartChips model={model} />}
            <div className="flex flex-wrap gap-2">
              <Chip tone="quiet" selected={avoidBigRoads} onClick={() => void updateSettings({ routeAvoidBigRoads: !avoidBigRoads }).catch(() => undefined)}>Grote wegen mijden</Chip>
            </div>

            {noPlace && <p role="status" className="text-sm leading-snug" style={dim}>{NO_PLACE_LINE}</p>}
            {/* Eén mint knop: voor het zoeken Stel route voor; daarna is de mint de knop van de gekozen lus. */}
            <div className="flex flex-col gap-2">
              {searched
                ? <SecondaryButton disabled={!wish || same || noPlace} onClick={propose}>Stel route voor</SecondaryButton>
                : <PrimaryButton disabled={!wish || noPlace} onClick={propose}>Stel route voor</PrimaryButton>}
              <SecondaryButton onClick={requestClose}>Annuleren</SecondaryButton>
            </div>

            <div ref={result} className="flex scroll-mt-4 flex-col gap-3">
              {searched && (
                <>
                  <RoutePanelView model={model} date={date} onDecline={requestClose} startAbove={startShown} />
                  <p className="text-sm leading-snug" style={dim}>{WALK_LOG_LINE}</p>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
      {info && <RouteInfoSheet onClose={() => setInfo(false)} />}
    </Portal>
  );
}

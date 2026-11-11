// ASCEND: twee lussen voor een looptraining (engine/routePlanner.ts): Simpel en Avontuurlijk, elk
// met afstand, hoogtemeters en een GPX-bestand. De eerste keer vraagt het paneel of ASCEND mag
// zoeken, met wat er de deur uit gaat. Zoeken heeft een grens in tijd; zonder netwerk staat er één
// rustige regel. Na het zoeken zegt één regel wat er op de kaart lag (engine/routePlanner.ts#searchLines).
// Het paneel rekent zelf niets en plant niets: een route is alleen om te lopen. Zolang er gezocht
// wordt, staat RouteSearching op de plek van de kaart, met dezelfde vaste hoogte; de kaart komt pas met
// de lussen, zodat hij ze bij het openen meteen allemaal in beeld heeft (besluit 2026-11-11-route-kaart-2.md).
// De volgende delen (engine/routeSheet.ts#routeSheetParts): de kaart bovenaan, de gekozen lus met de
// hoofdknop eronder, dan elke lus als rij om te kiezen. Nergens een uitklap; de lange uitleg staat
// achter de i van het blad (RouteProposalLine.tsx#RouteInfoSheet). Spoor 2 van de Briefing.

import { PHOTO_SOURCES_LINE } from '../integrations/aerialImagery';
import { useEffect, useRef, useState } from 'react';
import type { SessionTemplate } from '../models/training';
import type { RouteProposal, RouteStyle, RouteTarget } from '../models/route';
import { targetText } from '../engine/routeTarget';
import { MIN_ASCENT_TARGET_M, failureLine, proposalFacts, proposalNotes, proposalTitle, type PlanOutcome } from '../engine/routePlanner';
import { gpxCourseName, routeGpx } from '../engine/gpx';
import { SEND_LABEL, type RouteSendOutcome } from '../engine/routeSend';
import { RouteSearching } from './RouteSearching';
import { saveRouteGpx, type RouteFileResult } from '../storage/routeFile';
import { sendRouteGpx } from '../storage/routeSend';
import type { FileSender } from '../integrations/fileSender';
import { OSM_COPYRIGHT } from '../integrations/overpass';
import { TextButton } from './TextButton';
import { RouteMap } from './RouteMap';
import { NO_PLACE_LINE, OFFLINE_LINE, ROUTE_MAP_HEIGHT, TIMEOUT_LINE, loopLines, pickTransition, routeOutcomeLine, type RouteSheetPart } from '../engine/routeSheet';
import { useMotionMode } from './motion';
import { Icon } from './icons';
import { Chip, Eyebrow, PrimaryButton } from './ui';
import { useRouteSearch, type RouteSearchModel } from './useRouteSearch';

const STYLE_NAME: Record<RouteStyle, string> = { simple: 'Simpel', adventure: 'Avontuurlijk' };
const STYLE_LINE: Record<RouteStyle, string> = {
  simple: 'Dezelfde helling op en af.',
  adventure: 'Eén lus langs verschillende hellingen en paden.',
};

// De hoofdknop voor de gekozen lus, direct onder de rijen. Titel en feiten staan alleen in de rij
// (Pathfinder: dezelfde zin nooit twee keer). Onder de knop alleen de uitkomst van een tik; wat je in
// Garmin Connect doet staat achter de i. Elke lus heeft zijn eigen uitkomst (`key` op de soort).
export function ChosenLoop({ style, proposal, date, target, sender }: { style: RouteStyle; proposal: RouteProposal; date: string; target: RouteTarget; sender: FileSender | null }) {
  // De laatste uitkomst van een van de twee knoppen; 'busy' zolang er een loopt (beide hebben een grens in tijd).
  const [done, setDone] = useState<{ send: RouteSendOutcome } | { file: RouteFileResult } | 'busy' | undefined>();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const gpx = routeGpx(proposal.points, gpxCourseName(style, proposal.distanceM));

  async function download() {
    setDone('busy');
    const file = await saveRouteGpx(gpx, style, date);
    if (mounted.current) setDone({ file });
  }

  async function send() {
    setDone('busy');
    const result = await sendRouteGpx(gpx, style, date, sender);
    if (mounted.current) setDone({ send: result });
  }

  // Eén regel onder de knoppen: leeg tot je tikt, dan de uitkomst.
  const line = routeOutcomeLine(!!sender, done === 'busy' ? undefined : done);
  const { info } = loopLines(proposal, target, proposalNotes(proposal, target));

  return (
    <div className="flex flex-col gap-1">
      <div>
        {sender
          ? <PrimaryButton disabled={done === 'busy'} onClick={() => void send()}>{SEND_LABEL}</PrimaryButton>
          : <PrimaryButton disabled={done === 'busy'} onClick={() => void download()}>GPX downloaden</PrimaryButton>}
      </div>
      {sender && <div><TextButton tone="dim" disabled={done === 'busy'} onClick={() => void download()}>GPX downloaden</TextButton></div>}
      {/* Voor een tik leeg en zonder hoogte, zodat de rest direct onder de knop staat; na een tik plaats voor drie regels. */}
      <p role="status" className={`${line ? 'min-h-[50px] ' : ''}text-xs leading-snug`} style={{ color: line?.warn ? 'var(--color-warning)' : 'var(--color-ink-dim)' }}>{line?.text ?? ''}</p>
      {info.map((note) => (
        <p key={note} className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{note}</p>
      ))}
    </div>
  );
}

// Geen netwerk of een routeplanner die te laat was: op de plek van de kaart, met dezelfde hoogte, de
// regel en Opnieuw zoeken.
export function RouteFailure({ kind, onRetry, height }: { kind: 'offline' | 'timeout'; onRetry: () => void; height?: string }) {
  return (
    <div className="flex w-full flex-col items-start justify-center gap-1 rounded-xl border px-5" style={{ height: ROUTE_MAP_HEIGHT, ...(height ? { height } : {}), borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}>
      <p role="status" className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{kind === 'offline' ? OFFLINE_LINE : TIMEOUT_LINE}</p>
      <TextButton tone="dim" onClick={onRetry}>Opnieuw zoeken</TextButton>
    </div>
  );
}

// Een lus als rij om te kiezen: geen uitklap. De gekozen rij heeft een rand in inkt; het mint accent
// is de lus op de kaart. Een melding (te kort, te weinig hoogtemeters) staat in amber in een eigen regel
// in de rij. Een lus die er niet kwam is een rij tekst die je niet kunt kiezen.
export function LoopRow({ style, outcome, picked, onMap, target, motion, onChoose }: { style: RouteStyle; outcome: PlanOutcome; picked: boolean; onMap: boolean; target: RouteTarget; motion: 'full' | 'calm' | 'off'; onChoose: () => void }) {
  const dim = { color: 'var(--color-ink-dim)' };
  if (!outcome.ok) {
    return (
      <div className="flex min-h-[56px] flex-col justify-center rounded-xl border px-3 py-2" style={{ borderColor: 'var(--color-card-border)' }}>
        <Eyebrow tone="var(--color-ink-dim)">{STYLE_NAME[style]}</Eyebrow>
        <p className="text-sm leading-snug" style={dim}>{STYLE_LINE[style]}</p>
        <p className="text-sm leading-snug" style={dim}>{failureLine(style, outcome, target.ascentM < MIN_ASCENT_TARGET_M)}</p>
      </div>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={picked}
      onClick={onChoose}
      className="flex min-h-[56px] w-full items-center gap-3 rounded-xl border px-3 py-2 text-left"
      style={{ borderColor: picked ? 'var(--color-ink)' : 'var(--color-card-border)', background: picked ? 'var(--color-raised)' : 'transparent', transition: pickTransition(motion) }}
    >
      <span className="min-w-0 flex-1">
        <span className="block"><Eyebrow as="span" tone="var(--color-ink-dim)">{onMap ? `${STYLE_NAME[style]} · ${picked ? 'doorgetrokken' : 'gestreept'}` : STYLE_NAME[style]}</Eyebrow></span>
        <span className="block text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{proposalTitle(outcome.proposal)}</span>
        <span className="block text-sm tabular-nums leading-snug" style={dim}>{proposalFacts(outcome.proposal)}</span>
        {loopLines(outcome.proposal, target, proposalNotes(outcome.proposal, target)).warn.map((note) => (
          <span key={note} className="block text-sm leading-snug" style={{ color: 'var(--color-warning)' }}>{note}</span>
        ))}
      </span>
      {picked && <span className="shrink-0" style={{ color: 'var(--color-ink)' }} aria-hidden><Icon name="vinkje" size={18} /></span>}
    </button>
  );
}

// De eerste keer: de vraag of ASCEND mag zoeken, met wat er de deur uit gaat. Ongewijzigd; ook in de
// Briefing op de plek van de kaart.
export function RouteFirstQuestion({ model, onDecline }: { model: RouteSearchModel; onDecline: () => void }) {
  const dim = { color: 'var(--color-ink-dim)' };
  return (
    <div className="flex flex-col">
      <p className="text-sm leading-snug" style={dim}>Een lus zoeken voor deze training? Kies waar de lus begint. Er gaat geen naam of adres mee.</p>
      <TextButton onClick={() => void model.choose('here')}>Waar je nu bent</TextButton>
      <p className="text-xs leading-snug" style={dim}>
        Bij elke zoektocht vraagt ASCEND één keer je plek. Die gaat precies naar de routeplanner (BRouter, anders Valhalla van FOSSGIS); heuvels en paden zoekt OpenStreetMap om je plek op ongeveer 100 m, en de hoogte van heuvels komt van Open-Meteo, om hetzelfde punt. Je plek wordt niet als startpunt bewaard. De kaart haalt kaarttegels rond je plek op bij OpenFreeMap, anders bij OpenStreetMap. {PHOTO_SOURCES_LINE}
      </p>
      <TextButton tone="dim" onClick={() => void model.choose('exact')}>Thuis</TextButton>
      <p className="text-xs leading-snug" style={dim}>
        Een punt dat je bewaart, zoals je deur: tik het op de kaart en kies Bewaar als plek. Het gaat precies naar de routeplanner, naar OpenStreetMap en naar Open-Meteo, net als hierboven, en wordt op dit toestel bewaard; het gaat mee in je back-up. Tot er een Thuis is, begint de lus waar je nu bent.
      </p>
      <TextButton tone="dim" onClick={() => void model.choose('approx')}>Ongeveer</TextButton>
      <p className="text-xs leading-snug" style={dim}>
        Je plek, afgerond op ongeveer een kilometer, gaat naar de routeplanner en naar OpenStreetMap. De lus begint dan tot ongeveer 700 m van je deur.
      </p>
      <div className="flex flex-wrap gap-x-5">
        <TextButton tone="dim" onClick={onDecline}>Liever niet</TextButton>
      </div>
    </div>
  );
}

// Start bij: de chips boven de kaart en de zoekstand, in elke stand, met een vaste hoogte (één rij van
// 44 px). Een tik geldt voor deze training en breekt een zoektocht die loopt af (nieuwe sleutel).
export function StartChips({ model }: { model: RouteSearchModel }) {
  return (
    <div className="flex flex-col gap-1">
      <Eyebrow tone="var(--color-ink-dim)">Start bij</Eyebrow>
      <div role="group" aria-label="Start bij" className="flex h-11 gap-2">
        {model.startChips.map((c) => (
          <span key={c.kind} className="shrink-0 whitespace-nowrap">
            <Chip selected={c.kind === model.startChip} onClick={() => model.pickStart(c.kind === 'home' ? 'home' : 'here')}>{c.label}</Chip>
          </span>
        ))}
      </div>
    </div>
  );
}

// `closing`: het blad gaat dicht (de animatie loopt nog). Dan stopt het zoeken meteen, niet pas als het
// paneel weg is: na de tik op sluiten gaat er geen aanroep meer de deur uit.
export function RoutePanel({ template, date, onDecline, closing = false }: { template: SessionTemplate; date: string; onDecline: () => void; closing?: boolean }) {
  const model = useRouteSearch({ template, date, closing });
  return <RoutePanelView model={model} date={date} onDecline={onDecline} />;
}

// Wat het blad Route tekent bij een regie (useRouteSearch). Ook het blad achter Groter in de Briefing,
// met de regie van de Briefing: dezelfde lus, geen tweede zoektocht.
export function RoutePanelView({ model, date, onDecline }: { model: RouteSearchModel; date: string; onDecline: () => void }) {
  const motion = useMotionMode();
  const dim = { color: 'var(--color-ink-dim)' };
  const { stage, lat, lon, target, plans, order, okStyles, picked, pickedOutcome, sender, parts, noMap } = model;

  if (stage === 'no-place' || lat === undefined || lon === undefined) {
    return <p className="text-sm leading-snug" style={dim}>{NO_PLACE_LINE}</p>;
  }
  if (stage === 'reading') return <p role="status" className="min-h-[20px] text-sm" style={dim} />;
  if (stage === 'first-question') return <RouteFirstQuestion model={model} onDecline={onDecline} />;

  const retry = <TextButton tone="dim" onClick={model.retry}>Opnieuw zoeken</TextButton>;

  // De delen in de volgorde van engine/routeSheet.ts#routeSheetParts: de kaart bovenaan, dan de
  // gekozen lus met de hoofdknop, dan de lussen als rijen. Geen uitklap.
  const part = (p: RouteSheetPart) => {
    switch (p) {
      case 'searching':
        return <RouteSearching key={`${p}-${model.searchKey}`} steps={model.steps} current={model.currentStep} limitLine={model.limitLine} limitMs={model.limitMs} />;
      case 'failure':
        return <RouteFailure key={p} kind={stage === 'offline' ? 'offline' : 'timeout'} onRetry={model.retry} />;
      case 'map':
        return model.mapStartPoint ? (
          <div key={p} className="flex flex-col gap-1">
            <RouteMap routes={model.mapRoutes} chosen={picked} start={model.mapStartPoint} base={model.base} onChoose={model.setChosen} onStart={model.startOnMap} onNoMap={model.markNoMap} photo={model.photo} onPhoto={model.setPhoto} me={model.mePoint} tapped={model.tapPoint} hasHome={model.hasHome} onMakeHome={model.makeHome} />
          </div>
        ) : null;
      case 'chosen':
        return picked && pickedOutcome?.ok ? <ChosenLoop key={`chosen-${picked}`} style={picked} proposal={pickedOutcome.proposal} date={date} target={target} sender={sender} /> : null;
      case 'loops':
        return plans ? (
          <div key={p} className="flex flex-col gap-2">
            {order.map((s) => <LoopRow key={s} style={s} outcome={plans[s]} picked={s === picked} onMap={!noMap && okStyles.length > 1} target={target} motion={motion} onChoose={() => model.setChosen(s)} />)}
          </div>
        ) : null;
      case 'found':
        return model.foundLines.length > 0 ? <p key={p} role="status" className="text-sm leading-snug" style={dim}>{model.foundLines.join(' ')}</p> : null;
      case 'retry':
        return <div key={p}>{retry}</div>;
      case 'sources':
        return (
          <div key={p}>
            <p className="text-xs leading-snug" style={dim}>
              Kaartgegevens van OpenStreetMap{model.sources.length > 0 ? `. Route van ${model.sources.join(' en ')}.` : '.'} Kijk zelf of een pad begaanbaar is.
            </p>
            <a href={OSM_COPYRIGHT} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center text-xs underline underline-offset-2" style={dim}>Licentie van OpenStreetMap</a>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Waar de lus begint staat er in elke stand, ook bij zoeken, een fout of zonder kaart (Warden): de
          chips, en de regel alleen bij een terugval of afwijking. */}
      <StartChips model={model} />
      <p className="text-sm leading-snug" style={dim}>Je training: {targetText(target)}.{model.startLine ? ` ${model.startLine}` : ''}</p>
      {parts.map(part)}
    </div>
  );
}

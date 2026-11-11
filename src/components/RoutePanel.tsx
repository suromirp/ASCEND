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

import { useEffect, useRef, useState } from 'react';
import type { SessionTemplate } from '../models/training';
import type { RoutePoint, RouteProposal, RouteStyle, RouteTarget } from '../models/route';
import { useAppData } from '../state/AppDataContext';
import { judgmentOptions, pacesFromLogs } from '../engine/testJudgment';
import { resolveRouteStyle, routeTarget, targetText } from '../engine/routeTarget';
import { MIN_ASCENT_TARGET_M, failureLine, proposalFacts, proposalNotes, proposalTitle, searchLines, type PlanOutcome } from '../engine/routePlanner';
import { gpxCourseName, routeGpx } from '../engine/gpx';
import { SEND_LABEL, type RouteSendOutcome } from '../engine/routeSend';
import { findRoutes, grantRouteConsent, hasRouteConsent, PROPOSAL_LIMIT_MS, type RouteSearch, type RouteSearchStep } from '../storage/routeProposal';
import { chooseStart, hereStart, hereStartLine, resolveRouteStart, roundHere, START_LINE_APPROX, START_LINE_EXACT, START_LINE_HERE, startFailureLine, startFailureReason, type RouteStartMode, type StartFailure } from '../engine/routeStart';
import { getRouteStartPoint, locateStartHere, START_LOCATE_LIMIT_MS, startFromMap, type StartLocation } from '../storage/routeStart';
import { searchLimitLine, searchSteps } from '../engine/routeSearchSteps';
import { loadMapLibre } from '../integrations/mapLibre';
import { RouteSearching } from './RouteSearching';
import { saveRouteGpx, type RouteFileResult } from '../storage/routeFile';
import { routeSender, sendRouteGpx } from '../storage/routeSend';
import type { FileSender } from '../integrations/fileSender';
import { OSM_COPYRIGHT } from '../integrations/overpass';
import { withTimeout } from '../utils/withTimeout';
import { TextButton } from './TextButton';
import { RouteMap } from './RouteMap';
import { resolveMapBase } from '../engine/routeMap';
import { NO_PLACE_LINE, OFFLINE_LINE, ROUTE_MAP_HEIGHT, TIMEOUT_LINE, loopLines, pickTransition, routeOutcomeLine, routeSheetParts, routeSheetStage, type RouteSheetPart } from '../engine/routeSheet';
import { useMotionMode } from './motion';
import { Icon } from './icons';
import { roundStart } from '../engine/routeTarget';
import { Eyebrow, PrimaryButton } from './ui';

const CONSENT_LIMIT_MS = 3000;
const STYLE_NAME: Record<RouteStyle, string> = { simple: 'Simpel', adventure: 'Avontuurlijk' };
const STYLE_LINE: Record<RouteStyle, string> = {
  simple: 'Dezelfde helling op en af.',
  adventure: 'Eén lus langs verschillende hellingen en paden.',
};
const SOURCE_NAME = { brouter: 'BRouter', valhalla: 'Valhalla' } as const;

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
export function RouteFailure({ kind, onRetry }: { kind: 'offline' | 'timeout'; onRetry: () => void }) {
  return (
    <div className="flex w-full flex-col items-start justify-center gap-1 rounded-xl border px-5" style={{ height: ROUTE_MAP_HEIGHT, borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}>
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

// `closing`: het blad gaat dicht (de animatie loopt nog). Dan stopt het zoeken meteen, niet pas als het
// paneel weg is: na de tik op sluiten gaat er geen aanroep meer de deur uit.
export function RoutePanel({ template, date, onDecline, closing = false }: { template: SessionTemplate; date: string; onDecline: () => void; closing?: boolean }) {
  const { settings, program, sessionLogs, updateSettings } = useAppData();
  const motion = useMotionMode();
  const place = settings.homeLocation;
  const lat = place?.lat;
  const lon = place?.lon;
  const [consent, setConsent] = useState<boolean | undefined>();
  const [found, setFound] = useState<{ key: string; result: RouteSearch } | undefined>();
  const [attempt, setAttempt] = useState(0);
  // Het eigen startpunt (alleen op dit toestel): undefined zolang we lezen, null als er geen is.
  const [saved, setSaved] = useState<RoutePoint | null | undefined>();
  const [locating, setLocating] = useState(false);
  // Lukte de locatie niet, dan zoekt dit paneel ongeveer, met de reden in één regel.
  const [fellBack, setFellBack] = useState<StartFailure | undefined>();
  const [declinedExact, setDeclinedExact] = useState(false);
  // Een startpunt van de kaart, alleen voor dit paneel als de keuze Precies niet bewaard kon worden.
  const [mapStart, setMapStart] = useState<RoutePoint | undefined>();
  // De lus die je op de kaart koos; zonder keuze de eerste.
  const [chosen, setChosen] = useState<RouteStyle | undefined>();
  // Waar je nu bent: de plek van deze poging (één vraag per zoektocht), of de reden dat het niet lukte.
  const [here, setHere] = useState<{ attempt: number; found: StartLocation } | undefined>();
  // De stap die nu loopt, voor RouteSearching; hoort bij één zoektocht (de sleutel).
  const [step, setStep] = useState<{ key: string; step: RouteSearchStep } | undefined>();
  // De kaart kon bij deze zoektocht niet tekenen: de rijen zeggen dan niet doorgetrokken of gestreept.
  const [noMapKey, setNoMapKey] = useState<string | undefined>();
  const mounted = useRef(true);
  const locateStop = useRef(new AbortController());
  useEffect(() => {
    mounted.current = true;
    const stop = locateStop.current;
    return () => {
      mounted.current = false;
      stop.abort();
    };
  }, []);
  const first = resolveRouteStyle(settings.routeStyle);
  const target = routeTarget({ template, date, program, logs: sessionLogs, testPace: pacesFromLogs(sessionLogs, judgmentOptions(settings)).paces?.easy });
  const { distanceKm, ascentM } = target;

  useEffect(() => {
    let alive = true;
    // Hangt de opslag, dan komt na een paar seconden gewoon de vraag.
    void withTimeout(hasRouteConsent(), CONSENT_LIMIT_MS).catch(() => false).then((ok) => {
      if (alive) setConsent(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    void withTimeout(getRouteStartPoint(), CONSENT_LIMIT_MS).then((p) => {
      if (alive) setSaved(p ?? null);
    }, () => {
      // Trage opslag: niet raden dat er geen punt is, dit paneel zoekt ongeveer.
      if (alive) { setSaved(null); setDeclinedExact(true); }
    });
    return () => {
      alive = false;
    };
  }, []);

  const mode = resolveRouteStart(settings.routeStart);
  // Wie al ja zei voor er een keuze voor het startpunt was, krijgt de vraag nog één keer: zonder keuze
  // zou de lus stil op Ongeveer blijven en zie je Precies, vanaf je deur nooit.
  const asked = consent === true && settings.routeStart !== undefined;
  const choice = saved === undefined ? undefined : chooseStart(mode, saved);
  // Vast punt zonder punt vraagt eerst om een punt, tenzij dit paneel op Ongeveer terugviel.
  const waitingForPoint = choice?.kind === 'needs-point' && !fellBack && !declinedExact;
  // Waar je nu bent: per poging één keer de plek, met terugval op je vaste punt en anders Ongeveer.
  const hereMode = choice?.kind === 'here' && !mapStart;
  const hereFound = here?.attempt === attempt ? here.found : undefined;
  const hereChoice = hereMode && hereFound ? hereStart(hereFound, saved) : undefined;
  const locatingHere = hereMode && !hereChoice;
  const exactPoint = mapStart
    ?? (hereChoice ? (hereChoice.kind === 'approx' ? undefined : hereChoice.point) : undefined)
    ?? (choice?.kind === 'exact' && !waitingForPoint ? choice.point : undefined);
  const exactLat = exactPoint?.lat;
  const exactLon = exactPoint?.lon;
  // Heuvels rond je plek van nu op ongeveer 100 m; rond een vast punt op dat punt.
  const terrainAt = hereChoice?.kind === 'here' ? roundHere(hereChoice.point) : undefined;
  const terrainLat = terrainAt?.lat;
  const terrainLon = terrainAt?.lon;
  const startReady = (choice !== undefined && !waitingForPoint && !locatingHere) || mapStart !== undefined;
  const startLine = mapStart
    ? 'De lus begint bij het punt dat je koos.'
    : hereMode
      ? (hereChoice ? hereStartLine(hereChoice) : START_LINE_HERE)
      : fellBack ? startFailureLine(fellBack) : exactLat !== undefined ? START_LINE_EXACT : START_LINE_APPROX;

  useEffect(() => {
    if (closing || !asked || !hereMode || saved === undefined || here?.attempt === attempt) return;
    const stop = new AbortController();
    const closed = locateStop.current.signal;
    // Eén vraag om de plek, met dezelfde grens van 50 m als een vast punt; er wordt niets bewaard.
    void locateStartHere({ persist: false, signal: closed }).then((result) => {
      if (!stop.signal.aborted && !closed.aborted && mounted.current) setHere({ attempt, found: result });
    });
    return () => stop.abort();
  }, [closing, asked, hereMode, saved, attempt, here?.attempt]);

  // Eén zoektocht per plek, training en poging; zolang het antwoord van deze sleutel er niet is, zoekt het paneel.
  const key = `${attempt}|${lat}|${lon}|${exactLat}|${exactLon}|${terrainLat}|${terrainLon}|${distanceKm}|${ascentM}`;
  const search: RouteSearch | 'busy' = found?.key === key ? found.result : 'busy';

  useEffect(() => {
    if (closing || !asked || !startReady || lat === undefined || lon === undefined) return;
    const stop = new AbortController();
    // De kaartcode alvast laden, zodat de kaart er meteen is als de lussen er zijn. Een fout zegt de kaart zelf.
    void loadMapLibre().catch(() => undefined);
    const onStep = (s: RouteSearchStep) => {
      if (!stop.signal.aborted) setStep({ key, step: s });
    };
    const terrainPoint = terrainLat !== undefined && terrainLon !== undefined ? { lat: terrainLat, lon: terrainLon } : undefined;
    // findRoutes heeft zelf een grens in tijd en gooit nooit: "Lussen zoeken" blijft nooit staan.
    void findRoutes({ lat, lon }, { distanceKm, ascentM }, { signal: stop.signal, onStep, terrainAt: terrainPoint }, exactLat !== undefined && exactLon !== undefined ? { lat: exactLat, lon: exactLon } : undefined).then((result) => {
      if (!stop.signal.aborted) setFound({ key, result });
    });
    // Sluit het paneel of begint een nieuwe zoektocht, dan gaat er voor deze geen aanroep meer de deur uit.
    return () => stop.abort();
    // De sleutel bevat het punt; de afhankelijkheden zijn dezelfde getallen.
  }, [closing, asked, startReady, lat, lon, exactLat, exactLon, terrainLat, terrainLon, distanceKm, ascentM, key]);

  // Gebruik waar ik nu ben: één keer, met een grens in tijd. Lukt het niet, dan zoekt het paneel ongeveer.
  async function startHere() {
    setLocating(true);
    const found = await locateStartHere({ signal: locateStop.current.signal });
    if (!mounted.current) return;
    setLocating(false);
    if (found.ok) setSaved(found.point);
    else setFellBack(found.reason);
  }

  // Start hier of Gebruik waar ik nu ben op de kaart: het punt wordt je Precies-startpunt en de keuze
  // gaat op Precies, net als in de instelling. Een plek die te grof is telt niet (zelfde grens).
  async function startOnMap(from: { tap: RoutePoint } | 'here'): Promise<{ ok: true; point: RoutePoint } | { ok: false; line: string }> {
    const found = await startFromMap(from, { signal: locateStop.current.signal });
    if (!found.ok) return { ok: false, line: startFailureReason(found.reason) };
    if (!mounted.current) return found;
    setSaved(found.point);
    setFellBack(undefined);
    setDeclinedExact(false);
    try {
      await withTimeout(updateSettings({ routeStart: 'exact' }), CONSENT_LIMIT_MS);
      if (mounted.current) setMapStart(undefined);
    } catch {
      // Niet bewaard: dan geldt het punt alleen nu.
      if (mounted.current) setMapStart(found.point);
    }
    return found;
  }

  async function choose(next: RouteStartMode) {
    try {
      await withTimeout(grantRouteConsent(), CONSENT_LIMIT_MS);
      await withTimeout(updateSettings({ routeStart: next }), CONSENT_LIMIT_MS);
    } catch {
      // Niet bewaard: de keuze geldt dan niet en het paneel zoekt ongeveer.
    }
    if (mounted.current) setConsent(true);
  }

  // De weg naar de app van je horloge op dit toestel; null: alleen GPX downloaden.
  const [sender] = useState(routeSender);
  const dim = { color: 'var(--color-ink-dim)' };

  const stage = routeSheetStage({
    hasPlace: lat !== undefined && lon !== undefined,
    consent,
    asked,
    savedKnown: saved !== undefined,
    waitingForPoint: waitingForPoint && !mapStart,
    search,
  });

  if (stage === 'no-place' || lat === undefined || lon === undefined) {
    return <p className="text-sm leading-snug" style={dim}>{NO_PLACE_LINE}</p>;
  }
  if (stage === 'reading') return <p role="status" className="min-h-[20px] text-sm" style={dim} />;
  if (stage === 'first-question') {
    return (
      <div className="flex flex-col">
        <p className="text-sm leading-snug" style={dim}>Een lus zoeken voor deze training? Kies waar de lus begint. Er gaat geen naam of adres mee.</p>
        <TextButton onClick={() => void choose('here')}>Waar je nu bent</TextButton>
        <p className="text-xs leading-snug" style={dim}>
          Bij elke zoektocht vraagt ASCEND één keer je plek. Die gaat precies naar de routeplanner (BRouter, anders Valhalla van FOSSGIS); heuvels en paden zoekt OpenStreetMap om je plek op ongeveer 100 m, en de hoogte van heuvels komt van Open-Meteo, om hetzelfde punt. Je plek wordt niet als startpunt bewaard. De kaart haalt kaarttegels rond je plek op bij OpenFreeMap, anders bij OpenStreetMap.
        </p>
        <TextButton tone="dim" onClick={() => void choose('exact')}>Vast punt, je deur</TextButton>
        <p className="text-xs leading-snug" style={dim}>
          Een punt dat je bewaart, zoals je deur. Het gaat precies naar de routeplanner, naar OpenStreetMap en naar Open-Meteo, net als hierboven, en wordt alleen op dit toestel bewaard.
        </p>
        <TextButton tone="dim" onClick={() => void choose('approx')}>Ongeveer</TextButton>
        <p className="text-xs leading-snug" style={dim}>
          Je plek, afgerond op ongeveer een kilometer, gaat naar de routeplanner en naar OpenStreetMap. De lus begint dan tot ongeveer 700 m van je deur.
        </p>
        <div className="flex flex-wrap gap-x-5">
          <TextButton tone="dim" onClick={onDecline}>Liever niet</TextButton>
        </div>
      </div>
    );
  }
  if (stage === 'needs-point') {
    return (
      <div className="flex flex-col">
        <p className="text-sm leading-snug" style={dim}>Je training: {targetText(target)}. Sta bij je deur en kies Gebruik waar ik nu ben. Dat punt gaat als start van je lus naar de routeplanner (BRouter, anders Valhalla van FOSSGIS) en wordt alleen op dit toestel bewaard.</p>
        <div className="flex flex-wrap gap-x-5">
          <TextButton disabled={locating} onClick={() => void startHere()}>Gebruik waar ik nu ben</TextButton>
          <TextButton tone="dim" disabled={locating} onClick={() => setDeclinedExact(true)}>Ongeveer</TextButton>
        </div>
        <p role="status" className="min-h-[20px] text-xs leading-snug" style={dim}>{locating ? 'Je locatie wordt bepaald. Dat duurt hoogstens 15 seconden.' : ''}</p>
      </div>
    );
  }

  const order: RouteStyle[] = first === 'simple' ? ['simple', 'adventure'] : ['adventure', 'simple'];
  const plans = search !== 'busy' && search.kind === 'plans' ? search.plans : undefined;
  const sources = plans ? [...new Set(order.flatMap((s) => { const o = plans[s]; return o.ok ? [SOURCE_NAME[o.proposal.source]] : []; }))] : [];
  const okStyles = plans ? order.filter((s) => plans[s].ok) : [];
  const picked = chosen && okStyles.includes(chosen) ? chosen : okStyles[0];
  const pickedOutcome = plans && picked ? plans[picked] : undefined;
  const mapRoutes = plans ? okStyles.flatMap((s) => { const o = plans[s]; return o.ok ? [{ style: s, points: o.proposal.points }] : []; }) : [];
  const pickedRoute = mapRoutes.find((r) => r.style === picked);
  const mapStartPoint = pickedRoute?.points[0] ?? exactPoint ?? roundStart({ lat, lon });
  const noMap = noMapKey === key;
  const steps = searchSteps(hereMode);
  const currentStep = locatingHere ? 'locate' : step?.key === key ? step.step : 'terrain';
  const foundLines = plans ? searchLines(plans, target) : [];
  const parts = routeSheetParts(stage, plans ? { anyOk: okStyles.length > 0, anyFailed: order.some((s) => !plans[s].ok) } : undefined);
  const retry = <TextButton tone="dim" onClick={() => setAttempt((n) => n + 1)}>Opnieuw zoeken</TextButton>;

  // De delen in de volgorde van engine/routeSheet.ts#routeSheetParts: de kaart bovenaan, dan de
  // gekozen lus met de hoofdknop, dan de lussen als rijen. Geen uitklap.
  const part = (p: RouteSheetPart) => {
    switch (p) {
      case 'searching':
        return <RouteSearching key={p} steps={steps} current={currentStep} limitLine={searchLimitLine(hereMode ? START_LOCATE_LIMIT_MS : undefined, PROPOSAL_LIMIT_MS)} />;
      case 'failure':
        return <RouteFailure key={p} kind={stage === 'offline' ? 'offline' : 'timeout'} onRetry={() => setAttempt((n) => n + 1)} />;
      case 'map':
        return (
          <div key={p} className="flex flex-col gap-1">
            <RouteMap routes={mapRoutes} chosen={picked} start={mapStartPoint} base={resolveMapBase(settings.routeMapBase)} onChoose={setChosen} onStart={startOnMap} offerHere={!hereMode} onNoMap={() => setNoMapKey(key)} />
          </div>
        );
      case 'chosen':
        return picked && pickedOutcome?.ok ? <ChosenLoop key={`chosen-${picked}`} style={picked} proposal={pickedOutcome.proposal} date={date} target={target} sender={sender} /> : null;
      case 'loops':
        return plans ? (
          <div key={p} className="flex flex-col gap-2">
            {order.map((s) => <LoopRow key={s} style={s} outcome={plans[s]} picked={s === picked} onMap={!noMap && okStyles.length > 1} target={target} motion={motion} onChoose={() => setChosen(s)} />)}
          </div>
        ) : null;
      case 'found':
        return foundLines.length > 0 ? <p key={p} role="status" className="text-sm leading-snug" style={dim}>{foundLines.join(' ')}</p> : null;
      case 'retry':
        return <div key={p}>{retry}</div>;
      case 'sources':
        return (
          <div key={p}>
            <p className="text-xs leading-snug" style={dim}>
              Kaartgegevens van OpenStreetMap{sources.length > 0 ? `. Route van ${sources.join(' en ')}.` : '.'} Kijk zelf of een pad begaanbaar is.
            </p>
            <a href={OSM_COPYRIGHT} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center text-xs underline underline-offset-2" style={dim}>Licentie van OpenStreetMap</a>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Waar de lus begint staat er in elke stand, ook bij zoeken, een fout of zonder kaart (Warden). */}
      <p className="text-sm leading-snug" style={dim}>Je training: {targetText(target)}. {startLine}</p>
      {parts.map(part)}
    </div>
  );
}

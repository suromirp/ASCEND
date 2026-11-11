// ASCEND: de regie van Route voorstellen, los van wat er getekend wordt. De eerste vraag, het startpunt
// (Waar je nu bent, Vast punt, Ongeveer, een punt op de kaart), de zoektocht met zijn grens in tijd en
// de gekozen lus. Stond eerst in components/RoutePanel.tsx; nu delen het blad Route en de Briefing
// (components/TrainingBriefing.tsx, spoor 5) dezelfde regie, en het blad achter Groter in de Briefing
// dezelfde staat: de lus die je daar kiest, is de lus in de Briefing, zonder tweede zoektocht.
//
// `enabled`: of er gezocht mag worden. De Briefing zet hem pas aan bij het openen (instelling Lus
// zoeken, vandaag en morgen) of na een tik; tot dan gaat er niets de deur uit, ook geen vraag om je
// plek. `closing`: het blad of scherm gaat dicht; dan stopt het zoeken meteen.
// Plant niets en bewaart geen lus.

import { useEffect, useRef, useState } from 'react';
import type { SessionTemplate } from '../models/training';
import type { RoutePoint, RouteStyle, RouteTarget } from '../models/route';
import { useAppData } from '../state/AppDataContext';
import { judgmentOptions, pacesFromLogs } from '../engine/testJudgment';
import { resolveRouteStyle, roundStart, routeTarget } from '../engine/routeTarget';
import { searchLines, type PlanOutcome } from '../engine/routePlanner';
import { findRoutes, grantRouteConsent, hasRouteConsent, PROPOSAL_LIMIT_MS, type RouteSearch, type RouteSearchStep } from '../storage/routeProposal';
import { chooseStart, hereStart, hereStartLine, resolveRouteStart, roundHere, START_LINE_APPROX, START_LINE_EXACT, START_LINE_HERE, startFailureLine, startFailureReason, type RouteStartMode, type StartFailure } from '../engine/routeStart';
import { getRouteStartPoint, locateStartHere, START_LOCATE_LIMIT_MS, startFromMap, type StartLocation } from '../storage/routeStart';
import { searchLimitLine, searchSteps, type SearchStep } from '../engine/routeSearchSteps';
import { loadMapLibre } from '../integrations/mapLibre';
import { routeSender } from '../storage/routeSend';
import type { FileSender } from '../integrations/fileSender';
import { withTimeout } from '../utils/withTimeout';
import { resolveMapBase, resolveMapPhoto, type MapBase, type MapPhoto, type MapRoute } from '../engine/routeMap';
import { routeSheetParts, routeSheetStage, type RouteSheetPart, type RouteSheetStage } from '../engine/routeSheet';

const CONSENT_LIMIT_MS = 3000;
export const SOURCE_NAME = { brouter: 'BRouter', valhalla: 'Valhalla' } as const;

type StartAnswer = { ok: true; point: RoutePoint } | { ok: false; line: string };

export interface RouteSearchModel {
  stage: RouteSheetStage;
  lat: number | undefined;
  lon: number | undefined;
  target: RouteTarget;
  // Waar de lus begint, in elke stand.
  startLine: string;
  // De eerste vraag en Vast punt zonder punt.
  choose: (next: RouteStartMode) => Promise<void>;
  startHere: () => Promise<void>;
  locating: boolean;
  declineExact: () => void;
  // De lussen, als ze er zijn.
  order: RouteStyle[];
  plans: Record<RouteStyle, PlanOutcome> | undefined;
  okStyles: RouteStyle[];
  picked: RouteStyle | undefined;
  pickedOutcome: PlanOutcome | undefined;
  setChosen: (style: RouteStyle) => void;
  // De kaart.
  mapRoutes: MapRoute[];
  mapStartPoint: RoutePoint | undefined;
  base: MapBase;
  // Kaart of Luchtfoto (instelling Kaart of luchtfoto); setPhoto bewaart de keuze van de schakelaar op de kaart.
  photo: MapPhoto;
  setPhoto: (v: MapPhoto) => void;
  hereMode: boolean;
  noMap: boolean;
  markNoMap: () => void;
  startOnMap: (from: { tap: RoutePoint } | 'here') => Promise<StartAnswer>;
  // Tijdens het zoeken.
  steps: ReturnType<typeof searchSteps>;
  currentStep: SearchStep;
  limitLine: string;
  // Na het zoeken.
  foundLines: string[];
  sources: string[];
  parts: RouteSheetPart[];
  retry: () => void;
  // De weg naar de app van je horloge op dit toestel; null: alleen GPX downloaden.
  sender: FileSender | null;
}

export function useRouteSearch({ template, date, closing = false, enabled = true }: { template: SessionTemplate; date: string; closing?: boolean; enabled?: boolean }): RouteSearchModel {
  const { settings, program, sessionLogs, updateSettings } = useAppData();
  const place = settings.homeLocation;
  const lat = place?.lat;
  const lon = place?.lon;
  const [consent, setConsent] = useState<boolean | undefined>();
  const [found, setFound] = useState<{ key: string; result: RouteSearch } | undefined>();
  const [attempt, setAttempt] = useState(0);
  // Het eigen startpunt (de plek Thuis): undefined zolang we lezen, null als er geen is.
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
    if (closing || !enabled || !asked || !hereMode || saved === undefined || here?.attempt === attempt) return;
    const stop = new AbortController();
    const closed = locateStop.current.signal;
    // Eén vraag om de plek, met dezelfde grens van 50 m als een vast punt; er wordt niets bewaard.
    void locateStartHere({ persist: false, signal: closed }).then((result) => {
      if (!stop.signal.aborted && !closed.aborted && mounted.current) setHere({ attempt, found: result });
    });
    return () => stop.abort();
  }, [closing, enabled, asked, hereMode, saved, attempt, here?.attempt]);

  // Eén zoektocht per plek, training en poging; zolang het antwoord van deze sleutel er niet is, zoekt het paneel.
  const key = `${attempt}|${lat}|${lon}|${exactLat}|${exactLon}|${terrainLat}|${terrainLon}|${distanceKm}|${ascentM}`;
  const search: RouteSearch | 'busy' = found?.key === key ? found.result : 'busy';

  useEffect(() => {
    if (closing || !enabled || !asked || !startReady || lat === undefined || lon === undefined) return;
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
  }, [closing, enabled, asked, startReady, lat, lon, exactLat, exactLon, terrainLat, terrainLon, distanceKm, ascentM, key]);

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
  async function startOnMap(from: { tap: RoutePoint } | 'here'): Promise<StartAnswer> {
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

  const [sender] = useState(routeSender);

  const stage = routeSheetStage({
    hasPlace: lat !== undefined && lon !== undefined,
    consent,
    asked,
    savedKnown: saved !== undefined,
    waitingForPoint: waitingForPoint && !mapStart,
    search,
  });

  const order: RouteStyle[] = first === 'simple' ? ['simple', 'adventure'] : ['adventure', 'simple'];
  const plans = search !== 'busy' && search.kind === 'plans' ? search.plans : undefined;
  const sources = plans ? [...new Set(order.flatMap((s) => { const o = plans[s]; return o.ok ? [SOURCE_NAME[o.proposal.source]] : []; }))] : [];
  const okStyles = plans ? order.filter((s) => plans[s].ok) : [];
  const picked = chosen && okStyles.includes(chosen) ? chosen : okStyles[0];
  const pickedOutcome = plans && picked ? plans[picked] : undefined;
  const mapRoutes = plans ? okStyles.flatMap((s) => { const o = plans[s]; return o.ok ? [{ style: s, points: o.proposal.points }] : []; }) : [];
  const pickedRoute = mapRoutes.find((r) => r.style === picked);
  const mapStartPoint = pickedRoute?.points[0] ?? exactPoint ?? (lat !== undefined && lon !== undefined ? roundStart({ lat, lon }) : undefined);

  return {
    stage,
    lat,
    lon,
    target,
    startLine,
    choose,
    startHere,
    locating,
    declineExact: () => setDeclinedExact(true),
    order,
    plans,
    okStyles,
    picked,
    pickedOutcome,
    setChosen,
    mapRoutes,
    mapStartPoint,
    base: resolveMapBase(settings.routeMapBase),
    photo: resolveMapPhoto(settings.routeMapPhoto),
    setPhoto: (v) => void updateSettings({ routeMapPhoto: v }).catch(() => undefined),
    hereMode,
    noMap: noMapKey === key,
    markNoMap: () => setNoMapKey(key),
    startOnMap,
    steps: searchSteps(hereMode),
    currentStep: locatingHere ? 'locate' : step?.key === key ? step.step : 'terrain',
    limitLine: searchLimitLine(hereMode ? START_LOCATE_LIMIT_MS : undefined, PROPOSAL_LIMIT_MS),
    foundLines: plans ? searchLines(plans, target) : [],
    sources,
    parts: routeSheetParts(stage, plans ? { anyOk: okStyles.length > 0, anyFailed: order.some((s) => !plans[s].ok) } : undefined),
    retry: () => setAttempt((n) => n + 1),
    sender,
  };
}

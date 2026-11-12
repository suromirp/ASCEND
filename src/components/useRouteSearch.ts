// ASCEND: de regie van Route voorstellen, los van wat er getekend wordt. De eerste vraag, het startpunt
// (de chips Start bij: Waar je nu bent of Thuis; Ongeveer uit de instelling; een getikt punt op de kaart), de zoektocht met zijn grens in tijd en
// de gekozen lus. Stond eerst in components/RoutePanel.tsx; nu delen het blad Route en de Briefing
// (components/TrainingBriefing.tsx, spoor 5) dezelfde regie, en het blad achter Groter in de Briefing
// dezelfde staat: de lus die je daar kiest, is de lus in de Briefing, zonder tweede zoektocht.
//
// `enabled`: of er gezocht mag worden. De Briefing zet hem pas aan bij het openen (instelling Lus
// zoeken, vandaag en morgen) of na een tik; tot dan gaat er niets de deur uit, ook geen vraag om je
// plek. `closing`: het blad of scherm gaat dicht; dan stopt het zoeken meteen.
// Een tik op een chip of Start hier geldt voor deze training en wordt niet bewaard; alleen Maak dit Thuis
// bewaart iets (besluit 2026-11-11-route-start.md). Plant niets en bewaart geen lus.

import { useEffect, useRef, useState } from 'react';
import type { SessionTemplate } from '../models/training';
import type { RoutePoint, RouteStyle, RouteTarget } from '../models/route';
import { useAppData } from '../state/AppDataContext';
import { judgmentOptions, pacesFromLogs } from '../engine/testJudgment';
import { resolveRouteStyle, roundStart, routeTarget } from '../engine/routeTarget';
import { searchLines, type PlanOutcome } from '../engine/routePlanner';
import { findRoutes, grantRouteConsent, hasRouteConsent, PROPOSAL_LIMIT_MS, type RouteSearch, type RouteSearchStep } from '../storage/routeProposal';
import { locateAnswerCounts, planStart, resolveRouteStart, roundExact, roundHere, startFailureReason, type RouteStartMode, type StartPick } from '../engine/routeStart';
import { getRouteStartPoint, locateStartHere, saveRouteStartPoint, START_LOCATE_LIMIT_MS, startFromMap, type StartLocation } from '../storage/routeStart';
import { homeFromStartPoint, startChoices, type StartChip } from '../engine/places';
import { todayISO } from '../utils/dates';
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
  // Alleen bij een terugval of een afwijking van de chip (Thuis ontbreekt, je plek lukte niet, Ongeveer, een getikt punt); anders leeg.
  startLine: string;
  // De chips Start bij (engine/places.ts#startChoices) en welke gekozen is; een tik geldt voor deze training.
  startChips: StartChip[];
  startChip: StartPick;
  pickStart: (next: StartPick) => void;
  // Je eigen plek als stip: alleen de precieze plek die de zoektocht al vond (50 m of beter).
  mePoint: RoutePoint | undefined;
  // Maak dit Thuis bij een getikt punt: het enige dat hier iets bewaart.
  hasHome: boolean;
  makeHome: ((point: RoutePoint) => Promise<boolean>) | undefined;
  // Het getikte punt waar de lus nu begint (Start hier), voor Bewaar als plek.
  tapPoint: RoutePoint | undefined;
  // De eerste vraag.
  choose: (next: RouteStartMode) => Promise<void>;
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
  // Kaart of Luchtfoto (de stand Luchtfoto van de instelling Ondergrond, engine/routeMap.ts#resolveMapGround); setPhoto bewaart de keuze van de schakelaar op de kaart.
  photo: MapPhoto;
  setPhoto: (v: MapPhoto) => void;
  hereMode: boolean;
  noMap: boolean;
  markNoMap: () => void;
  startOnMap: (from: { tap: RoutePoint }) => Promise<StartAnswer>;
  // Tijdens het zoeken. `searchKey` wisselt bij elke nieuwe zoektocht (ook na een tik op een chip): de balk begint dan opnieuw.
  steps: ReturnType<typeof searchSteps>;
  currentStep: SearchStep;
  limitLine: string;
  limitMs: number;
  searchKey: string;
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
  // Het eigen startpunt (de plek Thuis): undefined zolang we lezen, null als er geen is, 'unread' als
  // de opslag niet op tijd of met een fout antwoordde (dan nooit raden dat er geen Thuis is).
  const [stored, setSaved] = useState<RoutePoint | null | 'unread' | undefined>();
  const homeUnread = stored === 'unread';
  const saved = stored === 'unread' ? null : stored;
  // Een tik op een chip Start bij: voor deze training, niet bewaard.
  const [startPicked, setStartPicked] = useState<StartPick | undefined>();
  // Start hier: een getikt punt, alleen voor deze zoektocht; niet bewaard.
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
  // De poging waarvoor je plek al gevraagd is: nooit een tweede vraag in dezelfde poging, ook niet na een tik op een chip.
  const askedFor = useRef<number | undefined>(undefined);
  useEffect(() => {
    mounted.current = true;
    // Een nieuwe controller per mount: in StrictMode draait dit twee keer, en een afgebroken signaal van de
    // eerste ronde zou elke locatievraag en Start hier daarna weggooien (Warden).
    const stop = new AbortController();
    locateStop.current = stop;
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
      // Trage of kapotte opslag: Thuis is onbekend, niet afwezig. De regel zegt dat; Maak dit Thuis staat er dan niet.
      if (alive) setSaved('unread');
    });
    return () => {
      alive = false;
    };
  }, []);

  const mode = resolveRouteStart(settings.routeStart);
  // Wie al ja zei voor er een keuze voor het startpunt was, krijgt de vraag nog één keer: zonder keuze
  // zou de lus stil op Ongeveer blijven en zie je Thuis, vanaf je deur nooit.
  const asked = consent === true && settings.routeStart !== undefined;
  const homePlace = saved ? homeFromStartPoint(saved, todayISO()) : undefined;
  const chips = startChoices(mode, homePlace ? [homePlace] : []).chips.filter((c) => c.kind === 'here' || c.kind === 'home');
  // Je plek van deze poging (één vraag per poging), of de reden dat het niet lukte.
  const hereFound = here?.attempt === attempt ? here.found : undefined;
  const plan = stored === undefined ? undefined : planStart({ mode, home: saved, homeUnread, picked: startPicked, tap: mapStart, found: hereFound });
  // Waar je nu bent: je plek komt als eerste stap in de zoekstand.
  // Ook na een terugval op Thuis blijft je plek een (afgevinkte) stap: de stappen springen dan niet.
  const hereMode = plan !== undefined && plan.kind !== 'tap' && (plan.kind === 'locate' || hereFound !== undefined);
  const locatingHere = plan?.kind === 'locate';
  const exactPoint = plan && 'point' in plan ? plan.point : undefined;
  const exactLat = exactPoint?.lat;
  const exactLon = exactPoint?.lon;
  // Heuvels rond je plek van nu op ongeveer 100 m; rond Thuis of een getikt punt op dat punt.
  const terrainAt = plan?.kind === 'here' ? roundHere(plan.point) : undefined;
  const terrainLat = terrainAt?.lat;
  const terrainLon = terrainAt?.lon;
  const startReady = plan !== undefined && !locatingHere;
  const startLine = plan?.line ?? '';

  // Sluiten stopt ook een vraag om je plek die nog loopt: daarna gaat er niets meer uit.
  useEffect(() => {
    if (closing) locateStop.current.abort();
  }, [closing]);

  useEffect(() => {
    if (closing || !enabled || !asked || !locatingHere || askedFor.current === attempt) return;
    askedFor.current = attempt;
    const closed = locateStop.current.signal;
    // Eén vraag om de plek, met dezelfde grens van 50 m als Thuis; er wordt niets bewaard. Een tik op een
    // chip breekt deze vraag niet af: het antwoord blijft voor deze poging, zodat terug naar Waar je nu bent geen tweede vraag is.
    void locateStartHere({ persist: false, signal: closed }).then((result) => {
      // Alleen voor de poging die hem stelde: een laat antwoord van een oude poging overschrijft het nieuwe nooit.
      if (!closed.aborted && mounted.current && locateAnswerCounts(askedFor.current, attempt)) setHere({ attempt, found: result });
    });
  }, [closing, enabled, asked, locatingHere, attempt]);

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

  // Start hier: het getikte punt geldt voor deze zoektocht en wordt niet bewaard; Thuis verschuift niet.
  async function startOnMap(from: { tap: RoutePoint }): Promise<StartAnswer> {
    const found = await startFromMap(from, { signal: locateStop.current.signal });
    if (!found.ok) return { ok: false, line: startFailureReason(found.reason) };
    if (mounted.current) setMapStart(found.point);
    return found;
  }

  // Een chip: voor deze training. Een getikt punt vervalt; de zoektocht die liep stopt (nieuwe sleutel).
  function pickStart(next: StartPick) {
    setMapStart(undefined);
    setStartPicked(next);
    // Waar je nu bent na een mislukte plek: een tik is een nieuwe poging, met één nieuwe vraag om je plek.
    if (next === 'here' && hereFound && !hereFound.ok && mode !== 'approx') setAttempt((n) => n + 1);
  }

  // Maak dit Thuis: bewust, bij een getikt punt. Thuis verhuist (naam en routes blijven); de instelling blijft.
  async function makeHome(point: RoutePoint): Promise<boolean> {
    const ok = await withTimeout(saveRouteStartPoint(point, 'map'), START_LOCATE_LIMIT_MS).catch(() => false);
    if (ok && mounted.current) setSaved(roundExact(point));
    return ok;
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
    startChips: chips,
    startChip: plan?.chip ?? (mode === 'exact' && saved ? 'home' : 'here'),
    pickStart,
    mePoint: hereFound?.ok ? hereFound.point : undefined,
    hasHome: !!saved,
    // Thuis niet gelezen: geen Bewaar als plek, want Maak dit Thuis zou een bestaand Thuis zonder zin verhuizen.
    makeHome: homeUnread ? undefined : makeHome,
    tapPoint: mapStart,
    choose,
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
    limitMs: (hereMode && hereFound === undefined ? START_LOCATE_LIMIT_MS : 0) + PROPOSAL_LIMIT_MS,
    // Per zoektocht van jou (poging, getikte chip, getikt punt), niet per stap of terugval: je plek vinden begint geen nieuwe balk.
    searchKey: `${attempt}|${startPicked}|${mapStart?.lat}|${mapStart?.lon}`,
    foundLines: plans ? searchLines(plans, target) : [],
    sources,
    parts: routeSheetParts(stage, plans ? { anyOk: okStyles.length > 0, anyFailed: order.some((s) => !plans[s].ok) } : undefined),
    retry: () => setAttempt((n) => n + 1),
    sender,
  };
}

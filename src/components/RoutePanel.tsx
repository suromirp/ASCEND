// ASCEND: twee lussen voor een looptraining (engine/routePlanner.ts): Simpel en Avontuurlijk, elk
// met afstand, hoogtemeters en een GPX-bestand. De eerste keer vraagt het paneel of ASCEND mag
// zoeken, met wat er de deur uit gaat. Zoeken heeft een grens in tijd; zonder netwerk staat er één
// rustige regel. Het paneel rekent zelf niets en plant niets: een route is alleen om te lopen.

import { useEffect, useRef, useState } from 'react';
import type { SessionTemplate } from '../models/training';
import type { RoutePoint, RouteProposal, RouteStyle } from '../models/route';
import { useAppData } from '../state/AppDataContext';
import { judgmentOptions, pacesFromLogs } from '../engine/testJudgment';
import { resolveRouteStyle, routeTarget, targetText } from '../engine/routeTarget';
import { MIN_ASCENT_TARGET_M, proposalFacts, proposalNotes, proposalTitle, type PlanOutcome } from '../engine/routePlanner';
import { gpxCourseName, routeGpx } from '../engine/gpx';
import { SAVE_HINT, SEND_HINT, SEND_LABEL, WATCH_STEPS, WATCH_STEPS_TITLE, sendLine, type RouteSendOutcome } from '../engine/routeSend';
import { findRoutes, grantRouteConsent, hasRouteConsent, type RouteSearch } from '../storage/routeProposal';
import { chooseStart, resolveRouteStart, START_LINE_APPROX, START_LINE_EXACT, startFailureLine, type StartFailure } from '../engine/routeStart';
import { getRouteStartPoint, locateStartHere } from '../storage/routeStart';
import { saveRouteGpx, type RouteFileResult } from '../storage/routeFile';
import { routeSender, sendRouteGpx } from '../storage/routeSend';
import type { FileSender } from '../integrations/fileSender';
import { OSM_COPYRIGHT } from '../integrations/overpass';
import { withTimeout } from '../utils/withTimeout';
import { TextButton } from './TextButton';
import { Eyebrow } from './ui';

const CONSENT_LIMIT_MS = 3000;
const STYLE_NAME: Record<RouteStyle, string> = { simple: 'Simpel', adventure: 'Avontuurlijk' };
const STYLE_LINE: Record<RouteStyle, string> = {
  simple: 'Dezelfde helling op en af.',
  adventure: 'Eén lus langs verschillende hellingen en paden.',
};
const SOURCE_NAME = { brouter: 'BRouter', valhalla: 'Valhalla' } as const;

function failureText(style: RouteStyle, outcome: Extract<PlanOutcome, { ok: false }>, flat: boolean): string {
  if (outcome.reason === 'nothing' || outcome.reason === 'unmapped') return style === 'simple' ? (flat ? 'Geen pad gevonden vanaf je plek.' : 'Geen helling gevonden die bij je training past.') : 'Geen lus gevonden vanaf je plek.';
  return 'De routeplanner antwoordde niet.';
}

function RouteBlock({ style, outcome, primary, date, target, sender }: { style: RouteStyle; outcome: PlanOutcome; primary: boolean; date: string; target: Parameters<typeof proposalNotes>[1]; sender: FileSender | null }) {
  // De laatste uitkomst van een van de twee knoppen; 'busy' zolang er een loopt (beide hebben een grens in tijd).
  const [done, setDone] = useState<{ send: RouteSendOutcome } | { file: RouteFileResult } | 'busy' | undefined>();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const gpx = (p: RouteProposal) => routeGpx(p.points, gpxCourseName(style, p.distanceM));

  async function download(p: RouteProposal) {
    setDone('busy');
    const file = await saveRouteGpx(gpx(p), style, date);
    if (mounted.current) setDone({ file });
  }

  async function send(p: RouteProposal) {
    setDone('busy');
    const result = await sendRouteGpx(gpx(p), style, date, sender);
    if (mounted.current) setDone({ send: result });
  }

  const line = done === undefined || done === 'busy'
    ? undefined
    : 'send' in done
      ? sendLine(done.send)
      : !done.file.ok
        ? { text: 'Opslaan lukte niet. Probeer het nog eens.', warn: true }
        : { text: done.file.where === 'folder' ? `Opgeslagen als ${done.file.name} in ${done.file.label}.` : `Gedownload als ${done.file.name}.`, warn: false };

  return (
    <div className="flex flex-col gap-1 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
      <Eyebrow tone="var(--color-ink-dim)">{STYLE_NAME[style]}</Eyebrow>
      {outcome.ok ? (
        <>
          <p className="text-base font-medium leading-snug" style={{ color: 'var(--color-ink)' }}>{proposalTitle(outcome.proposal)}</p>
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{proposalFacts(outcome.proposal)}</p>
          {proposalNotes(outcome.proposal, target).map((note) => (
            <p key={note} className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{note}</p>
          ))}
          <div className="flex flex-wrap gap-x-5">
            {sender && <TextButton tone={primary ? 'action' : 'dim'} disabled={done === 'busy'} onClick={() => void send(outcome.proposal)}>{SEND_LABEL}</TextButton>}
            <TextButton tone={primary && !sender ? 'action' : 'dim'} disabled={done === 'busy'} onClick={() => void download(outcome.proposal)}>GPX downloaden</TextButton>
          </div>
          <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{sender ? SEND_HINT : SAVE_HINT}</p>
          <p role="status" className="min-h-[34px] text-xs leading-snug" style={{ color: line?.warn ? 'var(--color-warning)' : 'var(--color-ink-dim)' }}>{line?.text ?? ''}</p>
        </>
      ) : (
        <>
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{STYLE_LINE[style]}</p>
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{failureText(style, outcome, target.ascentM < MIN_ASCENT_TARGET_M)}</p>
        </>
      )}
    </div>
  );
}

// Van Garmin Connect naar het horloge: drie stappen achter een tik, onder de lussen.
function WatchSteps() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <TextButton tone="dim" icon="omlaag" flipped={open} aria-expanded={open} onClick={() => setOpen((v) => !v)}>{WATCH_STEPS_TITLE}</TextButton>
      {open && (
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          {WATCH_STEPS.map((step) => <li key={step}>{step}</li>)}
        </ol>
      )}
    </div>
  );
}

export function RoutePanel({ template, date, onDecline }: { template: SessionTemplate; date: string; onDecline: () => void }) {
  const { settings, program, sessionLogs, updateSettings } = useAppData();
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
  // Precies zonder punt vraagt eerst om een punt, tenzij dit paneel op Ongeveer terugviel.
  const waitingForPoint = choice?.kind === 'needs-point' && !fellBack && !declinedExact;
  const exactLat = choice?.kind === 'exact' ? choice.point.lat : undefined;
  const exactLon = choice?.kind === 'exact' ? choice.point.lon : undefined;
  const startReady = choice !== undefined && !waitingForPoint;

  // Eén zoektocht per plek, training en poging; zolang het antwoord van deze sleutel er niet is, zoekt het paneel.
  const key = `${attempt}|${lat}|${lon}|${exactLat}|${exactLon}|${distanceKm}|${ascentM}`;
  const search: RouteSearch | 'busy' = found?.key === key ? found.result : 'busy';

  useEffect(() => {
    if (!asked || !startReady || lat === undefined || lon === undefined) return;
    const stop = new AbortController();
    // findRoutes heeft zelf een grens in tijd en gooit nooit: de regel "Zoeken" blijft nooit staan.
    void findRoutes({ lat, lon }, { distanceKm, ascentM }, { signal: stop.signal }, exactLat !== undefined && exactLon !== undefined ? { lat: exactLat, lon: exactLon } : undefined).then((result) => {
      if (!stop.signal.aborted) setFound({ key, result });
    });
    // Sluit het paneel of begint een nieuwe zoektocht, dan gaat er voor deze geen aanroep meer de deur uit.
    return () => stop.abort();
    // De sleutel bevat het punt; de afhankelijkheden zijn dezelfde getallen.
  }, [asked, startReady, lat, lon, exactLat, exactLon, distanceKm, ascentM, key]);

  // Gebruik waar ik nu ben: één keer, met een grens in tijd. Lukt het niet, dan zoekt het paneel ongeveer.
  async function startHere() {
    setLocating(true);
    const found = await locateStartHere({ signal: locateStop.current.signal });
    if (!mounted.current) return;
    setLocating(false);
    if (found.ok) setSaved(found.point);
    else setFellBack(found.reason);
  }

  async function choose(next: 'approx' | 'exact') {
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

  if (lat === undefined || lon === undefined) {
    return <p className="text-sm leading-snug" style={dim}>Kies eerst een plaats bij Instellingen, Vandaag en meldingen, Plaats. Daar begint de lus.</p>;
  }
  if (consent === undefined) return <p role="status" className="min-h-[20px] text-sm" style={dim} />;
  if (!asked) {
    return (
      <div className="flex flex-col">
        <p className="text-sm leading-snug" style={dim}>Een lus zoeken voor deze training? Kies waar de lus begint. Er gaat geen naam of adres mee.</p>
        <TextButton onClick={() => void choose('exact')}>Precies, vanaf je deur</TextButton>
        <p className="text-xs leading-snug" style={dim}>
          Je precieze startpunt gaat naar de routeplanner (BRouter, anders Valhalla van FOSSGIS). Heuvels en paden zoekt OpenStreetMap op je plek, afgerond op ongeveer een kilometer. Het punt wordt alleen op dit toestel bewaard.
        </p>
        <TextButton tone="dim" onClick={() => void choose('approx')}>Ongeveer</TextButton>
        <p className="text-xs leading-snug" style={dim}>
          Je plek, afgerond op ongeveer een kilometer, gaat naar de routeplanner (BRouter, anders Valhalla van FOSSGIS) en naar OpenStreetMap. De lus begint dan tot ongeveer 700 m van je deur.
        </p>
        <div className="flex flex-wrap gap-x-5">
          <TextButton tone="dim" onClick={onDecline}>Liever niet</TextButton>
        </div>
      </div>
    );
  }

  if (saved === undefined) return <p role="status" className="min-h-[20px] text-sm" style={dim} />;
  if (waitingForPoint) {
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
  const anyFailed = plans ? order.some((s) => !plans[s].ok) : false;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-snug" style={dim}>Je training: {targetText(target)}. {fellBack ? startFailureLine(fellBack) : exactLat !== undefined ? START_LINE_EXACT : START_LINE_APPROX}</p>
      <p role="status" className="text-sm leading-snug" style={dim}>
        {search === 'busy'
          ? 'Zoeken naar een lus. Dat duurt hoogstens een halve minuut.'
          : search.kind === 'offline'
            ? 'Zonder netwerk is er geen route. Probeer het later nog eens.'
            : search.kind === 'timeout'
              ? 'De routeplanner antwoordde niet op tijd. Probeer het later nog eens.'
              : ''}
      </p>
      {plans && order.map((s, i) => <RouteBlock key={s} style={s} outcome={plans[s]} primary={i === 0} date={date} target={target} sender={sender} />)}
      {plans && order.some((s) => plans[s].ok) && <WatchSteps />}
      {search !== 'busy' && (search.kind !== 'plans' || anyFailed) && (
        <div><TextButton tone="dim" onClick={() => setAttempt((n) => n + 1)}>Opnieuw zoeken</TextButton></div>
      )}
      {plans && (
        <div>
          <p className="text-xs leading-snug" style={dim}>
            Kaartgegevens van OpenStreetMap{sources.length > 0 ? `. Route van ${sources.join(' en ')}.` : '.'} Kijk zelf of een pad begaanbaar is.
          </p>
          <a href={OSM_COPYRIGHT} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center text-xs underline underline-offset-2" style={dim}>Licentie van OpenStreetMap</a>
        </div>
      )}
    </div>
  );
}

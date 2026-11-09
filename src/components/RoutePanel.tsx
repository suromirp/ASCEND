// ASCEND: twee lussen voor een looptraining (engine/routePlanner.ts): Simpel en Avontuurlijk, elk
// met afstand, hoogtemeters en een GPX-bestand. De eerste keer vraagt het paneel of ASCEND mag
// zoeken, met wat er de deur uit gaat. Zoeken heeft een grens in tijd; zonder netwerk staat er één
// rustige regel. Het paneel rekent zelf niets en plant niets: een route is alleen om te lopen.

import { useEffect, useState } from 'react';
import type { SessionTemplate } from '../models/training';
import type { RouteProposal, RouteStyle } from '../models/route';
import { useAppData } from '../state/AppDataContext';
import { judgmentOptions, pacesFromLogs } from '../engine/testJudgment';
import { resolveRouteStyle, routeTarget, targetText } from '../engine/routeTarget';
import { proposalFacts, proposalNotes, proposalTitle, type PlanOutcome } from '../engine/routePlanner';
import { routeGpx } from '../engine/gpx';
import { findRoutes, grantRouteConsent, hasRouteConsent, type RouteSearch } from '../storage/routeProposal';
import { saveRouteGpx, type RouteFileResult } from '../storage/routeFile';
import { OSM_COPYRIGHT } from '../integrations/overpass';
import { TextButton } from './TextButton';
import { Eyebrow } from './ui';

const STYLE_NAME: Record<RouteStyle, string> = { simple: 'Simpel', adventure: 'Avontuurlijk' };
const STYLE_LINE: Record<RouteStyle, string> = {
  simple: 'Dezelfde helling op en af.',
  adventure: 'Eén lus langs verschillende hellingen en paden.',
};
const SOURCE_NAME = { brouter: 'BRouter', valhalla: 'Valhalla' } as const;

function failureText(style: RouteStyle, outcome: Extract<PlanOutcome, { ok: false }>): string {
  if (outcome.reason === 'nothing' || outcome.reason === 'unmapped') return style === 'simple' ? 'Geen helling gevonden die bij je training past.' : 'Geen lus gevonden vanaf je plek.';
  return 'De routeplanner antwoordde niet.';
}

function RouteBlock({ style, outcome, primary, name, date, target }: { style: RouteStyle; outcome: PlanOutcome; primary: boolean; name: string; date: string; target: Parameters<typeof proposalNotes>[1] }) {
  const [saved, setSaved] = useState<RouteFileResult | 'busy' | undefined>();

  async function download(p: RouteProposal) {
    setSaved('busy');
    setSaved(await saveRouteGpx(routeGpx(p.points, `${name} · ${STYLE_NAME[style]}`), style, date));
  }

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
          <div>
            <TextButton tone={primary ? 'action' : 'dim'} disabled={saved === 'busy'} onClick={() => void download(outcome.proposal)}>GPX downloaden</TextButton>
          </div>
          <p role="status" className="text-xs leading-snug" style={{ color: saved && saved !== 'busy' && !saved.ok ? 'var(--color-warning)' : 'var(--color-ink-dim)' }}>
            {saved === undefined || saved === 'busy' ? '' : !saved.ok ? 'Opslaan lukte niet. Probeer het nog eens.' : saved.where === 'folder' ? `Opgeslagen als ${saved.name} in ${saved.label}.` : `Gedownload als ${saved.name}.`}
          </p>
        </>
      ) : (
        <>
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{STYLE_LINE[style]}</p>
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{failureText(style, outcome)}</p>
        </>
      )}
    </div>
  );
}

export function RoutePanel({ template, date, onDecline }: { template: SessionTemplate; date: string; onDecline: () => void }) {
  const { settings, program, sessionLogs } = useAppData();
  const place = settings.homeLocation;
  const lat = place?.lat;
  const lon = place?.lon;
  const [consent, setConsent] = useState<boolean | undefined>();
  const [found, setFound] = useState<{ key: string; result: RouteSearch } | undefined>();
  const [attempt, setAttempt] = useState(0);
  const first = resolveRouteStyle(settings.routeStyle);
  const target = routeTarget({ template, date, program, logs: sessionLogs, testPace: pacesFromLogs(sessionLogs, judgmentOptions(settings)).paces?.easy });
  const { distanceKm, ascentM } = target;

  useEffect(() => {
    let alive = true;
    void hasRouteConsent().then((ok) => {
      if (alive) setConsent(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Eén zoektocht per plek, training en poging; zolang het antwoord van deze sleutel er niet is, zoekt het paneel.
  const key = `${attempt}|${lat}|${lon}|${distanceKm}|${ascentM}`;
  const search: RouteSearch | 'busy' = found?.key === key ? found.result : 'busy';

  useEffect(() => {
    if (!consent || lat === undefined || lon === undefined) return;
    let alive = true;
    // findRoutes heeft zelf een grens in tijd en gooit nooit: de regel "Zoeken" blijft nooit staan.
    void findRoutes({ lat, lon }, { distanceKm, ascentM }).then((result) => {
      if (alive) setFound({ key, result });
    });
    return () => {
      alive = false;
    };
  }, [consent, lat, lon, distanceKm, ascentM, key]);

  const dim = { color: 'var(--color-ink-dim)' };

  if (lat === undefined || lon === undefined) {
    return <p className="text-sm leading-snug" style={dim}>Kies eerst een plaats bij Instellingen, Vandaag en meldingen, Plaats. Daar begint de lus.</p>;
  }
  if (consent === undefined) return <p role="status" className="min-h-[20px] text-sm" style={dim} />;
  if (!consent) {
    return (
      <div className="flex flex-col">
        <p className="text-sm leading-snug" style={dim}>
          Een lus zoeken voor deze training? Daarvoor gaat je plek, afgerond op ongeveer een kilometer, naar de routeplanner BRouter en naar OpenStreetMap. Er gaat geen naam of adres mee.
        </p>
        <div className="flex flex-wrap gap-x-5">
          <TextButton tone="dim" onClick={onDecline}>Liever niet</TextButton>
          <TextButton onClick={() => { void grantRouteConsent().then(() => setConsent(true)); }}>Ja, zoek</TextButton>
        </div>
      </div>
    );
  }

  const order: RouteStyle[] = first === 'simple' ? ['simple', 'adventure'] : ['adventure', 'simple'];
  const plans = search !== 'busy' && search.kind === 'plans' ? search.plans : undefined;
  const sources = plans ? [...new Set(order.flatMap((s) => { const o = plans[s]; return o.ok ? [SOURCE_NAME[o.proposal.source]] : []; }))] : [];
  const anyFailed = plans ? order.some((s) => !plans[s].ok) : false;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-snug" style={dim}>Je training: {targetText(target)}. De lus begint bij je plek, afgerond op ongeveer een kilometer.</p>
      <p role="status" className="text-sm leading-snug" style={dim}>
        {search === 'busy'
          ? 'Zoeken naar een lus. Dat duurt hoogstens een halve minuut.'
          : search.kind === 'offline'
            ? 'Zonder netwerk is er geen route. Probeer het later nog eens.'
            : search.kind === 'timeout'
              ? 'De routeplanner antwoordde niet op tijd. Probeer het later nog eens.'
              : ''}
      </p>
      {plans && order.map((s, i) => <RouteBlock key={s} style={s} outcome={plans[s]} primary={i === 0} name={template.name} date={date} target={target} />)}
      {search !== 'busy' && (search.kind !== 'plans' || anyFailed) && (
        <div><TextButton tone="dim" onClick={() => setAttempt((n) => n + 1)}>Opnieuw zoeken</TextButton></div>
      )}
      {plans && (
        <p className="text-xs leading-snug" style={dim}>
          Kaartgegevens van{' '}
          <a href={OSM_COPYRIGHT} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center underline underline-offset-2" style={dim}>OpenStreetMap</a>
          {sources.length > 0 ? `. Route van ${sources.join(' en ')}.` : '.'} Kijk zelf of een pad begaanbaar is.
        </p>
      )}
    </div>
  );
}

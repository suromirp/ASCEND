// ASCEND: de Briefing, het scherm vooraf voor een loop buiten (spoor 5 en 6 van
// docs/visie/Ontwerp Route en trainingsscherm.md, besluit docs/beslissingen/2026-11-11-briefing.md).
//
// Je horloge logt en vinkt af; dit scherm is de voorbereiding. Van boven naar onder: de lage lucht met
// de naam en de i (Waar om deze training), Waar train je? als een rij keuzes, op de plek van de kaart
// de kaart met je lus (of bij Loopband wat je op de band instelt), de gekozen lus, en vier vakken: wat
// je loopt, je horloge, weer en kleding, eten en drinken. Onder de vouw Voor en na, Stop of schakel
// terug als, en de stand (je horloge vinkt af, met Zelf invullen). Onderbalk: Horloge, en de ene mint
// knop Route naar Garmin Connect (of Zelf invullen, of Sluiten).
//
// Rendert alleen wat engine/briefing.ts zegt. De zoektocht is de regie van het blad Route
// (useRouteSearch), met een lagere kaart; Groter opent dat blad met dezelfde regie, dus dezelfde lus.
// Zoeken gebeurt bij het openen (vandaag en morgen, instelling Lus zoeken) of na een tik, en stopt
// zodra je van Buiten weggaat of het scherm sluit. Plant niets.

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PlannedSession, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { RouteStyle } from '../models/route';
import { useAppData } from '../state/AppDataContext';
import { placeTransition, BRIEFING_TEXT, type BriefingTile, type BriefingView } from '../engine/briefing';
import { isSportEnabled, sessionKindLabel } from '../engine/sports';
import { fuelCardLines, fuelForTraining, fuelOn } from '../engine/fuelOnTheGo';
import { drinkLine } from '../engine/eveningBefore';
import { resolveEffectiveFullDuration } from '../engine/substitutions';
import { buildWorkoutPlan } from '../engine/workoutPlan';
import { buildSessionBrief } from '../engine/sessionBrief';
import { modalitySport } from '../data/modalities';
import { failureLine, MIN_ASCENT_TARGET_M, proposalFacts, proposalNotes, proposalTitle } from '../engine/routePlanner';
import { BRIEFING_MAP_HEIGHT, loopLines, routeOutcomeLine } from '../engine/routeSheet';
import { durationLabel } from '../engine/sessionBrief';
import { gpxCourseName, routeGpx } from '../engine/gpx';
import type { RouteSendOutcome } from '../engine/routeSend';
import { getTrainingGuide, guideDayLabel } from '../data/trainingGuide';
import { getTrainingPlace, peekTrainingPlaces, saveTrainingPlace } from '../storage/trainingPlace';
import { saveRouteGpx, type RouteFileResult } from '../storage/routeFile';
import { sendRouteGpx } from '../storage/routeSend';
import { addDays, formatDateNL, todayISO, weekdayShortNL } from '../utils/dates';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { SkyBand } from './SkyBand';
import { Card, Chip, Eyebrow, InfoButton, PrimaryButton, SecondaryButton, SheetGrip, ZoneBar } from './ui';
import { TextButton } from './TextButton';
import { Icon } from './icons';
import { SheetHeader } from './SheetHeader';
import { TodaySheet } from './vandaag/TodaySheet';
import { TrainingGuideSheet } from './TrainingGuideSheet';
import { WatchSheet } from './WatchSheet';
import { useWatchSheet } from './useWatchSheet';
import { useBriefingView } from './useBriefingView';
import { useMotionMode } from './motion';
import { RouteMap } from './RouteMap';
import { RouteSearching } from './RouteSearching';
import { RouteFailure, RouteFirstQuestion, RouteNeedsPoint, RoutePanelView } from './RoutePanel';
import { useRouteSearch, type RouteSearchModel } from './useRouteSearch';
import { IntervalProfile, MoreText, StepList, StretchRow } from './duur/DuurParts';
import { splitPlaceLabel as splitLabel } from '../engine/trainingPlace';
import { StopSignals } from './SessionHeader';
import { ZONE_SENTENCE } from './vandaag/zone';
import type { Intensity } from '../data/workoutStructure';

const STYLE_NAME: Record<RouteStyle, string> = { simple: 'Simpel', adventure: 'Avontuurlijk' };
// Groter: het blad Route met de volle kaart en de lange tekst.
const BIGGER = 'Groter';
const SEARCH_LOOP = 'Zoek een lus';
// Zonder plaats: geen doodlopende zin, maar de weg naar de plaatskeuze op de pagina Weer.
export const NO_PLACE_BRIEFING = 'Een lus begint bij je plaats. Die heb je nog niet gekozen.';
export const CHOOSE_PLACE = 'Kies je plaats';

function dayWord(date: string, today: string): string {
  if (date === today) return 'Vandaag';
  if (date === addDays(today, 1)) return 'Morgen';
  const d = weekdayShortNL(date);
  return `${d.charAt(0).toUpperCase()}${d.slice(1).toLowerCase()} ${formatDateNL(date)}`;
}

export function TrainingBriefing({
  template,
  session,
  date,
  program,
  onClose,
  onManual,
  onLeave,
}: {
  template: SessionTemplate;
  session?: PlannedSession;
  date: string;
  program: Program | null;
  onClose: () => void;
  // Zelf invullen: het bestaande scherm met het formulier. Afwezig: geen Zelf invullen.
  onManual?: () => void;
  // Sluit de lagen onder dit scherm (het blad in Week) voordat een vak naar een pagina gaat.
  onLeave?: () => void;
}) {
  const { settings } = useAppData();
  const navigate = useNavigate();
  const motion = useMotionMode();
  const { closing, requestClose } = useSheetClose(onClose);
  const today = todayISO();

  // Waar train je? voor deze ene geplande training (storage/trainingPlace.ts); de engine zegt of hij geldt.
  const [stored, setStored] = useState<unknown>(() => (session ? peekTrainingPlaces()?.[session.id] : undefined));
  useEffect(() => {
    if (!session) return;
    let live = true;
    void getTrainingPlace(session.id).then((found) => {
      if (live && found !== undefined) setStored((prev: unknown) => prev ?? found);
    });
    return () => {
      live = false;
    };
  }, [session]);

  const guide = getTrainingGuide(template.id);
  const plan = buildWorkoutPlan(template, date, program);
  const watchView = useWatchSheet({ template, garmin: plan?.garmin, session, hasZonesNote: !!guide?.garminNote });
  const view = useBriefingView({ template, session, date, program, storedPlace: stored });

  // De zoektocht: alleen bij Buiten met een route, bij het openen of na een tik; Liever niet zet hem stil.
  const [tapped, setTapped] = useState(false);
  const [declined, setDeclined] = useState(false);
  const routeMap = view?.map.kind === 'route' ? view.map : undefined;
  const searchOn = !!routeMap && !declined && (routeMap.search === 'open' || tapped);
  const model = useRouteSearch({ template, date, closing, enabled: searchOn });

  const [sheet, setSheet] = useState<'info' | 'watch' | 'run' | 'fuel' | 'route' | undefined>();
  const send = useSendRoute(model, date);

  if (!view) return null;

  function choosePlace(key: string) {
    setStored(key);
    if (session) void saveTrainingPlace(session.id, date, key);
  }

  // Naar een pagina: eerst alle lagen dicht, dan de pagina.
  function toPage(to: string) {
    onLeave?.();
    requestClose();
    navigate(to);
  }

  function openTile(tile: BriefingTile) {
    if (tile.id === 'weather') toPage('/weer');
    else setSheet(tile.id);
  }

  const kind = sessionKindLabel(template).toLowerCase();
  const due = date <= today;
  const manual = due ? onManual : undefined;
  const picked = model.picked && model.pickedOutcome?.ok ? { style: model.picked, proposal: model.pickedOutcome.proposal } : undefined;
  const routeReady = view.footer.kind === 'route' && !!picked && searchOn;
  const places = view.places.filter((p) => !p.locked && (p.key === view.place || isSportEnabled(modalitySport(p.key), settings.enabledSports)));
  const brief = buildSessionBrief(template, date, program, { modalityKey: view.place });
  const minutes = session?.plannedMinutes ?? resolveEffectiveFullDuration(template, date, program);

  return (
    <Portal>
      <div className={`fixed inset-0 z-50 overflow-y-auto ${closing ? 'animate-fade-out' : 'animate-fade-in'}`} style={{ background: 'var(--color-bg)' }}>
        <div className="mx-auto max-w-md px-4 pb-32">
          <SkyBand variant="low" gear={false}>
            <div className="flex items-start gap-2">
              <button type="button" onClick={requestClose} aria-label="Terug" className="-ml-3 flex h-11 w-11 shrink-0 items-center justify-center" style={{ color: 'var(--color-ink-dim)' }}>
                <Icon name="terug" size={24} />
              </button>
              <div className="min-w-0 flex-1 pt-1">
                <Eyebrow>{dayWord(date, today)} · {kind}</Eyebrow>
                <div className="flex items-start justify-between gap-2">
                  <h1 className="font-display text-3xl leading-tight" style={{ color: 'var(--color-ink)' }}>{template.name}</h1>
                  {guide && <div className="mt-1 shrink-0" data-sheet-from=""><InfoButton label="Waarom deze training" onClick={() => setSheet('info')} /></div>}
                </div>
              </div>
            </div>
          </SkyBand>

          <div className="flex flex-col gap-3">
            {places.length > 1 && (
              // Eén rij keuzes die zijwaarts schuift: nooit twee regels hoog.
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Waar train je?" style={{ scrollbarWidth: 'none' }}>
                {places.map((p) => {
                  const split = splitLabel(p.label);
                  const twice = places.some((o) => o.key !== p.key && splitLabel(o.label).name === split.name);
                  return (
                    <span key={p.key} className="shrink-0 whitespace-nowrap">
                      <Chip selected={p.key === view.place} onClick={() => choosePlace(p.key)}>{twice ? p.label : split.name}</Chip>
                    </span>
                  );
                })}
              </div>
            )}

            {/* De plek van de kaart: verschijnt of verdwijnt bij een andere keuze, in Vol met een korte overgang. */}
            <div key={view.map.kind} style={{ animation: placeTransition(motion) }}>
              <MapPlace view={view} model={model} searchOn={searchOn} declined={declined} onTap={() => { setDeclined(false); setTapped(true); }} onDecline={() => setDeclined(true)} onBigger={() => setSheet('route')} onPlace={() => toPage('/weer')} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {view.tiles.map((tile, i) => (
                <button
                  key={tile.id}
                  type="button"
                  data-sheet-from={tile.id === 'weather' ? undefined : ''}
                  onClick={() => openTile(tile)}
                  className={`text-left ${view.tiles.length % 2 === 1 && i === view.tiles.length - 1 ? 'col-span-2' : ''}`}
                >
                  <Card className="flex h-full min-h-[56px] flex-col justify-center gap-0.5 !px-3 !py-2.5">
                    <Eyebrow tone={tile.tone === 'warn' ? 'var(--color-warning)' : 'var(--color-ink-dim)'}>{tile.eyebrow}</Eyebrow>
                    <span className="text-sm leading-snug" style={{ color: tile.tone === 'warn' ? 'var(--color-warning)' : 'var(--color-ink)' }}>{tile.line}</span>
                  </Card>
                </button>
              ))}
            </div>

            {/* Onder de vouw: voor en na, wanneer je terugschakelt, en wie afvinkt. */}
            {(template.warmup?.length || template.cooldown?.length) ? (
              <div className="mt-2 flex flex-col divide-y divide-[var(--color-card-border)] rounded-2xl border px-4" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-card)' }}>
                {template.warmup && template.warmup.length > 0 && <StretchRow icon="rekken" title="Eerst opwarmen" line={`${template.warmup.length} oefeningen`} stretches={template.warmup} />}
                {template.cooldown && template.cooldown.length > 0 && <StretchRow icon="rekken" title="Daarna rekken" line={`${template.cooldown.length} oefeningen`} stretches={template.cooldown} />}
              </div>
            ) : null}
            {brief.stopSignals.length > 0 && (
              <Card>
                <Eyebrow tone="var(--color-warning)">Stop of schakel terug als</Eyebrow>
                <StopSignals signals={brief.stopSignals} />
              </Card>
            )}
            <div className="flex flex-col items-start">
              {view.stand.kind === 'watch' && <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{view.stand.line}</p>}
              {view.stand.kind === 'watch' && manual && <TextButton tone="dim" onClick={manual}>{view.stand.manualLabel}</TextButton>}
              {view.stand.kind !== 'watch' && view.stand.line && <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{view.stand.line}</p>}
              {/* Zelf invullen zonder horloge: met een lus is de knop onderaan de route, dan staat het hier. */}
              {view.stand.kind === 'manual' && manual && routeReady && <TextButton tone="dim" onClick={manual}>{BRIEFING_TEXT.manual}</TextButton>}
            </div>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-10 border-t" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-card-border)' }}>
          <div className="mx-auto max-w-md px-4 pt-3" style={{ paddingBottom: 'max(var(--rand-onder), 12px)' }}>
            {routeReady && send.line && (
              <p role="status" className="mb-2 text-xs leading-snug" style={{ color: send.line.warn ? 'var(--color-warning)' : 'var(--color-ink-dim)' }}>{send.line.text}</p>
            )}
            <div className="flex gap-3">
              {watchView.hasWatchSheet && (
                <div className="flex flex-none" data-sheet-from=""><SecondaryButton onClick={() => setSheet('watch')} className="min-w-[88px] flex-none px-4">Horloge</SecondaryButton></div>
              )}
              {routeReady && picked ? (
                <PrimaryButton disabled={send.busy} onClick={() => void send.go(picked.style, picked.proposal)}>{model.sender ? view.footer.label : 'GPX downloaden'}</PrimaryButton>
              ) : (view.footer.kind === 'route' ? view.footer.fallback?.kind : view.footer.kind) === 'manual' && manual ? (
                <PrimaryButton onClick={manual}>{BRIEFING_TEXT.manual}</PrimaryButton>
              ) : (
                <PrimaryButton onClick={requestClose}>{BRIEFING_TEXT.close}</PrimaryButton>
              )}
            </div>
          </div>
        </div>
      </div>

      {sheet === 'info' && guide && (
        <TrainingGuideSheet title={template.name} guide={guide} template={template} dateIso={date} dayLabel={guideDayLabel(template, date)} onClose={() => setSheet(undefined)} />
      )}
      {sheet === 'watch' && watchView.hasWatchSheet && (
        <WatchSheet view={watchView} template={template} session={session} garmin={plan?.garmin} dayLabel={guideDayLabel(template, date)} onClose={() => setSheet(undefined)} onLeave={() => { onLeave?.(); requestClose(); }} />
      )}
      {sheet === 'run' && (
        <TodaySheet eyebrow={BRIEFING_TEXT.run} title={template.name} onClose={() => setSheet(undefined)}>
          <RunDetail template={template} date={date} program={program} />
        </TodaySheet>
      )}
      {sheet === 'fuel' && (
        <TodaySheet eyebrow={BRIEFING_TEXT.fuel} title={template.name} onClose={() => setSheet(undefined)}>
          <FuelDetail template={template} date={date} minutes={minutes} outdoor={view.map.kind !== 'place'} />
        </TodaySheet>
      )}
      {sheet === 'route' && (
        <BigRouteSheet template={template} model={model} date={date} onClose={() => setSheet(undefined)} onDecline={() => setDeclined(true)} />
      )}
    </Portal>
  );
}

// Op de plek van de kaart, per stand van de engine en van de zoektocht.
export function MapPlace({ view, model, searchOn, declined, onTap, onDecline, onBigger, onPlace }: {
  view: BriefingView;
  model: RouteSearchModel;
  searchOn: boolean;
  declined: boolean;
  onTap: () => void;
  onDecline: () => void;
  onBigger: () => void;
  // Nog geen plaats: naar de pagina Weer, waar je hem kiest (dezelfde weg als op de missiekaart).
  onPlace?: () => void;
}) {
  const dim = { color: 'var(--color-ink-dim)' };
  const map = view.map;
  if (map.kind === 'place') {
    return (
      <Card>
        <Eyebrow tone="var(--color-ink-dim)">{map.title}</Eyebrow>
        <MoreText text={map.how} className="mt-1" color="var(--color-ink)" />
      </Card>
    );
  }
  if (map.kind !== 'route') return null;

  // Je training in één regel: ook zonder lus weet je wat je zoekt.
  const targetLine = <p className="text-sm leading-snug" style={dim}>Je training: {map.line}.</p>;
  const searchRow = (
    <div className="flex flex-col items-start">
      {targetLine}
      <TextButton tone="dim" icon="verder" onClick={onTap}>{SEARCH_LOOP}</TextButton>
    </div>
  );
  const { stage } = model;
  if (stage === 'no-place') {
    return (
      <div className="flex flex-col items-start">
        <p className="text-sm leading-snug" style={dim}>{NO_PLACE_BRIEFING}</p>
        {onPlace && <TextButton tone="dim" icon="verder" onClick={onPlace}>{CHOOSE_PLACE}</TextButton>}
      </div>
    );
  }
  if (stage === 'reading') return <div className="min-h-[44px]" />;
  // Na Liever niet, na een tik (later dan morgen, of de instelling Na een tik): eerst Zoek een lus,
  // en pas daarna de eerste vraag; zo is één tik genoeg en gaat er tot dan niets de deur uit.
  if (declined || !searchOn) return searchRow;
  if (stage === 'first-question') return <RouteFirstQuestion model={model} onDecline={onDecline} />;
  if (stage === 'needs-point') return <RouteNeedsPoint model={model} />;
  if (stage === 'searching') {
    return (
      <div className="flex flex-col gap-2">
        <RouteSearching steps={model.steps} current={model.currentStep} limitLine={model.limitLine} height={BRIEFING_MAP_HEIGHT} />
        <div className="min-h-[64px]">{targetLine}</div>
      </div>
    );
  }
  if (stage === 'offline' || stage === 'timeout') {
    return (
      <div className="flex flex-col gap-2">
        <RouteFailure kind={stage} onRetry={model.retry} height={BRIEFING_MAP_HEIGHT} />
        {targetLine}
      </div>
    );
  }
  return <LoopPlace model={model} target={map.target} onBigger={onBigger} />;
}

// De kaart in de lagere stand, de gekozen lus, en de andere als één regel met Kies.
function LoopPlace({ model, target, onBigger }: { model: RouteSearchModel; target: RouteSearchModel['target']; onBigger: () => void }) {
  const dim = { color: 'var(--color-ink-dim)' };
  const { plans, order, okStyles, picked, pickedOutcome } = model;
  if (!plans) return null;
  const bigger = <TextButton tone="dim" icon="verder" onClick={onBigger} data-sheet-from="">{BIGGER}</TextButton>;
  if (okStyles.length === 0) {
    return (
      <div className="flex flex-col items-start gap-1">
        {order.map((s) => {
          const o = plans[s];
          return o.ok ? null : <p key={s} className="text-sm leading-snug" style={dim}>{STYLE_NAME[s]}: {failureLine(s, o, target.ascentM < MIN_ASCENT_TARGET_M)}</p>;
        })}
        <TextButton tone="dim" onClick={model.retry}>Opnieuw zoeken</TextButton>
      </div>
    );
  }
  const other = order.find((s) => s !== picked && plans[s].ok);
  const otherOutcome = other ? plans[other] : undefined;
  return (
    <div className="flex flex-col gap-2">
      {model.mapStartPoint && (
        <RouteMap
          routes={model.mapRoutes}
          chosen={picked}
          start={model.mapStartPoint}
          base={model.base}
          onChoose={model.setChosen}
          onStart={model.startOnMap}
          offerHere={false}
          onNoMap={model.markNoMap}
          height={BRIEFING_MAP_HEIGHT}
        />
      )}
      {/* De gekozen lus in twee regels, met Groter ernaast: zo staan de vier vakken op 390 px nog boven de vouw. */}
      {pickedOutcome?.ok && picked && (
        <div className="flex min-h-[44px] items-start justify-between gap-3">
          <div className="min-w-0">
            <Eyebrow tone="var(--color-ink-dim)">{STYLE_NAME[picked]}</Eyebrow>
            <p className="text-sm tabular-nums leading-snug" style={{ color: 'var(--color-ink)' }}>{proposalTitle(pickedOutcome.proposal)} · {proposalFacts(pickedOutcome.proposal)}</p>
            {loopLines(pickedOutcome.proposal, target, proposalNotes(pickedOutcome.proposal, target)).warn.map((note) => (
              <p key={note} className="text-sm leading-snug" style={{ color: 'var(--color-warning)' }}>{note}</p>
            ))}
          </div>
          <div className="-mt-2 shrink-0">{bigger}</div>
        </div>
      )}
      {other && otherOutcome?.ok && (
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 text-sm tabular-nums leading-snug" style={dim}>{STYLE_NAME[other]}: {proposalFacts(otherOutcome.proposal)}</p>
          <TextButton tone="dim" onClick={() => model.setChosen(other)}>Kies</TextButton>
        </div>
      )}
    </div>
  );
}

// Het blad Route achter Groter: de volle kaart en de lange tekst, met de regie van de Briefing.
function BigRouteSheet({ template, model, date, onClose, onDecline }: { template: SessionTemplate; model: RouteSearchModel; date: string; onClose: () => void; onDecline: () => void }) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef} className={`relative h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <SheetGrip />
          <Card className="flex min-h-full flex-col gap-3 rounded-b-none border-b-0 pb-[max(var(--rand-onder),32px)]">
            <div className="-mt-2"><SheetHeader eyebrow={template.name} title="Route" onClose={requestClose} /></div>
            <RoutePanelView model={model} date={date} onDecline={() => { onDecline(); requestClose(); }} />
          </Card>
        </div>
      </div>
    </Portal>
  );
}

// Het blad achter Wat je loopt: het profiel of de zone, en de stappen.
function RunDetail({ template, date, program }: { template: SessionTemplate; date: string; program: Program | null }) {
  const plan = buildWorkoutPlan(template, date, program);
  const steps = plan?.timeline.filter((s) => s.kind !== 'strength') ?? [];
  const single = steps.length === 1 && !steps[0].noTarget ? (steps[0].intensity as Intensity) : undefined;
  if (!plan) return <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{durationLabel(resolveEffectiveFullDuration(template, date, program))}</p>;
  return (
    <div className="flex flex-col gap-4">
      {steps.length > 1 ? (
        <IntervalProfile plan={plan} />
      ) : single ? (
        <div className="flex flex-col gap-3">
          <ZoneBar active={single} label={`Zone ${single}`} />
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
            <span className="font-semibold" style={{ color: 'var(--color-progress)' }}>Zone {single}.</span> {ZONE_SENTENCE[single]}
          </p>
        </div>
      ) : null}
      <StepList plan={plan} />
    </div>
  );
}

// Het blad achter Eten en drinken: de regel over drinken (zoals De avond ervoor) en Eten onderweg.
function FuelDetail({ template, date, minutes, outdoor }: { template: SessionTemplate; date: string; minutes: number; outdoor: boolean }) {
  const { settings, sessionLogs, weather } = useAppData();
  const drink = outdoor ? drinkLine({ template, minutes, forecast: weather.forecast ?? undefined, logs: sessionLogs, date, now: new Date(), sweatEntries: settings.sweatEntries }) : undefined;
  const fuel = fuelOn(settings) ? fuelForTraining(template, minutes) : undefined;
  return (
    <div className="flex flex-col gap-2">
      {drink && <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{drink}</p>}
      {fuel && fuelCardLines(fuel).map((line, i) => (
        <p key={line} className={i === 0 ? 'text-sm leading-relaxed' : 'text-xs leading-relaxed'} style={{ color: i === 0 ? 'var(--color-ink)' : 'var(--color-ink-dim)' }}>{line}</p>
      ))}
    </div>
  );
}

// Route naar Garmin Connect voor de gekozen lus, of het bestand downloaden: één uitkomst onder de knop,
// en nooit langer bezig dan de grens.
function useSendRoute(model: RouteSearchModel, date: string) {
  const [done, setDone] = useState<{ send: RouteSendOutcome } | { file: RouteFileResult } | 'busy' | undefined>();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function go(style: RouteStyle, proposal: { points: Parameters<typeof routeGpx>[0]; distanceM: number }) {
    setDone('busy');
    const gpx = routeGpx(proposal.points, gpxCourseName(style, proposal.distanceM));
    // Versturen en downloaden hebben elk een grens in tijd (storage/routeSend.ts, storage/routeFile.ts)
    // en geven altijd een uitkomst: de knop blijft nooit op bezig staan.
    const result: { send: RouteSendOutcome } | { file: RouteFileResult } = model.sender
      ? { send: await sendRouteGpx(gpx, style, date, model.sender) }
      : { file: await saveRouteGpx(gpx, style, date) };
    if (mounted.current) setDone(result);
  }
  return {
    busy: done === 'busy',
    line: routeOutcomeLine(!!model.sender, done === 'busy' ? undefined : done),
    go,
  };
}

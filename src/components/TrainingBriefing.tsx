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

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PlannedSession, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { RouteStyle } from '../models/route';
import { useAppData } from '../state/AppDataContext';
import { briefing, footerNow, placeRow, placeTransition, OTHER_PLACE, BRIEFING_TEXT, type BriefingRow, type BriefingView } from '../engine/briefing';
import { isSportEnabled } from '../engine/sports';
import { fuelCardLines, fuelForTraining, fuelOn } from '../engine/fuelOnTheGo';
import { drinkLine } from '../engine/eveningBefore';
import { resolveEffectiveFullDuration } from '../engine/substitutions';
import { buildWorkoutPlan } from '../engine/workoutPlan';
import { modalitySport } from '../data/modalities';
import { failureLine, MIN_ASCENT_TARGET_M, proposalFacts, proposalNotes, proposalTitle } from '../engine/routePlanner';
import { BRIEFING_MAP_HEIGHT, briefingRoutes, footerRoom, loopLines, otherLoopLine, routeOutcomeLine } from '../engine/routeSheet';
import { gpxCourseName, routeGpx } from '../engine/gpx';
import type { RouteSendOutcome } from '../engine/routeSend';
import { getTrainingGuide, guideDayLabel } from '../data/trainingGuide';
import { getTrainingPlace, peekTrainingPlaces, saveTrainingPlace } from '../storage/trainingPlace';
import { saveRouteGpx, type RouteFileResult } from '../storage/routeFile';
import { sendRouteGpx } from '../storage/routeSend';
import { todayISO } from '../utils/dates';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { SkyBand } from './SkyBand';
import { Card, Chip, Eyebrow, InfoButton, PrimaryButton, SheetGrip, ZoneBar } from './ui';
import { TextButton } from './TextButton';
import { Icon } from './icons';
import { SheetHeader } from './SheetHeader';
import { TodaySheet } from './vandaag/TodaySheet';
import { TrainingGuideSheet } from './TrainingGuideSheet';
import { WatchSheet } from './WatchSheet';
import { useWatchSheet } from './useWatchSheet';
import { useBriefingInput } from './useBriefingView';
import { usePlaceWeather } from './usePlaceWeather';
import type { WeatherForecast } from '../models/weather';
import { briefingWeather, placeWeatherTarget } from '../engine/placeWeather';
import { showPlaceWeather } from '../engine/overviewSettings';
import { useMotionMode } from './motion';
import { RouteMap } from './RouteMap';
import { RouteSearching } from './RouteSearching';
import { RouteFailure, RouteFirstQuestion, RoutePanelView, StartChips } from './RoutePanel';
import { useRouteSearch, type RouteSearchModel } from './useRouteSearch';
import { IntervalProfile, KeyNumbers, StepList } from './duur/DuurParts';
import { StretchItems } from './StretchList';
import { ChevronGlyph, CheckGlyph } from './vandaag/glyphs';
import { shortPlaceLabels } from '../engine/trainingPlace';
import { StopSignals } from './SessionHeader';
import { ZONE_SENTENCE } from './vandaag/zone';

const STYLE_NAME: Record<RouteStyle, string> = { simple: 'Simpel', adventure: 'Avontuurlijk' };
// Groter: het blad Route met de volle kaart en de lange tekst.
const BIGGER = 'Groter';
const SEARCH_LOOP = 'Zoek een lus';
// Zonder plaats: geen doodlopende zin, maar de weg naar de plaatskeuze op de pagina Weer.
export const NO_PLACE_BRIEFING = 'Een lus begint bij je plaats. Die heb je nog niet gekozen.';
export const CHOOSE_PLACE = 'Kies je plaats';

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
  // Het plan zoals het naar je horloge gaat; de stappen op het scherm volgen de gekozen manier (`plan` hieronder).
  const workout = buildWorkoutPlan(template, date, program);
  const watchView = useWatchSheet({ template, garmin: workout?.garmin, session, hasZonesNote: !!guide?.garminNote });
  const input = useBriefingInput({ template, session, date, program, storedPlace: stored });
  // Met het weer van huis; de plek van Start bij is pas bekend na de regie van de route hieronder.
  const homeView = briefing(input);

  // De zoektocht: alleen bij Buiten met een route, bij het openen of na een tik; Liever niet zet hem stil.
  const [tapped, setTapped] = useState(false);
  const [declined, setDeclined] = useState(false);
  const routeMap = homeView?.map.kind === 'route' ? homeView.map : undefined;
  const searchOn = !!routeMap && !declined && (routeMap.search === 'open' || tapped);
  const model = useRouteSearch({ template, date, closing, enabled: searchOn });

  // Het weer van de gekozen plek: alleen bij een route op de kaart en een plek verder dan 10 km van huis.
  const weatherTarget = placeWeatherTarget({ on: showPlaceWeather(settings.overviews) && !!routeMap && !declined, place: model.placeStart, home: model.homePoint, weatherHome: settings.homeLocation });
  const placeWeather = briefingWeather(weatherTarget, usePlaceWeather(weatherTarget), input.forecast);
  const view = placeWeather.place ? briefing({ ...input, forecast: placeWeather.forecast, weatherPlace: placeWeather.place }) : homeView;

  const [sheet, setSheet] = useState<'info' | 'watch' | 'steps' | 'fuel' | 'stretch' | 'route' | 'places' | undefined>();
  const send = useSendRoute(model, date);
  const [footerRef, footerHeight] = useHeight<HTMLDivElement>();

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

  function openRow(row: BriefingRow) {
    if (!row.opens) return;
    if (row.id === 'weather') toPage('/weer');
    else if (row.id === 'watch') { if (watchView.hasWatchSheet) setSheet('watch'); }
    else setSheet(row.id);
  }

  const due = date <= today;
  const manual = due ? onManual : undefined;
  const picked = model.picked && model.pickedOutcome?.ok ? { style: model.picked, proposal: model.pickedOutcome.proposal } : undefined;
  const routeReady = view.footer.kind === 'route' && !!picked && searchOn;
  const places = view.places.filter((p) => !p.locked && (p.key === view.place || isSportEnabled(modalitySport(p.key), settings.enabledSports)));
  // Hoogstens drie chips, nooit een schuifrij; bij meer keuzes een chip naar het blad (engine/briefing.ts#placeRow).
  const row = placeRow(places, view.place);
  const shortLabels = shortPlaceLabels(row.chips.map((p) => p.label));
  // De korte naam van de gekozen keuze op de tweede chip, zoals in de rij van alle keuzes.
  const otherShort = row.other ? shortPlaceLabels(places.map((p) => p.label))[places.indexOf(row.other)] : undefined;
  const minutes = session?.plannedMinutes ?? resolveEffectiveFullDuration(template, date, program);
  // De ene knop onderaan: de route als de lus er is, anders Gedaan (zelf invullen), anders geen onderbalk.
  const footerKind = footerNow(view.footer, routeReady, !!manual);
  const footer = footerKind === 'route' && picked
    ? <PrimaryButton disabled={send.busy} onClick={() => void send.go(picked.style, picked.proposal)}>{model.sender ? BRIEFING_TEXT.sendRoute : 'GPX downloaden'}</PrimaryButton>
    : footerKind === 'manual' && manual
      ? <PrimaryButton onClick={manual}><span className="inline-flex items-center justify-center gap-2"><CheckGlyph size={18} />{BRIEFING_TEXT.doneButton}</span></PrimaryButton>
      : null;
  const { head, heart } = view;
  // De stappen zoals de gekozen manier ze noemt; het horloge (WatchSheet) houdt het plan zelf.
  const plan = heart.plan ?? workout;

  return (
    <Portal>
      <div className={`fixed inset-0 z-50 overflow-y-auto ${closing ? 'animate-fade-out' : 'animate-fade-in'}`} style={{ background: 'var(--color-bg)' }}>
        {/* Met de vaste knop onderaan scrolt de pagina zo ver dat de laatste regel er volledig boven staat. */}
        <div className={`mx-auto max-w-md px-4 ${footer ? '' : 'pb-12'}`} style={footer ? { paddingBottom: footerRoom(footerHeight) } : undefined}>
          <SkyBand variant="low" gear={false}>
            <div className="flex items-start gap-2">
              <button type="button" onClick={requestClose} aria-label="Terug" className="-ml-3 flex h-11 w-11 shrink-0 items-center justify-center" style={{ color: 'var(--color-ink-dim)' }}>
                <Icon name="terug" size={24} />
              </button>
              <div className="min-w-0 flex-1 pt-1">
                <Eyebrow>{head.eyebrow}</Eyebrow>
                <div className="flex items-start justify-between gap-2">
                  <h1 className="font-display text-3xl leading-tight" style={{ color: 'var(--color-ink)' }}>{template.name}</h1>
                  {guide && <div className="mt-1 shrink-0" data-sheet-from=""><InfoButton label="Waarom deze training" onClick={() => setSheet('info')} /></div>}
                </div>
                {head.purpose && <p className="mt-1 text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{head.purpose}</p>}
                <p className="mt-1 text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{head.dayLine}</p>
              </div>
            </div>
          </SkyBand>

          <div className="flex flex-col gap-3">
            {/* De hartkaart: de kerngetallen en de zonebalk of het profiel. Zone en praattest staan alleen hier. */}
            <Card className="mt-1 flex flex-col gap-5" role="group" aria-label={heart.label ?? BRIEFING_TEXT.run}>
              <KeyNumbers facts={heart.facts} />
              {heart.paceNote && <p className="-mt-3 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{heart.paceNote}</p>}
              {heart.steps && plan ? (
                <button type="button" data-sheet-from="" onClick={() => setSheet('steps')} aria-label="De stappen van deze training" className="-m-2 rounded-xl p-2 text-left">
                  <IntervalProfile plan={plan} />
                </button>
              ) : heart.zone ? (
                <div className="flex flex-col gap-3">
                  <ZoneBar active={heart.zone} label={`Zone ${heart.zone}`} />
                  <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
                    <span className="font-semibold">Zone {heart.zone}.</span> {ZONE_SENTENCE[heart.zone]}
                  </p>
                </div>
              ) : null}
              {heart.tomorrow && <p className="-mt-2 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{heart.tomorrow}</p>}
            </Card>

            {places.length > 1 && (
              // Eén rij van hoogstens drie chips met korte namen, zonder schuiven: op 360 px valt er niets af (zoals
              // Start bij). Bij meer keuzes de standaard en een chip naar het blad met alle keuzes. De gekozen chip is stil: de knop onderaan is het enige mint.
              <div className="flex flex-col gap-2">
                <div className="flex min-w-0 gap-2" role="group" aria-label="Waar train je?" data-place-row="">
                  {row.chips.map((p, i) => (
                    <span key={p.key} className="min-w-0 whitespace-nowrap">
                      <Chip tone="quiet" selected={p.key === view.place} label={p.label} onClick={() => choosePlace(p.key)}><span className="inline-block max-w-[8.5rem] truncate align-bottom">{shortLabels[i]}</span></Chip>
                    </span>
                  ))}
                  {row.more && (
                    // Zoals Start bij: de gekozen keuze (of Andere manier) met een kleine pijl; opent het blad met alle keuzes.
                    <span className="min-w-0 whitespace-nowrap" data-sheet-from="">
                      <Chip tone="quiet" selected={!!row.other} label={row.other ? `${row.other.label}, andere manier kiezen` : OTHER_PLACE} onClick={() => setSheet('places')}>
                        <span className="inline-block max-w-[8.5rem] truncate align-bottom">{otherShort ?? OTHER_PLACE}</span>
                        <span aria-hidden className="shrink-0"><Icon name="verder" size={14} /></span>
                      </Chip>
                    </span>
                  )}
                </div>
                {view.placeLine && <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{view.placeLine}</p>}
              </div>
            )}

            {/* De plek van de kaart: verschijnt of verdwijnt bij een andere keuze, in Vol met een korte overgang. */}
            <div key={view.map.kind} style={{ animation: placeTransition(motion) }}>
              <MapPlace view={view} model={model} searchOn={searchOn} declined={declined} onTap={() => { setDeclined(false); setTapped(true); }} onDecline={() => setDeclined(true)} onBigger={() => setSheet('route')} onPlace={() => toPage('/weer')} />
            </div>

            {view.rows.length > 0 && <BriefingRows rows={view.rows} onOpen={openRow} />}

            {/* De stopregels: volledig op het scherm, zonder kaart; amber is alleen de stip voor het kopje. */}
            {view.stopSignals.length > 0 && (
              <div className="mt-2">
                <span className="flex items-center gap-2">
                  <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--color-warning)' }} />
                  <Eyebrow tone="var(--color-ink-dim)">{BRIEFING_TEXT.stop}</Eyebrow>
                </span>
                <StopSignals signals={view.stopSignals} quiet />
              </div>
            )}
            <div className="flex flex-col items-start">
              {view.stand.kind !== 'watch' && view.stand.line && <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{view.stand.line}</p>}
              {/* Zelf invullen: met een horloge dat afvinkt, of zonder als de knop onderaan de route is. */}
              {view.stand.kind === 'watch' && manual && <TextButton tone="dim" onClick={manual}>{view.stand.manualLabel}</TextButton>}
              {view.stand.kind === 'manual' && manual && footerKind === 'route' && <TextButton tone="dim" onClick={manual}>{BRIEFING_TEXT.manual}</TextButton>}
            </div>
          </div>
        </div>

        {footer && (
          <div className="fixed inset-x-0 bottom-0 z-10 border-t" ref={footerRef} style={{ background: 'var(--color-surface)', borderColor: 'var(--color-card-border)' }}>
            <div className="mx-auto max-w-md px-4 pt-3" style={{ paddingBottom: 'max(var(--rand-onder), 12px)' }}>
              {footerKind === 'route' && send.line && (
                <p role="status" className="mb-2 text-xs leading-snug" style={{ color: send.line.warn ? 'var(--color-warning)' : 'var(--color-ink-dim)' }}>{send.line.text}</p>
              )}
              {footer}
            </div>
          </div>
        )}
      </div>

      {sheet === 'info' && guide && (
        <TrainingGuideSheet title={template.name} guide={guide} template={template} dateIso={date} dayLabel={guideDayLabel(template, date)} onClose={() => setSheet(undefined)} />
      )}
      {sheet === 'watch' && watchView.hasWatchSheet && (
        <WatchSheet view={watchView} template={template} session={session} garmin={workout?.garmin} dayLabel={guideDayLabel(template, date)} onClose={() => setSheet(undefined)} onLeave={() => { onLeave?.(); requestClose(); }} />
      )}
      {sheet === 'steps' && plan && (
        <TodaySheet eyebrow={template.name} title="Zo doe je het" onClose={() => setSheet(undefined)}>
          <StepList plan={plan} />
        </TodaySheet>
      )}
      {sheet === 'places' && (
        <TodaySheet eyebrow={template.name} title="Waar train je?" onClose={() => setSheet(undefined)}>
          <PlaceList places={places} chosen={view.place} onPick={(key) => { choosePlace(key); setSheet(undefined); }} />
        </TodaySheet>
      )}
      {sheet === 'fuel' && (
        <TodaySheet eyebrow={BRIEFING_TEXT.fuelSheet} title={template.name} onClose={() => setSheet(undefined)}>
          <FuelDetail template={template} date={date} minutes={minutes} outdoor={view.map.kind !== 'place'} forecast={placeWeather.forecast} />
        </TodaySheet>
      )}
      {sheet === 'stretch' && (
        <TodaySheet eyebrow={template.name} title={BRIEFING_TEXT.stretch} onClose={() => setSheet(undefined)}>
          <StretchDetail template={template} />
        </TodaySheet>
      )}
      {sheet === 'route' && (
        <BigRouteSheet template={template} model={model} date={date} onClose={() => setSheet(undefined)} onDecline={() => setDeclined(true)} />
      )}
    </Portal>
  );
}

// De lijst zonder kopje: links het vaste woord gedempt, rechts de waarde in gewone inkt, en een pijltje
// als de rij een blad of pagina opent. Let op is een amber stip voor het vaste woord, nooit een amber
// woord. Dezelfde vorm als het blok Stand en morgen op Vandaag.
function BriefingRows({ rows, onOpen }: { rows: BriefingRow[]; onOpen: (row: BriefingRow) => void }) {
  return (
    <ul className="overflow-hidden rounded-2xl border" style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}>
      {rows.map((row) => {
        const inner = (
          <>
            <span className="flex w-[88px] shrink-0 items-center gap-2 text-sm" style={{ color: 'var(--color-ink-dim)' }}>
              {row.tone === 'warn' && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--color-warning)' }} />}
              {row.label}
            </span>
            <span className="min-w-0 flex-1 text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{row.line}</span>
            {row.opens && <span className="shrink-0" style={{ color: 'var(--color-ink-dim)' }}><ChevronGlyph /></span>}
          </>
        );
        const cls = 'flex min-h-[44px] w-full items-center gap-3 px-4 py-2.5 text-left';
        return (
          <li key={row.id} className="border-t first:border-t-0" style={{ borderColor: 'var(--color-card-border)' }} data-briefing-row={row.id}>
            {row.opens ? (
              <button type="button" onClick={() => onOpen(row)} data-sheet-from={row.id === 'weather' ? undefined : ''} aria-label={`${row.label}: ${row.line}${row.tone === 'warn' ? ', let op' : ''}`} className={cls}>{inner}</button>
            ) : (
              <div className={cls}>{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Het blad achter Voor en na: opwarmen en rekken onder elkaar.
function StretchDetail({ template }: { template: SessionTemplate }) {
  return (
    <div className="flex flex-col gap-5">
      {template.warmup && template.warmup.length > 0 && (
        <div>
          <Eyebrow tone="var(--color-ink-dim)">{BRIEFING_TEXT.warmup}</Eyebrow>
          <StretchItems stretches={template.warmup} />
        </div>
      )}
      {template.cooldown && template.cooldown.length > 0 && (
        <div>
          <Eyebrow tone="var(--color-ink-dim)">{BRIEFING_TEXT.cooldown}</Eyebrow>
          <StretchItems stretches={template.cooldown} />
        </div>
      )}
    </div>
  );
}

// Het blad met alle keuzes (achter de tweede chip): onder elkaar met hun oordeel; de gekozen keuze met een vinkje, geen mint.
function PlaceList({ places, chosen, onPick }: { places: BriefingView['places']; chosen: string | undefined; onPick: (key: string) => void }) {
  return (
    <ul className="flex flex-col">
      {places.map((p) => (
        <li key={p.key} className="border-t first:border-t-0" style={{ borderColor: 'var(--color-card-border)' }}>
          <button type="button" onClick={() => onPick(p.key)} aria-pressed={p.key === chosen} className="flex min-h-[44px] w-full items-center gap-3 py-2.5 text-left">
            <span className="min-w-0 flex-1">
              <span className="block text-sm leading-snug" style={{ color: 'var(--color-ink)', fontWeight: p.key === chosen ? 600 : undefined }}>{p.label}</span>
              <span className="block text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{p.roleLabel}</span>
            </span>
            {p.key === chosen && <span className="shrink-0" style={{ color: 'var(--color-ink)' }}><CheckGlyph size={18} /></span>}
          </button>
        </li>
      ))}
    </ul>
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
  // Loopband of binnen: geen kaart; wat je instelt staat in de regel onder de chips.
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
  // Na Liever niet, na een tik (later dan morgen, of de instelling Na een tik): eerst Zoek een lus,
  // en pas daarna de eerste vraag; zo is één tik genoeg en gaat er tot dan niets de deur uit.
  if (declined || !searchOn) return stage === 'reading' ? <div className="min-h-[44px]" /> : searchRow;
  if (stage === 'first-question') return <RouteFirstQuestion model={model} onDecline={onDecline} />;
  // Start bij boven de kaart en de zoekstand, in elke stand; de regel alleen bij een terugval of afwijking.
  // Tijdens lezen en zoeken houdt de regel twee regels vrij: een terugval (je plek lukte niet) komt pas
  // tijdens het zoeken, en dan verspringt de balk niet. Bij de kaart en een fout staat de regel vast; leeg
  // neemt hij dan geen ruimte (Pathfinder: geen lege strook tussen de chips en de kaart).
  const start = (
    <>
      <StartChips model={model} />
      {stage === 'reading' || stage === 'searching' ? (
        <p role="status" className="min-h-[40px] text-sm leading-snug" style={dim}>{model.startLine}</p>
      ) : model.startLine ? (
        <p role="status" className="text-sm leading-snug" style={dim}>{model.startLine}</p>
      ) : null}
    </>
  );
  if (stage === 'reading') return <div className="flex flex-col gap-2">{start}</div>;
  if (stage === 'searching') {
    return (
      <div className="flex flex-col gap-2">
        {start}
        <RouteSearching key={model.searchKey} steps={model.steps} current={model.currentStep} limitLine={model.limitLine} limitMs={model.limitMs} height={BRIEFING_MAP_HEIGHT} />
        <div className="min-h-[64px]">{targetLine}</div>
      </div>
    );
  }
  if (stage === 'offline' || stage === 'timeout') {
    return (
      <div className="flex flex-col gap-2">
        {start}
        <RouteFailure kind={stage} onRetry={model.retry} height={BRIEFING_MAP_HEIGHT} />
        {targetLine}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {start}
      <LoopPlace model={model} target={map.target} onBigger={onBigger} />
    </div>
  );
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
        // De stille kaart: alleen de gekozen lus met de ring bij de start, geen knoppen; een tik opent Groter,
        // waar de andere lus, je plek, Kaart of Luchtfoto en Start hier staan (besluit 2026-11-12-route-blok.md).
        <RouteMap
          routes={briefingRoutes(model.mapRoutes, picked)}
          chosen={picked}
          start={model.mapStartPoint}
          base={model.base}
          onChoose={model.setChosen}
          onStart={model.startOnMap}
          onNoMap={model.markNoMap}
          height={BRIEFING_MAP_HEIGHT}
          photo={model.photo}
          onOpen={onBigger}
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
        // Direct onder de gekozen lus: Kies is 44 px hoog, de rij schuift 4 px op zodat er geen gat valt.
        <div className="-mt-1 flex items-center justify-between gap-3">
          <p className="min-w-0 text-sm tabular-nums leading-snug" style={dim}>{otherLoopLine(STYLE_NAME[other], otherOutcome.proposal)}</p>
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

// Het blad achter Eten en drinken: de regel over drinken (zoals De avond ervoor) en Eten onderweg.
// `forecast` is de voorspelling die de lijst ook leest: van huis, of van de gekozen plek ver weg.
function FuelDetail({ template, date, minutes, outdoor, forecast }: { template: SessionTemplate; date: string; minutes: number; outdoor: boolean; forecast: WeatherForecast | undefined }) {
  const { settings, sessionLogs } = useAppData();
  const drink = outdoor ? drinkLine({ template, minutes, forecast, logs: sessionLogs, date, now: new Date(), sweatEntries: settings.sweatEntries }) : undefined;
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

// De hoogte van een element, ook als hij verandert (een uitkomstregel boven de knop).
function useHeight<T extends HTMLElement>(): [(el: T | null) => void, number | undefined] {
  const [height, setHeight] = useState<number | undefined>();
  const observer = useRef<ResizeObserver | undefined>(undefined);
  // Eén functie voor het hele leven van de pagina: React roept hem alleen bij erbij komen en weggaan.
  const ref = useCallback((el: T | null) => {
    observer.current?.disconnect();
    observer.current = undefined;
    if (!el) return;
    const measure = () => setHeight((h) => (h === el.offsetHeight ? h : el.offsetHeight));
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      observer.current = new ResizeObserver(measure);
      observer.current.observe(el);
    }
  }, []);
  return [ref, height];
}

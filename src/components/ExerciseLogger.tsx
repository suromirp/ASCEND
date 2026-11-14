import { RouteProposalLine } from './RouteProposalLine';
import { useNavigate } from 'react-router-dom';
import { WeatherLine } from './WeatherLine';
import { HillsNearbyLine } from './HillsNearbyLine';
import { ClothingAdvice } from './ClothingAdvice';
import { paceLine } from '../engine/racePaces';
import { judgmentOptions, pacesFromLogs } from '../engine/testJudgment';
import { showSpotsFor, spotsPageFor } from '../engine/trainingSpots';
import { placeHasRoute } from '../engine/trainingPlace';
import { useEffect, useRef, useState } from 'react';
import { useLogForm } from './logForm/useLogForm';
import { asksDoneOn } from './logForm/formRules';
import { DetailsField, DoneOnRow, DurationField, FeelField, LegsField, ModalityFields, NotesField, OtherDoneField, PainField, RpeField } from './logForm/LogFormParts';
import { HowDidItGoSheet } from './HowDidItGoSheet';
import { HOW_TEXT } from './logForm/howDidItGo';
import { closeClearsDraft, failedNote, formAfterSave, reportIfGone, saveLogWithin, type LogSaveOutcome } from '../state/logSave';
import { briefingEntry } from '../engine/briefing';
import { NumberField } from './NumberField';
import type { SessionTemplate, SessionVariant } from '../models/training';
import type { Program } from '../models/program';
import { durationForVariant, availableVariants, resolveVariantDuration } from '../engine/substitutions';
import { useAppData } from '../state/AppDataContext';
import { getModalities } from '../data/modalities';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { Card, Eyebrow, InfoButton, PrimaryButton, SecondaryButton, Segmented, ZoneBar } from './ui';
import { CountdownTimer } from './CountdownTimer';
import { formatDateNL, weekdayShortNL } from '../utils/dates';
import { TrainingGuideSheet } from './TrainingGuideSheet';
import { WatchSheet } from './WatchSheet';
import { useWatchSheet } from './useWatchSheet';
import { StopSignals } from './SessionHeader';
import { SkyBand } from './SkyBand';
import { CheckGlyph } from './vandaag/glyphs';
import { ZONE_SENTENCE } from './vandaag/zone';
import { IntervalProfile, KeyNumbers, ModalityChoice, MoreText, StepList, StretchRow } from './duur/DuurParts';
import { WatchStatusRow } from './WatchStatusRow';
import { buildSessionBrief } from '../engine/sessionBrief';
import { getTrainingGuide, guideDayLabel } from '../data/trainingGuide';
import { durationNeedsCheck, entryMinutes, longDurationText } from '../engine/inputLimits';
import { ForgeWorkout } from './forge/ForgeWorkout';
import { Icon } from './icons';
import { TextButton } from './TextButton';
import { fuelCardLines, fuelForTraining, fuelOn } from '../engine/fuelOnTheGo';

const REST_TIMER_SECONDS = 90;
// De rij naar de pagina Trainingsplekken (uit het oude Info-blad).
const SPOTS_ROW = 'Waar kun je dit doen?';

const VARIANT_LABEL: Record<SessionVariant, string> = { full: 'Volledig', short: 'Kort', minimum: 'Minimum', custom: 'Aangepast' };
type LoggerProps = Parameters<typeof GeneralLogger>[0];

// Een krachttraining opent het workoutscherm van Forge (components/forge/). Zelf invullen voor een
// training te voet (lopen en wandelen, engine/briefing.ts#briefingEntry) is het blad Hoe ging het?
// (spoor 5 van docs/visie/Ontwerp trainingsscherm minimaal.md); de uitleg vooraf staat in de Briefing.
// Al het andere (de rustdag, fietsen, de trap) houdt dit scherm.
export function ExerciseLogger(props: LoggerProps) {
  if (props.template.type === 'strength') return <ForgeWorkout {...props} />;
  if (briefingEntry(props.template) && !props.preview) return <HowDidItGoSheet {...props} />;
  return <GeneralLogger {...props} />;
}

function GeneralLogger({
  template,
  plannedSessionId,
  scheduledDate,
  program,
  initialVariant = 'full',
  startAtForm = false,
  preview = false,
  onClose,
}: {
  template: SessionTemplate;
  plannedSessionId?: string;
  scheduledDate?: string;
  program?: Program | null;
  initialVariant?: SessionVariant;
  // Vanuit "Gedaan" op Vandaag: meteen bij het formulier "hoe ging het".
  startAtForm?: boolean;
  // "Hoe je het doet" voor een training van een latere dag: alleen lezen. Het
  // formulier en Opslaan ontbreken, er komt geen concept, onderaan staat Sluiten.
  preview?: boolean;
  onClose: () => void;
}) {
  const { logSession, reportStorageError, settings, strengthExternal, templates, plannedSessions, sessionLogs } = useAppData();
  const navigate = useNavigate();
  const { closing, requestClose: closeSheet } = useSheetClose(onClose);
  const quickComplete = template.type === 'strength' && strengthExternal;
  // De toestand van het formulier en het concept (logForm/useLogForm.ts), gedeeld met het blad Hoe ging het?.
  const form = useLogForm({ template, plannedSessionId, scheduledDate, program, initialVariant, startAtForm, preview, quickComplete });
  const { today, plan, conditioningSteps, exercises, shape, values, reachedForm } = form;
  const { variant, setLogs, guidanceMode, modalityKey } = values;
  const selectedModality = shape.selectedModality;
  // Annuleren of terug gooit het concept weg; herladen niet. Zolang er opgeslagen wordt blijft het staan
  // (state/logSave.ts#closeClearsDraft): komt het antwoord later als nee, dan staat je invulling er nog.
  const savingRef = useRef(false);
  const requestClose = () => {
    if (closeClearsDraft(savingRef.current)) form.clearDraft();
    closeSheet();
  };
  // The planned session behind this screen: the line about the watch is about it.
  const plannedSession = plannedSessionId ? plannedSessions.find((p) => p.id === plannedSessionId) : undefined;
  // Eten onderweg (engine/fuelOnTheGo.ts): de minuten van de geplande sessie, zoals De avond ervoor ze
  // leest, en anders die van de gekozen versie.
  const fullMinutes = scheduledDate ? resolveVariantDuration(template, 'full', scheduledDate, program) : durationForVariant(template, 'full');
  const variantMinutes = scheduledDate ? resolveVariantDuration(template, variant, scheduledDate, program) : durationForVariant(template, variant);
  const fuel = fuelOn(settings) ? fuelForTraining(template, variant === 'full' ? plannedSession?.plannedMinutes ?? fullMinutes : variantMinutes) : undefined;
  // Boven de grens eerst "Klopt dit?" vragen, een keer.
  const [confirmLong, setConfirmLong] = useState(false);
  const [saving, setSaving] = useState(false);
  // De uitkomst van Opslaan als er (nog) geen log staat: het duurt lang, het lukte niet, of hij stond er al.
  const [saveNote, setSaveNote] = useState<{ text: string; warn: boolean } | null>(null);
  const [restTimerFor, setRestTimerFor] = useState<string | null>(null);
  const [openExercise, setOpenExercise] = useState<string | null>(null);
  const [otherOpen, setOtherOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showWatch, setShowWatch] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (startAtForm) formRef.current?.scrollIntoView({ block: 'start' });
  }, [startAtForm]);
  const hasModalities = shape.hasModalities;
  // Route voorstellen: alleen buiten en te voet (engine/trainingPlace.ts#placeHasRoute). Dit scherm is zelf al een blad, dus het paneel klapt op zijn plek open.
  const showRoute = settings.routeProposal !== false && placeHasRoute(template, guidanceMode === 'ascend_guided' ? modalityKey : undefined);

  // Na een late uitkomst bestaat dit scherm misschien niet meer: dan sluit het niets.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  async function handleSave(confirmed = false) {
    if (preview || saving) return;
    // Leeg of 0 is "geen duur"; heel lang vraagt eerst "Klopt dit?". Een echte rustdag: 0 minuten.
    const input = form.buildInput();
    if (!confirmed && durationNeedsCheck(input.durationMinutes)) {
      setConfirmLong(true);
      return;
    }
    setConfirmLong(false);
    setSaveNote(null);
    savingRef.current = true;
    setSaving(true);
    // Het antwoord van logSession via state/logSave.ts#formAfterSave: het concept gaat alleen weg als het log er
    // staat. Staat er geen log, dan blijft het scherm open met alles wat je invulde, en zegt een zin onderaan
    // waarom. Na de grens in tijd loopt het opslaan nog: je ziet dat, en de knop blijft uit tot het klaar is,
    // zodat een tweede tik nooit een tweede log maakt (zoals het blad Hoe ging het?). Terug en Annuleren werken.
    let settled = false;
    let writeError: unknown;
    const show = (outcome: LogSaveOutcome) => {
      if (settled) return;
      settled = outcome !== 'slow';
      const next = formAfterSave(outcome);
      savingRef.current = next.buttonOff;
      if (next.clearDraft) form.clearDraft();
      // Weg terwijl het opsloeg en dan nee: niemand ziet de zin hier, dus de fout gaat naar de melding bovenin.
      if (outcome === 'failed') reportIfGone(alive.current, writeError, reportStorageError);
      if (!alive.current) return;
      if (next.close) return onClose();
      setSaving(next.buttonOff);
      const text = next.note === 'failed' ? failedNote(plannedSessionId ? HOW_TEXT.failed : HOW_TEXT.failedLoose) : next.note ? HOW_TEXT[next.note] : undefined;
      setSaveNote(text ? { text, warn: next.note === 'failed' } : null);
    };
    show(await saveLogWithin(logSession, input, { onLate: show, onWriteError: (err) => { writeError = err; } }));
  }

  const brief = buildSessionBrief(template, scheduledDate ?? today, program, {
    modalityKey: guidanceMode === 'ascend_guided' ? modalityKey : undefined,
    templates,
  });
  const guide = getTrainingGuide(template.id);
  const trainingDate = scheduledDate ?? today;
  // Je tempo (tempo en intervallen): uit je laatste testloop, onder de stappen, tenzij de kerngetallen het al noemen.
  const paceRaw = paceLine(template.id, pacesFromLogs(sessionLogs, judgmentOptions(settings)).paces);
  const myPace = paceRaw && !brief.facts.some((f) => /per km|\/km/.test(`${f.value} ${f.label}`)) ? paceRaw : undefined;
  // Waar kun je dit doen? (de pagina Trainingsplekken): dezelfde voorwaarde als het oude Info-blad.
  const showSpots = showSpotsFor(template, plan?.keyTag) && selectedModality?.environment !== 'rest';
  // Het blad Je horloge (engine/watchSheet.ts): de knop onderaan heet Horloge als het blad iets te tonen
  // heeft, anders Uitleg als er een gids is, anders Annuleren. Uitleg staat ook achter de i in de lucht.
  const watchView = useWatchSheet({ template, garmin: plan?.garmin, session: plannedSession, hasZonesNote: !!guide?.garminNote });
  const restChosen = selectedModality?.environment === 'rest';
  const weekday = weekdayShortNL(scheduledDate ?? today);
  const dateLabel = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1).toLowerCase()} ${formatDateNL(scheduledDate ?? today)}`;
  // Eén doorlopend blok: geen profiel, wel de zone (zoals de missiekaart).
  const singleZone = conditioningSteps.length === 1 && !conditioningSteps[0].noTarget ? conditioningSteps[0].intensity : undefined;
  const saveLabel = saving ? 'Opslaan…' : quickComplete ? 'Afvinken' : restChosen ? 'Rustdag afvinken' : 'Opslaan';

  function goToForm() {
    form.setReachedForm(true);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <Portal>
      <div
        className={`fixed inset-0 z-50 overflow-y-auto ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
        style={{ background: 'var(--color-bg)' }}
      >
      <div className="mx-auto max-w-md px-4 pb-32">
        <SkyBand variant="low" gear={false}>
          <div className="flex items-start gap-2">
            <button type="button" onClick={requestClose} aria-label="Terug" className="-ml-3 flex h-11 w-11 shrink-0 items-center justify-center" style={{ color: 'var(--color-ink-dim)' }}>
              <Icon name="terug" size={24} />
            </button>
            <div className="min-w-0 flex-1 pt-1">
              <Eyebrow>{brief.headline}</Eyebrow>
              <div className="flex items-start justify-between gap-2">
                <h1 className="font-display text-3xl leading-tight" style={{ color: 'var(--color-ink)' }}>{template.name}</h1>
                {guide && <div className="mt-2 shrink-0" data-sheet-from=""><InfoButton label="Waarom deze training" onClick={() => setShowInfo(true)} /></div>}
              </div>
              {brief.purpose && <MoreText text={brief.purpose} className="mt-1" color="var(--color-ink)" />}
              <p className="mt-1 text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{[dateLabel, brief.weekLabel].filter(Boolean).join(' · ')}</p>
              {preview && <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Zo staat hij klaar. Afvinken kan op de dag zelf.</p>}
            </div>
          </div>
        </SkyBand>

        <Card className="mt-1 flex flex-col gap-5">
          {/* Bij één doorlopend blok zeggen de zonebalk en zijn zin het al: zone en praattest niet nog eens als pil. */}
          <KeyNumbers facts={singleZone && !restChosen ? brief.facts.filter((f) => !/^(zone \d|praten kan)/i.test(f.value)) : brief.facts} />
          {!restChosen && plan && conditioningSteps.length > 1 ? (
            <IntervalProfile plan={plan} />
          ) : !restChosen && singleZone ? (
            <div className="flex flex-col gap-3">
              <ZoneBar active={singleZone} label={`Zone ${singleZone}`} />
              <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
                <span className="font-semibold" style={{ color: 'var(--color-progress)' }}>Zone {singleZone}.</span> {ZONE_SENTENCE[singleZone]}
              </p>
            </div>
          ) : null}
          {(brief.sportSwitch || brief.tomorrow) && (
            <div className="-mt-2 flex flex-col gap-1">
              {brief.sportSwitch && <p className="text-xs" style={{ color: 'var(--color-status)' }}>{brief.sportSwitch}</p>}
              {brief.tomorrow && <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{brief.tomorrow}</p>}
            </div>
          )}
          {/* Weer, heuvels en kleding (uit het oude Info-blad, 14 november): altijd hier, ook als Vandaag ze al
              noemt, want ze horen bij wat je aantrekt. Zonder weer (offline, binnen, rust) staat er niets. */}
          {!restChosen && (
            <div className="-mt-2 flex flex-col gap-1.5 empty:hidden">
              <WeatherLine template={template} date={trainingDate} />
              <HillsNearbyLine template={template} date={trainingDate} />
              <ClothingAdvice template={template} date={trainingDate} compact />
            </div>
          )}
        </Card>

        {!preview && availableVariants(template).length > 1 && !restChosen && (
          <div className="mt-4">
            <Segmented
              tall
              label="Versie"
              value={variant}
              onChange={form.selectVariant}
              options={availableVariants(template).map((v) => ({ value: v, label: VARIANT_LABEL[v] }))}
            />
          </div>
        )}

        {!preview && quickComplete && (
          <Card className="mt-4">
            <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Kracht bijgehouden in MacroFactor</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              Oefeningen, sets en gewicht staan in MacroFactor. Hier vink je de training alleen af.
            </p>
          </Card>
        )}

        {!restChosen && !quickComplete && plan && conditioningSteps.length > 0 && (
          <Card className="mt-4">
            <Eyebrow>Zo doe je het</Eyebrow>
            <div className="mt-1"><StepList plan={plan} /></div>
            {myPace && <p className="mt-3 text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{myPace}</p>}
          </Card>
        )}

        {/* Een training zonder opbouw in stappen (Trap af): de uitleg van het sjabloon, zin voor zin. */}
        {!restChosen && !plan && brief.howTo && brief.howTo.length > 0 && (
          <Card className="mt-4">
            <Eyebrow>Zo doe je het</Eyebrow>
            <ul className="mt-2 flex flex-col gap-1.5">
              {brief.howTo.map((line, i) => (
                <li key={`${i}-${line}`} className="flex gap-2 text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
                  <span aria-hidden="true" style={{ color: 'var(--color-ink-dim)' }}>·</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {hasModalities && guidanceMode === 'ascend_guided' && (getModalities(template.id)?.length ?? 0) > 1 && (
          <Card className="mt-4">
            <Eyebrow>{template.type === 'recovery' ? 'Wat doe je vandaag?' : 'Waar train je?'}</Eyebrow>
            <div className="mt-3">
              <ModalityChoice templateId={template.id} selectedKey={modalityKey} onSelect={form.choosePlace} enabledSports={settings.enabledSports} label={template.type === 'recovery' ? 'Wat doe je vandaag?' : 'Waar train je?'} />
            </div>
          </Card>
        )}

        {!restChosen && !quickComplete && (template.warmup?.length || template.cooldown?.length || showRoute || showSpots) ? (
          <div className="mt-4 flex flex-col divide-y divide-[var(--color-card-border)] rounded-2xl border px-4" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-card)' }}>
            {template.warmup && template.warmup.length > 0 && (
              <StretchRow icon="rekken" title="Eerst opwarmen" line={`${template.warmup.length} oefeningen`} stretches={template.warmup} />
            )}
            {template.cooldown && template.cooldown.length > 0 && (
              <StretchRow icon="rekken" title="Daarna rekken" line={`${template.cooldown.length} oefeningen`} stretches={template.cooldown} />
            )}
            {showSpots && (
              // Een pagina: eerst het trainingsscherm dicht (het concept blijft bewaard), dan de pagina.
              <button type="button" data-row="training-plekken" aria-label={`${SPOTS_ROW}, pagina`} onClick={() => { closeSheet(); navigate(spotsPageFor(template.id)); }} className="flex min-h-[56px] w-full items-center gap-3 py-2 text-left">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--color-charcoal)', color: 'var(--color-ink-dim)' }}>
                  <Icon name="locatie" size={18} />
                </span>
                <span className="min-w-0 flex-1 text-base leading-snug" style={{ color: 'var(--color-ink)' }}>{SPOTS_ROW}</span>
                <span className="shrink-0 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Pagina</span>
                <span className="shrink-0" style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={18} /></span>
              </button>
            )}
            {showRoute && <RouteProposalLine template={template} date={scheduledDate ?? today} row place={guidanceMode === 'ascend_guided' ? (modalityKey ?? null) : null} />}
            {plannedSession && !preview && <WatchStatusRow session={plannedSession} template={template} onLeave={closeSheet} className="py-2" plain />}
          </div>
        ) : plannedSession && !preview ? (
          <WatchStatusRow session={plannedSession} template={template} onLeave={closeSheet} className="mt-4" />
        ) : null}

        {!restChosen && !quickComplete && fuel && (
          <Card className="mt-4">
            <Eyebrow>Eten onderweg</Eyebrow>
            <div className="mt-2 flex flex-col gap-1">
              {fuelCardLines(fuel).map((line, i) => (
                <p key={line} className={i === 0 ? 'text-sm leading-relaxed' : 'text-xs leading-relaxed'} style={{ color: i === 0 ? 'var(--color-ink)' : 'var(--color-ink-dim)' }}>{line}</p>
              ))}
            </div>
          </Card>
        )}

        {template.type === 'strength' && !restChosen && !quickComplete && !preview && (
          <Card className="mt-4">
            <div className="flex flex-col gap-2">
                <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Zwaarte volgens MacroFactor. Vul alleen in wat je wilt bijhouden.</p>
                {exercises.map((ex) => {
                  const timed = /\d\s*(s|sec)\b/i.test(ex.reps);
                  const open = openExercise === ex.id;
                  return (
                    <div key={ex.id} className="rounded-xl border px-3 py-2.5" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm" style={{ color: 'var(--color-ink)' }}>{ex.exerciseName}</span>
                        <span className="shrink-0 text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{ex.sets} × {ex.reps.replace(/(\d)\s*s\b/i, '$1 sec')}</span>
                      </div>
                      {!timed && (
                        <div className="mt-1 flex gap-4">
                          <TextButton onClick={() => setOpenExercise(open ? null : ex.id)} aria-expanded={open} icon="omlaag" flipped={open}>
                            {open ? 'Sluiten' : 'Sets invullen'}
                          </TextButton>
                          <TextButton onClick={() => setRestTimerFor(ex.exerciseName)} aria-label={`Rusttimer voor ${ex.exerciseName}`} icon="timer">
                            Rusttimer
                          </TextButton>
                        </div>
                      )}
                      {open && !timed && (
                        <div className="mt-2 flex flex-col gap-2">
                          {(setLogs[ex.id] ?? []).map((set, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="w-6 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{i + 1}</span>
                              <div className="w-24">
                                <NumberField value={set.weightKg} onChange={(v) => form.updateSet(ex.id, i, { weightKg: v })} decimals={2} unit="kg" compact />
                              </div>
                              <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>×</span>
                              <input
                                type="number"
                                inputMode="numeric"
                                aria-label={`Herhalingen set ${i + 1}`}
                                placeholder="herh."
                                value={set.reps || ''}
                                onChange={(e) => form.updateSet(ex.id, i, { reps: Number(e.target.value) || 0 })}
                                className="w-20 rounded-lg border px-2 py-1.5 text-sm"
                                style={{ background: 'var(--color-bg)', borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </Card>
        )}

        {brief.stopSignals.length > 0 && !restChosen && (
          <Card className="mt-4">
            <Eyebrow tone="var(--color-warning)">Stop of schakel terug als</Eyebrow>
            <StopSignals signals={brief.stopSignals} />
          </Card>
        )}

        {!preview && (
        <>
        <div ref={formRef} className="scroll-mt-4" />
        <h2 className="mt-8 font-display text-2xl leading-tight" style={{ color: 'var(--color-ink)' }}>Hoe ging het?</h2>

        {asksDoneOn(form, plannedSessionId) && (
          <div className="mt-3"><DoneOnRow form={form} scheduledDate={scheduledDate} /></div>
        )}

        {restChosen ? (
          <Card className="mt-4">
            <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Een echte rustdag. Er valt niets in te vullen.</p>
          </Card>
        ) : (
        <Card className="mt-4 flex flex-col gap-4">
          <DurationField form={form} onChange={() => setConfirmLong(false)} />
          <DetailsField form={form} template={template} />
          <RpeField form={form} />
          <PainField form={form} template={template} />
          <LegsField form={form} template={template} />
          <FeelField form={form} template={template} />
          <ModalityFields form={form} />
          <OtherDoneField form={form} open={otherOpen} onToggle={() => setOtherOpen((o) => !o)} />
          <NotesField form={form} />
        </Card>
        )}
        </>
        )}
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-10 border-t"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-card-border)' }}
      >
        {preview ? (
          <div className="mx-auto flex max-w-md gap-3 px-4 pt-3" style={{ paddingBottom: 'max(var(--rand-onder), 12px)' }}>
            {watchView.hasWatchSheet ? (
              <div className="flex flex-none" data-sheet-from=""><SecondaryButton onClick={() => setShowWatch(true)} className="min-w-[88px] flex-none px-4">Horloge</SecondaryButton></div>
            ) : guide ? (
              <SecondaryButton onClick={() => setShowInfo(true)} className="min-w-[88px] flex-none px-4">Uitleg</SecondaryButton>
            ) : null}
            <PrimaryButton onClick={requestClose}>Sluiten</PrimaryButton>
          </div>
        ) : confirmLong ? (
          <div className="mx-auto max-w-md px-4 pt-3" style={{ paddingBottom: 'max(var(--rand-onder), 12px)' }} role="alert">
            <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>Klopt dit?</p>
            <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--color-warning)' }}>{longDurationText(entryMinutes(values.duration))}.</p>
            <div className="mt-3 flex gap-3">
              <SecondaryButton onClick={() => setConfirmLong(false)}>Aanpassen</SecondaryButton>
              <PrimaryButton fullWidth={false} onClick={() => void handleSave(true)} disabled={saving}>Ja, opslaan</PrimaryButton>
            </div>
          </div>
        ) : (
        <>
        {saveNote && (
          <p role="status" className="mx-auto max-w-md px-4 pt-3 text-xs leading-snug" style={{ color: saveNote.warn ? 'var(--color-warning)' : 'var(--color-ink-dim)' }}>{saveNote.text}</p>
        )}
        <div className="mx-auto flex max-w-md gap-3 px-4 pt-3" style={{ paddingBottom: 'max(var(--rand-onder), 12px)' }}>
          {watchView.hasWatchSheet ? (
            <div className="flex flex-none" data-sheet-from=""><SecondaryButton onClick={() => setShowWatch(true)} className="min-w-[88px] flex-none px-4">Horloge</SecondaryButton></div>
          ) : guide ? (
            <SecondaryButton onClick={() => setShowInfo(true)} className="min-w-[88px] flex-none px-4">Uitleg</SecondaryButton>
          ) : (
            <SecondaryButton onClick={requestClose} className="min-w-[112px] flex-none px-4">Annuleren</SecondaryButton>
          )}
          {reachedForm || restChosen || quickComplete ? (
            <PrimaryButton onClick={() => void handleSave()} disabled={saving}>{saveLabel}</PrimaryButton>
          ) : (
            <PrimaryButton onClick={goToForm}>
              <span className="inline-flex items-center justify-center gap-2"><CheckGlyph size={18} />Gedaan, invullen</span>
            </PrimaryButton>
          )}
        </div>
        </>
        )}
      </div>
      </div>

      {showInfo && guide && (
        <TrainingGuideSheet title={template.name} guide={guide} template={template} dateIso={scheduledDate ?? today} dayLabel={guideDayLabel(template, scheduledDate ?? today)} onClose={() => setShowInfo(false)} />
      )}

      {showWatch && watchView.hasWatchSheet && (
        <WatchSheet
          view={watchView}
          template={template}
          session={plannedSession}
          garmin={plan?.garmin}
          dayLabel={guideDayLabel(template, scheduledDate ?? today)}
          onClose={() => setShowWatch(false)}
          // Naar een pagina: eerst het trainingsscherm dicht. Het concept blijft bewaard (geen clearDraft).
          onLeave={closeSheet}
        />
      )}

      {restTimerFor && (
        <CountdownTimer initialSeconds={REST_TIMER_SECONDS} label={`Rust, ${restTimerFor}`} onClose={() => setRestTimerFor(null)} />
      )}
    </Portal>
  );
}

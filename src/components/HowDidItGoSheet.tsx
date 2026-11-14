// ASCEND: het blad Hoe ging het?, zelf invullen voor lopen en wandelen (spoor 5 van
// docs/visie/Ontwerp trainingsscherm minimaal.md, besluit docs/beslissingen/2026-11-12-hoe-ging-het.md).
//
// Het formulier van het oude trainingsscherm, zonder de uitleg erboven, in twee stappen zoals het blad
// van een training in Week. Stap 1: duur, Beter/Normaal/Slechter, pijn en zwaarte, met Opslaan. De rij
// Afstand, hoogtemeters en notities opent stap 2 met de overige velden. Toestand, concept en het log
// zelf komen uit logForm/useLogForm.ts en logForm/manualLog.ts, dezelfde als het oude scherm: wat het
// blad opslaat is veld voor veld gelijk.
//
// Alleen Annuleren gooit een ingevuld concept weg; het kruis, de achtergrond, wegslepen, de terugknop
// en herladen laten het staan (een leeg concept gaat altijd weg). De terugknop gaat in stap 2 eerst terug naar stap 1 (laag voor laag).

import { useRef, useState } from 'react';
import type { Program } from '../models/program';
import type { SessionTemplate, SessionVariant } from '../models/training';
import { useAppData } from '../state/AppDataContext';
import { useSheetClose } from '../utils/useSheetClose';
import { useBackToClose } from '../utils/useBackToClose';
import { durationNeedsCheck, entryMinutes, longDurationText } from '../engine/inputLimits';
import { formatDateNL, weekdayShortNL } from '../utils/dates';
import { SheetFrame } from './SheetFrame';
import { SheetHeader } from './SheetHeader';
import { SheetRow, SheetRows } from './SheetRows';
import { PrimaryButton, SecondaryButton } from './ui';
import { useLogForm, type LogForm } from './logForm/useLogForm';
import type { EnabledSports } from '../engine/sports';
import { DetailsField, DoneOnRow, DurationField, FeelField, LegsField, ModalityFields, NotesField, OtherDoneField, PainField, PlaceChoice, RpeField, VariantField } from './logForm/LogFormParts';
import { chosenPlaceLabel, placeLabel, SheetMode, showsPlace } from './logForm/formRules';
import { failedNote, logWithOwnNotice } from '../state/logSave';
import { alreadyLogged, clearsDraft, footState, HOW_TEXT, submitLog, type CloseWay, type FootState } from './logForm/howDidItGo';

export function HowDidItGoSheet({
  template,
  plannedSessionId,
  scheduledDate,
  program,
  initialVariant = 'full',
  onClose,
  onSaved,
}: {
  template: SessionTemplate;
  plannedSessionId?: string;
  scheduledDate?: string;
  program?: Program | null;
  initialVariant?: SessionVariant;
  onClose: () => void;
  // Na Opslaan, voor onClose: het blad lag over de Briefing, die gaat dan ook dicht.
  onSaved?: () => void;
}) {
  const { logSession, settings, sessionLogs } = useAppData();
  const form = useLogForm({ template, plannedSessionId, scheduledDate, program, initialVariant, startAtForm: true });
  const savingRef = useRef(false);
  // Na de grens in tijd mag het blad dicht terwijl het opslaan nog loopt; het concept blijft dan staan.
  const slowRef = useRef(false);
  const closedRef = useRef(false);
  const finish = () => { if (!closedRef.current) { closedRef.current = true; onClose(); } };
  // Alleen Annuleren wist een ingevuld concept (logForm/howDidItGo.ts#clearsDraft); een tik naast het blad,
  // wegslepen, het kruis en de terugknop laten het staan. Terwijl het opslaat blijft het blad open, tot de grens.
  const wayRef = useRef<CloseWay>('backdrop');
  const canClose = () => !savingRef.current || slowRef.current;
  const { closing, requestClose, sheetRef } = useSheetClose(() => {
    if (!savingRef.current && clearsDraft(wayRef.current, form.filled())) form.clearDraft();
    finish();
  }, 200, canClose);
  const closeAs = (way: CloseWay) => () => { if (!canClose()) return; wayRef.current = way; requestClose(); };
  const close = closeAs('cross');
  const [step, setStep] = useState<1 | 2>(1);
  // De terugknop in stap 2: eerst terug naar stap 1.
  useBackToClose(step === 2, () => setStep(1));
  const [confirmLong, setConfirmLong] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slow, setSlow] = useState(false);
  const [failed, setFailed] = useState(false);
  const [otherOpen, setOtherOpen] = useState(false);
  // Al gedaan (je horloge vinkte af terwijl het blad openstond): niets opslaan, geen tweede log.
  const alreadyDone = !saving && alreadyLogged(plannedSessionId, sessionLogs);
  const foot = footState({ alreadyDone, confirmLong });
  const { shape, values } = form;

  async function save(confirmed = false) {
    if (savingRef.current || alreadyDone) return;
    const input = form.buildInput();
    // Heel lang vraagt eerst "Klopt dit?", een keer.
    if (!confirmed && durationNeedsCheck(input.durationMinutes)) {
      setConfirmLong(true);
      return;
    }
    setConfirmLong(false);
    setFailed(false);
    setSaving(true);
    await submitLog({
      busy: savingRef,
      // De zin onderaan zegt het zelf: geen melding bovenin erbij (state/logSave.ts).
      save: () => logWithOwnNotice(logSession, input),
      onSlow: () => { slowRef.current = true; setSlow(true); },
      onSaved: () => { form.clearDraft(); onSaved?.(); finish(); },
      // Mislukt: het blad blijft open met alles wat je invulde en het concept.
      onFailed: () => setFailed(true),
    });
    slowRef.current = false;
    setSaving(false);
    setSlow(false);
  }

  // De dag en, als er meer plekken zijn, de gekozen plek als stille waarde: je ziet waar het blad je
  // training opslaat zonder stap 2 te openen.
  const day = values.doneOn === form.today ? 'Vandaag' : `${weekdayShortNL(values.doneOn)} ${formatDateNL(values.doneOn)}`;
  const place = showsPlace(form, template) ? chosenPlaceLabel(template, values.modalityKey, settings.enabledSports) : undefined;
  const dayLine = [day, place].filter(Boolean).join(' · ');
  const footer = <SheetFoot state={foot} saving={saving} slow={slow} failed={failed} loose={!plannedSessionId} rest={shape.isRest} minutes={entryMinutes(values.duration)} onClose={closeAs(foot === 'already' ? 'already' : 'cancel')} onAdjust={() => { setConfirmLong(false); setStep(1); }} onSave={(confirmed) => void save(confirmed)} />;

  if (step === 2) {
    return (
      <SheetFrame closing={closing} sheetRef={sheetRef} onClose={close} label={`${template.name}, ${HOW_TEXT.more.toLowerCase()}`} scrollKey="more" foot={footer}
        head={<SheetHeader eyebrow={HOW_TEXT.title} title={template.name} facts={HOW_TEXT.more} onBack={() => setStep(1)} onClose={close} />}>
        {foot !== 'already' && <StepTwo form={form} template={template} scheduledDate={scheduledDate} enabledSports={settings.enabledSports} otherOpen={otherOpen} onToggleOther={() => setOtherOpen((o) => !o)} />}
      </SheetFrame>
    );
  }

  return (
    <SheetFrame closing={closing} sheetRef={sheetRef} onClose={close} label={`${template.name}, ${HOW_TEXT.title.toLowerCase()}`} scrollKey="main" foot={footer}
      head={<SheetHeader eyebrow={HOW_TEXT.title} title={template.name} facts={dayLine} onClose={close} />}>
      {foot !== 'already' && <StepOne form={form} template={template} plannedSessionId={plannedSessionId} scheduledDate={scheduledDate} onDuration={() => setConfirmLong(false)} onMore={() => setStep(2)} />}
    </SheetFrame>
  );
}

// Stap 1: duur, Beter/Normaal/Slechter, pijn en zwaarte, en de rij naar stap 2.
export function StepOne({ form, template, plannedSessionId, scheduledDate, onDuration, onMore }: { form: LogForm; template: SessionTemplate; plannedSessionId?: string; scheduledDate?: string; onDuration: () => void; onMore: () => void }) {
  return (
    <SheetMode.Provider value>
    <div className="quiet-form mt-4 flex flex-col gap-4">
      {/* Een losse training: de dag is de eerste vraag. Een geplande van een dag die voorbij is: stap 2. */}
      {!plannedSessionId && <DoneOnRow form={form} scheduledDate={scheduledDate} />}
      {form.shape.isRest ? (
        <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{HOW_TEXT.restLine}</p>
      ) : (
        <>
          <DurationField form={form} onChange={onDuration} />
          <FeelField form={form} template={template} />
          <PainField form={form} template={template} />
          <RpeField form={form} />
        </>
      )}
      <SheetRows>
        <SheetRow title={HOW_TEXT.more} onClick={onMore} />
      </SheetRows>
    </div>
    </SheetMode.Provider>
  );
}

// Stap 2: de overige velden van het oude formulier; Gedaan op bij een geplande training van een dag die voorbij is.
export function StepTwo({ form, template, scheduledDate, enabledSports, otherOpen, onToggleOther }: {
  form: LogForm; template: SessionTemplate; scheduledDate?: string; enabledSports?: Partial<EnabledSports>; otherOpen: boolean; onToggleOther: () => void;
}) {
  return (
    <SheetMode.Provider value>
    <div className="quiet-form mt-4 flex flex-col gap-4">
      {form.plannedInPast && <DoneOnRow form={form} scheduledDate={scheduledDate} />}
      {showsPlace(form, template) && (
        <div>
          <p className="mb-2 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{placeLabel(template)}</p>
          <PlaceChoice form={form} template={template} enabledSports={enabledSports} />
        </div>
      )}
      <VariantField form={form} template={template} />
      {!form.shape.isRest && (
        <>
          <DetailsField form={form} template={template} />
          <ModalityFields form={form} />
          <LegsField form={form} template={template} />
          <OtherDoneField form={form} open={otherOpen} onToggle={onToggleOther} />
          <NotesField form={form} />
        </>
      )}
    </div>
    </SheetMode.Provider>
  );
}

// Onderaan: al gedaan (alleen Sluiten), Klopt dit? bij een heel lange duur, of Annuleren en Opslaan met
// wat het opslaan zegt (duurt lang, lukte niet).
export function SheetFoot({ state, saving, slow, failed, loose = false, rest, minutes, onClose, onAdjust, onSave }: {
  state: FootState; saving: boolean; slow: boolean; failed: boolean; loose?: boolean; rest: boolean; minutes: number; onClose: () => void; onAdjust: () => void; onSave: (confirmed: boolean) => void;
}) {
  if (state === 'already') {
    return (
      <div role="status">
        <p className="mb-3 text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{HOW_TEXT.already}</p>
        <SecondaryButton onClick={onClose} className="w-full">{HOW_TEXT.close}</SecondaryButton>
      </div>
    );
  }
  if (state === 'confirm') {
    return (
      <div role="alert">
        <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{HOW_TEXT.confirm}</p>
        <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--color-warning)' }}>{longDurationText(minutes)}.</p>
        <div className="mt-3 flex gap-3">
          <SecondaryButton onClick={onAdjust}>{HOW_TEXT.adjust}</SecondaryButton>
          <PrimaryButton fullWidth={false} onClick={() => onSave(true)} disabled={saving}>{HOW_TEXT.confirmSave}</PrimaryButton>
        </div>
      </div>
    );
  }
  return (
    <div>
      {(slow || failed) && (
        <p role="status" className="mb-2 text-xs leading-snug" style={{ color: failed ? 'var(--color-warning)' : 'var(--color-ink-dim)' }}>{failed ? failedNote(loose ? HOW_TEXT.failedLoose : HOW_TEXT.failed) : HOW_TEXT.slow}</p>
      )}
      <div className="flex gap-3">
        <SecondaryButton onClick={onClose} disabled={saving && !slow} className="min-w-[112px] flex-none px-4">{HOW_TEXT.cancel}</SecondaryButton>
        <PrimaryButton onClick={() => onSave(false)} disabled={saving}>{saving ? HOW_TEXT.saving : rest ? HOW_TEXT.rest : HOW_TEXT.save}</PrimaryButton>
      </div>
    </div>
  );
}

// ASCEND: het blad Hoe ging het? na een training die je horloge afvinkte (spoor 6 van
// docs/visie/Ontwerp trainingsscherm minimaal.md, besluit docs/beslissingen/2026-11-14-hoe-ging-het-horloge.md).
// De rij bovenaan Je dag opent dit blad; het verving de kaart Van je horloge op Vandaag (WatchAskCard).
//
// Dezelfde vragen in dezelfde volgorde als zelf invullen (HowDidItGoSheet, regel 7): Beter, Normaal of Slechter;
// pijn Nee of Ja; zwaarte. Wat het horloge al weet staat als één regel bovenaan. Welke velden in stap 1 staan en
// welke achter Meer zegt de instelling Vragen na je loop (engine/afterRun.ts#afterRunSteps). Wat het opslaat is
// precies wat de kaart opsloeg: gevoel, zwaarte en pijn op het log (autoTick.ts#applyFeedback) en de weging.

import { useRef, useState } from 'react';
import type { PainReport } from '../models/checkIn';
import type { SessionLog, SessionTemplate, SubjectiveFeel } from '../models/training';
import type { FeedbackPatch } from '../engine/autoTick';
import { afterRunFacts, afterRunHas, afterRunMoreLine, attemptWithin, afterRunSaveLabel, afterRunSteps, afterRunTitle, availableFields, AFTER_RUN_TEXT, type AfterRunField, type AfterRunQuestions } from '../engine/afterRun';
import { isTrimmable } from '../engine/trimLog';
import { useSheetClose } from '../utils/useSheetClose';
import { useAppData } from '../state/AppDataContext';
import { useBackToClose } from '../utils/useBackToClose';
import { formatDateNL, todayISO, weekdayLongNL } from '../utils/dates';
import { SheetFrame } from './SheetFrame';
import { SheetHeader } from './SheetHeader';
import { SheetRow, SheetRows } from './SheetRows';
import { InfoButton, PrimaryButton } from './ui';
import { TextButton } from './TextButton';
import { PainReportFields } from './PainReportFields';
import { StravaTextButton } from './StravaTextButton';
import { SweatAfterRow } from './SweatAfter';
import { useSweatAfter } from './useSweatAfter';
import { TrimSheet } from './TrimSheet';
import { FeelChoice, RpeChoice } from './logForm/LogFormParts';
import { asksPain, SheetMode } from './logForm/formRules';

function dayLabel(iso: string): string {
  return iso === todayISO() ? 'vandaag' : `${weekdayLongNL(iso)} ${formatDateNL(iso)}`;
}

type Outcome = { text: string; warn: boolean } | undefined;

export function WatchAskSheet({
  log,
  template,
  mode,
  canReject,
  onAnswer,
  onReject,
  onClose,
}: {
  log: SessionLog;
  template: SessionTemplate | undefined;
  mode: AfterRunQuestions;
  canReject: boolean;
  onAnswer: (patch: FeedbackPatch) => Promise<void>;
  onReject: () => Promise<void>;
  // Sluiten zonder antwoord is Niet nu: de rij blijft staan zolang de vraag open mag (72 uur).
  onClose: () => void;
}) {
  const [feel, setFeel] = useState<SubjectiveFeel | undefined>(log.subjectiveFeel);
  const [rpe, setRpe] = useState<number | ''>(log.rpe ?? '');
  const [pain, setPain] = useState<PainReport[]>(log.painReports ?? []);
  const sweat = useSweatAfter(log);
  const [step, setStep] = useState<1 | 2>(1);
  const [info, setInfo] = useState(false);
  const [trimming, setTrimming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>();
  const busyRef = useRef(false);
  const slowRef = useRef(false);
  // Terwijl het opslaat blijft het blad open, tot de grens in tijd; daarna mag het dicht (het opslaan loopt door).
  const { closing, requestClose, sheetRef } = useSheetClose(onClose, 200, () => !busyRef.current || slowRef.current);
  useBackToClose(step === 2, () => setStep(1));

  const { settings } = useAppData();
  const showsPain = !!template && asksPain(template);
  const canTrim = isTrimmable(log) && !log.trim;
  const has = afterRunHas({ templateType: template?.type, pain: showsPain, sweat: sweat.show, trim: canTrim, strava: settings.stravaText !== false });
  const plan = afterRunSteps(mode);
  const steps = { first: availableFields(plan.first, has), more: availableFields(plan.more, has) };
  const answered = feel !== undefined || rpe !== '' || pain.length > 0 || !!sweat.result;

  // Eén keer tegelijk, met een grens in tijd en een zichtbare uitkomst. Gelukt: het blad gaat dicht en de rij is weg.
  async function run(action: () => Promise<void>, failed: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setOutcome(undefined);
    const ok = await attemptWithin(action, () => { slowRef.current = true; setSlow(true); });
    busyRef.current = false;
    slowRef.current = false;
    setBusy(false);
    setSlow(false);
    if (ok) onClose();
    else setOutcome({ text: failed, warn: true });
  }

  const save = () => run(async () => {
    // De weging gaat mee; lukt die niet, dan kan hij later in het Logboek. Het gevoel gaat altijd mee.
    await sweat.save();
    await onAnswer({ rpe: rpe === '' ? undefined : rpe, subjectiveFeel: feel, painReports: pain });
  }, AFTER_RUN_TEXT.failed);
  const reject = () => run(onReject, AFTER_RUN_TEXT.rejectFailed);

  const field = (f: AfterRunField) => {
    switch (f) {
      case 'feel':
        return <FeelChoice key={f} value={feel} onChange={setFeel} />;
      case 'pain':
        return <PainReportFields key={f} value={pain} onChange={setPain} />;
      case 'rpe':
        return <RpeChoice key={f} value={rpe} onChange={setRpe} note={log.rpe !== undefined && rpe === log.rpe ? AFTER_RUN_TEXT.watchRpe : undefined} />;
      case 'sweat':
        return <SweatAfterRow key={f} sweat={sweat} />;
      case 'trim':
        return <div key={f}><TextButton tone="dim" onClick={() => setTrimming(true)} disabled={busy}>{AFTER_RUN_TEXT.trim}</TextButton></div>;
      case 'strava':
        return <div key={f}><StravaTextButton log={log} template={template} /></div>;
    }
  };

  const title = afterRunTitle(template?.name);
  const facts = afterRunFacts(log, dayLabel);
  const foot = (
    <div className="flex flex-col gap-2">
      {(slow || outcome) && (
        <p role="status" className="text-xs leading-snug" style={{ color: outcome?.warn ? 'var(--color-warning)' : 'var(--color-ink-dim)' }}>{outcome ? outcome.text : AFTER_RUN_TEXT.slow}</p>
      )}
      <PrimaryButton onClick={() => void save()} disabled={busy}>{busy ? 'Opslaan…' : afterRunSaveLabel(answered)}</PrimaryButton>
      <div className="flex justify-center gap-6">
        {canReject && <TextButton tone="dim" onClick={() => void reject()} disabled={busy}>{AFTER_RUN_TEXT.reject}</TextButton>}
        <TextButton tone="dim" onClick={requestClose} disabled={busy && !slow}>{AFTER_RUN_TEXT.later}</TextButton>
      </div>
    </div>
  );
  const head = (
    <SheetHeader
      eyebrow={AFTER_RUN_TEXT.row}
      title={title}
      facts={step === 1 ? facts : AFTER_RUN_TEXT.more}
      info={step === 1 ? <InfoButton label="Waarom afgevinkt?" onClick={() => setInfo((v) => !v)} /> : undefined}
      onBack={step === 2 ? () => setStep(1) : undefined}
      onClose={requestClose}
    />
  );

  return (
    <>
      <SheetFrame closing={closing} sheetRef={sheetRef} onClose={requestClose} label={`${title}, ${AFTER_RUN_TEXT.row.toLowerCase()}`} scrollKey={String(step)} head={head} foot={foot}>
        <SheetMode.Provider value>
          <div className="quiet-form mt-4 flex flex-col gap-4">
            {step === 1 && info && (
              <div className="flex flex-col gap-1.5">
                {AFTER_RUN_TEXT.info.map((line) => <p key={line} className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{line}</p>)}
              </div>
            )}
            {(step === 1 ? steps.first : steps.more).map(field)}
            {step === 1 && steps.more.length > 0 && (
              <SheetRows>
                <SheetRow title={AFTER_RUN_TEXT.more} sub={afterRunMoreLine(steps.more)} onClick={() => setStep(2)} />
              </SheetRows>
            )}
          </div>
        </SheetMode.Provider>
      </SheetFrame>
      {trimming && <TrimSheet log={log} templateName={template?.name ?? 'Training'} onClose={() => setTrimming(false)} />}
    </>
  );
}

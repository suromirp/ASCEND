import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../../state/AppDataContext';
import { SEVERITY_CHOICES } from '../../data/bodyCare';
import { answerWeek, KIND_CHOICES, suggestionFor } from '../../engine/bodyCheck';
import { BODY_VIEWS, injuryNameFor, SIDE_LABEL, sideChoicesFor, spotTitle, type BodySpot, type BodyView, type SideChoice } from '../../engine/bodyMap';
import { resolveFigure } from '../../engine/figureSettings';
import type { InjuryKind, InjurySeverity } from '../../models/injury';
import { todayISO } from '../../utils/dates';
import { useSheetClose } from '../../utils/useSheetClose';
import { withTimeout } from '../../utils/withTimeout';
import { ChoiceStrip } from '../ChoiceStrip';
import { Icon } from '../icons';
import { Portal } from '../Portal';
import { SheetClose } from '../SheetHeader';
import { StretchItems } from '../StretchList';
import { TextButton } from '../TextButton';
import { Card, Eyebrow, PrimaryButton, Segmented } from '../ui';
import { BodyFigure, SpotThumb } from './BodyFigure';
import { REPORT_TIMEOUT_MS } from './reportConfig';

// Het blad van de kaart "Hoe voelt je lijf?" (docs/beslissingen/2026-10-26-hoe-voelt-je-lijf.md), in
// drie stappen in hetzelfde blad: een plek aanwijzen (alleen bij "Iets anders aanwijzen"), kiezen wat
// je merkt (spierpijn, stijf of pijn, bij pijn ook hoe erg, en de kant), en daarna wat kan helpen.
// Alles komt in dezelfde lijst klachten als Lichaam (addInjury). Het verandert de planning niet.

type Step = 'pick' | 'report' | 'done';

const kindLabel = (k: InjuryKind) => KIND_CHOICES.find((c) => c.value === k)?.label ?? k;

export function BodyCheckSheet({
  spot: initial,
  defaultKind = 'spierpijn',
  weekStart,
  onSaved,
  onClose,
}: {
  // Zonder plek begint het blad met aanwijzen op het figuur.
  spot?: BodySpot;
  defaultKind?: InjuryKind;
  weekStart: string;
  onSaved: (spot: BodySpot) => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { settings, addInjury, updateSettings } = useAppData();
  const goto = useRef<string | null>(null);
  const { closing, requestClose, sheetRef } = useSheetClose(() => {
    onClose();
    if (goto.current) navigate(goto.current);
  });
  const { figure } = resolveFigure(settings);

  const [step, setStep] = useState<Step>(initial ? 'report' : 'pick');
  const [spot, setSpot] = useState<BodySpot | undefined>(initial);
  const [view, setView] = useState<BodyView>('front');
  const [kind, setKind] = useState<InjuryKind>(defaultKind);
  const [severity, setSeverity] = useState<InjurySeverity | undefined>(undefined);
  const [side, setSide] = useState<SideChoice>('beide');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [fysioOpen, setFysioOpen] = useState(false);

  const choices = spot ? sideChoicesFor(spot) : [];
  const chosenSide: SideChoice | undefined = choices.length > 0 ? side : undefined;
  const canSave = !!spot && !busy && (kind !== 'pijn' || severity !== undefined);

  async function save() {
    if (!spot || !canSave) return;
    setBusy(true);
    setFailed(false);
    const level: InjurySeverity = kind === 'pijn' ? severity! : 'licht';
    try {
      await withTimeout(addInjury({ date: todayISO(), bodyPart: injuryNameFor(spot, chosenSide), severity: level, kind, side: chosenSide }), REPORT_TIMEOUT_MS);
      // De week is afgehandeld: een melding sluit hem, zoals Voel me fris.
      await withTimeout(
        updateSettings({ weeklyHealthChecks: answerWeek(settings.weeklyHealthChecks, weekStart, { kind: 'melding', soreness: kind !== 'pijn', area: spot.injuryParts[0], severity: level }) }),
        REPORT_TIMEOUT_MS,
      );
      onSaved(spot);
      setFysioOpen(kind === 'pijn' && level === 'ernstig');
      setStep('done');
    } catch {
      setFailed(true);
    }
    setBusy(false);
  }

  const savedName = spot ? (chosenSide === 'beide' || choices.length === 0 ? spotTitle(spot).title : injuryNameFor(spot, chosenSide)) : '';

  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={() => !busy && requestClose()}>
        <div ref={sheetRef}
          className={`max-h-[92vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label="Hoe voelt je lijf?"
        >
          <Card className="flex flex-col gap-4 rounded-b-none border-b-0 pb-6">
            {step === 'pick' && (
              <>
                <div className="flex h-11 items-center">
                  <div className="min-w-0 flex-1"><Eyebrow>Hoe voelt je lijf?</Eyebrow></div>
                  <SheetClose onClose={requestClose} className="-mr-3" />
                </div>
                <h2 className="font-display text-2xl leading-tight" style={{ color: 'var(--color-ink)' }}>Waar zit het?</h2>
                <div className="mx-auto w-full max-w-[260px]">
                  <Segmented label="Kant van het lichaam" tall value={view} options={BODY_VIEWS.map((v) => ({ value: v.value, label: v.label }))} onChange={setView} />
                </div>
                <BodyFigure
                  view={view}
                  figure={figure}
                  flagged={new Set()}
                  onPick={(s) => {
                    setSpot(s);
                    setSide('beide');
                    setStep('report');
                  }}
                />
              </>
            )}

            {step !== 'pick' && spot && (
              <>
                <div className="flex items-start gap-3">
                  <SpotThumb spot={spot} figure={figure} side={chosenSide} />
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex h-6 items-center gap-1.5">
                      {step === 'done' && <span style={{ color: 'var(--color-action)' }}><Icon name="vinkje" size={16} /></span>}
                      <Eyebrow>{step === 'done' ? 'Opgeslagen' : 'Hoe voelt je lijf?'}</Eyebrow>
                    </div>
                    <h2 className="break-words font-display text-2xl leading-tight" style={{ color: 'var(--color-ink)' }}>
                      {step === 'done' ? savedName : spotTitle(spot).title}
                    </h2>
                    <p className="mt-0.5 text-sm" style={{ color: 'var(--color-ink-dim)' }}>
                      {step === 'done'
                        ? [kindLabel(kind), kind === 'pijn' && severity ? severity : '', chosenSide === 'beide' && choices.length > 0 ? 'beide kanten' : '', 'vandaag'].filter(Boolean).join(' · ')
                        : spotTitle(spot).sub}
                    </p>
                  </div>
                  <SheetClose onClose={requestClose} className="-mr-3 -mt-1" />
                </div>

                {step === 'report' && (
                  <>
                    <p className="-mb-2 text-base" style={{ color: 'var(--color-ink)' }}>Wat merk je?</p>
                    <ChoiceStrip
                      label="Wat merk je"
                      value={kind}
                      options={KIND_CHOICES.map((c) => ({ value: c.value, label: c.label }))}
                      onChange={(v) => v && setKind(v)}
                    />
                    <p className="-mt-2 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{KIND_CHOICES.find((c) => c.value === kind)?.line}</p>

                    {kind === 'pijn' && (
                      <>
                        <p className="-mb-2 text-base" style={{ color: 'var(--color-ink)' }}>Hoe erg?</p>
                        <ChoiceStrip
                          label="Hoe erg"
                          value={severity}
                          options={SEVERITY_CHOICES.map((c) => ({ value: c.value, label: c.label }))}
                          onChange={(v) => setSeverity(v)}
                        />
                        <p className="-mt-2 text-sm" style={{ color: 'var(--color-ink-dim)' }}>
                          {SEVERITY_CHOICES.find((c) => c.value === severity)?.line ?? 'Kies hoe erg het nu is.'}
                        </p>
                      </>
                    )}

                    {choices.length > 0 && (
                      <>
                        <p className="-mb-2 text-base" style={{ color: 'var(--color-ink)' }}>Welke kant?</p>
                        <ChoiceStrip label="Welke kant" value={side} options={choices.map((c) => ({ value: c, label: SIDE_LABEL[c] }))} onChange={(v) => v && setSide(v)} />
                      </>
                    )}

                    {failed && <p role="alert" className="text-sm" style={{ color: 'var(--color-danger-text)' }}>Opslaan lukte niet. Probeer het nog eens.</p>}
                    <PrimaryButton onClick={() => void save()} disabled={!canSave}>{busy ? 'Bezig…' : 'Opslaan'}</PrimaryButton>
                  </>
                )}

                {step === 'done' && <Suggestion spot={spot} kind={kind} severity={kind === 'pijn' ? severity : undefined} fysioOpen={fysioOpen} onToggleFysio={() => setFysioOpen((o) => !o)} onAll={() => { goto.current = `/lichaam/${spot.id}`; requestClose(); }} onDone={requestClose} />}
              </>
            )}
          </Card>
        </div>
      </div>
    </Portal>
  );
}

function Suggestion({
  spot,
  kind,
  severity,
  fysioOpen,
  onToggleFysio,
  onAll,
  onDone,
}: {
  spot: BodySpot;
  kind: InjuryKind;
  severity?: InjurySeverity;
  fysioOpen: boolean;
  onToggleFysio: () => void;
  onAll: () => void;
  onDone: () => void;
}) {
  const s = suggestionFor(spot, kind, severity);
  return (
    <>
      <div>
        <Eyebrow>Wat kan helpen</Eyebrow>
        <p className="mt-1.5 text-base leading-snug" style={{ color: 'var(--color-ink)' }}>{s.help}</p>
        {s.source && <p className="mt-1.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{s.source}</p>}
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-3">
          <Eyebrow>Rekken en losmaken</Eyebrow>
          <span className="font-sans text-sm tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{s.minutes} min</span>
        </div>
        <StretchItems stretches={s.stretches} className="mt-1 flex flex-col" />
      </div>

      {s.fysio.length > 0 && (
        <div className="border-t" style={{ borderColor: 'var(--color-card-border)' }}>
          <button type="button" onClick={onToggleFysio} aria-expanded={fysioOpen} className="flex min-h-[52px] w-full items-center gap-3 text-left">
            <span style={{ color: 'var(--color-warning)' }}><Icon name="letOp" size={20} /></span>
            <span className="min-w-0 flex-1 text-base" style={{ color: 'var(--color-ink)' }}>Wanneer naar een fysio of huisarts?</span>
            <span className="shrink-0 transition-transform" style={{ color: 'var(--color-ink-dim)', transform: fysioOpen ? 'rotate(180deg)' : undefined }}><Icon name="omlaag" size={18} /></span>
          </button>
          {fysioOpen && (
            <div className="flex flex-col gap-2 pb-2 pl-8">
              {s.direct && <p className="text-sm font-medium leading-snug" style={{ color: 'var(--color-danger-text)' }}>{s.direct}</p>}
              <ul className="flex flex-col gap-1.5">
                {s.fysio.map((line) => (
                  <li key={line} className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{line.charAt(0).toUpperCase() + line.slice(1)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <PrimaryButton onClick={onDone}>Klaar</PrimaryButton>
      <div className="-mt-2 flex flex-col items-start">
        <TextButton onClick={onAll} icon="verder">Alles voor deze plek</TextButton>
        <span className="whitespace-nowrap text-sm" style={{ color: 'var(--color-ink-dim)' }}>Je planning verandert niet.</span>
      </div>
    </>
  );
}

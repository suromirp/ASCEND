import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import { SEVERITY_CHOICES } from '../data/bodyCare';
import { breakableSpotName, careForSpot, injuryNameFor, isValidReportDate, openComplaintsBySpot, spotById, stretchesForSpot, stretchMinutes, type BodySpot } from '../engine/bodyMap';
import { resolveFigure } from '../engine/figureSettings';
import type { InjurySeverity } from '../models/injury';
import { todayISO } from '../utils/dates';
import { withTimeout } from '../utils/withTimeout';
import { Card, Eyebrow, InfoButton, PageHeader, PrimaryButton, SecondaryButton } from '../components/ui';
import { ChoiceStrip } from '../components/ChoiceStrip';
import { Icon } from '../components/icons';
import { StretchItems } from '../components/StretchList';
import { SpotThumb } from '../components/lichaam/BodyFigure';
import { OpenComplaint } from '../components/lichaam/Complaints';
import { ReportDateField } from '../components/lichaam/ReportSheet';
import { REPORT_TIMEOUT_MS, reportInputStyle } from '../components/lichaam/reportConfig';
import { StretchInfoSheet } from '../components/lichaam/StretchInfoSheet';

const dot = <span aria-hidden="true" className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--color-action)' }} />;
const inputStyle = reportInputStyle;

// Het detail van een plek: wat je doet bij last (met wanneer naar een fysio), rekken en
// losmaken, voorkomen en melden. Eigen route (/lichaam/:plek), zodat de terugknop werkt.
export function BodySpotPage() {
  const { plek } = useParams<{ plek: string }>();
  const navigate = useNavigate();
  const spot = spotById(plek);

  if (!spot) {
    return (
      <div className="animate-page-in flex flex-col gap-5 px-4 pb-10 pt-6">
        <PageHeader eyebrow="Lichaam" title="Plek niet gevonden" fallback="/lichaam" />
        <Card className="flex flex-col gap-3">
          <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Deze plek ken ik niet. Kies er een op het figuur.</p>
          <SecondaryButton onClick={() => navigate('/lichaam')}>Naar Lichaam</SecondaryButton>
        </Card>
      </div>
    );
  }
  return <SpotDetail spot={spot} />;
}

function SpotDetail({ spot }: { spot: BodySpot }) {
  const { settings, injuryNotes, resolveInjury, deleteInjury } = useAppData();
  const { figure } = resolveFigure(settings);
  const care = careForSpot(spot);
  const stretches = stretchesForSpot(spot);
  const here = openComplaintsBySpot(injuryNotes)[spot.id] ?? [];
  const [showStretchInfo, setShowStretchInfo] = useState(false);

  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-10 pt-6">
      <PageHeader eyebrow="Lichaam" title={breakableSpotName(spot.name)} line={spot.where} fallback="/lichaam" right={<SpotThumb spot={spot} figure={figure} />} />

      <div className="flex flex-col gap-3">
        <Card className="flex flex-col gap-3">
          <Eyebrow>Wat je doet bij last</Eyebrow>
          <ul className="flex flex-col gap-2.5">
            {care.bijLast.map((line) => (
              <li key={line} className="flex gap-2.5">
                {dot}
                <p className="text-base leading-snug" style={{ color: 'var(--color-ink)' }}>{line}</p>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
            <p className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
              <span style={{ color: 'var(--color-warning)' }}><Icon name="letOp" size={18} /></span>
              Naar een fysio of je huisarts bij
            </p>
            <ul className="flex flex-col gap-1.5 pl-7">
              {care.fysioAll.map((line) => (
                <li key={line} className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{line.charAt(0).toUpperCase() + line.slice(1)}</li>
              ))}
            </ul>
            {care.direct && (
              <p className="pl-7 text-sm font-medium leading-snug" style={{ color: 'var(--color-danger-text)' }}>{care.direct}</p>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-baseline justify-between gap-3">
            <div className="flex items-center gap-5">
              <Eyebrow>Rekken en losmaken</Eyebrow>
              <InfoButton onClick={() => setShowStretchInfo(true)} label="Over rekken en losmaken" />
            </div>
            <span className="font-sans text-sm tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{stretchMinutes(stretches)} min</span>
          </div>
          <StretchItems stretches={stretches} className="mt-2 flex flex-col" />
          <p className="mt-2 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Rustig en zonder te veren. Voel je pijn, geen lichte spanning, stop dan.</p>
        </Card>

        <Card>
          <Eyebrow>Voorkomen</Eyebrow>
          <p className="mt-1.5 text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{care.voorkomen.intro}</p>
          <ul className="mt-1 flex flex-col">
            {care.voorkomen.oefeningen.map((e, i) => (
              <li key={e.name} className={`flex min-h-[56px] items-center justify-between gap-3 py-2 ${i > 0 ? 'border-t' : ''}`} style={{ borderColor: 'var(--color-card-border)' }}>
                <div className="min-w-0">
                  <p className="text-base leading-snug" style={{ color: 'var(--color-ink)' }}>{e.name}</p>
                  {e.note && <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{e.note}</p>}
                </div>
                <span className="shrink-0 text-right font-sans text-sm tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{e.dose}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{care.voorkomen.basis}</p>
        </Card>

        <Card className="flex flex-col gap-3">
          <Eyebrow>Melden</Eyebrow>
          {here.map((n) => (
            <OpenComplaint key={n.id} note={n} linked={false} onResolve={(id) => void resolveInjury(id)} onDelete={(id) => void deleteInjury(id)} />
          ))}
          <ReportForm spot={spot} hasOpen={here.length > 0} />
        </Card>
      </div>

      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Algemene uitleg, geen diagnose. Twijfel je, vraag het een fysio of je huisarts.</p>
      {showStretchInfo && <StretchInfoSheet onClose={() => setShowStretchInfo(false)} />}
    </div>
  );
}

// Een klacht vastleggen via de bestaande blessurelogica (addInjury). Dit verandert de
// planning niet en vraagt dus ook geen Akkoord; de tekst zegt dat eerlijk. Zodra melden de
// planning wel gaat veranderen, hoort er een voorstel met Akkoord tussen (ProposalSheet).
function ReportForm({ spot, hasOpen }: { spot: BodySpot; hasOpen: boolean }) {
  const { addInjury } = useAppData();
  const [severity, setSeverity] = useState<InjurySeverity>('licht');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO());
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle');
  const line = SEVERITY_CHOICES.find((c) => c.value === severity)?.line;

  async function report() {
    if (busy || !isValidReportDate(date, todayISO())) return;
    setBusy(true);
    setState('idle');
    try {
      // Een grens in tijd: de knop blijft niet op "Bezig..." staan als opslaan stokt.
      await withTimeout(addInjury({ date, bodyPart: injuryNameFor(spot), severity, note: note.trim() || undefined }), REPORT_TIMEOUT_MS);
      setNote('');
      setDate(todayISO());
      setState('done');
    } catch {
      setState('failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-base" style={{ color: 'var(--color-ink)' }}>{hasOpen ? 'Nog een klacht melden. Hoe erg is het nu?' : 'Hoe erg is het nu?'}</p>
      <ChoiceStrip
        label="Hoe erg"
        value={severity}
        options={SEVERITY_CHOICES.map((c) => ({ value: c.value, label: c.label }))}
        onChange={(v) => v && setSeverity(v)}
      />
      {line && <p className="-mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{line}</p>}
      <ReportDateField id="klacht-datum" value={date} onChange={setDate} />
      <div>
        <label htmlFor="klacht-notitie" className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Wat merk je? (hoeft niet)</label>
        <textarea
          id="klacht-notitie"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={280}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-base"
          style={inputStyle}
        />
      </div>
      <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
        Melden legt de klacht vast, meer niet. Je planning verandert er niet door. Bij een klacht aan been of voet laat ASCEND op Vandaag een hint zien bij zware beentrainingen; jij kiest per training. De week zelf pas je aan op Week.
      </p>
      <PrimaryButton onClick={() => void report()} disabled={busy || !isValidReportDate(date, todayISO())}>{busy ? 'Bezig…' : 'Melden'}</PrimaryButton>
      {state === 'done' && (
        <p role="status" className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-success-text)' }}>
          <Icon name="vinkje" size={16} /> Vastgelegd. Je vindt de klacht terug op Lichaam.
        </p>
      )}
      {state === 'failed' && (
        <p role="alert" className="text-sm" style={{ color: 'var(--color-danger-text)' }}>Opslaan lukte niet. Probeer het nog eens.</p>
      )}
    </div>
  );
}

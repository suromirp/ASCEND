// ASCEND: "Van je horloge", the second kind: ASCEND has ticked off a training
// by itself, because the watch had exactly one activity that fitted the
// planned training of that day (engine/autoTick.ts). What is left is the
// question "Hoe ging het?" (feel, RPE and pain, the same choices as the
// logging screen) and a way back: "Klopt niet" takes the log away again, which
// is allowed only because the app made it itself a moment ago.

import { useState } from 'react';
import type { PainReport } from '../models/checkIn';
import type { SessionLog, SessionTemplate, SubjectiveFeel } from '../models/training';
import type { FeedbackPatch } from '../engine/autoTick';
import { isLegHeavyTemplate } from '../engine/scheduler';
import { formatNumberNL } from '../utils/number';
import { formatDateNL, todayISO, weekdayLongNL } from '../utils/dates';
import { PainReportFields } from './PainReportFields';
import { Card, Eyebrow, PrimaryButton, SecondaryButton } from './ui';
import { TextButton } from './TextButton';

const FEELS: [SubjectiveFeel, string][] = [['better', 'Beter'], ['normal', 'Normaal'], ['worse', 'Slechter']];

function dayLabel(iso: string): string {
  return iso === todayISO() ? 'vandaag' : `${weekdayLongNL(iso)} ${formatDateNL(iso)}`;
}

// "38 min, 5,2 km, vandaag": what the log holds, in a line.
function describeLog(log: SessionLog): string {
  const metric = log.cardioData ?? log.outdoorData;
  const parts = [`${log.durationMinutes} min`];
  if (metric?.distanceKm) parts.push(`${formatNumberNL(metric.distanceKm, 1)} km`);
  if (metric?.elevationGainM && metric.elevationGainM >= 1) parts.push(`+${formatNumberNL(metric.elevationGainM, 0)} m`);
  parts.push(dayLabel(log.completedDate));
  return parts.join(', ');
}

export function WatchAskCard({
  log,
  template,
  busy,
  onAnswer,
  onReject,
  onLater,
  onTrim,
}: {
  log: SessionLog;
  template: SessionTemplate | undefined;
  busy: boolean;
  onAnswer: (patch: FeedbackPatch) => void;
  onReject: () => void;
  onLater: () => void;
  // Only for a watch activity that can be cut (engine/trimLog.ts#isTrimmable).
  onTrim?: () => void;
}) {
  const [feel, setFeel] = useState<SubjectiveFeel | undefined>(log.subjectiveFeel);
  const [rpe, setRpe] = useState<number | undefined>(log.rpe);
  const [pain, setPain] = useState<PainReport[]>(log.painReports ?? []);
  const asksPain = !!template && (template.type === 'cardio' || template.type === 'hiking' || (template.type === 'strength' && isLegHeavyTemplate(template)));
  const answered = feel !== undefined || rpe !== undefined || pain.length > 0;
  const chip = (on: boolean) => ({
    borderColor: on ? 'var(--color-action)' : 'var(--color-card-border)',
    color: on ? 'var(--color-action)' : 'var(--color-ink-dim)',
  });

  return (
    <Card texture className="flex flex-col gap-4">
      <Eyebrow>Van je horloge</Eyebrow>
      <div>
        <p className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>
          {template ? `${template.name} is afgevinkt` : 'Training afgevinkt'}
        </p>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{describeLog(log)}</p>
        <p className="mt-2 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          ASCEND deed dit zelf, omdat je horloge precies één activiteit had die bij de geplande training van die dag paste.
        </p>
      </div>

      <p className="font-display text-lg" style={{ color: 'var(--color-ink)' }}>Hoe ging het?</p>

      <div>
        <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Hoe voelde het, vergeleken met normaal?</p>
        <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Gevoel vergeleken met normaal">
          {FEELS.map(([value, label]) => (
            <button
              key={value}
              role="radio"
              aria-checked={feel === value}
              onClick={() => setFeel(feel === value ? undefined : value)}
              className="min-h-[44px] rounded-lg border text-xs font-semibold"
              style={chip(feel === value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
          Zwaarte (RPE), hoe zwaar voelde de hele training?{log.rpe !== undefined && rpe === log.rpe ? ' Zo stond het op je horloge.' : ''}
        </p>
        <div className="mt-2 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Zwaarte van 1 tot 10">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              role="radio"
              aria-checked={rpe === n}
              onClick={() => setRpe(rpe === n ? undefined : n)}
              className="min-h-[44px] rounded-lg border text-sm tabular-nums"
              style={{
                borderColor: rpe === n ? 'var(--color-action)' : 'var(--color-card-border)',
                background: rpe === n ? 'var(--color-action)' : 'transparent',
                color: rpe === n ? 'var(--color-bg)' : 'var(--color-ink-dim)',
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {asksPain && <PainReportFields value={pain} onChange={setPain} />}

      <PrimaryButton disabled={busy} onClick={() => onAnswer({ rpe, subjectiveFeel: feel, painReports: pain })}>
        {answered ? 'Opslaan' : 'Klaar'}
      </PrimaryButton>
      <div className="flex gap-3">
        <SecondaryButton onClick={onReject} disabled={busy}>Klopt niet</SecondaryButton>
        <SecondaryButton onClick={onLater} disabled={busy}>Niet nu</SecondaryButton>
      </div>
      {onTrim && (
        <TextButton onClick={onTrim} disabled={busy}>Horloge te lang aan laten staan? Inkorten</TextButton>
      )}
      <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
        Klopt niet haalt de afvinking weer weg. Dan kun je zelf kiezen bij welke training dit hoort.
      </p>
    </Card>
  );
}

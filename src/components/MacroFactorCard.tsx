// ASCEND: "Uit MacroFactor". Strength workouts read from a MacroFactor export
// that are not in the log yet, offered as a voorstel. Nothing is saved until
// the user taps OPSLAAN (docs/visie/Data zonder handwerk.md, idee 2).
//
// Same shape as the watch card (WatchActivityCard): a card with the finds,
// OPSLAAN for all or one at a time, Niet opslaan. A workout whose name is not
// linked yet first asks which ASCEND training it is, once.

import { useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { useMacroFactor } from '../state/useMacroFactor';
import { dismissWorkout, fillInLog, setMapping } from '../storage/macrofactor';
import {
  describeRir,
  describeWorkout,
  isLegSession,
  minutesLabel,
  strengthRirFor,
  type MacroFactorProposal,
} from '../engine/macrofactorLink';
import type { SavedMoment } from '../engine/savedMoments';
import { formatDateNL, todayISO, weekdayLongNL } from '../utils/dates';
import { Card, Eyebrow, Num, PrimaryButton, SecondaryButton } from './ui';

function dayLabel(iso: string): string {
  return iso === todayISO() ? 'vandaag' : `${weekdayLongNL(iso)} ${formatDateNL(iso)}`;
}

const isReady = (p: MacroFactorProposal) => p.kind !== 'unmapped';

export function MacroFactorCard() {
  const { logSession, announceSaved, refresh } = useAppData();
  const { plan } = useMacroFactor();
  const [saving, setSaving] = useState(false);
  const proposals = plan.proposals;
  if (proposals.length === 0) return null;

  const ready = proposals.filter(isReady);

  async function save(list: MacroFactorProposal[]) {
    if (saving) return;
    setSaving(true);
    // This save's own list: several at once get one summary afterwards, not one
    // screen each, and a training ticked off by itself meanwhile is not in it.
    const batch: SavedMoment[] = [];
    try {
      for (const p of list) {
        if (p.kind === 'new') await logSession(p.draft, { batch });
        else if (p.kind === 'supplement') await fillInLog(p.log.id, p.workout, p.template);
      }
      await refresh();
    } finally {
      announceSaved(batch);
      setSaving(false);
    }
  }

  const count = proposals.length;
  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>UIT MACROFACTOR</Eyebrow>
      <div>
        <p className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>
          {count === 1 ? <><Num>1</Num> krachttraining gevonden</> : <><Num>{count}</Num> krachttrainingen gevonden</>}
        </p>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
          Uit je bestand met duur, sets en herhalingen. Er wordt niets opgeslagen voordat jij het zegt.
        </p>
      </div>
      <div className="flex flex-col gap-2.5">
        {proposals.map((p) => (
          <Row key={p.workout.externalId} proposal={p} saving={saving} single={ready.length === 1} onSave={() => void save([p])} />
        ))}
      </div>
      {ready.length >= 2 && (
        <PrimaryButton onClick={() => void save(ready)} disabled={saving}>
          {saving ? 'Opslaan…' : `Alles opslaan (${ready.length})`}
        </PrimaryButton>
      )}
    </Card>
  );
}

function Row({ proposal, saving, single, onSave }: { proposal: MacroFactorProposal; saving: boolean; single: boolean; onSave: () => void }) {
  const { workout } = proposal;
  return (
    <div className="flex flex-col gap-2 rounded-xl border p-3" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{workout.name}</p>
        <p className="shrink-0 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{dayLabel(workout.date)}</p>
      </div>
      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{describeWorkout(workout)}</p>
      {proposal.kind === 'unmapped' ? <ChooseTemplate workoutName={workout.name} /> : <Ready proposal={proposal} saving={saving} single={single} onSave={onSave} />}
    </div>
  );
}

function Ready({ proposal, saving, single, onSave }: { proposal: Exclude<MacroFactorProposal, { kind: 'unmapped' }>; saving: boolean; single: boolean; onSave: () => void }) {
  const { workout, template } = proposal;
  const legs = isLegSession(template);
  const rirText = legs ? describeRir(strengthRirFor(workout, template)) : undefined;
  const save = proposal.kind === 'new' ? 'Opslaan' : 'Aanvullen';
  return (
    <>
      {rirText && (
        <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
          {rirText}. Dit telt mee in je beenvermoeidheid, in plaats van een aangenomen inspanning.
        </p>
      )}
      <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
        {proposal.kind === 'new' ? (
          proposal.planned ? (
            <>Hoort bij <span style={{ color: 'var(--color-gold)' }}>{template.name}</span>, gepland voor {dayLabel(proposal.planned.scheduledDate)}.</>
          ) : (
            <>Er stond niets gepland in die week. Opslaan legt hem los vast als <span style={{ color: 'var(--color-gold)' }}>{template.name}</span>.</>
          )
        ) : (
          <>
            Je legde <span style={{ color: 'var(--color-gold)' }}>{template.name}</span> van {dayLabel(proposal.log.completedDate)} al vast. Aanvullen vult alleen in wat daar nog leeg is: {missingWords(proposal)}.
            {durationNote(proposal)}
          </>
        )}
      </p>
      <div className="flex gap-3">
        {single ? (
          <PrimaryButton fullWidth={false} onClick={onSave} disabled={saving}>{saving ? 'Bezig…' : save}</PrimaryButton>
        ) : (
          <SecondaryButton onClick={onSave} disabled={saving}>{save}</SecondaryButton>
        )}
        <SecondaryButton onClick={() => void dismissWorkout(workout.externalId)} disabled={saving}>Niet opslaan</SecondaryButton>
      </div>
    </>
  );
}

function missingWords(p: Extract<MacroFactorProposal, { kind: 'supplement' }>): string {
  const parts: string[] = [];
  if (p.patch.strengthData) parts.push('de sets en gewichten');
  if (p.patch.strengthRir !== undefined) parts.push('de herhalingen in reserve');
  return parts.join(' en ');
}

// The duration the user logged stays; say so when MacroFactor has another one.
function durationNote(p: Extract<MacroFactorProposal, { kind: 'supplement' }>): string {
  const minutes = p.workout.durationSec ? Math.round(p.workout.durationSec / 60) : undefined;
  if (minutes === undefined || Math.abs(minutes - p.log.durationMinutes) < 1) return '';
  return ` MacroFactor noteerde ${minutesLabel(minutes)}; jouw ${minutesLabel(p.log.durationMinutes)} blijft staan.`;
}

// The one-time choice: which ASCEND training is this MacroFactor workout?
function ChooseTemplate({ workoutName }: { workoutName: string }) {
  const { templates } = useAppData();
  const strength = templates.filter((t) => t.type === 'strength');
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
        Welke training in ASCEND is <span style={{ color: 'var(--color-gold)' }}>{workoutName}</span>?
      </p>
      <div className="flex flex-col gap-1.5">
        {strength.map((t) => (
          <button
            key={t.id}
            onClick={() => void setMapping(workoutName, t.id)}
            className="min-h-[44px] rounded-lg border px-3 py-2.5 text-left text-sm transition-all active:scale-[0.98]"
            style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
          >
            {t.name}
          </button>
        ))}
        <button
          onClick={() => void setMapping(workoutName, null)}
          className="min-h-[44px] rounded-lg border px-3 py-2.5 text-left text-sm transition-all active:scale-[0.98]"
          style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink-dim)' }}
        >
          Niet inlezen, dit hoort niet bij ASCEND
        </button>
      </div>
      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
        Dit onthoudt ASCEND op deze telefoon, je kiest het maar één keer.
      </p>
    </div>
  );
}

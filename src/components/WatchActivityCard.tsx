// ASCEND — "Van je horloge": an activity from the watch (via intervals.icu)
// that is not stored yet, offered on Today as a voorstel. Nothing is saved
// until the user taps Opslaan (docs/visie/Data zonder handwerk.md, idee 1),
// with one exception: an activity that unmistakably belongs to the one planned
// training of that day is ticked off by itself (engine/autoTick.ts, switch
// "Vanzelf afvinken" on the link screen), and the card then only asks how it
// went (components/WatchAskCard.tsx), with "Klopt niet" to undo it.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import {
  dismissActivity,
  getWatchState,
  onWatchChange,
  recordAutoTicked,
  setAutoLoggedStatus,
  type WatchActivityState,
} from '../storage/externalActivities';
import { canRejectAutoLog, pendingQuestions, planAutoTicks, type FeedbackPatch } from '../engine/autoTick';
import { WatchAskCard } from './WatchAskCard';
import {
  activityToDraft,
  candidatePlanned,
  describeActivity,
  describeActivityDetails,
  pendingProposals,
  templatesForKind,
  type ExternalActivity,
  type ImportProposal,
  type PlannedMatch,
} from '../engine/activityImport';
import type { SessionTemplate } from '../models/training';
import { formatDateNL, todayISO, weekdayLongNL } from '../utils/dates';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { Card, Eyebrow, PrimaryButton, SecondaryButton } from './ui';

function dayLabel(iso: string): string {
  return iso === todayISO() ? 'vandaag' : `${weekdayLongNL(iso)} ${formatDateNL(iso)}`;
}

// Waits for the plan to settle at boot before it ticks anything off.
const AUTO_TICK_DELAY_MS = 1200;

export function WatchActivityCard() {
  const { plannedSessions, templates, sessionLogs, logSession, undoLog, setLogFeedback } = useAppData();
  const [state, setState] = useState<WatchActivityState | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [later, setLater] = useState<string[]>([]);
  const ticking = useRef(false);
  const attempted = useRef(new Set<string>());

  useEffect(() => {
    let alive = true;
    const load = () => void getWatchState().then((s) => alive && setState(s)).catch(() => undefined);
    load();
    const stop = onWatchChange(load);
    return () => {
      alive = false;
      stop();
    };
  }, []);

  // Vanzelf afvinken: only what nothing is left to choose about.
  useEffect(() => {
    if (!state || !state.autoTick || !state.use.activities || ticking.current) return;
    const ticks = planAutoTicks(state.activities, state.dismissed, state.autoLogged, plannedSessions, templates, sessionLogs)
      .filter((t) => !attempted.current.has(t.activity.externalId));
    if (ticks.length === 0) return;
    const timer = setTimeout(() => {
      ticking.current = true;
      void (async () => {
        try {
          for (const { activity, match } of ticks) {
            attempted.current.add(activity.externalId);
            const stored = await logSession({ ...activityToDraft(activity, match.template, match.session), quiet: true });
            if (stored) await recordAutoTicked(activity.externalId);
          }
        } finally {
          ticking.current = false;
        }
      })();
    }, AUTO_TICK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state, plannedSessions, templates, sessionLogs, logSession]);

  // Trainings switched off ("Wat ASCEND van je horloge gebruikt"): nothing of
  // the watch is offered or asked here.
  const questions = useMemo(
    () => (state?.use.activities ? pendingQuestions(state.autoLogged, sessionLogs).filter((q) => !later.includes(q.entry.externalId)) : []),
    [state, sessionLogs, later],
  );
  const proposals = useMemo(
    () => (state?.use.activities ? pendingProposals(state.activities, state.dismissed, plannedSessions, templates, sessionLogs) : []),
    [state, plannedSessions, templates, sessionLogs],
  );
  const question = questions[0];
  const proposal = proposals[0];

  async function answer(patch: FeedbackPatch) {
    if (!question || saving) return;
    setSaving(true);
    try {
      await setLogFeedback(question.log.id, patch);
      await setAutoLoggedStatus(question.entry.externalId, 'done');
    } finally {
      setSaving(false);
    }
  }

  // "Klopt niet": the log goes only if it is the one ASCEND made itself a
  // moment ago and is still unanswered (canRejectAutoLog); the activity then
  // comes back as an ordinary proposal and is never ticked off again.
  async function reject() {
    if (!question || saving || !canRejectAutoLog(question.entry, question.log)) return;
    setSaving(true);
    try {
      await setAutoLoggedStatus(question.entry.externalId, 'rejected');
      await undoLog(question.log.id);
    } finally {
      setSaving(false);
    }
  }

  if (question) {
    return (
      <WatchAskCard
        key={question.entry.externalId}
        log={question.log}
        template={templates.find((t) => t.id === question.log.templateId)}
        busy={saving}
        onAnswer={(patch) => void answer(patch)}
        onReject={() => void reject()}
        onLater={() => setLater((l) => [...l, question.entry.externalId])}
      />
    );
  }
  if (!proposal) return null;

  async function save(activity: ExternalActivity, template: SessionTemplate, match?: PlannedMatch) {
    if (saving) return;
    setSaving(true);
    try {
      await logSession(activityToDraft(activity, template, match?.session));
    } finally {
      setSaving(false);
      setChoosing(false);
    }
  }

  return (
    <>
      <ProposalCard
        proposal={proposal}
        more={proposals.length - 1}
        saving={saving}
        onSave={() => proposal.template && void save(proposal.activity, proposal.template, proposal.match)}
        onChoose={() => setChoosing(true)}
        onDismiss={() => void dismissActivity(proposal.activity.externalId)}
      />
      {choosing && (
        <ChooseSheet
          activity={proposal.activity}
          onPick={(template, match) => void save(proposal.activity, template, match)}
          onClose={() => setChoosing(false)}
        />
      )}
    </>
  );
}

function ProposalCard({
  proposal,
  more,
  saving,
  onSave,
  onChoose,
  onDismiss,
}: {
  proposal: ImportProposal;
  more: number;
  saving: boolean;
  onSave: () => void;
  onChoose: () => void;
  onDismiss: () => void;
}) {
  const { activity, match, template, similarLog } = proposal;
  const details = describeActivityDetails(activity);
  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>VAN JE HORLOGE</Eyebrow>
      <div>
        <p className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>{describeActivity(activity)}</p>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
          {dayLabel(activity.start.slice(0, 10))}
        </p>
      </div>
      {details.length > 0 && (
        <ul className="flex flex-col gap-0.5">
          {details.map((line) => (
            <li key={line} className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{line}</li>
          ))}
        </ul>
      )}
      <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
        {match
          ? <>Hoort bij <span style={{ color: 'var(--color-gold)' }}>{match.template.name}</span>, gepland voor {dayLabel(match.session.scheduledDate)}.</>
          : template
            ? <>Er stond niets passends gepland. Opslaan legt hem los vast als <span style={{ color: 'var(--color-gold)' }}>{template.name}</span>.</>
            : 'Er stond niets passends gepland. Kies bij Andere training wat het was.'}
      </p>
      {similarLog && (
        <p className="text-xs" style={{ color: 'var(--color-warning)' }}>
          Je legde die dag al een training vast van {similarLog.durationMinutes} min. Sla dit alleen op als het een andere training was.
        </p>
      )}
      <PrimaryButton onClick={onSave} disabled={saving || !template}>{saving ? 'Opslaan…' : 'Opslaan'}</PrimaryButton>
      <div className="flex gap-3">
        <SecondaryButton onClick={onChoose} disabled={saving}>Andere training</SecondaryButton>
        <SecondaryButton onClick={onDismiss} disabled={saving}>Niet opslaan</SecondaryButton>
      </div>
      {more > 0 && (
        <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
          {more === 1 ? 'Er wacht nog 1 oudere activiteit.' : `Er wachten nog ${more} oudere activiteiten.`} Die volgen als je deze hebt afgehandeld.
        </p>
      )}
    </Card>
  );
}

// "Andere training": a planned session of that week, or save it on its own.
function ChooseSheet({
  activity,
  onPick,
  onClose,
}: {
  activity: ExternalActivity;
  onPick: (template: SessionTemplate, match?: PlannedMatch) => void;
  onClose: () => void;
}) {
  const { plannedSessions, templates, sessionLogs } = useAppData();
  const { closing, requestClose } = useSheetClose(onClose);
  const planned = candidatePlanned(activity, plannedSessions, templates, sessionLogs, { anyKind: true, notAfter: todayISO() }).slice(0, 8);
  const loose = templatesForKind(activity.kind, templates);
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div className={`max-h-[85vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <Card className="flex flex-col gap-3 rounded-b-none border-b-0 pb-6">
            <Eyebrow>WAT WAS DIT?</Eyebrow>
            <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{describeActivity(activity)}</p>
            {planned.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Hoort bij een geplande training:</p>
                {planned.map((m) => (
                  <OptionButton key={m.session.id} title={m.template.name} note={dayLabel(m.session.scheduledDate)} onClick={() => onPick(m.template, m)} />
                ))}
              </div>
            )}
            {loose.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Of los opslaan, zonder geplande training af te vinken:</p>
                {loose.map((t) => (
                  <OptionButton key={t.id} title={t.name} note="los" onClick={() => onPick(t)} />
                ))}
              </div>
            )}
            <SecondaryButton onClick={requestClose}>Annuleren</SecondaryButton>
          </Card>
        </div>
      </div>
    </Portal>
  );
}

function OptionButton({ title, note, onClick }: { title: string; note: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-all active:scale-[0.98]"
      style={{ borderColor: 'var(--color-card-border)' }}
    >
      <span className="text-sm" style={{ color: 'var(--color-ink)' }}>{title}</span>
      <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{note}</span>
    </button>
  );
}

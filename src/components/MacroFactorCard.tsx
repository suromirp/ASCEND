// ASCEND: "Uit MacroFactor". Strength workouts read from a MacroFactor export
// that ASCEND can still handle, offered as one voorstel. Nothing is saved until
// the user taps "Alles verwerken" (docs/visie/Data zonder handwerk.md, idee 2).
//
// One button for everything: a workout with no log yet is saved as a new log; a
// workout whose training the user logged already takes over the log's duration,
// sets and reps in reserve ("MacroFactor is leidend voor kracht", the old numbers
// are kept and can be put back) or, with that switch off, only fills what is
// still empty. A small check per row leaves one out. Which ASCEND training a
// MacroFactor name is, is asked once per name on the import page
// (components/MacroFactorLinkCard.tsx), never here.
//
// The result is one moment afterwards (announceSaved with this run's own
// batch), like "Alles opslaan" always did. The run itself lives in
// storage/macrofactorRun.ts: it always ends, shows how far it is ("3 van 10
// verwerkt"), never does a row twice and goes on when the card is redrawn.

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import { useMacroFactor } from '../state/useMacroFactor';
import { clearRunMessage, getRunState, runMacroFactor, subscribeRun } from '../storage/macrofactorRun';
import { describeEnrichment } from '../engine/macrofactorEnrich';
import { describeStrengthChange } from '../engine/macrofactorLead';
import { describeWorkout, minutesLabel } from '../engine/macrofactorLink';
import { isReady, openProposals, RUN_SLOW_NOTE, runProgressLabel, type ReadyProposal } from '../engine/macrofactorRun';
import { formatDateNL, todayISO, weekdayLongNL } from '../utils/dates';
import { Icon } from './icons';
import { Card, Eyebrow, Num, PrimaryButton, SecondaryButton } from './ui';

function dayLabel(iso: string): string {
  return iso === todayISO() ? 'vandaag' : `${weekdayLongNL(iso)} ${formatDateNL(iso)}`;
}

export function MacroFactorCard({ onImportPage = false, primary = true }: { onImportPage?: boolean; primary?: boolean }) {
  const { logSession, announceSaved, refresh, takeOverFromMacroFactor } = useAppData();
  const { plan, state } = useMacroFactor();
  const navigate = useNavigate();
  const run = useSyncExternalStore(subscribeRun, getRunState);
  // The rows the user ticked off, by workout id: left out of the next run.
  const [skipped, setSkipped] = useState<string[]>([]);
  // Rows that do not look right (in the future, an impossible duration) stay
  // out of "Alles verwerken" until the user ticks them.
  const [opted, setOpted] = useState<string[]>([]);
  // The outcome shows while this card is there; the next visit starts clean.
  useEffect(() => () => clearRunMessage(), []);

  const saving = run.status === 'running';
  const allReady = plan.proposals.filter(isReady);
  // What the run handled stays away, also before the app has read it back.
  const ready = openProposals(allReady, run.handled);
  const waiting = plan.proposals.length - allReady.length;
  // Never gone halfway: while it runs, and with its outcome, the card stays.
  if (ready.length === 0 && waiting === 0 && run.status === 'idle') return null;

  const isOn = (p: ReadyProposal) => (p.doubt ? opted.includes(p.workout.externalId) : !skipped.includes(p.workout.externalId));
  const chosen = ready.filter(isOn);
  const regular = ready.filter((p) => !p.doubt);
  const doubtful = ready.filter((p) => p.doubt);
  const flip = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const toggle = (p: ReadyProposal) => (p.doubt ? setOpted((o) => flip(o, p.workout.externalId)) : setSkipped((s) => flip(s, p.workout.externalId)));

  function processAll() {
    if (saving || chosen.length === 0) return;
    void runMacroFactor(chosen, {
      logSession: (draft, opts) => logSession(draft, opts),
      takeOver: takeOverFromMacroFactor,
      announceSaved,
      refresh: () => refresh(),
      leads: state.leads,
      left: ready.length - chosen.length,
    }).then(() => {
      setSkipped([]);
      setOpted([]);
    });
  }

  const takeovers = ready.filter((p) => p.kind === 'takeover').length;
  const label = saving ? runProgressLabel(run.done, run.total) : `Alles verwerken (${chosen.length})`;
  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>Uit MacroFactor</Eyebrow>
      {ready.length > 0 && (
        <div>
          <p className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>
            {regular.length === 0 ? 'Niets klaar om te verwerken' : regular.length === 1 ? <><Num>1</Num> krachttraining klaar</> : <><Num>{regular.length}</Num> krachttrainingen klaar</>}
          </p>
          <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
            Uit je bestand met duur, sets en herhalingen. Met het vinkje laat je een training liggen. Er wordt niets opgeslagen voordat jij op de knop tikt.
          </p>
          {takeovers > 0 && (
            <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
              Een training die je al had vastgelegd krijgt de cijfers van MacroFactor: duur, sets en herhalingen in reserve. Je gevoel, inspanning, pijn en notities blijven. Je eigen cijfers worden bewaard en zijn terug te zetten.
            </p>
          )}
        </div>
      )}
      {regular.length > 0 && (
        <ul className="flex flex-col">
          {regular.map((p) => (
            <Row key={p.workout.externalId} proposal={p} on={isOn(p)} disabled={saving} onToggle={() => toggle(p)} />
          ))}
        </ul>
      )}
      {doubtful.length > 0 && (
        <div className="flex flex-col gap-1">
          <Eyebrow>Eerst even kijken</Eyebrow>
          <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
            {doubtful.length === 1 ? 'Deze training klopt waarschijnlijk niet' : 'Deze trainingen kloppen waarschijnlijk niet'} en {doubtful.length === 1 ? 'doet' : 'doen'} niet mee, tenzij je {doubtful.length === 1 ? 'hem' : 'ze'} aanvinkt.
          </p>
          <ul className="flex flex-col">
            {doubtful.map((p) => (
              <Row key={p.workout.externalId} proposal={p} on={isOn(p)} disabled={saving} onToggle={() => toggle(p)} />
            ))}
          </ul>
        </div>
      )}
      {(ready.length > 0 || saving) &&
        (primary ? (
          <PrimaryButton onClick={processAll} disabled={saving || chosen.length === 0}>
            {label}
          </PrimaryButton>
        ) : (
          <SecondaryButton onClick={processAll} disabled={saving || chosen.length === 0}>
            {label}
          </SecondaryButton>
        ))}
      {saving && run.slow && (
        <p className="text-xs leading-snug" role="status" style={{ color: 'var(--color-ink-dim)' }}>{RUN_SLOW_NOTE}</p>
      )}
      {!saving && run.message && (
        <p className="text-sm leading-snug" role="status" style={{ color: run.status === 'stopped' ? 'var(--color-warning)' : 'var(--color-success-text)' }}>{run.message}</p>
      )}
      {waiting > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
            {waiting === 1 ? '1 training wacht' : `${waiting} trainingen wachten`} tot de naam is gekoppeld.
            {onImportPage ? ' Doe dat in de kaart hierboven.' : ''}
          </p>
          {!onImportPage && <SecondaryButton onClick={() => navigate('/koppelen/macrofactor')}>Namen koppelen</SecondaryButton>}
        </div>
      )}
    </Card>
  );
}

function Row({ proposal, on, disabled, onToggle }: { proposal: ReadyProposal; on: boolean; disabled: boolean; onToggle: () => void }) {
  const { workout, template } = proposal;
  return (
    <li className="flex items-start gap-1 border-t py-1 first:border-t-0" style={{ borderColor: 'var(--color-card-border)' }}>
      <button
        type="button"
        role="checkbox"
        aria-checked={on}
        aria-label={`${template.name} van ${dayLabel(workout.date)} verwerken`}
        onClick={onToggle}
        disabled={disabled}
        className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center transition-opacity active:opacity-60 disabled:opacity-40"
        style={{ color: on ? 'var(--color-success-text)' : 'var(--color-ink-dim)' }}
      >
        <Icon name={on ? 'gedaan' : 'gepland'} size={24} />
      </button>
      <div className="min-w-0 flex-1 py-2" style={{ opacity: on ? 1 : 0.55 }}>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{template.name}</p>
          <p className="shrink-0 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{dayLabel(workout.date)}</p>
        </div>
        <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          {describeWorkout(workout)}. {what(proposal)}
        </p>
        {proposal.doubt && (
          <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--color-warning)' }}>{proposal.doubt}</p>
        )}
      </div>
    </li>
  );
}

// What happens to this training when the button is tapped.
function what(p: ReadyProposal): string {
  if (p.kind === 'new') {
    if (!p.planned) return 'Nieuw in je logboek, er stond niets gepland in die week.';
    return p.planned.scheduledDate === p.workout.date ? 'Nieuw in je logboek, zoals gepland.' : `Nieuw in je logboek, gepland voor ${dayLabel(p.planned.scheduledDate)}.`;
  }
  if (p.kind === 'enrich') return `Staat al in je logboek op ${dayLabel(p.log.completedDate)}, met dezelfde sets. Aanvullen: ${describeEnrichment(p.log, p.strengthData)}. Verder verandert er niets.`;
  if (p.kind === 'takeover') return `Je legde hem al vast op ${dayLabel(p.log.completedDate)}. Bijwerken: ${describeStrengthChange(p.change)}.`;
  const missing: string[] = [];
  if (p.patch.strengthData) missing.push('de sets en gewichten');
  if (p.patch.strengthRir !== undefined) missing.push('de herhalingen in reserve');
  const minutes = p.workout.durationSec ? Math.round(p.workout.durationSec / 60) : undefined;
  const kept = minutes !== undefined && Math.abs(minutes - p.log.durationMinutes) >= 1 ? ` MacroFactor noteerde ${minutesLabel(minutes)}; jouw ${minutesLabel(p.log.durationMinutes)} blijft staan.` : '';
  return `Je legde hem al vast op ${dayLabel(p.log.completedDate)}. Aanvullen: ${missing.join(' en ')}.${kept}`;
}

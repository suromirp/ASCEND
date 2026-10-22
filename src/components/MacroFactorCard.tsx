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
// The result is one moment afterwards (announceSaved with this card's own
// batch), like "Alles opslaan" always did.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import { useMacroFactor } from '../state/useMacroFactor';
import { enrichLog, fillInLog } from '../storage/macrofactor';
import { describeEnrichment } from '../engine/macrofactorEnrich';
import type { TakeoverRequest } from '../storage/macrofactorLead';
import { describeStrengthChange } from '../engine/macrofactorLead';
import { describeWorkout, minutesLabel, type MacroFactorProposal } from '../engine/macrofactorLink';
import type { SavedMoment } from '../engine/savedMoments';
import { formatDateNL, todayISO, weekdayLongNL } from '../utils/dates';
import { Icon } from './icons';
import { Card, Eyebrow, Num, PrimaryButton, SecondaryButton } from './ui';

type ReadyProposal = Exclude<MacroFactorProposal, { kind: 'unmapped' }>;

function dayLabel(iso: string): string {
  return iso === todayISO() ? 'vandaag' : `${weekdayLongNL(iso)} ${formatDateNL(iso)}`;
}

const isReady = (p: MacroFactorProposal): p is ReadyProposal => p.kind !== 'unmapped';

export function MacroFactorCard({ onImportPage = false, primary = true }: { onImportPage?: boolean; primary?: boolean }) {
  const { logSession, announceSaved, refresh, takeOverFromMacroFactor } = useAppData();
  const { plan, state } = useMacroFactor();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  // The rows the user ticked off, by workout id: left out of the next run.
  const [skipped, setSkipped] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);

  const ready = plan.proposals.filter(isReady);
  const waiting = plan.proposals.length - ready.length;
  if (plan.proposals.length === 0 && !result) return null;

  const chosen = ready.filter((p) => !skipped.includes(p.workout.externalId));
  const toggle = (id: string) => setSkipped((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function processAll() {
    if (saving || chosen.length === 0) return;
    setSaving(true);
    setResult(null);
    // This run's own list: several at once get one summary afterwards, not one
    // screen each, and a training ticked off by itself meanwhile is not in it.
    const batch: SavedMoment[] = [];
    let created = 0;
    let changed = 0;
    let enriched = 0;
    const enrichedWith = new Set<string>();
    let failed = 0;
    let pending: TakeoverRequest[] = [];
    const flush = async () => {
      if (pending.length === 0) return;
      const n = await takeOverFromMacroFactor(pending, batch);
      changed += n;
      failed += pending.length - n;
      pending = [];
    };
    try {
      for (const p of chosen) {
        if (p.kind === 'takeover') {
          pending.push({ logId: p.log.id, workout: p.workout, templateId: p.template.id });
          continue;
        }
        await flush();
        if (p.kind === 'new') {
          if (await logSession(p.draft, { batch })) created++;
          else failed++;
        } else if (p.kind === 'enrich') {
          const what = describeEnrichment(p.log, p.strengthData);
          if (await enrichLog(p.log.id, p.workout)) {
            enriched++;
            enrichedWith.add(what);
          } else failed++;
        } else if (await fillInLog(p.log.id, p.workout, p.template)) changed++;
        else failed++;
      }
      await flush();
      await refresh();
    } finally {
      announceSaved(batch);
      setSaving(false);
    }
    setSkipped([]);
    setResult(summary(created, changed, enriched, enrichedWith.size === 1 ? [...enrichedWith][0] : 'de herhalingen in reserve en de opwarmsets', failed, ready.length - chosen.length, state.leads));
  }

  const takeovers = ready.filter((p) => p.kind === 'takeover').length;
  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>Uit MacroFactor</Eyebrow>
      {ready.length > 0 && (
        <div>
          <p className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>
            {ready.length === 1 ? <><Num>1</Num> krachttraining klaar</> : <><Num>{ready.length}</Num> krachttrainingen klaar</>}
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
      {ready.length > 0 && (
        <ul className="flex flex-col">
          {ready.map((p) => (
            <Row key={p.workout.externalId} proposal={p} on={!skipped.includes(p.workout.externalId)} disabled={saving} onToggle={() => toggle(p.workout.externalId)} />
          ))}
        </ul>
      )}
      {ready.length > 0 &&
        (primary ? (
          <PrimaryButton onClick={() => void processAll()} disabled={saving || chosen.length === 0}>
            {saving ? 'Bezig…' : `Alles verwerken (${chosen.length})`}
          </PrimaryButton>
        ) : (
          <SecondaryButton onClick={() => void processAll()} disabled={saving || chosen.length === 0}>
            {saving ? 'Bezig…' : `Alles verwerken (${chosen.length})`}
          </SecondaryButton>
        ))}
      {waiting > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
            {waiting === 1 ? '1 training wacht' : `${waiting} trainingen wachten`} tot de naam is gekoppeld.
            {onImportPage ? ' Doe dat in de kaart hierboven.' : ''}
          </p>
          {!onImportPage && <SecondaryButton onClick={() => navigate('/koppelen/macrofactor')}>Namen koppelen</SecondaryButton>}
        </div>
      )}
      {result && (
        <p className="text-sm leading-snug" role="status" style={{ color: 'var(--color-success-text)' }}>{result}</p>
      )}
    </Card>
  );
}

// "Verwerkt: 8 nieuw opgeslagen en 2 bijgewerkt met MacroFactor. 1 niet gelukt."
function summary(created: number, changed: number, enriched: number, enrichedWhat: string, failed: number, left: number, leads: boolean): string {
  const parts: string[] = [];
  if (created > 0) parts.push(`${created} nieuw opgeslagen`);
  if (changed > 0) parts.push(`${changed} ${leads ? 'bijgewerkt met MacroFactor' : 'aangevuld'}`);
  if (enriched > 0) parts.push(`${enriched} aangevuld met ${enrichedWhat}`);
  let text = parts.length > 0 ? `Verwerkt: ${parts.join(' en ')}.` : 'Er is niets verwerkt.';
  if (failed > 0) text += ` ${failed} lukte niet.`;
  if (left > 0) text += ` ${left} liet je liggen.`;
  return text;
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

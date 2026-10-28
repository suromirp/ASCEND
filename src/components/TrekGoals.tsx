// ASCEND: "Tochten" on the Doelen page. Trips you set up as goals of your own
// next to the GR5 (a snow hike, a weekend with a tent). A tocht is a trek
// period with its details on it (engine/trek.ts), so making, changing or
// removing one is the same proposal with Akkoord as a trek in "Vrije dagen en
// vakanties": nothing is stored, and the planning does not change, until
// Akkoord, and undo puts it all back.

import { useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import type { LeavePeriod, TrekImportance, TrekTerrain } from '../models/leave';
import type { Advice } from '../engine/adviceEngine';
import type { LeavePlan } from '../engine/leaveProposal';
import { describePeriodDates } from '../engine/leave';
import {
  TREK_IMPORTANCES, TREK_IMPORTANCE_LABEL, TREK_TERRAINS, TREK_TERRAIN_LABEL, MAX_TREK_DAYS,
  periodToTrekDraft, trekFacts, trekImportanceHint, trekPeriods, trekToPeriod, validateTrekDraft, type TrekDraft,
} from '../engine/trek';
import { addDays, todayISO } from '../utils/dates';
import { makeId } from '../utils/id';
import { useSheetClose } from '../utils/useSheetClose';
import { Icon } from './icons';
import { NumberField } from './NumberField';
import { Portal } from './Portal';
import { ProposalSheet } from './ProposalSheet';
import { Card, Eyebrow, PrimaryButton, SecondaryButton, Toggle, SheetGrip } from './ui';
import { TextButton } from './TextButton';

const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
const inputStyle = { background: 'var(--color-charcoal)', borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' };

export function TrekGoalsCard() {
  const { leavePeriods, planLeave, applyLeave, planPreviewPass, settings, updateSettings } = useAppData();
  const [editing, setEditing] = useState<LeavePeriod | 'new' | null>(null);
  const [plan, setPlan] = useState<LeavePlan | null>(null);
  const today = todayISO();
  // What is over for more than two weeks is no longer shown.
  const shown = trekPeriods(leavePeriods).filter((p) => p.endDate >= addDays(today, -14));

  const previewPass = useMemo(
    () => (plan ? (sessions: Parameters<typeof planPreviewPass>[0]) => planPreviewPass(sessions, plan.periodsAfter) : undefined),
    [plan, planPreviewPass],
  );

  const advice: Advice | null = plan && {
    id: `trek:${plan.period.id}`,
    trigger: 'plan_update',
    ruleId: 'LEAVE',
    title: 'Zo ziet je planning eruit',
    effect: plan.proposal.consequences,
    why: plan.proposal.explanation,
    priority: 0,
    proposal: plan.proposal,
  };

  return (
    <>
      <Card className="flex flex-col gap-3">
        <div>
          <Eyebrow>Tochten</Eyebrow>
          <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
            {shown.length === 0
              ? 'Een sneeuwhike over twee maanden, een weekend met tent: zet het hier als doel naast de GR5. Elke tocht telt ook als training voor de GR5.'
              : 'Elke tocht telt ook als training voor de GR5. Een tocht maken, wijzigen of verwijderen laat je eerst zien en past pas iets aan na jouw akkoord.'}
          </p>
        </div>

        {shown.length > 0 && (
          <ul className="flex flex-col gap-2">
            {shown.map((p) => (
              <li key={p.id} className="rounded-xl border py-3 pl-3 pr-1" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-surface)' }}>
                <p className="flex items-center gap-2 pr-2 font-display text-base" style={{ color: 'var(--color-ink)' }}>
                  <Icon name="bivak" size={18} />
                  <span className="min-w-0 break-words">{p.trek!.name}</span>
                </p>
                <p className="mt-1 pr-2 text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{describePeriodDates(p, true)}</p>
                <p className="pr-2 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{trekFacts(p)}</p>
                <p className="pr-2 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{TREK_IMPORTANCE_LABEL[p.trek!.importance]}</p>
                <div className="mt-1 flex">
                  <TextButton onClick={() => setEditing(p)} className="px-3" aria-label={`${p.trek!.name} wijzigen`}>Wijzigen</TextButton>
                  <TextButton tone="dim" onClick={() => setPlan(planLeave('remove', p))} className="px-3" aria-label={`${p.trek!.name} verwijderen`}>Verwijderen</TextButton>
                </div>
              </li>
            ))}
          </ul>
        )}

        <SecondaryButton onClick={() => setEditing('new')} className="min-h-[46px] flex-none">Tocht toevoegen</SecondaryButton>

        <div className="flex items-center justify-between gap-3 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
          <div className="min-w-0">
            <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Eerstvolgende tocht op Vandaag</p>
            <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Een rustige regel met de naam en over hoeveel dagen. Alleen als de tocht eerder is dan de GR5.</p>
          </div>
          <Toggle checked={settings.showNextTrek !== false} onChange={(on) => void updateSettings({ showNextTrek: on })} label="Eerstvolgende tocht op Vandaag" />
        </div>
      </Card>

      {editing && (
        <TrekSheet
          existing={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSubmit={(period) => {
            const before = editing === 'new' ? undefined : editing;
            setEditing(null);
            setPlan(planLeave('add', period, before));
          }}
        />
      )}

      {plan && advice && (
        <ProposalSheet
          advice={advice}
          eyebrow={`${plan.mode === 'remove' ? 'Verwijderen · ' : plan.replaces ? 'Wijzigen · ' : ''}${plan.period.trek?.name ?? 'Tocht'} · ${describePeriodDates(plan.period, true)}`}
          previewPass={previewPass}
          leave={plan.periodsAfter}
          notes={plan.notes}
          emptyText={plan.mode === 'add'
            ? 'Je planning hoeft niet te veranderen. Met Akkoord bewaar je de tocht en houdt ASCEND er rekening mee.'
            : 'Je planning hoeft niet te veranderen. Met Akkoord verwijder je de tocht.'}
          onRespond={async (response) => {
            if (response === 'accepted') await applyLeave(plan);
          }}
          onClose={() => setPlan(null)}
        />
      )}
    </>
  );
}

function Choice({ on, onClick, title, hint }: { on: boolean; onClick: () => void; title: string; hint?: string }) {
  return (
    <button
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className="flex min-h-[44px] items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left"
      style={{ borderColor: on ? 'var(--color-action)' : 'var(--color-card-border)', background: on ? tint('var(--color-action)', 8) : 'transparent' }}
    >
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: on ? 'var(--color-action)' : 'var(--color-ink-dim)' }} aria-hidden>
        {on && <span className="h-2 w-2 rounded-full" style={{ background: 'var(--color-action)' }} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm" style={{ color: 'var(--color-ink)' }}>{title}</span>
        {hint && <span className="mt-0.5 block text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{hint}</span>}
      </span>
    </button>
  );
}

function TrekSheet({ existing, onSubmit, onClose }: { existing?: LeavePeriod; onSubmit: (period: LeavePeriod) => void; onClose: () => void }) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  const today = todayISO();
  const [d, setD] = useState<TrekDraft>(() => (existing && periodToTrekDraft(existing)) || {
    name: '', startDate: addDays(today, 14), days: 1, terrain: 'uneven_trail', packKg: undefined, tent: false, importance: 'training',
  });
  const set = (patch: Partial<TrekDraft>) => setD((prev) => ({ ...prev, ...patch }));
  const problem = validateTrekDraft(d, today);
  const showProblem = problem && d.name.trim() !== '';

  return (
    <Portal>
      <div
        className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
        onClick={requestClose}
      >
        <div ref={sheetRef} className={`relative flex max-h-[92vh] w-full max-w-md flex-col ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <SheetGrip />
          <Card className="flex min-h-0 flex-col rounded-b-none border-b-0 p-0!">
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3 pt-5">
              <Eyebrow>{existing ? 'Tocht wijzigen' : 'Tocht toevoegen'}</Eyebrow>
              <h3 className="mt-1 font-display text-xl leading-snug" style={{ color: 'var(--color-ink)' }}>Waar ga je naartoe?</h3>

              <label className="mt-4 block text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                Naam
                <input
                  type="text" value={d.name} maxLength={40} placeholder="Bijvoorbeeld: Sneeuwhike"
                  onChange={(e) => set({ name: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-2.5 py-2 text-sm" style={inputStyle}
                />
              </label>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                  Startdatum
                  <input
                    type="date" value={d.startDate} min={today}
                    onChange={(e) => set({ startDate: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-2.5 py-2 text-sm" style={inputStyle}
                  />
                </label>
                <NumberField label="Aantal dagen" value={d.days} unit={d.days === 1 ? 'dag' : 'dagen'} onChange={(v) => set({ days: v ?? 0 })} helper={`1 tot ${MAX_TREK_DAYS}`} />
              </div>

              <p className="mt-4 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Terrein</p>
              <div className="mt-1 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Terrein">
                {TREK_TERRAINS.map((t: TrekTerrain) => (
                  <Choice key={t} on={d.terrain === t} onClick={() => set({ terrain: t })} title={TREK_TERRAIN_LABEL[t]} />
                ))}
              </div>

              <div className="mt-4">
                <NumberField label="Rugzakgewicht" value={d.packKg} unit="kg" decimals={1} onChange={(v) => set({ packKg: v })} helper="Mag je leeg laten als je het nog niet weet." />
              </div>

              <p className="mt-4 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Slapen</p>
              <div className="mt-1 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tent en slaapzak">
                <Choice on={d.tent} onClick={() => set({ tent: true })} title="Met tent" />
                <Choice on={!d.tent} onClick={() => set({ tent: false })} title="Zonder tent" />
              </div>

              <p className="mt-4 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Hoe belangrijk is deze tocht?</p>
              <div className="mt-1 flex flex-col gap-2" role="radiogroup" aria-label="Belang van de tocht">
                {TREK_IMPORTANCES.map((i: TrekImportance) => (
                  <Choice key={i} on={d.importance === i} onClick={() => set({ importance: i })} title={TREK_IMPORTANCE_LABEL[i]} hint={trekImportanceHint(i, Math.max(1, d.days))} />
                ))}
              </div>

              {showProblem && <p className="mt-3 text-xs" style={{ color: 'var(--color-danger-text)' }} role="alert">{problem}</p>}
              <p className="mt-3 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                Je ziet eerst wat er in je planning verandert. Pas na jouw akkoord wordt de tocht bewaard.
              </p>
            </div>

            <div className="flex gap-3 border-t px-5 pt-3" style={{ borderColor: 'var(--color-card-border)', paddingBottom: 'max(env(safe-area-inset-bottom), 14px)' }}>
              <SecondaryButton onClick={requestClose} className="min-h-[46px]">Annuleren</SecondaryButton>
              <PrimaryButton disabled={!!problem} fullWidth={false} onClick={() => onSubmit(trekToPeriod(d, existing?.id ?? makeId('trek')))}>Voorstel bekijken</PrimaryButton>
            </div>
          </Card>
        </div>
      </div>
    </Portal>
  );
}

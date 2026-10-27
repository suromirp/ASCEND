// ASCEND: "Garmin is leidend", the screens (engine/watchAlign.ts,
// docs/beslissingen/2026-10-22-garmin-is-leidend.md).
//
// - The proposal "N trainingen gelijktrekken met je horloge" (a card, on the
//   link screen always when there is something to propose, on Today once after
//   linking), with what changes per training and Akkoord / Liever niet. Nothing
//   changes before Akkoord.
// - The list of what was matched, with "Terugzetten" per training or for all of
//   them (the hand-made numbers are kept on the log).
// - The automatic route: once the first proposal is answered and the switch is
//   on, a typed-in training of the last 7 days that gets a watch activity takes
//   over the numbers by itself, with the notice "Bijgewerkt met je horloge" and
//   Ongedaan maken (components/ChangeNotice.tsx).

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAppData } from '../state/AppDataContext';
import { resolveAlignment } from '../storage/externalActivities';
import { AUTO_DAYS, describeChanges, describeManualLine, historyStart, type AlignItem } from '../engine/watchAlign';
import { useAlignActions, useWatchAlign } from './useWatchAlign';
import type { SessionLog, SessionTemplate } from '../models/training';
import { addDays, formatDateNL, todayISO } from '../utils/dates';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { Card, Eyebrow, Num, SecondaryButton } from './ui';
import { TextButton } from './TextButton';

// Waits for the plan to settle at boot, like the tick-off does.
const AUTO_DELAY_MS = 1500;
// More than this and the card shows the first ones and a way to see them all.
const INLINE_ITEMS = 5;

// "6 trainingen": the number in Inter, the word in Marcellus.
function countLabel(n: number): ReactNode {
  return n === 1 ? <><Num>1</Num> training</> : <><Num>{n}</Num> trainingen</>;
}

function templateName(templates: SessionTemplate[], log: SessionLog): string {
  return templates.find((t) => t.id === log.templateId)?.name ?? 'Training';
}

// --- the card ------------------------------------------------------------------------

export function AlignProposalCard({
  items,
  templates,
  busy,
  onApprove,
  onDecline,
}: {
  items: AlignItem[];
  templates: SessionTemplate[];
  busy: boolean;
  onApprove: () => void;
  onDecline: () => void;
}) {
  const [all, setAll] = useState(false);
  const shown = items.slice(0, INLINE_ITEMS);
  return (
    <>
      <Card className="flex flex-col gap-3">
        <Eyebrow>Gelijktrekken met je horloge</Eyebrow>
        <p className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>{countLabel(items.length)} gelijktrekken met je horloge</p>
        <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          Je vulde deze trainingen zelf in en je horloge mat ze ook. Met Akkoord nemen ze de cijfers van je horloge over: duur, afstand, hartslag en hoogtemeters. Wat jij invulde, zoals gevoel, inspanning en pijn, blijft staan. Je eigen cijfers worden bewaard en je kunt ze terugzetten.
        </p>
        <AlignList items={shown} templates={templates} />
        {items.length > shown.length && (
          <TextButton onClick={() => setAll(true)} className="self-start text-left">
            Bekijk alle {items.length}
          </TextButton>
        )}
        <SecondaryButton onClick={onApprove} disabled={busy}>{busy ? 'Bezig…' : 'Akkoord'}</SecondaryButton>
        <SecondaryButton onClick={onDecline} disabled={busy}>Liever niet</SecondaryButton>
      </Card>
      {all && (
        <SheetFrame title={countLabel(items.length)} onClose={() => setAll(false)}>
          <AlignList items={items} templates={templates} />
        </SheetFrame>
      )}
    </>
  );
}

function AlignList({ items, templates }: { items: AlignItem[]; templates: SessionTemplate[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.log.id} className="rounded-xl border px-3 py-2" style={{ borderColor: 'var(--color-card-border)' }}>
          <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{templateName(templates, item.log)} {formatDateNL(item.log.completedDate)}</p>
          <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{describeChanges(item).join(', ')}</p>
        </li>
      ))}
    </ul>
  );
}

function SheetFrame({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: React.ReactNode }) {
  const { closing, requestClose } = useSheetClose(onClose);
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div className={`max-h-[85vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <Card className="flex flex-col gap-3 rounded-b-none border-b-0 pb-6">
            <Eyebrow>Gelijktrekken met je horloge</Eyebrow>
            <p className="font-display text-lg" style={{ color: 'var(--color-ink)' }}>{title}</p>
            {children}
            <SecondaryButton onClick={requestClose}>Sluiten</SecondaryButton>
          </Card>
        </div>
      </div>
    </Portal>
  );
}

// --- the list of what was matched --------------------------------------------------------------

export function AlignedSheet({ aligned, templates, onClose }: { aligned: SessionLog[]; templates: SessionTemplate[]; onClose: () => void }) {
  const { restoreFromWatch } = useAppData();
  const [busy, setBusy] = useState(false);

  async function restore(ids: string[]) {
    if (busy) return;
    setBusy(true);
    try {
      await restoreFromWatch(ids);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SheetFrame title={aligned.length === 0 ? 'Niets gelijkgetrokken' : <>{countLabel(aligned.length)} gelijkgetrokken</>} onClose={onClose}>
      {aligned.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Alles staat weer op je eigen cijfers.</p>
      ) : (
        <>
          <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
            Bij elke training staan hieronder je eigen cijfers van toen. Met Terugzetten komen ze terug en is de training weer helemaal van jou. ASCEND trekt hem dan niet opnieuw gelijk.
          </p>
          <ul className="flex flex-col gap-2">
            {aligned.map((log) => (
              <li key={log.id} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--color-card-border)' }}>
                <div className="min-w-0">
                  <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{templateName(templates, log)} {formatDateNL(log.completedDate)}</p>
                  <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{describeManualLine(log)}</p>
                </div>
                <TextButton onClick={() => void restore([log.id])} disabled={busy} className="shrink-0 px-2">
                  Terugzetten
                </TextButton>
              </li>
            ))}
          </ul>
          <SecondaryButton onClick={() => void restore(aligned.map((l) => l.id))} disabled={busy}>
            {busy ? 'Bezig…' : aligned.length === 1 ? 'Terugzetten' : 'Alles terugzetten'}
          </SecondaryButton>
        </>
      )}
    </SheetFrame>
  );
}

// --- Today ----------------------------------------------------------------------------------------

export function WatchAlignCard() {
  const { loading, sessionLogs, templates, alignWithWatch } = useAppData();
  const { state, items } = useWatchAlign();
  const actions = useAlignActions(items);
  const attempted = useRef(new Set<string>());

  // Nothing left to propose after the first fetch (or nothing typed in to
  // match): the first proposal counts as answered, so what comes later is
  // "new" and goes by itself.
  useEffect(() => {
    if (loading || !state || state.alignResolved || !state.use.activities || !state.fetchedAt) return;
    const historyDone = !!state.historyFetchedAt || historyStart(sessionLogs, todayISO()) === undefined;
    if (historyDone && items.length === 0) void resolveAlignment();
  }, [loading, state, items, sessionLogs]);

  // The automatic route: only after the first proposal was answered, only with
  // the switch on, only for a log of the last 7 days.
  useEffect(() => {
    if (loading || !state || !state.use.activities || !state.garminLeads || !state.alignResolved) return;
    const recent = items.filter((i) => i.log.completedDate >= addDays(todayISO(), -AUTO_DAYS) && !attempted.current.has(i.activity.externalId));
    if (recent.length === 0) return;
    const timer = setTimeout(() => {
      for (const i of recent) attempted.current.add(i.activity.externalId);
      void alignWithWatch(recent.map((i) => ({ logId: i.log.id, activity: i.activity }))).catch(() => undefined);
    }, AUTO_DELAY_MS);
    return () => clearTimeout(timer);
  }, [loading, state, items, alignWithWatch]);

  if (loading || !state || state.alignResolved || !state.use.activities || items.length === 0) return null;
  return <AlignProposalCard items={items} templates={templates} busy={actions.busy} onApprove={() => void actions.approve()} onDecline={() => void actions.decline()} />;
}

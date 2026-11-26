// Het voorstel om een ladder van Calisthenics algemeen in een krachttraining te zetten (engine/ladderAddProposal.ts),
// met Akkoord, Liever niet en Ongedaan maken, los van de weergave (LadderAddNotice.tsx). Eén voorstel tegelijk: één
// mint accent op het scherm. Akkoord en Ongedaan maken zijn elk één opslag met een grens van 8 seconden
// (components/forge/stepUndo.ts#saveWithLimit). Besluit: docs/beslissingen/2026-11-26-calisthenics-voorstel-benen-en-romp.md.

import { useEffect, useMemo, useRef, useState } from 'react';
import { canAddExercise } from '../../engine/addedExercises';
import { forgeSlotsFor } from '../../engine/forgeSlots';
import { ladderAddProposals, ladderAddText, withLadderAdded, withLadderAddUndone, type LadderAddProposal } from '../../engine/ladderAddProposal';
import type { AddedExercises } from '../../engine/addedExercises';
import { resolveStrengthSettings } from '../../engine/strengthSettings';
import { useAppData } from '../../state/AppDataContext';
import { readLadderAddDeclines, rememberLadderAddDecline } from '../../utils/ladderAddDeclines';
import { saveWithLimit } from '../forge/stepUndo';

export type LadderAddState = 'open' | 'busy' | 'done' | 'failed' | 'undoing' | 'undone' | 'undoFailed';

export function useLadderAddProposal(ladderIds: readonly string[] | undefined, today: string) {
  const { sessionLogs, templates, plannedSessions, settings, updateSettings } = useAppData();
  const [declines, setDeclines] = useState(readLadderAddDeclines);
  const [state, setState] = useState<LadderAddState>('open');
  // Na Akkoord blijft het voorstel staan als bevestiging, met wat er daarvoor stond voor Ongedaan maken.
  const [accepted, setAccepted] = useState<{ proposal: LadderAddProposal; before: { addedExercises?: AddedExercises } } | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const live = useMemo(() => {
    if (!ladderIds) return null;
    const model = settings.strengthModel;
    const templateIds = templates.map((t) => t.id);
    const scheduled = new Set(plannedSessions.filter((s) => s.scheduledDate >= today && s.status !== 'skipped').map((s) => s.templateId));
    return ladderAddProposals({
      on: resolveStrengthSettings(model).stepProposal,
      ladderIds,
      logs: sessionLogs,
      today,
      templates,
      exercisesOf: (t) => forgeSlotsFor(t, model, today),
      canAdd: (id) => canAddExercise(model, id, templateIds),
      scheduled,
      declined: declines,
    })[0] ?? null;
  }, [ladderIds, today, sessionLogs, templates, plannedSessions, settings.strengthModel, declines]);
  const proposal = accepted?.proposal ?? live;
  const text = proposal ? ladderAddText(proposal) : null;

  async function accept() {
    if (!proposal || accepted || state === 'busy') return;
    const shown = proposal;
    const before = { addedExercises: settings.strengthModel?.addedExercises };
    setAccepted({ proposal: shown, before });
    setState('busy');
    const next = withLadderAdded(settings.strengthModel, shown, templates.map((t) => t.id));
    // Een late gelukte opslag telt alsnog als gelukt.
    const outcome = await saveWithLimit(() => updateSettings({ strengthModel: next }), undefined, () => {
      if (!mounted.current) return;
      setAccepted({ proposal: shown, before });
      setState('done');
    });
    if (!mounted.current) return;
    if (outcome === 'done') setState('done');
    else {
      setAccepted(null);
      setState('failed');
    }
  }

  async function undo() {
    if (!accepted || state === 'undoing') return;
    setState('undoing');
    const next = withLadderAddUndone(settings.strengthModel, accepted.proposal, accepted.before);
    const outcome = await saveWithLimit(() => updateSettings({ strengthModel: next }), undefined, () => {
      if (mounted.current) setState('undone');
    });
    if (mounted.current) setState(outcome === 'done' ? 'undone' : 'undoFailed');
  }

  function decline() {
    if (!proposal || accepted) return;
    // Alleen deze ladder; het voorstel voor de andere ladder komt daarna.
    setDeclines(rememberLadderAddDecline(proposal.ladderId));
    setState('open');
  }

  return { proposal, text, state, accept, decline, undo };
}

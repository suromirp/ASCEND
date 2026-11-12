// Het voorstel voor spieren voor de berg (engine/mountainMuscles.ts) met zijn Akkoord, los van de weergave.

import { useEffect, useMemo, useRef, useState } from 'react';
import { canAddExercise, withAddedExercise } from '../engine/addedExercises';
import { forgeSlotsFor } from '../engine/forgeSlots';
import { mountainMuscleProposal, muscleNoticeText, muscleProposalWeek, type MuscleProposal } from '../engine/mountainMuscles';
import { resolveStrengthSettings } from '../engine/strengthSettings';
import { useAppData } from '../state/AppDataContext';
import { mondayOfWeek, todayISO } from '../utils/dates';
import { readMuscleDeclines, rememberMuscleDecline } from '../utils/muscleDeclines';

// Opslaan is lokaal en snel; na deze tijd zegt de melding dat het niet op tijd lukte. Lukt het daarna alsnog, dan
// toont hij het als gelukt.
const SAVE_LIMIT_MS = 8000;

export type MuscleNoticeState = 'open' | 'busy' | 'done' | 'declined' | 'failed';

// De berekening en het Akkoord van het voorstel, los van de weergave: Forge toont het als melding in de kop van
// de training (`onlyFor`), de weekterugblik als rij met een eigen weergave. Beide gebruiken dezelfde engine-functie
// en dezelfde Akkoord.
// `active` false: de hook rekent niets (een oude weekterugblik). De week komt altijd uit muscleProposalWeek.
export function useMountainMuscleProposal({ onlyFor, active = true }: { onlyFor?: string; active?: boolean } = {}) {
  const weekStart = muscleProposalWeek(todayISO());
  const { sessionLogs, templates, program, trainingGoals, goalMilestones, settings, updateSettings, injuryNotes, leavePeriods } = useAppData();
  const [declines] = useState(readMuscleDeclines);
  const [state, setState] = useState<MuscleNoticeState>('open');
  // Na Akkoord blijft het voorstel staan als bevestiging, ook al staat de oefening nu in de training.
  const [accepted, setAccepted] = useState<MuscleProposal | null>(null);
  // De tijdgrens van het opslaan, opgeruimd na afloop en als het blad sluit.
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
    };
  }, []);
  const live = useMemo(() => {
    if (!active) return null;
    const strength = resolveStrengthSettings(settings.strengthModel);
    const today = todayISO();
    const templateIds = templates.map((t) => t.id);
    const found = mountainMuscleProposal({
      on: strength.enabled && strength.mountainMuscles,
      weekStart,
      today,
      canAdd: (id) => canAddExercise(settings.strengthModel, id, templateIds),
      logs: sessionLogs,
      program,
      goals: trainingGoals,
      milestones: goalMilestones,
      templates,
      exercisesOf: (t) => forgeSlotsFor(t, settings.strengthModel, today),
      profile: strength.profile,
      declined: declines,
      balance: strength.mountainBalance,
      leave: leavePeriods,
      injuries: injuryNotes,
    });
    return found && onlyFor !== undefined && found.templateId !== onlyFor ? null : found;
  }, [active, weekStart, onlyFor, sessionLogs, templates, program, trainingGoals, goalMilestones, settings.strengthModel, declines, leavePeriods, injuryNotes]);
  const shownProposal = accepted ?? live;
  const proposal = shownProposal && state !== 'declined' ? shownProposal : null;
  const text = proposal ? muscleNoticeText(proposal) : null;

  async function accept() {
    if (!proposal) return;
    setAccepted(proposal);
    setState('busy');
    const shown = proposal;
    const save = updateSettings({ strengthModel: withAddedExercise(settings.strengthModel, shown.templateId, shown.exerciseId, templates.map((t) => t.id)) });
    let saved = false;
    // Een late gelukte opslag telt alsnog als gelukt.
    save.then(() => {
      saved = true;
      if (!mounted.current) return;
      setAccepted(shown);
      setState('done');
    }, () => undefined);
    const limit = new Promise<never>((_, reject) => {
      timer.current = setTimeout(() => reject(new Error('tijd')), SAVE_LIMIT_MS);
    });
    try {
      await Promise.race([save, limit]);
    } catch {
      if (!saved && mounted.current) {
        setAccepted(null);
        setState('failed');
      }
    } finally {
      clearTimeout(timer.current);
    }
  }

  function decline() {
    if (!proposal) return;
    // De stilte telt vanaf deze week, ook als je een oude terugblik bekijkt.
    rememberMuscleDecline({ muscle: proposal.muscle, weekStart: mondayOfWeek(todayISO()) });
    setState('declined');
  }

  return { proposal, text, state, accept, decline };
}

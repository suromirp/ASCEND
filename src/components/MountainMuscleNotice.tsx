// De ene rustige melding in de weekterugblik over spieren voor de berg (engine/mountainMuscles.ts), met een
// voorstel om één oefening toe te voegen. Pas na Akkoord verandert er iets; "Liever niet" laat de spier acht
// weken met rust. Besluit: docs/beslissingen/2026-11-02-forge-herinrichting.md.

import { useMemo, useState } from 'react';
import { addedSlotsFor, withAddedExercise } from '../engine/addedExercises';
import { programExercisesFor } from '../engine/macrofactorProgram';
import { mountainMuscleProposal, muscleNoticeText, type MuscleProposal } from '../engine/mountainMuscles';
import { resolveStrengthSettings } from '../engine/strengthSettings';
import { useAppData } from '../state/AppDataContext';
import { todayISO } from '../utils/dates';
import { readMuscleDeclines, rememberMuscleDecline } from '../utils/muscleDeclines';
import { Eyebrow, SecondaryButton } from './ui';

// Opslaan is lokaal en snel; na deze tijd zegt de melding dat het niet lukte.
const SAVE_LIMIT_MS = 8000;

export function MountainMuscleNotice({ weekStart }: { weekStart: string }) {
  const { sessionLogs, templates, program, trainingGoals, goalMilestones, settings, updateSettings } = useAppData();
  const [declines] = useState(readMuscleDeclines);
  const [state, setState] = useState<'open' | 'busy' | 'done' | 'declined' | 'failed'>('open');
  // Na Akkoord blijft het voorstel staan als bevestiging, ook al staat de oefening nu in de training.
  const [accepted, setAccepted] = useState<MuscleProposal | null>(null);
  const live = useMemo(() => {
    const strength = resolveStrengthSettings(settings.strengthModel);
    const today = todayISO();
    return mountainMuscleProposal({
      on: strength.enabled && strength.mountainMuscles,
      weekStart,
      logs: sessionLogs,
      program,
      goals: trainingGoals,
      milestones: goalMilestones,
      templates,
      exercisesOf: (t) => [...(programExercisesFor(settings.strengthModel?.program, t.id, today) ?? t.exercises ?? []), ...addedSlotsFor(settings.strengthModel, t.id)],
      profile: strength.profile,
      declined: declines,
    });
  }, [weekStart, sessionLogs, templates, program, trainingGoals, goalMilestones, settings.strengthModel, declines]);
  const proposal = accepted ?? live;
  if (!proposal || state === 'declined') return null;
  const text = muscleNoticeText(proposal);

  async function accept() {
    if (!proposal) return;
    setAccepted(proposal);
    setState('busy');
    const save = updateSettings({ strengthModel: withAddedExercise(settings.strengthModel, proposal.templateId, proposal.exerciseId) });
    const limit = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('tijd')), SAVE_LIMIT_MS));
    try {
      await Promise.race([save, limit]);
      setState('done');
    } catch {
      setAccepted(null);
      setState('failed');
    }
  }

  function decline() {
    if (!proposal) return;
    rememberMuscleDecline({ muscle: proposal.muscle, weekStart });
    setState('declined');
  }

  return (
    <div className="mt-5" role="group" aria-label="Kracht voor de berg">
      <Eyebrow>Kracht voor de berg</Eyebrow>
      <div className="mt-2 flex flex-col gap-1.5">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{text.fact} {text.care}</p>
        {text.unknown && <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{text.unknown}</p>}
        {state === 'done' ? (
          <p role="status" className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
            {proposal.exerciseName} staat erin. Je ziet hem bij je volgende {proposal.templateName}; in het blad van de oefening haal je hem weer weg.
          </p>
        ) : (
          <>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{text.proposal}</p>
            {state === 'failed' && <p role="status" className="text-xs" style={{ color: 'var(--color-warning)' }}>Opslaan lukte niet op tijd. Probeer het nog eens; hij komt er hoogstens één keer in.</p>}
            <div className="mt-1 flex gap-3">
              <SecondaryButton disabled={state === 'busy'} onClick={decline}>Liever niet</SecondaryButton>
              <SecondaryButton disabled={state === 'busy'} onClick={() => void accept()}>Akkoord</SecondaryButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

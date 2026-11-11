// De ene rustige melding in de weekterugblik over spieren voor de berg (engine/mountainMuscles.ts), met een
// voorstel om één oefening toe te voegen. Pas na Akkoord verandert er iets; "Liever niet" laat de spier acht
// weken met rust. Besluit: docs/beslissingen/2026-11-02-forge-herinrichting.md.

import { useEffect, useMemo, useRef, useState } from 'react';
import { canAddExercise, withAddedExercise } from '../engine/addedExercises';
import { forgeSlotsFor } from '../engine/forgeSlots';
import { mountainMuscleProposal, muscleNoticeText, type MuscleProposal } from '../engine/mountainMuscles';
import { resolveStrengthSettings } from '../engine/strengthSettings';
import { useAppData } from '../state/AppDataContext';
import { mondayOfWeek, todayISO } from '../utils/dates';
import { readMuscleDeclines, rememberMuscleDecline } from '../utils/muscleDeclines';
import { Eyebrow, SecondaryButton } from './ui';

// Opslaan is lokaal en snel; na deze tijd zegt de melding dat het niet op tijd lukte. Lukt het daarna alsnog, dan
// toont hij het als gelukt.
const SAVE_LIMIT_MS = 8000;

// In de weekterugblik staat hij onder de rest; in Forge (`onlyFor`) alleen in de training waar de oefening bij zou
// komen, met dezelfde engine-functie en dezelfde Akkoord.
export function MountainMuscleNotice({ weekStart, onlyFor, className = 'mt-5' }: { weekStart: string; onlyFor?: string; className?: string }) {
  const { sessionLogs, templates, program, trainingGoals, goalMilestones, settings, updateSettings, injuryNotes, leavePeriods } = useAppData();
  const [declines] = useState(readMuscleDeclines);
  const [state, setState] = useState<'open' | 'busy' | 'done' | 'declined' | 'failed'>('open');
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
  }, [weekStart, onlyFor, sessionLogs, templates, program, trainingGoals, goalMilestones, settings.strengthModel, declines, leavePeriods, injuryNotes]);
  const proposal = accepted ?? live;
  if (!proposal || state === 'declined') return null;
  const text = muscleNoticeText(proposal);

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

  return (
    <div className={className} role="group" aria-label="Kracht voor de berg">
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

import { useEffect, useState } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { defaultAnswers, kindOfExistingGoals, type StartAnswers } from '../../engine/firstPlan';
import { ImportWizard } from '../ImportWizard';
import { SkyBand } from '../SkyBand';
import { Card, Eyebrow, PrimaryButton, SecondaryButton } from '../ui';
import { StartWizard } from './StartWizard';

// Vandaag in een app zonder programma en zonder planning (een nieuwe installatie)
// ASCEND plant pas als je hebt gezegd wat je wilt
// (docs/beslissingen/2026-10-25-eerst-vragen-dan-plannen.md). Twee keuzes:
// je back-up terugzetten, of een paar vragen beantwoorden en je eerste week zien.
//
// `onHold`: zolang een van de twee open staat, blijft dit scherm staan, ook als
// de gegevens intussen binnen zijn (een back-up die klaar is wil zijn
// afsluiting nog laten zien).
export function StartWelcome({ onHold }: { onHold: (hold: boolean) => void }) {
  const [open, setOpen] = useState<'questions' | 'import' | null>(null);
  const { trainingGoals, goalMilestones } = useAppData();
  // A goal that is already there decides the kind of week the advice is for.
  const [answers, setAnswers] = useState<StartAnswers>(() => defaultAnswers(trainingGoals.some((g) => g.status !== 'archived') ? kindOfExistingGoals(trainingGoals, goalMilestones) : undefined));
  useEffect(() => {
    onHold(open !== null);
  }, [open, onHold]);

  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-6">
      <SkyBand>
        <header className="flex flex-col gap-1">
          <Eyebrow>Welkom</Eyebrow>
          <h1 className="font-display text-[28px] leading-9" style={{ color: 'var(--color-ink)' }}>Welkom bij ASCEND</h1>
        </header>
        <Card className="flex flex-col gap-3">
          <p className="text-base" style={{ color: 'var(--color-ink)' }}>
            ASCEND plant pas als je hebt verteld wat je wilt. Met een paar vragen zie je je eerste week, en jij zegt of die klopt.
          </p>
          <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>
            Gebruikte je ASCEND al eerder? Zet dan je back-up terug: je trainingen, doelen en instellingen komen terug.
          </p>
          <div className="mt-1 flex flex-col gap-3">
            <PrimaryButton onClick={() => setOpen('questions')}>Nieuw beginnen</PrimaryButton>
            <SecondaryButton onClick={() => setOpen('import')}>Back-up terugzetten</SecondaryButton>
          </div>
        </Card>
      </SkyBand>

      <p className="px-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>
        Je gegevens blijven op dit toestel. ASCEND heeft geen account.
      </p>

      {open === 'questions' && <StartWizard answers={answers} onAnswers={setAnswers} onClose={() => setOpen(null)} />}
      {open === 'import' && <ImportWizard onClose={() => setOpen(null)} />}
    </div>
  );
}

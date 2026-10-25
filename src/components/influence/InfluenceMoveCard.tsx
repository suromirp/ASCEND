import { useMemo, useState } from 'react';
import { influenceMoveSummary, morningNumber } from '../../engine/influenceProposal';
import { useAppData } from '../../state/AppDataContext';
import { todayISO } from '../../utils/dates';
import { ProposalSheet } from '../ProposalSheet';
import { Card, SecondaryButton } from '../ui';
import { useRecoveryMetrics } from '../useRecoveryMetrics';

// Vandaag, onder de missiekaart: als je een avond met veel glazen vastlegde (of wiet op de dag
// zelf) en er staat een test, komt er één rustige kaart met een voorstel om de test te
// verschuiven (engine/influenceProposal.ts). De gevulde mint knop blijft op de missiekaart; dit
// is een gewone omlijnde knop. Het voorstel gaat zoals elk voorstel: preview, Akkoord of Liever
// niet, en na Akkoord de melding met Ongedaan maken.

export function InfluenceMoveCard() {
  const { influenceMove } = useAppData();
  const metrics = useRecoveryMetrics();
  const [open, setOpen] = useState(false);
  const today = todayISO();
  const morning = useMemo(() => morningNumber(today, metrics), [today, metrics]);
  if (!influenceMove) return null;
  const { advice, cause, targetDate } = influenceMove;
  const summary = influenceMoveSummary(cause, morning, targetDate);
  return (
    <>
      <Card className="flex flex-col gap-3">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
          Je test 5 km staat {cause.today ? 'vandaag' : 'morgen'}. ASCEND heeft een voorstel om hem te verschuiven.
        </p>
        <SecondaryButton className="w-full" onClick={() => setOpen(true)}>Voorstel bekijken</SecondaryButton>
      </Card>
      {open && (
        <ProposalSheet
          advice={advice}
          eyebrow="Voorstel"
          summary={summary}
          notes={['Je tempo\'s blijven zoals ze zijn tot de test.']}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

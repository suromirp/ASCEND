// ASCEND: Vandaag, onder de missiekaart: wijken twee van de drie getallen van je horloge af en staat
// er vandaag een tempoloop, intervallen, een test of een zware beendag, dan één rustige kaart met een
// voorstel om hem later te doen (engine/morningProposal.ts). De gevulde mint knop blijft op de
// missiekaart; dit is een gewone omlijnde knop. Het voorstel gaat zoals elk voorstel: preview,
// Akkoord of Liever niet, en na Akkoord de melding met Ongedaan maken. Een fout in de berekening
// maakt de kaart stil.

import { useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { MORNING_LIGHTER_NOTE, morningProposal, morningProposalCause, morningProposalLine } from '../engine/morningProposal';
import { signalOn } from '../engine/signalSettings';
import { todayISO } from '../utils/dates';
import { ProposalSheet } from './ProposalSheet';
import { Card, SecondaryButton } from './ui';
import { useTodayWatch } from './useWellness';
import { useLegEase } from './useLegEase';
import { resolveLegEase } from '../engine/legEaseSettings';

export function MorningProposalCard() {
  const { sessionLogs, plannedSessions, templates, program, settings, injuryNotes, goalEngineConfig, answeredAdviceIds, advice, influenceMove } = useAppData();
  // De kaart Benen en het testvoorstel na Wat speelde er spreken al voor hun training: dan zwijgt deze kaart.
  const legCardId = useLegEase().state?.target.session.id;
  const influenceId = influenceMove?.cause.session.id;
  const today = todayISO();
  const { rule } = useTodayWatch(today);
  const [open, setOpen] = useState(false);
  const legEase = resolveLegEase(settings);
  const enabled = signalOn(settings, 'morningProposal') && signalOn(settings, 'morningRule');
  const found = useMemo(() => {
    try {
      const cause = morningProposalCause({
        today, rule, plannedSessions, templates, logs: sessionLogs, checkIns: settings.morningCheckIns, illnessEpisodes: settings.illnessEpisodes, enabled,
      });
      if (!cause) return undefined;
      const proposal = morningProposal({
        logs: sessionLogs, plannedSessions, templates, injuries: injuryNotes, program,
        dailyTimeBudget: goalEngineConfig.availability.dailyTimeBudget,
        sameDayPairingPreference: goalEngineConfig.strategy.sameDayPairingPreference,
        enabledSports: settings.enabledSports, respondedIds: answeredAdviceIds, asOf: today, illnessEpisodes: settings.illnessEpisodes,
        legEase, checkIns: settings.morningCheckIns,
      }, cause, new Set(advice.map((a) => a.id)));
      return proposal ? { cause, proposal } : undefined;
    } catch (err) {
      console.error('Voorstel bij een slechte ochtend: berekening mislukt:', err);
      return undefined;
    }
  }, [today, rule, plannedSessions, templates, sessionLogs, settings.morningCheckIns, settings.illnessEpisodes, settings.enabledSports, legEase, enabled, injuryNotes, program, goalEngineConfig, answeredAdviceIds, advice]);
  if (!found || found.cause.session.id === legCardId || found.cause.session.id === influenceId) return null;
  return (
    <>
      <Card className="flex flex-col gap-3">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{morningProposalLine(found.cause)}</p>
        <SecondaryButton className="w-full" onClick={() => setOpen(true)}>Voorstel bekijken</SecondaryButton>
      </Card>
      {open && (
        <ProposalSheet
          advice={found.proposal}
          eyebrow="Voorstel"
          summary={found.proposal.effect}
          notes={[MORNING_LIGHTER_NOTE]}
          notesTitle="Of lichter"
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

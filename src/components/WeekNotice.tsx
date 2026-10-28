import { useState } from 'react';
import type { WeekNotice as WeekNoticeData } from '../engine/weekFixProposal';
import { noticeHeadline } from '../engine/weekConcerns';
import { useAppData } from '../state/AppDataContext';
import { ProposalSheet } from './ProposalSheet';
import { Sheet } from './settings/Sheet';
import { TextButton } from './TextButton';
import { Card, Eyebrow, PrimaryButton } from './ui';

// Wat er in de getoonde week niet klopt, in woorden (docs/visie/Waarschuwingen in Week.md).
// Direct onder de lucht, alleen met een reden. Eén punt: de zin zelf met het feit eronder.
// Meer punten: de telling en hoogstens drie korte regels, de rest in een onderblad.
// "Bekijk voorstel" opent het voorstel in de ProposalSheet; Liever niet laat de week zoals hij is
// en de melding blijft, rustiger, met "Toch een voorstel". Niets verandert zonder Akkoord.
const SHOWN = 3;

export function WeekNotice({ notice }: { notice: WeekNoticeData }) {
  const { answeredAdviceIds, settings } = useAppData();
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [allOpen, setAllOpen] = useState(false);
  const { concerns, fixes } = notice;
  if (concerns.length === 0) return null;

  const withFix = concerns.map((c) => fixes[c.key]).filter((a): a is NonNullable<typeof a> => !!a);
  const open = withFix.find((a) => !answeredAdviceIds.has(a.id));
  const declined = withFix.find((a) => answeredAdviceIds.has(a.id));
  const proposalsOn = settings.weekFixProposal !== false;
  const shown = concerns.slice(0, SHOWN);
  const rest = concerns.length - shown.length;
  const quiet = !open && !!declined;
  const sheetAdvice = withFix.find((a) => a.id === proposalId);

  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow tone={quiet ? 'var(--color-ink-dim)' : 'var(--color-warning)'}>Let op</Eyebrow>
      {concerns.length === 1 ? (
        <div className="flex flex-col gap-1">
          <p className="text-base font-medium leading-snug" style={{ color: 'var(--color-ink)' }}>{concerns[0].headline}</p>
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{concerns[0].fact}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-base font-medium leading-snug" style={{ color: 'var(--color-ink)' }}>{noticeHeadline(concerns)}</p>
          {shown.map((c) => (
            <p key={c.key} className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
              <span style={{ color: 'var(--color-ink)' }}>{c.headline}</span> {c.fact}
            </p>
          ))}
          {rest > 0 && <TextButton onClick={() => setAllOpen(true)}>en nog {rest}</TextButton>}
        </div>
      )}
      {open && <PrimaryButton onClick={() => setProposalId(open.id)}>Bekijk voorstel</PrimaryButton>}
      {quiet && <TextButton onClick={() => setProposalId(declined!.id)}>Toch een voorstel</TextButton>}
      {proposalsOn && withFix.length === 0 && (
        <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>ASCEND vond deze week geen dag die beter past.</p>
      )}

      {sheetAdvice && <ProposalSheet advice={sheetAdvice} onClose={() => setProposalId(null)} />}
      {allOpen && (
        <Sheet eyebrow="Week" title="Wat niet klopt" line={noticeHeadline(concerns)} onClose={() => setAllOpen(false)}>
          <div className="flex flex-col gap-3 px-1 pb-2">
            {concerns.map((c) => (
              <div key={c.key}>
                <p className="text-base font-medium leading-snug" style={{ color: 'var(--color-ink)' }}>{c.headline}</p>
                <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{c.fact}</p>
              </div>
            ))}
          </div>
        </Sheet>
      )}
    </Card>
  );
}

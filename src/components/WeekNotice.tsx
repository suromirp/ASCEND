import { useEffect, useRef, useState } from 'react';
import { TAKEN_LINE, weekFixId, type WeekNotice as WeekNoticeData } from '../engine/weekFixProposal';
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

// Het voorstel wordt pas uitgerekend als je erom vraagt (een paar honderd milliseconden): het tekenen van de week
// wacht er nooit op. De knop toont dan kort "Even rekenen…"; lukt het niet, dan staat dat er in woorden.
type Outcome = 'idle' | 'busy' | 'ready' | 'failed';

export function WeekNotice({ notice, weekStart }: { notice: WeekNoticeData; weekStart: string }) {
  const { answeredAdviceIds, settings, weekFixesFor, plannedSessions } = useAppData();
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [allOpen, setAllOpen] = useState(false);
  const [work, setWork] = useState<{ for: WeekNoticeData; outcome: Outcome; full?: WeekNoticeData }>({ for: notice, outcome: 'idle' });
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  // Een andere week of een gewijzigde planning: het uitgerekende voorstel hoort er niet meer bij.
  const current = work.for === notice ? work : { for: notice, outcome: 'idle' as Outcome };
  const full = current.outcome === 'ready' ? current.full : undefined;
  const { concerns, covered } = full ?? notice;
  const fixes = full?.fixes ?? {};
  if (concerns.length === 0) return null;

  const proposalsOn = settings.weekFixProposal !== false;
  const withFix = concerns.map((c) => fixes[c.key]).filter((a): a is NonNullable<typeof a> => !!a);
  // Zonder de berekening weten we uit het id al of je Liever niet zei.
  const idOf = (c: (typeof concerns)[number]) => fixes[c.key]?.id ?? weekFixId(c, plannedSessions);
  const askable = concerns.filter((c) => !covered.includes(c.key));
  const answeredCount = askable.filter((c) => answeredAdviceIds.has(idOf(c))).length;
  const quiet = askable.length > 0 && answeredCount === askable.length;
  const openCount = askable.length - answeredCount;
  const stillOpen = answeredCount > 0 && openCount > 0;
  const shown = concerns.slice(0, SHOWN);
  const rest = concerns.length - shown.length;
  const sheetAdvice = withFix.find((a) => a.id === proposalId);
  // Na het rekenen: heeft geen enkele open melding een voorstel, dan geen knop maar de zin dat er geen betere dag is.
  const noFix = current.outcome === 'ready' && askable.every((c) => !fixes[c.key]);

  // Rekent het voorstel uit nadat de week getekend is en opent het blad; lukt het niet, dan staat er een zin.
  const ask = () => {
    if (full) {
      const pick = withFix.find((a) => !answeredAdviceIds.has(a.id)) ?? withFix[0];
      if (pick) setProposalId(pick.id);
      return;
    }
    setWork({ for: notice, outcome: 'busy' });
    setTimeout(() => {
      if (!mounted.current) return;
      try {
        const result = weekFixesFor(weekStart);
        setWork({ for: notice, outcome: 'ready', full: result });
        const list = result.concerns.map((c) => result.fixes[c.key]).filter((a): a is NonNullable<typeof a> => !!a);
        const pick = list.find((a) => !answeredAdviceIds.has(a.id)) ?? list[0];
        if (pick) setProposalId(pick.id);
      } catch (err) {
        console.error('Het weekvoorstel kon niet worden berekend:', err);
        setWork({ for: notice, outcome: 'failed' });
      }
    }, 50); // Even wachten zodat "Even rekenen…" eerst getekend wordt; het rekenen zelf blokkeert de pagina.
  };
  const busy = current.outcome === 'busy';

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
      {stillOpen && (
        <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{`Nog ${openCount} ${openCount === 1 ? 'punt' : 'punten'} open.`}</p>
      )}
      {proposalsOn && !noFix && askable.length > 0 && !quiet && <PrimaryButton onClick={ask} disabled={busy}>{busy ? 'Even rekenen…' : 'Bekijk voorstel'}</PrimaryButton>}
      {proposalsOn && !noFix && quiet && <TextButton onClick={ask} disabled={busy}>{busy ? 'Even rekenen…' : 'Toch een voorstel'}</TextButton>}
      {current.outcome === 'failed' && (
        <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Het voorstel lukte nu niet. Probeer het straks nog eens.</p>
      )}
      {covered.length > 0 && (
        <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{TAKEN_LINE}</p>
      )}
      {proposalsOn && noFix && (
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

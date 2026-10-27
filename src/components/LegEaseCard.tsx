import { useState } from 'react';
import { easeAdvice, easeDoneLine, easeExplain, easeFact, easeMacroFactorLine, easeTitle, EASE_INDEX_EXPLAIN, moveLabel } from '../engine/legDayEase';
import type { LegEaseChoice } from '../models/legEase';
import { useAppData } from '../state/AppDataContext';
import { resolveStrengthSettings } from '../engine/strengthSettings';
import { ProposalSheet } from './ProposalSheet';
import { TextButton } from './TextButton';
import { Card, Eyebrow, SecondaryButton } from './ui';
import { useGuardedSave, useLegEase } from './useLegEase';

// Vandaag: een zware beendag op vermoeide benen (docs/beslissingen/2026-10-27-spierpijn-en-zware-beendag.md).
// Een gewone kaart onder de missie, alleen met een reden: spierpijn die je meldde, een harde loop
// eerder vandaag of een hoge beenindex. Lichter is een voorstel voor je uitvoering in Forge, een dag
// later gaat via het bekende voorstelblad met Akkoord. Liever niet laat de kaart voor deze training
// van vandaag weg. Niets verandert stil; de training en de logs blijven zoals ze zijn.

export function LegEaseCard() {
  const { settings } = useAppData();
  const { how, state, choose, undo } = useLegEase();
  const { busy, failed, retry, run } = useGuardedSave();
  const [sheet, setSheet] = useState(false);

  if (!state) return null;
  const { target, signals, offer, move } = state;
  const weightFollows = resolveStrengthSettings(settings.strengthModel).enabled;

  const pick = (choice: LegEaseChoice) => run(() => choose(choice));

  const dim = { color: 'var(--color-ink-dim)' };
  const title = easeTitle(target.template.name);

  return (
    <Card className="flex flex-col gap-2">
      <Eyebrow>Benen</Eyebrow>
      {offer.state === 'eased' ? (
        <>
          <p className="text-base font-medium leading-snug" style={{ color: 'var(--color-ink)' }}>{easeDoneLine(how, weightFollows)}</p>
          <p className="text-xs leading-relaxed" style={dim}>{easeMacroFactorLine(how)}</p>
          <div className="flex">
            <TextButton tone="dim" disabled={busy} onClick={() => run(undo)}>Terugzetten</TextButton>
          </div>
        </>
      ) : (
        <>
          <p className="text-base font-medium leading-snug" style={{ color: 'var(--color-ink)' }}>{title}</p>
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{easeFact(signals)}</p>
          <p className="text-xs leading-relaxed" style={dim}>{EASE_INDEX_EXPLAIN}</p>
          {offer.state === 'offer' && (
            <>
              <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{easeAdvice(offer.canEase, !!move)}</p>
              {offer.canEase && <p className="text-xs leading-relaxed" style={dim}>{easeExplain(how, weightFollows)}</p>}
              <div className="mt-1 flex flex-wrap items-center gap-x-3">
                {offer.canEase && (
                  <div className="flex w-28 shrink-0">
                    <SecondaryButton disabled={busy} onClick={() => pick('lichter')}>Lichter</SecondaryButton>
                  </div>
                )}
                {move && <TextButton disabled={busy} onClick={() => setSheet(true)}>{moveLabel(move.proposal?.changes[0]?.toDate ?? signals.date)}</TextButton>}
                <TextButton tone="dim" disabled={busy} onClick={() => pick('liever-niet')}>Liever niet</TextButton>
              </div>
            </>
          )}
        </>
      )}
      {failed && (
        <p className="flex flex-wrap items-center gap-x-3 text-xs leading-snug" role="status" style={{ color: 'var(--color-warning)' }}>
          {failed}
          {retry && <TextButton size="xs" onClick={retry}>Opnieuw</TextButton>}
        </p>
      )}
      {sheet && move && <ProposalSheet advice={move} onClose={() => setSheet(false)} />}
    </Card>
  );
}

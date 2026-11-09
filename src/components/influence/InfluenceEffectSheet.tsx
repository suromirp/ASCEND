import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AMOUNT_LABEL, AMOUNTS } from '../../data/influenceReasons';
import type { AlcoholAmount, InfluenceEntry } from '../../models/influence';
import {
  MEASURES,
  appliesTo,
  MEASURE_TITLE,
  MEASURE_UNIT,
  alcoholAmounts,
  decimalsFor,
  effectsOfGroup,
  factSentence,
  fewLine,
  groupsOf,
  headline,
  researchLine,
  scaleFor,
  signed,
  MIN_TIMES,
  type ReasonEffect,
  type ReasonGroup,
} from '../../engine/influenceEffects';
import { useSheetClose } from '../../utils/useSheetClose';
import { Portal } from '../Portal';
import { SheetHeader } from '../SheetHeader';
import { TextButton } from '../TextButton';
import { Card, Eyebrow, Num, SheetGrip } from '../ui';
import { InfluenceStrip } from './InfluenceStrip';

// Het blad bij één reden op Je stand: bovenaan de hoeveelheid (alleen bij alcohol) als strook,
// een kopzin met alleen wat duidelijk buiten je schommeling valt, daaronder per meting dezelfde
// strook met één feitelijke zin en wat het onderzoek vindt. Geen oordeel en geen advies.
// Ontwerp: Invloeden ASCEND, bord 3b.

export function InfluenceEffectSheet({ groupKey, entries, own, effects, onClose }: { groupKey: string; entries: InfluenceEntry[]; own: InfluenceEntry[]; effects: ReasonEffect[]; onClose: () => void }) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  const navigate = useNavigate();
  const [key, setKey] = useState(groupKey);
  const isAlcohol = groupKey.startsWith('alcohol');
  const group = knownGroup(entries, key) ?? knownGroup(entries, groupKey);
  // "Vastgelegde keren bekijken" only where there is a note of your own behind the reason.
  const ownRecorded = own.some((e) => groupsOf(e).some((g) => g.key === groupKey || g.key === key));
  const byMeasure = effectsOfGroup(effects, key);
  const amounts = alcoholAmounts(entries);
  const chosenAmount = AMOUNTS.find((a) => `alcohol:${a}` === key);
  const chosenCount = chosenAmount ? amounts.find((a) => a.amount === chosenAmount)?.count ?? 0 : 0;
  const sentence = group ? headline(group, byMeasure) : undefined;
  const anyEnough = [...byMeasure.values()].some((e) => e.enough);

  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef} className={`relative max-h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Wat doet dit met je: ${isAlcohol ? 'Alcohol' : group?.name ?? ''}`}>
          <SheetGrip />
          <Card className="rounded-b-none border-b-0 pb-8">
            <SheetHeader eyebrow="Wat doet dit met je?" title={isAlcohol ? 'Alcohol' : group?.name} onClose={requestClose} />

            {isAlcohol && (
              <div className="mt-3 flex flex-col gap-2">
                <div role="radiogroup" aria-label="Hoeveel glazen" className="flex h-[46px] w-full items-stretch rounded-xl border" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}>
                  {amounts.map(({ amount, count }) => {
                    const on = `alcohol:${amount}` === key;
                    const dim = count < MIN_TIMES;
                    return (
                      <button
                        key={amount}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setKey(`alcohol:${amount}`)}
                        className="flex min-h-[44px] flex-1 items-center justify-center p-[3px]"
                      >
                        <span
                          className="flex h-9 w-full items-center justify-center rounded-lg text-sm tabular-nums"
                          style={{ background: on ? 'var(--color-action-muted)' : 'transparent', color: on ? 'var(--color-ink)' : dim ? 'var(--color-ink-dim)' : 'var(--color-ink)', opacity: dim && !on ? 0.7 : 1 }}
                        >
                          {AMOUNT_LABEL[amount]}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {chosenAmount && chosenCount < MIN_TIMES && (
                  <p className="text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
                    {AMOUNT_LABEL[chosenAmount]} glazen: {chosenCount === 0 ? 'nog niet vastgelegd' : `${chosenCount} keer, nog te weinig`}.
                  </p>
                )}
              </div>
            )}

            {anyEnough && (
              <p className="mt-4 font-display text-xl leading-snug" style={{ color: 'var(--color-ink)' }}>
                {sentence
                  ? sentence.map((p, i) => ('num' in p ? <Num key={i}>{p.num}</Num> : <span key={i}>{p.text}</span>))
                  : 'Niets ligt duidelijk buiten je gewone schommeling.'}
              </p>
            )}

            <div className="mt-2 flex flex-col">
              {MEASURES.filter((m) => !group || appliesTo(group, m)).map((m, i) => (
                <MeasureBlock key={m} measure={m} effect={byMeasure.get(m)} group={group} first={i === 0} />
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-1 border-t pt-4" style={{ borderColor: 'var(--color-card-border)' }}>
              <Eyebrow>Hoe ASCEND rekent</Eyebrow>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
                Je schommeling is je eigen bereik in de vier weken ervoor, met de middelste waarde, zodat één uitschieter weinig uitmaakt. Andere ochtenden waar je zelf iets bij noteerde tellen er niet in mee. Wat ASCEND zelf weet, zoals een zware beendag, hoort bij je gewone week en telt er wel in mee. Nachten en loopjes die je niet liet meetellen staan hier wel in, want daar gaat het om. Een paar keer is weinig: zie het als een richting.
              </p>
            </div>

            {ownRecorded && <TextButton className="mt-2" icon="verder" onClick={() => { onClose(); navigate('/more/lichaam'); }}>Vastgelegde keren bekijken</TextButton>}
          </Card>
        </div>
      </div>
    </Portal>
  );
}

function knownGroup(entries: InfluenceEntry[], key: string): ReasonGroup | undefined {
  for (const entry of entries) {
    const found = groupsOf(entry).find((g) => g.key === key);
    if (found) return found;
  }
  // Een hoeveelheid die nog niet is vastgelegd, voor de strook: de naam kennen we wel.
  const amount = AMOUNTS.find((a) => `alcohol:${a}` === key) as AlcoholAmount | undefined;
  return amount ? { key, reason: 'alcohol', amount, name: `Alcohol, ${AMOUNT_LABEL[amount]} glazen` } : undefined;
}

function MeasureBlock({ measure, effect, group, first }: { measure: (typeof MEASURES)[number]; effect: ReasonEffect | undefined; group: ReasonGroup | undefined; first: boolean }) {
  const research = group ? researchLine(group, measure) : undefined;
  const decimals = decimalsFor(measure);
  const rounded = effect ? Math.round(effect.meanDiff * 10 ** decimals) / 10 ** decimals : 0;
  const unit = MEASURE_UNIT[measure][Math.abs(rounded) === 1 ? 'one' : 'many'];
  return (
    <div className={`flex flex-col gap-1.5 py-4 ${first ? 'pt-3' : 'border-t'}`} style={{ borderColor: 'var(--color-card-border)' }}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{MEASURE_TITLE[measure]}</span>
        {effect?.enough && (
          <span className="shrink-0 whitespace-nowrap">
            <span className="font-sans text-xl font-semibold tabular-nums" style={{ color: 'var(--color-ink)' }}>{signed(effect.meanDiff, decimals)}</span>
            <span className="ml-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{unit}</span>
          </span>
        )}
      </div>
      {effect?.enough ? (
        <>
          <InfluenceStrip effect={effect} scale={scaleFor([effect])} />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{factSentence(effect)}</p>
        </>
      ) : (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{fewLine(measure, effect?.count ?? 0)}</p>
      )}
      {research && <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{research}</p>}
    </div>
  );
}

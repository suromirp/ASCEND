import { useState } from 'react';
import type { StrengthWarmup } from '../data/strengthWarmup';
import { warmupTotalMinutes } from '../data/strengthWarmup';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { SheetHeader } from './SheetHeader';
import { Card, SheetGrip } from './ui';
import { WhyPanel, WhyToggle } from './Why';
import { Icon } from './icons';

// The warm-up of a strength day as its own sheet: three short blocks, the
// warm-up sets as the part that counts most, what to do later in the
// session, and the three-minute version (data/strengthWarmup.ts).

export function WarmupSheet({ title, warmup, onClose }: { title: string; warmup: StrengthWarmup; onClose: () => void }) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  const [why, setWhy] = useState(false);
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef} className={`relative max-h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <SheetGrip />
          <Card className="flex flex-col gap-5 rounded-b-none border-b-0 pb-8">
            <div className="-mt-2"><SheetHeader eyebrow={`Opwarmen · ${warmupTotalMinutes(warmup)} min`} title={title} onClose={requestClose} /></div>

            <ol className="flex flex-col gap-5">
              {warmup.blocks.map((block, bi) => (
                <li key={block.title} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums" style={{ borderColor: 'var(--color-action)', color: 'var(--color-action)' }}>{bi + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{block.title}{block.optional && <span className="font-normal" style={{ color: 'var(--color-ink-dim)' }}> · als je koud bent</span>}</p>
                    {block.hint && <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{block.hint}</p>}
                    <ul className="mt-2 flex flex-col gap-2">
                      {block.steps.map((step) => (
                        <li key={step.name} className="rounded-xl px-3 py-2" style={{ background: 'var(--color-charcoal)' }}>
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="text-sm" style={{ color: 'var(--color-ink)' }}>
                              {step.name}
                              {step.videoUrl && (
                                <a href={step.videoUrl} target="_blank" rel="noopener noreferrer" className="-my-3 ml-1.5 inline-flex min-h-[44px] items-center align-middle text-xs underline underline-offset-2" style={{ color: 'var(--color-action)' }}>video<Icon name="buiten" size={14} className="ml-1" /></a>
                              )}
                            </span>
                            <span className="shrink-0 text-xs tabular-nums" style={{ color: 'var(--color-action)' }}>{step.amount}</span>
                          </div>
                          {step.note && <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{step.note}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ol>

            <div className="flex flex-col gap-2 border-t pt-4 text-xs leading-relaxed" style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink-dim)' }}>
              <p><span style={{ color: 'var(--color-ink)' }}>Daarna. </span>{warmup.later}</p>
              <p><span style={{ color: 'var(--color-ink)' }}>Weinig tijd. </span>{warmup.short}</p>
            </div>

            <div>
              <WhyToggle open={why} onToggle={() => setWhy((v) => !v)} />
              {why && (
                <WhyPanel
                  evidence="matig"
                  sources={[
                    { label: 'Viveiros e.a. 2024, één opwarmset op 80%', url: 'https://pubmed.ncbi.nlm.nih.gov/39593476/' },
                    { label: 'Ribeiro e.a. 2020, opwarmsets voor squat en bankdrukken', url: 'https://pubmed.ncbi.nlm.nih.gov/32971729/' },
                    { label: 'Behm e.a. 2016, rekken voor het trainen', url: 'https://pubmed.ncbi.nlm.nih.gov/26642915/' },
                    { label: 'Andersson e.a. 2017, schouderprogramma', url: 'https://bjsm.bmj.com/content/51/14/1073' },
                  ]}
                >
                  Het meeste effect hebben opwarmsets van je eerste oefening: de laatste op ongeveer 80% voor 3 tot 5 herhalingen gaf in studies meer herhalingen en een snellere eerste set. Rustig cardio voegt bovenop opwarmsets weinig toe, alleen als je koud bent; doe het met de spieren die je gaat gebruiken. Kort dynamisch losmaken kost niets, lang statisch rekken (een minuut of langer) maakt je juist wat zwakker. Dat een warming-up blessures voorkomt bij krachttraining is nooit aangetoond; de schouderoefeningen komen uit een programma dat schouderklachten bij handballers met ongeveer een kwart verminderde.
                </WhyPanel>
              )}
            </div>
          </Card>
        </div>
      </div>
    </Portal>
  );
}

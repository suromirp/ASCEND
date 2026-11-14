// ASCEND: het blad Waarom deze training (het oude Info-blad), richting A van docs/visie/Ontwerp Info-blad.md.
// Alleen wat je wilt begrijpen: waarom, wat het vraagt van je lichaam, en een lijst met Te zwaar, Waar train
// je het best, Deze fase en Achtergrond en bronnen. Wat je doet (stappen, tempo, weer, kleding, plekken)
// staat op het trainingsscherm en in de Briefing; het horloge in Je horloge (docs/beslissingen/2026-11-14-info-blad-a.md).

import { useState } from 'react';
import type { TrainingDayGuide } from '../data/trainingGuide';
import type { SessionTemplate } from '../models/training';
import { buildWorkoutPlan } from '../engine/workoutPlan';
import { useAppData } from '../state/AppDataContext';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { SheetHeader } from './SheetHeader';
import { Card, Eyebrow, SheetGrip } from './ui';
import { SessionHeader } from './SessionHeader';
import { ModalityGuide } from './ModalityPicker';
import { buildSessionBrief } from '../engine/sessionBrief';
import { getModalities } from '../data/modalities';
import { Icon } from './icons';
import { Sheet } from './settings/Sheet';
import { GuideList } from './GuideRow';
import { guideMenu, type GuideRowId, type GuideRowSpec } from '../engine/guideMenu';

const LOAD_WORD = ['geen', 'licht', 'gemiddeld', 'zwaar'];

export function TrainingGuideSheet({
  title,
  guide,
  dayLabel,
  onClose,
  template,
  dateIso,
}: {
  title: string;
  guide: TrainingDayGuide;
  dayLabel: string;
  onClose: () => void;
  template?: SessionTemplate;
  dateIso?: string;
}) {
  const { program, templates } = useAppData();
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  const plan = template ? buildWorkoutPlan(template, dateIso, program) : undefined;
  const brief = template ? buildSessionBrief(template, dateIso, program, { templates }) : undefined;
  // "Te zwaar?" are the guide's own when-to-ease-off sections; the rest is
  // background.
  const easeOff = guide.sections.filter((sec) => /ZWAAR|TE HARD|TE VEEL/i.test(sec.heading));
  const background = guide.sections.filter((sec) => !easeOff.includes(sec));
  const hasModalities = !!template && (getModalities(template.id)?.length ?? 0) > 0;
  // De lijst: elke rij een onderblad (engine/guideMenu.ts).
  const rows = guideMenu({
    plan,
    easeOffCount: easeOff.length,
    modalityCount: hasModalities && template ? (getModalities(template.id)?.length ?? 0) : 0,
    backgroundCount: background.length,
    hasGear: guide.gear.length > 0,
    sourceCount: guide.sources.length,
  });
  const [sub, setSub] = useState<GuideRowId | null>(null);
  const closeSub = () => setSub(null);
  function openRow(row: GuideRowSpec) {
    setSub(row.id);
  }

  return (
    <Portal>
      <div
        className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
        onClick={requestClose}
      >
        <div
          ref={sheetRef}
          className={`relative max-h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <SheetGrip />
        <Card className="rounded-b-none border-b-0 pb-8">
          <div className="-mt-2"><SheetHeader eyebrow={dayLabel} onClose={requestClose} /></div>

          {brief ? (
            <div className="mt-1"><SessionHeader brief={brief} title={title} as="h2" /></div>
          ) : (
            <h2 className="mt-1 font-display text-xl" style={{ color: 'var(--color-ink)' }}>{title}</h2>
          )}

          {plan && plan.builds.length > 0 && (
            <>
              <SectionTitle>Waarom</SectionTitle>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{plan.builds.map((b) => b.why).join(' ')}</p>
            </>
          )}

          {plan && plan.load.some((l) => l.level > 0) && (
            <>
              <SectionTitle>Wat het vraagt van je lichaam</SectionTitle>
              <div className="mt-3 flex flex-col gap-2">
                {plan.load.filter((l) => l.level > 0).map((l) => (
                  <div key={l.label} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-xs" style={{ color: 'var(--color-ink)' }}>{l.label}</span>
                    <div className="flex flex-1 gap-1">
                      {[1, 2, 3].map((n) => (
                        <span key={n} className="h-1.5 flex-1 rounded-full" style={{ background: n <= l.level ? 'var(--color-action)' : 'var(--color-card-border)' }} />
                      ))}
                    </div>
                    <span className="w-16 shrink-0 text-right text-xs" style={{ color: 'var(--color-ink-dim)' }}>{LOAD_WORD[l.level]}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {rows.length > 0 && (
            <div className="mt-6">
              <GuideList rows={rows} onPick={openRow} />
            </div>
          )}

          <button onClick={requestClose} className="mt-6 min-h-[44px] w-full text-center text-xs" style={{ color: 'var(--color-ink-dim)' }}>
            Sluiten
          </button>
        </Card>
        </div>
      </div>
      {sub === 'teZwaar' && (
        <Sheet eyebrow="Uitleg" title="Te zwaar? Zo pas je het aan" onClose={closeSub}>
          <Sections sections={easeOff} />
        </Sheet>
      )}
      {sub === 'varianten' && template && (
        <Sheet eyebrow="Uitleg" title="Waar train je het best?" onClose={closeSub}>
          <ModalityGuide templateId={template.id} />
        </Sheet>
      )}
      {sub === 'weken' && plan && (
        <Sheet eyebrow="Uitleg" title="Deze fase, week voor week" onClose={closeSub}>
          <div className="grid grid-cols-4 gap-1.5">
            {plan.weeks.map((w) => (
              <div
                key={w.week}
                className="rounded-lg border px-1.5 py-2 text-center"
                style={{ borderColor: w.current ? 'var(--color-action)' : 'var(--color-card-border)', background: 'var(--color-charcoal)' }}
              >
                <p className="text-xs" style={{ color: w.current ? 'var(--color-action)' : 'var(--color-ink-dim)' }}>WEEK {w.week}</p>
                <p className="mt-0.5 text-sm tabular-nums" style={{ color: 'var(--color-ink)' }}>{w.minutes}′</p>
                <p className="mt-0.5 text-xs leading-tight" style={{ color: 'var(--color-ink-dim)' }}>{w.note.split(/, | \(/)[0]}</p>
              </div>
            ))}
          </div>
        </Sheet>
      )}
      {sub === 'achtergrond' && (
        <Sheet eyebrow="Uitleg" title="Achtergrond en bronnen" onClose={closeSub}>
          <Sections sections={background} />
          {guide.gear.length > 0 && (
            <div className="mt-4">
              <Eyebrow>Materiaal</Eyebrow>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-ink)' }}>{guide.gear.join(' · ')}</p>
            </div>
          )}
          {guide.sources.length > 0 && (
            <div className="mt-4">
              <Eyebrow>Bronnen</Eyebrow>
              <div className="mt-2 flex flex-col gap-1.5">
                {guide.sources.map((src) =>
                  src.url ? (
                    <a key={src.label} href={src.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center text-xs underline underline-offset-2" style={{ color: 'var(--color-action)' }}>{src.label}<Icon name="buiten" size={14} className="ml-1 inline align-[-2px]" /></a>
                  ) : (
                    <span key={src.label} className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{src.label}</span>
                  ),
                )}
              </div>
            </div>
          )}
        </Sheet>
      )}
    </Portal>
  );
}

function Sections({ sections }: { sections: TrainingDayGuide['sections'] }) {
  return (
    <>
      {sections.map((section) => (
        <div key={section.heading} className="mt-3 first:mt-0">
          <Eyebrow>{section.heading}</Eyebrow>
          {section.body && <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{section.body}</p>}
          {section.items && <BulletList items={section.items} className="mt-1.5" />}
          {section.subsections && (
            <div className="mt-2 flex flex-col gap-3">
              {section.subsections.map((sub) => (
                <div key={sub.heading}>
                  <p className="text-xs font-medium" style={{ color: 'var(--color-action)' }}>{sub.heading}</p>
                  <BulletList items={sub.items} />
                </div>
              ))}
            </div>
          )}
          {section.note && (
            <div className="mt-2 rounded-xl border p-3 text-xs leading-relaxed" style={{ borderColor: 'var(--color-warning)', color: 'var(--color-ink-dim)' }}>
              {section.note}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

function BulletList({ items, className = '' }: { items: string[]; className?: string }) {
  return (
    <ul className={`flex flex-col gap-1.5 ${className}`}>
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm" style={{ color: 'var(--color-ink)' }}>
          <span style={{ color: 'var(--color-action)' }}>·</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <div className="mt-6"><Eyebrow>{children}</Eyebrow></div>;
}

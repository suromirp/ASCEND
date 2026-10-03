// ASCEND — the training guide sheet. Visual first (production feedback:
// "een mooie visuele view, maar wel dezelfde inzichten"): summary, the
// workout as a chart and steps with intensity in plain words, the Garmin
// workout to rebuild, what it loads and builds, the weeks of this phase.
// The full original text stays one tap away under "Meer uitleg".

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TrainingDayGuide } from '../data/trainingGuide';
import type { SessionTemplate } from '../models/training';
import { INTENSITY, type Intensity } from '../data/workoutStructure';
import { buildWorkoutPlan, formatClock, type PlanStep, type WorkoutPlan } from '../engine/workoutPlan';
import { useAppData } from '../state/AppDataContext';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { Card, Eyebrow } from './ui';

const INTENSITY_COLOR: Record<Intensity, string> = {
  1: 'var(--color-stone)',
  2: 'var(--color-sky)',
  3: 'var(--color-bronze)',
  4: 'var(--color-gold)',
};
const INTENSITY_HEIGHT: Record<Intensity, number> = { 1: 30, 2: 50, 3: 72, 4: 100 };
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
  const navigate = useNavigate();
  const { program } = useAppData();
  const { closing, requestClose } = useSheetClose(onClose);
  const plan = template ? buildWorkoutPlan(template, dateIso, program) : undefined;
  const [moreOpen, setMoreOpen] = useState(!plan);

  return (
    <Portal>
      <div
        className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
        onClick={requestClose}
      >
        <div
          className={`max-h-[85vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`}
          onClick={(e) => e.stopPropagation()}
        >
        <Card className="rounded-b-none border-b-0 pb-8">
          <Eyebrow>{dayLabel}</Eyebrow>
          <h3 className="mt-1 font-display text-xl" style={{ color: 'var(--color-ink)' }}>{title}</h3>
          <p className="mt-0.5 text-xs font-medium tracking-wide" style={{ color: 'var(--color-gold)' }}>{guide.subtitle}</p>

          {plan && <PlanView plan={plan} />}

          {plan?.keyTag?.includes('D+') && (
            <button
              onClick={() => { onClose(); navigate('/plekken'); }}
              className="mt-5 flex w-full items-center justify-between rounded-xl border p-3 text-left"
              style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}
            >
              <span>
                <span className="block text-sm" style={{ color: 'var(--color-ink)' }}>Waar kun je dit doen?</span>
                <span className="block text-xs" style={{ color: 'var(--color-ink-dim)' }}>Heuvels, trappen en duinen bij jou in de buurt</span>
              </span>
              <span style={{ color: 'var(--color-gold)' }}>›</span>
            </button>
          )}

          {plan && (
            <button
              onClick={() => setMoreOpen((v) => !v)}
              className="mt-6 flex w-full items-center justify-between border-t pt-4 text-left"
              style={{ borderColor: 'var(--color-card-border)' }}
              aria-expanded={moreOpen}
            >
              <span className="text-xs font-semibold tracking-wide" style={{ color: 'var(--color-ink-dim)' }}>MEER UITLEG</span>
              <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{moreOpen ? 'sluiten' : 'openen'}</span>
            </button>
          )}

          {moreOpen && (<>
          <p className="mt-3 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{guide.registration}</p>

          {guide.sections.map((section) => (
            <div key={section.heading} className="mt-4">
              <p className="text-xs font-semibold tracking-wide" style={{ color: 'var(--color-ink-dim)' }}>{section.heading}</p>
              {section.body && <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{section.body}</p>}
              {section.items && <BulletList items={section.items} className="mt-1.5" />}
              {section.subsections && (
                <div className="mt-2 flex flex-col gap-3">
                  {section.subsections.map((sub) => (
                    <div key={sub.heading}>
                      <p className="text-xs font-medium" style={{ color: 'var(--color-bronze)' }}>{sub.heading}</p>
                      <BulletList items={sub.items} />
                    </div>
                  ))}
                </div>
              )}
              {section.note && (
                <div
                  className="mt-2 rounded-xl border p-3 text-xs leading-relaxed"
                  style={{ borderColor: 'var(--color-warning)', color: 'var(--color-ink-dim)' }}
                >
                  {section.note}
                </div>
              )}
            </div>
          ))}

          {guide.gear.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold tracking-wide" style={{ color: 'var(--color-ink-dim)' }}>MATERIAAL</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-ink)' }}>{guide.gear.join(' · ')}</p>
            </div>
          )}

          {guide.garminNote && (
            <button
              onClick={() => {
                onClose();
                navigate('/garmin');
              }}
              className="mt-4 w-full rounded-xl border p-3 text-left text-xs"
              style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-sky)' }}
            >
              {guide.garminNote} →
            </button>
          )}

          {guide.sources.length > 0 && (
            <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--color-card-border)' }}>
              <p className="text-xs font-semibold tracking-wide" style={{ color: 'var(--color-ink-dim)' }}>BRONNEN</p>
              <div className="mt-2 flex flex-col gap-1.5">
                {guide.sources.map((s) =>
                  s.url ? (
                    <a
                      key={s.label}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs underline underline-offset-2"
                      style={{ color: 'var(--color-sky)' }}
                    >
                      {s.label} ↗
                    </a>
                  ) : (
                    <span key={s.label} className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{s.label}</span>
                  ),
                )}
              </div>
            </div>
          )}

          </>)}

          <button onClick={requestClose} className="mt-6 w-full text-center text-xs" style={{ color: 'var(--color-ink-dim)' }}>
            Sluiten
          </button>
        </Card>
        </div>
      </div>
    </Portal>
  );
}

function BulletList({ items, className = '' }: { items: string[]; className?: string }) {
  return (
    <ul className={`flex flex-col gap-1.5 ${className}`}>
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm" style={{ color: 'var(--color-ink)' }}>
          <span style={{ color: 'var(--color-gold)' }}>·</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <p className="mt-6 text-[11px] font-semibold tracking-[0.18em]" style={{ color: 'var(--color-ink-dim)' }}>{children}</p>;
}

function Dot({ intensity }: { intensity: Intensity }) {
  return <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: INTENSITY_COLOR[intensity] }} />;
}

function minutesText(seconds: number): string {
  return seconds % 60 === 0 ? `${seconds / 60} min` : formatClock(seconds);
}

function StepRow({ step }: { step: PlanStep }) {
  const level = INTENSITY[step.intensity];
  const isStrength = step.kind === 'strength';
  return (
    <div className="flex gap-2.5">
      <Dot intensity={step.intensity} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm" style={{ color: 'var(--color-ink)' }}>{step.label}</span>
          <span className="shrink-0 text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{minutesText(step.seconds)}</span>
        </div>
        <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          {isStrength ? step.detail : `${level.label} · ${level.feel} · ${level.zone}${step.detail ? `. ${step.detail}` : ''}`}
        </p>
      </div>
    </div>
  );
}

function PlanView({ plan }: { plan: WorkoutPlan }) {
  const total = plan.timeline.reduce((sum, s) => sum + s.seconds, 0);
  const peak = Math.max(...plan.timeline.map((s) => s.intensity)) as Intensity;
  const usedLevels = [...new Set(plan.timeline.filter((s) => s.kind !== 'strength').map((s) => s.intensity))].sort() as Intensity[];
  const tags = [`±${plan.totalMinutes} min`, plan.timeline.every((s) => s.kind === 'strength') ? 'Kracht' : INTENSITY[peak].label, plan.keyTag].filter((t): t is string => !!t);

  return (
    <>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{plan.summary}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t} className="rounded-full border px-2.5 py-0.5 text-[11px]" style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink-dim)' }}>{t}</span>
        ))}
      </div>

      <SectionTitle>OPBOUW</SectionTitle>
      {/* A chart only says something when the session has steps; one
          continuous block is just the step below. */}
      {plan.timeline.length > 1 && (
      <div className="mt-3 rounded-xl border p-3" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}>
        <div className="flex h-16 items-end gap-[2px]" role="img" aria-label={`Opbouw van de training, ${plan.totalMinutes} minuten`}>
          {plan.timeline.map((step, i) => (
            <div
              key={i}
              className="rounded-[3px]"
              style={{ flexGrow: step.seconds, flexBasis: 0, height: `${INTENSITY_HEIGHT[step.intensity]}%`, background: INTENSITY_COLOR[step.intensity], opacity: step.kind === 'strength' ? 0.55 : 0.9 }}
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
          <span>0</span>
          <span>{Math.round(total / 60)} min</span>
        </div>
        {usedLevels.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {usedLevels.map((lvl) => (
              <span key={lvl} className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--color-ink-dim)' }}>
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: INTENSITY_COLOR[lvl] }} />
                {INTENSITY[lvl].label} ({INTENSITY[lvl].rpe})
              </span>
            ))}
          </div>
        )}
      </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {plan.items.map((item, i) =>
          'step' in item ? (
            <StepRow key={i} step={item.step} />
          ) : (
            <div key={i} className="rounded-xl border-l-2 py-1 pl-3" style={{ borderColor: 'var(--color-bronze)' }}>
              <p className="text-xs font-semibold tracking-wide" style={{ color: 'var(--color-bronze)' }}>{item.repeat}× HERHALEN</p>
              <div className="mt-2 flex flex-col gap-3">
                {item.steps.map((step, j) => <StepRow key={j} step={step} />)}
              </div>
            </div>
          ),
        )}
      </div>

      {plan.garmin && (
        <>
          <SectionTitle>IN JE GARMIN</SectionTitle>
          <div className="mt-3 rounded-xl border p-3" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
              Maak in Garmin Connect een nieuwe workout van het type {plan.garmin.sport}, met deze stappen. Stuur hem naar je horloge en start hem als je begint.
            </p>
            <div className="mt-2.5 flex flex-col gap-1">
              {plan.garmin.lines.map((line, i) => (
                <p key={i} className="whitespace-pre text-xs tabular-nums" style={{ color: line.startsWith('Herhaal') ? 'var(--color-bronze)' : 'var(--color-ink)' }}>{line}</p>
              ))}
            </div>
          </div>
        </>
      )}

      <SectionTitle>WAT HET BELAST</SectionTitle>
      <div className="mt-3 flex flex-col gap-2">
        {plan.load.map((l) => (
          <div key={l.label} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-xs" style={{ color: 'var(--color-ink)' }}>{l.label}</span>
            <div className="flex flex-1 gap-1">
              {[1, 2, 3].map((n) => (
                <span key={n} className="h-1.5 flex-1 rounded-full" style={{ background: n <= l.level ? 'var(--color-gold)' : 'var(--color-card-border)' }} />
              ))}
            </div>
            <span className="w-16 shrink-0 text-right text-[11px]" style={{ color: 'var(--color-ink-dim)' }}>{LOAD_WORD[l.level]}</span>
          </div>
        ))}
      </div>

      <SectionTitle>BOUWT AAN</SectionTitle>
      <div className="mt-3 flex flex-col gap-2.5">
        {plan.builds.map((b) => (
          <div key={b.label}>
            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ background: 'var(--color-charcoal)', color: 'var(--color-gold)' }}>{b.label}</span>
            <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{b.why}</p>
          </div>
        ))}
      </div>

      {plan.weeks.length > 0 && (
        <>
          <SectionTitle>DEZE FASE</SectionTitle>
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {plan.weeks.map((w) => (
              <div
                key={w.week}
                className="rounded-lg border px-1.5 py-2 text-center"
                style={{ borderColor: w.current ? 'var(--color-gold)' : 'var(--color-card-border)', background: 'var(--color-charcoal)' }}
              >
                <p className="text-[10px] tracking-wide" style={{ color: w.current ? 'var(--color-gold)' : 'var(--color-ink-dim)' }}>WEEK {w.week}</p>
                <p className="mt-0.5 text-sm tabular-nums" style={{ color: 'var(--color-ink)' }}>{w.minutes}′</p>
                <p className="mt-0.5 text-[10px] leading-tight" style={{ color: 'var(--color-ink-dim)' }}>{w.note.split(/ — | \(/)[0]}</p>
              </div>
            ))}
          </div>
          {plan.weeks.find((w) => w.current)?.note.includes('—') && (
            <p className="mt-2 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Deze week: {plan.weeks.find((w) => w.current)!.note.split(' — ').slice(1).join(' — ')}</p>
          )}
        </>
      )}
    </>
  );
}

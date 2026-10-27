import { useState } from 'react';
import type { DayOrderAdvice } from '../engine/dayOrder';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { Card, Eyebrow } from './ui';
import { WhyPanel, WhyToggle } from './Why';

// Two trainings on one day: the order as a small climb, 1 then 2, with the
// time between them on the line (engine/dayOrder.ts). A tip, never a block.

const TYPE_COLOR: Record<string, string> = { strength: 'var(--color-ink-dim)', cardio: 'var(--color-sage)', hiking: 'var(--color-status)', adventure: 'var(--color-status)', recovery: 'var(--color-ink-dim)' };

export function DayOrderCard({ advice, sessions, templateById, title = 'Volgorde vandaag' }: { advice: DayOrderAdvice; sessions: PlannedSession[]; templateById: Map<string, SessionTemplate>; title?: string }) {
  const [open, setOpen] = useState(false);
  const ordered = advice.order.map((id) => sessions.find((s) => s.id === id)).filter((s): s is PlannedSession => !!s);
  const accent = advice.avoid ? 'var(--color-warning)' : 'var(--color-action)';
  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow tone={advice.avoid ? 'var(--color-warning)' : undefined}>{advice.avoid ? 'Beter niet op één dag' : title}</Eyebrow>

      <ol className="flex flex-col">
        {ordered.map((s, i) => {
          const t = templateById.get(s.templateId);
          const last = i === ordered.length - 1;
          return (
            <li key={s.id} className="flex gap-3">
              <div className="flex w-7 shrink-0 flex-col items-center">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border font-sans text-sm tabular-nums" style={{ borderColor: accent, color: i === 0 ? 'var(--color-bg)' : accent, background: i === 0 ? accent : 'transparent' }}>{i + 1}</span>
                {!last && <span className="my-1 w-px flex-1" style={{ minHeight: 22, background: `linear-gradient(${accent}, var(--color-card-border))` }} aria-hidden />}
              </div>
              <div className={`min-w-0 flex-1 ${last ? '' : 'pb-1'}`}>
                <p className="flex items-center gap-2 pt-1 text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: TYPE_COLOR[t?.type ?? 'cardio'] }} aria-hidden />
                  {t?.name ?? 'Training'}
                </p>
                {!last && i === 0 && advice.gapHours && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>liefst {advice.gapHours} uur ertussen{advice.minGapHours ? `, minstens ${advice.minGapHours}` : ''}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
        <span style={{ color: 'var(--color-ink)' }}>{advice.headline}. </span>{advice.reason}
        {advice.minGapHours && ' Voel je je eerder fit, dan kan het eerder.'}
      </p>

      <WhyToggle open={open} onToggle={() => setOpen((v) => !v)} className="-my-1 self-start" />
      {open && <WhyPanel accent={accent} evidence={advice.evidence} sources={advice.sources} className="-mt-1">{advice.why}</WhyPanel>}
    </Card>
  );
}

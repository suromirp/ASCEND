import { useState } from 'react';
import type { DayOrderAdvice } from '../engine/dayOrder';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { Card } from './ui';

// Two trainings on one day: the order as a small climb, 1 then 2, with the
// time between them on the line (engine/dayOrder.ts). A tip, never a block.

const EVIDENCE_LABEL: Record<DayOrderAdvice['evidence'], string> = {
  sterk: 'sterk bewijs', matig: 'matig bewijs', zwak: 'zwak bewijs', expertopinie: 'expertopinie', afgeleid: 'afgeleid uit onderzoek',
};
const TYPE_COLOR: Record<string, string> = { strength: 'var(--color-stone)', cardio: 'var(--color-alpine)', hiking: 'var(--color-sky)', adventure: 'var(--color-sky)', recovery: 'var(--color-ink-dim)' };

export function DayOrderCard({ advice, sessions, templateById, title = 'VOLGORDE VANDAAG' }: { advice: DayOrderAdvice; sessions: PlannedSession[]; templateById: Map<string, SessionTemplate>; title?: string }) {
  const [open, setOpen] = useState(false);
  const ordered = advice.order.map((id) => sessions.find((s) => s.id === id)).filter((s): s is PlannedSession => !!s);
  const accent = advice.avoid ? 'var(--color-warning)' : 'var(--color-gold)';
  return (
    <Card className="flex flex-col gap-3">
      <p className="text-[10px] font-medium tracking-[0.18em]" style={{ color: advice.avoid ? 'var(--color-warning)' : 'var(--color-bronze)' }}>{advice.avoid ? 'LIEVER NIET OP ÉÉN DAG' : title}</p>

      <ol className="flex flex-col">
        {ordered.map((s, i) => {
          const t = templateById.get(s.templateId);
          const last = i === ordered.length - 1;
          return (
            <li key={s.id} className="flex gap-3">
              <div className="flex w-7 shrink-0 flex-col items-center">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border font-display text-sm tabular-nums" style={{ borderColor: accent, color: i === 0 ? 'var(--color-bg)' : accent, background: i === 0 ? accent : 'transparent' }}>{i + 1}</span>
                {!last && <span className="my-1 w-px flex-1" style={{ minHeight: 22, background: `linear-gradient(${accent}, var(--color-card-border))` }} aria-hidden />}
              </div>
              <div className={`min-w-0 flex-1 ${last ? '' : 'pb-1'}`}>
                <p className="flex items-center gap-2 pt-1 text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: TYPE_COLOR[t?.type ?? 'cardio'] }} aria-hidden />
                  {t?.name ?? 'Training'}
                </p>
                {!last && i === 0 && advice.gapHours && (
                  <p className="mt-1 text-[11px] tracking-wide" style={{ color: 'var(--color-ink-dim)' }}>minstens {advice.gapHours} uur ertussen</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
        <span style={{ color: 'var(--color-ink)' }}>{advice.headline}. </span>{advice.reason}
      </p>

      <button onClick={() => setOpen((v) => !v)} className="self-start text-[11px] underline underline-offset-2" style={{ color: 'var(--color-ink-dim)' }} aria-expanded={open}>
        {open ? 'minder' : 'waarom?'}
      </button>
      {open && (
        <div className="-mt-1 flex flex-col gap-1.5 rounded-lg border-l-2 py-2 pl-3 pr-2 text-xs leading-relaxed" style={{ borderColor: accent, background: 'var(--color-charcoal)', color: 'var(--color-ink-dim)' }}>
          <p>{advice.why}</p>
          <p style={{ color: 'var(--color-ink)' }}>{EVIDENCE_LABEL[advice.evidence]}</p>
          {advice.sources.map((src) => (
            <a key={src.url} href={src.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: 'var(--color-sky)' }}>{src.label} ↗</a>
          ))}
        </div>
      )}
    </Card>
  );
}

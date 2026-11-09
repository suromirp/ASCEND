import type { SkillReadiness } from '../../engine/goalReadinessFor';
import { formatDayMonthNL } from '../../utils/dates';
import { Icon } from '../icons';
import { Card, Eyebrow, StatusPill } from '../ui';
import { TextButton } from '../TextButton';

// Een vaardigheid op de Ascend-tab (docs/beslissingen/2026-11-09-calisthenics-vaardigheidsdoel.md): de ladder als
// trap van stap 1 tot de doelstap, net als de mijlpalen van een tocht. Het werk (de stap waar je nu op traint en de
// toets) en één droge regel; geen percentage en geen oordeel over het doel. Alles komt uit
// engine/goalReadinessFor.ts#skillReadinessFor. IJsblauw voor wat gehaald is (status), geen mint: het ene mint
// accent van de tab blijft waar het was. Verschijnt met mx-row-in: in Rustig en Uit meteen op de eindstand.

const MARK = { cleared: 'vinkje', current: 'vandaagStip', ahead: 'gepland' } as const;

export function SkillGoalCard({ name, readiness, onRemove }: { name: string; readiness: SkillReadiness; onRemove: () => void }) {
  const dim = { color: 'var(--color-ink-dim)' };
  return (
    <Card className="mx-row-in flex flex-col gap-3" aria-label={`Vaardigheid ${name}`}>
      <div>
        <Eyebrow>Vaardigheid · {readiness.ladderName}</Eyebrow>
        <h2 className="mt-1 font-display text-xl leading-snug" style={{ color: 'var(--color-ink)' }}>{name}</h2>
      </div>

      <ol className="flex flex-col" aria-label={`Ladder ${readiness.ladderName}`}>
        {readiness.steps.map((s, i) => {
          const color = s.status === 'cleared' ? 'var(--color-progress)' : s.status === 'current' ? 'var(--color-ink)' : 'var(--color-ink-dim)';
          return (
            <li key={s.step} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="mt-2.5 flex h-7 w-7 items-center justify-center rounded-full border" style={{ borderColor: color, color }}>
                  <Icon name={MARK[s.status]} size={16} />
                </span>
                {i < readiness.steps.length - 1 && <span className="mt-1 w-px flex-1" style={{ background: 'var(--color-card-border)', minHeight: '8px' }} />}
              </div>
              <div className="flex min-h-[44px] min-w-0 flex-1 flex-col justify-center py-1.5">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm tabular-nums" style={{ color: s.status === 'ahead' ? 'var(--color-ink-dim)' : 'var(--color-ink)' }}>
                    {s.step}. {s.name}
                  </span>
                  {s.target && <StatusPill tone="neutral">Doelstap</StatusPill>}
                </span>
                {s.status === 'cleared' && s.clearedDate && <span className="text-xs tabular-nums" style={dim}>gehaald op {formatDayMonthNL(s.clearedDate)}</span>}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-1">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{readiness.work}</p>
        <p className="text-sm leading-relaxed" style={dim}>{readiness.line}</p>
      </div>

      <div className="-mb-2 flex justify-end">
        <TextButton tone="dim" onClick={onRemove}>Weghalen</TextButton>
      </div>
    </Card>
  );
}

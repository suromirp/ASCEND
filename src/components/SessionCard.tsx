import type { PlannedSession, SessionTemplate, SessionLog } from '../models/training';
import { deriveSessionStatus } from '../engine/sessionStatus';
import { StatusDot } from './ui';

const TYPE_LABEL: Record<SessionTemplate['type'], string> = {
  strength: 'Kracht',
  cardio: 'Cardio',
  hiking: 'Avontuur',
  recovery: 'Herstel',
  adventure: 'Avontuur',
};

export function SessionCard({
  session,
  template,
  logs,
  onTap,
}: {
  session: PlannedSession;
  template: SessionTemplate;
  logs: SessionLog[];
  onTap?: () => void;
}) {
  const { status, wasMoved } = deriveSessionStatus(session, logs);
  const dim = status === 'skipped';

  return (
    <button
      onClick={onTap}
      className="flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors active:opacity-75"
      style={{
        background: 'var(--color-surface)',
        borderColor: status === 'today' ? 'var(--color-gold)' : 'var(--color-card-border)',
        opacity: dim ? 0.5 : 1,
      }}
    >
      <StatusDot status={status} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
          {template.name}
          {wasMoved && status !== 'completed' && (
            <span className="ml-2 text-[10px] font-normal" style={{ color: 'var(--color-sky)' }}>verplaatst</span>
          )}
        </div>
        <div className="truncate text-xs" style={{ color: 'var(--color-ink-dim)' }}>
          {TYPE_LABEL[template.type]}
          {template.focus ? ` • ${template.focus}` : ''}
        </div>
      </div>
      <div className="shrink-0 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
        {template.durationVariants.full} min
      </div>
    </button>
  );
}

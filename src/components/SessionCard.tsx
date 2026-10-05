import type { PlannedSession, SessionTemplate, SessionLog } from '../models/training';
import type { Program } from '../models/program';
import { deriveSessionStatus } from '../engine/sessionStatus';
import { resolveEffectiveFullDuration } from '../engine/substitutions';
import { StatusDot } from './ui';
import { sessionKindLabel } from '../engine/sports';
import { todayISO } from '../utils/dates';


export function SessionCard({
  session,
  template,
  logs,
  program,
  onTap,
  adjusted = false,
}: {
  session: PlannedSession;
  template: SessionTemplate;
  logs: SessionLog[];
  program?: Program | null;
  onTap?: () => void;
  // Fase 3 — ASCEND changed this session recently (engine/changeLog.ts);
  // the why lives in the Week page's "door ASCEND aangepast" line.
  adjusted?: boolean;
}) {
  const isRest = template.type === 'recovery';
  const { status, wasMoved } = deriveSessionStatus(session, logs, isRest);
  const isToday = session.scheduledDate === todayISO();
  const dim = status === 'skipped' || status === 'missed';
  const duration = resolveEffectiveFullDuration(template, session.scheduledDate, program);

  return (
    <button
      onClick={onTap}
      className="flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all active:scale-[0.98] active:opacity-75"
      style={{
        background: 'var(--color-surface)',
        borderColor: status === 'today' || (isRest && isToday) ? 'var(--color-gold)' : 'var(--color-card-border)',
        opacity: dim ? 0.5 : 1,
      }}
    >
      <StatusDot status={status} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
          {template.name}
          {adjusted && status !== 'completed' ? (
            <span className="ml-2 text-[10px] font-normal" style={{ color: 'var(--color-sky)' }}>aangepast</span>
          ) : wasMoved && status !== 'completed' && (
            <span className="ml-2 text-[10px] font-normal" style={{ color: 'var(--color-sky)' }}>verplaatst</span>
          )}
        </div>
        <div className="truncate text-xs" style={{ color: 'var(--color-ink-dim)' }}>
          {sessionKindLabel(template)}
          {template.focus ? ` • ${template.focus}` : ''}
        </div>
      </div>
      <div className="shrink-0 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
        {isRest && status !== 'completed' ? 'rustdag' : `${duration} min`}
      </div>
    </button>
  );
}

import type { SessionLog, SessionTemplate } from '../models/training';
import { Icon, type IconName } from './icons';
import { SPORT_COLOR, sportIcon, sportKind } from './sportKind';
import { SPORT_LOOK, sportKeyOfLog } from './logbook/sportLook';

// Het pictogram van de sport in een getinte schijf.
export function SportDisc({ template, size = 44, className = '' }: { template: SessionTemplate; size?: number; className?: string }) {
  const kind = sportKind(template);
  const color = SPORT_COLOR[kind];
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${className}`}
      style={{ width: size, height: size, background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
    >
      {kind === 'rest' ? <Icon name="ontspannen" size={Math.round(size * 0.46)} /> : <Icon name={sportIcon(template)} size={Math.round(size * 0.46)} />}
    </span>
  );
}

// De schijf van een log die geen geplande training heeft (een losse training op
// Week): de sport zoals het Logboek hem laat zien, een rustdag het maantje.
export function LogDisc({ log, size = 44 }: { log: Pick<SessionLog, 'type' | 'sport' | 'cardioData' | 'outdoorData'>; size?: number }) {
  if (log.type === 'recovery') return <IconDisc icon="maan" size={size} tone="status" />;
  const look = SPORT_LOOK[sportKeyOfLog(log)];
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, background: `color-mix(in srgb, ${look.color} 18%, transparent)`, color: look.color }}
    >
      <Icon name={look.icon} size={Math.round(size * 0.46)} />
    </span>
  );
}

// Een schijf met een eigen pictogram (een regel van "Je dag").
export function IconDisc({ icon, size = 40, tone = 'neutral' }: { icon: IconName | 'maan'; size?: number; tone?: 'neutral' | 'status' | 'progress' }) {
  const color = tone === 'status' ? 'var(--color-status)' : tone === 'progress' ? 'var(--color-progress)' : 'var(--color-ink-dim)';
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
    >
      {icon === 'maan' ? <Icon name="ontspannen" size={Math.round(size * 0.46)} /> : <Icon name={icon} size={Math.round(size * 0.46)} />}
    </span>
  );
}

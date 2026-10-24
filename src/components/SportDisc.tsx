import type { SessionLog, SessionTemplate } from '../models/training';
import { Icon, type IconName } from './icons';
import { Pictogram } from './pictograms';
import { SPORT_COLOR, sportKind, sportPictogram } from './sportKind';
import { SPORT_LOOK, sportKeyOfLog } from './logbook/sportLook';

// Het pictogram van de sport in een getinte schijf (stijl C, pictograms.tsx).
// `done` zet er een klein mint vinkje bij, zoals in de weekstrook.
export function SportDisc({ template, size = 44, done = false, className = '' }: { template: SessionTemplate; size?: number; done?: boolean; className?: string }) {
  const color = SPORT_COLOR[sportKind(template)];
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full ${className}`}
      style={{ width: size, height: size, background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
    >
      <Pictogram name={sportPictogram(template)} size={Math.round(size * 0.58)} />
      {done && (
        <span
          className="absolute flex items-center justify-center rounded-full"
          style={{ width: 14, height: 14, right: -2, bottom: -2, background: 'var(--color-action-fill)', color: 'var(--color-on-action)', boxShadow: '0 0 0 1px var(--color-action)' }}
        >
          <Icon name="vinkje" size={10} strokeWidth={3.4} />
        </span>
      )}
    </span>
  );
}

// De schijf van een log die geen geplande training heeft (een losse training op
// Week): de sport zoals het Logboek hem laat zien, een rustdag het rustende poppetje.
export function LogDisc({ log, size = 44 }: { log: Pick<SessionLog, 'type' | 'sport' | 'cardioData' | 'outdoorData'> & { templateId?: string }; size?: number }) {
  if (log.type === 'recovery') return <IconDisc icon="maan" size={size} tone="status" />;
  const look = SPORT_LOOK[sportKeyOfLog(log)];
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, background: `color-mix(in srgb, ${look.color} 18%, transparent)`, color: look.color }}
    >
      <Pictogram name={look.icon} size={Math.round(size * 0.58)} />
    </span>
  );
}

// Een schijf met een eigen pictogram (een regel van "Je dag"). 'maan' is de rustdag.
export function IconDisc({ icon, size = 40, tone = 'neutral' }: { icon: IconName | 'maan'; size?: number; tone?: 'neutral' | 'status' | 'progress' }) {
  const color = tone === 'status' ? 'var(--color-status)' : tone === 'progress' ? 'var(--color-progress)' : 'var(--color-ink-dim)';
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
    >
      {icon === 'maan' ? (
        <Pictogram name="rust" size={Math.round(size * 0.58)} />
      ) : icon === 'rekken' ? (
        <Pictogram name="rekken" size={Math.round(size * 0.58)} />
      ) : (
        <Icon name={icon} size={Math.round(size * 0.46)} />
      )}
    </span>
  );
}

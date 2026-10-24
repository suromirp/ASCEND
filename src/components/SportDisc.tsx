import type { SessionTemplate } from '../models/training';
import { Icon, type IconName } from './icons';
import { SPORT_COLOR, sportIcon, sportKind } from './sportKind';
import { MoonGlyph } from './vandaag/glyphs';

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
      {kind === 'rest' ? <MoonGlyph size={Math.round(size * 0.46)} /> : <Icon name={sportIcon(template)} size={Math.round(size * 0.46)} />}
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
      {icon === 'maan' ? <MoonGlyph size={Math.round(size * 0.46)} /> : <Icon name={icon} size={Math.round(size * 0.46)} />}
    </span>
  );
}

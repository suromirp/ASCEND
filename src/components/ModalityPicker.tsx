import { getModalities, ROLE_LABEL, type ModalityDefinition } from '../data/modalities';
import { Icon } from './icons';

const ROLE_COLOR: Record<ModalityDefinition['role'], string> = {
  PRIMARY: 'var(--color-action)',
  EQUIVALENT: 'var(--color-sage)',
  CROSS_TRAINING: 'var(--color-status)',
  FALLBACK: 'var(--color-warning)',
  LATER_PHASE: 'var(--color-ink-dim)',
};

// "Waar train je het best?" on the info screen: every option with how,
// why, when it's less suited, Garmin and sources.
export function ModalityGuide({ templateId }: { templateId: string }) {
  const modalities = getModalities(templateId) ?? [];
  return (
    <div className="flex flex-col gap-4">
      {modalities.map((m) => (
        <div key={m.key}>
          <p className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{m.label}</span>
            <span className="shrink-0 text-xs" style={{ color: ROLE_COLOR[m.role] }}>{ROLE_LABEL[m.role]}</span>
          </p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-ink)' }}>{m.how}</p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{m.why}</p>
          {m.whenNotIdeal && m.whenNotIdeal.length > 0 && (
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>Minder geschikt als: {m.whenNotIdeal.join('; ')}.</p>
          )}
          {m.garminNote && <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{m.garminProfile ? `Garmin: ${m.garminProfile}. ` : ''}{m.garminNote}</p>}
          {m.sources && m.sources.length > 0 && (
            <div className="mt-1 flex flex-col gap-1">
              {m.sources.map((s) => s.url
                ? <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center text-xs underline underline-offset-2" style={{ color: 'var(--color-action)' }}>{s.label}<Icon name="buiten" size={14} className="ml-1 inline align-[-2px]" /></a>
                : <span key={s.label} className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{s.label}</span>)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

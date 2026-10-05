import { getModalities, modalitySport, ROLE_LABEL, type ModalityDefinition } from '../data/modalities';
import { isSportEnabled, type EnabledSports } from '../engine/sports';

const ROLE_COLOR: Record<ModalityDefinition['role'], string> = {
  PRIMARY: 'var(--color-gold)',
  EQUIVALENT: 'var(--color-alpine)',
  CROSS_TRAINING: 'var(--color-sky)',
  FALLBACK: 'var(--color-warning)',
  LATER_PHASE: 'var(--color-ink-dim)',
};

// The options a user can pick here: a sport switched off in Settings is
// left out, unless it is already the selected one.
function visibleModalities(templateId: string, selectedKey: string | undefined, enabledSports?: Partial<EnabledSports>): ModalityDefinition[] {
  return (getModalities(templateId) ?? []).filter((m) => m.key === selectedKey || isSportEnabled(modalitySport(m.key), enabledSports));
}

// "Waar train je?" on the training screen: one large button per option,
// the sport and place in its name and a plain label for how good a choice
// it is. How to do the chosen option sits right under it; the background
// per option (why, when it's less suited) is on the info screen.
export function ModalityPicker({
  templateId,
  selectedKey,
  onSelect,
  enabledSports,
}: {
  templateId: string;
  selectedKey?: string;
  onSelect: (key: string) => void;
  enabledSports?: Partial<EnabledSports>;
}) {
  const modalities = visibleModalities(templateId, selectedKey, enabledSports);
  if (modalities.length === 0) return null;
  const selected = modalities.find((m) => m.key === selectedKey);

  return (
    <div className="flex flex-col gap-2" role="radiogroup" aria-label="Waar train je?">
      {modalities.map((m) => {
        const active = selectedKey === m.key;
        return (
          <button
            key={m.key}
            role="radio"
            aria-checked={active}
            onClick={() => !m.locked && onSelect(m.key)}
            disabled={m.locked}
            className="flex min-h-[48px] items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left disabled:opacity-40"
            style={{ borderColor: active ? 'var(--color-gold)' : 'var(--color-card-border)', background: 'var(--color-charcoal)' }}
          >
            <span className="text-sm" style={{ color: 'var(--color-ink)' }}>{m.label}</span>
            <span className="shrink-0 text-[11px]" style={{ color: ROLE_COLOR[m.role] }}>{ROLE_LABEL[m.role]}</span>
          </button>
        );
      })}
      {selected && <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{selected.how}</p>}
    </div>
  );
}

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
            <span className="shrink-0 text-[11px]" style={{ color: ROLE_COLOR[m.role] }}>{ROLE_LABEL[m.role]}</span>
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
                ? <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs underline underline-offset-2" style={{ color: 'var(--color-sky)' }}>{s.label} ↗</a>
                : <span key={s.label} className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{s.label}</span>)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

import { getModalities, ROLE_LABEL, type ModalityDefinition } from '../data/modalities';
import { Card } from './ui';

const ROLE_COLOR: Record<ModalityDefinition['role'], string> = {
  PRIMARY: 'var(--color-gold)',
  EQUIVALENT: 'var(--color-alpine)',
  CROSS_TRAINING: 'var(--color-sky)',
  FALLBACK: 'var(--color-warning)',
  LATER_PHASE: 'var(--color-ink-dim)',
};

export function ModalityPicker({
  templateId,
  selectedKey,
  onSelect,
}: {
  templateId: string;
  selectedKey?: string;
  onSelect: (key: string) => void;
}) {
  const modalities = getModalities(templateId);
  if (!modalities) return null;
  const selected = modalities.find((m) => m.key === selectedKey);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Hoe train je vandaag?</label>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {modalities.map((m) => (
            <button
              key={m.key}
              onClick={() => !m.locked && onSelect(m.key)}
              disabled={m.locked}
              className="rounded-lg border px-2.5 py-1.5 text-left text-xs disabled:opacity-40"
              style={{
                borderColor: selectedKey === m.key ? 'var(--color-gold)' : 'var(--color-card-border)',
                color: selectedKey === m.key ? 'var(--color-gold)' : 'var(--color-ink)',
              }}
            >
              <span className="font-medium">{m.label}</span>
              <span className="ml-1.5" style={{ color: ROLE_COLOR[m.role] }}>{ROLE_LABEL[m.role]}</span>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <Card className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-wide" style={{ color: ROLE_COLOR[selected.role] }}>
            {ROLE_LABEL[selected.role].toUpperCase()}{selected.durationHint ? ` · ${selected.durationHint}` : ''}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{selected.how}</p>
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{selected.why}</p>
          {selected.whenNotIdeal && selected.whenNotIdeal.length > 0 && (
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--color-bronze)' }}>Minder geschikt bij</p>
              <ul className="mt-1 flex flex-col gap-1">
                {selected.whenNotIdeal.map((item) => (
                  <li key={item} className="flex gap-2 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                    <span style={{ color: 'var(--color-gold)' }}>·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {selected.garminNote && (
            <div
              className="rounded-xl border p-2.5 text-xs leading-relaxed"
              style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink-dim)' }}
            >
              {selected.garminProfile && <span className="font-medium" style={{ color: 'var(--color-ink)' }}>Garmin: {selected.garminProfile}. </span>}
              {selected.garminNote}
            </div>
          )}
          {selected.sources && selected.sources.length > 0 && (
            <div className="flex flex-col gap-1 border-t pt-2" style={{ borderColor: 'var(--color-card-border)' }}>
              {selected.sources.map((s) =>
                s.url ? (
                  <a
                    key={s.label}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs underline underline-offset-2"
                    style={{ color: 'var(--color-sky)' }}
                  >
                    {s.label} ↗
                  </a>
                ) : (
                  <span key={s.label} className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{s.label}</span>
                ),
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

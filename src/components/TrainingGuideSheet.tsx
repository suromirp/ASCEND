import { useNavigate } from 'react-router-dom';
import type { TrainingDayGuide } from '../data/trainingGuide';
import { Card, Eyebrow } from './ui';

export function TrainingGuideSheet({
  title,
  guide,
  onClose,
}: {
  title: string;
  guide: TrainingDayGuide;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <Card className="rounded-b-none border-b-0 pb-8">
          <Eyebrow>{guide.dayLabel}</Eyebrow>
          <h3 className="mt-1 font-display text-xl" style={{ color: 'var(--color-ink)' }}>{title}</h3>
          <p className="mt-0.5 text-xs font-medium tracking-wide" style={{ color: 'var(--color-gold)' }}>{guide.subtitle}</p>
          <p className="mt-2 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{guide.registration}</p>

          {guide.sections.map((section) => (
            <div key={section.heading} className="mt-4">
              <p className="text-xs font-semibold tracking-wide" style={{ color: 'var(--color-ink-dim)' }}>{section.heading}</p>
              {section.body && <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{section.body}</p>}
              {section.items && <BulletList items={section.items} className="mt-1.5" />}
              {section.subsections && (
                <div className="mt-2 flex flex-col gap-3">
                  {section.subsections.map((sub) => (
                    <div key={sub.heading}>
                      <p className="text-xs font-medium" style={{ color: 'var(--color-bronze)' }}>{sub.heading}</p>
                      <BulletList items={sub.items} />
                    </div>
                  ))}
                </div>
              )}
              {section.note && (
                <div
                  className="mt-2 rounded-xl border p-3 text-xs leading-relaxed"
                  style={{ borderColor: 'var(--color-warning)', color: 'var(--color-ink-dim)' }}
                >
                  {section.note}
                </div>
              )}
            </div>
          ))}

          {guide.gear.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold tracking-wide" style={{ color: 'var(--color-ink-dim)' }}>MATERIAAL</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-ink)' }}>{guide.gear.join(' · ')}</p>
            </div>
          )}

          {guide.garminNote && (
            <button
              onClick={() => {
                onClose();
                navigate('/garmin');
              }}
              className="mt-4 w-full rounded-xl border p-3 text-left text-xs"
              style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-sky)' }}
            >
              {guide.garminNote} →
            </button>
          )}

          {guide.sources.length > 0 && (
            <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--color-card-border)' }}>
              <p className="text-xs font-semibold tracking-wide" style={{ color: 'var(--color-ink-dim)' }}>BRONNEN</p>
              <div className="mt-2 flex flex-col gap-1.5">
                {guide.sources.map((s) =>
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
            </div>
          )}

          <button onClick={onClose} className="mt-6 w-full text-center text-xs" style={{ color: 'var(--color-ink-dim)' }}>
            Sluiten
          </button>
        </Card>
      </div>
    </div>
  );
}

function BulletList({ items, className = '' }: { items: string[]; className?: string }) {
  return (
    <ul className={`flex flex-col gap-1.5 ${className}`}>
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm" style={{ color: 'var(--color-ink)' }}>
          <span style={{ color: 'var(--color-gold)' }}>·</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

import type { ReactNode } from 'react';
import type { MilestoneDetail } from '../data/gr5Details';
import { useSheetClose } from '../utils/useSheetClose';
import { Card, Eyebrow } from './ui';

export function MilestoneDetailSheet({
  title,
  detail,
  onClose,
}: {
  title: string;
  detail: MilestoneDetail;
  onClose: () => void;
}) {
  const { closing, requestClose } = useSheetClose(onClose);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
      onClick={requestClose}
    >
      <div
        className={`max-h-[85vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="rounded-b-none border-b-0 pb-8">
          <Eyebrow>{detail.type}</Eyebrow>
          <h3 className="mt-1 font-display text-xl" style={{ color: 'var(--color-ink)' }}>{title}</h3>
          <p className="mt-0.5 text-xs font-medium tracking-wide" style={{ color: 'var(--color-gold)' }}>{detail.subtitle}</p>

          <Section heading="DOEL">{detail.goal}</Section>
          <Section heading="WAAROM">{detail.why}</Section>

          {detail.note && (
            <div
              className="mt-4 rounded-xl border p-3 text-xs leading-relaxed"
              style={{ borderColor: 'var(--color-warning)', color: 'var(--color-ink-dim)' }}
            >
              {detail.note}
            </div>
          )}

          {detail.achievedWhen && (
            <div className="mt-4">
              <p className="text-xs font-semibold tracking-wide" style={{ color: 'var(--color-ink-dim)' }}>BEHAALD WANNEER</p>
              <BulletList items={detail.achievedWhen} />
            </div>
          )}

          {detail.achievedWhenGroups && (
            <div className="mt-4 flex flex-col gap-3">
              <p className="text-xs font-semibold tracking-wide" style={{ color: 'var(--color-ink-dim)' }}>BEHAALD WANNEER</p>
              {detail.achievedWhenGroups.map((g) => (
                <div key={g.heading}>
                  <p className="text-xs font-medium" style={{ color: 'var(--color-bronze)' }}>{g.heading}</p>
                  <BulletList items={g.items} />
                </div>
              ))}
            </div>
          )}

          {detail.data && <Section heading="DATA OM BIJ TE HOUDEN">{detail.data.join(' · ')}</Section>}

          {detail.preparation && <Section heading="OPBOUW">{detail.preparation}</Section>}

          {detail.sources.length > 0 && (
            <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--color-card-border)' }}>
              <p className="text-xs font-semibold tracking-wide" style={{ color: 'var(--color-ink-dim)' }}>BRONNEN</p>
              <div className="mt-2 flex flex-col gap-1.5">
                {detail.sources.map((s) =>
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

          <button onClick={requestClose} className="mt-6 w-full text-center text-xs" style={{ color: 'var(--color-ink-dim)' }}>
            Sluiten
          </button>
        </Card>
      </div>
    </div>
  );
}

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold tracking-wide" style={{ color: 'var(--color-ink-dim)' }}>{heading}</p>
      <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{children}</p>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-1.5 flex flex-col gap-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm" style={{ color: 'var(--color-ink)' }}>
          <span style={{ color: 'var(--color-gold)' }}>·</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

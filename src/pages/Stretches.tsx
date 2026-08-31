import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PROBLEM_AREAS, STRETCH_GENERAL_ADVICE, STRETCH_SOURCE_NOTE } from '../data/stretches';
import { Card, Eyebrow } from '../components/ui';

export function StretchesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialAreaId = (location.state as { areaId?: string } | null)?.areaId ?? null;
  const [openAreaId, setOpenAreaId] = useState<string | null>(initialAreaId);

  return (
    <div className="flex flex-col gap-5 px-4 pb-10 pt-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-lg" style={{ color: 'var(--color-ink-dim)' }}>‹</button>
        <div>
          <p className="font-display text-lg" style={{ color: 'var(--color-bronze)' }}>REKOEFENINGEN</p>
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Waar zit je vast?</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {PROBLEM_AREAS.map((area) => {
          const open = openAreaId === area.id;
          return (
            <Card key={area.id}>
              <button
                onClick={() => setOpenAreaId(open ? null : area.id)}
                className="flex w-full items-center justify-between text-left"
                aria-expanded={open}
              >
                <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{area.label}</span>
                <span className="text-xs" style={{ color: 'var(--color-gold)' }}>{open ? '−' : '+'}</span>
              </button>
              {open && (
                <ul className="mt-3 flex flex-col gap-2">
                  {area.stretches.map((s) => (
                    <li key={s.name} className="flex items-baseline justify-between gap-3 text-sm">
                      <span style={{ color: 'var(--color-ink)' }}>{s.name}</span>
                      <span className="shrink-0 text-right text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                        {s.durationSec ? `${s.durationSec}s` : ''}{s.note ? (s.durationSec ? ` • ${s.note}` : s.note) : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="flex flex-col gap-2">
        <Eyebrow>ALGEMEEN ADVIES</Eyebrow>
        <ul className="flex flex-col gap-1.5">
          {STRETCH_GENERAL_ADVICE.map((line) => (
            <li key={line} className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>• {line}</li>
          ))}
        </ul>
        <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{STRETCH_SOURCE_NOTE}</p>
      </Card>
    </div>
  );
}

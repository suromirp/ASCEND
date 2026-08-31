import { useNavigate } from 'react-router-dom';
import { PROBLEM_AREAS, STRETCH_GENERAL_ADVICE, STRETCH_SOURCE_NOTE } from '../data/stretches';
import { Card, Eyebrow } from '../components/ui';

export function StretchesPage() {
  const navigate = useNavigate();

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
        {PROBLEM_AREAS.map((area) => (
          <button key={area.id} onClick={() => navigate(`/stretches/${area.id}`)} className="text-left">
            <Card className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{area.label}</span>
              <span className="text-sm" style={{ color: 'var(--color-gold)' }}>›</span>
            </Card>
          </button>
        ))}
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

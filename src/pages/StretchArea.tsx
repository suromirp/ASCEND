import { useParams, useNavigate } from 'react-router-dom';
import { PROBLEM_AREAS } from '../data/stretches';
import { Card } from '../components/ui';
import { StretchItems } from '../components/StretchList';

// One page per problem area (not a shared list with a section expanded) so
// each area has its own URL to build on later — e.g. an animation/demo per
// stretch, without reworking the navigation again.
export function StretchAreaPage() {
  const { areaId } = useParams<{ areaId: string }>();
  const navigate = useNavigate();
  const area = PROBLEM_AREAS.find((a) => a.id === areaId);

  if (!area) {
    return (
      <div className="flex flex-col gap-5 px-4 pb-10 pt-6">
        <button onClick={() => navigate('/stretches')} className="text-lg" style={{ color: 'var(--color-ink-dim)' }}>‹</button>
        <Card>
          <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Onbekend probleemgebied.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-10 pt-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-lg" style={{ color: 'var(--color-ink-dim)' }}>‹</button>
        <div>
          <p className="font-display text-lg" style={{ color: 'var(--color-bronze)' }}>{area.label.toUpperCase()}</p>
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Rekoefeningen</p>
        </div>
      </div>

      <Card>
        <StretchItems stretches={area.stretches} className="flex flex-col gap-3" />
      </Card>
    </div>
  );
}

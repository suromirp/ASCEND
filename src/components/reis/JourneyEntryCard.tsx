import { useNavigate } from 'react-router-dom';
import { baseWeightGrams, formatKg, packProgress } from '../../engine/packList';
import { formatDateNL } from '../../utils/dates';
import { Card, Eyebrow, PrimaryButton, SecondaryButton } from '../ui';
import { useJourney } from './useJourney';
import { usePackList } from './usePackList';

// Ascend: the way into the reisplanner and the packing list. Replaces the
// fixed list of seventeen words that said "nu nog niet nodig".
export function JourneyEntryCard() {
  const navigate = useNavigate();
  const { goalDate, pick, progress } = useJourney();
  const { items } = usePackList();
  if (!goalDate) return null;
  const packs = packProgress(items);

  return (
    <Card className="flex flex-col gap-3" texture>
      <div>
        <Eyebrow>Op weg naar {formatDateNL(goalDate)}</Eyebrow>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-ink)' }}>
          Wat je regelt naast het trainen: uitrusting, reserveringen, vervoer en veiligheid.
        </p>
      </div>
      <div className="flex flex-col gap-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
        <p>{progress.done} van {progress.total} taken gedaan.</p>
        {pick && pick.state !== 'done' && <p style={{ color: 'var(--color-ink)' }}>Deze week: {pick.task.title}</p>}
        <p>Basisgewicht van je paklijst {formatKg(baseWeightGrams(items))}, {packs.have} van {packs.total} onderdelen in huis.</p>
      </div>
      <div className="flex gap-3">
        <SecondaryButton onClick={() => navigate('/reis/paklijst')}>Paklijst</SecondaryButton>
        <PrimaryButton onClick={() => navigate('/reis')} fullWidth={false}>Reisplanner</PrimaryButton>
      </div>
    </Card>
  );
}

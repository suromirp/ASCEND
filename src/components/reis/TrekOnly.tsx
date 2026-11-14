import { Outlet, useNavigate } from 'react-router-dom';
import { PageHeader, SecondaryButton } from '../ui';
import { NO_TREK_LINE } from '../../engine/journeyAccess';
import { useHasTrekGoal } from './useHasTrekGoal';

// Reisplanner, Paklijst, Etappes en Alleen onderweg (een laagroute in App.tsx): zonder tocht als
// doel opent een direct adres geen leeg scherm maar één regel uitleg en de weg terug.
export function TrekOnly() {
  const trek = useHasTrekGoal();
  const navigate = useNavigate();
  if (trek) return <Outlet />;
  return (
    <div className="animate-page-in flex flex-col gap-4 px-4 pb-24 pt-6">
      <PageHeader eyebrow="Reis" title="Nog geen tocht" line={NO_TREK_LINE} fallback="/ascend" />
      <SecondaryButton onClick={() => navigate('/ascend', { replace: true })}>Naar Ascend</SecondaryButton>
    </div>
  );
}

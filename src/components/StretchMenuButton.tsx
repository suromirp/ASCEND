import { useNavigate } from 'react-router-dom';
import { Pictogram } from './pictograms';

// Het knopje met het kleine lichaam bovenaan Vandaag, direct links van het tandwiel: het
// opent het scherm Lichaam, met het figuur waarop je aanwijst waar het zit
// (docs/beslissingen/2026-10-24-lichaam-als-figuur.md). Alleen het pictogram in stijl C,
// zonder cirkel, in mint en niet in de kleur van het tandwiel: het tandwiel is van de
// instellingen (docs/beslissingen/2026-10-24-pictogrammen-in-stijl-c.md). Het tikdoel
// is 44 bij 44 px.
export function StretchMenuButton() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate('/lichaam')}
      aria-label="Lichaam: rekken en klachten"
      className="flex h-11 w-11 shrink-0 items-center justify-center"
      style={{ color: 'var(--color-action)' }}
    >
      <Pictogram name="lichaam" size={26} />
    </button>
  );
}

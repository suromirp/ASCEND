import { useNavigate } from 'react-router-dom';
import { Icon } from './icons';

// Het knopje met het kleine lichaam bovenaan Vandaag, direct links van het tandwiel: het
// opent het scherm Lichaam, met het figuur waarop je aanwijst waar het zit
// (docs/beslissingen/2026-10-24-lichaam-als-figuur.md). Alleen het pictogram, zonder
// cirkel, in dezelfde kleur als het tandwiel; het tikdoel is 44 bij 44 px.
export function StretchMenuButton() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate('/lichaam')}
      aria-label="Lichaam: rekken en klachten"
      className="flex h-11 w-11 shrink-0 items-center justify-center"
      style={{ color: 'var(--color-on-light)' }}
    >
      <Icon name="lichaam" size={24} />
    </button>
  );
}

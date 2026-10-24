import { Link } from 'react-router-dom';
import { Icon } from './icons';

// Het tandwiel: Meer (instellingen, gegevens en back-up, koppelingen, gidsen
// en kennis). Op elke tab op precies dezelfde plek, rechtsboven in de kop van
// SkyBand. Alleen het pictogram, zonder cirkel of rand, in donker marine op de
// lichte lucht; het tikdoel is 44 bij 44 px. Het staat in het scrollvlak, dus het
// schuift met de pagina mee en hangt niet over de inhoud.
export function SettingsGear({ from }: { from: string }) {
  return (
    <Link
      to="/more"
      state={{ from }}
      aria-label="Meer: instellingen, gegevens, koppelingen en gidsen"
      className="flex h-11 w-11 shrink-0 items-center justify-center"
      style={{ color: 'var(--color-on-light)' }}
    >
      <Icon name="tandwiel" size={24} />
    </Link>
  );
}

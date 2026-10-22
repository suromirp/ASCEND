import { useNavigate } from 'react-router-dom';
import { SettingsRow, SettingsSection } from '../SettingsList';

// Gidsen en kennis: uitleg en kennis voor onderweg en de bronnen achter de adviezen.
// Zes rijen zonder waarde: er valt niets in te stellen, alleen te openen.
export function GidsenGroup() {
  const navigate = useNavigate();
  const rows: [string, string, string][] = [
    ['kennisbank', 'Kennisbank', '/kennis'],
    ['trainingsgids', 'Trainingsgids', '/gids'],
    ['garmin-gids', 'Garmin-gids', '/garmin'],
    ['plekken', 'Trainingsplekken', '/plekken'],
    ['weer-gids', 'Weer', '/weer'],
    ['bronnen', 'Bronnen', '/bronnen'],
  ];
  return (
    <SettingsSection>
      {rows.map(([id, title, to]) => <SettingsRow key={id} id={id} title={title} onClick={() => navigate(to)} />)}
    </SettingsSection>
  );
}

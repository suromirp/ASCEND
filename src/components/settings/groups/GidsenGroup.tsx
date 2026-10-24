import { useNavigate } from 'react-router-dom';
import { SettingsRow, SettingsSection } from '../SettingsList';

// Gidsen en kennis: het weer en de kleding bij je training, kennis voor onderweg en
// de bronnen achter de adviezen. Vier rijen zonder waarde: er valt niets in te
// stellen, alleen te openen. De trainingsgids en de Garmin-gids zijn geen pagina's
// meer: de uitleg staat bij elke training ("Hoe je het doet") en onderaan de
// koppeling met Garmin (Koppelingen).
export function GidsenGroup() {
  const navigate = useNavigate();
  const rows: [string, string, string][] = [
    ['weer-gids', 'Weer en kleding', '/weer'],
    ['kennisbank', 'Kennisbank', '/kennis'],
    ['plekken', 'Trainingsplekken', '/plekken'],
    ['bronnen', 'Bronnen', '/bronnen'],
  ];
  return (
    <SettingsSection>
      {rows.map(([id, title, to]) => <SettingsRow key={id} id={id} title={title} onClick={() => navigate(to)} />)}
    </SettingsSection>
  );
}

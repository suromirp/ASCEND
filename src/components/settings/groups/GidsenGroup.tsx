import { useNavigate } from 'react-router-dom';
import { useHasTrekGoal } from '../../reis/useHasTrekGoal';
import { SettingsRow, SettingsSection } from '../SettingsList';

// Gidsen en kennis: het weer en de kleding bij je training, kennis voor onderweg, de
// datavelden voor je horloge (sinds 14 november hier, zodat je ze ook zonder training
// vindt) en de bronnen achter de adviezen. Vijf rijen zonder waarde: er valt niets in
// te stellen, alleen te openen. De trainingsgids en de Garmin-gids zijn geen pagina's
// meer: de uitleg staat bij elke training ("Hoe je het doet") en onderaan de
// koppeling met Garmin (Koppelingen).
export function GidsenGroup() {
  const navigate = useNavigate();
  const trek = useHasTrekGoal();
  const all: [string, string, string][] = [
    ['weer-gids', 'Weer en kleding', '/weer'],
    ['kennisbank', 'Kennisbank', '/kennis'],
    ['plekken', 'Trainingsplekken', '/plekken'],
    ['datavelden-bekijken', 'Datavelden bekijken', '/horloge/datavelden'],
    ['bronnen', 'Bronnen', '/bronnen'],
  ];
  const rows = all.filter(([id]) => trek || id !== 'kennisbank');
  return (
    <SettingsSection title="Opzoeken">
      {rows.map(([id, title, to]) => <SettingsRow key={id} id={id} title={title} onClick={() => navigate(to)} />)}
    </SettingsSection>
  );
}

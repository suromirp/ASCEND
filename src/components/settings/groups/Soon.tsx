import { useNavigate } from 'react-router-dom';
import { SettingsEmpty, SettingsList } from '../SettingsList';
import { SETTINGS_ROOT } from '../../../data/settingsLayout';

// Een groep die nog niet is gebouwd: de rest van de pagina staat nog op de oude plek.
export function Soon() {
  const navigate = useNavigate();
  return (
    <SettingsList>
      <SettingsEmpty
        text="Deze groep komt in een volgende stap."
        action={<button type="button" className="st-btn" onClick={() => navigate(SETTINGS_ROOT)}>Terug naar het overzicht</button>}
      />
    </SettingsList>
  );
}

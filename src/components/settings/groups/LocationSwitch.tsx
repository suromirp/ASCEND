import { useRef, useState } from 'react';
import { useAppData } from '../../../state/AppDataContext';
import { locationFailureText, locationKeepsSearchedPlace, searchedPlaceNote } from '../../../engine/locationSetting';
import { myLocation } from '../../../engine/weatherLocation';
import { askForLocation } from '../../../storage/locationSwitch';

// "Je locatie" aan- en uitzetten (docs/beslissingen/2026-11-02-locatie.md). Aanzetten vraagt pas nu
// om toestemming en bepaalt één keer je plek, met een grens van tien seconden. Lukt het niet, dan
// blijft de instelling uit en staat er een zin met de reden. De plek zelf wordt hier niet bewaard
// buiten wat het weer al bewaarde (de afgeronde plek in homeLocation).

type Note = { text: string; warn?: boolean };

export function useLocationSwitch() {
  const { settings, updateSettings } = useAppData();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note | null>(null);
  const running = useRef(false);

  async function onChange(on: boolean) {
    if (running.current) return;
    setNote(null);
    if (!on) {
      await updateSettings({ locationOn: false });
      setNote({ text: 'Uit. ASCEND vraagt je plek niet meer. Het weer blijft op de laatste plek.' });
      return;
    }
    running.current = true;
    setBusy(true);
    try {
      const result = await askForLocation();
      if (result.status === 'failed') {
        // De instelling blijft uit, met een zichtbare reden.
        if (settings.locationOn) await updateSettings({ locationOn: false });
        setNote({ text: locationFailureText(result.reason), warn: true });
        return;
      }
      const searched = locationKeepsSearchedPlace(settings.homeLocation);
      await updateSettings({ locationOn: true, ...(searched ? {} : { homeLocation: myLocation(result.position.lat, result.position.lon) }) });
      setNote({ text: searched ? `Aan. ${searchedPlaceNote(searched)}` : 'Aan. Het weer staat nu op je plek.' });
    } catch {
      setNote({ text: locationFailureText('unavailable'), warn: true });
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  const status = busy ? (
    <p className="st-hint" role="status">Je plek wordt bepaald. Dit duurt hoogstens tien seconden.</p>
  ) : note ? (
    <p className={note.warn ? 'st-hint warn' : 'st-hint'} role="status">{note.text}</p>
  ) : null;

  return { onChange, status };
}

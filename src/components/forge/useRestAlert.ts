// Het einde van de rust: één keer trillen en een geluid, zoals ingesteld; een
// tijdje daarna verdwijnt de balk. Eén timer per eindtijd, geen klok die het scherm ververst.

import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { restAlertChannels, restVibrationPattern } from '../../engine/restVibration';
import type { RestAlert, RestSound } from '../../engine/strengthSettings';
import { haptics } from '../../utils/haptics';
import { playRestSound } from '../../utils/sound';
import type { Rest } from './forgeWorkoutHelpers';

// Na afloop blijft de balk nog even staan, dan verdwijnt hij.
export const REST_DONE_LINGER_MS = 8000;

// Geeft de ref terug waarmee een nieuwe rust het signaal van de vorige eindtijd vergeet (`alerted.current = null`).
export function useRestAlert(rest: Rest | undefined, setRest: Dispatch<SetStateAction<Rest | undefined>>, restAlert: RestAlert, restSound: RestSound) {
  const alerted = useRef<number | null>(null);
  useEffect(() => {
    if (!rest) return;
    const end = rest.endsAt;
    const fire = window.setTimeout(() => {
      if (alerted.current === end) return;
      alerted.current = end;
      if (Date.now() - end < 3000) {
        // What you feel has the rhythm of the chosen sound, with or without the sound itself.
        const { sound, vibrate } = restAlertChannels(restAlert);
        if (vibrate) haptics.pattern(restVibrationPattern(restSound));
        if (sound) playRestSound(restSound);
      }
    }, Math.max(0, end - Date.now()));
    const drop = window.setTimeout(() => setRest((r) => (r && r.endsAt === end ? undefined : r)), Math.max(0, end + REST_DONE_LINGER_MS - Date.now()));
    return () => {
      window.clearTimeout(fire);
      window.clearTimeout(drop);
    };
  }, [rest, setRest, restAlert, restSound]);
  return alerted;
}

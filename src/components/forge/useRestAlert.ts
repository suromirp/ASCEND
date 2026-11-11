// Het einde van de rust: één keer trillen en een geluid, zoals ingesteld; een
// tijdje daarna verdwijnt de balk. Eén timer per eindtijd, geen klok die het scherm ververst.
// Met Vooraankondiging aan eerst een zachte tik 10 seconden voor het einde; komt er een nieuwe
// oefening, dan een andere klank (engine/restSounds.ts).

import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { restAlertChannels, restVibrationFor } from '../../engine/restVibration';
import { preTickDelay, preTickStillDue, restCue, vibrateInstead } from '../../engine/restSounds';
import type { ResolvedStrengthSettings } from '../../engine/strengthSettings';
import { haptics } from '../../utils/haptics';
import { playRestBell, preloadRestSound } from '../../utils/restBell';
import type { Rest } from './forgeWorkoutHelpers';

// Na afloop blijft de balk nog even staan, dan verdwijnt hij.
export const REST_DONE_LINGER_MS = 8000;

type RestBellSettings = Pick<ResolvedStrengthSettings, 'restAlert' | 'restSound' | 'restVolume' | 'restPreTick' | 'restNextExercise'>;

// Geeft de ref terug waarmee een nieuwe rust het signaal van de vorige eindtijd vergeet (`alerted.current = null`).
export function useRestAlert(rest: Rest | undefined, setRest: Dispatch<SetStateAction<Rest | undefined>>, bell: RestBellSettings) {
  const alerted = useRef<number | null>(null);
  const { restAlert, restSound, restVolume, restPreTick, restNextExercise } = bell;

  // Een opname vooraf laden, zodat de bel op tijd klinkt (stil als het niet lukt).
  useEffect(() => {
    if (restAlertChannels(restAlert).sound) preloadRestSound(restSound);
  }, [restAlert, restSound]);

  useEffect(() => {
    if (!rest) return;
    const end = rest.endsAt;
    const channels = restAlertChannels(restAlert);
    const cue = restCue(rest.nextExercise, restNextExercise);
    const fire = window.setTimeout(() => {
      if (alerted.current === end) return;
      alerted.current = end;
      if (Date.now() - end < 3000) {
        // What you feel has the rhythm of the chosen sound, with or without the sound itself.
        if (channels.vibrate) haptics.pattern(restVibrationFor(restSound, cue));
        if (channels.sound) {
          void playRestBell(restSound, { volume: restVolume, cue }).then((outcome) => {
            if (vibrateInstead(channels, outcome)) haptics.pattern(restVibrationFor(restSound, cue));
          });
        }
      }
    }, Math.max(0, end - Date.now()));
    const preDelay = preTickDelay(rest, Date.now(), restPreTick && (channels.sound || channels.vibrate));
    const pre = preDelay === null ? undefined : window.setTimeout(() => {
      // Een timer staat stil als de app weg is: bij het afgaan opnieuw toetsen, nooit na het einde.
      if (alerted.current === end || !preTickStillDue(end, Date.now())) return;
      const tick = restVibrationFor(restSound, 'pre');
      if (channels.vibrate) haptics.pattern(tick);
      if (channels.sound) {
        void playRestBell(restSound, { volume: restVolume, cue: 'pre' }).then((outcome) => {
          if (vibrateInstead(channels, outcome)) haptics.pattern(tick);
        });
      }
    }, preDelay);
    const drop = window.setTimeout(() => setRest((r) => (r && r.endsAt === end ? undefined : r)), Math.max(0, end + REST_DONE_LINGER_MS - Date.now()));
    return () => {
      window.clearTimeout(fire);
      window.clearTimeout(pre);
      window.clearTimeout(drop);
    };
  }, [rest, setRest, restAlert, restSound, restVolume, restPreTick, restNextExercise]);
  return alerted;
}

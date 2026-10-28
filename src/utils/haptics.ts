import { REST_ALARM_PATTERN } from '../engine/restVibration';

// Thin wrapper around the Vibration API. Android/Chrome supports it, iOS
// Safari doesn't expose `navigator.vibrate` at all — every call is silently
// a no-op there rather than a thrown error, so call sites never need to
// feature-detect themselves.
function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

// De duur van de korte tik, op één plek te verstellen. Veel Android-motoren laten
// een stoot onder ongeveer 70 ms weg (engine/restVibration.ts); 15 ms is het begin.
export const TAP_MS = 15;

// De instelling "Trillen" (engine/hapticsSettings.ts). Standaard aan, ook zolang de
// instellingen nog laden. Alleen tap en success kijken ernaar; alarm en pattern zijn
// het rustsignaal van Forge, dat zijn eigen keuze heeft.
let enabled = true;
export function setHapticsEnabled(on: boolean) {
  enabled = on;
}

export const haptics = {
  // A quick toggle/switch flip — barely-there, just confirms the tap landed.
  tap: () => {
    if (enabled) vibrate(TAP_MS);
  },
  // A session logged or a milestone cleared — two short pulses read as more
  // deliberate than a single buzz, without tipping into "game achievement".
  success: () => {
    if (enabled) vibrate([12, 50, 18]);
  },
  // A countdown timer or the rest reaching zero: three clear buzzes, long
  // enough to feel through a pocket (very short pulses are dropped by many
  // Android motors).
  alarm: () => vibrate([...REST_ALARM_PATTERN]),
  // Any pattern of navigator.vibrate (trillen, pauze, ...): the end of the rest
  // feels like the sound that was chosen (engine/restVibration.ts).
  pattern: (pattern: number[]) => vibrate(pattern),
};

// Thin wrapper around the Vibration API. Android/Chrome supports it, iOS
// Safari doesn't expose `navigator.vibrate` at all — every call is silently
// a no-op there rather than a thrown error, so call sites never need to
// feature-detect themselves.
function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

export const haptics = {
  // A quick toggle/switch flip — barely-there, just confirms the tap landed.
  tap: () => vibrate(10),
  // A session logged or a milestone cleared — two short pulses read as more
  // deliberate than a single buzz, without tipping into "game achievement".
  success: () => vibrate([12, 50, 18]),
};

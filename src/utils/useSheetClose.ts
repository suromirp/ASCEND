import { useState } from 'react';

// Every bottom sheet/modal in the app is conditionally rendered by its
// parent ({selected && <Sheet onClose={...} />}) rather than staying
// mounted with an `open` prop — simplest to reason about, and it's what
// was already in place everywhere. That means the sheet itself has to own
// its exit animation: requestClose() plays the reverse animation locally
// (closing flips true, driving the *-out CSS classes) and only calls the
// real onClose — which unmounts it — once that animation has actually had
// time to finish, instead of the sheet just vanishing mid-slide.
export function useSheetClose(onClose: () => void, durationMs = 200) {
  const [closing, setClosing] = useState(false);

  function requestClose() {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, durationMs);
  }

  return { closing, requestClose };
}

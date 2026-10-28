import { useCallback, useEffect, useRef, useState } from 'react';
import { useBackToClose } from './useBackToClose';
import { attachSheetDrag } from './sheetDragDom';

// Every bottom sheet/modal in the app is conditionally rendered by its
// parent ({selected && <Sheet onClose={...} />}) rather than staying
// mounted with an `open` prop — simplest to reason about, and it's what
// was already in place everywhere. That means the sheet itself has to own
// its exit animation: requestClose() plays the reverse animation locally
// (closing flips true, driving the *-out CSS classes) and only calls the
// real onClose — which unmounts it — once that animation has actually had
// time to finish, instead of the sheet just vanishing mid-slide.
//
// The Android back button closes the sheet the same way (useBackToClose):
// it is one step in the history while the sheet is open. `canClose` lets a
// sheet that is busy (an import that is running) stay open on back.
//
// `sheetRef` goes on the panel (`ref={sheetRef}`): the sheet then follows your
// finger when you drag it down, and closes through requestClose when you let go
// far or fast enough (utils/sheetDragDom.ts). A sheet that must not close by
// dragging leaves it off and says so in components/sheetDrag.scan.test.ts.
export function useSheetClose(onClose: () => void, durationMs = 200, canClose?: () => boolean) {
  const [closing, setClosing] = useState(false);
  // A tap and the back button in the same frame must not close it twice.
  const closingRef = useRef(false);

  function requestClose() {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    setTimeout(onClose, durationMs);
  }

  useBackToClose(true, requestClose, canClose);

  // The gesture always reads the latest close, flag and busy-check.
  const latest = useRef({ requestClose, canClose });
  useEffect(() => {
    latest.current = { requestClose, canClose };
  });
  const detach = useRef<(() => void) | null>(null);
  const sheetRef = useCallback((node: HTMLElement | null) => {
    detach.current?.();
    detach.current = node
      ? attachSheetDrag(node, {
          requestClose: () => latest.current.requestClose(),
          canClose: () => latest.current.canClose?.() ?? true,
          isClosing: () => closingRef.current,
        })
      : null;
  }, []);

  return { closing, requestClose, sheetRef };
}

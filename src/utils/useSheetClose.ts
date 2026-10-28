import { useCallback, useEffect, useRef, useState } from 'react';
import { useBackToClose } from './useBackToClose';
import { attachSheetDrag } from './sheetDragDom';
import { startSheetGrow, type SheetGrow } from './sheetGrowDom';

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
//
// The same ref lets a sheet that was opened from a row or card (`data-sheet-from`) grow out of it and
// shrink back into it on the cross, the backdrop, the back button and dragging away, in Beweging
// Normaal only (utils/sheetGrowDom.ts). Closing by hand on `onClose` (after Gedaan or Verplaatsen)
// never shrinks. Without a row found, the sheet is the sheet it was.
export function useSheetClose(onClose: () => void, durationMs = 200, canClose?: () => boolean) {
  const [closing, setClosing] = useState(false);
  // A tap and the back button in the same frame must not close it twice.
  const closingRef = useRef(false);
  const grow = useRef<SheetGrow | null>(null);

  function requestClose() {
    if (closingRef.current) return;
    closingRef.current = true;
    const shrink = grow.current?.close() ?? 0;
    setClosing(true);
    setTimeout(onClose, shrink ? Math.max(durationMs, shrink + 10) : durationMs);
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
    grow.current?.dispose();
    grow.current = node ? startSheetGrow(node) : null;
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

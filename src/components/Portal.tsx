import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

// Every full-screen sheet/dialog renders through this instead of inline in
// its parent's JSX. Reason: .animate-page-in (index.css) animates
// `transform`, and animation-fill-mode: both keeps that transform's final
// value (translateY(0)) applied after the animation ends — which, even
// though it's visually a no-op, is not the literal keyword `none`, so per
// spec it still establishes a new containing block for any `position:
// fixed` descendant. A sheet nested inside an animated page root would
// then position itself against that page div's (scrollable, often much
// taller than the viewport) box instead of the actual viewport — it were
// exactly the "info sheet stuck at the bottom, has to scroll into view"
// bug. Portaling straight to document.body sidesteps the whole class of
// bug regardless of what a future ancestor animation does.
export function Portal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body);
}

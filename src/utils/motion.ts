// ASCEND: does the device ask for no motion? Read at the moment of use, so a
// change in the system setting is picked up without a reload. CSS animations
// are covered by the rule in index.css; this is for Web Animations in code.
export function reducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// Animate an element with the Web Animations API, unless motion is off.
export function animateEl(el: Element | null | undefined, keyframes: Keyframe[], options: KeyframeAnimationOptions): Animation | undefined {
  if (!el || reducedMotion() || typeof el.animate !== 'function') return undefined;
  return el.animate(keyframes, options);
}

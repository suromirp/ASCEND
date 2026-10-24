import { useCountUp, useMotionMode } from './motion';

// Een geheel getal dat bij het eerste verschijnen kort optelt. De eindwaarde staat
// onzichtbaar in dezelfde cel, zodat de breedte meteen klopt en er niets verspringt;
// schermlezers lezen alleen die eindwaarde.
export function CountUp({ value }: { value: number }) {
  const full = useMotionMode() === 'full';
  const ref = useCountUp(value, full);
  if (!full) return <>{value}</>;
  return (
    <span className="inline-grid">
      <span style={{ gridArea: '1 / 1', opacity: 0 }}>{value}</span>
      <span ref={ref} aria-hidden="true" style={{ gridArea: '1 / 1' }} />
    </span>
  );
}

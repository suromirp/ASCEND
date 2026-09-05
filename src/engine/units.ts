import { UNIT_COMPARISON_DIRECTION, type MeasuredValue } from '../models/units';

// Central, single implementation — no engine module re-implements this
// (Technical Architecture v0.3.1 REVISED).
export function isDemandMet(demand: MeasuredValue, current: MeasuredValue): boolean {
  if (demand.unit !== current.unit) {
    throw new Error(`Unit mismatch: ${demand.unit} vs ${current.unit}`);
  }
  const direction = UNIT_COMPARISON_DIRECTION[demand.unit];
  return direction === 'higher_is_more' ? current.amount >= demand.amount : current.amount <= demand.amount;
}

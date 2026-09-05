// ASCEND — measurement units & comparison semantics
//
// Locked in Technical Architecture v0.3.1 REVISED (review point 4).
// Direction lives on the UNIT, not the dimension — this is what lets
// running pace (min_per_km, lower=faster=more capable) and cycling watts
// (higher=more capable) coexist under the same capability dimension
// without one universal "demand - current" comparison.

export type Unit =
  | 'km' | 'min' | 'min_per_km' | 'watts' | 'kg'
  | 'm_elevation_gain' | 'm_elevation_loss' | 'days' | 'bpm';

export type ComparisonDirection = 'higher_is_more' | 'lower_is_more';

export const UNIT_COMPARISON_DIRECTION: Record<Unit, ComparisonDirection> = {
  km: 'higher_is_more',
  min: 'higher_is_more',
  min_per_km: 'lower_is_more',
  watts: 'higher_is_more',
  kg: 'higher_is_more',
  m_elevation_gain: 'higher_is_more',
  m_elevation_loss: 'higher_is_more',
  days: 'higher_is_more',
  bpm: 'higher_is_more',
};

export interface MeasuredValue {
  amount: number;
  unit: Unit;
}

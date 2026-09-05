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

// Short, human labels for display — never the raw Unit key itself (which
// is internal vocabulary, not copy). Kept next to Unit so every new unit
// value is forced to get a label in the same change.
export const UNIT_LABEL: Record<Unit, string> = {
  km: 'km',
  min: 'min',
  min_per_km: 'min/km',
  watts: 'W',
  kg: 'kg',
  m_elevation_gain: 'm',
  m_elevation_loss: 'm',
  days: 'dagen',
  bpm: 'bpm',
};

function formatPace(minPerKm: number): string {
  const totalSeconds = Math.round(minPerKm * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')} min/km`;
}

// One place that turns a raw MeasuredValue into copy — so no call site
// prints a full-precision float or a raw Unit key again (production
// incident: DOELFOCUS showing "4.976303317535545 min_per_km").
export function formatMeasuredValue(value: MeasuredValue): string {
  if (value.unit === 'min_per_km') return formatPace(value.amount);
  const rounded = Number.isInteger(value.amount) ? value.amount : Math.round(value.amount * 10) / 10;
  return `${rounded} ${UNIT_LABEL[value.unit]}`;
}

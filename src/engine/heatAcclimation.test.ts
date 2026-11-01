import { describe, it, expect } from 'vitest';
import { HEAT_ACCLIMATION_DAYS, heatAcclimationLine, isSummerDeparture } from './heatAcclimation';

describe('wennen aan warmte voor een zomertocht', () => {
  it('kent de zomer als juni tot en met september', () => {
    expect(isSummerDeparture('2027-06-01')).toBe(true);
    expect(isSummerDeparture('2027-08-01')).toBe(true);
    expect(isSummerDeparture('2027-09-30')).toBe(true);
    expect(isSummerDeparture('2027-05-31')).toBe(false);
    expect(isSummerDeparture('2027-10-01')).toBe(false);
  });

  it('staat er alleen in de laatste drie weken voor een vertrek in de zomer', () => {
    expect(HEAT_ACCLIMATION_DAYS).toBe(21);
    expect(heatAcclimationLine('2027-08-01', '2027-07-10')).toBeUndefined();
    expect(heatAcclimationLine('2027-08-01', '2027-07-11')).toContain('je lichaam helpen wennen');
    expect(heatAcclimationLine('2027-08-01', '2027-07-31')).toBeDefined();
    // De dag zelf en daarna niet meer.
    expect(heatAcclimationLine('2027-08-01', '2027-08-01')).toBeUndefined();
    expect(heatAcclimationLine('2027-08-01', '2027-08-03')).toBeUndefined();
    // Een vertrek in de herfst niet.
    expect(heatAcclimationLine('2027-10-10', '2027-10-01')).toBeUndefined();
  });

  it('staat stil als de instelling uit is of er geen vertrekdatum is', () => {
    expect(heatAcclimationLine('2027-08-01', '2027-07-20', false)).toBeUndefined();
    expect(heatAcclimationLine(undefined, '2027-07-20')).toBeUndefined();
  });

  it('zegt kan helpen, nooit voorkomt', () => {
    const line = heatAcclimationLine('2027-08-01', '2027-07-20')!;
    expect(line).not.toMatch(/voorkom/i);
    expect(line).not.toMatch(/[–—]/);
  });
});

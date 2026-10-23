import { describe, expect, it } from 'vitest';
import { logLineParts } from './logLine';

const base = { kind: 'Hardlopen', minutes: 44 };

describe('logLineParts', () => {
  it('noemt de sport maar één keer als de manier de sport al bevat', () => {
    const parts = logLineParts({ ...base, modalityLabel: 'Hardlopen, buiten', distanceKm: 7.2, elevationGainM: 60 });
    expect(parts).toEqual(['Hardlopen, buiten', '44 min', '7,2 km', '60 m D+']);
  });

  it('houdt sport en manier apart als ze verschillen', () => {
    const parts = logLineParts({ kind: 'Wandelen', minutes: 90, modalityLabel: 'Rugzakwandeling' });
    expect(parts).toEqual(['Wandelen', 'Rugzakwandeling', '90 min']);
  });

  it('valt terug op de omgeving en laat een dubbele Garmin-soort weg', () => {
    expect(logLineParts({ ...base, environment: 'treadmill' })).toEqual(['Hardlopen', 'Loopband', '44 min']);
    expect(logLineParts({ ...base, garminType: 'Hardlopen' })).toEqual(['Hardlopen', '44 min']);
  });

  it('zet het gevoel achteraan en markeert een geschatte stijging', () => {
    const parts = logLineParts({ ...base, feel: 'better', elevationGainM: 120, elevationEstimated: true });
    expect(parts).toEqual(['Hardlopen', '44 min', '120 m D+ (geschat)', 'voelde beter']);
  });
});

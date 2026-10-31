import { describe, expect, it } from 'vitest';
import { heatPace } from './heatPace';
import { mapForecast, forecastUrl } from '../integrations/openMeteo';

describe('hitte en dauwpunt bij het tempo', () => {
  it('zegt niets bij gewoon loopweer', () => {
    expect(heatPace({ feelsC: 15, dewPointC: 9, bad: [] })).toBeUndefined();
    expect(heatPace({ feelsC: 21.4, bad: [] })).toBeUndefined();
  });

  it('warm geeft een band van 10 tot 20 seconden en de raad om op hartslag te lopen', () => {
    const h = heatPace({ feelsC: 24, dewPointC: 12, bad: [] })!;
    expect(h.level).toBe('warm');
    expect(h.text).toBe("Warm (voelt als 24 graden). Loop op hartslag: je tempo ligt dan zo'n 10 tot 20 seconden per km lager, en dat is goed.");
  });

  it('vochtig telt ook als het niet zo warm voelt, en noemt het dauwpunt', () => {
    const h = heatPace({ feelsC: 20, dewPointC: 17, bad: [] })!;
    expect(h.text.startsWith('Vochtig (voelt als 20 graden, dauwpunt 17).')).toBe(true);
  });

  it('heet of benauwd geeft een bredere band', () => {
    expect(heatPace({ feelsC: 29, dewPointC: 14, bad: [] })?.slowerTo).toBe(40);
    const muggy = heatPace({ feelsC: 25, dewPointC: 21, bad: [] })!;
    expect(muggy.level).toBe('heet');
    expect(muggy.text).toContain('Warm en vochtig (voelt als 25 graden, dauwpunt 21)');
  });

  it('de voorspelling vraagt dauwpunt en vochtigheid en leest ze per uur', () => {
    expect(forecastUrl({ name: 'Ergens', lat: 52.1, lon: 5.1 })).toContain('dew_point_2m,relative_humidity_2m');
    const f = mapForecast(
      {
        hourly: { time: ['2026-07-10T18:00'], temperature_2m: [26], apparent_temperature: [28], wind_speed_10m: [8], dew_point_2m: [19.4], relative_humidity_2m: [62] },
        daily: { time: ['2026-07-10'], sunrise: ['2026-07-10T05:30'], sunset: ['2026-07-10T21:55'] },
      },
      { name: 'Ergens', lat: 52.1, lon: 5.1 },
      '2026-07-10T08:00:00.000Z',
    );
    expect(f.hours[0].dewPointC).toBe(19.4);
    expect(f.hours[0].humidityPct).toBe(62);
  });
});

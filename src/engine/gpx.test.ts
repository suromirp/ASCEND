import { describe, expect, it } from 'vitest';
import { gpxFileName, routeGpx } from './gpx';

// Nagemaakte punten, geen echte plek.
const points = [{ lat: 52.1, lon: 5.9, ele: 21.26 }, { lat: 52.1001234, lon: 5.9004321 }, { lat: 52.1, lon: 5.9, ele: 21 }];

describe('routeGpx', () => {
  const gpx = routeGpx(points, 'Lange duurloop · Simpel <test> & "meer"');

  it('is een GPX 1.1 met één spoor en een punt per regel', () => {
    expect(gpx.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="ASCEND"')).toBe(true);
    expect(gpx.match(/<trk>/g)).toHaveLength(1);
    expect(gpx.match(/<trkpt /g)).toHaveLength(3);
    expect(gpx).toContain('<trkpt lat="52.100000" lon="5.900000"><ele>21.3</ele></trkpt>');
    // Zonder hoogte: een punt zonder ele, geen nul.
    expect(gpx).toContain('<trkpt lat="52.100123" lon="5.900432"/>');
    expect(gpx.trimEnd().endsWith('</gpx>')).toBe(true);
  });

  it('zet geen tijd in het bestand en noemt OpenStreetMap', () => {
    expect(gpx).not.toContain('<time>');
    expect(gpx).toContain('https://www.openstreetmap.org/copyright');
  });

  it('maakt tekens in de naam veilig', () => {
    expect(gpx).toContain('<name>Lange duurloop · Simpel &lt;test&gt; &amp; &quot;meer&quot;</name>');
  });

  it('sluit elk element dat het opent', () => {
    for (const tag of ['gpx', 'metadata', 'trk', 'trkseg', 'copyright', 'license']) {
      expect(gpx.match(new RegExp(`<${tag}[ >]`, 'g'))).toHaveLength(1);
      expect(gpx.match(new RegExp(`</${tag}>`, 'g'))).toHaveLength(1);
    }
    expect(gpx.match(/<name>/g)).toHaveLength(2);
  });
});

describe('gpxFileName', () => {
  it('heeft de soort en de dag, en een volgnummer als de naam bezet is', () => {
    expect(gpxFileName('simple', '2026-11-09')).toBe('ascend-route-simpel-2026-11-09.gpx');
    expect(gpxFileName('adventure', '2026-11-09', 3)).toBe('ascend-route-avontuurlijk-2026-11-09-3.gpx');
  });
});

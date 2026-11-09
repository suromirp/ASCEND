// ASCEND: een voorgestelde lus als GPX-bestand (GPX 1.1, één spoor). Zo'n bestand opent als koers
// in de app van je horloge of in een navigatie-app. Er staat geen tijd in en geen naam van een plek:
// alleen de punten van de lus, met hoogte als de bron die gaf. Pure: geen React, geen netwerk.
// Kaartgegevens van OpenStreetMap (ODbL); dat staat in het bestand.

import type { RoutePoint } from '../models/route';

const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function routeGpx(points: RoutePoint[], name: string): string {
  const safe = escapeXml(name);
  const body = points
    .map((p) => {
      const at = `lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}"`;
      return p.ele === undefined ? `      <trkpt ${at}/>` : `      <trkpt ${at}><ele>${p.ele.toFixed(1)}</ele></trkpt>`;
    })
    .join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="ASCEND" xmlns="http://www.topografix.com/GPX/1/1">',
    '  <metadata>',
    `    <name>${safe}</name>`,
    '    <copyright author="OpenStreetMap-bijdragers"><license>https://www.openstreetmap.org/copyright</license></copyright>',
    '  </metadata>',
    '  <trk>',
    `    <name>${safe}</name>`,
    '    <trkseg>',
    body,
    '    </trkseg>',
    '  </trk>',
    '</gpx>',
    '',
  ].join('\n');
}

// "ascend-route-simpel-2026-11-09.gpx"; met een volgnummer als de naam al bestaat.
export function gpxFileName(style: 'simple' | 'adventure', date: string, n = 1): string {
  const kind = style === 'simple' ? 'simpel' : 'avontuurlijk';
  return n <= 1 ? `ascend-route-${kind}-${date}.gpx` : `ascend-route-${kind}-${date}-${n}.gpx`;
}

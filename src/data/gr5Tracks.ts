// ASCEND: het spoor van elke GR5-etappe uit OpenStreetMap, apart geladen. Het spoor is groot (enkele
// honderden punten per etappe), dus het komt alleen met een dynamische import in de bundel waar het
// nodig is. Begin en eind staan wel vast in data/gr5Stages.ts.
// Routedata © OpenStreetMap contributors, ODbL. Besluit: docs/beslissingen/2026-11-11-gr5-uit-osm.md.

import type { GeoPoint, StageCoords } from '../models/geo';

export { GR5_OSM_ATTRIBUTION, GR5_OSM_LICENSE_URL } from './gr5StageEnds';

export interface Gr5Track {
  path: GeoPoint[];
  // Hoogte in meters per punt van `path`, null waar onbekend. Ontbreekt als het script zonder hoogte draaide.
  ele?: (number | null)[];
}

// Het platte formaat van gr5StagePaths.ts naar punten. Een lege of kapotte reeks geeft geen spoor.
export function decodeTrack(flat: readonly (number | null)[] | undefined, stride: number): Gr5Track | undefined {
  if (!flat || (stride !== 2 && stride !== 3) || flat.length < 2 * stride || flat.length % stride !== 0) return undefined;
  const path: GeoPoint[] = [];
  const ele: (number | null)[] = [];
  for (let i = 0; i < flat.length; i += stride) {
    const lat = flat[i];
    const lon = flat[i + 1];
    if (typeof lat !== 'number' || typeof lon !== 'number') return undefined;
    path.push({ lat, lon });
    if (stride === 3) ele.push(flat[i + 2] ?? null);
  }
  return stride === 3 ? { path, ele } : { path };
}

let cache: Promise<Record<string, Gr5Track>> | undefined;

// Alle sporen, eenmaal geladen. Faalt het laden, dan een lege uitkomst: de etappes werken dan met begin en eind.
export function loadGr5Tracks(): Promise<Record<string, Gr5Track>> {
  cache ??= import('./gr5StagePaths')
    .then(({ GR5_STAGE_PATHS, GR5_PATH_STRIDE }) => {
      const out: Record<string, Gr5Track> = {};
      for (const [id, flat] of Object.entries(GR5_STAGE_PATHS)) {
        const track = decodeTrack(flat, GR5_PATH_STRIDE);
        if (track) out[id] = track;
      }
      return out;
    })
    .catch(() => {
      cache = undefined;
      return {};
    });
  return cache;
}

// Een etappe met zijn spoor erbij, als er begin, eind en een spoor zijn. Anders de etappe zoals hij was.
export function withTrack<T extends { id: string; coords?: StageCoords }>(stage: T, tracks: Record<string, Gr5Track>): T {
  const track = tracks[stage.id];
  if (!stage.coords || !track) return stage;
  return { ...stage, coords: { ...stage.coords, path: track.path } };
}

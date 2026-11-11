// ASCEND: MapLibre GL JS laden voor de kaart bij Route voorstellen. Alleen hier, en pas als het
// paneel opengaat (dynamische import): de start van de app merkt niets van ruim een megabyte kaartcode.
// De worker komt uit de eigen build (setWorkerUrl), niet van een CDN. Geen sleutel, nergens.

import type { MapLib } from '../components/routeMapView';

export async function loadMapLibre(): Promise<MapLib> {
  const [lib, worker] = await Promise.all([
    import('maplibre-gl'),
    import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
    import('maplibre-gl/dist/maplibre-gl.css'),
  ]);
  lib.setWorkerUrl(worker.default);
  return lib as unknown as MapLib;
}

// WebGL2 is wat MapLibre 6 vraagt. Zonder: een nette regel in plaats van de kaart.
export function hasWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

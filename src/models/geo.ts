// ASCEND: een plek op aarde en de coordinaten van een etappe (engine/stagePosition.ts). Een plek is
// altijd afgerond op twee decimalen waar hij bewaard wordt; voor een etappe zijn het vaste gegevens.

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface StageCoords {
  start: GeoPoint;
  end: GeoPoint;
  // Punten langs de route, van begin naar eind. Optioneel.
  path?: GeoPoint[];
}

// ASCEND: wat er rond een plek ligt voor een heuvel- of traptraining. Provider-neutraal: de bron
// staat in `source`, geen veld draagt de naam van een leverancier (integrations/overpass.ts vult
// deze vormen). Een cache op dit toestel, nooit in een back-up.

import type { WeatherPlace } from './weather';

// 'water' en 'wood' (bos, park of groen) komen uit hetzelfde verzoek en dienen alleen Andere lus, Soort.
export type TerrainKind = 'hill' | 'steps' | 'dirt_path' | 'sports_ground' | 'track' | 'water' | 'wood';

export interface TerrainFeature {
  kind: TerrainKind;
  // Positie van het ding zelf (openbare kaartgegevens), op vier decimalen.
  lat: number;
  lon: number;
  distanceM: number; // hemelsbreed vanaf de afgeronde plek
  // Hoeveel hoger dan de plek, voor een heuvel of helling; ontbreekt zonder hoogtegegevens.
  heightM?: number;
}

export interface NearbyTerrain {
  source: 'osm';
  fetchedAt: string;
  place: WeatherPlace; // afgerond op twee decimalen, zoals bij het weer
  radiusM: number;
  features: TerrainFeature[];
  // Gezocht met water en bos in hetzelfde verzoek. Een oudere bewaarde plek mist dat en wordt voor Soort opnieuw gevraagd.
  scenery?: true;
}

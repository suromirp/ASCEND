// GEMAAKT DOOR scripts/gr5-osm/haal-gr5.mjs op 2026-11-11. Niet met de hand aanpassen; draai het script opnieuw.
// Routedata © OpenStreetMap contributors, beschikbaar onder de Open Database License (ODbL),
// https://www.openstreetmap.org/copyright. Superroute 2704286, delen 14060187, 20623407, 20623406, 20623405, 20623404, 18813517.
// Hoogte: EU-DEM 25 m via OpenTopoData (Copernicus Land Monitoring Service, Europese Unie).
// Besluit: docs/beslissingen/2026-11-11-gr5-uit-osm.md.

// Begin en eind van elke etappe op het OSM-spoor, met de afstand en (als die er is) de stijging en
// daling volgens dat spoor. Klein: dit staat in de gewone bundel.

export const GR5_OSM_ATTRIBUTION = '© OpenStreetMap contributors';
export const GR5_OSM_LICENSE_URL = 'https://www.openstreetmap.org/copyright';
export const GR5_OSM_RELATION = 2704286;
export const GR5_OSM_TAKEN_ON = '2026-11-11';

export interface Gr5StageEnds {
  start: { lat: number; lon: number };
  end: { lat: number; lon: number };
  // Volgens het volle OSM-spoor, voor de vereenvoudiging.
  km: number;
  up?: number;
  down?: number;
}

export const GR5_STAGE_ENDS: Record<string, Gr5StageEnds> = {
  t1e1: { start: { lat: 46.39422, lon: 6.80468 }, end: { lat: 46.33106, lon: 6.7668 }, km: 12.3, up: 1590, down: 456 },
  t1e2: { start: { lat: 46.33106, lon: 6.7668 }, end: { lat: 46.26102, lon: 6.79277 }, km: 12.8, up: 1240, down: 866 },
  t1e3: { start: { lat: 46.26102, lon: 6.79277 }, end: { lat: 46.19638, lon: 6.81297 }, km: 11.8, up: 598, down: 506 },
  t1e4: { start: { lat: 46.19638, lon: 6.81297 }, end: { lat: 46.1301, lon: 6.76104 }, km: 14.5, up: 738, down: 1055 },
  t1e5: { start: { lat: 46.1301, lon: 6.76104 }, end: { lat: 46.04198, lon: 6.76543 }, km: 15.4, up: 291, down: 1165 },
  t1e6: { start: { lat: 46.04198, lon: 6.76543 }, end: { lat: 45.97489, lon: 6.80042 }, km: 13.7, up: 1611, down: 414 },
  t1e7: { start: { lat: 45.97489, lon: 6.80042 }, end: { lat: 45.89153, lon: 6.79899 }, km: 19.1, up: 1009, down: 1995 },
  t2e1: { start: { lat: 45.89153, lon: 6.79899 }, end: { lat: 45.87216, lon: 6.76076 }, km: 7.0, up: 715, down: 202 },
  t2e2: { start: { lat: 45.87216, lon: 6.76076 }, end: { lat: 45.77819, lon: 6.71449 }, km: 15.4, up: 685, down: 730 },
  t2e3: { start: { lat: 45.77819, lon: 6.71449 }, end: { lat: 45.6932, lon: 6.66903 }, km: 15.5, up: 1175, down: 831 },
  t2e4: { start: { lat: 45.6932, lon: 6.66903 }, end: { lat: 45.63219, lon: 6.66928 }, km: 12.7, up: 1010, down: 823 },
  t2e5: { start: { lat: 45.63219, lon: 6.66928 }, end: { lat: 45.54674, lon: 6.7558 }, km: 20.0, up: 737, down: 1414 },
  t2e6: { start: { lat: 45.54674, lon: 6.7558 }, end: { lat: 45.45819, lon: 6.86112 }, km: 15.8, up: 1404, down: 143 },
  t2e7: { start: { lat: 45.45819, lon: 6.86112 }, end: { lat: 45.39653, lon: 6.88268 }, km: 16.5, up: 734, down: 850 },
  t2e8: { start: { lat: 45.39653, lon: 6.88268 }, end: { lat: 45.31914, lon: 6.79344 }, km: 16.7, up: 759, down: 925 },
  t2e9: { start: { lat: 45.31914, lon: 6.79344 }, end: { lat: 45.25716, lon: 6.7297 }, km: 16.3, up: 1099, down: 1120 },
  t2e10: { start: { lat: 45.25716, lon: 6.7297 }, end: { lat: 45.20161, lon: 6.67269 }, km: 16.4, up: 582, down: 1798 },
  t3e1: { start: { lat: 45.20161, lon: 6.67269 }, end: { lat: 45.1217, lon: 6.60732 }, km: 14.5, up: 1544, down: 190 },
  t3e2: { start: { lat: 45.1217, lon: 6.60732 }, end: { lat: 45.00295, lon: 6.66119 }, km: 19.1, up: 524, down: 1462 },
  t3e3: { start: { lat: 45.00295, lon: 6.66119 }, end: { lat: 44.93096, lon: 6.72204 }, km: 16.5, up: 1070, down: 699 },
  t3e4: { start: { lat: 44.93096, lon: 6.72204 }, end: { lat: 44.89798, lon: 6.64355 }, km: 8.9, up: 179, down: 740 },
  t3e5: { start: { lat: 44.89798, lon: 6.64355 }, end: { lat: 44.79246, lon: 6.72836 }, km: 18.6, up: 1378, down: 889 },
  t3e6: { start: { lat: 44.79246, lon: 6.72836 }, end: { lat: 44.75574, lon: 6.79235 }, km: 9.5, up: 351, down: 769 },
  t3e7: { start: { lat: 44.75574, lon: 6.79235 }, end: { lat: 44.66837, lon: 6.77811 }, km: 13.5, up: 1009, down: 723 },
  t3e8: { start: { lat: 44.66837, lon: 6.77811 }, end: { lat: 44.59627, lon: 6.83057 }, km: 12.7, up: 1164, down: 440 },
  t3e9: { start: { lat: 44.59627, lon: 6.83057 }, end: { lat: 44.5255, lon: 6.8002 }, km: 12.0, up: 538, down: 1017 },
  t3e10: { start: { lat: 44.5255, lon: 6.8002 }, end: { lat: 44.45098, lon: 6.8466 }, km: 13.5, up: 825, down: 1038 },
  t4e1: { start: { lat: 44.45098, lon: 6.8466 }, end: { lat: 44.32199, lon: 6.86124 }, km: 20.2, up: 1265, down: 1068 },
  t4e2: { start: { lat: 44.32199, lon: 6.86124 }, end: { lat: 44.2564, lon: 6.92486 }, km: 16.8, up: 792, down: 1517 },
  t4e3: { start: { lat: 44.2564, lon: 6.92486 }, end: { lat: 44.18928, lon: 6.92879 }, km: 13.6, up: 1084, down: 728 },
  t4e4: { start: { lat: 44.18928, lon: 6.92879 }, end: { lat: 44.13924, lon: 7.04651 }, km: 19.2, up: 1334, down: 946 },
  t4e5: { start: { lat: 44.13924, lon: 7.04651 }, end: { lat: 44.08349, lon: 7.10518 }, km: 12.5, up: 217, down: 1613 },
  t4e6: { start: { lat: 44.08349, lon: 7.10518 }, end: { lat: 44.06669, lon: 7.20096 }, km: 11.3, up: 1117, down: 332 },
  t4e7: { start: { lat: 44.06669, lon: 7.20096 }, end: { lat: 43.91702, lon: 7.24751 }, km: 25.8, up: 1624, down: 2107 },
  t4e8: { start: { lat: 43.91702, lon: 7.24751 }, end: { lat: 43.84575, lon: 7.23737 }, km: 13.9, up: 929, down: 1182 },
  t4e9: { start: { lat: 43.84575, lon: 7.23737 }, end: { lat: 43.69397, lon: 7.25781 }, km: 22.2, up: 655, down: 1188 },
};

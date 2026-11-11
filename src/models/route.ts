// ASCEND: een voorgestelde lus voor een training (engine/routePlanner.ts). Provider-neutraal: de
// bron staat in `source`, geen veld draagt de naam van een leverancier (integrations/brouter.ts en
// integrations/valhalla.ts vullen deze vormen). Een route wordt nergens bewaard: hij bestaat alleen
// zolang het blad open is, en als GPX-bestand dat je zelf downloadt.

export interface RoutePoint {
  lat: number;
  lon: number;
  // Hoogte in meters boven zeeniveau; ontbreekt als de bron geen hoogte gaf.
  ele?: number;
}

export type RouteSource = 'brouter' | 'valhalla';

// Een lijn van de routeplanner tussen een rij punten.
export interface RoutedLine {
  source: RouteSource;
  points: RoutePoint[];
}

export type RouteFailure = 'offline' | 'timeout' | 'error' | 'unmapped';

export type RouteAnswer =
  | { ok: true; line: RoutedLine }
  // `waypoint`: bij 'unmapped' de index van het punt waar geen pad in de buurt ligt, als de bron dat zegt.
  | { ok: false; reason: RouteFailure; waypoint?: number };

// De routeplanner zoals de engine hem ziet: een rij punten erin, een lijn eruit. Gooit nooit.
export type RouteFn = (waypoints: RoutePoint[]) => Promise<RouteAnswer>;

export type RouteStyle = 'simple' | 'adventure';

// Wat de training vraagt.
export interface RouteTarget {
  distanceKm: number;
  ascentM: number;
}

export interface RouteProposal {
  style: RouteStyle;
  source: RouteSource;
  points: RoutePoint[];
  distanceM: number;
  ascentM: number;
  // Simpel: hoe vaak dezelfde helling, en hoe hoog en lang die is. Zonder: heen en terug over vlak terrein.
  repeats?: number;
  climbM?: number;
  climbLengthM?: number;
  // Avontuurlijk: langs hoeveel verschillende hellingen de lus gaat.
  hills?: number;
  // Welk deel van de lus je twee keer loopt (0 tot 1).
  repeatedShare: number;
  // Hoe ver het dichtstbijzijnde pad van het startpunt ligt, als dat ver is; dat stuk is een rechte lijn.
  startGapM?: number;
  // Een melding bij deze lus: het droge feit en wat wel kan (bijvoorbeeld geen heuvels in de buurt).
  notice?: string;
}

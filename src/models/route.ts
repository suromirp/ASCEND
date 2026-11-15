// ASCEND: een voorgestelde lus voor een training (engine/routePlanner.ts). Provider-neutraal: de
// bron staat in `source`, geen veld draagt de naam van een leverancier (integrations/brouter.ts en
// integrations/valhalla.ts vullen deze vormen). Een route wordt nergens bewaard: hij bestaat alleen
// zolang het blad open is, en als GPX-bestand dat je zelf downloadt.

export interface RoutePoint {
  lat: number;
  lon: number;
  // Hoogte in meters boven zeeniveau; ontbreekt als de bron geen hoogte gaf.
  ele?: number;
  // Dit punt ligt op een grote weg (de bron zegt welke weg; nu alleen BRouter). Een stap telt in
  // engine/routeGeometry.ts#bigRoadMeters alleen als beide punten het hebben. Alleen in het geheugen: een
  // bewaarde route en het GPX-bestand nemen alleen plek en hoogte mee.
  bigRoad?: true;
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

// Een stuk dat de routeplanner moet mijden (Vermijd dit stuk, engine/routeAdjust.ts): een cirkel.
export interface AvoidArea {
  lat: number;
  lon: number;
  radiusM: number;
}

export interface RouteOptions {
  avoid?: AvoidArea[];
}

// De routeplanner zoals de engine hem ziet: een rij punten erin, een lijn eruit. Gooit nooit.
// `options.avoid`: cirkels die de lijn niet mag raken; elke bron vertaalt ze naar haar eigen vorm.
export type RouteFn = (waypoints: RoutePoint[], options?: RouteOptions) => Promise<RouteAnswer>;

export type RouteStyle = 'simple' | 'adventure';

// Wat de training vraagt. Een looptraining: alleen afstand en hoogtemeters. Een wandeltraining
// (engine/hikeTarget.ts) ook de duur, de rugzak en wat hij aan hoogtemeters vraagt; `ascentM` is dan wat
// in de duur past. Een bewaarde route bewaart geen doel, dus deze velden vragen geen migratie.
export interface RouteTarget {
  distanceKm: number;
  ascentM: number;
  // De duur van een wandeltraining in minuten; afwezig: een looptraining.
  minutes?: number;
  // De rugzak in kilo's, als de training er een vraagt.
  packKg?: number;
  // De hoogtemeters die de training vraagt, als hij die vraagt (ook als ze niet in de duur passen).
  askedAscentM?: number;
  // Het tempo waarmee de tijd van een lus gerekend wordt (engine/hikeTarget.ts#walkRates); alleen bij een
  // wandeltraining, alleen in het geheugen.
  rates?: WalkRates;
}

// Het wandeltempo van een lus: vlak, omhoog en omlaag, op je eigen klimtempo of op de wandelnorm.
export interface WalkRates {
  flatKmh: number;
  upMph: number;
  downMph: number;
  // Waar het op rust: je eigen klimtempo of de wandelnorm.
  basis: 'own' | 'norm';
  // De rugzak die is meegerekend; alleen op je eigen tempo met een bekend gewicht op je klimmen en een
  // bekend lichaamsgewicht. Afwezig: de tijd rekent zonder rugzak.
  packKg?: number;
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
  // Wat de training aan hoogtemeters vraagt, als ze die vraagt. Dan staat het getal van de lus er
  // altijd bij, ook onder de grens van vrijwel vlak.
  targetAscentM?: number;
  // Hoeveel doodlopende stukken de lus heeft (engine/routeGeometry.ts#deadEnds): een stuk dat je in en
  // weer uit loopt. Heen en terug heeft er één; een echte lus geen.
  deadEnds?: number;
  // Meters langs een grote weg, als de bron dat zei en het er zijn.
  bigRoadM?: number;
  // Simpel met herhalingen: waar de helling ligt, in meters langs de lus (de eerste keer omhoog).
  climbFromM?: number;
  climbToM?: number;
  // Een melding bij deze lus: het droge feit en wat wel kan (bijvoorbeeld geen heuvels in de buurt).
  notice?: string;
}

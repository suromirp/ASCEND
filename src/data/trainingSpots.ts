// ASCEND — places in the Netherlands to train climbing (D+) and descending
// (D−) (production feedback: "waar doe je dat in Nederland überhaupt?").
// From the Trainingsplekken research (docs/onderzoek/notities/Trainingsplekken
// Nederland): coordinates from OpenStreetMap, heights cross-checked with
// Wikipedia's list of Dutch hills. Where sources disagree or a number was
// only found once, `caveat` says so in plain words; nothing is presented
// as more certain than it is. Starting with the Utrecht/Amersfoort region,
// plus the best-known spots elsewhere.

export type SpotUse = 'bergop' | 'bergaf' | 'trap' | 'rugzak' | 'heuvelintervallen' | 'lange tocht';

export interface TrainingSpot {
  id: string;
  name: string;
  place: string;
  province: string;
  lat: number;
  lon: number;
  // What the coordinate is: a parking/start point, the top, or the middle
  // of the area.
  coordType: 'start' | 'top' | 'gebied';
  kind: string; // "Trap", "Stuwwal", "Duinen", ...
  topM?: number; // highest point, m NAP
  climbM?: number; // height difference of one climb or one stair repeat
  example: string; // what a session there gives
  uses: SpotUse[];
  terrain: string;
  access: string;
  station?: { name: string; km: number }; // straight line
  tip: string;
  caveat?: string;
  region: 'utrecht' | 'elders';
  sources: { label: string; url: string }[];
}

const MUDSWEAT = { label: 'Mud Sweat Trails, hoogtemeters maken in Nederland', url: 'https://www.mudsweattrails.nl/hoogtemeters-maken-nederland/' };
const HEUVELS = { label: 'Wikipedia, lijst van heuvels in Nederland', url: 'https://nl.wikipedia.org/wiki/Lijst_van_heuvels_in_Nederland' };
const BERGEN_MAGAZINE = { label: 'Bergen Magazine, hoogtemeters maken in Nederland', url: 'https://bergenmagazine.nl/reportage/hoogtemeters-maken-in-nederland-hoe-doe-je-dat' };

export const TRAINING_SPOTS: TrainingSpot[] = [
  {
    id: 'amersfoortse-berg',
    name: 'Amersfoortse Berg',
    place: 'Amersfoort',
    province: 'Utrecht',
    lat: 52.14307, lon: 5.36588, coordType: 'top',
    kind: 'Stuwwal, stadsbos',
    example: 'Heuvelherhalingen in het bos rond het Belgenmonument, dichtbij huis.',
    uses: ['bergop', 'heuvelintervallen'],
    terrain: 'Bospaden en lanen',
    access: 'Altijd toegankelijk, op loopafstand van Amersfoort Centraal.',
    station: { name: 'Amersfoort Centraal', km: 1.3 },
    tip: 'De Hugo de Grootlaan en de Belgenlaan zijn de steilste stukken. Goed voor korte heuvelintervallen zonder reistijd.',
    caveat: 'De hoogte is niet nagemeten; het hoogteverschil is bescheiden.',
    region: 'utrecht',
    sources: [{ label: 'OpenStreetMap, Amersfoortse Berg', url: 'https://nominatim.openstreetmap.org/ui/search.html?q=Amersfoortse+Berg' }, { label: 'Climbfinder, beklimmingen provincie Utrecht', url: 'https://climbfinder.com/us/regions/utrecht' }],
  },
  {
    id: 'kwintelooijen',
    name: 'Trap Kwintelooijen',
    place: 'Rhenen',
    province: 'Utrecht',
    lat: 51.99327, lon: 5.55474, coordType: 'start',
    kind: 'Trap in een oude zandafgraving',
    climbM: 30,
    example: '169 treden, ongeveer 30 m per keer: 10 keer op en neer is ±300 m D+ en D−.',
    uses: ['trap', 'bergop', 'bergaf', 'rugzak'],
    terrain: 'Trap, zand en bospad',
    access: 'Dagelijks van zonsopgang tot zonsondergang. Parkeren aan de Oude Veensegrindweg.',
    station: { name: 'Rhenen', km: 4.3 },
    tip: 'Loop de trap ook bewust naar beneden: juist dat traint je bovenbenen voor lange afdalingen. Later met rugzak.',
    caveat: 'Bronnen noemen 30 of 50 m hoogte; 169 treden past bij ongeveer 30 m.',
    region: 'utrecht',
    sources: [{ label: 'Op de Heuvelrug, Kwintelooijen', url: 'https://www.opdeheuvelrug.nl/locatie/2918200204/kwintelooijen' }, { label: 'Strava-segment Trap Kwintelooijen', url: 'https://www.strava.com/segments/3670680' }],
  },
  {
    id: 'grebbeberg',
    name: 'Grebbeberg',
    place: 'Rhenen',
    province: 'Utrecht',
    lat: 51.95580, lon: 5.60161, coordType: 'start',
    kind: 'Stuwwal met trap',
    topM: 52, climbM: 50,
    example: 'Route van 4 km met meer dan 50 m hoogteverschil, of herhalingen op de trap: 8 keer is ±400 m D+ en D−.',
    uses: ['bergaf', 'bergop', 'trap', 'rugzak'],
    terrain: 'Bospaden en trap, steile hellingen',
    access: 'Start bij het Militair Ereveld, Grebbeweg 123. Honden niet toegestaan, ook niet aangelijnd.',
    station: { name: 'Rhenen', km: 1.6 },
    tip: 'Een van de steilste natuurlijke afdalingen van de provincie. Ideaal om bergaf te oefenen.',
    caveat: 'Het aantal treden verschilt per bron (200 of 260).',
    region: 'utrecht',
    sources: [{ label: 'Utrechts Landschap, wandelroute Grebbeberg', url: 'https://www.utrechtslandschap.nl/routes/wandelroute/grebbeberg' }, { label: 'My Footprints, Trage Tocht Rhenen', url: 'https://www.myfootprints.nl/wandelen-in-utrecht/trage-tocht-rhenen-bergwandeling-grebbeberg-laarsenberg/' }],
  },
  {
    id: 'amerongse-berg',
    name: 'Amerongse Berg',
    place: 'Amerongen',
    province: 'Utrecht',
    lat: 52.00806, lon: 5.48294, coordType: 'top',
    kind: 'Stuwwal, hoogste punt van de Heuvelrug',
    topM: 69, climbM: 45,
    example: 'Klimmen van 40 tot 50 m, 2 tot 6% steil. Rondjes in het Amerongse Bos.',
    uses: ['bergop', 'bergaf', 'heuvelintervallen', 'lange tocht'],
    terrain: 'Bospaden, rustig glooiend',
    access: 'Vrij toegankelijk bos. Ook een bekende fietsklim.',
    tip: 'Combineer met een fietsrit over de Heuvelrug: de rit telt mee als training.',
    region: 'utrecht',
    sources: [{ label: 'Climbfinder, Amerongse Berg', url: 'https://climbfinder.com/nl/beklimmingen/amerongse-berg-amerongen' }, BERGEN_MAGAZINE],
  },
  {
    id: 'kaapse-bossen',
    name: 'Kaapse Bossen',
    place: 'Doorn',
    province: 'Utrecht',
    lat: 52.04025, lon: 5.36110, coordType: 'gebied',
    kind: 'Stuwwal, bos',
    example: 'Lange wandelingen over de Heuvelrug met glooiende hoogtemeters.',
    uses: ['lange tocht', 'rugzak'],
    terrain: 'Bospaden',
    access: 'Vrij toegankelijk bos.',
    station: { name: 'Maarn', km: 2.7 },
    tip: 'Goed voor lange tochten met rugzak; de hoogteverschillen zijn klein, dus tel op afstand en tijd.',
    caveat: 'Voor 15 tot 20 km met 200 tot 300 m D+ op de Heuvelrug vonden we maar één bron.',
    region: 'utrecht',
    sources: [MUDSWEAT],
  },
  {
    id: 'wageningse-berg',
    name: 'Wageningse Berg',
    place: 'Wageningen',
    province: 'Gelderland',
    lat: 51.96638, lon: 5.69660, coordType: 'top',
    kind: 'Stuwwal',
    topM: 43,
    example: 'Het Wageningse Engpad, een rondje van 13 km over de berg.',
    uses: ['bergop', 'bergaf', 'lange tocht'],
    terrain: 'Bospaden',
    access: 'Vrij toegankelijk. Vanaf station Ede-Wageningen met de bus.',
    tip: 'Mooi te combineren met de Grebbeberg aan de overkant voor een langere dag.',
    region: 'utrecht',
    sources: [MUDSWEAT, { label: 'OpenStreetMap, Wageningse Berg', url: 'https://www.openstreetmap.org/node/4105220667' }],
  },
  {
    id: 'posbank',
    name: 'Posbank en Veluwezoom',
    place: 'Rheden',
    province: 'Gelderland',
    lat: 52.02940, lon: 6.02335, coordType: 'start',
    kind: 'Stuwwal, hoogste van Midden-Nederland',
    topM: 110, climbM: 60,
    example: 'Een trailroute van 15 km met ±400 m D+. Klim bij de Emmapiramide van 63 m.',
    uses: ['bergop', 'bergaf', 'rugzak', 'lange tocht'],
    terrain: 'Bospaden, heide, steile stukken',
    access: 'Parkeren aan de Beekhuizenseweg (waarschijnlijk betaald).',
    station: { name: 'Rheden', km: 2.2 },
    tip: 'De beste plek in de regio voor een echte bergdag. Perfect voor je langste tocht met rugzak.',
    region: 'utrecht',
    sources: [MUDSWEAT, { label: 'Climbfinder, Posbank', url: 'https://climbfinder.com/us/climbs/posbank' }, HEUVELS],
  },
  {
    id: 'duivelsberg',
    name: 'Duivelsberg en de N70',
    place: 'Berg en Dal',
    province: 'Gelderland',
    lat: 51.81942, lon: 5.94606, coordType: 'top',
    kind: 'Stuwwal',
    topM: 74,
    example: 'De N70-route: 16 km over 8 heuvels met ±450 m D+.',
    uses: ['bergop', 'bergaf', 'lange tocht', 'rugzak'],
    terrain: 'Bospaden, steil',
    access: 'Vrij toegankelijk bos.',
    station: { name: 'Nijmegen', km: 6.9 },
    tip: 'Veel klimmen en dalen op korte afstand. Goed als generale repetitie met rugzak.',
    region: 'utrecht',
    sources: [MUDSWEAT, HEUVELS],
  },
  {
    id: 'mookerheide',
    name: 'Mookerheide en Sint-Jansberg',
    place: 'Mook',
    province: 'Limburg',
    lat: 51.75816, lon: 5.88918, coordType: 'gebied',
    kind: 'Stuwwal, heide en bos',
    topM: 59,
    example: 'Rondes over de heide en de Sint-Jansberg, met steile korte hellingen.',
    uses: ['bergop', 'bergaf', 'lange tocht'],
    terrain: 'Heide, zand en bospad',
    access: 'Vrij toegankelijk, dichtbij het station.',
    station: { name: 'Mook-Molenhoek', km: 1.2 },
    tip: 'Met de trein goed bereikbaar: uitstappen en meteen de heuvels in.',
    region: 'utrecht',
    sources: [{ label: 'OpenStreetMap, Mookerheide', url: 'https://www.openstreetmap.org/way/431611308' }, HEUVELS],
  },
  {
    id: 'wilhelminaberg',
    name: 'Trap Wilhelminaberg',
    place: 'Landgraaf',
    province: 'Limburg',
    lat: 50.87558, lon: 6.02546, coordType: 'top',
    kind: 'Trap op een oude mijnberg',
    topM: 225, climbM: 75,
    example: '508 treden, 75 tot 80 m per keer: 10 keer is ±750 m D+ en D−. Dichter bij een alpendag kom je in Nederland niet.',
    uses: ['trap', 'bergop', 'bergaf', 'rugzak'],
    terrain: 'Trap',
    access: 'Vrij toegankelijk.',
    station: { name: 'Landgraaf', km: 2.4 },
    tip: 'De langste buitentrap van Nederland. Een weekend hier is een sterke sleuteltraining voor de GR5.',
    caveat: 'Het hoogteverschil van de trap verschilt per bron (75 of 80 m).',
    region: 'elders',
    sources: [{ label: 'Runners.nl, hoogste trap van Nederland', url: 'https://www.runners.nl/nieuws/1285207/hoogste-trap-nederland' }, BERGEN_MAGAZINE],
  },
  {
    id: 'vaalserberg',
    name: 'Vaalserberg',
    place: 'Vaals',
    province: 'Limburg',
    lat: 50.75598, lon: 6.01922, coordType: 'top',
    kind: 'Heuvel, hoogste punt van Nederland',
    topM: 322, climbM: 120,
    example: 'De noordwand: 3 km met 120 m D+. Het Salomon-trail geeft 1.300 m D+ in ruim 40 km.',
    uses: ['bergop', 'bergaf', 'lange tocht', 'rugzak'],
    terrain: 'Bospaden en heuvels',
    access: 'Vrij toegankelijk. Geen station in Vaals, wel met de bus.',
    tip: 'Zuid-Limburg is het enige gebied met echt lange klimmen. Ideaal voor een back-to-back weekend.',
    region: 'elders',
    sources: [MUDSWEAT, HEUVELS],
  },
  {
    id: 'vam-berg',
    name: 'VAM-berg',
    place: 'Wijster',
    province: 'Drenthe',
    lat: 52.79143, lon: 6.52469, coordType: 'top',
    kind: 'Bult (voormalige stortplaats)',
    topM: 63, climbM: 48,
    example: 'Klimroutes van gemiddeld 10%, tot 16,5% steil, met een aparte afdaalroute.',
    uses: ['bergop', 'bergaf', 'heuvelintervallen'],
    terrain: 'Paden en steenblokken, steil',
    access: 'Openingstijden niet gecontroleerd; het ligt op een afvalterrein.',
    station: { name: 'Beilen', km: 7.1 },
    tip: 'Een van de weinige plekken in Nederland met echt steile hellingen om bergaf te oefenen.',
    caveat: 'Controleer de openingstijden voor je gaat.',
    region: 'elders',
    sources: [{ label: 'Drenthe.nl, VAM-berg', url: 'https://www.drenthe.nl/locaties/61224200/vam-berg' }, { label: 'Nationale Parken, wandelen over een afvalberg', url: 'https://nationaleparken.nl/en/parks/nationaal-park-dwingelderveld/fietsen-en-wandelen-over-een-afvalberg' }],
  },
  {
    id: 'schoorlse-duinen',
    name: 'Schoorlse Duinen',
    place: 'Schoorl',
    province: 'Noord-Holland',
    lat: 52.70083, lon: 4.66399, coordType: 'gebied',
    kind: 'Duinen',
    topM: 55,
    example: 'Ongeveer 350 m D+ in 10 km over de duinen.',
    uses: ['bergop', 'bergaf', 'lange tocht'],
    terrain: 'Zand en bospad',
    access: 'Vrij toegankelijk, meer dan 60 km gemarkeerde paden.',
    tip: 'Mul zand traint je kuiten en enkels extra. Bergaf in het zand is zacht voor je knieën.',
    region: 'elders',
    sources: [MUDSWEAT],
  },
  {
    id: 'holterberg',
    name: 'Holterberg en Sallandse Heuvelrug',
    place: 'Holten',
    province: 'Overijssel',
    lat: 52.31855, lon: 6.42107, coordType: 'top',
    kind: 'Stuwwal',
    topM: 60,
    example: 'Lange tochten over de Sallandse Heuvelrug, tot ±75 m hoog.',
    uses: ['bergop', 'bergaf', 'lange tocht'],
    terrain: 'Bos en heide',
    access: 'Vrij toegankelijk.',
    station: { name: 'Holten', km: 3.8 },
    tip: 'De Grote Koningsbelt is het hoogste punt van de Sallandse Heuvelrug.',
    caveat: 'De hoogte van de Holterberg verschilt per bron (59,5 of 62 m).',
    region: 'elders',
    sources: [MUDSWEAT, HEUVELS],
  },
];

// Training in a flat place without a hill nearby.
export const FLAT_COUNTRY_TIPS: string[] = [
  'Een trappenhuis telt ook: het aantal verdiepingen keer 3 m is je D+ en D−. Loop bewust naar beneden, juist dat traint bergaf.',
  'Doe bergaf langzaam en gecontroleerd. Je bovenbenen remmen bij elke stap; dat is wat op een bergtocht het meest pijn doet.',
  'Een loopband of trapmachine traint alleen bergop. Voor bergaf heb je een echte trap, heuvel of duin nodig.',
  'Doe je eerste flinke afdaling minstens 2 weken voor vertrek, en blijf daarna af en toe bergaf trainen, zodat je benen beschermd blijven.',
];

// Places to set as "home" without location access: station coordinates
// of larger towns (approximate, only used for distance).
export const HOME_PLACES: { name: string; lat: number; lon: number }[] = [
  { name: 'Amersfoort', lat: 52.1539, lon: 5.3741 },
  { name: 'Utrecht', lat: 52.0894, lon: 5.1098 },
  { name: 'Amsterdam', lat: 52.3789, lon: 4.9003 },
  { name: 'Apeldoorn', lat: 52.2092, lon: 5.9701 },
  { name: 'Arnhem', lat: 51.9849, lon: 5.8987 },
  { name: 'Barneveld', lat: 52.1408, lon: 5.5845 },
  { name: 'Den Haag', lat: 52.0810, lon: 4.3240 },
  { name: 'Ede', lat: 52.0270, lon: 5.6710 },
  { name: 'Eindhoven', lat: 51.4433, lon: 5.4813 },
  { name: 'Groningen', lat: 53.2105, lon: 6.5642 },
  { name: 'Hilversum', lat: 52.2259, lon: 5.1813 },
  { name: 'Houten', lat: 52.0340, lon: 5.1690 },
  { name: 'Leusden', lat: 52.1320, lon: 5.4290 },
  { name: 'Maastricht', lat: 50.8496, lon: 5.7056 },
  { name: 'Nijmegen', lat: 51.8430, lon: 5.8536 },
  { name: 'Rotterdam', lat: 51.9250, lon: 4.4690 },
  { name: 'Soest', lat: 52.1740, lon: 5.2920 },
  { name: 'Veenendaal', lat: 52.0293, lon: 5.5622 },
  { name: 'Zeist', lat: 52.0894, lon: 5.2333 },
  { name: 'Zwolle', lat: 52.5050, lon: 6.0915 },
];

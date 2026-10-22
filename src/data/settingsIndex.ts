// ASCEND: de index van alle instellingen, voor het zoekveld bovenaan Meer
// (engine/settingsSearch.ts). Besluit: docs/beslissingen/2026-10-22-alles-instelbaar.md.
//
// Elke instelling staat hier met een titel, één korte zin uitleg in gewone
// woorden, de groep waar hij bij hoort, en trefwoorden en synoniemen: wat
// iemand intypt hoeft niet de titel te zijn ("horloge" vindt Garmin). Het
// eerste trefwoord is het belangrijkste synoniem en telt iets zwaarder.
//
// Een instelling zonder `route` staat op de pagina Meer zelf: het element heeft
// het anker `instelling-<id>` en het zoekresultaat scrolt ernaartoe. Met `route`
// opent het zoekresultaat die pagina. Een nieuwe instelling komt hier én in de
// juiste groep op de pagina; dat is onderdeel van "af".

export type SettingsGroupId = 'training' | 'doelen' | 'overzichten' | 'koppelingen' | 'gegevens' | 'gidsen';

export interface SettingsGroup {
  id: SettingsGroupId;
  title: string;
  note: string;
}

// De vaste volgorde van de groepen.
export const SETTINGS_GROUPS: SettingsGroup[] = [
  { id: 'training', title: 'Training', note: 'Hoe vaak, hoe zwaar en wanneer ASCEND je laat trainen.' },
  { id: 'doelen', title: 'Doelen en tochten', note: 'Waar je naartoe werkt, en de dagen dat je vrij bent of op pad gaat.' },
  { id: 'overzichten', title: 'Overzichten en vragen', note: 'Wat ASCEND je laat zien, vraagt en voorstelt. Alles mag uit.' },
  { id: 'koppelingen', title: 'Koppelingen', note: 'Horloge en voeding: wat ASCEND van waar overneemt.' },
  { id: 'gegevens', title: 'Gegevens en back-up', note: 'Alles staat op deze telefoon. Hier bewaar en herstel je het.' },
  { id: 'gidsen', title: 'Gidsen en kennis', note: 'Uitleg, kennis voor onderweg en de bronnen achter de adviezen.' },
];

export interface SettingsIndexItem {
  id: string;
  title: string;
  note: string;
  group: SettingsGroupId;
  keywords: string[];
  route?: string;
}

export const settingsAnchor = (id: string) => `instelling-${id}`;

export const SETTINGS_INDEX: SettingsIndexItem[] = [
  // Training
  { id: 'sporten', title: 'Sporten', group: 'training', note: 'Welke sporten ASCEND mag inplannen en hoe vaak per week.', keywords: ['hardlopen', 'lopen', 'wandelen', 'fietsen', 'frequentie', 'hoe vaak', 'per week'] },
  { id: 'wijzigingen', title: 'Wijzigingen toepassen', group: 'training', note: 'Of ASCEND eerst vraagt voordat de planning verandert, of kleine dingen zelf doet.', keywords: ['akkoord', 'bevestigen', 'automatisch', 'vragen', 'voorstel', 'planning'] },
  { id: 'trainingstijd', title: 'Trainingstijd per dag', group: 'training', note: 'Hoeveel tijd je normaal hebt per dag.', keywords: ['tijd', 'minuten', 'budget', 'dagbudget', 'uur', 'beschikbaar'] },
  { id: 'rustdag', title: 'Rustdag', group: 'training', note: 'Op welke dag je rust, en wat je dan doet.', keywords: ['rust', 'vrije dag', 'hersteldag', 'herstel', 'maandag'] },
  { id: 'meerdere', title: 'Meerdere trainingen op één dag', group: 'training', note: 'Of ASCEND twee sessies op één dag mag plannen.', keywords: ['dubbel', 'twee keer', 'zelfde dag', 'combineren', 'samen', 'zware dingen'] },
  { id: 'kracht', title: 'Krachttraining bijhouden', group: 'training', note: 'Of je sets en gewichten in ASCEND of in MacroFactor bijhoudt, en hoe lang een training duurt.', keywords: ['kracht', 'gym', 'sets', 'herhalingen', 'reps', 'macrofactor', 'duur', 'fitness'] },
  { id: 'forge', title: 'Kracht meerekenen (Forge)', group: 'training', note: 'ASCEND rekent stil mee met je krachttrainingen uit MacroFactor en stelt voor wat je de volgende keer kunt doen.', keywords: ['forge', 'kracht', 'gym', 'sets', 'gewicht', 'progressie', 'voorstel', 'rir', 'macrofactor'], route: '/forge' },
  { id: 'forge-volgorde', title: 'Eerst gewicht of eerst herhalingen', group: 'training', note: 'Wat ASCEND eerst ophoogt als het goed gaat in je krachttraining.', keywords: ['forge', 'kracht', 'progressie', 'dubbele progressie', 'zwaarder', 'herhalingen', 'gewicht'] },
  { id: 'forge-sets', title: 'Werksets dalend of gelijk', group: 'training', note: 'Of elke volgende set een tikje lichter is door vermoeidheid, of alle sets gelijk.', keywords: ['forge', 'kracht', 'sets', 'vermoeidheid', 'dalend', 'gelijk', 'gewicht per set'] },
  { id: 'forge-opwarmen', title: 'Opwarmsets bij kracht', group: 'training', note: 'Slim uit je geschatte kracht, een vast schema van 40, 60 en 80 procent, of uit.', keywords: ['forge', 'kracht', 'opwarmen', 'opwarmset', 'warming-up', 'schema', 'slim'] },
  { id: 'forge-bereik', title: 'Bereik verbreden bij grove stappen', group: 'training', note: 'Een toestel met grote stappen mag tijdelijk meer herhalingen vragen zonder dat het plan verandert.', keywords: ['forge', 'kracht', 'bereik', 'herhalingen', 'stap', 'kabel', 'toestel'] },
  { id: 'forge-schatting', title: 'Sets die meetellen voor je kracht', group: 'training', note: 'Tot hoeveel herhalingen een set meetelt voor de schatting van je kracht. Standaard 20, het strengst is 12.', keywords: ['forge', 'kracht', 'schatting', 'geschatte kracht', 'e1rm', 'maximum', 'herhalingen'] },
  { id: 'sportschool', title: 'Je sportschool', group: 'training', note: 'Stangen, schijven, dumbbells en de stap van kabels en toestellen, zodat voorstellen kloppen met wat er is.', keywords: ['forge', 'kracht', 'schijven', 'stang', 'dumbbells', 'kabel', 'toestel', 'gym', 'gewichten', 'afronden'] },
  { id: 'ambitie', title: 'Ambitie', group: 'training', note: 'Hoe snel hardlopen en wandelen opbouwen.', keywords: ['tempo', 'opbouw', 'rustig', 'stevig', 'progressie', 'snelheid'] },
  { id: 'hartslag', title: 'Mijn hartslag', group: 'training', note: 'Je eigen hartslagwaarden, zodat zones in slagen per minuut staan.', keywords: ['zones', 'bpm', 'maximale hartslag', 'rusthartslag', 'drempel', 'horloge'] },
  { id: 'blessures', title: 'Blessures', group: 'training', note: 'Waar je last van hebt, zodat ASCEND er rekening mee houdt.', keywords: ['pijn', 'last', 'knie', 'enkel', 'gezondheid', 'ziek'], route: '/blessures' },
  { id: 'lichaamsgewicht', title: 'Lichaamsgewicht', group: 'training', note: 'Je trendgewicht, voor rugzakgewicht als deel van je lichaamsgewicht.', keywords: ['gewicht', 'kilo', 'kg', 'wegen', 'weegschaal', 'herinnering'] },

  // Doelen en tochten
  { id: 'programma', title: 'Programma en fases', group: 'doelen', note: 'In welke week en fase je zit, en de lengte van de fases.', keywords: ['fase', 'week', 'opnieuw beginnen', 'schone start', 'opbouw', 'afbouwen', 'taper'] },
  { id: 'lange-zondag', title: 'De lange zondag', group: 'doelen', note: 'Of je op zondag een bergtocht of een lange duurloop doet.', keywords: ['zondag', 'bergtocht', 'duurloop', 'wandeling', 'marathon'] },
  { id: 'doelen', title: 'Doelen en tussendoelen', group: 'doelen', note: 'Je hoofddoel, je tochten en de stappen ertussen.', keywords: ['gr5', 'doel', 'tocht', 'wedstrijd', 'datum', 'mijlpaal', 'sneeuwhike', 'weekend'], route: '/ascend/doelen' },
  { id: 'rugzak', title: 'Rugzakgewicht', group: 'doelen', note: 'Hoe zwaar je rugzak wordt in de zwaarste weken, per doel.', keywords: ['rugzak', 'gewicht', 'kilo', 'tent', 'slaapzak', 'bepakking', 'pack'], route: '/ascend/doelen' },
  { id: 'volgende-tocht', title: 'Eerstvolgende tocht op Vandaag', group: 'doelen', note: 'Of je volgende tocht als regel op Vandaag staat.', keywords: ['tocht', 'sneeuwhike', 'weekend', 'aftellen', 'trek', 'vandaag'] },
  { id: 'rust-na-tocht', title: 'Soepele rust na een bergtocht', group: 'doelen', note: 'Aan: een zware beendag mag in de korte versie al 48 uur na je tocht. Uit: ASCEND houdt 72 uur. Dit geldt voor nieuwe en gewijzigde tochten; een tocht die al staat, houdt zijn planning tot je hem wijzigt.', keywords: ['tocht', 'bergtocht', 'rust', 'benen', 'beendag', '72 uur', '48 uur', 'soepel', 'streng', 'herstel'] },
  { id: 'vrije-dagen', title: 'Vrije dagen en vakanties', group: 'doelen', note: 'Dagen zonder training, een vakantie of een tocht, te vinden op Week.', keywords: ['vakantie', 'vrij', 'verlof', 'trek', 'reis', 'afwezig', 'weekend weg'], route: '/week' },
  { id: 'reisplanner', title: 'Reisplanner', group: 'doelen', note: 'Wat je nog moet regelen voor de grote tocht.', keywords: ['reis', 'taken', 'voorbereiding', 'gr5', 'boeken'], route: '/reis' },
  { id: 'paklijst', title: 'Paklijst', group: 'doelen', note: 'Wat er in je rugzak gaat en wat dat weegt.', keywords: ['rugzak', 'gewicht', 'spullen', 'tent', 'uitrusting', 'inpakken'], route: '/reis/paklijst' },

  // Overzichten en vragen
  { id: 'weekterugblik', title: 'Weekterugblik', group: 'overzichten', note: 'Een korte terugblik op je week, op Vandaag.', keywords: ['terugblik', 'samenvatting', 'overzicht', 'week', 'review', 'evaluatie'] },
  { id: 'weekterugblik-dag', title: 'Dag van de weekterugblik', group: 'overzichten', note: 'Op welke dag de terugblik verschijnt.', keywords: ['zondag', 'maandag', 'terugblik', 'wanneer', 'dag'] },
  { id: 'weekvraag', title: 'Vraag van de week', group: 'overzichten', note: 'Elke week één vraag om je plan scherp te houden.', keywords: ['vraag', 'stoïcijns', 'stoisch', 'intentie', 'plan', 'week'] },
  { id: 'ochtendcheck', title: 'Ochtendcheck', group: 'overzichten', note: 'Een korte vraag over benen, energie en slaap, voor je training. Een pijnplek blijft altijd gevolgd.', keywords: ['ochtend', 'check', 'slaap', 'benen', 'energie', 'moe', 'spierpijn', 'hrv', 'horloge'] },
  { id: 'weerregel', title: 'Weer bij je training', group: 'overzichten', note: 'Een regel met het weer bij je buitentraining.', keywords: ['weer', 'regen', 'temperatuur', 'wind', 'onweer', 'voorspelling', 'buien'] },
  { id: 'weerruil', title: 'Ruilvoorstellen bij slecht weer', group: 'overzichten', note: 'ASCEND stelt voor een buitentraining te ruilen als het weer slecht wordt.', keywords: ['weer', 'ruilen', 'verplaatsen', 'regen', 'storm', 'onweer', 'voorstel'] },
  { id: 'kledingadvies', title: 'Kledingadvies bij het weer', group: 'overzichten', note: 'Bij een buitentraining een paar regels over wat je aantrekt, op basis van het weer.', keywords: ['kleding', 'jas', 'muts', 'handschoenen', 'aantrekken', 'warm', 'koud', 'regenjas', 'windjack', 'zonnebrand', 'lampje', 'weer'] },
  { id: 'kleding-voorkeur', title: 'Terug naar de standaard', group: 'overzichten', note: 'Zet wat ASCEND van je kleding leerde terug naar de standaard.', keywords: ['kleding', 'voorkeur', 'te warm', 'te koud', 'terugzetten', 'standaard', 'reset', 'leren'] },
  { id: 'weerplaats', title: 'Plaats voor het weer', group: 'overzichten', note: 'Waarvoor ASCEND het weer opzoekt. Alleen de plaatsnaam gaat de deur uit.', keywords: ['weer', 'stad', 'woonplaats', 'locatie', 'plaats', 'open-meteo', 'privacy'], route: '/weer' },
  { id: 'citaten', title: 'Citaten na een training', group: 'overzichten', note: 'Een citaat op het rustige scherm na een training. Uit zetten haalt alleen het citaat weg.', keywords: ['citaat', 'quote', 'gedaan', 'afronden', 'feestje', 'scherm', 'mijlpaal'] },
  { id: 'geluid', title: 'Geluidseffecten', group: 'overzichten', note: 'Een paar lage tonen bij het openen en een klank bij een voltooide training.', keywords: ['geluid', 'audio', 'tonen', 'klank', 'stil', 'trommel', 'uitzetten', 'timer'] },

  // Koppelingen
  { id: 'garmin', title: 'Garmin koppelen via intervals.icu', group: 'koppelingen', note: 'Trainingen van je horloge komen vanzelf binnen, zonder overtypen.', keywords: ['horloge', 'garmin', 'intervals', 'intervals.icu', 'sync', 'koppelen', 'smartwatch', 'activiteiten'], route: '/koppelen/garmin' },
  { id: 'horloge-gebruik', title: 'Wat ASCEND van je horloge gebruikt', group: 'koppelingen', note: 'Per soort gegeven aan of uit: trainingen, slaap, rusthartslag en HRV.', keywords: ['horloge', 'slaap', 'hrv', 'rusthartslag', 'hartslag', 'garmin', 'vanzelf afvinken', 'afvinken'], route: '/koppelen/garmin' },
  { id: 'macrofactor', title: 'MacroFactor inlezen', group: 'koppelingen', note: 'Krachttrainingen en gewicht uit je export, met echte duur en herhalingen in reserve.', keywords: ['macrofactor', 'voeding', 'export', 'import', 'kracht', 'sets', 'rir', 'inlezen'], route: '/koppelen/macrofactor' },
  { id: 'macrofactor-gewicht', title: 'Gewicht uit MacroFactor gebruiken', group: 'koppelingen', note: 'Of ASCEND rekent met het gewicht uit je MacroFactor-export.', keywords: ['gewicht', 'macrofactor', 'kilo', 'trendgewicht', 'weegschaal', 'rugzak'], route: '/koppelen/macrofactor' },
  { id: 'health-connect', title: 'Health Connect', group: 'koppelingen', note: 'Komt later. Dan kan Android zelf gegevens aan ASCEND geven.', keywords: ['android', 'google', 'binnenkort', 'gezondheid', 'stappen'] },

  // Gegevens en back-up
  { id: 'backup', title: 'Back-up', group: 'gegevens', note: 'Bewaar al je gegevens in een bestand, of zet er een terug.', keywords: ['exporteren', 'importeren', 'export', 'import', 'bestand', 'bewaren', 'terugzetten', 'herstellen', 'json'] },
  { id: 'backupmap', title: 'Back-upmap', group: 'gegevens', note: 'Een vaste map waar de back-up automatisch naartoe gaat.', keywords: ['map', 'folder', 'downloads', 'vaste plek', 'export'] },
  { id: 'opslag', title: 'Opslag beschermen', group: 'gegevens', note: 'Vraagt de telefoon om je gegevens niet zomaar op te ruimen.', keywords: ['opslag', 'beveiligen', 'verlies', 'wissen', 'browser', 'persistent'] },
  { id: 'momentopnamen', title: 'Momentopnamen', group: 'gegevens', note: 'Een kopie die ASCEND maakt vóór een import, om terug te kunnen.', keywords: ['snapshot', 'kopie', 'terug', 'ongedaan', 'import'] },
  { id: 'versie', title: 'Versie en bijwerken', group: 'gegevens', note: 'Welke versie je hebt, en zoeken naar een nieuwere.', keywords: ['update', 'bijwerken', 'nieuwe versie', 'vernieuwen', 'build'] },
  { id: 'startniveau', title: 'Startniveau zelf invullen', group: 'gegevens', note: 'Meestal niet nodig: ASCEND vraagt zelf wat nog ontbreekt.', keywords: ['baseline', 'niveau', 'conditie', 'bewijs', 'invullen', 'beginnen'] },
  { id: 'herbouwen', title: 'Aanbevelingen opnieuw berekenen', group: 'gegevens', note: 'Laat ASCEND nu meteen opnieuw kijken. Er wordt niets verwijderd.', keywords: ['herbouw', 'adviezen', 'vernieuwen', 'opnieuw', 'aanbevelingen'] },
  { id: 'wissen', title: 'Alles verwijderen', group: 'gegevens', note: 'Wist alles op deze telefoon en begint opnieuw. Dit kan niet terug.', keywords: ['reset', 'wissen', 'leegmaken', 'opnieuw beginnen', 'verwijderen', 'demo'] },

  // Gidsen en kennis
  { id: 'kennisbank', title: 'Kennisbank', group: 'gidsen', note: 'Navigeren, weer, sneeuw, slapen en meer: alles voor onderweg.', keywords: ['kennis', 'leren', 'tips', 'navigatie', 'sneeuw', 'slapen', 'veiligheid'], route: '/kennis' },
  { id: 'trainingsgids', title: 'Trainingsgids', group: 'gidsen', note: 'Het doel, de uitvoering en waar je op let per trainingsdag.', keywords: ['uitleg', 'training', 'gids', 'hoe', 'uitvoering', 'oefeningen'], route: '/gids' },
  { id: 'garmin-gids', title: 'Garmin-gids', group: 'gidsen', note: 'Zones, dataschermen en hoe je de cijfers van je horloge leest.', keywords: ['horloge', 'garmin', 'zones', 'dataschermen', 'metrics', 'uitleg'], route: '/garmin' },
  { id: 'plekken', title: 'Trainingsplekken', group: 'gidsen', note: 'Waar je in Nederland bergop en bergaf kunt trainen.', keywords: ['heuvels', 'trap', 'helling', 'bergop', 'locatie', 'dichtbij', 'woonplaats'], route: '/plekken' },
  { id: 'weer-gids', title: 'Weer', group: 'gidsen', note: 'Hoe ASCEND het weer voor je training beoordeelt, en waar het vandaan komt.', keywords: ['weer', 'voorspelling', 'open-meteo', 'regen', 'wind', 'regels'], route: '/weer' },
  { id: 'bronnen', title: 'Bronnen', group: 'gidsen', note: 'Alle onderzoeken en bronnen achter de adviezen.', keywords: ['onderzoek', 'wetenschap', 'studie', 'literatuur', 'waarom', 'bewijs'], route: '/bronnen' },
];

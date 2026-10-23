// ASCEND: de index van alle instellingen, voor het zoekveld bovenaan Instellingen
// (engine/settingsSearch.ts). Besluiten: docs/beslissingen/2026-10-22-alles-instelbaar.md
// en docs/beslissingen/2026-10-22-instellingen-in-groepen.md.
//
// Elke instelling staat hier met een titel, één korte zin uitleg in gewone
// woorden, de groep (een van de acht pagina's) waar hij bij hoort, en
// trefwoorden en synoniemen: wat iemand intypt hoeft niet de titel te zijn
// ("horloge" vindt Garmin). Het eerste trefwoord is het belangrijkste synoniem en
// telt iets zwaarder.
//
// Waar de instelling precies staat (de rij, en of er een blad opent) staat in
// data/settingsLayout.ts; het anker van die rij is `instelling-<id>`. `route` is de
// pagina die de instelling zelf opent, als hij die heeft (Garmin, Reisplanner).
// Een nieuwe instelling komt hier, in settingsLayout.ts en in
// engine/settingsSummary.ts (de waarde in de rij); een test bewaakt dat dit klopt.

import type { SettingsPageId } from './settingsLayout';

export type SettingsGroupId = SettingsPageId;

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
  { id: 'sporten', title: 'Sporten', group: 'planning', note: 'Welke sporten ASCEND mag inplannen en hoe vaak per week.', keywords: ['hardlopen', 'lopen', 'wandelen', 'fietsen', 'frequentie', 'hoe vaak', 'per week'] },
  { id: 'sport-per-week', title: 'Hoe vaak per week', group: 'planning', note: 'Per sport een vast aantal keer per week, of automatisch.', keywords: ['hardlopen', 'wandelen', 'fietsen', 'frequentie', 'keer per week', 'auto'] },
  { id: 'wijzigingen', title: 'Wijzigingen toepassen', group: 'planning', note: 'Of ASCEND eerst vraagt voordat de planning verandert, of kleine dingen zelf doet.', keywords: ['akkoord', 'bevestigen', 'automatisch', 'vragen', 'voorstel', 'planning'] },
  { id: 'trainingstijd', title: 'Trainingstijd per dag', group: 'planning', note: 'Hoeveel tijd je normaal hebt per dag.', keywords: ['tijd', 'minuten', 'budget', 'dagbudget', 'uur', 'beschikbaar'] },
  { id: 'rustdag', title: 'Rustdag', group: 'planning', note: 'Op welke dag je rust, en wat je dan doet. Een andere dag laat eerst zien wat er verschuift.', keywords: ['rust', 'vrije dag', 'hersteldag', 'herstel', 'maandag'] },
  { id: 'rustdag-doen', title: 'Op je rustdag', group: 'planning', note: 'Rust, of een lichte hersteldag van 20 tot 30 minuten.', keywords: ['rust', 'hersteldag', 'wandelen', 'actief herstel'] },
  { id: 'meerdere', title: 'Twee trainingen per dag', group: 'planning', note: 'Of ASCEND twee sessies op één dag mag plannen.', keywords: ['meerdere', 'dubbel', 'twee keer', 'zelfde dag', 'combineren', 'samen', 'zware dingen'] },
  { id: 'zware-dingen', title: 'Benen en een zware loop', group: 'planning', note: 'Zware beentraining en een zware loop op dezelfde dag, eerst de loop.', keywords: ['zware dingen', 'heuvels', 'zelfde dag', 'beentraining', 'kracht'] },
  { id: 'kracht', title: 'Krachttraining bijhouden', group: 'forge', note: 'Of je sets en gewichten in ASCEND of in MacroFactor bijhoudt, en hoe lang een training duurt.', keywords: ['kracht', 'gym', 'sets', 'herhalingen', 'reps', 'macrofactor', 'duur', 'fitness'] },
  { id: 'trainingsduur', title: 'Trainingsduur', group: 'forge', note: 'Hoe lang een krachttraining duurt, geleerd uit je trainingen.', keywords: ['duur', 'minuten', 'hoe lang', 'kracht', 'schatten', 'leren'] },
  { id: 'forge', title: 'Kracht meerekenen (Forge)', group: 'forge', note: 'ASCEND rekent stil mee met je krachttrainingen uit MacroFactor en stelt voor wat je de volgende keer kunt doen.', keywords: ['forge', 'kracht', 'gym', 'sets', 'gewicht', 'progressie', 'voorstel', 'rir', 'macrofactor'], route: '/forge' },
  { id: 'forge-volgorde', title: 'Eerst gewicht of herhalingen', group: 'forge', note: 'Wat ASCEND eerst ophoogt als het goed gaat in je krachttraining.', keywords: ['forge', 'kracht', 'progressie', 'dubbele progressie', 'zwaarder', 'herhalingen', 'gewicht'] },
  { id: 'forge-sets', title: 'Werksets dalend of gelijk', group: 'forge', note: 'Of elke volgende set een tikje lichter is door vermoeidheid, of alle sets gelijk.', keywords: ['forge', 'kracht', 'sets', 'vermoeidheid', 'dalend', 'gelijk', 'gewicht per set'] },
  { id: 'forge-opwarmen', title: 'Opwarmsets bij kracht', group: 'forge', note: 'Slim uit je geschatte kracht, een vast schema van 40, 60 en 80 procent, of uit.', keywords: ['forge', 'kracht', 'opwarmen', 'opwarmset', 'warming-up', 'schema', 'slim'] },
  { id: 'forge-bereik', title: 'Bereik verbreden', group: 'forge', note: 'Een toestel met grote stappen mag tijdelijk meer herhalingen vragen zonder dat het plan verandert.', keywords: ['forge', 'kracht', 'bereik', 'herhalingen', 'stap', 'kabel', 'toestel'] },
  { id: 'forge-schatting', title: 'Sets die meetellen', group: 'forge', note: 'Tot hoeveel herhalingen een set meetelt voor de schatting van je kracht. Standaard 20, het strengst is 12.', keywords: ['forge', 'kracht', 'schatting', 'geschatte kracht', 'e1rm', 'maximum', 'herhalingen'] },
  { id: 'forge-rust', title: 'Rusttimer vanzelf', group: 'forge', note: 'De rusttimer start na elke werkset en na je laatste opwarmset, met een tijd per oefening.', keywords: ['forge', 'kracht', 'rust', 'rusttijd', 'timer', 'pauze', 'sets', 'workout'] },
  { id: 'forge-geluid', title: 'Geluid na de rust', group: 'forge', note: 'Klokjes, een bel of de korte piep.', keywords: ['forge', 'rust', 'timer', 'geluid', 'toon', 'deuntje', 'bel', 'piep'] },
  { id: 'forge-signaal', title: 'Signaal als de rust om is', group: 'forge', note: 'Geluid en trillen, alleen een van de twee, of niets.', keywords: ['forge', 'rust', 'timer', 'geluid', 'trillen', 'piep', 'ping', 'melding'] },
  { id: 'forge-scherm', title: 'Scherm aan tijdens je training', group: 'forge', note: 'Het scherm blijft aan zolang het workoutscherm open is.', keywords: ['forge', 'scherm', 'aan', 'wake lock', 'slaapstand', 'display', 'sportschool'] },
  { id: 'forge-doorgeven', title: 'Gewicht doorgeven aan volgende sets', group: 'forge', note: 'Pas je bij de eerste set het gewicht aan, dan nemen de sets na die set dat verschil over, zolang je ze niet zelf aanraakte.', keywords: ['forge', 'kracht', 'gewicht', 'doorgeven', 'overnemen', 'sets', 'workout', 'invoer'] },
  { id: 'forge-schijven', title: 'Schijven bij de set tonen', group: 'forge', note: 'Onder een werkset met een stang staat een kleine regel met de schijven per kant.', keywords: ['forge', 'schijven', 'stang', 'per kant', 'calculator', 'sets', 'workout'] },
  { id: 'forge-programma', title: 'Programma uit MacroFactor', group: 'forge', note: 'Je krachttrainingen volgen het programma uit je MacroFactor-export, per week, of weer dat van ASCEND.', keywords: ['forge', 'programma', 'schema', 'macrofactor', 'oefeningen', 'sets', 'herhalingen', 'rir', 'loslaten', 'cycle', 'week'] },
  { id: 'sportschool', title: 'Je sportschool', group: 'forge', note: 'Tik aan welke stangen en schijven er liggen, kies de reeks dumbbells en de stap van kabels en toestellen, zodat voorstellen kloppen met wat er is.', keywords: ['forge', 'kracht', 'schijven', 'stang', 'ez-stang', 'dumbbells', 'kabel', 'toestel', 'gym', 'gewichten', 'afronden', 'eigen gewicht', 'stap'] },
  { id: 'stangen', title: 'Stangen', group: 'forge', note: 'Het gewicht van de lege stangen in je sportschool.', keywords: ['sportschool', 'barbell', 'ez-stang', 'forge', 'gewichten'] },
  { id: 'schijven', title: 'Schijven', group: 'forge', note: 'Welke schijven er liggen, zodat gewichten kloppen.', keywords: ['sportschool', 'gewichten', 'plates', 'forge', 'afronden'] },
  { id: 'dumbbells', title: 'Dumbbells', group: 'forge', note: 'Van de lichtste tot de zwaarste, en de stap ertussen.', keywords: ['sportschool', 'halters', 'rek', 'forge', 'gewichten'] },
  { id: 'kabels', title: 'Kabels en toestellen', group: 'forge', note: 'Hoeveel het gewichtenblok per stand zwaarder wordt.', keywords: ['sportschool', 'toestel', 'stack', 'blok', 'forge'] },
  { id: 'ambitie', title: 'Ambitie', group: 'planning', note: 'Hoe snel hardlopen en wandelen opbouwen.', keywords: ['tempo', 'opbouw', 'rustig', 'stevig', 'progressie', 'snelheid'] },
  { id: 'hartslag', title: 'Mijn hartslag', group: 'lichaam', note: 'Je eigen hartslagwaarden, zodat zones in slagen per minuut staan.', keywords: ['zones', 'bpm', 'maximale hartslag', 'rusthartslag', 'drempel', 'horloge'] },
  { id: 'blessures', title: 'Blessures', group: 'lichaam', note: 'Waar je last van hebt, zodat ASCEND er rekening mee houdt.', keywords: ['pijn', 'last', 'knie', 'enkel', 'gezondheid', 'ziek'], route: '/blessures' },
  { id: 'lichaamsgewicht', title: 'Lichaamsgewicht', group: 'lichaam', note: 'Je trendgewicht, voor rugzakgewicht als deel van je lichaamsgewicht.', keywords: ['gewicht', 'kilo', 'kg', 'wegen', 'weegschaal', 'herinnering'] },
  { id: 'herinnering-gewicht', title: 'Herinnering voor je gewicht', group: 'lichaam', note: 'Hoe vaak Vandaag vraagt om je trendgewicht bij te werken.', keywords: ['gewicht', 'wegen', 'herinnering', 'weekgewicht', 'elke week', 'nooit'] },

  { id: 'programma', title: 'Programma en fases', group: 'doel', note: 'In welke week en fase je zit, en de lengte van de fases.', keywords: ['fase', 'week', 'opnieuw beginnen', 'schone start', 'opbouw', 'afbouwen', 'taper'] },
  { id: 'lange-zondag', title: 'De lange zondag', group: 'doel', note: 'Of je op zondag een bergtocht of een lange duurloop doet.', keywords: ['zondag', 'bergtocht', 'duurloop', 'wandeling', 'marathon'] },
  { id: 'na-hoofddoel', title: 'Na je hoofddoel', group: 'doel', note: 'Of ASCEND na de GR5 niets meer plant (advies) of onderhoudsweken. Tijdens de tocht nooit.', keywords: ['na de gr5', 'onderhoud', 'onderhoudsweken', 'daarna', 'na het doel', 'klaar', 'voorbij'] },
  { id: 'doelen', title: 'Doelen en tussendoelen', group: 'doel', note: 'Je hoofddoel, je tochten en de stappen ertussen.', keywords: ['gr5', 'doel', 'tocht', 'wedstrijd', 'datum', 'mijlpaal', 'sneeuwhike', 'weekend'], route: '/ascend/doelen' },
  { id: 'rugzak', title: 'Rugzakgewicht', group: 'doel', note: 'Hoe zwaar je rugzak wordt in de zwaarste weken, per doel.', keywords: ['rugzak', 'gewicht', 'kilo', 'tent', 'slaapzak', 'bepakking', 'pack'], route: '/ascend/doelen' },
  { id: 'volgende-tocht', title: 'Volgende tocht op Vandaag', group: 'doel', note: 'Of je volgende tocht als regel op Vandaag staat.', keywords: ['tocht', 'sneeuwhike', 'weekend', 'aftellen', 'trek', 'vandaag'] },
  { id: 'rust-na-tocht', title: 'Rust na een bergtocht', group: 'doel', note: 'Aan: een zware beendag mag in de korte versie al 48 uur na je tocht. Uit: ASCEND houdt 72 uur. Dit geldt voor nieuwe en gewijzigde tochten; een tocht die al staat, houdt zijn planning tot je hem wijzigt.', keywords: ['tocht', 'bergtocht', 'rust', 'benen', 'beendag', '72 uur', '48 uur', 'soepel', 'streng', 'herstel'] },
  { id: 'vrije-dagen', title: 'Vrije dagen en vakanties', group: 'doel', note: 'Dagen zonder training, een vakantie of een tocht, te vinden op Week.', keywords: ['vakantie', 'vrij', 'verlof', 'trek', 'reis', 'afwezig', 'weekend weg'], route: '/week' },
  { id: 'reisplanner', title: 'Reisplanner', group: 'doel', note: 'Wat je nog moet regelen voor de grote tocht.', keywords: ['reis', 'taken', 'voorbereiding', 'gr5', 'boeken'], route: '/reis' },
  { id: 'paklijst', title: 'Paklijst', group: 'doel', note: 'Wat er in je rugzak gaat en wat dat weegt.', keywords: ['rugzak', 'gewicht', 'spullen', 'tent', 'uitrusting', 'inpakken'], route: '/reis/paklijst' },

  { id: 'weekterugblik', title: 'Weekterugblik', group: 'vandaag', note: 'Een korte terugblik op je week, op Vandaag.', keywords: ['terugblik', 'samenvatting', 'overzicht', 'week', 'review', 'evaluatie'] },
  { id: 'weekterugblik-dag', title: 'Dag van de weekterugblik', group: 'vandaag', note: 'Op welke dag de terugblik verschijnt.', keywords: ['zondag', 'maandag', 'terugblik', 'wanneer', 'dag'] },
  { id: 'weekvraag', title: 'Vraag van de week', group: 'vandaag', note: 'Elke week één vraag om je plan scherp te houden.', keywords: ['vraag', 'stoïcijns', 'stoisch', 'intentie', 'plan', 'week'] },
  { id: 'ochtendcheck', title: 'Ochtendcheck', group: 'vandaag', note: 'Een korte vraag over benen, energie en slaap, voor je training. Een pijnplek blijft altijd gevolgd.', keywords: ['ochtend', 'check', 'slaap', 'benen', 'energie', 'moe', 'spierpijn', 'hrv', 'horloge'] },
  { id: 'ochtendkaart', title: 'Ochtendkaart', group: 'vandaag', note: 'Bovenaan Vandaag de vraag hoe je je voelt, met je slaap en rusthartslag erbij. Tot je invult, tot de middag of tot je training.', keywords: ['ochtend', 'kaart', 'goedemorgen', 'vraag', 'bovenaan', 'slaap', 'benen', 'horloge'] },
  { id: 'ochtendmelding', title: 'Ochtendmelding', group: 'vandaag', note: 'Een melding in de ochtend met de vraag hoe je je voelt. Alleen in de geïnstalleerde app, op ongeveer het gekozen moment.', keywords: ['melding', 'notificatie', 'herinnering', 'ochtend', 'wekker', 'push', 'meldingen', 'goedemorgen'] },
  { id: 'ochtendmelding-tijd', title: 'Tijd van de ochtendmelding', group: 'vandaag', note: 'Vanaf wanneer de melding mag komen. Chrome bepaalt het precieze moment.', keywords: ['melding', 'tijd', 'uur', 'ochtend', 'wanneer', 'notificatie'] },
  { id: 'weerregel', title: 'Weer bij je training', group: 'vandaag', note: 'Een regel met het weer bij je buitentraining.', keywords: ['weer', 'regen', 'temperatuur', 'wind', 'onweer', 'voorspelling', 'buien'] },
  { id: 'weerruil', title: 'Ruilen bij slecht weer', group: 'vandaag', note: 'ASCEND stelt voor een buitentraining te ruilen als het weer slecht wordt.', keywords: ['weer', 'ruilen', 'verplaatsen', 'regen', 'storm', 'onweer', 'voorstel'] },
  { id: 'kledingadvies', title: 'Kledingadvies bij het weer', group: 'vandaag', note: 'Bij een buitentraining een paar regels over wat je aantrekt, op basis van het weer.', keywords: ['kleding', 'jas', 'muts', 'handschoenen', 'aantrekken', 'warm', 'koud', 'regenjas', 'windjack', 'zonnebrand', 'lampje', 'weer'] },
  { id: 'kleding-voorkeur', title: 'Terug naar de standaard', group: 'vandaag', note: 'Zet wat ASCEND van je kleding leerde terug naar de standaard.', keywords: ['kleding', 'voorkeur', 'te warm', 'te koud', 'terugzetten', 'standaard', 'reset', 'leren'] },
  { id: 'weerplaats', title: 'Plaats voor het weer', group: 'vandaag', note: 'Waarvoor ASCEND het weer opzoekt. Alleen de plaatsnaam gaat de deur uit.', keywords: ['weer', 'stad', 'woonplaats', 'locatie', 'plaats', 'open-meteo', 'privacy'], route: '/weer' },
  { id: 'weervolgt', title: 'Weer volgt je locatie', group: 'vandaag', note: 'Mijn locatie wordt bij het openen van de app bijgewerkt, als je dat eerder toestond.', keywords: ['weer', 'locatie', 'gps', 'vakantie', 'tocht', 'onderweg', 'volgen', 'bijwerken', 'toestemming'] },
  { id: 'citaten', title: 'Citaten na een training', group: 'vandaag', note: 'Een citaat op het rustige scherm na een training. Uit zetten haalt alleen het citaat weg.', keywords: ['citaat', 'quote', 'gedaan', 'afronden', 'feestje', 'scherm', 'mijlpaal'] },
  { id: 'geluid', title: 'Geluidseffecten', group: 'vandaag', note: 'Een paar lage tonen bij het openen en een klank bij een voltooide training.', keywords: ['geluid', 'audio', 'tonen', 'klank', 'stil', 'trommel', 'uitzetten', 'timer'] },
  { id: 'loopinzicht', title: 'Inzicht na een training', group: 'vandaag', note: 'Na een loop of tocht zie je hoogstens twee regels over wat beter ging en waar je op moet letten.', keywords: ['loopinzicht', 'beter', 'let op', 'hardlopen', 'loop', 'tocht', 'waarom', 'vergelijken', 'efficiëntie', 'vooruitgang'] },
  { id: 'loop-efficientie', title: 'Loopinzicht: efficiëntie', group: 'vandaag', note: 'Hoe snel je liep bij dezelfde hartslag, vergeleken met je eigen rustige loopjes.', keywords: ['loopinzicht', 'efficiëntie', 'hartslag', 'tempo', 'zone 2', 'sneller', 'hardlopen'] },
  { id: 'loop-langedagen', title: 'Loopinzicht: lange dagen', group: 'vandaag', note: 'Hoeveel je hartslag opliep bij gelijk tempo op een lange loop.', keywords: ['loopinzicht', 'drift', 'hartslagdrift', 'lange loop', 'ontkoppeling', 'uithouding', 'durability'] },
  { id: 'loop-berg', title: 'Loopinzicht: bergop en bergaf', group: 'vandaag', note: 'Je klimsnelheid bij dezelfde hartslag en feiten over je dalen, alleen bij een tocht met een klim of daling.', keywords: ['loopinzicht', 'klimmen', 'dalen', 'bergop', 'bergaf', 'klimsnelheid', 'tocht', 'hoogtemeters'] },
  { id: 'loop-vorm', title: 'Loopinzicht: pas en vorm', group: 'vandaag', note: 'Pas en vorm toont alleen iets als er echt wat verandert, bijvoorbeeld langer grondcontact aan het eind.', keywords: ['loopinzicht', 'loopdynamica', 'grondcontact', 'pas', 'cadans', 'vorm', 'borstband', 'hrm-pro'] },
  { id: 'loopweer', title: 'Weer bij loopinzicht', group: 'vandaag', note: 'ASCEND zoekt het weer van die dag op, zodat hij loopjes eerlijk vergelijkt. Alleen een afgeronde plaats gaat de deur uit.', keywords: ['loopinzicht', 'weer', 'temperatuur', 'wind', 'open-meteo', 'vergelijken', 'hardlopen', 'privacy'] },
  { id: 'borstband', title: 'Hartslag van de borstband', group: 'vandaag', note: 'Zonder borstband vergelijkt ASCEND geen loopjes waarbij de hartslag van een andere bron kan komen.', keywords: ['loopinzicht', 'borstband', 'hrm-pro', 'hartslagband', 'hartslag', 'pols', 'polssensor', 'vergelijken', 'hardlopen'] },
  { id: 'terugknop', title: 'Terugknop op een tab', group: 'vandaag', note: 'Of terug vanaf een andere tab eerst naar Vandaag gaat, zoals in de meeste Android-apps, of naar de tab die je daarvoor had.', keywords: ['terug', 'terugknop', 'back', 'android', 'tab', 'vorige pagina', 'navigatie', 'sluiten', 'vandaag'] },
  { id: 'hervatten', title: 'Na een herstart', group: 'vandaag', note: 'Open je ASCEND binnen deze tijd opnieuw, dan kom je terug op de pagina waar je was. Daarna begin je op Vandaag.', keywords: ['herstart', 'opnieuw openen', 'hervatten', 'laatste pagina', 'onthouden', 'weggeveegd', 'app sluiten', 'beginscherm', 'vandaag'] },

  { id: 'garmin', title: 'Garmin via intervals.icu', group: 'koppelingen', note: 'Trainingen van je horloge komen vanzelf binnen, zonder overtypen.', keywords: ['horloge', 'garmin', 'intervals', 'intervals.icu', 'sync', 'koppelen', 'smartwatch', 'activiteiten'], route: '/koppelen/garmin' },
  { id: 'horloge-gebruik', title: 'Gebruik van je horloge', group: 'koppelingen', note: 'Per soort gegeven aan of uit: trainingen, slaap, rusthartslag en HRV.', keywords: ['horloge', 'slaap', 'hrv', 'rusthartslag', 'hartslag', 'garmin', 'vanzelf afvinken', 'afvinken'], route: '/koppelen/garmin' },
  { id: 'garmin-trainingen', title: 'Trainingen', group: 'koppelingen', note: 'Of trainingen van je horloge worden opgehaald en aangeboden.', keywords: ['garmin', 'horloge', 'activiteiten', 'sync'], route: '/koppelen/garmin' },
  { id: 'vanzelf-afvinken', title: 'Vanzelf afvinken', group: 'koppelingen', note: 'Een training van je horloge vinkt zichzelf af als het niet anders kan.', keywords: ['garmin', 'horloge', 'afvinken', 'automatisch', 'gedaan'], route: '/koppelen/garmin' },
  { id: 'garmin-leidend', title: 'Garmin is leidend', group: 'koppelingen', note: 'Een training die je zelf invulde krijgt de cijfers van je horloge.', keywords: ['garmin', 'horloge', 'cijfers', 'gelijktrekken', 'overnemen'], route: '/koppelen/garmin' },
  { id: 'slaap', title: 'Slaap', group: 'koppelingen', note: 'Hoe lang de nacht was, in de ochtendcheck.', keywords: ['garmin', 'horloge', 'nacht', 'slapen', 'ochtendcheck'], route: '/koppelen/garmin' },
  { id: 'rusthartslag', title: 'Rusthartslag', group: 'koppelingen', note: 'Je rusthartslag in de ochtendcheck.', keywords: ['garmin', 'horloge', 'hartslag', 'rust', 'ochtendcheck'], route: '/koppelen/garmin' },
  { id: 'hrv', title: 'HRV', group: 'koppelingen', note: 'De variatie tussen je hartslagen in rust, in de ochtendcheck.', keywords: ['garmin', 'horloge', 'hartslagvariatie', 'herstel', 'ochtendcheck'], route: '/koppelen/garmin' },
  { id: 'naar-horloge', title: 'Trainingen naar je horloge', group: 'koppelingen', note: 'Zet de trainingen van de komende week in je intervals.icu-agenda.', keywords: ['garmin', 'horloge', 'agenda', 'sturen', 'intervals'], route: '/koppelen/garmin' },
  { id: 'horloge-details', title: 'Details van loopjes', group: 'koppelingen', note: 'ASCEND vraagt per loop of tocht de reeks van hartslag, tempo en hoogte op en bewaart er alleen een korte samenvatting van.', keywords: ['horloge', 'reeks', 'streams', 'loopdynamica', 'grondcontact', 'cadans', 'hoogte', 'tempo', 'details', 'loopinzicht', 'hardlopen'], route: '/koppelen/garmin' },
  { id: 'horloge-status', title: 'Status van het versturen', group: 'koppelingen', note: 'Op het trainingsscherm één regel die zegt of de training naar je horloge is gestuurd.', keywords: ['verstuurd', 'gelukt', 'status', 'sturen', 'opnieuw', 'horloge', 'garmin', 'intervals.icu'], route: '/koppelen/garmin' },
  { id: 'horloge-status-week', title: 'Markering op Week', group: 'koppelingen', note: 'Een klein horloge achter een training in de weeklijst, alleen als hij is verstuurd of het niet lukte.', keywords: ['markering', 'icoon', 'week', 'verstuurd', 'mislukt', 'status', 'horloge', 'garmin'], route: '/koppelen/garmin' },
  { id: 'horloge-voorvoegsel', title: 'Voorvoegsel voor de naam', group: 'koppelingen', note: 'Zet ASC voor de naam van elke training die naar je horloge gaat, zodat je ze herkent tussen je eigen trainingen. Kort, lang of geen.', keywords: ['voorvoegsel', 'naam', 'herkennen', 'herkenbaar', 'horloge', 'garmin', 'intervals.icu', 'opruimen'], route: '/koppelen/garmin' },
  { id: 'horloge-gedaan-weghalen', title: 'Gedane trainingen weghalen', group: 'koppelingen', note: 'Een training die je hebt gedaan of voorbij liet gaan haalt ASCEND weer uit je intervals.icu-agenda.', keywords: ['gedaan', 'opruimen', 'weghalen', 'verwijderen', 'horloge', 'garmin', 'intervals.icu', 'agenda', 'te veel'], route: '/koppelen/garmin' },
  { id: 'macrofactor', title: 'MacroFactor inlezen', group: 'koppelingen', note: 'Krachttrainingen en gewicht uit je export, met echte duur en herhalingen in reserve.', keywords: ['macrofactor', 'voeding', 'export', 'import', 'kracht', 'sets', 'rir', 'inlezen'], route: '/koppelen/macrofactor' },
  { id: 'macrofactor-leidend', title: 'Leidend voor kracht', group: 'koppelingen', note: 'Een krachttraining die je al vastlegde krijgt de cijfers van MacroFactor.', keywords: ['macrofactor', 'kracht', 'cijfers', 'overnemen', 'sets'], route: '/koppelen/macrofactor' },
  { id: 'macrofactor-gewicht', title: 'Gewicht uit MacroFactor', group: 'koppelingen', note: 'Of ASCEND rekent met het gewicht uit je MacroFactor-export.', keywords: ['gewicht', 'macrofactor', 'kilo', 'trendgewicht', 'weegschaal', 'rugzak'], route: '/koppelen/macrofactor' },
  { id: 'health-connect', title: 'Health Connect', group: 'koppelingen', note: 'Komt later. Dan kan Android zelf gegevens aan ASCEND geven.', keywords: ['android', 'google', 'binnenkort', 'gezondheid', 'stappen'] },

  { id: 'backup', title: 'Back-up', group: 'gegevens', note: 'Bewaar al je gegevens in een bestand, of zet er een terug.', keywords: ['exporteren', 'importeren', 'export', 'import', 'bestand', 'bewaren', 'terugzetten', 'herstellen', 'json'] },
  { id: 'backupmap', title: 'Back-upmap', group: 'gegevens', note: 'Een vaste map waar de back-up automatisch naartoe gaat.', keywords: ['map', 'folder', 'downloads', 'vaste plek', 'export'] },
  { id: 'opslag', title: 'Opslag beschermen', group: 'gegevens', note: 'Vraagt de telefoon om je gegevens niet zomaar op te ruimen.', keywords: ['opslag', 'beveiligen', 'verlies', 'wissen', 'browser', 'persistent'] },
  { id: 'momentopnamen', title: 'Momentopnamen', group: 'gegevens', note: 'Een kopie die ASCEND maakt vóór een import, om terug te kunnen.', keywords: ['snapshot', 'kopie', 'terug', 'ongedaan', 'import'] },
  { id: 'versie', title: 'Versie en bijwerken', group: 'gegevens', note: 'Welke versie je hebt, en zoeken naar een nieuwere.', keywords: ['update', 'bijwerken', 'nieuwe versie', 'vernieuwen', 'build'] },
  { id: 'startniveau', title: 'Startniveau zelf invullen', group: 'gegevens', note: 'Meestal niet nodig: ASCEND vraagt zelf wat nog ontbreekt.', keywords: ['baseline', 'niveau', 'conditie', 'bewijs', 'invullen', 'beginnen'] },
  { id: 'herbouwen', title: 'Adviezen opnieuw berekenen', group: 'gegevens', note: 'Laat ASCEND nu meteen opnieuw kijken. Er wordt niets verwijderd.', keywords: ['herbouw', 'adviezen', 'vernieuwen', 'opnieuw', 'aanbevelingen'] },
  { id: 'wissen', title: 'Alles verwijderen', group: 'gegevens', note: 'Wist alles op deze telefoon en begint opnieuw. Dit kan niet terug.', keywords: ['reset', 'wissen', 'leegmaken', 'opnieuw beginnen', 'verwijderen', 'demo'] },

  { id: 'kennisbank', title: 'Kennisbank', group: 'gidsen', note: 'Navigeren, weer, sneeuw, slapen en meer: alles voor onderweg.', keywords: ['kennis', 'leren', 'tips', 'navigatie', 'sneeuw', 'slapen', 'veiligheid'], route: '/kennis' },
  { id: 'trainingsgids', title: 'Trainingsgids', group: 'gidsen', note: 'Het doel, de uitvoering en waar je op let per trainingsdag.', keywords: ['uitleg', 'training', 'gids', 'hoe', 'uitvoering', 'oefeningen'], route: '/gids' },
  { id: 'garmin-gids', title: 'Garmin-gids', group: 'gidsen', note: 'Zones, dataschermen en hoe je de cijfers van je horloge leest.', keywords: ['horloge', 'garmin', 'zones', 'dataschermen', 'metrics', 'uitleg'], route: '/garmin' },
  { id: 'plekken', title: 'Trainingsplekken', group: 'gidsen', note: 'Waar je in Nederland bergop en bergaf kunt trainen.', keywords: ['heuvels', 'trap', 'helling', 'bergop', 'locatie', 'dichtbij', 'woonplaats'], route: '/plekken' },
  { id: 'weer-gids', title: 'Weer', group: 'gidsen', note: 'Hoe ASCEND het weer voor je training beoordeelt, en waar het vandaan komt.', keywords: ['weer', 'voorspelling', 'open-meteo', 'regen', 'wind', 'regels'], route: '/weer' },
  { id: 'bronnen', title: 'Bronnen', group: 'gidsen', note: 'Alle onderzoeken en bronnen achter de adviezen.', keywords: ['onderzoek', 'wetenschap', 'studie', 'literatuur', 'waarom', 'bewijs'], route: '/bronnen' },
];

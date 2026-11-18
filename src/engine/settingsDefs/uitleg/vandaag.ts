// ASCEND: de uitleg achter de i bij de instellingen van de groep Vandaag en meldingen, op id van de verklaring
// (docs/visie/Ontwerp instellingen op een plek.md, stap 3). Alleen geladen in Instellingen of als je op de i tikt
// (data/settingsHelpKeys.ts), zodat deze tekst niet bij de start van de app laadt. De verklaring zegt `help: true`.

import { AERIAL_CACHE, PHOTO_SOURCES_LINE } from '../../../integrations/aerialImagery';
import { AERIAL_LIMIT_MS, MAP_SOURCE_LIMIT_MS } from '../../routeMap';
import type { SettingsHelp } from '../../../data/settingsHelp';

export const VANDAAG_UITLEG: Record<string, SettingsHelp> = {
  kaarten: {
    title: 'Kaarten op Vandaag',
    lead: 'Een profiel zet de losse schakelaars in één keer. Je training staat altijd op Vandaag.',
    points: [
      { head: 'Alles laten zien', text: 'alle kaarten, zoals het advies.' },
      { head: 'Alleen het belangrijkste', text: 'je training, de ochtendcheck en het weer. Weekterugblik, citaat, ochtendkaart en geluid gaan uit.' },
      { head: 'Alleen je training', text: 'ook de ochtendcheck en het weer gaan uit. Aangepast betekent dat je schakelaars bij geen profiel passen.' },
    ],
  },
  'boven-missie': {
    title: 'Kaarten boven de missie',
    lead: 'Je missie staat binnen twee seconden in beeld. Daarom staat er normaal hoogstens één kaart boven, en nooit meer dan twee.',
    points: [
      { head: 'Altijd boven', text: 'ziek gemeld, de vraag of je ziek wordt en een weerwaarschuwing.' },
      { head: 'Direct onder de missie', text: 'de ochtendvraag: een vraag is een taak van vandaag.' },
      { head: 'Onder Je dag', text: 'een advies over je planning, de vraag Niet gedaan?, de back-up en wat er boven geen plek had, in vaste volgorde.' },
    ],
  },
  'avond-ervoor': {
    title: 'De avond ervoor',
    lead: 'Vanaf de gekozen tijd (standaard 20:00) een kaart onder je missie met wat je voor morgen klaarlegt.',
    points: [
      { head: 'Wat erop staat', text: 'hoogstens vier regels: weer en kleding, een lampje, de rugzak, drinken, je horloge of de route.' },
      { head: 'Wanneer niet', text: 'op een rustdag, bij vakantie of ziek, en als er niets klaar te leggen valt.' },
      { head: 'Planning', text: 'de kaart is alleen tekst en verandert niets aan je planning.' },
    ],
  },
  ochtendcheck: {
    title: 'Ochtendcheck',
    lead: 'Een korte vraag over je benen, energie en slaap, voor je training.',
    points: [
      { head: 'Moe', text: 'dan kan er een rustiger dag als voorstel komen.' },
      { head: 'Pijn', text: 'een pijnplek van de laatste twee weken blijft altijd gevolgd, ook als dit uit staat.' },
      { head: 'Horloge', text: 'slaap en hartslag kun je erin laten meetellen bij Koppelingen.' },
    ],
  },
  'benen-na-test': {
    title: 'Benen vragen na een test',
    lead: 'De ochtend na een test of wedstrijd vraagt de ochtendkaart open hoe je benen voelen, zonder voorstel uit de beenindex.',
    points: [
      { head: 'Waarom', text: 'de zwaarte van een test is bijna altijd 9 of 10 en zegt weinig over je herstel. Hoe je benen de ochtend erna voelen, zegt meer.' },
      { head: 'Wat je ziet', text: 'één zin over je test of wedstrijd van gisteren en de vier keuzes, zonder dat er een is voorgekozen.' },
      { head: 'Uit', text: 'een ochtend als alle andere, met het voorstel uit je beenindex.' },
    ],
  },
  'vragen-na-loop': {
    title: 'Vragen na je loop',
    lead: 'Vinkt je horloge een training af, dan staat bovenaan Je dag de rij Hoe ging het?. Die opent een blad met de vragen.',
    points: [
      { head: 'Kort', text: 'Beter, Normaal of Slechter, pijn en de zwaarte. Je gewicht na, inkorten en de tekst voor Strava staan achter Meer.' },
      { head: 'Alles', text: 'alles onder elkaar, zonder Meer.' },
      { head: 'Zwaarte', text: 'staat altijd in de eerste stap, met de waarde van je horloge als die er is. Zonder zwaarte telt je belasting de zwaarte van het plan.' },
      // Gelijk aan engine/autoTick.ts#QUESTION_HOURS (afterRun.test.ts houdt ze samen).
      { head: 'Hoe lang', text: 'de rij staat er 72 uur. Daarna verdwijnt hij; je training blijft in je logboek.' },
    ],
  },
  lijfvraag: {
    title: 'Hoe voelt je lijf?',
    lead: 'Een kaart op Vandaag vraagt hoe je lijf voelt en zegt wat kan helpen. Je planning verandert er niet door.',
    points: [
      { head: 'Alleen als er reden is', text: 'een open pijnmelding, een zware week voor je benen, of twee dagen na een tocht of wedstrijd. Hoogstens een keer per week.' },
      { head: 'Elke week', text: 'ook zonder reden, op de dag van de weekterugblik.' },
      { head: 'Uit', text: 'geen kaart. Op Lichaam meld je altijd zelf wat je voelt. Pijn in je benen blijft een hint geven bij zware beentrainingen.' },
    ],
  },
  weekvraag: {
    title: 'Vraag van de week',
    lead: 'Een korte vraag om stil te staan bij je week. Je antwoord verandert je planning niet.',
    points: [
      { head: 'Standaard uit', text: 'aan staat de vraag als eigen regel onder Je dag tot je antwoordt. Kaarten op Vandaag zet hem niet aan of uit.' },
      { head: 'Je antwoorden', text: 'blijven bewaard en staan in de weekterugblik van hun week.' },
      { head: 'Privé', text: 'je antwoord blijft op je telefoon.' },
    ],
  },
  'reistaak-vandaag': {
    title: 'Reistaak op Vandaag',
    lead: 'De taken van je reis lopen over weken. Ze staan bij je doel op Ascend, met de taak van nu.',
    points: [
      { head: 'Alleen in de laatste week', text: 'de taak komt in Je dag in de week dat hij nog net kan. Niet nu laat hem open op Ascend.' },
      { head: 'Elke week', text: 'de taak van deze week staat elke week in Je dag, zoals eerder.' },
      { head: 'Nooit', text: 'Vandaag zegt niets over je reis.' },
    ],
  },
  citaten: {
    title: 'Citaat na een training',
    lead: 'Een citaat op het rustige scherm als je een training afrondt.',
    points: [
      { head: 'Uit', text: 'haalt alleen het citaat weg, de rest van het scherm blijft.' },
      { head: 'Onderaan Vandaag', text: 'het citaat onderaan Vandaag heeft een eigen keuze.' },
    ],
  },
  dagcitaat: {
    title: 'Citaat op Vandaag',
    lead: 'Het citaat onderaan Vandaag, elke dag een ander. Een tik wisselt van taal.',
    points: [
      { head: 'Engels', text: 'de gangbare Engelse vertaling. Een paar spreuken blijven Latijn.' },
      { head: 'Nederlands', text: 'onze eigen vertaling, waar die er is.' },
      { head: 'Uit', text: 'geen citaat op Vandaag. Het citaat na een training heeft een eigen schakelaar.' },
    ],
  },
  geluid: {
    title: 'Geluid',
    lead: 'Een paar lage tonen als je de app voor het eerst aanraakt en een alarm als een afteltimer afloopt, bijvoorbeeld bij rekken.',
    points: [
      { head: 'Na een training', text: 'een klank als je een training afrondt.' },
      { head: 'Forge', text: 'het rustsignaal van Forge stel je in bij Forge.' },
    ],
  },
  lichterbenen: {
    title: 'Lichter bij vermoeide benen',
    lead: 'Na spierpijn of een zware loop krijg je een lichtere beendag of een dag later als voorstel. Jij kiest.',
    points: [
      { head: 'Met een voorstel', text: 'een kaart op Vandaag bij een zware beendag met spierpijn, een harde loop eerder die dag of een hoge beenindex. Lichter, een dag later of Liever niet. Bij een harde loop van vandaag alleen een dag later.' },
      { head: 'Wat Lichter is', text: 'minder gewicht, zeker 3 herhalingen over en een set minder (niet bij Alleen gewicht), alleen bij oefeningen die je benen belasten. In MacroFactor kies je zelf lichter.' },
      { head: 'Alleen een regel of uit', text: 'de regel noemt wat er opvalt, zonder knoppen. Uit zet ook de regel bij het verplaatsen van een beendag uit.' },
    ],
  },
  'lichterbenen-hoe': {
    title: 'Hoe licht',
    lead: 'Wat Lichter doet met een beendag.',
    points: [
      { head: 'Standaard', text: 'zeker 3 herhalingen over. Van elke oefening met drie sets of meer vervalt de laatste.' },
      { head: 'Alleen gewicht', text: 'zeker 3 herhalingen over, alle sets blijven staan.' },
      { head: 'Extra licht', text: 'zeker 4 herhalingen over en een set minder.' },
    ],
  },
  'korter-vandaag': {
    title: 'Minder tijd vandaag',
    lead: 'Minder tijd vandaag? Kies in het menu van je missie 30, 45 of 60 minuten. Je krijgt dezelfde training korter als voorstel.',
    points: [
      { head: 'Kernsets', text: 'bij kracht alleen de kernoefeningen. Past de kern niet in je tijd, dan wordt het minder van alles. In Forge sla je de rest zelf over. Bij een tempoloop of intervallen worden inlopen en uitlopen korter.' },
      { head: 'Minder van alles', text: 'bij kracht een set minder per oefening. Bij een loop met blokken minder herhalingen in hetzelfde tempo.' },
      { head: 'Altijd', text: 'eerst een voorstel, pas na Akkoord verandert er iets. Ongedaan maken zet het terug. Een test of wedstrijd kan niet korter.' },
    ],
  },
  'bundel-meldingen': {
    title: 'Meldingen',
    lead: 'Welke meldingen je op je telefoon krijgt, en wanneer.',
    points: [
      { head: 'In de browser', text: 'alleen de ochtendvraag, en Chrome kiest het precieze moment.' },
      { head: 'In de Android-app', text: 'ook het einde van je rust en de weekmelding, op tijd. Ze trillen zoals je Trillen hebt staan. Het einde van de rust volgt het signaal van Forge.' },
      { head: 'Alles lokaal', text: 'de meldingen worden op je telefoon bedacht. Er gaat niets naar een server.' },
    ],
  },
  ochtendmelding: {
    title: 'Ochtendvraag',
    lead: 'Een melding in de ochtend met de vraag hoe je je voelt. Tik erop en het blad staat open.',
    points: [
      { head: 'Tijdstip', text: 'bij benadering. Chrome bepaalt het moment op de achtergrond. De melding komt na de tijd die jij kiest, en niet na elven.' },
      { head: 'Alleen geïnstalleerd', text: 'op Chrome voor Android, met ASCEND op je beginscherm. Kan het niet, dan krijg je de vraag als je de app opent.' },
      { head: 'Toestemming', text: 'je telefoon vraagt of ASCEND meldingen mag sturen. Er gaat niets naar een server.' },
    ],
  },
  'rust-melding': {
    title: 'Einde van de rust',
    lead: 'Een melding als je rust in Forge om is, ook met je scherm uit of met muziek aan.',
    points: [
      { head: 'Op de seconde', text: 'met de toestemming Exacte wekker. Zonder kan Android hem een paar minuten later laten komen.' },
      { head: 'Scherm aan', text: 'dan geeft Forge het signaal zelf en komt er geen melding bij.' },
      { head: 'Geluid en trillen', text: 'zoals je ze bij Forge onder Signaal hebt gekozen. Staat het signaal uit, dan komt er een stille melding.' },
    ],
  },
  weekmelding: {
    title: 'Weekmelding op zondag',
    lead: 'Op zondagavond een korte melding: wat je deed, wat er komt en één tip.',
    points: [
      { head: 'Waar het vandaan komt', text: 'dezelfde getallen als de weekterugblik op Vandaag, van de laatste keer dat je de app opende.' },
      { head: 'Geen week', text: 'stond er niets gepland en deed je niets, dan komt er geen melding.' },
    ],
  },
  'avond-melding': {
    title: 'Melding de avond ervoor',
    lead: 'Op de tijd van De avond ervoor een melding met dezelfde regels.',
    points: [
      { head: 'Waar het vandaan komt', text: 'wat de app wist toen je hem het laatst opende, ook het weer van toen.' },
      { head: 'Alleen in de Android-app', text: 'in de browser komt er geen melding.' },
    ],
  },
  weerplaats: {
    title: 'Plaats voor het weer',
    lead: 'Het weer komt van Open-Meteo, voor één plek.',
    points: [
      { head: 'Volgt je locatie', text: 'je plek, afgerond op ongeveer een kilometer, wordt bijgewerkt als je de app opent. Hoogstens eens per uur.' },
      { head: 'Vaste plaats', text: 'de plek die je koos blijft zoals ze is.' },
      { head: 'Toestemming', text: 'zonder toestemming van je telefoon gebeurt er niets.' },
    ],
  },
  'bundel-weer': {
    title: 'Weer en kleding',
    lead: 'Wat het weer bij je training laat zien: het weer zelf, het beste moment, waarschuwingen voor onweer, storm, hitte en lawines, regen in het komende uur, heuvels in de buurt, een route voor je loop, de maanstand, kleding, en een regel bij hitte of slechte lucht.',
    points: [
      { head: 'Per onderdeel', text: 'elk onderdeel zet je apart aan of uit in het blad.' },
      { head: 'Je plaats', text: 'het weer volgt de plaats die je bij Plaats koos.' },
    ],
  },
  'beste-moment': {
    title: 'Beste moment tonen',
    lead: 'Is het weer eerder of later op de dag beter dan op je gewone uur, dan staat er onder het weer één regel, zoals "Beste moment: 16:00 tot 17:30, droog".',
    points: [
      { head: 'Alleen als het echt scheelt', text: 'een klasse beter (slecht, let op, prima), of regen of wind onder de drempel van ASCEND.' },
      { head: 'Altijd in het licht', text: 'tussen zonsopkomst en zonsondergang, en niet in het verleden.' },
    ],
  },
  weeralarm: {
    title: 'Weerwaarschuwingen',
    lead: 'Op de dag van een tocht of een lange training buiten, en de dag ervoor, staat bovenaan Vandaag een regel als er onweer, zware windstoten of hitte verwacht wordt. Het advies is aan.',
    points: [
      { head: 'Wat je ziet', text: 'het feit, de tijd en de plek, zoals: onweer verwacht vanaf 15:00 in Chamonix. De regel staat er altijd helemaal, je hoeft niets open te tikken.' },
      { head: 'Wanneer', text: 'onweer, windstoten vanaf 75 km per uur of 30 graden en warmer, tussen 6 en 22 uur.' },
      { head: 'Waar het vandaan komt', text: 'het weermodel van Open-Meteo, hoogstens eens per uur. Het is geen officiële waarschuwing. Kijk voor je vertrekt ook op Meteoalarm. Je planning verandert er niet door.' },
    ],
  },
  lawinegevaar: {
    title: 'Lawinegevaar',
    lead: 'Bij een tocht in de bergen of de sneeuw zie je het lawinegevaar uit het bulletin rond de plek van je tocht, van november tot en met mei (bij terrein sneeuw het hele jaar). Het advies is aan.',
    points: [
      { head: 'Wat je ziet', text: 'een regel als: lawinegevaar aanzienlijk, 3 van 5, morgen rond Val d\'Isère. Op een dag van je tocht, of de dag ervoor als je tocht een eigen plek heeft.' },
      { head: 'Waar het vandaan komt', text: 'het open bulletin van de Europese lawinediensten (EAWS), voor de Alpen en de Pyreneeën. Alleen een datum en welke lawinedienst gaan naar buiten.' },
      { head: 'Alleen informatie', text: 'Geen oordeel of je moet gaan. Lees het hele bulletin bij de dienst van het land. Je planning verandert er niet door.' },
    ],
  },
  'route-voorstel': {
    title: 'Route voorstellen',
    lead: 'Bij een looptraining zie je twee lussen die passen bij de afstand en de hoogtemeters. Het advies is aan, met Avontuurlijk bovenaan.',
    points: [
      { head: 'Simpel', text: 'dezelfde helling op en af tot de hoogtemeters er zijn. Bij een vlakke training heen en terug over hetzelfde pad.' },
      { head: 'Avontuurlijk', text: 'één lange lus langs verschillende hellingen en onverharde paden, liefst zonder stukken twee keer.' },
      { head: 'Naar je horloge', text: 'met Naar Garmin Connect kies je de app van je horloge en sla je de lus op als koers; anders download je het GPX-bestand.' },
      { head: 'Wat de deur uit gaat', text: `standaard je plek van nu, precies, naar de routeplanner (BRouter, anders Valhalla van FOSSGIS), en op ongeveer 100 m naar OpenStreetMap voor heuvels en paden; de hoogte van heuvels komt van Open-Meteo, om hetzelfde punt. Bij Startpunt van je lus kies je ook Thuis, of Ongeveer: dan gaat alleen je plek, afgerond op ongeveer een kilometer, de deur uit. Geen naam, geen adres. De kaart haalt kaarttegels rond je plek op bij OpenFreeMap, anders bij OpenStreetMap. ${PHOTO_SOURCES_LINE} De route wordt niet bewaard.` },
    ],
  },
  'route-start': {
    title: 'Startpunt van je lus',
    lead: 'Waar een voorgestelde lus begint.',
    points: [
      { head: 'Waar je nu bent', text: 'het advies. Bij elke zoektocht komt één keer de vraag om je plek, op 50 m nauwkeurig, en die gaat naar de routeplanner (BRouter, anders Valhalla van FOSSGIS). Hij wordt niet als startpunt bewaard. Lukt het niet, dan wordt er niet gezocht: één regel zegt waarom, en je kiest Opnieuw, Thuis (als je die hebt) of Andere plek. Nooit stil bij Thuis, dat kan ver weg liggen als je op reis bent. Boven de kaart kies je met Start bij, onder Andere plek, voor deze training ook Thuis of een andere bewaarde plek.' },
      { head: 'Thuis', text: 'je kiest hieronder Gebruik waar ik nu ben, bij je deur, of je tikt een punt op de kaart bij Route voorstellen en kiest Bewaar als plek, Maak dit Thuis. Dat punt gaat naar de routeplanner en wordt op dit toestel bewaard; het gaat mee in je back-up. Start hier op de kaart geldt alleen voor die zoektocht en verandert Thuis niet. Wis startpunt haalt Thuis weg.' },
      { head: 'Ongeveer', text: 'je plaats, binnen een kilometer. De lus begint tot ongeveer 700 m van huis.' },
      { head: 'OpenStreetMap', text: 'heuvels en paden zoekt het om je plek van nu (op ongeveer 100 m), om Thuis, of bij Ongeveer om je afgeronde plek. De hoogte van heuvels komt van Open-Meteo, om hetzelfde punt. Wis startpunt haalt ook de bewaarde heuvels rond een precies punt weg.' },
      { head: 'Het dichtstbijzijnde pad', text: 'de routeplanner begint op het pad of de weg het dichtst bij je startpunt. Het stukje ernaartoe is een rechte lijn.' },
    ],
  },
  'route-zoeken': {
    title: 'Lus zoeken',
    lead: 'De Briefing is het scherm vooraf voor een loop buiten. Dit kiest wanneer hij een lus zoekt.',
    points: [
      { head: 'Bij het openen van de briefing', text: 'het advies. Voor een training van vandaag of morgen zoekt de Briefing meteen een lus, zodat de kaart klaarstaat als je hem opent. Verder weg zoekt hij pas na een tik. Er gaat alleen iets de deur uit als je bij Route voorstellen eerst ja zei.' },
      { head: 'Na een tik', text: 'de Briefing zoekt pas als je op Zoek een lus tikt. Dat scheelt netwerk en je plek bij het openen.' },
      { head: 'Wat het kost', text: 'één zoektocht duurt hoogstens een halve minuut: één vraag aan OpenStreetMap en Open-Meteo en hoogstens drie aanroepen van de routeplanner per soort lus. Bij Waar je nu bent ook één keer je plek.' },
    ],
  },
  'route-grote-wegen': {
    title: 'Grote wegen mijden',
    lead: 'Een voorgestelde lus mijdt grote wegen en knooppunten van snelwegen. Het advies is aan.',
    points: [
      { head: 'Aan', text: 'BRouter maakt een weg duurder naarmate hij dichter bij verkeerslawaai ligt; Valhalla kiest liever een voetpad dan de weg ernaast. Een lus kan daardoor iets langer omlopen.' },
      { head: 'Uit', text: 'de routeplanner kiest de kortste goede weg, ook langs een drukke weg.' },
      { head: 'Altijd', text: 'loopt er 300 m of meer langs een grote weg, dan zegt een regel bij de lus dat.' },
    ],
  },
  'route-kaart': {
    title: 'Ondergrond van de kaart',
    lead: 'De kaart in Route voorstellen toont je lussen, je startpunt en je plek. Dit kiest wat eronder ligt. Rechtsboven op de kaart wissel je ook snel tussen de kaart en de luchtfoto; wat je het laatst koos, blijft staan.',
    points: [
      { head: 'Donker en Licht', text: 'straten, paden en water van OpenFreeMap, in de kleuren van ASCEND of licht. Donker is het advies: daarop zie je paden en straten het best.' },
      { head: 'Luchtfoto', text: `bos, akker, rots en water van boven. ${PHOTO_SOURCES_LINE} Over een grens of aan de kust komt de foto van EOX (10 m, waziger), zodat hij nooit half wit is.` },
      { head: 'Geen', text: 'alleen de lussen en je plek op een effen vlak. Er worden geen kaarttegels opgehaald en er staat geen schakelaar.' },
      { head: 'Valt het weg', text: `komt de luchtfoto niet binnen ${AERIAL_LIMIT_MS / 1000} seconden, dan laadt de kaart, met één regel; komt de kaart niet binnen ${MAP_SOURCE_LIMIT_MS / 1000} seconden, dan die van OpenStreetMap, en anders het effen vlak. Kaarttegels worden nooit vooraf opgehaald of bewaard. Luchtfototegels die je zag bewaart de app hoogstens ${AERIAL_CACHE.maxAgeDays} dagen, hoogstens ${AERIAL_CACHE.maxEntries} per bron.` },
    ],
  },
  'kleding-voorkeur': {
    title: 'Je kleding',
    lead: 'Na een buitentraining kun je tikken of je kleding goed zat.',
    points: [
      { head: 'Dan', text: 'schuift je voorkeur een graad op, daarna telkens een halve, hooguit vier graden per sport.' },
      { head: 'Terug', text: 'met Terug naar de standaard begin je weer bij nul.' },
    ],
  },
  beweging: {
    title: 'Beweging',
    lead: 'Hoeveel de app beweegt.',
    points: [
      { head: 'Normaal', text: 'alles, kort en rustig. De missiekaart ademt zacht en een nieuw voorstel knippert een of twee keer.' },
      { head: 'Rustig', text: 'alleen feedback op je tik en overgangen van bladen.' },
      { head: 'Uit', text: 'alles staat meteen op zijn plek. Heeft je telefoon beperkte beweging aan, dan geldt dit altijd.' },
    ],
  },
  trillen: {
    title: 'Trillen',
    lead: 'Een korte tik in je hand als je iets doet.',
    points: [
      { head: 'Wat', text: 'schakelaars en keuzes, een afgevinkte set, een training oppakken in Week, Akkoord, en twee stootjes bij een opgeslagen training of een mijlpaal.' },
      { head: 'Timers', text: 'het signaal na de rust in Forge of een rektimer staat hier los van.' },
      { head: 'iPhone', text: 'trillen bestaat daar niet in de browser. Dan doet deze schakelaar niets.' },
    ],
  },
  lucht: {
    title: 'Lucht bovenaan',
    lead: 'De lichte lucht bovenaan een tab kan in de avond fel zijn. Kies wanneer ze donker wordt.',
    points: [
      { head: 'Op tijd', text: 'standaard met de zon op je plek: donker na zonsondergang, licht bij zonsopkomst. Of een vast uur tot 07:00.' },
      { head: 'Altijd licht of donker', text: 'de klok doet er dan niet toe.' },
      { head: 'Donker', text: 'dezelfde kaarten en kleuren op diep marine, met zachte bergen en een paar zwakke sterren.' },
    ],
  },
  loopinzicht: {
    title: 'Inzicht na een training',
    lead: 'Na een loop of tocht zie je hoogstens twee regels over wat beter ging en waar je op moet letten.',
    points: [
      { head: 'Vergelijkt', text: 'je loop met je eigen rustige lopen, nooit met anderen.' },
      { head: 'Onderwerpen', text: 'zet je apart aan of uit onder Geavanceerd.' },
      { head: 'Reeksen', text: 'komen van je horloge. Zet dat aan bij Koppelingen (Details van lopen).' },
    ],
  },
  loopweer: {
    title: 'Weer bij loopinzicht',
    lead: 'Voor eerlijk vergelijken komt het weer van die dag van Open-Meteo.',
    points: [
      { head: 'Wat gaat mee', text: 'alleen een plek afgerond op ongeveer een kilometer.' },
      { head: 'Uit', text: 'er gaat niets naar de weerdienst voor loopinzicht.' },
    ],
  },
  borstband: {
    title: 'Hartslag van de borstband',
    lead: 'Zonder borstband kan de hartslag van een andere bron komen, en dan is de vergelijking niet eerlijk.',
    points: [
      { head: 'Aan', text: 'elke loop telt als gemeten met de band.' },
      { head: 'Uit', text: 'Geen vergelijking van lopen waarbij de bron kan zijn gewisseld.' },
    ],
  },
  'bundel-run-detail': {
    title: 'Run in detail',
    lead: 'Vanuit het logblad van een loop open je een scherm met je loop kilometer na kilometer.',
    points: [
      { head: 'Wat erin staat', text: 'het oordeel en drie getallen, het tempo per kilometer, tempo, hartslag en hoogte over de afstand, en de lijst per kilometer en per ronde.' },
      { head: 'Uit', text: 'de rij in het logblad verdwijnt. De kilometers blijven bewaard op je logs.' },
      { head: 'Gegevens', text: 'komen van je horloge via intervals.icu, met Details van lopen aan.' },
    ],
  },
  'run-detail-patronen': {
    title: 'Patronen in Run in detail',
    lead: 'De kaart Wat opvalt noemt hoogstens drie dingen uit je loop, de sterkste eerst.',
    points: [
      { head: 'Wat', text: 'een te snelle start, inzakken, een hartslag die oploopt, een klim of tegenwind, en bij een test wat er meespeelde.' },
      { head: 'Waarom', text: 'elke regel heeft een blad met wat er vergeleken is en hoe sterk het is. Het zegt wat het kan betekenen, nooit een oorzaak.' },
      { head: 'Uit', text: 'je ziet alleen de getallen en de grafieken.' },
    ],
  },
  'run-detail-advies': {
    title: 'Advies in Run in detail',
    lead: 'Een of twee suggesties voor de volgende keer, uit de verdeling van je loop of test.',
    points: [
      { head: 'Nooit', text: 'een tijd om te halen of een belofte. Na pijn of Slechter blijft het advies weg.' },
      { head: 'Je planning', text: 'verandert er niet door.' },
    ],
  },
  'loopvorm-balans': {
    title: 'Loopvorm in Run in detail',
    lead: 'Welke grootheden de kaart Loopvorm laat zien, als je horloge ze meet.',
    points: [
      { head: 'Advies', text: 'cadans, grondcontact, staplengte en op en neer aan, de balans uit.' },
      { head: 'Balans', text: 'zegt na één loop niets. Pas over meerdere lopen is een verdeling buiten ongeveer 52 tegen 48 het bekijken waard.' },
    ],
  },
  'zweet-vragen': {
    title: 'Zweetverlies vragen',
    lead: 'Bij een loop, wandeling of tocht komt de vraag naar je gewicht voor en na, zodat je je eigen zweettempo leert kennen.',
    points: [
      { head: 'Vooraf', text: 'een regel op de missiekaart. Een gewicht uit MacroFactor van vandaag of gisteren staat er als voorstel en wordt nooit zonder tik overgenomen.' },
      { head: 'Na afloop', text: 'bij Hoe ging het en op het scherm Gedaan een rij voor je gewicht na. Achteraf invullen kan in het Logboek, ook met de schatting van je horloge.' },
      { head: 'Uit', text: 'Geen vraag. Je wegingen blijven bewaard.' },
    ],
  },
  ochtendkaart: {
    title: 'Ochtendkaart',
    lead: 'In de ochtend staat bovenaan Vandaag de vraag hoe je je voelt.',
    points: [
      { head: 'Alvast ingevuld', text: 'je slaap uit je horloge en je benen volgens je beenindex, met de bron erbij.' },
      { head: 'Slaap', text: 'komt soms later binnen dan je rusthartslag. Tik dan op Opnieuw ophalen.' },
      { head: 'Wanneer', text: 'vanaf het uur bij Ochtend (standaard 5 uur) tot twaalven, of tot je invult of je training gelogd is. Staat de kaart uit, dan blijft de vraag een regel bij Je dag.' },
    ],
  },
  'korte-nacht': {
    title: 'Vragen bij een korte nacht',
    lead: 'Zag je horloge maar een deel van de nacht, dan komt de vraag of dat klopt, in plaats van de aanname dat je slecht sliep. Twijfel je zelf bij een andere nacht, dan kun je dat ook zeggen.',
    points: [
      { head: 'Wanneer', text: 'minder dan 4 uur slaap, of minder dan de helft van jouw gemiddelde (na een week van je eigen nachten). Dat gebeurt als je horloge in de nacht van je pols gaat.' },
      { head: 'Zelf zeggen', text: 'bij elke gemeten nacht kun je zelf Slaap niet goed gemeten kiezen: met een tik op Slaap op de ochtendkaart of in het blad Energie, slaap of pijn. Je krijgt dezelfde vraag en dezelfde uurkeuze. De getallen van je horloge blijven staan.' },
      { head: 'Niet goed gemeten', text: 'die nacht telt niet mee voor een voorstel en niet in jouw gemiddelden van slaap en HRV. Je rusthartslag blijft meetellen. Je kunt zelf zeggen hoe lang je ongeveer sliep. Ongedaan maken zet alles terug.' },
      { head: 'Uit', text: 'een korte nacht is een let op, zoals altijd, en zelf zeggen dat een nacht niet goed gemeten is kan dan niet.' },
    ],
  },
  terugknop: {
    title: 'Terugknop op een tab',
    lead: 'Wat de terugknop van je telefoon doet op een andere tab dan Vandaag.',
    points: [
      { head: 'Een blad of menu', text: 'sluit altijd eerst, wat je ook kiest.' },
    ],
  },
  hervatten: {
    title: 'Na een herstart',
    lead: 'Open je ASCEND binnen deze tijd opnieuw, dan kom je terug waar je was.',
    points: [
      { head: 'Daarna', text: 'begin je op Vandaag.' },
    ],
  },
};

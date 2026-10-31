// ASCEND: de uitleg achter de InfoButton in de instellingen. Eén bestand, zodat
// de rijen zelf kort blijven (docs/beslissingen/2026-10-22-instellingen-in-groepen.md).
//
// Elke uitleg heeft één zin vooraf en twee of drie korte punten met een
// vetgedrukt begin ("Altijd: ...", "Waarom: ..."). Zo is lange uitleg toch snel
// te lezen. Het begin van een punt is kort; de dubbele punt komt van de weergave.

export interface SettingsHelp {
  title: string;
  lead: string;
  points: { head: string; text: string }[];
}

export const SETTINGS_HELP: Record<string, SettingsHelp> = {
  aangepast: {
    title: 'Aangepaste instellingen',
    lead: 'ASCEND geeft bij elke keuze een advies. Hier staat wat jij zelf anders instelde.',
    points: [
      { head: 'Tikken', text: 'een regel opent de instelling zelf, waar je kunt kiezen. Kies je het advies, dan staat het weer terug.' },
      { head: 'Alles terugzetten', text: 'zet alles terug naar het advies. Wat je planning raakt zie je eerst als voorstel. Pas na Akkoord verandert het.' },
    ],
  },
  figuur: {
    title: 'Figuur',
    lead: 'Op het scherm Lichaam tik je op een spier of gewricht. Hier kies je of dat figuur een man of een vrouw is.',
    points: [
      { head: 'Automatisch', text: 'ASCEND neemt het over van een koppeling als die het weet. Nu weet geen enkele koppeling het, dus je ziet dan een man.' },
      { head: 'Man of vrouw', text: 'het silhouet verschilt een beetje in schouders, heupen en borst. De plekken en de oefeningen blijven hetzelfde.' },
    ],
  },
  intensiteit: {
    title: 'Intensiteit tellen',
    lead: 'De kaart Intensiteit op Je stand laat zien hoeveel van je loop- en wandelminuten rustig waren. Hier kies je waar ze op gebaseerd is.',
    points: [
      { head: 'Naar je hartslag', text: 'standaard: de minuten uit je hartslagprofiel, in rustig (zone 1 en 2), middel (zone 3) en hard (zone 4 en hoger). Zonder genoeg hartslag, drempel of maximum telt die training naar plan.' },
      { head: 'Naar het plan', text: 'elke training telt helemaal als wat ze bedoeld was, ook als je harder liep.' },
    ],
  },
  lucht: {
    title: 'Lucht bovenaan',
    lead: 'De lichte lucht met bergen bovenaan een tab kan in de avond fel zijn. Hier kies je wanneer ze donker wordt.',
    points: [
      { head: 'Op tijd', text: 'standaard met de zon: donker na zonsondergang en licht bij zonsopkomst op je plek, uitgerekend op de telefoon. Of een vast uur tot 07:00. ASCEND wisselt binnen een minuut.' },
      { head: 'Altijd licht of donker', text: 'de klok doet er dan niet toe.' },
      { head: 'Donker', text: 'dezelfde kaarten en kleuren, maar op diep marine met zachte bergen en een paar zwakke sterren.' },
    ],
  },
  plaatjes: {
    title: 'Plaatjes bij oefeningen',
    lead: 'Naast een oefening in Forge staat een klein kaartje met de spieren die werken. Tik erop en je ziet de beweging in drie stappen, de spieren op het lichaam en wat je moet doen, waar je op let en wat vaak misgaat.',
    points: [
      { head: 'Spierkaart en tekening', text: 'het advies. De tekeningen komen van Workout Guide en zijn van Everkinetic en Bryl Lim, CC BY-SA 4.0. Ze worden geladen als je een oefening opent, en op de achtergrond voor de oefeningen van je eigen trainingen. Zonder netwerk zie je dan alleen het spierkaartje.' },
      { head: 'Alleen spierkaart', text: 'de spieren en de uitleg, zonder tekening. Er wordt niets geladen.' },
      { head: 'Uit', text: 'geen kaartje bij een oefening. Het menu van een oefening houdt de uitleg.' },
      { head: 'Een andere variant', text: 'staat er een tekening van bijna dezelfde oefening, dan zegt een regel eronder wat anders is.' },
    ],
  },
  lijfvraag: {
    title: 'Hoe voelt je lijf?',
    lead: 'Een korte kaart op Vandaag: voel je iets van je week? Je tikt op een plek, kiest spierpijn, stijf of pijn, en krijgt wat kan helpen. Je planning verandert er niet door.',
    points: [
      { head: 'Alleen als er reden is', text: 'bij een open pijnmelding, een zware week voor je benen, of twee dagen na een tocht of wedstrijd, als spierpijn vaak pas komt. Hoogstens een keer per week.' },
      { head: 'Elke week', text: 'ook zonder reden, op de dag van de weekterugblik.' },
      { head: 'Uit', text: 'geen kaart. Op Lichaam meld je altijd zelf wat je voelt. Pijn in je benen blijft een hint geven bij zware beentrainingen.' },
    ],
  },
  lichterbenen: {
    title: 'Lichter bij vermoeide benen',
    lead: 'Na spierpijn of een zware loop stelt ASCEND een lichtere beendag of een dag later voor. Je kiest zelf, en je planning verandert nooit zonder jouw akkoord. De kaart komt ook voor een harde loop van vandaag, daar alleen met een dag later.',
    points: [
      { head: 'Met een voorstel', text: 'op een dag met een zware beendag, en spierpijn, een harde loop eerder die dag of een hoge beenindex, komt er een kaart op Vandaag. Lichter, een dag later of Liever niet.' },
      { head: 'Wat Lichter is', text: 'dezelfde training met minder gewicht, zeker 3 herhalingen over en een set minder per oefening (niet bij Alleen gewicht). Alleen oefeningen die je benen belasten. Het kan helpen om door te trainen zonder dat het te veel wordt.' },
      { head: 'MacroFactor blijft leidend', text: 'het schrijft de training voor. ASCEND slaat niets terug en zegt wat je er zelf kunt kiezen.' },
      { head: 'Alleen een regel of uit', text: 'de regel zegt wat ASCEND ziet, zonder knoppen. Uit zet ook de stille regel bij het verplaatsen van een beendag uit.' },
    ],
  },
  lichterbenenHoe: {
    title: 'Hoe licht',
    lead: 'Wat Lichter doet met een beendag. Het advies is zeker 3 herhalingen over en een set minder per oefening (niet bij Alleen gewicht).',
    points: [
      { head: 'Standaard', text: 'zeker 3 herhalingen over en van elke oefening met drie sets of meer vervalt de laatste.' },
      { head: 'Alleen gewicht', text: 'zeker 3 herhalingen over, alle sets blijven staan.' },
      { head: 'Extra licht', text: 'zeker 4 herhalingen over en een set minder.' },
    ],
  },
  beweging: {
    title: 'Beweging',
    lead: 'Hoeveel de app beweegt: een zachte indruk bij een tik, ringen die vollopen, getallen die optellen.',
    points: [
      { head: 'Normaal', text: 'alles, kort en rustig. De missiekaart ademt zacht en nieuwe voorstellen knipperen een of twee keer.' },
      { head: 'Rustig', text: 'alleen feedback op je tik en overgangen van bladen. Geen adem, puls of optellen.' },
      { head: 'Uit', text: 'alles staat meteen op zijn plek. Heeft je telefoon beperkte beweging aan, dan geldt dit altijd.' },
    ],
  },
  trillen: {
    title: 'Trillen',
    lead: 'Een korte tik in je hand als je iets doet: een schakelaar, een set afvinken, een training oppakken, Akkoord geven.',
    points: [
      { head: 'Wat', text: 'schakelaars en keuzes, een afgevinkte set, een training oppakken in Week, Akkoord op een voorstel, en twee stootjes bij een opgeslagen training of een behaalde mijlpaal.' },
      { head: 'Timers', text: 'het signaal als de rust in Forge of een rektimer om is, staat hier los van. Dat van Forge stel je in onder Signaal.' },
      { head: 'iPhone', text: 'op een iPhone bestaat trillen in de browser niet. Dan doet deze schakelaar niets.' },
    ],
  },
  wijzigingen: {
    title: 'Wijzigingen',
    lead: 'Na een training, een gemiste sessie of een nieuwe instelling kan je planning schuiven.',
    points: [
      { head: 'Vraag eerst', text: 'je ziet alles vooraf en kiest Akkoord. Alleen de weekcontrole zet wat ASCEND zelf plande meteen recht (rustdag vrij, ruimte tussen zware dagen), met de melding Planning bijgewerkt en ongedaan maken.' },
      { head: 'Deels zelf', text: 'weken verder weg past ASCEND zelf aan, met een melding. Deze en volgende week, of iets schrappen, vraagt altijd eerst.' },
      { head: 'Alles zelf', text: 'alles meteen, met een melding en ongedaan maken.' },
    ],
  },
  ambitie: {
    title: 'Ambitie',
    lead: 'Hoe snel de minuten van je lopen en tochten groeien.',
    points: [
      { head: 'Altijd', text: 'een training wordt nooit meer dan 10% langer dan je langste van de afgelopen maand.' },
      { head: 'Waarom', text: 'pezen en botten wennen langzamer dan je conditie.' },
      { head: 'Stevig', text: 'valt vanzelf terug op Standaard bij pijn of trainingen die te zwaar voelen.' },
    ],
  },
  langeLoopGroei: {
    title: 'Groei van de lange loop',
    lead: 'Hoe snel je lange loop groeit naar je hardloopwedstrijd. De 110% van je langste loop is het advies; daarboven is in het onderzoek geen veilige marge gevonden.',
    points: [
      { head: 'Volgens het onderzoek', text: 'elke week een stap van hoogstens 10%, met de lichtere week van de golf en de piek om de week. Tot 30% per twee weken gaf geen hoger risico, boven 30% wel (Nielsen 2014, matig).' },
      { head: 'Stevig', text: 'ook hoogstens 10% per week en binnen de 110%, maar de piek mag elke week staan.' },
      { head: 'Rustiger en Heel rustig', text: 'om de twee weken een stap, of per blok van vier weken zoals eerst.' },
      { head: 'Sneller dan het onderzoek', text: 'onder Geavanceerd: wekelijks tot 120% van je langste loop van 30 dagen. Boven 10% gaf in het grootste onderzoek ongeveer 64% meer kans op een overbelastingsblessure (Frandsen 2025, matig).' },
      { head: 'Altijd', text: 'de lichtere week, de herstart na een pauze en het rekenen vanaf wat je echt liep blijven.' },
    ],
  },
  meerdere: {
    title: 'Meerdere trainingen op één dag',
    lead: 'Mag ASCEND twee sessies op dezelfde dag plannen, als je tijd die dag het toelaat?',
    points: [
      { head: 'Automatisch', text: 'ASCEND beslist zelf op basis van je tijdbudget per dag.' },
      { head: 'Nee', text: 'nooit meer dan één training per dag.' },
      { head: 'Zwaar', text: 'benen en een zware loop op één dag staat apart onder Geavanceerd.' },
    ],
  },
  forge: {
    title: 'Kracht meerekenen',
    lead: 'ASCEND rekent stil mee met de krachttrainingen die je uit MacroFactor inleest.',
    points: [
      { head: 'Je krijgt', text: 'per oefening een voorstel voor de volgende keer.' },
      { head: 'Je planning', text: 'verandert er niet door.' },
    ],
  },
  forgeBijsturen: {
    title: 'Bijsturen in de training',
    lead: 'Was een set zwaarder dan bedoeld, dan stelt Forge voor de volgende sets een lichter gewicht voor.',
    points: [
      { head: 'Wanneer', text: 'als je een werkset afvinkt met minder herhalingen en RIR samen dan de onderkant van het bereik plus het RIR dat gevraagd was. Vulde je de RIR niet zelf in, dan beslissen de herhalingen.' },
      { head: 'Zo rekent het', text: 'uit die set schat Forge je kracht van vandaag, iets minder voor elke volgende set, en kiest het zwaarste gewicht van je sportschool waarbij je de onderkant nog haalt.' },
      { head: 'Jij beslist', text: 'met Lichter komt het gewicht in de sets die nog open staan en die je niet zelf aanpaste. Met Liever niet blijft alles zoals het was.' },
      { head: 'Past er niets', text: 'dan is er geen voorstel, in plaats van een gewicht dat veel te veel herhalingen geeft.' },
    ],
  },
  forgeSpotter: {
    title: 'Zonder spotter',
    lead: 'Een stang op je borst of je schouders kan je klem zetten als je tot het uiterste gaat. Daarom schrijft Forge hier minstens 1 herhaling in reserve voor.',
    points: [
      { head: 'Welke oefeningen', text: 'bankdrukken en schuin bankdrukken met een stang, en squatten met de stang op je rug of voor je. Toestellen, kabels en dumbbells niet.' },
      { head: 'Wat je ziet', text: 'het doel en de hint bij de set zijn minstens 1 over, met één klein teken bij de eerste set. Een tik op het teken legt het uit.' },
      { head: 'Nooit een slot', text: 'je kunt altijd 0 invullen als het zo ging. Het wordt bewaard zoals je het deed, en het teken verdwijnt dan.' },
      { head: 'Veiligheidsarmen', text: 'heeft je sportschool veiligheidsarmen of een rek met vangers, zet dat dan aan bij Je sportschool. Dan mag het 0 zijn.' },
      { head: 'Raak', text: 'een bewuste 1 waar MacroFactor 0 voorschreef telt niet als misser voor ASCEND.' },
    ],
  },
  spotterrek: {
    title: 'Veiligheidsarmen',
    lead: 'Zijn er in deze sportschool veiligheidsarmen of een rek met vangers, dan kun je een stang laten zakken als het niet lukt.',
    points: [
      { head: 'Dan mag het 0 zijn', text: 'Forge schrijft bij een stangoefening dan geen extra reserve voor, ook niet met Zonder spotter aan.' },
      { head: 'Per sportschool', text: 'dit hoort bij de sportschool die je koos. In een andere sportschool zonder rek staat het weer uit.' },
    ],
  },
  forgeRirVooraf: {
    title: 'RIR vooraf invullen',
    lead: 'Herhalingen in reserve (RIR) zijn alleen iets waard als jij ze zelf zei.',
    points: [
      { head: 'Als hint', text: 'het veld is leeg en het doel staat gedimd in beeld. Vul je niets in, dan wordt het doel bewaard met een merkje dat je het niet zelf invulde.' },
      { head: 'Met het doel', text: 'het doel staat er al als waarde, zoals voorheen. Raak je de set niet aan, dan krijgt hij hetzelfde merkje.' },
      { head: 'Waarom', text: 'ASCEND rekent met een aangenomen RIR als zwakke aanname en weet zo welke sets gemeten zijn. De rekenregels veranderen niet.' },
    ],
  },
  forgeDoorvoeren: {
    title: 'Wijzigingen doorvoeren',
    lead: 'Pas je het gewicht of de herhalingen van een set aan, dan kunnen de latere sets meegaan.',
    points: [
      { head: 'Gelijke sets', text: 'sets met hetzelfde gewicht en dezelfde herhalingen als deze set voor je wijziging nemen de nieuwe waarde over. Gewicht en herhalingen apart.' },
      { head: 'Zelfde verschil', text: 'ga je 2,5 kg omhoog, dan gaan de sets erna ook 2,5 kg omhoog. De herhalingen blijven.' },
      { head: 'Wat blijft staan', text: 'gedane sets, opwarmsets en sets die je zelf aanpaste. De RIR volgt nooit, die voel je per set.' },
    ],
  },
  forgeOpwarmen: {
    title: 'Opwarmen',
    lead: 'Opwarmsets komen vooral voor je eerste zware oefening van een lichaamsdeel, daarna zijn de spieren warm.',
    points: [
      { head: 'Eerste oefening', text: 'de volle opbouw, ongeveer 50% voor 8 en 80% voor 3 tot 4 van je werkgewicht. Slim rekent het uit je geschatte kracht, Schema vaste percentages.' },
      { head: 'Daarna', text: 'één aanloopset van 65 tot 70% voor 4 of 5 als de spieren al warm zijn, bijvoorbeeld een leg press na squats. Een oefening met één gewricht op warme spieren krijgt niets.' },
      { head: 'Nooit', text: 'bij lichte gewichten, curls, schouderheffingen, beencurls, kuiten, romp en oefeningen met vooral je eigen gewicht.' },
      { head: 'Per spiergroep of per oefening', text: 'standaard krijgt alleen de eerste zware oefening van benen of bovenlichaam de volle opbouw. Kies je Per oefening, dan krijgt elke samengestelde oefening de volle opbouw. De rust na de opwarming staat vast op 90 of 60 seconden.' },
      { head: 'Geen gewicht bekend', text: 'dan staan er lege opwarmrijen die zich vullen zodra je bij de eerste set een gewicht invult.' },
    ],
  },
  forge1rm: {
    title: 'Geschatte 1RM',
    lead: 'Per oefening staat op Forge je geschatte 1RM, met een kleine trend door de tijd.',
    points: [
      { head: 'Een schatting', text: 'uit je laatste sets, geen test. Het is hetzelfde getal waar ASCEND mee rekent.' },
      { head: 'Uit', text: 'dan laat Forge alleen het werkgewicht zien, zonder schakelaar. Je voorstel voor de volgende keer blijft staan.' },
    ],
  },
  forgeWeergave: {
    title: 'Forge toont',
    lead: 'Elke oefening op Forge heeft twee kanten: je geschatte 1RM en het werkgewicht.',
    points: [
      { head: '1RM', text: 'het getal van nu, de verandering over vier weken en een lijn door de tijd. Staat er een 1RM uit MacroFactor, dan staat die ernaast.' },
      { head: 'Werkgewicht', text: 'het gewicht dat je volgens de schatting aankunt bij het aantal herhalingen van die oefening, met de lijn van eerder.' },
      { head: 'Eén keuze', text: 'voor alle kaarten. Tik je op een kaart op de andere kant, dan verandert dit ook.' },
    ],
  },
  forge1rmMacrofactor: {
    title: 'MacroFactor-1RM erbij',
    lead: 'MacroFactor schat ook een 1RM. ASCEND zet die naast die van jezelf, zonder ze te mengen.',
    points: [
      { head: 'Waar het vandaan komt', text: 'uit het blad "Exercises - 1-RM" van de volledige export. Lees de export opnieuw in voor nieuwe dagen.' },
      { head: 'Twee getallen', text: 'ze kunnen verschillen, want MacroFactor en ASCEND rekenen niet hetzelfde. Gebruik ze voor de richting, niet als maximum dat je moet halen.' },
      { head: 'Uit', text: 'dan staat er alleen de schatting van ASCEND. Wat je ingelezen hebt blijft bewaard.' },
    ],
  },
  forgeVergelijken: {
    title: 'Vergelijken met',
    lead: 'Forge zet het getal van nu naast het getal van eerder, zodat je het verschil ziet.',
    points: [
      { head: '4 en 8 weken', text: 'het advies, een maand en twee maanden terug. Daarnaast staat altijd het beste ooit.' },
      { head: 'Andere momenten', text: 'kies 2 en 4 weken als je vaak traint, of 12 en 26 weken voor het lange werk.' },
      { head: 'Geen oordeel', text: 'het verschil is een kleine regel. Gelijk of lager is geen mislukking, een hogere 1RM is niet het enige doel.' },
    ],
  },
  forgeLeren: {
    title: 'Gewichten van toestellen',
    lead: 'Bij een toestel of kabel met een gewichtstapel bepaal je hoe streng ASCEND is met de gewichten die het voorstelt.',
    points: [
      { head: 'Geleerd en geschat', text: 'het onthoudt de gewichten die je op dat toestel pakte, ook bij opwarmen. Boven en onder wat je gebruikte telt de stap die je op het toestel twee keer zag, anders de stap uit je sportschool. Een grote kloof ertussen wordt opgevuld. Zo kan er een gewicht tussen zitten dat het toestel niet heeft.' },
      { head: 'Alleen wat je gebruikte', text: 'ASCEND stelt nooit een gewicht voor dat je er nog niet pakte. Vraagt je kracht om zwaarder, dan blijft het gewicht staan en gaan de herhalingen omhoog. Haal je de bovenkant met genoeg over, dan kies je zelf het eerstvolgende gewicht op het toestel. Zonder gebruikte gewichten op dat toestel gelden de stappen van je profiel.' },
      { head: 'Stappen van je profiel', text: 'ASCEND rondt af op de stap die je bij Kabels en toestellen instelde.' },
      { head: 'Eigen lijst', text: 'vulde je de gewichten van een toestel zelf in (Gewichten per toestel), dan gelden precies die, in elke keuze hierboven.' },
    ],
  },
  toestelgewichten: {
    title: 'Gewichten per toestel',
    lead: 'Staan de gewichten van een kabel of toestel in je hoofd, vul ze dan een keer in. ASCEND stelt er dan alleen gewichten uit voor.',
    points: [
      { head: 'Invullen', text: 'typ de gewichten met een spatie ertussen, bijvoorbeeld 4,5 9 13,5 18. Je kunt ze ook tijdens een training invullen, in het menu van de oefening.' },
      { head: 'Per sportschool', text: 'dezelfde kabel heeft in een andere sportschool andere gewichten, dus de lijst hoort bij de sportschool die je koos.' },
      { head: 'Aanpassen of wissen', text: 'een lijst kun je altijd veranderen. Wis je hem, dan leert en schat ASCEND weer zoals je bij Gewichten van toestellen koos.' },
    ],
  },
  tussengewichten: {
    title: 'Tussengewichten',
    lead: 'Heb je een los plaatje of een magneet dat je bij het blok van een toestel legt, vul het dan een keer in. ASCEND telt het bij elk gewicht van het blok op.',
    points: [
      { head: 'Voorbeeld', text: 'het blok gaat in stappen van 5 kg en je hebt een los gewicht van 2,3 kg. Dan kan het toestel 65, 67,3, 70, 72,3 en zo verder. Forge laat zien waar zo\'n gewicht uit bestaat, bijvoorbeeld 70 + 2,3.' },
      { head: 'Hele sportschool', text: 'wat je hier invult geldt voor alle kabels en toestellen met een gewichtstapel in deze sportschool.' },
      { head: 'Per toestel', text: 'een toestel kan een eigen tussengewicht hebben, of geen terwijl de sportschool er wel een heeft. Dat kies je bij het toestel, ook in het menu van de oefening in een training.' },
      { head: 'Meer dan één', text: 'je kunt er hoogstens drie invullen, bijvoorbeeld 1,25 en 2,5. ASCEND gebruikt ze alleen of samen, elk hoogstens één keer.' },
    ],
  },
  gymProfiel: {
    title: 'Sportschool',
    lead: 'Train je in twee sportscholen, kies dan hier waar je nu bent.',
    points: [
      { head: 'Wat erbij hoort', text: 'de stangen, schijven en dumbbells, de gewichten per toestel en wat ASCEND leert over de gewichten die je gebruikte.' },
      { head: 'Je log', text: 'een nieuwe krachttraining onthoudt in welke sportschool hij was. Oudere trainingen hebben dat niet en tellen overal mee.' },
      { head: 'MacroFactor', text: 'eindigt de naam van een workout op " @ " en de naam van een sportschool, dan hoort hij daarbij.' },
    ],
  },
  forgePauze: {
    title: 'Na een pauze lichter beginnen',
    lead: 'Na meer dan vier weken zonder krachttraining begint het voorstel iets lichter.',
    points: [
      { head: 'Waarom', text: 'tot ongeveer vier weken verlies je weinig kracht, daarna meer (matig bewijs).' },
      { head: 'Alleen een echte pauze', text: 'rustte alleen deze oefening terwijl je wel krachttraining deed, dan begint hij op je laatste niveau.' },
      { head: 'Hoeveel', text: 'het voorstel rekent met 5% minder kracht en kijkt na die training opnieuw.' },
      { head: 'Uit', text: 'dan begint het voorstel ook na een lange pauze op je laatste niveau.' },
    ],
  },
  forgeVermoeidheid: {
    title: 'Vermoeidheid per set',
    lead: 'Elke werkset kost de volgende een beetje kracht. Hoeveel verschilt per oefening.',
    points: [
      { head: 'Leren per oefening', text: 'ASCEND kijkt in je eigen sets hoeveel geschatte kracht je van set tot set verliest en rekent daarmee voor de latere sets, de verwachte herhalingen en het bijsturen. Met weinig sets blijft het dicht bij 3%.' },
      { head: 'Vast 3%', text: 'elke oefening krijgt dezelfde daling, wat je ook deed.' },
      { head: 'Waarom', text: 'hoeveel herhalingen je van set tot set verliest hangt af van de oefening, het gewicht en de rust (matig bewijs).' },
    ],
  },
  forgeDumbbells: {
    title: 'Dumbbells in je log',
    lead: 'Sommigen loggen bij een duwoefening het totaal van twee dumbbells, anderen het gewicht per dumbbell.',
    points: [
      { head: 'Vanzelf herkennen', text: 'staat in het logboek van een oefening een gewicht dat zwaarder is dan je zwaarste dumbbell, dan leest ASCEND die oefening als totaal. Log je ook bij lichtere oefeningen het totaal, kies dan Totaal van twee.' },
      { head: 'Totaal', text: 'de gewichten zijn de sommen van twee gelijke dumbbells uit je rek, en het gewicht staat erbij als "60 kg (2 x 30)".' },
      { head: 'Eén dumbbell', text: 'een oefening met één dumbbell, zoals de goblet squat, wordt nooit verdubbeld.' },
    ],
  },
  forgeNaast: {
    title: 'ASCEND naast MacroFactor',
    lead: 'Onderaan Forge staat hoe vaak een voorstel raak was: binnen het herhalingenbereik, met de herhalingen in reserve die de training vraagt.',
    points: [
      { head: 'Dezelfde toets', text: 'wat je deed en wat ASCEND voorstelde worden voor dezelfde set aan dezelfde dag gehouden, met dezelfde maat. Of de gewichten gelijk zijn zegt niets.' },
      { head: 'Een schatting', text: 'voor ASCEND is raak achteraf een schatting uit de beste set van die dag. Pakte je in Forge het voorgestelde gewicht, dan is het gewoon wat er gebeurde.' },
      { head: 'Uit', text: 'het blok staat dan niet op Forge. De stand zie je hier, onder de schakelaar.' },
    ],
  },
  forgeSinds: {
    title: 'Stil meten sinds',
    lead: 'De dag waarop ASCEND begon om stil mee te rekenen. Wat daarna kwam, staat apart naast alles.',
    points: [
      { head: 'Standaard', text: '24 oktober 2026, de dag dat het MacroFactor-programma half af was.' },
      { head: 'Waarom', text: 'trainingen van voor het inlezen van je programma zijn met de huidige template en instellingen achteraf herberekend, en zeggen minder.' },
    ],
  },
  forgeOefeningen: {
    title: 'Oefeningen in een training',
    lead: 'Een oefening per scherm: je veegt opzij naar de volgende oefening, zoals in MacroFactor, en bovenaan staat een strook met een kaartje per oefening.',
    points: [
      { head: 'Een per scherm', text: 'het advies. Tik op een kaartje in de strook om naar die oefening te springen; een afgeronde oefening heeft een vinkje. Naar beneden scrollen kan binnen een oefening gewoon.' },
      { head: 'Een set verwijderen', text: 'veeg op het nummer of het voorschrift van de set naar links, zoals altijd. Elders op het scherm wisselt vegen van oefening.' },
      { head: 'Onder elkaar', text: 'alle oefeningen op een pagina, zoals eerst. Je kunt dit ook in het menu van de training zelf zetten.' },
    ],
  },
  forgeOnderbreking: {
    title: 'Lange onderbreking vragen na',
    lead: 'Een training in Forge blijft open tot je afrondt of verwijdert, ook als je de app sluit. Kom je terug na een lange stilte, dan vraagt Forge eenmaal of die tijd meetelt.',
    points: [
      { head: 'Nee, als pauze', text: 'het advies. De tijd vanaf je laatste handeling tot nu wordt een pauze, en de duur van de training blijft eerlijk.' },
      { head: 'Ja, telt mee', text: 'de klok loopt door alsof je er was, bijvoorbeeld bij een lange rust tussen twee blokken.' },
      { head: 'Uit', text: 'Forge vraagt niets en telt alles mee. Pauzeren kan altijd zelf in het menu van de training.' },
    ],
  },
  forgeVegen: {
    title: 'Vegen om te verwijderen',
    lead: 'In een training haal je een set weg door de rij naar links te vegen. Uit, dan beweegt de rij niet meer mee met je vinger.',
    points: [
      { head: 'Uit', text: 'een set verwijderen kan nog altijd: houd de rij ingedrukt en kies Set verwijderen.' },
      { head: 'Aan', text: 'een korte veeg laat een rode knop zien, een lange veeg verwijdert meteen. Je kunt het direct terugdraaien.' },
    ],
  },
  forgeSnelknoppen: {
    title: 'Snelknoppen tonen',
    lead: 'Onder de naam van elke oefening staan de handelingen die je tijdens een training het vaakst nodig hebt. Het menu met de drie puntjes houdt alles.',
    points: [
      { head: 'De knoppen', text: 'Ruilen, Opwarmset en Notitie. Bij een oefening op tijd alleen Ruilen en Notitie. Een set toevoegen doe je met de knop onder de sets.' },
      { head: 'Uitleg en vorige keer', text: 'die hebben al een plek: het kaartje links van de naam en de kolomkop Vorige.' },
      { head: 'Uit', text: 'de rij verdwijnt, alles staat nog in het menu. Je kunt dit ook in het menu van de training zelf zetten.' },
    ],
  },
  forgeLijntjes: {
    title: 'Lijntjes in de lijst',
    lead: 'Een klein lijntje naast elke oefening laat in één oogopslag zien hoe het de laatste trainingen ging.',
    points: [
      { head: 'Het lijntje', text: 'de laatste tien trainingen, met hetzelfde getal als rechts in de rij. Het puntje is je laatste training.' },
      { head: 'Openklappen', text: 'klap je een oefening open, dan staat de hele grafiek erboven.' },
      { head: 'Uit', text: 'alleen de getallen, de grafiek staat dan nog in de geschiedenis.' },
    ],
  },
  forgeExtras: {
    title: 'Wat er verder veranderde',
    lead: 'Vooruitgang is niet altijd een hogere 1RM. Forge laat ook de rest zien.',
    points: [
      { head: 'Herhalingen', text: 'meer herhalingen bij hetzelfde gewicht als eerder.' },
      { head: 'Zwaarste gewicht', text: 'het zwaarste gewicht van je beste set.' },
      { head: 'Volume', text: 'gewicht maal herhalingen over de werksets van een training. Opwarmsets tellen niet mee.' },
    ],
  },
  forgeSchijven: {
    title: 'Schijven bij de set',
    lead: 'Onder een werkset met een stang staat welke schijven je per kant nodig hebt.',
    points: [
      { head: 'Tik erop', text: 'dan opent het invoerpaneel met de stang erbij getekend.' },
      { head: 'Je sportschool', text: 'de schijven en stangen komen uit je sportschoolprofiel.' },
    ],
  },
  gewicht: {
    title: 'Lichaamsgewicht',
    lead: 'ASCEND rekent met je trendgewicht, want dat is rustiger dan één weging.',
    points: [
      { head: 'Uit MacroFactor', text: 'staat er een trendgewicht in de export, dan gebruikt ASCEND dat. Anders de weging zelf.' },
      { head: 'Waarvoor', text: 'je rugzak als deel van je lichaamsgewicht, de beenindex en eiwit per kilo.' },
      { head: 'Zelf invullen', text: 'een globaal getal is genoeg.' },
    ],
  },
  vetpercentage: {
    title: 'Vetpercentage',
    lead: 'Een weegschaal schat je vet met een zwak stroompje door je lichaam. Kijk daarom naar de trend, niet naar één dag.',
    points: [
      { head: 'Eerlijk', text: 'de meting schommelt met vocht, eten en het tijdstip, en het getal zelf kan een paar procentpunten naast de werkelijkheid zitten.' },
      { head: 'Wel bruikbaar', text: 'de richting over weken, als je steeds onder dezelfde omstandigheden weegt, bijvoorbeeld in de ochtend en nuchter. ASCEND zet het gemiddelde van je laatste 7 metingen naast dat van 4 weken eerder.' },
      { head: 'Vetvrije massa', text: 'je gewicht min het vet. Voor kracht en de GR5 zegt die meer dan het percentage: je kunt lichter worden en toch je spieren houden.' },
    ],
  },
  'wat-teken': {
    title: 'Training wijkt af',
    lead: 'Bij een rustige loop met een hartslag die duidelijk afwijkt van je vergelijkbare loopjes, staat een klein hartslagteken naast de naam.',
    points: [
      { head: 'Wanneer', text: 'alleen als de afwijking minstens 1,5 keer de gewone schommeling is, zoals bij het loopinzicht. Krachttraining krijgt het nooit.' },
      { head: 'Kleur', text: 'amber zolang je niets invulde, gedimd zodra je het blad bekeek of iets koos.' },
      { head: 'Privé', text: 'in de lijst staat nooit de reden zelf.' },
    ],
  },
  'wat-oorzaak': {
    title: 'Mogelijke oorzaak',
    lead: 'In het blad van een training en van een dag zegt ASCEND wat het al weet, met de bron erbij. Dat hoef je niet te bevestigen.',
    points: [
      { head: 'Wat ASCEND weet', text: 'warmte uit het weer, een zware beendag uit je logboek, een korte nacht van je horloge en een ziekmelding. ASCEND telt dit zelf mee in "Wat doet dit met je?", ook als deze instelling uit staat. Je hoeft alleen vast te leggen wat ASCEND niet kan weten.' },
      { head: 'Je patroon', text: 'in het blad van een training zegt ASCEND "lijkt op" pas als een reden minstens 4 keer is vastgelegd en je gewone loopjes ook, en de banden elkaar niet raken.' },
      { head: 'Alcohol en wiet', text: 'noemt ASCEND nooit uit zichzelf.' },
    ],
  },
  'wat-namen': {
    title: 'Voorbeelden bij naam noemen',
    lead: 'In de uitleg van Wat speelde er kunnen alcohol en wiet bij naam staan, als geheugensteun.',
    points: [
      { head: 'Aan', text: 'de uitleg noemt alcohol en wiet bij naam.' },
      { head: 'Uit', text: 'dezelfde uitleg in neutrale woorden, zoals "wat je dronk of gebruikte". De keuzes waar je zelf een notitie mee maakt blijven gewoon staan.' },
      { head: 'Altijd', text: 'ASCEND noemt zelf nooit alcohol of wiet als reden in een lijst, een melding of een tekst voor Strava.' },
    ],
  },
  'wat-overzicht': {
    title: 'Op Je stand',
    lead: 'Vanaf 3 keer per reden laat Je stand zien wat het met je rusthartslag, HRV, slaap, hartslag bij tempo en zwaarte doet.',
    points: [
      { head: 'Vergeleken met', text: 'je eigen normale schommeling, niet met een norm.' },
      { head: 'Feiten', text: 'getallen, zonder oordeel.' },
    ],
  },
  'wat-test': {
    title: 'Test verschuiven',
    lead: 'ASCEND kan voorstellen een testloop te verschuiven na een avond die je zelf zwaar noteerde.',
    points: [
      { head: 'Wanneer', text: 'als er die dag een testloop staat en je de avond ervoor 3 of meer glazen vastlegde, of als er morgen een staat na 6 of meer glazen. Bij wiet alleen op dezelfde dag.' },
      { head: 'Altijd een voorstel', text: 'het gaat zoals elk voorstel met Akkoord. Gewone trainingen schuiven nooit om een reden.' },
    ],
  },
  drempel: {
    title: 'Drempel',
    lead: 'De hartslag die je ongeveer een uur vol kunt houden. Garmin noemt hem lactaatdrempel (LTHR).',
    points: [
      { head: 'Waar', text: 'in Garmin Connect, bij je hartslagzones.' },
      { head: 'Zonder', text: 'rekent ASCEND met je maximale hartslag. Dat is minder precies.' },
    ],
  },
  hartslagHorloge: {
    title: 'Hartslag op je horloge',
    lead: 'Bij een hartslagdoel krijgt je horloge slagen. Die komen uit de zones van ASCEND of uit die van intervals.icu.',
    points: [
      { head: 'ASCEND', text: 'je horloge piept op dezelfde slagen als waarmee ASCEND de training achteraf beoordeelt.' },
      { head: 'intervals.icu', text: 'ASCEND stuurt alleen de zonenaam en intervals.icu rekent die om met zijn eigen drempel. Dat kan anders uitkomen.' },
      { head: 'Rustige loop', text: 'bij een rustige of lange duurloop loopt de grens van het begin van zone 1 tot het einde van zone 2. Hardlopend kom je zelden onder zone 1, dus het horloge piept vooral als je te hoog gaat.' },
      { head: 'Ontbreekt er iets', text: 'zonder drempel of maximale hartslag, of als intervals.icu die niet laat lezen, blijft het bij de zonenaam.' },
    ],
  },
  vanzelfAfvinken: {
    title: 'Vanzelf afvinken',
    lead: 'Een training van je horloge vinkt zichzelf af, maar alleen als het niet anders kan.',
    points: [
      { head: 'Alleen', text: 'dezelfde dag, één geplande training van dezelfde soort en ongeveer even lang.' },
      { head: 'Nooit', text: 'een test of wedstrijd. Die vink je zelf af.' },
      { head: 'Daarna', text: 'vraagt ASCEND hoe het ging. Met Klopt niet haal je het weg.' },
    ],
  },
  reeksenBewaren: {
    title: 'Volledige reeks bewaren',
    lead: 'Je horloge schrijft bijna elke seconde je tempo, hartslag en hoogte op. ASCEND kan dat helemaal op deze telefoon bewaren.',
    points: [
      { head: 'Waarvoor', text: 'kilometer na kilometer, de rondes van je horloge en de grafieken van een run. Een drempel die later verandert, rekent ASCEND zo opnieuw uit zonder iets op te halen.' },
      { head: 'Ruimte', text: 'ongeveer 120 KB voor een uur lopen. Een jaar loopjes en tochten is al snel enkele tientallen MB.' },
      { head: 'Uit', text: 'ASCEND houdt alleen de korte samenvatting en de kilometers. Wat al bewaard is blijft staan tot je het zelf verwijdert.' },
      { head: 'Je route', text: 'wordt nooit bewaard. Alleen de richting per kilometer telt, voor de wind, en die blijft als getal staan.' },
    ],
  },
  reeksenBackup: {
    title: 'Reeksen in back-up',
    lead: 'De reeksen van je horloge komen van intervals.icu, maar die kan ze later misschien niet meer geven. Daarom gaan die van de laatste 2 jaar standaard mee in je back-up.',
    points: [
      { head: 'De laatste 2 jaar', text: 'een reeks is ongeveer 100 KB per training, een jaar zo 15 tot 25 MB. Zo blijft de back-up te hanteren en heb je de recente runs heel.' },
      { head: 'Alle of geen', text: 'alle reeksen geeft een back-up die elk jaar groeit. Geen reeksen geeft een kleine back-up; na een herstel haalt ASCEND ze opnieuw op zolang dat kan.' },
      { head: 'Altijd mee', text: 'de samenvatting per loop: kilometers, rondes en je beste stukken. Die staan op de training zelf.' },
      { head: 'Kopieën van voor een import', text: 'bevatten de reeksen nooit. Die kopie is er alleen om een import ongedaan te maken.' },
    ],
  },
  voorstellenOpruimen: {
    title: 'Oude voorstellen opruimen',
    lead: 'Elk voorstel dat je zag, bewaart ASCEND met alle details. Na een paar maanden leest niets die details nog, dus maakt ASCEND er een korte regel van.',
    points: [
      { head: 'Blijft staan', text: 'de datum, de titel, of je Akkoord of Liever niet koos, en wat het uit je planning haalde.' },
      { head: 'Nooit', text: 'een voorstel dat nog open staat, een training die er nog aan vastzit, iets wat je ongedaan maakte, of een vrije periode die nog bestaat. Je trainingen zelf blijven altijd zoals ze waren.' },
      { head: 'Wanneer', text: 'bij het openen van een nieuwe versie en vlak voor je een back-up maakt.' },
    ],
  },
  ruimteApp: {
    title: 'Ruimte op dit toestel',
    lead: 'Je browser geeft ASCEND een deel van de ruimte op je telefoon. Hier zie je hoeveel daarvan in gebruik is.',
    points: [
      { head: 'Bijna vol', text: 'boven 80 % waarschuwt ASCEND. Maak dan een back-up en verwijder de reeksen onder Ruimte van reeksen; de kilometers blijven.' },
      { head: 'Ongeveer', text: 'de browser geeft een schatting, geen exact getal.' },
    ],
  },
  stravaTekst: {
    title: 'Tekst voor Strava',
    lead: 'Strava geeft elke activiteit een eigen naam. ASCEND zet een korte beschrijving klaar die je zelf in Strava plakt.',
    points: [
      { head: 'Waar', text: 'een kleine knop bij een gedane training in het logboek en in de vraag erna op Vandaag.' },
      { head: 'Wat', text: 'één of twee regels, zoals 4× hard bergop, 4× rustig op en beheerst af, met afstand, tijd en stijging als je horloge ze had.' },
      { head: 'Zelf plakken', text: 'ASCEND schrijft niet naar Strava, want daar is een server voor nodig en die heeft ASCEND bewust niet.' },
    ],
  },
  garminLeidend: {
    title: 'Garmin is leidend',
    lead: 'Komt een training die je zelf invulde ook van je horloge, dan tellen de cijfers van het horloge.',
    points: [
      { head: 'Overgenomen', text: 'duur, afstand, hartslag en hoogtemeters.' },
      { head: 'Blijft staan', text: 'gevoel, inspanning, pijn en je rugzak.' },
      { head: 'Terug', text: 'je eigen cijfers zijn bewaard; je kunt ze terugzetten.' },
    ],
  },
  correctiesOvernemen: {
    title: 'Correcties uit intervals.icu overnemen',
    lead: 'Knip je in intervals.icu een stuk van een training af, of corrigeer je de hoogtemeters of de afstand, dan neemt ASCEND dat over.',
    points: [
      { head: 'Overgenomen', text: 'duur, afstand, stijging, daling, hartslag en cadans, alleen als ze in intervals.icu veranderden.' },
      { head: 'Blijft staan', text: 'gevoel, inspanning, pijn, notities, je rugzak, je krachtsets en de koppeling aan je planning.' },
      { head: 'Ingekort in ASCEND', text: 'dan blijft je inkorting staan en vraagt het logboek of je de nieuwe cijfers wilt.' },
      { head: 'Terug', text: 'de vorige cijfers zijn bewaard; in het logboek zet je ze terug.' },
    ],
  },
  macrofactorLeidend: {
    title: 'Leidend voor kracht',
    lead: 'Voor een krachttraining die je al vastlegde, nemen de cijfers van MacroFactor het over.',
    points: [
      { head: 'Overgenomen', text: 'duur, oefeningen, sets en herhalingen in reserve.' },
      { head: 'Blijft staan', text: 'gevoel, inspanning, pijn en notities.' },
      { head: 'Uit', text: 'ASCEND vult alleen aan wat nog leeg is.' },
    ],
  },
  plaats: {
    title: 'Plaats voor het weer',
    lead: 'ASCEND haalt het weer bij Open-Meteo, voor één plek.',
    points: [
      { head: 'Volgt je locatie', text: 'je plek, afgerond op ongeveer een kilometer, wordt bijgewerkt als je de app opent. Hoogstens eens per uur.' },
      { head: 'Vaste plaats', text: 'de plek die je koos blijft zoals ze is.' },
      { head: 'Toestemming', text: 'zonder toestemming van je telefoon gebeurt er niets.' },
    ],
  },
  besteMoment: {
    title: 'Beste moment',
    lead: 'Is het weer op je gewone uur slechter dan later of eerder op dezelfde dag, dan staat er onder het weer één regel, zoals "Beste moment: 16 tot 17.30 uur, droog".',
    points: [
      { head: 'Alleen als het echt scheelt', text: 'een klasse beter (slecht, let op, prima), of regen of wind die onder de drempel van ASCEND blijft.' },
      { head: 'Altijd in het licht', text: 'tussen zonsopkomst en zonsondergang, en niet in het verleden.' },
      { head: 'Anders niets', text: 'is je gewone uur al prima, of is er geen beter blok, dan staat er niets extra.' },
    ],
  },
  kaarten: {
    title: 'Kaarten op Vandaag',
    lead: 'Een profiel zet in een keer de losse schakelaars voor je. Je training staat altijd op Vandaag.',
    points: [
      { head: 'Alles laten zien', text: 'alle kaarten, zoals het advies.' },
      { head: 'Alleen het belangrijkste', text: 'je training, de ochtendcheck en het weer. Weekterugblik, vraag van de week, citaat, ochtendkaart en geluid gaan uit.' },
      { head: 'Alleen je training', text: 'ook de ochtendcheck en het weer gaan uit.' },
      { head: 'Aangepast', text: 'je losse schakelaars passen bij geen profiel. Je kunt ze hieronder zelf zetten.' },
    ],
  },
  ochtendcheck: {
    title: 'Ochtendcheck',
    lead: 'Een korte vraag over je benen, energie en slaap, voor je training.',
    points: [
      { head: 'Moe', text: 'dan kan ASCEND een rustiger dag voorstellen.' },
      { head: 'Pijn', text: 'een pijnplek van de laatste twee weken blijft altijd gevolgd, ook als dit uit staat.' },
      { head: 'Horloge', text: 'slaap en hartslag kun je erin laten meetellen bij Koppelingen.' },
    ],
  },
  ochtendkaart: {
    title: 'Ochtendkaart',
    lead: 'Bovenaan Vandaag staat in de ochtend de vraag hoe je je voelt, zodat je hem niet hoeft te zoeken.',
    points: [
      { head: 'Alvast ingevuld', text: 'je slaap uit je horloge, en je benen volgens je beenindex. Bij elke keuze staat waar hij vandaan komt.' },
      { head: 'Slaap', text: 'gaat via Garmin Connect naar intervals.icu en komt soms later binnen dan je rusthartslag. Staat hij er nog niet, tik dan op Opnieuw ophalen.' },
      { head: 'Wanneer', text: 'vanaf het uur bij Ochtend begint om (standaard 5 uur), dus niet meteen na middernacht.' },
      { head: 'Weg', text: 'zodra je hebt ingevuld, na twaalven of als je training van vandaag gelogd is.' },
      { head: 'Uit', text: 'de vraag blijft staan als regel bij Je dag.' },
    ],
  },
  zweetVragen: {
    title: 'Zweetverlies vragen',
    lead: 'Bij een loop, wandeling of tocht herinnert ASCEND je om je te wegen en vraagt het na afloop naar je gewicht, zodat je je eigen zweettempo leert kennen.',
    points: [
      { head: 'Vooraf', text: 'op de missiekaart staat een kleine regel om je gewicht in te vullen. Heeft MacroFactor vandaag of gisteren een gewicht, dan staat dat er als voorstel. Het wordt nooit zonder tik overgenomen.' },
      { head: 'Na afloop', text: 'bij Hoe ging het en op het scherm Gedaan staat een rij voor je gewicht na. Vergat je je te wegen, dan kun je allebei achteraf invullen, of de schatting van je horloge.' },
      { head: 'Achteraf', text: 'blijft kunnen in het Logboek, bij de training zelf.' },
      { head: 'Uit', text: 'dan vraagt ASCEND niets. Je wegingen blijven bewaard.' },
    ],
  },
  weekbudget: {
    title: 'Weekbudget',
    lead: 'Zonder doel telt ASCEND wat je in een week deed tegen een budget in minuten en keren kracht.',
    points: [
      { head: 'Advies', text: '150 minuten en 2 keer kracht per week. Dat is de beweegrichtlijn. Met een gekozen richting past het budget zich aan: Rustig aan is 90 minuten en 1 keer kracht, Sterker worden 120 minuten en 3 keer kracht.' },
      { head: 'Wat telt', text: 'een matige minuut telt 1, een pittige minuut telt 2. Kracht telt niet in de minuten maar als aparte teller: een krachttraining is een keer.' },
      { head: 'Onder de richtlijn', text: 'minder dan 150 minuten of 2 keer kracht mag. Het is jouw keuze en ASCEND zegt het alleen rustig.' },
      { head: 'Planning', text: 'het budget leest alleen wat je deed. Je planning verandert er niet van. Dat volgt in een volgende versie.' },
    ],
  },
  twijfeltest: {
    title: 'Twijfeltest eerst vragen',
    lead: 'Is een testloop duidelijk trager dan je vorige, dan vraagt ASCEND eerst of hij meetelt voor je tempo\'s.',
    points: [
      { head: 'Waarom', text: 'fietsen vooraf, wind of vermoeide benen maken een test trager. Dat zegt weinig over je vorm.' },
      { head: 'Zonder antwoord', text: 'blijven je tempo\'s die van je vorige test.' },
      { head: 'Telt mee', text: 'dan zie je eerst welke tempo\'s veranderen, en pas na Akkoord gaan ze in.' },
      { head: 'Telt niet mee', text: 'de test blijft in je logboek, maar telt niet voor je tempo\'s en je voorspelling. Dat kun je bij elke test achteraf ook kiezen.' },
      { head: 'Snelste 5 km', text: 'leest ASCEND achteraf uit je horloge. Verandert dat een tempo, dan staat er een rustige regel op Vandaag. Tik erop en kijk of die mag tellen.' },
      { head: 'Uit', text: 'dan telt de laatste test altijd, zoals vroeger.' },
    ],
  },
  nieuweTest: {
    title: 'Nieuwe test voorstellen bij stilstand',
    lead: 'Stond je veel stil tijdens je testloop, dan stelt ASCEND een nieuwe poging voor.',
    points: [
      { head: 'Wanneer', text: 'meer dan een minuut stilstand of meer dan 3 keer stilstaan in je snelste 5 km, of een test die nog op je antwoord wacht.' },
      { head: 'Wat er gebeurt', text: 'je eerstvolgende harde loop, minstens 3 dagen later, wordt die dag een testloop van 5 km. Er komt geen training bij. Wat in de weg staat schuift mee in hetzelfde voorstel; wat jij vastzette alleen met je Akkoord en met naam in de tekst. Een zware beendag schuift eerst naar na de test en vervalt pas als er geen dag voor is.' },
      { head: 'Alleen met Akkoord', text: 'je ziet eerst wat er verandert. Met Liever niet blijft alles staan en vraagt ASCEND er niet meer naar voor deze test.' },
      { head: 'Geen goede dag', text: 'zijn je benen op geen enkele dag binnen 10 dagen fris genoeg te krijgen, valt de dag in een vakantie of tocht, of staat er al een test gepland, dan zegt ASCEND niets.' },
    ],
  },
  weekVoorstel: {
    title: 'Voorstel bij een probleem in de week',
    lead: 'Staat er in je week iets wat niet klopt en mag ASCEND het niet zelf herstellen, omdat jij of een eerder voorstel de training vastzette, dan krijg je een voorstel met Akkoord.',
    points: [
      { head: 'Wat telt als probleem', text: 'geen rustdag, zware beendagen te dicht op elkaar, twee harde loopjes op een dag, een zware training na een test, twee volle lange trainingen, benen niet fris voor een test.' },
      { head: 'Liever niet', text: 'dan blijft je week zoals hij is. De melding blijft rustig staan, zodat je het probleem wel ziet.' },
      { head: 'Nooit stil', text: 'ASCEND verschuift niets zonder jouw Akkoord. In een volle week kan het voorstel de lichtste training laten vervallen, nooit een lange duurloop, harde loop, test, wedstrijd of tocht.' },
      { head: 'Uit', text: 'dan blijven de melding en de teksten in de rijen, maar komt er geen knop met een voorstel.' },
    ],
  },
  volgordeStand: {
    title: 'Volgorde van Je stand',
    lead: 'Kies zelf in welke volgorde de blokken op Je stand staan. Het verandert niets aan je planning of je cijfers.',
    points: [
      { head: 'Blokken', text: 'je sleept hele blokken, zoals Benen, Belasting en Kracht, niet losse kaarten. Binnen een blok blijft de volgorde vast.' },
      { head: 'Bovenaan', text: 'Klaar voor het doel blijft altijd eerst. Het vlak "Je stand in vier regels" staat nooit als eerste blok.' },
      { head: 'Zonder slepen', text: 'in het blad kun je per blok ook Hoger of Lager kiezen.' },
      { head: 'Terug naar standaard', text: 'zet alles weer zoals de app het bedacht. Een blok dat in de instellingen uit staat, houdt zijn plek.' },
    ],
  },
  slepenWeek: {
    title: 'Trainingen slepen in Week',
    lead: 'Sleep een training met het greepje naar een andere dag. Het gaat zoals Verplaatsen in het actieblad. Uit haalt de grepen weg.',
    points: [
      { head: 'Een botsing', text: 'liggen er dan twee zware beendagen binnen 48 uur, of is het je rustdag, dan zie je dat al tijdens het slepen en krijg je bij het loslaten een voorstel met Akkoord. Liever niet laat alles staan.' },
      { head: 'Een test', text: 'een testloop verplaats je altijd met Akkoord.' },
      { head: 'Een wedstrijd', text: 'hoort er niet bij. Die verplaats je via je doel op de Ascend-tab.' },
      { head: 'Ongedaan maken', text: 'een gewone verplaatsing gaat meteen, met Ongedaan maken in de melding.' },
    ],
  },
  testStilstaan: {
    title: 'Stilstaan bij een testloop',
    lead: 'Staat je horloge niet stil als jij voor een stoplicht wacht, dan loopt de klok door in je snelste 5 km.',
    points: [
      { head: 'Niet meetellen', text: 'de tijd dat je stilstond telt niet in je snelste 5 km. ASCEND zegt erbij hoe vaak en hoelang, bijvoorbeeld: je stond 3 keer stil, samen 1:40. Een stop kost je niets en levert je niets op.' },
      { head: 'Veel stilstaan', text: 'meer dan een minuut of meer dan 3 stops geeft wat rust. Dan zegt ASCEND dat de test iets te gunstig is.' },
      { head: 'Meetellen', text: 'de klok loopt door, zoals het was. Pauzeert je horloge vanzelf, dan telt een stuk met zo\'n gat dan niet mee.' },
      { head: 'Je tempo\'s', text: 'veranderen niet vanzelf. Verandert er door het stilstaan een tempo, dan vraagt ASCEND eerst Akkoord in het logblad. Alleen een nieuwe test zonder stops telt meteen.' },
      { head: 'Bestaande tests', text: 'een snelste 5 km die al meetelt blijft tellen tot jij Akkoord geeft op de nieuwe lezing. Die komt één keer, zonder stilstaan.' },
    ],
  },
  korteNacht: {
    title: 'Vragen bij een korte nacht',
    lead: 'Zag je horloge maar een deel van de nacht, dan vraagt ASCEND of dat klopt in plaats van te denken dat je slecht sliep.',
    points: [
      { head: 'Waarom', text: 'gaat je horloge in de nacht van je pols, dan meet Garmin maar een deel van de nacht en zegt hij dat er niet bij.' },
      { head: 'Wanneer', text: 'als je horloge minder dan 4 uur slaap zag, of minder dan de helft van jouw gemiddelde (na een week van je eigen nachten).' },
      { head: 'Niet goed gemeten', text: 'dan telt die nacht niet mee voor een voorstel en niet in jouw gemiddelden van slaap en HRV. Je rusthartslag blijft meetellen. Je kunt zelf zeggen hoe lang je ongeveer sliep.' },
      { head: 'Alleen jouw oordeel', text: 'de getallen bij intervals.icu en Garmin blijven zoals ze zijn. Met Ongedaan maken is alles terug.' },
      { head: 'Uit', text: 'dan werkt de ochtendcheck zoals altijd: een korte nacht is een let op.' },
    ],
  },
  ochtendmelding: {
    title: 'Ochtendmelding',
    lead: 'Een melding in de ochtend met de vraag hoe je je voelt. Tik erop en het blad staat open.',
    points: [
      { head: 'Tijdstip', text: 'bij benadering. Chrome bepaalt zelf wanneer ASCEND op de achtergrond wakker mag worden, meestal een paar keer per dag. De melding komt dus ergens na de tijd die jij kiest, en niet na elven.' },
      { head: 'Alleen geïnstalleerd', text: 'het werkt op Chrome voor Android, met ASCEND op je beginscherm. Chrome wekt een app vaker als je hem vaker gebruikt.' },
      { head: 'Toestemming', text: 'bij het aanzetten vraagt je telefoon om meldingen te mogen sturen. Er gaat niets naar een server: de melding wordt op je telefoon bedacht.' },
      { head: 'Kan het niet', text: 'dan krijg je de vraag als je de app opent.' },
    ],
  },
  loopinzicht: {
    title: 'Inzicht na een training',
    lead: 'Na een loop of tocht zie je hoogstens twee regels over wat beter ging en waar je op moet letten.',
    points: [
      { head: 'Vergelijkt', text: 'je loop met je eigen rustige loopjes, nooit met anderen.' },
      { head: 'Onderwerpen', text: 'zet je apart aan of uit onder Geavanceerd.' },
      { head: 'Reeksen', text: 'komen van je horloge, zet dat aan bij Koppelingen (Details van loopjes).' },
    ],
  },
  runDetail: {
    title: 'Run in detail',
    lead: 'Vanuit het logblad van een run open je een scherm met je run kilometer na kilometer.',
    points: [
      { head: 'Wat erin staat', text: 'het oordeel en drie getallen, het tempo per kilometer, tempo, hartslag en hoogte over de afstand, en de lijst per kilometer en per ronde.' },
      { head: 'Uit', text: 'de rij in het logblad verdwijnt. De kilometers blijven bewaard op je logs.' },
      { head: 'Gegevens', text: 'komen van je horloge via intervals.icu, met Details van loopjes en tochten aan.' },
    ],
  },
  runDetailPatronen: {
    title: 'Patronen in Run in detail',
    lead: 'De kaart Wat opvalt noemt hoogstens drie dingen uit je run, de sterkste eerst.',
    points: [
      { head: 'Wat', text: 'een te snelle start, inzakken, een hartslag die oploopt, een klim of tegenwind, en bij een test wat er meespeelde.' },
      { head: 'Waarom', text: 'elke regel heeft een blad met wat er vergeleken is en hoe sterk het is. Het zegt wat het kan betekenen, nooit een oorzaak.' },
      { head: 'Uit', text: 'je ziet alleen de getallen en de grafieken.' },
    ],
  },
  runDetailAdvies: {
    title: 'Advies in Run in detail',
    lead: 'Een of twee suggesties voor de volgende keer, uit de verdeling van je run of test.',
    points: [
      { head: 'Nooit', text: 'een tijd om te halen of een belofte. Na pijn of Slechter blijft het advies weg.' },
      { head: 'Je planning', text: 'verandert er niet door. Een verandering gaat altijd via een voorstel met Akkoord.' },
    ],
  },
  runDetailLoopvorm: {
    title: 'Loopvorm in Run in detail',
    lead: 'Welke grootheden de kaart Loopvorm laat zien, als je horloge ze meet.',
    points: [
      { head: 'Advies', text: 'cadans, grondcontact, staplengte en op en neer aan, de balans uit.' },
      { head: 'Balans', text: 'zegt na één run niets; pas over meerdere runs is een verdeling buiten ongeveer 52 tegen 48 het bekijken waard.' },
    ],
  },
  borstband: {
    title: 'Hartslag van de borstband',
    lead: 'Zonder borstband kan de hartslag van een andere bron komen, en dan vergelijkt ASCEND niet eerlijk.',
    points: [
      { head: 'Aan', text: 'elke loop telt als gemeten met de band.' },
      { head: 'Uit', text: 'ASCEND vergelijkt geen loopjes waarbij de bron kan zijn gewisseld.' },
    ],
  },
  loopweer: {
    title: 'Weer bij loopinzicht',
    lead: 'Voor eerlijk vergelijken zoekt ASCEND het weer van die dag op bij Open-Meteo.',
    points: [
      { head: 'Wat gaat mee', text: 'alleen een plek afgerond op ongeveer een kilometer.' },
      { head: 'Uit', text: 'er gaat niets naar de weerdienst voor loopinzicht.' },
    ],
  },
  kleding: {
    title: 'Je kleding',
    lead: 'Na een buitentraining kun je tikken of je kleding goed zat.',
    points: [
      { head: 'Dan', text: 'schuift ASCEND je voorkeur een halve graad op, hooguit vier graden per sport.' },
      { head: 'Terug', text: 'met Terug naar de standaard begint ASCEND weer bij nul.' },
    ],
  },
  trainingsduur: {
    title: 'Trainingsduur',
    lead: 'ASCEND leert hoe lang een krachttraining duurt uit de echte duur van je trainingen.',
    points: [
      { head: 'Na drie trainingen', text: 'rekent ASCEND met wat je meestal nodig hebt.' },
      { head: 'Eerder', text: 'helpt een eigen schatting, onder Geavanceerd.' },
    ],
  },
  bergschoenen: {
    title: 'Bergschoenen inlopen',
    lead: 'Nieuwe schoenen horen niet op de eerste dag van de tocht te beginnen. ASCEND telt de kilometers vanaf de dag dat je ze draagt.',
    points: [
      { head: 'Wat telt', text: 'wandelingen en tochten in je logboek. Hardlopen en kracht tellen niet mee.' },
      { head: 'Het doel', text: 'standaard 100 km en minstens 6 weken voor vertrek.' },
      { head: 'Hardloopschoenen', text: 'houdt Garmin bij. ASCEND telt die kilometers niet.' },
      { head: 'Waar je het vastlegt', text: 'bij de taak "Kies je schoenen" in de Reisplanner.' },
    ],
  },
  bergschoenenHerinnering: {
    title: 'Herinnering bij lange tochten',
    lead: 'Op een lange wandeling of bergtocht met rugzak staat een korte regel zolang je schoenen nog niet ingelopen zijn.',
    points: [
      { head: 'Alleen een regel', text: 'er verandert niets aan je planning.' },
      { head: 'Pas zichtbaar', text: 'nadat je in de Reisplanner hebt vastgelegd sinds wanneer je ze draagt.' },
    ],
  },
  klaarWeging: {
    title: 'Weging bij een doeltijd',
    lead: 'Bij een wedstrijd met een doeltijd gaat het vooral over snelheid. Dit bepaalt hoe zwaar die meetelt in je percentage.',
    points: [
      { head: 'Snelheid weegt het zwaarst', text: 'het gat tussen je verwachte tijd en je doeltijd, uitgedrukt in weken werk bij de groei uit je instelling, telt voor 60% mee. Je langste loop en je weekvolume tellen voor 20% elk.' },
      { head: 'Gelijk', text: 'alle meters tellen even zwaar, zoals voor een doel zonder doeltijd.' },
      { head: 'Sterker worden', text: 'volgt dezelfde keuze: de krachtmeter telt voor 60% mee en je harde sets voor 40%, of bij Gelijk allebei even zwaar.' },
      { head: 'Je verwachte tijd', text: 'komt uit je testloop die meetelt. Zonder testloop, of zolang je snelste 5 km op je Akkoord wacht, telt snelheid niet mee.' },
    ],
  },
  klaarGroei: {
    title: 'Groei bij het rekenen',
    lead: 'Hoe snel je beter wordt, verschilt sterk tussen mensen. ASCEND rekent het gat naar je doel om in weken werk met één groeigetal.',
    points: [
      { head: 'Gemiddeld', text: 'het midden van de band, bij hardlopen 0,55% per week. Dat midden is afgeleid uit meerdere onderzoeken en komt niet uit één studie.' },
      { head: 'Voorzichtig', text: 'de onderkant van de band, bij hardlopen 0,3% per week. Je doel vraagt dan meer weken en de meters staan lager.' },
      { head: 'Overal hetzelfde', text: 'het getal, de meters, de regel onder het getal en een voorstel voor je doeltijd gebruiken dezelfde groei.' },
    ],
  },
  klaarMarge: {
    title: 'Marge bij een tijdslimiet',
    lead: 'Bij een dagtocht met een tijdslimiet of een trailrun met een cutoff telt ASCEND een marge onder die tijd. Je wilt er niet precies op de minuut zijn.',
    points: [
      { head: '10%', text: 'het advies: ruimte voor eten, pauzes en een tragere dag. Bij een limiet van 8 uur ligt de grens op 7:12.' },
      { head: '5% of geen', text: 'krapper. Kies dit alleen als je je dag goed kent.' },
      { head: 'Alleen de meter', text: 'je planning en je doel veranderen er niet door.' },
    ],
  },
  doeltijdVoorstel: {
    title: 'Doeltijd aanpassen voorstellen',
    lead: 'Je doel blijft je doel. Met deze keuze aan mag ASCEND na een testloop één keer voorstellen om je doeltijd aan te passen.',
    points: [
      { head: 'Liever niet', text: 'dan vraagt ASCEND er voor dit doel niet meer naar, ook niet na een volgende testloop, tot je de doeltijd zelf verandert.' },
      { head: 'Uit', text: 'dan komt er nooit een voorstel voor je doeltijd. De kaart blijft laten zien hoeveel er nog te winnen is.' },
      { head: 'Akkoord', text: 'verandert alleen je doeltijd, niets anders in je planning.' },
    ],
  },
  rustNaTocht: {
    title: 'Rust na een bergtocht',
    lead: 'Hoe snel een zware beendag mag volgen op een bergtocht.',
    points: [
      { head: 'Soepel', text: 'een korte beendag mag al 48 uur na je tocht.' },
      { head: 'Streng', text: 'ASCEND houdt altijd 72 uur.' },
      { head: 'Geldt voor', text: 'nieuwe en gewijzigde tochten. Een tocht die al staat, houdt zijn planning tot je hem wijzigt.' },
    ],
  },
  seizoensstrook: {
    title: 'Seizoensstrook',
    lead: 'Bovenaan Ascend staat je seizoen als een strook van nu tot je laatste doel, met een vlag per doel.',
    points: [
      { head: 'Wat je ziet', text: 'de weken tussen je doelen en de afbouw voor een doel als een donkerder stuk. Een Top heeft een gevulde vlag.' },
      { head: 'Uit', text: 'de strook verdwijnt. Je doelen en je planning blijven precies zoals ze zijn.' },
    ],
  },
  waterPerEtappe: {
    title: 'Water per etappe',
    lead: 'Bij elke etappe staat ongeveer hoeveel je onderweg zweet, uit je zweettempo en de uren van de etappe.',
    points: [
      { head: 'Je tempo', text: 'komt uit je eigen wegingen voor en na een training (in het blad van een training, onder Zweetverlies). Zonder wegingen staat er een standaard naar algemene cijfers, met de woorden nog niet gemeten.' },
      { head: 'Geen advies', text: 'het is een richtlijn voor wat je kwijtraakt, geen medisch advies. Het gaat om niet te veel uitdrogen, niet om alles terug te drinken.' },
      { head: 'Uit', text: 'de etappes tonen dan geen water. Je wegingen blijven bewaard.' },
    ],
  },
  bundelRekenmodel: {
    title: 'Rekenmodel',
    lead: 'Zes keuzes over hoe Forge rekent. Het advies past bij de meeste mensen, dus je hoeft hier niets te doen.',
    points: [
      { head: 'Staat er Advies', text: 'dan staat alles hier zoals ASCEND het zelf kiest. Pas je iets aan, dan staat er hoeveel keuzes anders staan.' },
      { head: 'Terugzetten', text: 'kan per keuze, of met Terug naar het advies bovenaan Instellingen.' },
      { head: 'Alleen voorstellen', text: 'het model verandert nooit stil je planning of je trainingen. Het stelt gewichten voor, jij beslist.' },
    ],
  },
  bundelInvullen: {
    title: 'Bij het invullen',
    lead: 'Drie keuzes over wat het workoutscherm voor je doet terwijl je sets invult.',
    points: [
      { head: 'Alleen met sets in ASCEND', text: 'houd je sets in MacroFactor bij, dan is het workoutscherm alleen om mee te kijken en doen deze keuzes niets. Ze verdwijnen dan uit beeld.' },
      { head: 'Terugzetten', text: 'kan per keuze, of met Terug naar het advies bovenaan Instellingen.' },
    ],
  },
};

// Dezelfde uitleg zonder alcohol en wiet bij naam, voor als "Voorbeelden bij naam
// noemen" uit staat (docs/beslissingen/2026-10-27-redenen-bij-naam.md).
const NEUTRAL_HELP: Record<string, SettingsHelp> = {
  'wat-oorzaak': {
    ...SETTINGS_HELP['wat-oorzaak'],
    points: SETTINGS_HELP['wat-oorzaak'].points.map((p) => (p.head === 'Alcohol en wiet' ? { head: 'Wat je dronk of gebruikte', text: 'noemt ASCEND nooit uit zichzelf.' } : p)),
  },
  'wat-test': {
    ...SETTINGS_HELP['wat-test'],
    points: SETTINGS_HELP['wat-test'].points.map((p) => (p.head === 'Wanneer'
      ? { head: 'Wanneer', text: 'als er die dag een testloop staat en je de avond ervoor veel vastlegde van wat je dronk of gebruikte, of als er morgen een staat na een zware avond. Bij wat je gebruikte alleen op dezelfde dag.' }
      : p)),
  },
};

// De uitleg bij een instelling; `named` is de instelling "Voorbeelden bij naam noemen".
export function settingsHelp(key: string, named: boolean = true): SettingsHelp | undefined {
  return (!named && NEUTRAL_HELP[key]) || SETTINGS_HELP[key];
}

export type SettingsHelpKey = keyof typeof SETTINGS_HELP;

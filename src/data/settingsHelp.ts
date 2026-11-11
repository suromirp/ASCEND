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
    lead: 'Hier staat wat jij anders instelde dan het advies.',
    points: [
      { head: 'Tikken', text: 'een regel opent de instelling zelf. Kies je het advies, dan staat het terug.' },
      { head: 'Alles terugzetten', text: 'zet alles terug naar het advies. Raakt het je planning, dan verandert die zoals je bij Wijzigingen koos: eerst een voorstel, of meteen met een melding en ongedaan maken.' },
    ],
  },
  figuur: {
    title: 'Figuur',
    lead: 'Het figuur op Lichaam is een man of een vrouw.',
    points: [
      { head: 'Automatisch', text: 'ASCEND neemt het over van een koppeling. Nu weet geen koppeling het, dus je ziet een man.' },
      { head: 'Man of vrouw', text: 'het silhouet verschilt in schouders, heupen en borst. De plekken en de oefeningen blijven hetzelfde.' },
    ],
  },
  tempoStukken: {
    title: 'Tempo uit stabiele stukken',
    lead: 'Tempo bij zone 2 rekent met vlakke stukken van minstens 5 minuten waarin je hartslag en tempo vast lagen.',
    points: [
      { head: 'Aan', text: 'standaard. Uit elke buitenloop, ook het inlopen van een intervaltraining. De eerste 10 minuten, heuvels en warme lopen tellen niet mee.' },
      { head: 'Uit', text: 'de gemiddelde hartslag van elke geplande rustige of lange loop.' },
      { head: 'Je planning', text: 'verandert hier niet door. Het is alleen een meting.' },
    ],
  },
  intensiteit: {
    title: 'Intensiteit tellen',
    lead: 'De kaart Intensiteit op Je stand toont hoeveel van je loop- en wandelminuten rustig waren.',
    points: [
      { head: 'Naar je hartslag', text: 'standaard. Rustig is zone 1 en 2, middel zone 3, hard zone 4 en hoger. Zonder genoeg hartslag, drempel of maximum telt die training naar plan.' },
      { head: 'Naar het plan', text: 'elke training telt als wat ze bedoeld was, ook als je harder liep.' },
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
  plaatjes: {
    title: 'Plaatjes bij oefeningen',
    lead: 'Naast een oefening in Forge staat een klein kaartje met de spieren die werken. Tik erop en je ziet de beweging in drie stappen, de spieren op het lichaam en wat je moet doen, waar je op let en wat vaak misgaat.',
    points: [
      { head: 'Spierkaart en tekening', text: 'het advies. De tekeningen komen van Workout Guide en zijn van Everkinetic en Bryl Lim, CC BY-SA 4.0; die van de calisthenicsladders heeft ASCEND zelf getekend, onder dezelfde licentie. Ze worden geladen als je een oefening opent, en op de achtergrond voor de oefeningen van je eigen trainingen. Zonder netwerk zie je dan alleen het spierkaartje.' },
      { head: 'Alleen spierkaart', text: 'de spieren en de uitleg, zonder tekening. Er wordt niets geladen.' },
      { head: 'Uit', text: 'geen kaartje bij een oefening. Het menu van een oefening houdt de uitleg.' },
      { head: 'Een andere variant', text: 'staat er een tekening van bijna dezelfde oefening, dan zegt een regel eronder wat anders is.' },
    ],
  },
  forgeUitlegOpen: {
    title: 'Uitleg standaard uitgeklapt',
    lead: 'In het blad van een oefening staat eerst In het kort, drie regels. Hier kies je of Lees verder ook al open staat.',
    points: [
      { head: 'Uit', text: 'het advies. Je ziet de drie regels en tikt op Lees verder als je meer wilt weten.' },
      { head: 'Aan', text: 'de beginstand, de beweging, het tempo en de veelgemaakte fouten staan meteen open. Je kunt ze nog steeds dichtklappen.' },
      { head: 'Niet elke oefening', text: 'heeft al een uitleg. Zonder uitleg zie je de oude drie regels.' },
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
  korterVandaag: {
    title: 'Minder tijd vandaag',
    lead: 'Minder tijd vandaag? Kies in het menu van je missie 30, 45 of 60 minuten. ASCEND stelt dezelfde training korter voor.',
    points: [
      { head: 'Kernsets', text: 'bij kracht alleen de kernoefeningen. Past de kern niet in je tijd, dan wordt het minder van alles. In Forge sla je de rest zelf over. Bij een tempoloop of intervallen worden inlopen en uitlopen korter.' },
      { head: 'Minder van alles', text: 'bij kracht een set minder per oefening. Bij een loop met blokken minder herhalingen in hetzelfde tempo.' },
      { head: 'Altijd', text: 'eerst een voorstel, pas na Akkoord verandert er iets. Ongedaan maken zet het terug. Een test of wedstrijd kan niet korter.' },
    ],
  },
  zonesNaTest: {
    title: 'Zones bijwerken na een test',
    lead: 'Na een testloop die meetelt stelt ASCEND een nieuwe drempelhartslag voor, als die duidelijk anders is.',
    points: [
      { head: 'Wat je ziet', text: 'per zone het oude en het nieuwe getal, voor je hartslag en je tempo\'s. Je tempo\'s volgen je test al.' },
      { head: 'Een schatting', text: '98 procent van je gemiddelde hartslag over kilometer 2 tot en met 5. Geen labtest.' },
      { head: 'Alleen met Akkoord', text: 'eerst een voorstel, pas na Akkoord verandert er iets. Na Liever niet vraagt ASCEND het voor deze test niet meer.' },
    ],
  },
  lichterbenen: {
    title: 'Lichter bij vermoeide benen',
    lead: 'Na spierpijn of een zware loop stelt ASCEND een lichtere beendag of een dag later voor. Jij kiest.',
    points: [
      { head: 'Met een voorstel', text: 'een kaart op Vandaag bij een zware beendag met spierpijn, een harde loop eerder die dag of een hoge beenindex. Lichter, een dag later of Liever niet. Bij een harde loop van vandaag alleen een dag later.' },
      { head: 'Wat Lichter is', text: 'minder gewicht, zeker 3 herhalingen over en een set minder (niet bij Alleen gewicht), alleen bij oefeningen die je benen belasten. In MacroFactor kies je zelf lichter.' },
      { head: 'Alleen een regel of uit', text: 'de regel zegt wat ASCEND ziet, zonder knoppen. Uit zet ook de regel bij het verplaatsen van een beendag uit.' },
    ],
  },
  lichterbenenHoe: {
    title: 'Hoe licht',
    lead: 'Wat Lichter doet met een beendag.',
    points: [
      { head: 'Standaard', text: 'zeker 3 herhalingen over. Van elke oefening met drie sets of meer vervalt de laatste.' },
      { head: 'Alleen gewicht', text: 'zeker 3 herhalingen over, alle sets blijven staan.' },
      { head: 'Extra licht', text: 'zeker 4 herhalingen over en een set minder.' },
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
  wijzigingen: {
    title: 'Wijzigingen',
    lead: 'Wie beslist als je planning verandert: jij, of bij kleine dingen ASCEND.',
    points: [
      { head: 'Vraag eerst', text: 'eerst een voorstel, pas na Akkoord verandert er iets. Alleen de weekcontrole zet wat ASCEND zelf plande meteen recht, met de melding Planning bijgewerkt en ongedaan maken.' },
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
    lead: 'Hoe snel je lange loop groeit naar je hardloopwedstrijd. Het advies blijft binnen 110% van je langste loop. Daarboven vond het onderzoek geen veilige marge.',
    points: [
      { head: 'Volgens het onderzoek', text: 'hoogstens 10% per week, met de lichtere week van de golf en de piek om de week. Tot 30% per twee weken gaf geen hoger risico, boven 30% wel (Nielsen 2014, matig). Bij Stevig mag de piek elke week staan.' },
      { head: 'Rustiger en Heel rustig', text: 'een stap om de twee weken, of per blok van vier weken.' },
      { head: 'Sneller dan het onderzoek', text: 'onder Geavanceerd, wekelijks tot 120% van je langste loop van 30 dagen. Boven 10% gaf in het grootste onderzoek ongeveer 64% meer kans op een overbelastingsblessure (Frandsen 2025, matig).' },
    ],
  },
  meerdere: {
    title: 'Twee trainingen per dag',
    lead: 'Mag ASCEND twee trainingen op één dag plannen, als je tijd het toelaat?',
    points: [
      { head: 'Automatisch', text: 'ASCEND beslist op je tijdbudget per dag.' },
      { head: 'Nee', text: 'nooit meer dan één training per dag.' },
      { head: 'Zwaar', text: 'benen en een zware loop op één dag staat apart onder Geavanceerd.' },
    ],
  },
  forge: {
    title: 'Kracht meerekenen',
    lead: 'Forge rekent met je krachttrainingen en stelt per oefening voor wat je de volgende keer doet. Uit: je ziet alleen wat je deed.',
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
  forgeBergspieren: {
    title: 'Spieren voor de berg',
    lead: 'Bergop en bergaf met een rugzak vragen veel van je kuiten, je scheenspier en je bilspieren, en juist die slaat een gewoon krachtschema vaak over. Bij een bergdoel let ASCEND daar rustig op.',
    points: [
      { head: 'De melding', text: 'krijgt een van die spieren de laatste vier weken gemiddeld minder dan 4 harde sets per week, dan staat dat één keer in de weekterugblik, met een voorstel voor één oefening. Een rustweek telt niet mee.' },
      { head: 'In Forge', text: 'hetzelfde voorstel staat ook rustig bovenaan de training waar de oefening bij zou komen, zolang je nog geen set afvinkte.' },
      { head: 'Pas na Akkoord', text: 'de oefening komt in je krachttraining met het meeste beenwerk. In het blad van de oefening haal je hem weer weg. Liever niet laat die spier acht weken met rust.' },
      { head: 'Bij Ruilen', text: 'is de keuze verder gelijk, dan staat een oefening voor zo’n spier voorop, met een korte reden. Forge ruilt nooit zelf.' },
      { head: 'Wat telt', text: 'werksets met hoogstens 4 herhalingen over, ook zonder RIR. Een oefening die ASCEND niet kent telt niet; dat staat er dan eerlijk bij.' },
      { head: 'Uit', text: 'geen melding, in de weekterugblik noch in Forge, en de gewone volgorde bij Ruilen.' },
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
    lead: 'Tik je op een oefening, dan zie je je geschatte 1RM van nu naast die van een paar weken terug. Zo zie je of je sterker wordt.',
    points: [
      { head: 'Een voorbeeld', text: 'je bankdrukken staat nu op 80 kg. Vier weken geleden was dat 77,5 kg, acht weken geleden 75 kg. Dan staat er +2,5 en +5 bij. Het beste ooit staat er altijd naast.' },
      { head: '4 en 8 weken', text: 'het advies: een maand en twee maanden terug.' },
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
    title: 'Standen per toestel',
    lead: 'Een stand is een gewicht dat een kabel of toestel in jouw sportschool heeft. Forge onthoudt ze zelf; hier zie je ze en pas je ze aan.',
    points: [
      { head: 'Weghalen', text: 'tik op een stand om hem door te strepen, bijvoorbeeld een typefout. Een weggehaalde stand komt niet vanzelf terug. Tik nog eens om hem terug te zetten.' },
      { head: 'Veel tegelijk', text: 'heeft het blok vaste stappen, dan vul je ze in één keer in als lijst of als bereik, bijvoorbeeld 4,5 tot 113 per 7.' },
      { head: 'Alleen deze standen', text: 'dan stelt Forge nooit een gewicht voor dat je niet zelf intikte. Anders schat Forge ook tussen en boven je standen.' },
      { head: 'Per sportschool', text: 'dezelfde kabel heeft in een andere sportschool andere standen, dus ze horen bij de sportschool die je koos.' },
      { head: 'Alles wissen', text: 'met Standen wissen begint het toestel weer leeg. Wat je al trainde blijft in je logboek staan.' },
    ],
  },
  standenOnthouden: {
    title: 'Standen onthouden',
    lead: 'Forge onthoudt de gewichten die je op een kabel of toestel met blok afvinkt. Minder en Meer springen dan van stand naar stand.',
    points: [
      { head: 'Zonder vraag', text: 'na het afvinken staat er een regel met Terugdraaien. Dat haalt alleen die stand weg, niet je set.' },
      { head: 'Eerste keer', text: 'bij een toestel dat Forge nog niet kent neemt het de gewichten over uit je eerdere trainingen in deze sportschool. Een oude typefout streep je weg bij Standen per toestel.' },
      { head: 'Uit', text: 'dan komen er geen standen bij en leest Forge niets in. Wat er al staat blijft werken, en zonder standen gaan Minder en Meer met de stap uit je sportschool.' },
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
  forgeRekentMee: {
    title: 'Forge rekent mee',
    lead: 'Forge rekent tijdens je training met je mee, met dezelfde rekenregel als het voorschrift: je geschatte kracht en de RIR die gevraagd is.',
    points: [
      { head: 'Een ander gewicht', text: 'vul je zelf een ander gewicht in, dan zet Forge in het vak Herh. wat je daarbij waarschijnlijk haalt. Herhalingen die je zelf invulde blijven staan.' },
      { head: 'Na een set', text: 'deed je meer of minder dan gevraagd, of was er meer of minder over, dan stelt Forge de volgende open set bij. Zo nodig ook het gewicht, met de gewichten van je sportschool, zodat je in het bereik blijft.' },
      { head: 'De volgende keer', text: 'haalde je de bovenkant van het bereik met het gevraagde RIR, dan staat de kleinste stap zwaarder al klaar. Vulde je je RIR niet in, dan pas bij 3 of meer boven de bovenkant (10 bij 7+). Met Terugzetten bij de oefening ga je in één tik terug.' },
      { head: 'Na een topset', text: 'ging je topset anders dan gevraagd en weet Forge hoeveel je over had, dan volgen de terugsets erna samen je kracht van die dag.' },
      { head: 'Jouw getallen', text: 'wat Forge zo invult ziet eruit als elk ander voorstel. Wat je zelf typt blijft van jou, en wat je al deed verandert nooit.' },
      { head: 'Uit', text: 'dan blijven de vakken staan zoals Forge ze voorstelde, en gaat het gewicht pas omhoog als je geschatte kracht dat vraagt.' },
    ],
  },
  forgeAfvinkenDoel: {
    title: 'Afvinken telt als het doel',
    lead: 'Vink je een set af zonder te kiezen, dan telt het doel als wat je over had, behalve bij twijfel.',
    points: [
      { head: 'Wanneer het telt', text: 'je deed minstens de herhalingen die Forge vroeg, met minstens het gewicht van het voorschrift, en de set erna viel niet 2 of meer tekort.' },
      { head: 'Je geschatte kracht', text: 'precies wat gevraagd was houdt je kracht vast. Meer herhalingen tellen voor de helft mee.' },
      { head: 'Een stap zwaarder', text: 'pas als al je werksets de bovenkant van het bereik halen, of je topset twee keer achter elkaar.' },
      { head: 'Bij twijfel', text: 'vraagt Forge na de set hoeveel je over had: minder dan gevraagd, 2 of meer boven het bereik, de eerste set op een zwaarder gewicht, en je eerste drie trainingen van een oefening.' },
      { head: 'Oudere trainingen', text: 'tellen ook mee, met de onderkant van het bereik als gevraagd aantal. Je log zelf verandert niet.' },
      { head: 'Uit', text: 'dan telt een set zonder eigen RIR zoals voorheen, en vraagt Forge alleen na de eerste, een zware en de laatste set.' },
    ],
  },
  forgeTussenOefeningen: {
    title: 'Vermoeidheid tussen oefeningen',
    lead: 'Staan er meer harde sets voor dezelfde spieren voor een oefening dan je normaal deed, dan begint de eerste set iets lichter.',
    points: [
      { head: 'Wat telt', text: 'werksets met 3 of minder over, die je zelf invulde of afvinkte zoals gevraagd. Een gedeelde hoofdspier telt een hele set, een hulpspier een halve.' },
      { head: 'Alleen het verschil', text: 'je gewone volgorde zit al in je geschatte kracht. Pas als er meer voor staat dan normaal, gaat de eerste set omlaag: eerst in herhalingen, anders een stap lichter.' },
      { head: 'Hoeveel', text: 'ongeveer 2% kracht per harde set meer, nooit meer dan 10%. Met Vermoeidheid per set op Geleerd leert Forge het per oefening uit je eigen trainingen, vanaf zes keer.' },
      { head: 'Wat je zelf doet', text: 'blijft van jou. Het gaat alleen om het voorschrift, en je log verandert niet.' },
      { head: 'Uit', text: 'dan telt alleen de vermoeidheid binnen een oefening, zoals voorheen.' },
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
  forgeRirSnel: {
    title: 'Hoeveel over na een set',
    lead: 'Na het afvinken van je topset, van een zware set en van de laatste set van een oefening vraagt Forge in de rij hoeveel je nog over had: 0, 1, 2 of 3+.',
    points: [
      { head: 'Eén tik', text: 'je kiest in de rij zelf, zonder blad. Kies je niets, dan blijft het doel staan als aangenomen RIR.' },
      { head: 'Waarom', text: 'een RIR die je zelf kiest telt mee voor je geschatte kracht en voor de stap zwaarder; een aangenomen RIR niet.' },
    ],
  },
  forgeStappen: {
    title: 'Stappen bij calisthenics',
    lead: 'Forge toont bij een oefening op een ladder de stap, de toets en een tik naar een lichtere of zwaardere stap.',
    points: [
      { head: 'De toets', text: 'drie sets op de bovenkant met nette vorm, bijvoorbeeld 3 keer 8. Haal je dat, dan kan de volgende stap.' },
      { head: 'Stap lichter of zwaarder', text: 'wisselt de oefening alleen in deze training, zoals Ruilen. Je planning en je training blijven zoals ze zijn.' },
      { head: 'Uit', text: 'geen regels en geen tik. Seconden voor een houding blijven werken.' },
    ],
  },
  forgeNetjes: {
    title: 'Ging het netjes?',
    lead: 'Na een set op een ladderstap vraagt Forge of je vorm netjes was. Een Nee telt die set niet voor de stap.',
    points: [
      { head: 'Wanneer', text: 'alleen als de set de onderkant haalt: 5 herhalingen of 10 seconden. Eronder verandert het antwoord niets.' },
      { head: 'Niets kiezen', text: 'dan blijft het onbekend, en dat telt als netjes. Achteraf wijzigen kan door de set lang in te drukken.' },
    ],
  },
  forgeBand: {
    title: 'Band bij optrekken en dip',
    lead: 'Bij Pull-Up en Dip kies je de band die je gebruikt: geen, licht, middel of zwaar.',
    points: [
      { head: 'Telt niet voor de stap', text: 'met hulp haal je de stap nog niet. Je werkt door tot je de onderkant zonder band haalt.' },
      { head: 'Je vorige keer', text: 'Forge zet de band van je vorige keer klaar. Een keuze geldt voor de open sets.' },
    ],
  },
  forgeSoort: {
    title: 'Calisthenics per training',
    lead: 'Per krachttraining kies je kracht met gewicht, calisthenics met je eigen gewicht, of samen.',
    points: [
      { head: 'Calisthenics', text: 'duwen, optrekken en schouderdrukken gaan op hun ladder, op de stap waar je staat; elke ladder hoogstens één keer. Wat overblijft en je benen blijven met gewicht.' },
      { head: 'Samen', text: 'van de plekken die een ladder kunnen worden blijft de eerste helft met gewicht, de rest gaat op een ladder.' },
      { head: 'Akkoord', text: 'eerst een voorstel; je ziet het de volgende keer dat je de training opent. Je planning en je dagen blijven.' },
    ],
  },
  forgeStapVoorstel: {
    title: 'Stap voorstellen',
    lead: 'Haal je de toets van een ladderstap, dan stelt Forge de volgende stap voor. Haal je drie trainingen achter elkaar de onderkant niet, dan de lichtere stap.',
    points: [
      { head: 'Akkoord', text: 'de oefening in je training wordt de nieuwe stap, vanaf je volgende training. Sets en herhalingen blijven.' },
      { head: 'Liever niet', text: 'dan blijft je plan zoals het is en komt dit voorstel niet terug. Een voorstel voor een andere stap wel.' },
      { head: 'Terug', text: 'Ongedaan maken op de kaart, of later in het blad van de oefening.' },
    ],
  },
  forgeIJkset: {
    title: 'IJkset voorstellen',
    lead: 'Een schatting van wat je over hebt is alleen goed als je hem af en toe controleert. Eens per vier weken stelt Forge daarom één extra set voor.',
    points: [
      { head: 'Wat', text: 'bij één hoofdoefening een set erbij, zo ver als netjes gaat. Daarna kies je zoals altijd hoeveel je over had.' },
      { head: 'Wanneer', text: 'niet in een week met een tocht of test, en hooguit eens per vier weken.' },
      { head: 'Akkoord', text: 'pas dan komt de set erbij. Met Niet nu blijft je training zoals hij was en vraagt Forge het de volgende keer opnieuw.' },
    ],
  },
  forgeKentJe: {
    title: 'Hoe goed kent Forge je',
    lead: 'Een blok op de Forge-pagina dat laat zien of Forge je goed inschat, gemeten aan je eigen trainingen van de laatste vier weken. MacroFactor is hier geen scheidsrechter.',
    points: [
      { head: 'Voorspelling', text: 'hoeveel sets binnen één herhaling lagen van wat Forge verwachtte. Dat telt alleen als je het voorgestelde gewicht pakte en zelf invulde hoeveel je over had.' },
      { head: 'Bijgestuurd', text: 'hoe vaak je het gewicht (of afgevinkte herhalingen) zelf veranderde voor je afvinkte.' },
      { head: 'Sterker', text: 'of je geschatte maximum op je hoofdoefeningen over zes tot acht weken stijgt, gelijk blijft of daalt.' },
      { head: 'Alleen kijken', text: 'het blok verandert je plan en je logs nooit. Met te weinig sets staat er "nog te weinig data".' },
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
    lead: 'Je gewicht, voor je rugzak, je zweetverlies, de beenindex, eiwit per kilo en oefeningen met je eigen gewicht. ASCEND neemt je nieuwste weging.',
    points: [
      { head: 'Uit MacroFactor', text: 'het trendgewicht uit de export als dat er is, anders de weging zelf.' },
      { head: 'Uit Health Connect', text: 'in de Android-app je eerste weging van de dag.' },
      { head: 'Op dezelfde dag', text: 'wat je zelf invult of uit MacroFactor inleest gaat voor de weging uit Health Connect.' },
    ],
  },
  gewichtKaart: {
    title: 'Gewicht op Je stand',
    lead: 'Je gewicht staat ook op Je stand en in het Logboek. Het advies is aan.',
    points: [
      { head: 'Kaart', text: 'je trend of je laatste weging groot, met een lijn van de laatste weken. Een tik opent het overzicht Gewicht.' },
      { head: 'Logboek', text: 'elke weging is een eigen regel tussen je trainingen, met datum, kilo en bron.' },
      { head: 'Uit', text: 'de kaart en de regels verdwijnen. Je wegingen blijven bewaard.' },
    ],
  },
  gewichtEigen: {
    title: 'Gewicht bij eigen gewicht',
    lead: 'Bij een push-up, optrekken of dip telt een deel van je lichaamsgewicht als last. Het advies is Trend.',
    points: [
      { head: 'Trend', text: 'het gemiddelde van je wegingen van de laatste twee weken. Eén weging schommelt een kilo met water en eten.' },
      { head: 'Laatste weging', text: 'het getal van je laatste weging.' },
      { head: 'Te weinig wegingen', text: 'onder de drie in twee weken, of met een trendgewicht uit MacroFactor, telt je laatste weging.' },
    ],
  },
  gewichtstrend: {
    title: 'Gewichtstrend gebruiken',
    lead: 'Weeg je je vaak, dan toont Lichaamsgewicht een rustig gemiddelde in plaats van alleen de laatste weging. Het advies is aan.',
    points: [
      { head: 'Hoe', text: 'je wegingen van de laatste 14 dagen. Een weging van een week oud telt half zo zwaar. Wat meer dan 3 procent afwijkt van de middelste weging telt niet mee.' },
      { head: 'Te weinig', text: 'onder de drie wegingen in twee weken, of met een trendgewicht uit MacroFactor, zie je de laatste weging.' },
      { head: 'Uit', text: 'je ziet de laatste weging. Er verdwijnt niets.' },
    ],
  },
  vetpercentage: {
    title: 'Vetpercentage',
    lead: 'Een weegschaal schat je vet met een zwak stroompje door je lichaam. Kijk naar de trend, niet naar één dag.',
    points: [
      { head: 'Eerlijk', text: 'de meting schommelt met vocht, eten en het tijdstip. Het getal kan een paar procentpunten naast de werkelijkheid zitten.' },
      { head: 'Wel bruikbaar', text: 'de richting over weken, als je steeds hetzelfde weegt, bijvoorbeeld nuchter in de ochtend. ASCEND zet het gemiddelde van je laatste 7 metingen naast dat van 4 weken eerder.' },
      { head: 'Vetvrije massa', text: 'je gewicht min het vet. Voor kracht en de GR5 zegt die meer dan het percentage.' },
    ],
  },
  'wat-teken': {
    title: 'Training wijkt af',
    lead: 'Een klein hartslagteken naast een rustige loop: je hartslag week duidelijk af van je vergelijkbare lopen.',
    points: [
      { head: 'Wanneer', text: 'bij minstens 1,5 keer je gewone schommeling. Krachttraining krijgt het nooit.' },
      { head: 'Kleur', text: 'amber zolang je niets invulde, gedimd zodra je het blad bekeek of iets koos.' },
      { head: 'Privé', text: 'de reden zelf staat nooit in de lijst.' },
    ],
  },
  'wat-oorzaak': {
    title: 'Mogelijke oorzaak',
    lead: 'In het blad van een training of een dag zegt ASCEND wat het al weet, met de bron erbij.',
    points: [
      { head: 'Wat ASCEND weet', text: 'warmte uit het weer, een zware beendag uit je logboek, een korte nacht van je horloge en een ziekmelding. Dat telt altijd mee in "Wat doet dit met je?", ook als dit uit staat.' },
      { head: 'Je patroon', text: '"lijkt op" staat er pas als een reden minstens 4 keer is vastgelegd, je gewone lopen ook, en de banden elkaar niet raken.' },
      { head: 'Alcohol en wiet', text: 'noemt ASCEND nooit uit zichzelf.' },
    ],
  },
  'wat-namen': {
    title: 'Voorbeelden bij naam noemen',
    lead: 'De uitleg van Wat speelde er kan alcohol en wiet bij naam noemen, als geheugensteun.',
    points: [
      { head: 'Aan', text: 'de uitleg noemt alcohol en wiet bij naam.' },
      { head: 'Uit', text: 'neutrale woorden, zoals "wat je dronk of gebruikte". De keuzes voor je eigen notitie blijven staan.' },
      { head: 'Altijd', text: 'ASCEND noemt alcohol of wiet nooit zelf als reden in een lijst, een melding of een tekst voor Strava.' },
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
      { head: 'Wanneer', text: 'een testloop vandaag na 3 of meer glazen de avond ervoor, of morgen na 6 of meer. Bij wiet alleen op dezelfde dag.' },
      { head: 'Altijd een voorstel', text: 'eerst een voorstel, pas na Akkoord verandert er iets. Gewone trainingen schuiven nooit om een reden.' },
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
    lead: 'Bij een hartslagdoel krijgt je horloge slagen, uit de zones van ASCEND of uit die van intervals.icu.',
    points: [
      { head: 'ASCEND', text: 'je horloge piept op dezelfde slagen als waarmee ASCEND de training achteraf beoordeelt.' },
      { head: 'intervals.icu', text: 'ASCEND stuurt de zonenaam en intervals.icu rekent die om met zijn eigen drempel. Dat kan anders uitkomen.' },
      { head: 'Rustige loop', text: 'de grens loopt van het begin van zone 1 tot het einde van zone 2. Zonder drempel of maximale hartslag blijft het bij de zonenaam.' },
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
    lead: 'Je horloge meet bijna elke seconde je tempo, hartslag en hoogte. ASCEND kan dat helemaal op deze telefoon bewaren.',
    points: [
      { head: 'Waarvoor', text: 'kilometer na kilometer, de rondes van je horloge en de grafieken van een loop. Verandert je drempel later, dan rekent ASCEND opnieuw zonder iets op te halen.' },
      { head: 'Ruimte', text: 'ongeveer 120 KB voor een uur lopen, enkele tientallen MB per jaar.' },
      { head: 'Uit', text: 'alleen de samenvatting en de kilometers. Wat al bewaard is blijft staan. Je route wordt nooit bewaard, alleen de richting per kilometer, voor de wind.' },
    ],
  },
  vroegZiek: {
    title: 'Vroeg ziek zien',
    lead: 'Als je ziek wordt, kan je rusthartslag stijgen en je HRV dalen voor je iets merkt. ASCEND let daarop.',
    points: [
      { head: 'Wanneer', text: 'twee ochtenden op rij je rusthartslag minstens 6 slagen hoger en je HRV onder je gewone bereik van de laatste vier weken.' },
      { head: 'Wat je ziet', text: 'een vraag op Vandaag: Voel me goed, Word ziek of Niet nu. Word ziek opent de gewone ziekmelding. Je planning verandert pas na Akkoord.' },
      { head: 'Hoe zeker', text: 'het bewijs is zwak tot matig. Alcohol, een warme kamer of stress geven hetzelfde beeld. Legde je bij Wat speelde er iets vast, dan vraagt ASCEND niets.' },
      { head: 'Geen diagnose', text: 'bij hoge koorts, pijn op de borst of als je je echt slecht voelt: neem contact op met je huisarts.' },
    ],
  },
  hitteTempo: {
    title: 'Hitte bij je tempo',
    lead: 'In warmte, en vooral bij vocht, loop je bij dezelfde moeite trager. Dat is je lichaam dat koelt, geen slechte vorm.',
    points: [
      { head: 'Wanneer', text: 'bij een loop buiten als het voelt als 22 graden of meer, of als het dauwpunt 16 of hoger is.' },
      { head: 'Wat je ziet', text: 'een regel onder het weer: loop op hartslag, 10 tot 20 seconden per km trager, of 20 tot 40 als het heet of benauwd is.' },
      { head: 'Hoe zeker', text: 'een gemiddelde over veel lopers (bewijs matig).' },
    ],
  },
  weekdagPatroon: {
    title: 'Patronen per weekdag',
    lead: 'ASCEND kijkt acht weken terug of je training op één weekdag vaker wegvalt dan op de andere.',
    points: [
      { head: 'Wanneer', text: 'de training stond er minstens zes keer, viel minstens vier keer en de helft van de keren weg, en duidelijk vaker dan op je andere dagen.' },
      { head: 'Wat telt', text: 'overgeslagen, gemist of door jou verschoven. Vrije dagen, vakanties, tochten en ziekte tellen niet mee.' },
      { head: 'Wat het doet', text: 'één zin op Week. Je planning verandert er niet door.' },
    ],
  },
  luchtkwaliteit: {
    title: 'Luchtkwaliteit',
    lead: 'Hard trainen in vervuilde lucht laat je meer fijnstof inademen. Veel ozon kan je longen en je prestatie wat drukken.',
    points: [
      { head: 'Wanneer', text: 'bij een harde training buiten (tempo, intervallen, een test) als de Europese luchtkwaliteitsindex op slecht of erger staat.' },
      { head: 'Wat je ziet', text: 'een regel onder het weer. Je planning verandert er niet door.' },
      { head: 'Waar het vandaan komt', text: 'Open-Meteo, met dezelfde afgeronde plek als het weer. Het raster is ongeveer 11 km. Een drukke weg naast je route ziet het niet.' },
    ],
  },
  klimtempo: {
    title: 'Je klimtempo',
    lead: 'De wandelnorm rekent met 300 meter per uur omhoog. Jij klimt misschien sneller of trager.',
    points: [
      { head: 'Wat telt', text: 'klimmen van minstens 100 meter en 8 procent in je wandelingen en bergtochten buiten van het laatste jaar. Hardlopen en de loopband tellen niet.' },
      { head: 'Wanneer je het ziet', text: 'na zes klimmen uit minstens drie tochten. Tot dan zegt Je stand hoeveel er al zijn.' },
      { head: 'Wat je ziet', text: 'op Je stand je meters per uur omhoog en omlaag, met het rugzakgewicht als dat bij minstens driekwart van je klimmen bekend is. Je planning verandert er niet door.' },
    ],
  },
  etappetijdEigen: {
    title: 'Etappetijd op je eigen tempo',
    lead: 'De looptijd op de bordjes is een norm. Met je eigen klimtempo zegt ASCEND hoe lang een etappe voor jou ongeveer duurt.',
    points: [
      { head: 'Wat je ziet', text: 'bij een etappe en op Je stand een band, zoals 6,5 tot 7,5 uur lopen, zonder pauzes.' },
      { head: 'Wanneer', text: 'zodra je klimtempo er is, na zes klimmen uit drie tochten. Tot dan blijft de looptijd van de site staan.' },
      { head: 'Hoe het rekent', text: 'vlak met 4 km per uur, omhoog en omlaag met jouw meters per uur, iets trager bij een zwaardere rugzak. Vermoeidheid na een paar dagen lopen telt niet mee.' },
    ],
  },
  tempocurve: {
    title: 'Tempocurve tussen testen',
    lead: 'Tussen twee testen loop je in training ook snelle stukken. ASCEND legt de snelste naast je test, als controle.',
    points: [
      { head: 'Wat je ziet', text: 'op Je stand onder Lopen je snelste 5 km in training sinds je test, met één zin: past bij je testtempo\'s, wijst op iets sneller, of is rustiger.' },
      { head: 'De test blijft de bron', text: 'je tempo\'s, de voorspelling en wat naar je horloge gaat veranderen hier niet door.' },
      { head: 'Wanneer', text: 'drie weken na je test en na drie loopjes buiten met details. Het is een ondergrens.' },
    ],
  },
  wennenWarmte: {
    title: 'Wennen aan warmte',
    lead: 'Een tocht in de zomer is warm in de dalen. Je lichaam went in een week of twee aan warmte, als je er af en toe in traint.',
    points: [
      { head: 'Wat je ziet', text: 'in de reisplanner één regel, in de laatste drie weken voor een vertrek van juni tot en met september.' },
      { head: 'Hoe zeker', text: 'breed onderbouwd bij trainingen van een uur tot anderhalf in de warmte. Het kan helpen. Het is geen garantie tegen een warme dag.' },
      { head: 'Je planning', text: 'verandert er niet door. Het moment kies je zelf.' },
    ],
  },
  bergweer: {
    title: 'Bergweer op hoogte',
    lead: 'Op de pas is het anders dan in het dal. Geef je bij een tocht in de bergen of de sneeuw het hoogste punt op, dan toont Vandaag het weer op die hoogte.',
    points: [
      { head: 'Wat je ziet', text: 'op een dag van je tocht de temperatuur, windstoten, kans op onweer en het vriespunt op die hoogte, met een verwijzing naar het officiële bergweer.' },
      { head: 'Alleen informatie', text: 'ASCEND zegt niet of je moet gaan. Dat is vakwerk. Je planning verandert er niet door.' },
      { head: 'Waar het vandaan komt', text: 'Open-Meteo, hoogstens eens per uur, alleen als het weer je locatie volgt. Een weermodel rekent een bergkam grof uit.' },
    ],
  },
  ochtendVoorstel: {
    title: 'Voorstel bij een slechte ochtend',
    lead: 'Wijken twee van de drie horlogegetallen af op de ochtend van een zware training, dan kan een latere dag helpen.',
    points: [
      { head: 'Wanneer', text: 'bij een tempoloop, intervallen, een test of een zware beendag. Je ziet een kaart met de getallen die afwijken. Eerst een voorstel, pas na Akkoord verandert er iets. Lichter doen kan ook.' },
      { head: 'Niet', text: 'bij een wedstrijd, als je zei dat je niet moe bent, als je ziek bent gemeld of als er al een voorstel voor die training ligt. Werkt alleen met Twee van drie aan.' },
    ],
  },
  ochtendregel: {
    title: 'Twee van drie',
    lead: 'Onder rusthartslag, HRV en slaap staat een woord tegen jouw gewone van de laatste vier weken: normaal, hoger, lager, korter of langer. Wat aandacht vraagt staat in amber.',
    points: [
      { head: 'Twee van drie', text: 'wijken er twee af, dan vraagt de kaart of je moe bent. Ja of Nee wordt je energie van die ochtend. Je planning verandert er niet vanzelf door.' },
      { head: 'Hoe zeker', text: 'een vuistregel, geen meting. Het bewijs is matig.' },
    ],
  },
  horlogeStil: {
    title: 'Melden als je horloge stilvalt',
    lead: 'Geeft intervals.icu niets meer door, dan zie je geen foutmelding: het ophalen lukt, er komt alleen niets mee. ASCEND meldt dat.',
    points: [
      { head: 'Wanneer', text: 'drie dagen geen ochtendgetallen, of geen training terwijl je er wel een invulde, en de koppeling zelf werkt.' },
      { head: 'Waar', text: 'één zin op Vandaag. Een tik opent de koppeling, Begrepen verbergt hem tot het opnieuw gebeurt.' },
      { head: 'Wat je kunt doen', text: 'kijk of je horloge nog synchroniseert met Garmin Connect en of intervals.icu je activiteiten nog toont.' },
    ],
  },
  ochtendBackup: {
    title: 'Ochtendgetallen in back-up',
    lead: 'Je slaap, rusthartslag en HRV komen van intervals.icu. Geeft die ze later niet meer, dan is je telefoon het enige exemplaar. Daarom gaan ze standaard mee in je back-up.',
    points: [
      { head: 'Wat mee gaat', text: 'per ochtend de datum, je rusthartslag, je HRV, hoe lang je sliep en je slaapscore. Niets anders van je horloge. Zolang dit aan staat blijven ze op je telefoon, ook na 400 dagen en als je ontkoppelt.' },
      { head: 'Let op', text: 'het back-upbestand bevat dan ook gezondheidsgegevens. Bewaar het waar alleen jij erbij kunt.' },
      { head: 'Uit', text: 'een back-up zonder ochtendgetallen. Zet je dit uit zonder koppeling, dan vraagt ASCEND eerst, want de bewaarde ochtenden gaan dan van je telefoon.' },
    ],
  },
  reeksenBackup: {
    title: 'Reeksen in back-up',
    lead: 'De reeksen van je horloge komen van intervals.icu, en die kan ze later misschien niet meer geven. Daarom gaan die van de laatste 2 jaar standaard mee in je back-up.',
    points: [
      { head: 'De laatste 2 jaar', text: 'ongeveer 100 KB per training, 15 tot 25 MB per jaar.' },
      { head: 'Alle of geen', text: 'alle reeksen geeft een back-up die elk jaar groeit. Geen reeksen geeft een kleine back-up. Na een herstel haalt ASCEND ze opnieuw op zolang dat kan.' },
      { head: 'Altijd mee', text: 'de samenvatting per loop: kilometers, rondes en je beste stukken. Kopieën van voor een import bevatten de reeksen nooit.' },
    ],
  },
  voorstellenOpruimen: {
    title: 'Oude voorstellen opruimen',
    lead: 'ASCEND bewaart elk voorstel met alle details. Na een paar maanden maakt het daar een korte regel van.',
    points: [
      { head: 'Blijft staan', text: 'de datum, de titel, of je Akkoord of Liever niet koos, en wat het uit je planning haalde.' },
      { head: 'Nooit', text: 'een voorstel dat nog open staat, een training die er nog aan vastzit, iets wat je ongedaan maakte, of een vrije periode die nog bestaat.' },
      { head: 'Wanneer', text: 'bij het openen van een nieuwe versie en vlak voor je een back-up maakt.' },
    ],
  },
  ruimteApp: {
    title: 'Ruimte op dit toestel',
    lead: 'Je browser geeft ASCEND een deel van de ruimte op je telefoon. Hier zie je hoeveel daarvan in gebruik is.',
    points: [
      { head: 'Bijna vol', text: 'boven 80 % waarschuwt ASCEND. Maak dan een back-up en verwijder de reeksen onder Ruimte van reeksen. De kilometers blijven.' },
      { head: 'Ongeveer', text: 'de browser geeft een schatting, geen exact getal.' },
    ],
  },
  routeVoorstel: {
    title: 'Route voorstellen',
    lead: 'Bij een looptraining stelt ASCEND twee lussen voor die passen bij de afstand en de hoogtemeters. Het advies is aan, met Avontuurlijk bovenaan.',
    points: [
      { head: 'Simpel', text: 'dezelfde helling op en af tot de hoogtemeters er zijn. Bij een vlakke training heen en terug over hetzelfde pad.' },
      { head: 'Avontuurlijk', text: 'één lange lus langs verschillende hellingen en onverharde paden, liefst zonder stukken twee keer.' },
      { head: 'Naar je horloge', text: 'met Naar Garmin Connect kies je de app van je horloge en sla je de lus op als koers; anders download je het GPX-bestand.' },
      { head: 'Wat de deur uit gaat', text: 'standaard je plek, afgerond op ongeveer een kilometer, naar de routeplanner (BRouter, anders Valhalla van FOSSGIS) en naar OpenStreetMap. Kies je bij Startpunt van je lus Precies, dan gaat je startpunt precies naar de routeplanner, en zoekt OpenStreetMap heuvels en paden om dat punt; de hoogte van heuvels komt van Open-Meteo, ook om dat punt. Geen naam, geen adres. De kaart haalt kaarttegels rond je plek op bij OpenFreeMap, anders bij OpenStreetMap. De route wordt niet bewaard.' },
    ],
  },
  routeKaart: {
    title: 'Ondergrond van de kaart',
    lead: 'De kaart in Route voorstellen toont je lussen, je startpunt en je plek. Dit kiest wat eronder ligt.',
    points: [
      { head: 'Donker', text: 'straten, paden en water van OpenFreeMap, in de kleuren van ASCEND. Het advies.' },
      { head: 'Licht', text: 'dezelfde kaart in lichte kleuren.' },
      { head: 'Geen', text: 'alleen de lussen en je plek op een effen vlak. Er worden geen kaarttegels opgehaald.' },
      { head: 'Valt de kaart weg', text: 'dan neemt ASCEND na ongeveer zes seconden de kaart van OpenStreetMap, en anders het effen vlak. Tegels worden nooit vooraf opgehaald of door ASCEND bewaard.' },
    ],
  },
  routeStartpunt: {
    title: 'Startpunt van je lus',
    lead: 'Waar een voorgestelde lus begint.',
    points: [
      { head: 'Ongeveer', text: 'je plaats, binnen een kilometer. De lus begint tot ongeveer 700 m van huis.' },
      { head: 'Precies', text: 'je kiest Gebruik waar ik nu ben, bij je deur. Dat punt gaat naar de routeplanner (BRouter, anders Valhalla van FOSSGIS) en wordt alleen op dit toestel bewaard. Wis startpunt haalt het weg.' },
      { head: 'OpenStreetMap', text: 'heuvels en paden zoekt het bij Precies om je startpunt, bij Ongeveer om je afgeronde plek. De hoogte van heuvels komt van Open-Meteo, om hetzelfde punt. Wis startpunt haalt ook de bewaarde heuvels rond dat punt weg.' },
      { head: 'Het dichtstbijzijnde pad', text: 'de routeplanner begint op het pad of de weg het dichtst bij je startpunt. Het stukje ernaartoe is een rechte lijn.' },
    ],
  },
  datavelden: {
    title: 'Datavelden voor je horloge',
    lead: 'ASCEND tekent per soort training welke datapagina\'s je op je horloge zet. Er verandert niets aan je planning.',
    points: [
      { head: 'Zelf kiezen', text: 'tik een veld aan en kies een ander. Het advies zelf blijft staan.' },
      { head: 'Zelf instellen', text: 'ASCEND stuurt niets naar je horloge.' },
    ],
  },
  stravaTekst: {
    title: 'Tekst voor Strava',
    lead: 'ASCEND zet een titel klaar die zegt wat voor training het was. Je plakt hem zelf in Strava.',
    points: [
      { head: 'Wat', text: 'een titel zoals Heuvelintervallen · 6 × 90 s, en als je wilt één regel waarom. Geen afstand, totale tijd of tempo: die toont Strava al.' },
      { head: 'Waar', text: 'bij een gedane training in het logboek en in de vraag erna op Vandaag.' },
      { head: 'Zelf plakken', text: 'ASCEND schrijft niet naar Strava. Daar is een server voor nodig.' },
    ],
  },
  healthConnect: {
    title: 'Health Connect',
    lead: 'In de Android-app leest ASCEND je trainingen, slaap, rusthartslag, HRV en gewicht uit Health Connect, als je dat aanzet.',
    points: [
      { head: 'Toestemming', text: 'Android vraagt pas als je het aanzet. ASCEND vraagt alleen leesrechten en schrijft nooit iets in Health Connect. Wat je bij Gebruik van je gegevens uitzet, haalt ASCEND ook hier niet op.' },
      { head: 'Met intervals.icu', text: 'intervals.icu gaat voor. Health Connect vult alleen aan wat ontbreekt. Ophalen gebeurt bij het openen van de app, hoogstens elke drie uur.' },
      { head: 'Je planning', text: 'verandert er niet door. Een training wordt pas een log als je hem op Vandaag opslaat. Uit haalt wat ASCEND ophaalde van je telefoon. Je logs blijven staan.' },
    ],
  },
  healthConnectGewicht: {
    title: 'Gewicht uit Health Connect',
    lead: 'In de Android-app leest ASCEND je wegingen uit Health Connect, met je vetpercentage als je weegschaal dat meet. Het advies is aan.',
    points: [
      { head: 'Welke weging', text: 'de eerste van de dag. Een getal onder 30 of boven 250 kg laat ASCEND weg.' },
      { head: 'Voorrang', text: 'wat je zelf invult of uit MacroFactor inleest gaat op die dag voor.' },
      { head: 'Uit', text: 'ASCEND leest je gewicht niet meer en rekent er niet mee. Wat er al stond blijft bewaard en gaat mee in je back-up.' },
    ],
  },
  garminLeidend: {
    title: 'Garmin is leidend',
    lead: 'Komt een training die je zelf invulde ook van je horloge, dan tellen de cijfers van het horloge.',
    points: [
      { head: 'Overgenomen', text: 'duur, afstand, hartslag en hoogtemeters.' },
      { head: 'Blijft staan', text: 'gevoel, inspanning, pijn en je rugzak.' },
      { head: 'Terug', text: 'je eigen cijfers zijn bewaard. Je kunt ze terugzetten.' },
    ],
  },
  correctiesOvernemen: {
    title: 'Correcties uit intervals.icu overnemen',
    lead: 'Knip je in intervals.icu een stuk van een training af, of corrigeer je de hoogtemeters of de afstand, dan neemt ASCEND dat over.',
    points: [
      { head: 'Overgenomen', text: 'duur, afstand, stijging, daling, hartslag en cadans, alleen als ze in intervals.icu veranderden.' },
      { head: 'Blijft staan', text: 'gevoel, inspanning, pijn, notities, je rugzak, je krachtsets en de koppeling aan je planning. Een inkorting in ASCEND ook: het logboek vraagt dan of je de nieuwe cijfers wilt.' },
      { head: 'Terug', text: 'de vorige cijfers zijn bewaard. In het logboek zet je ze terug.' },
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
    title: 'Beste moment tonen',
    lead: 'Is het weer eerder of later op de dag beter dan op je gewone uur, dan staat er onder het weer één regel, zoals "Beste moment: 16:00 tot 17:30, droog".',
    points: [
      { head: 'Alleen als het echt scheelt', text: 'een klasse beter (slecht, let op, prima), of regen of wind die onder de drempel van ASCEND blijft.' },
      { head: 'Altijd in het licht', text: 'tussen zonsopkomst en zonsondergang, en niet in het verleden.' },
    ],
  },
  bovenMissie: {
    title: 'Kaarten boven de missie',
    lead: 'Je missie staat binnen twee seconden in beeld. Daarom staat er normaal hoogstens één kaart boven.',
    points: [
      { head: 'Altijd boven', text: 'ziek gemeld, de vraag of je ziek wordt en een weerwaarschuwing.' },
      { head: 'Altijd onder de missie', text: 'een advies over je planning en de vraag Niet gedaan?' },
      { head: 'De rest', text: 'direct onder je missie, in vaste volgorde: ochtendkaart, weer opbouwen, Nieuw begonnen, back-up. Met Alles komt wat mag ook erboven.' },
    ],
  },
  kaarten: {
    title: 'Kaarten op Vandaag',
    lead: 'Een profiel zet de losse schakelaars in één keer. Je training staat altijd op Vandaag.',
    points: [
      { head: 'Alles laten zien', text: 'alle kaarten, zoals het advies.' },
      { head: 'Alleen het belangrijkste', text: 'je training, de ochtendcheck en het weer. Weekterugblik, vraag van de week, citaat, ochtendkaart en geluid gaan uit.' },
      { head: 'Alleen je training', text: 'ook de ochtendcheck en het weer gaan uit. Aangepast betekent dat je schakelaars bij geen profiel passen.' },
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
    lead: 'In de ochtend staat bovenaan Vandaag de vraag hoe je je voelt.',
    points: [
      { head: 'Alvast ingevuld', text: 'je slaap uit je horloge en je benen volgens je beenindex, met de bron erbij.' },
      { head: 'Slaap', text: 'komt soms later binnen dan je rusthartslag. Tik dan op Opnieuw ophalen.' },
      { head: 'Wanneer', text: 'vanaf het uur bij Ochtend (standaard 5 uur) tot twaalven, of tot je invult of je training gelogd is. Staat de kaart uit, dan blijft de vraag een regel bij Je dag.' },
    ],
  },
  zweetVragen: {
    title: 'Zweetverlies vragen',
    lead: 'Bij een loop, wandeling of tocht vraagt ASCEND je gewicht voor en na, zodat je je eigen zweettempo leert kennen.',
    points: [
      { head: 'Vooraf', text: 'een regel op de missiekaart. Een gewicht uit MacroFactor van vandaag of gisteren staat er als voorstel en wordt nooit zonder tik overgenomen.' },
      { head: 'Na afloop', text: 'bij Hoe ging het en op het scherm Gedaan een rij voor je gewicht na. Achteraf invullen kan in het Logboek, ook met de schatting van je horloge.' },
      { head: 'Uit', text: 'ASCEND vraagt niets. Je wegingen blijven bewaard.' },
    ],
  },
  weekbudget: {
    title: 'Weekbudget',
    lead: 'Zonder doel telt ASCEND je week tegen een budget in minuten en keren kracht.',
    points: [
      { head: 'Advies', text: '150 minuten en 2 keer kracht per week, de beweegrichtlijn. Rustig aan is 90 minuten en 1 keer kracht, Sterker worden 120 minuten en 3 keer kracht.' },
      { head: 'Wat telt', text: 'een matige minuut telt 1, een pittige 2. Een krachttraining telt als een keer, niet in de minuten. Minder dan de richtlijn mag.' },
      { head: 'Planning', text: 'met een richting bepaalt het budget hoe lang je duurtrainingen zijn. Eerst een voorstel, pas na Akkoord verandert er iets.' },
    ],
  },
  golven: {
    title: 'Golven',
    lead: 'Zonder doel lopen je weken in golven: een paar weken opbouwen en dan een lichtere week. Bij een andere keuze verandert je planning zoals je bij Wijzigingen koos.',
    points: [
      { head: 'Vier weken', text: 'het advies. Drie weken opbouwen, de vierde 35% lichter bij dezelfde intensiteit. Drie of zes weken kan ook.' },
      { head: 'Lichte week voorstellen', text: 'uit maakt elke week van de golf even zwaar. Dat kan, maar rust is waar je sterker van wordt.' },
      { head: 'Terugblik na een golf', text: 'een kaart op Ascend na elke golf. Haalde je genoeg weken je minuten (advies 3 van 4), dan stelt Nog een golf een iets hoger budget voor.' },
    ],
  },
  beginnersstart: {
    title: 'Beginnersstart',
    lead: 'Wie een tijd weinig sportte, begint zijn richting rustig. Dat loopt na vier weken vanzelf af.',
    points: [
      { head: 'Automatisch', text: 'het advies. Je begint rustig als je in de acht weken voor je richting gemiddeld minder dan twee keer per week sportte.' },
      { head: 'Rustig beginnen', text: 'de eerste vier weken geen harde training. De heuvelloop is dan een herstelloop. Wat jij vastzette blijft staan.' },
      { head: 'Je planning', text: 'je planning verandert zoals je bij Wijzigingen koos: eerst een voorstel, of meteen met een melding en ongedaan maken.' },
    ],
  },
  richting: {
    title: 'Richting',
    lead: 'Zonder doel plant ASCEND je weken naar een richting, in golven van vier weken. Een bergtocht en een rugzak komen pas met een tocht als doel.',
    points: [
      { head: 'Fit blijven', text: 'het advies. 150 minuten en 2 keer kracht, elke vierde week wat lichter.' },
      { head: 'Fitter of sterker worden', text: 'Fitter worden begint bij wat je de laatste vier weken deed en bouwt op. Bij Sterker worden staat kracht voorop.' },
      { head: 'Rustig aan', text: '90 minuten en 1 keer kracht, nooit een harde training. Een andere richting is eerst een voorstel, pas na Akkoord verandert er iets.' },
    ],
  },
  twijfeltest: {
    title: 'Twijfeltest eerst vragen',
    lead: 'Is een testloop duidelijk trager dan je vorige, dan vraagt ASCEND eerst of hij meetelt voor je tempo\'s.',
    points: [
      { head: 'Waarom', text: 'fietsen vooraf, wind of vermoeide benen maken een test trager. Zonder antwoord blijven je tempo\'s die van je vorige test.' },
      { head: 'Telt mee of niet', text: 'bij Telt mee eerst een voorstel, pas na Akkoord verandert er iets. Telt niet mee laat de test in je logboek, maar hij telt niet voor je tempo\'s en je voorspelling.' },
      { head: 'Uit', text: 'de laatste test telt altijd.' },
    ],
  },
  nieuweTest: {
    title: 'Nieuwe test voorstellen bij stilstand',
    lead: 'Stond je veel stil tijdens je testloop, dan stelt ASCEND een nieuwe poging voor.',
    points: [
      { head: 'Wanneer', text: 'meer dan een minuut stilstand of meer dan 3 keer stilstaan in je snelste 5 km, of een test die nog op je antwoord wacht.' },
      { head: 'Wat er gebeurt', text: 'je eerstvolgende harde loop, minstens 3 dagen later, wordt een testloop van 5 km. Er komt geen training bij. Wat in de weg staat schuift mee in hetzelfde voorstel. Een zware beendag of lange duurloop kan daarbij vervallen.' },
      { head: 'Alleen met Akkoord', text: 'eerst een voorstel, pas na Akkoord verandert er iets. Na Liever niet vraagt ASCEND het niet meer voor deze test. Is er binnen 10 dagen geen goede dag, dan zegt ASCEND niets.' },
    ],
  },
  sporten: {
    title: 'Sporten',
    lead: 'Per sport kies je hoe ASCEND ermee omgaat. Verandert een keuze je planning, dan gaat dat zoals je bij Wijzigingen koos.',
    points: [
      { head: 'Plan dit voor mij', text: 'ASCEND zet het in je week, op dagen die bij je benen passen. Alleen voor hardlopen, wandelen en fietsen.' },
      { head: 'Telt mee als ik het doe', text: 'je plant het zelf. Wat je doet telt mee voor je benen en je week.' },
      { head: 'Negeren', text: 'ASCEND doet er niets mee. Je kunt het wel loggen.' },
    ],
  },
  hoeveelPerSoort: {
    title: 'Hoeveel per soort',
    lead: 'Per soort training kies je Minder, Normaal of Meer. Normaal is het advies. Eerst een voorstel, pas na Akkoord verandert er iets.',
    points: [
      { head: 'De soorten', text: 'Kracht, Lange duur (je lange loop van de week), Harde training (de loop waarbij je hijgt, zoals intervallen of tempo) en Rustige duur.' },
      { head: 'Eerst de duur', text: '15 procent korter of langer, afgerond op 5 minuten. Nooit meer dan 110 procent van je langste training van die soort in de laatste 30 dagen.' },
      { head: 'Dan het aantal', text: 'Meer zet er een training bij op een vrije dag, als de regels het toelaten. Minder laat er een weg als er meer dan één staat. De 48 uur tussen zware beendagen, de rust na een tocht of wedstrijd, je rustdag en het aantal harde dagen schuiven nooit.' },
    ],
  },
  sportenTellen: {
    title: 'Hoe sporten meetellen',
    lead: 'Zwemmen, padel en voetbal plant ASCEND niet, maar ze kunnen meetellen voor je benen en je week. Wat een sport met je benen doet is afgeleid uit onderzoek en niet getoetst.',
    points: [
      { head: 'Vragen bij een nieuwe sport', text: 'komt er van je horloge een sport die je nog niet koos, dan vraagt Vandaag hoe hij telt. Tot je antwoordt telt hij niet mee. Uit: hij telt meteen mee.' },
      { head: 'Vragen hoe zwaar het was', text: 'Rustig, Pittig, Zwaar of Heel zwaar. Hoe zwaarder, hoe meer het telt voor je benen. Uit: ASCEND neemt de gebruikelijke zwaarte en rekent een tikje voorzichtiger.' },
      { head: 'Rust na een zware sport', text: 'Ruim houdt na een voetbalwedstrijd 72 uur en na padel of een voetbaltraining 48 uur vrij van zware beenkracht. Korter maakt dat 48 en 24 uur. Het bewijs voor recreanten is matig. De 72 uur komt van onderzoek bij profs. Staat een beendag te dicht na je sport, dan zie je in Week een voorstel.' },
    ],
  },
  nietDoorgegaan: {
    title: 'Training die niet doorging',
    lead: 'Wat ASCEND doet met een training die een paar dagen voorbij is zonder log. ASCEND verzint nooit een log.',
    points: [
      { head: 'Vragen', text: 'één vraag op Vandaag, de oudste eerst. Niet gedaan zet hem op overgeslagen, Toch gedaan opent het gewone invullen, Niet nu laat hem rusten. Ouder dan twee weken vraagt ASCEND niet meer.' },
      { head: 'Zelf overslaan', text: 'ASCEND zet hem op overgeslagen en meldt het, met Ongedaan maken. Een test, een wedstrijd en wat je zelf vastzette krijgen toch de vraag.' },
      { head: 'Niets doen', text: 'hij blijft als gemist in je week staan.' },
    ],
  },
  rustdagTerug: {
    title: 'Rustdag terugzetten voorstellen',
    lead: 'Liet een voorstel je rustdag vervallen en is die dag later weer leeg, dan stelt ASCEND voor hem terug te zetten.',
    points: [
      { head: 'Wanneer', text: 'op je vaste rustdag, als er die dag niets gepland of gedaan is en de week zijn rust niet al op een andere dag heeft.' },
      { head: 'Niet', text: 'als je de twee dagen ervoor niet trainde, als je de rustdag zelf oversloeg, of als een gemiste test of sleuteltraining op die dag past.' },
      { head: 'Alleen met Akkoord', text: 'eerst een voorstel, pas na Akkoord verandert er iets. Na Liever niet blijft de dag leeg en vraagt ASCEND er niet meer naar.' },
    ],
  },
  weekVoorstel: {
    title: 'Voorstel bij een probleem in de week',
    lead: 'Klopt er iets niet in je week en mag ASCEND het niet zelf herstellen, omdat jij of een eerder voorstel de training vastzette, dan krijg je een voorstel.',
    points: [
      { head: 'Wat telt als probleem', text: 'geen rustdag, zware beendagen te dicht op elkaar, twee harde loopjes op een dag, een zware training na een test, twee volle lange trainingen, benen niet fris voor een test.' },
      { head: 'Nooit stil', text: 'eerst een voorstel, pas na Akkoord verandert er iets. In een volle week kan de lichtste training vervallen, nooit een lange duurloop, harde loop, test, wedstrijd of tocht.' },
      { head: 'Liever niet of uit', text: 'je week blijft zoals hij is en de melding blijft staan. Uit haalt alleen de knop met het voorstel weg.' },
    ],
  },
  weekNaKeuze: {
    title: 'Melding na jouw keuze',
    lead: 'Koos je op Vandaag Benen fris en blijft een zware beendag staan, dan zegt Week dat jij dat koos.',
    points: [
      { head: 'Met jouw keuze', text: 'de melding blijft, met jouw keuze erbij. Het voorstel staat nog achter een gewone tekstknop.' },
      { head: 'Gewone melding', text: 'Week meldt het zoals altijd, met Bekijk voorstel als hoofdknop.' },
      { head: 'Alleen vandaag', text: 'je antwoord geldt voor vandaag en voor die ene training. Er verandert niets in je planning.' },
    ],
  },
  volgordeStand: {
    title: 'Volgorde van Je stand',
    lead: 'Kies de volgorde van de blokken op Je stand. Je planning en je cijfers veranderen er niet door.',
    points: [
      { head: 'Blokken', text: 'je sleept hele blokken, zoals Benen, Belasting en Kracht. Binnen een blok blijft de volgorde vast. De lucht met de drie woorden blijft bovenaan.' },
      { head: 'Zonder slepen', text: 'kies per blok Hoger of Lager.' },
      { head: 'Terug naar standaard', text: 'zet alles terug. Een blok dat in de instellingen uit staat, houdt zijn plek.' },
    ],
  },
  langeLoopBenen: {
    title: 'Beenkracht de dag na de lange duurloop',
    lead: 'Kracht is een dag na een rustige lange loop meestal weer op niveau. Zet dit aan als je liever een vrije dag houdt dan 48 uur tussen die twee.',
    points: [
      { head: 'Uit', text: 'het advies. 48 uur tussen de lange duurloop en een zware beendag, in beide volgordes.' },
      { head: 'Aan', text: 'beenkracht mag de dag na de lange duurloop, niet als de dag ervoor al zwaar was voor je benen. Drie zware beendagen op rij komen er nooit.' },
      { head: 'Altijd', text: 'kracht de dag vóór de lange duurloop blijft 48 uur. Je planning verandert zoals je bij Wijzigingen koos: eerst een voorstel, of meteen met een melding en ongedaan maken.' },
    ],
  },
  slepenWeek: {
    title: 'Trainingen slepen in Week',
    lead: 'Sleep een training met het greepje naar een andere dag. Het gaat zoals Verplaatsen in het actieblad. Uit haalt de grepen weg.',
    points: [
      { head: 'Een botsing', text: 'twee zware beendagen binnen 48 uur, of je rustdag, zie je al tijdens het slepen. Bij het loslaten krijg je een voorstel met Akkoord. Liever niet laat alles staan.' },
      { head: 'Loslaten op een training', text: 'staat er op die dag precies één training die mag bewegen, dan ruilen de twee van dag. Liever samen op één dag? Kies dat bij Loslaten op een training.' },
      { head: 'Test en wedstrijd', text: 'een testloop verplaats of ruil je altijd met Akkoord. Een wedstrijd verplaats je via je doel op de Ascend-tab. Een gewone verplaatsing gaat meteen, met Ongedaan maken.' },
    ],
  },
  loslatenTraining: {
    title: 'Loslaten op een training',
    lead: 'Wat er gebeurt als je in Week een training loslaat op een dag waar al één training staat die mag bewegen.',
    points: [
      { head: 'Ruilen', text: 'het advies. De twee ruilen van dag, zodat elke dag één training houdt.' },
      { head: 'Samen', text: 'de training komt erbij op die dag.' },
      { head: 'Altijd', text: 'een botsing zie je tijdens het slepen en ASCEND vraagt het eerst. Een gewone ruil gaat meteen, met Ongedaan maken in de melding.' },
    ],
  },
  testRust: {
    title: 'Rust voor een test',
    lead: 'Een testloop laat zien wat je kunt als je benen fris zijn. Daarom houdt ASCEND rust tussen een zware dag en je test.',
    points: [
      { head: '72 uur', text: 'het advies. Zoveel tijd na de laatste zware loop- of beendag: een zware beendag, de lange duurloop, zware heuvels of intervallen, een bergtocht.' },
      { head: '48 uur', text: 'voor als je benen snel herstellen of je week vol is.' },
      { head: 'Wat ASCEND doet', text: 'een nieuwe of gemiste test komt alleen op een dag met genoeg rust. Staat een test te dicht op een zware dag, dan meldt Week het met een voorstel. Wat jij vastzette verschuift niet zonder jouw Akkoord.' },
    ],
  },
  testStilstaan: {
    title: 'Stilstaan bij een testloop',
    lead: 'Staat je horloge niet stil als jij voor een stoplicht wacht, dan loopt de klok door in je snelste 5 km.',
    points: [
      { head: 'Niet meetellen', text: 'de tijd dat je stilstond telt niet in je snelste 5 km. ASCEND zegt hoe vaak en hoelang. Na meer dan een minuut of meer dan 3 stops zegt ASCEND dat de test iets te gunstig is.' },
      { head: 'Meetellen', text: 'de klok loopt door. Pauzeert je horloge vanzelf, dan telt een stuk met zo\'n gat niet mee.' },
      { head: 'Je tempo\'s', text: 'veranderen niet vanzelf. Verandert er door het stilstaan een tempo, dan vraagt ASCEND eerst Akkoord in het logblad.' },
    ],
  },
  benenNaTest: {
    title: 'Benen vragen na een test',
    lead: 'De ochtend na een test of wedstrijd vraagt de ochtendkaart open hoe je benen voelen, zonder voorstel uit de beenindex.',
    points: [
      { head: 'Waarom', text: 'de zwaarte van een test is bijna altijd 9 of 10 en zegt weinig over je herstel. Hoe je benen de ochtend erna voelen, zegt meer.' },
      { head: 'Wat je ziet', text: 'één zin over je test of wedstrijd van gisteren en de vier keuzes, zonder dat er een is voorgekozen.' },
      { head: 'Uit', text: 'een ochtend als alle andere, met het voorstel uit je beenindex.' },
    ],
  },
  korteNacht: {
    title: 'Vragen bij een korte nacht',
    lead: 'Zag je horloge maar een deel van de nacht, dan vraagt ASCEND of dat klopt, in plaats van te denken dat je slecht sliep.',
    points: [
      { head: 'Wanneer', text: 'minder dan 4 uur slaap, of minder dan de helft van jouw gemiddelde (na een week van je eigen nachten). Dat gebeurt als je horloge in de nacht van je pols gaat.' },
      { head: 'Niet goed gemeten', text: 'die nacht telt niet mee voor een voorstel en niet in jouw gemiddelden van slaap en HRV. Je rusthartslag blijft meetellen. Je kunt zelf zeggen hoe lang je ongeveer sliep. Ongedaan maken zet alles terug.' },
      { head: 'Uit', text: 'een korte nacht is een let op, zoals altijd.' },
    ],
  },
  ochtendmelding: {
    title: 'Ochtendvraag',
    lead: 'Een melding in de ochtend met de vraag hoe je je voelt. Tik erop en het blad staat open.',
    points: [
      { head: 'Tijdstip', text: 'bij benadering. Chrome bepaalt wanneer ASCEND op de achtergrond wakker mag worden. De melding komt na de tijd die jij kiest, en niet na elven.' },
      { head: 'Alleen geïnstalleerd', text: 'op Chrome voor Android, met ASCEND op je beginscherm. Kan het niet, dan krijg je de vraag als je de app opent.' },
      { head: 'Toestemming', text: 'je telefoon vraagt of ASCEND meldingen mag sturen. Er gaat niets naar een server.' },
    ],
  },
  meldingen: {
    title: 'Meldingen',
    lead: 'Welke meldingen ASCEND op je telefoon mag geven, en wanneer.',
    points: [
      { head: 'In de browser', text: 'alleen de ochtendvraag, en Chrome kiest het precieze moment.' },
      { head: 'In de Android-app', text: 'ook het einde van je rust en de weekmelding, op tijd. Ze trillen zoals je Trillen hebt staan. Het einde van de rust volgt het signaal van Forge.' },
      { head: 'Alles lokaal', text: 'de meldingen worden op je telefoon bedacht. Er gaat niets naar een server.' },
    ],
  },
  rustMelding: {
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
  toestemmingen: {
    title: 'Toestemmingen',
    lead: 'Wat je telefoon ASCEND toestaat. Zonder een toestemming werkt alleen dat ene ding niet.',
    points: [
      { head: 'Amber stip', text: 'een toestemming staat uit terwijl iets wat je aan hebt staan hem nodig heeft.' },
      { head: 'Exacte wekker', text: 'zonder kan een melding een paar minuten te laat komen. Voor het einde van je rust is dat te laat.' },
      { head: 'Back-up van Android', text: 'een kopie van je gegevens in je Google-back-up, versleuteld met je schermvergrendeling. Je eigen back-up blijft de echte. Boven ongeveer 25 MB slaat Android hem over.' },
      { head: 'Widget', text: 'de widget Vandaag onthoudt alleen de naam en duur van je training van vandaag. Ben je ziek, dan staat er alleen Rust vandaag. Dat staat op deze telefoon en gaat nergens heen.' },
    ],
  },
  locatie: {
    title: 'Je locatie',
    lead: 'Alleen je plek van nu. Niets wordt bewaard of gedeeld, behalve de afgeronde plek die het weer nodig heeft.',
    points: [
      { head: 'Waarvoor', text: 'het weer op je plek, en op een tochtdag hoeveel kilometer je nog hebt tot het eind van je etappe.' },
      { head: 'Toestemming', text: 'je telefoon of browser vraagt die pas als je dit aanzet. Lukt het niet binnen tien seconden, dan blijft dit uit en zie je waarom.' },
      { head: 'Wat blijft', text: 'het weer bewaart je plek afgerond op ongeveer een kilometer. Je plek op een etappe verdwijnt als je de app sluit. Geen route, geen spoor. Uit: het weer blijft op de laatste plek.' },
    ],
  },
  autoBijwerken: {
    title: 'Automatisch bijwerken',
    lead: 'De app kijkt bij het openen of er een nieuwe versie is, haalt hem op de achtergrond op en gebruikt hem bij de volgende start.',
    points: [
      { head: 'Wat er naar buiten gaat', text: 'niets van jou. ASCEND vraagt alleen een klein versiebestand en de nieuwe versie op bij de site van ASCEND.' },
      { head: 'Gaat het mis', text: 'start een nieuwe versie niet goed, dan valt de app terug op de vorige. Vraagt een versie een nieuwe toestemming, dan zegt de app dat er een nieuwe klaarstaat om te installeren.' },
      { head: 'Uit', text: 'de app blijft zoals hij is tot je zelf een nieuwe installeert.' },
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
  runDetail: {
    title: 'Run in detail',
    lead: 'Vanuit het logblad van een loop open je een scherm met je loop kilometer na kilometer.',
    points: [
      { head: 'Wat erin staat', text: 'het oordeel en drie getallen, het tempo per kilometer, tempo, hartslag en hoogte over de afstand, en de lijst per kilometer en per ronde.' },
      { head: 'Uit', text: 'de rij in het logblad verdwijnt. De kilometers blijven bewaard op je logs.' },
      { head: 'Gegevens', text: 'komen van je horloge via intervals.icu, met Details van lopen aan.' },
    ],
  },
  runDetailPatronen: {
    title: 'Patronen in Run in detail',
    lead: 'De kaart Wat opvalt noemt hoogstens drie dingen uit je loop, de sterkste eerst.',
    points: [
      { head: 'Wat', text: 'een te snelle start, inzakken, een hartslag die oploopt, een klim of tegenwind, en bij een test wat er meespeelde.' },
      { head: 'Waarom', text: 'elke regel heeft een blad met wat er vergeleken is en hoe sterk het is. Het zegt wat het kan betekenen, nooit een oorzaak.' },
      { head: 'Uit', text: 'je ziet alleen de getallen en de grafieken.' },
    ],
  },
  runDetailAdvies: {
    title: 'Advies in Run in detail',
    lead: 'Een of twee suggesties voor de volgende keer, uit de verdeling van je loop of test.',
    points: [
      { head: 'Nooit', text: 'een tijd om te halen of een belofte. Na pijn of Slechter blijft het advies weg.' },
      { head: 'Je planning', text: 'verandert er niet door.' },
    ],
  },
  runDetailLoopvorm: {
    title: 'Loopvorm in Run in detail',
    lead: 'Welke grootheden de kaart Loopvorm laat zien, als je horloge ze meet.',
    points: [
      { head: 'Advies', text: 'cadans, grondcontact, staplengte en op en neer aan, de balans uit.' },
      { head: 'Balans', text: 'zegt na één loop niets. Pas over meerdere lopen is een verdeling buiten ongeveer 52 tegen 48 het bekijken waard.' },
    ],
  },
  borstband: {
    title: 'Hartslag van de borstband',
    lead: 'Zonder borstband kan de hartslag van een andere bron komen, en dan vergelijkt ASCEND niet eerlijk.',
    points: [
      { head: 'Aan', text: 'elke loop telt als gemeten met de band.' },
      { head: 'Uit', text: 'ASCEND vergelijkt geen lopen waarbij de bron kan zijn gewisseld.' },
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
  forgeTijdsgrens: {
    title: 'Hoogstens per krachttraining',
    lead: 'Een krachttraining duurt hoogstens zo lang: 60 minuten, en een beendag 75. Zou hij langer duren, dan haalt Forge eerst sets bijwerk weg.',
    points: [
      { head: 'Hoe het rekent', text: 'met de tijd per set uit je eigen trainingen. Ken je die nog niet, dan met de verwachte duur van de training.' },
      { head: 'Wat eerst gaat', text: 'een set van de extra oefeningen, dan van het bijwerk, tot elke oefening er nog twee heeft. Pas daarna een hele oefening. De kernsets blijven altijd staan.' },
      { head: 'Al korter', text: 'dan verandert er niets. Je planning en je logboek blijven zoals ze zijn; het gaat alleen om wat Forge vandaag klaarzet.' },
      { head: 'Beendag', text: 'een training die je benen zwaar belast, zoals de planner die ook leest.' },
      { head: 'Uit', text: 'Forge zet de hele training klaar, hoe lang hij ook duurt.' },
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
      { head: 'Snelheid weegt het zwaarst', text: 'het gat tussen je verwachte tijd en je doeltijd telt voor 60% mee. Je langste loop en je weekvolume tellen voor 20% elk.' },
      { head: 'Gelijk', text: 'alle meters tellen even zwaar, zoals voor een doel zonder doeltijd. Sterker worden volgt dezelfde keuze, met 60% voor de krachtmeter en 40% voor je harde sets.' },
      { head: 'Je verwachte tijd', text: 'komt uit je testloop die meetelt. Zonder testloop, of zolang je snelste 5 km op je Akkoord wacht, telt snelheid niet mee.' },
    ],
  },
  klaarGroei: {
    title: 'Groei bij het rekenen',
    lead: 'Hoe snel je beter wordt, verschilt sterk tussen mensen. ASCEND rekent het gat naar je doel om in weken werk met één groeigetal.',
    points: [
      { head: 'Gemiddeld', text: 'het midden van de band, bij hardlopen 0,55% per week. Afgeleid uit meerdere onderzoeken, niet uit één studie.' },
      { head: 'Voorzichtig', text: 'de onderkant van de band, bij hardlopen 0,3% per week. Je doel vraagt dan meer weken en de meters staan lager.' },
      { head: 'Overal hetzelfde', text: 'het getal, de meters, de regel onder het getal en een voorstel voor je doeltijd gebruiken dezelfde groei.' },
    ],
  },
  klaarMarge: {
    title: 'Marge bij een tijdslimiet',
    lead: 'Bij een dagtocht met een tijdslimiet of een trailrun met een cutoff telt ASCEND een marge onder die tijd.',
    points: [
      { head: '10%', text: 'het advies. Ruimte voor eten, pauzes en een tragere dag. Bij een limiet van 8 uur ligt de grens op 7:12.' },
      { head: '5% of geen', text: 'krapper. Kies dit alleen als je je dag goed kent.' },
      { head: 'Alleen de meter', text: 'je planning en je doel veranderen er niet door.' },
    ],
  },
  doeltijdVoorstel: {
    title: 'Doeltijd aanpassen voorstellen',
    lead: 'Je doel blijft je doel. Staat dit aan, dan mag ASCEND na een testloop één keer voorstellen om je doeltijd aan te passen.',
    points: [
      { head: 'Liever niet', text: 'ASCEND vraagt er voor dit doel niet meer naar, tot je de doeltijd zelf verandert.' },
      { head: 'Uit', text: 'er komt nooit een voorstel voor je doeltijd. De kaart blijft laten zien hoeveel er nog te winnen is.' },
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
  vakantieOpzij: {
    title: 'Opzij voor een vakantie',
    lead: 'Wat ASCEND doet met een training die moet wijken voor een vakantie of de lichte dagen rond een tocht.',
    points: [
      { head: 'Liever laten vervallen', text: 'de training schuift naar een andere dag van die week, maar niet vlak voor of na zijn volgende keer. Een wekelijkse training houdt minstens vier dagen afstand. Lukt dat niet, dan vervalt hij.' },
      { head: 'Toch verschuiven', text: 'de training gaat naar elke dag van die week die past, ook kort voor zijn volgende keer.' },
      { head: 'Altijd', text: 'twee zware beendagen staan nooit binnen 48 uur en wat je zelf vastzette blijft staan. Het geldt voor nieuwe en gewijzigde periodes. Je ziet het eerst in het voorstel.' },
    ],
  },
  vakantieSchuiven: {
    title: 'Rond een vakantie schuiven',
    lead: 'Hoe ASCEND je weken rond een vakantie indeelt.',
    points: [
      { head: 'Flink', text: 'ASCEND kijkt naar alle werkbare dagen van de weken rond je vakantie, ook over de weekgrens. Het kiest de indeling met genoeg rust tussen zware beendagen en zo min mogelijk dubbele dagen. Wat niet past, vervalt met één zin erbij.' },
      { head: 'Weinig', text: 'een training schuift alleen naar de dichtstbijzijnde dag van zijn eigen week die past, of vervalt.' },
      { head: 'Altijd', text: 'twee zware beendagen staan nooit binnen 48 uur en wat je zelf vastzette blijft staan. Het geldt voor een vakantie zonder training die je hierna toevoegt of wijzigt. Je ziet het eerst in het voorstel.' },
    ],
  },
  zonderSportschool: {
    title: 'Kracht zonder sportschool',
    lead: 'De eerste keuze voor kracht als je in Week een periode zonder sportschool toevoegt. Per periode kun je het anders kiezen.',
    points: [
      { head: 'Eigen gewicht', text: 'een krachttraining wordt op dezelfde dag een korte sessie met je eigen gewicht, 15 tot 20 minuten: squats, lunges, push-ups en kuitheffingen.' },
      { head: 'Laten vervallen', text: 'kracht vervalt in die periode. Lopen blijft.' },
      { head: 'Altijd', text: 'je ziet eerst een voorstel. Een periode die al staat, houdt zijn eigen keuze.' },
    ],
  },
  seizoensstrook: {
    title: 'Seizoensstrook tonen',
    lead: 'Bovenaan Ascend staat je seizoen als een strook van nu tot je laatste doel, met een vlag per doel.',
    points: [
      { head: 'Wat je ziet', text: 'de weken tussen je doelen en de afbouw voor een doel als een donkerder stuk. Een Top heeft een gevulde vlag.' },
      { head: 'Uit', text: 'de strook verdwijnt. Je doelen en je planning blijven precies zoals ze zijn.' },
    ],
  },
  vaardigheidsdoelen: {
    title: 'Calisthenicsdoelen tonen',
    lead: 'Een vaardigheid is een stap op een ladder, zoals Pull-Up op de ladder Optrekken. Ascend toont de ladder als trap.',
    points: [
      { head: 'Wat je ziet', text: 'welke stappen je haalde, op welke stap je nu traint en de toets ervan. Een gehaalde stap blijft gehaald.' },
      { head: 'Je planning', text: 'een vaardigheid plant niets en wordt nooit je hoofddoel.' },
      { head: 'Uit', text: 'de kaarten en de keuze bij Doel toevoegen verdwijnen. Je vaardigheden en wat je haalde blijven bewaard.' },
    ],
  },
  bundelAscend: {
    title: 'Op de Ascend-tab',
    lead: 'Wat Ascend naast je doelen laat zien: de seizoensstrook en je vaardigheden.',
    points: [
      { head: 'Per onderdeel', text: 'elk onderdeel zet je apart aan of uit in het blad.' },
    ],
  },
  waterPerEtappe: {
    title: 'Water per etappe tonen',
    lead: 'Bij elke etappe staat ongeveer hoeveel je onderweg zweet, uit je zweettempo en de uren van de etappe.',
    points: [
      { head: 'Je tempo', text: 'komt uit je eigen wegingen voor en na een training. Zonder wegingen staat er een standaard, met de woorden nog niet gemeten.' },
      { head: 'Geen advies', text: 'het is een richtlijn voor wat je kwijtraakt, geen medisch advies. Het gaat om niet te veel uitdrogen, niet om alles terug te drinken.' },
      { head: 'Uit', text: 'de etappes tonen geen water. Je wegingen blijven bewaard.' },
    ],
  },
  bundelRekenmodel: {
    title: 'Rekenmodel',
    lead: 'Zeven keuzes over hoe Forge rekent. Het advies past bij de meeste mensen, dus je hoeft hier niets te doen.',
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
  trainingstijd: {
    title: 'Trainingstijd per dag',
    lead: 'Hoeveel tijd je normaal per dag hebt. ASCEND kiest dagen waar de training in past en zet er geen tweede training bij als het niet past. Een beetje ruimte erboven mag.',
    points: [
      { head: 'Veranderen', text: 'je planning verandert zoals je bij Wijzigingen koos: eerst een voorstel, of meteen met een melding en ongedaan maken.' },
    ],
  },
  rustdag: {
    title: 'Rustdag',
    lead: 'De dag waarop je niet traint. Een andere dag is eerst een voorstel, pas na Akkoord verandert er iets.',
    points: [
      { head: 'Altijd', text: 'het weekend blijft voor je lange trainingen.' },
      { head: 'Bezet', text: 'staat er deze week een training op je rustdag, dan heet een vrije dag in Week "Rustdag deze week", liefst niet vlak voor een zware dag. Er verschuift niets.' },
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
  bundelWeer: {
    title: 'Weer en kleding',
    lead: 'Wat het weer bij je training laat zien: het weer zelf, het beste moment, waarschuwingen voor onweer, storm, hitte en lawines, regen in het komende uur, heuvels in de buurt, een route voor je loop, de maanstand, kleding, en een regel bij hitte of slechte lucht.',
    points: [
      { head: 'Per onderdeel', text: 'elk onderdeel zet je apart aan of uit in het blad.' },
      { head: 'Je plaats', text: 'het weer volgt de plaats die je bij Plaats koos.' },
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
    lead: 'Bij een tocht in de bergen of de sneeuw toont ASCEND het lawinegevaar uit het bulletin rond de plek van je tocht, van november tot en met mei (bij terrein sneeuw het hele jaar). Het advies is aan.',
    points: [
      { head: 'Wat je ziet', text: 'een regel als: lawinegevaar aanzienlijk, 3 van 5, morgen rond Val d\'Isère. Op een dag van je tocht, of de dag ervoor als je tocht een eigen plek heeft.' },
      { head: 'Waar het vandaan komt', text: 'het open bulletin van de Europese lawinediensten (EAWS), voor de Alpen en de Pyreneeën. Alleen een datum en welke lawinedienst gaan naar buiten.' },
      { head: 'Alleen informatie', text: 'ASCEND zegt niet of je moet gaan. Lees het hele bulletin bij de dienst van het land. Je planning verandert er niet door.' },
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
  weekvraag: {
    title: 'Vraag van de week',
    lead: 'Een korte vraag om stil te staan bij je week. Je antwoord verandert je planning niet.',
    points: [
      { head: 'Privé', text: 'je antwoord blijft op je telefoon.' },
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
  garmin: {
    title: 'Via intervals.icu',
    lead: 'Je trainingen, slaap en hartslag komen van je Garmin via intervals.icu binnen, zonder overtypen.',
    points: [
      { head: 'Waarvoor', text: 'afvinken, slaap, rusthartslag en HRV. Wat je gebruikt kies je bij Gebruik van je horloge.' },
      { head: 'Niet te lezen', text: 'lukt het kijken naar de koppeling even niet, dan staat dat er. Probeer het zo opnieuw.' },
    ],
  },
  bundelHorlogeGebruik: {
    title: 'Gebruik van je horloge',
    lead: 'Per soort gegeven of ASCEND het ophaalt.',
    points: [
      { head: 'Uit', text: 'betekent: niet ophalen en niet bewaren.' },
      { head: 'Health Connect', text: 'de keuzes gelden ook daarvoor. Staat Health Connect aan, dan heet deze rij Gebruik van je gegevens.' },
    ],
  },
  naarHorloge: {
    title: 'Trainingen naar je horloge',
    lead: 'ASCEND zet ze in je intervals.icu-agenda en Garmin brengt ze naar je horloge.',
    points: [
      { head: 'Komende week', text: 'de trainingen van de komende week staan er.' },
    ],
  },
  horlogeVoorvoegsel: {
    title: 'Voorvoegsel voor de naam',
    lead: 'Standaard ASC voor de naam, of ASCEND, of niets. Zo herken je de trainingen van ASCEND op je horloge.',
    points: [
      { head: 'Geen', text: 'dan staat de naam van de training er alleen.' },
    ],
  },
  horlogeRustigeLoop: {
    title: 'Rustige loop: ruime grens',
    lead: 'Bij een rustige loop loopt de grens van zone 1 tot en met zone 2, zodat je niet piept bij even zakken. Alleen bij een hartslagdoel.',
    points: [
      { head: 'Waarom', text: 'hardlopend kom je zelden onder zone 1, dus het horloge piept vooral als je te hoog gaat.' },
    ],
  },
  horlogeGedaanWeghalen: {
    title: 'Gedane trainingen weghalen',
    lead: 'Een training die je deed of oversloeg, verdwijnt weer uit je agenda.',
    points: [
      { head: 'Waarom', text: 'een opgeruimde agenda laat zien wat er nog komt.' },
    ],
  },
  horlogeStatus: {
    title: 'Laten zien of het gelukt is',
    lead: 'Eén regel bij de training en een klein horloge in Week, alleen als het verstuurd is of niet lukte.',
    points: [
      { head: 'Uit', text: 'geen regel en geen horloge, het versturen gaat gewoon door.' },
    ],
  },
  macrofactorExport: {
    title: 'Laatste export',
    lead: 'Krachttrainingen en gewicht uit je MacroFactor-export, met de echte duur en herhalingen in reserve.',
    points: [
      { head: 'Opnieuw inlezen', text: 'lees de export opnieuw in voor nieuwe dagen.' },
    ],
  },
  backup: {
    title: 'Laatste back-up',
    lead: 'Al je gegevens in één bestand, om te bewaren of terug te zetten.',
    points: [
      { head: 'Alleen hier', text: 'alles staat alleen op deze telefoon, dus dit is je enige kopie.' },
    ],
  },
  backupmap: {
    title: 'Vaste map',
    lead: 'Een map die de browser onthoudt, zodat een back-up daar vanzelf landt.',
    points: [
      { head: 'Niet gekozen', text: 'dan bewaar je het bestand elke keer zelf.' },
      { head: 'In de app', text: 'gaat de automatische back-up naar Interne opslag > Documents > ASCEND op je telefoon. Die map zie je in je bestandsbeheerder, en een app die mappen naar Google Drive kopieert kan hem meenemen.' },
    ],
  },
  autoBackup: {
    title: 'Automatische back-up',
    lead: 'Alles staat alleen op deze telefoon. Met een wekelijkse back-up raak je hoogstens een week kwijt, met dagelijks hoogstens een dag.',
    points: [
      { head: 'Wanneer', text: 'zondagavond vanaf 18:00, of bij dagelijks elke avond. Is de app dan dicht, dan gebeurt het de eerstvolgende keer dat je hem opent.' },
      { head: 'In de app en in de browser', text: 'de app maakt het bestand zelf in Interne opslag > Documents > ASCEND. Er gaat niets naar buiten. In de browser staat er een kaart op Vandaag met Back-up maken, tenzij je browser je vaste map zonder vragen vrijgeeft.' },
      { head: 'Bewaren', text: 'het aantal dat je kiest (het advies is 8) blijft staan, oudere ruimt ASCEND op. Wat je er zelf in zet blijft altijd staan. Lukt een back-up niet, dan zegt ASCEND dat hier en op Vandaag.' },
    ],
  },
  momentopnamen: {
    title: 'Kopieën van voor een import',
    lead: 'Voor elke import bewaart ASCEND een kopie, zodat je terug kunt. De laatste vijf blijven.',
    points: [
      { head: 'Waarom', text: 'een import vervangt je gegevens. Met de kopie kun je terug als het niet is wat je dacht.' },
    ],
  },
  herbouwen: {
    title: 'Adviezen opnieuw berekenen',
    lead: 'ASCEND kijkt opnieuw naar je planning en je adviezen. Er wordt niets verwijderd.',
    points: [
      { head: 'Meestal niet nodig', text: 'ASCEND doet het zelf na een update of import. Dit is een noodknop.' },
    ],
  },
  startniveau: {
    title: 'Startniveau zelf invullen',
    lead: 'Meestal niet nodig, want ASCEND vraagt zelf wat ontbreekt. Hier vul je het in als je dat liever doet.',
    points: [
      { head: 'Je historie', text: 'blijft zoals hij was.' },
    ],
  },
  wissen: {
    title: 'Alles verwijderen',
    lead: 'Wist alles op deze telefoon. Maak eerst een back-up, want dit kan niet terug.',
    points: [
      { head: 'Eerst een back-up', text: 'maak er een bij Laatste back-up, dan kun je alles later terugzetten.' },
    ],
  },
  hoofddoel: {
    title: 'Hoofddoel',
    lead: 'Waar je naartoe werkt. ASCEND rekent je weken terug vanaf die datum.',
    points: [
      { head: 'Zonder doel', text: 'dan werk je in golven met een richting.' },
    ],
  },
  programma: {
    title: 'Programma',
    lead: 'In welke week en fase je zit. Opnieuw beginnen bij week 1 kan in het blad.',
    points: [
      { head: 'Opnieuw bij week 1', text: 'kies je een schone start of alleen de weektelling, en vanaf welke week.' },
    ],
  },
  langeZondag: {
    title: 'De lange zondag',
    lead: 'Op zondag staat je langste training: een bergtocht of een lange duurloop. Een andere keuze laat eerst zien wat er verschuift.',
    points: [
      { head: 'Bergdoel', text: 'is je hoofddoel een bergtocht, dan staat deze keuze er niet.' },
    ],
  },
  naHoofddoel: {
    title: 'Na je hoofddoel',
    lead: 'Wat ASCEND plant als je doel voorbij is: niets (advies) of onderhoudsweken.',
    points: [
      { head: 'Tijdens de tocht', text: 'verandert er nooit iets.' },
    ],
  },
  bundelTochten: {
    title: 'Tochten',
    lead: 'Wat ASCEND doet rond een tocht: op Vandaag tonen, water per etappe, rust erna en je schoenen.',
    points: [
      { head: 'Per onderdeel', text: 'elk onderdeel zet je apart aan of uit in het blad.' },
    ],
  },
  vrijeDagen: {
    title: 'Vrije dagen en vakanties',
    lead: 'Dagen zonder training, een vakantie of een tocht. Je zet ze in Week.',
    points: [
      { head: 'Voorstel', text: 'eerst een voorstel, pas na Akkoord verandert er iets.' },
    ],
  },
  blessures: {
    title: 'Blessures',
    lead: 'Waar je last van hebt, en wat je kunt rekken of versterken.',
    points: [
      { head: 'Je planning', text: 'verandert er niet door. Bij een klacht aan been of voet zie je een hint bij zware beentrainingen.' },
    ],
  },
  bundelWat: {
    title: 'Wat speelde er',
    lead: 'Je eigen aantekeningen bij een training of een dag, en wat ASCEND ermee doet.',
    points: [
      { head: 'Alleen op je telefoon', text: 'wat je vastlegt blijft hier.' },
    ],
  },
  krachtBijhouden: {
    title: 'Waar je sets bijhoudt',
    lead: 'Houd je je sets bij in ASCEND of in MacroFactor?',
    points: [
      { head: 'In ASCEND', text: 'je vult ze in tijdens je training, met de rusttimer en voorstellen per set.' },
      { head: 'In MacroFactor', text: 'ASCEND leest ze uit je export en het workoutscherm is om mee te kijken.' },
    ],
  },
  forgeVolgorde: {
    title: 'Wat eerst omhoog',
    lead: 'Gaat een oefening goed, dan verhoogt Forge eerst dit. Het andere volgt als het bovenaan je bereik zit.',
    points: [
      { head: 'Alleen voorstellen', text: 'Forge stelt voor, jij beslist.' },
    ],
  },
  bundelRusttimer: {
    title: 'Rusttimer',
    lead: 'Na elke werkset en je laatste opwarmset start de rust, met een tijd per oefening.',
    points: [
      { head: 'Signaal', text: 'of en hoe de rusttimer je laat weten dat de rust om is, kies je in het blad.' },
    ],
  },
  forgeScherm: {
    title: 'Scherm aan tijdens je training',
    lead: 'Je scherm blijft aan zolang je training open is, ook als je alleen meekijkt.',
    points: [
      { head: 'Uit', text: 'dan volgt je scherm de instelling van je telefoon.' },
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
      ? { head: 'Wanneer', text: 'een testloop vandaag of morgen, na een avond waarvan je veel vastlegde van wat je dronk of gebruikte. Bij wat je gebruikte alleen op dezelfde dag.' }
      : p)),
  },
};

// De uitleg bij een instelling; `named` is de instelling "Voorbeelden bij naam noemen".
export function settingsHelp(key: string, named: boolean = true): SettingsHelp | undefined {
  return (!named && NEUTRAL_HELP[key]) || SETTINGS_HELP[key];
}

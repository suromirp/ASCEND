// ASCEND: de uitleg achter de i bij de instellingen van de groep Forge, op id van de verklaring
// (docs/visie/Ontwerp instellingen op een plek.md, stap 3). Alleen geladen in Instellingen of als je op de i tikt
// (data/settingsHelpKeys.ts), zodat deze tekst niet bij de start van de app laadt. De verklaring zegt `help: true`.

import type { SettingsHelp } from '../../../data/settingsHelp';

export const FORGE_UITLEG: Record<string, SettingsHelp> = {
  forge: {
    title: 'Kracht meerekenen',
    lead: 'Forge rekent met je krachttrainingen en stelt per oefening voor wat je de volgende keer doet. Uit: je ziet alleen wat je deed.',
    points: [
      { head: 'Je krijgt', text: 'per oefening een voorstel voor de volgende keer.' },
      { head: 'Je planning', text: 'verandert er niet door.' },
    ],
  },
  kracht: {
    title: 'Waar je sets bijhoudt',
    lead: 'Houd je je sets bij in ASCEND of in MacroFactor?',
    points: [
      { head: 'In ASCEND', text: 'je vult ze in tijdens je training, met de rusttimer en voorstellen per set.' },
      { head: 'In MacroFactor', text: 'ze komen uit je export en het workoutscherm is om mee te kijken.' },
    ],
  },
  'forge-volgorde': {
    title: 'Wat eerst omhoog',
    lead: 'Gaat een oefening goed, dan verhoogt Forge eerst dit. Het andere volgt als het bovenaan je bereik zit.',
    points: [
      { head: 'Alleen voorstellen', text: 'Forge stelt voor, jij beslist.' },
    ],
  },
  'forge-opwarmen': {
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
  'forge-1rm': {
    title: 'Geschatte 1RM',
    lead: 'Per oefening staat op Forge je geschatte 1RM, met een kleine trend door de tijd.',
    points: [
      { head: 'Een schatting', text: 'uit je laatste sets, geen test. Forge rekent met precies dit getal.' },
      { head: 'Uit', text: 'dan laat Forge alleen het werkgewicht zien, zonder schakelaar. Je voorstel voor de volgende keer blijft staan.' },
    ],
  },
  'forge-kent-je': {
    title: 'Hoe goed kent Forge je',
    lead: 'Een blok op de Forge-pagina dat laat zien of Forge je goed inschat, gemeten aan je eigen trainingen van de laatste vier weken. MacroFactor is hier geen scheidsrechter.',
    points: [
      { head: 'Voorspelling', text: 'hoeveel sets binnen één herhaling lagen van wat Forge verwachtte. Dat telt alleen als je het voorgestelde gewicht pakte en zelf invulde hoeveel je over had.' },
      { head: 'Bijgestuurd', text: 'hoe vaak je het gewicht (of afgevinkte herhalingen) zelf veranderde voor je afvinkte.' },
      { head: 'Sterker', text: 'of je geschatte maximum op je hoofdoefeningen over zes tot acht weken stijgt, gelijk blijft of daalt.' },
      { head: 'Alleen kijken', text: 'het blok verandert je plan en je logs nooit. Met te weinig sets staat er "nog te weinig data".' },
    ],
  },
  'forge-weergave': {
    title: 'Forge toont',
    lead: 'Elke oefening op Forge heeft twee kanten: je geschatte 1RM en het werkgewicht.',
    points: [
      { head: '1RM', text: 'het getal van nu, de verandering over vier weken en een lijn door de tijd. Staat er een 1RM uit MacroFactor, dan staat die ernaast.' },
      { head: 'Werkgewicht', text: 'het gewicht dat je volgens de schatting aankunt bij het aantal herhalingen van die oefening, met de lijn van eerder.' },
      { head: 'Eén keuze', text: 'voor alle kaarten. Tik je op een kaart op de andere kant, dan verandert dit ook.' },
    ],
  },
  'forge-1rm-macrofactor': {
    title: 'MacroFactor-1RM erbij',
    lead: 'MacroFactor schat ook een 1RM. Die staat naast die van jezelf, zonder ze te mengen.',
    points: [
      { head: 'Waar het vandaan komt', text: 'uit het blad "Exercises - 1-RM" van de volledige export. Lees de export opnieuw in voor nieuwe dagen.' },
      { head: 'Twee getallen', text: 'ze kunnen verschillen, want MacroFactor rekent anders. Gebruik ze voor de richting, niet als maximum dat je moet halen.' },
      { head: 'Uit', text: 'dan staat er alleen de schatting van ASCEND. Wat je ingelezen hebt blijft bewaard.' },
    ],
  },
  'forge-vergelijken': {
    title: 'Vergelijken met',
    lead: 'Tik je op een oefening, dan zie je je geschatte 1RM van nu naast die van een paar weken terug. Zo zie je of je sterker wordt.',
    points: [
      { head: 'Een voorbeeld', text: 'je bankdrukken staat nu op 80 kg. Vier weken geleden was dat 77,5 kg, acht weken geleden 75 kg. Dan staat er +2,5 en +5 bij. Het beste ooit staat er altijd naast.' },
      { head: '4 en 8 weken', text: 'het advies: een maand en twee maanden terug.' },
      { head: 'Andere momenten', text: 'kies 2 en 4 weken als je vaak traint, of 12 en 26 weken voor het lange werk.' },
      { head: 'Geen oordeel', text: 'het verschil is een kleine regel. Gelijk of lager is geen mislukking, een hogere 1RM is niet het enige doel.' },
    ],
  },
  'forge-extras': {
    title: 'Wat er verder veranderde',
    lead: 'Vooruitgang is niet altijd een hogere 1RM. Forge laat ook de rest zien.',
    points: [
      { head: 'Herhalingen', text: 'meer herhalingen bij hetzelfde gewicht als eerder.' },
      { head: 'Zwaarste gewicht', text: 'het zwaarste gewicht van je beste set.' },
      { head: 'Volume', text: 'gewicht maal herhalingen over de werksets van een training. Opwarmsets tellen niet mee.' },
    ],
  },
  'forge-lijntjes': {
    title: 'Lijntjes in de lijst',
    lead: 'Een klein lijntje naast elke oefening laat in één oogopslag zien hoe het de laatste trainingen ging.',
    points: [
      { head: 'Het lijntje', text: 'de laatste tien trainingen, met hetzelfde getal als rechts in de rij. Het puntje is je laatste training.' },
      { head: 'Openklappen', text: 'klap je een oefening open, dan staat de hele grafiek erboven.' },
      { head: 'Uit', text: 'alleen de getallen, de grafiek staat dan nog in de geschiedenis.' },
    ],
  },
  'forge-plaatjes': {
    title: 'Plaatjes bij oefeningen',
    lead: 'Naast een oefening in Forge staat een klein kaartje met de spieren die werken. Tik erop en je ziet de beweging in drie stappen, de spieren op het lichaam en wat je moet doen, waar je op let en wat vaak misgaat.',
    points: [
      { head: 'Spierkaart en tekening', text: 'het advies. De tekeningen komen van Workout Guide en zijn van Everkinetic en Bryl Lim, CC BY-SA 4.0; die van de calisthenicsladders zijn eigen tekeningen van ASCEND, onder dezelfde licentie. Ze worden geladen als je een oefening opent, en op de achtergrond voor de oefeningen van je eigen trainingen. Zonder netwerk zie je dan alleen het spierkaartje.' },
      { head: 'Alleen spierkaart', text: 'de spieren en de uitleg, zonder tekening. Er wordt niets geladen.' },
      { head: 'Uit', text: 'geen kaartje bij een oefening. Het menu van een oefening houdt de uitleg.' },
      { head: 'Een andere variant', text: 'staat er een tekening van bijna dezelfde oefening, dan zegt een regel eronder wat anders is.' },
    ],
  },
  'forge-uitleg-open': {
    title: 'Uitleg standaard uitgeklapt',
    lead: 'In het blad van een oefening staat eerst In het kort, drie regels. Hier kies je of Lees verder ook al open staat.',
    points: [
      { head: 'Uit', text: 'het advies. Je ziet de drie regels en tikt op Lees verder als je meer wilt weten.' },
      { head: 'Aan', text: 'de beginstand, de beweging, het tempo en de veelgemaakte fouten staan meteen open. Je kunt ze nog steeds dichtklappen.' },
      { head: 'Niet elke oefening', text: 'heeft al een uitleg. Zonder uitleg zie je de oude drie regels.' },
    ],
  },
  'bundel-rusttimer': {
    title: 'Rusttimer',
    lead: 'Na elke werkset en je laatste opwarmset start de rust, met een tijd per oefening.',
    points: [
      { head: 'Signaal', text: 'of en hoe de rusttimer je laat weten dat de rust om is, kies je in het blad.' },
    ],
  },
  'forge-scherm': {
    title: 'Scherm aan tijdens je training',
    lead: 'Je scherm blijft aan zolang je training open is, ook als je alleen meekijkt.',
    points: [
      { head: 'Uit', text: 'dan volgt je scherm de instelling van je telefoon.' },
    ],
  },
  'forge-bijsturen': {
    title: 'Bijsturen in de training',
    lead: 'Was een set zwaarder dan bedoeld, dan stelt Forge voor de volgende sets een lichter gewicht voor.',
    points: [
      { head: 'Wanneer', text: 'als je een werkset afvinkt met minder herhalingen en RIR samen dan de onderkant van het bereik plus het RIR dat gevraagd was. Vulde je de RIR niet zelf in, dan beslissen de herhalingen.' },
      { head: 'Zo rekent het', text: 'uit die set schat Forge je kracht van vandaag, iets minder voor elke volgende set, en kiest het zwaarste gewicht van je sportschool waarbij je de onderkant nog haalt.' },
      { head: 'Jij beslist', text: 'met Lichter komt het gewicht in de sets die nog open staan en die je niet zelf aanpaste. Met Liever niet blijft alles zoals het was.' },
      { head: 'Past er niets', text: 'dan is er geen voorstel, in plaats van een gewicht dat veel te veel herhalingen geeft.' },
    ],
  },
  'forge-spotter': {
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
  'bundel-sportschool': {
    title: 'Sportschool',
    lead: 'Train je in twee sportscholen, kies dan hier waar je nu bent.',
    points: [
      { head: 'Wat erbij hoort', text: 'de stangen, schijven en dumbbells, de gewichten per toestel en wat bekend is over de gewichten die je gebruikte.' },
      { head: 'Je log', text: 'een nieuwe krachttraining onthoudt in welke sportschool hij was. Oudere trainingen hebben dat niet en tellen overal mee.' },
      { head: 'MacroFactor', text: 'eindigt de naam van een workout op " @ " en de naam van een sportschool, dan hoort hij daarbij.' },
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
  'forge-dumbbells': {
    title: 'Dumbbells in je log',
    lead: 'Sommigen loggen bij een duwoefening het totaal van twee dumbbells, anderen het gewicht per dumbbell.',
    points: [
      { head: 'Vanzelf herkennen', text: 'staat in het logboek van een oefening een gewicht dat zwaarder is dan je zwaarste dumbbell, dan telt die oefening als totaal. Log je ook bij lichtere oefeningen het totaal, kies dan Totaal van twee.' },
      { head: 'Totaal', text: 'de gewichten zijn de sommen van twee gelijke dumbbells uit je rek, en het gewicht staat erbij als "60 kg (2 x 30)".' },
      { head: 'Eén dumbbell', text: 'een oefening met één dumbbell, zoals de goblet squat, wordt nooit verdubbeld.' },
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
  'standen-onthouden': {
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
    lead: 'Heb je een los plaatje of een magneet dat je bij het blok van een toestel legt, vul het dan een keer in. Het telt op bij elk gewicht van het blok.',
    points: [
      { head: 'Voorbeeld', text: 'het blok gaat in stappen van 5 kg en je hebt een los gewicht van 2,3 kg. Dan kan het toestel 65, 67,3, 70, 72,3 en zo verder. Forge laat zien waar zo\'n gewicht uit bestaat, bijvoorbeeld 70 + 2,3.' },
      { head: 'Hele sportschool', text: 'wat je hier invult geldt voor alle kabels en toestellen met een gewichtstapel in deze sportschool.' },
      { head: 'Per toestel', text: 'een toestel kan een eigen tussengewicht hebben, of geen terwijl de sportschool er wel een heeft. Dat kies je bij het toestel, ook in het menu van de oefening in een training.' },
      { head: 'Meer dan één', text: 'je kunt er hoogstens drie invullen, bijvoorbeeld 1,25 en 2,5. Ze tellen alleen of samen, elk hoogstens één keer.' },
    ],
  },
  trainingsduur: {
    title: 'Trainingsduur',
    lead: 'Hoe lang een krachttraining duurt, volgt uit de echte duur van je trainingen.',
    points: [
      { head: 'Na drie trainingen', text: 'geldt wat je meestal nodig hebt.' },
      { head: 'Eerder', text: 'helpt een eigen schatting, onder Geavanceerd.' },
    ],
  },
  'forge-tijdsgrens': {
    title: 'Hoogstens per krachttraining',
    lead: 'Het advies is Tonen, niet inkorten: de hele training staat er, en bij elke oefening staat of het kern, bijwerk of extra is. Kies je een grens, dan haalt Forge eerst sets bijwerk weg.',
    points: [
      { head: 'Tonen', text: 'zit je over de 60 minuten (een beendag 75) en is de kern af, dan staat onder de klok dat wat nog komt bijwerk of extra is. Stoppen kan; een keertje niet is geen probleem. Pauzes tellen niet mee.' },
      { head: 'Afronden', text: 'met bijwerk of extra open telt de training gewoon als gedaan, nooit als gemist.' },
      { head: 'Een grens', text: 'met 45, 60, 75 of 90 minuten rekent Forge met de tijd per set uit je eigen trainingen. Eerst gaat een set van de extra oefeningen, dan van het bijwerk, tot elke oefening er nog twee heeft. Pas daarna een hele oefening. De kernsets blijven altijd staan, en bij de oefening staat wat wegviel.' },
      { head: 'Je planning', text: 'en je logboek blijven zoals ze zijn; het gaat alleen om wat Forge vandaag klaarzet.' },
      { head: 'Beendag', text: 'een training die je benen zwaar belast, zoals de planner die ook leest.' },
    ],
  },
  'bundel-rekenmodel': {
    title: 'Rekenmodel',
    lead: 'Zeven keuzes over hoe Forge rekent. Het advies past bij de meeste mensen, dus je hoeft hier niets te doen.',
    points: [
      { head: 'Staat er Advies', text: 'dan staat alles hier op het advies. Pas je iets aan, dan staat er hoeveel keuzes anders staan.' },
      { head: 'Terugzetten', text: 'kan per keuze, of met Terug naar het advies bovenaan Instellingen.' },
      { head: 'Alleen voorstellen', text: 'het model verandert nooit stil je planning of je trainingen. Het stelt gewichten voor, jij beslist.' },
    ],
  },
  'forge-rekent-mee': {
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
  'forge-afvinken-doel': {
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
  'forge-vermoeidheid': {
    title: 'Vermoeidheid per set',
    lead: 'Elke werkset kost de volgende een beetje kracht. Hoeveel verschilt per oefening.',
    points: [
      { head: 'Leren per oefening', text: 'Je eigen sets laten zien hoeveel geschatte kracht je van set tot set verliest; daarmee rekent Forge de latere sets, de verwachte herhalingen en het bijsturen. Met weinig sets blijft het dicht bij 3%.' },
      { head: 'Vast 3%', text: 'elke oefening krijgt dezelfde daling, wat je ook deed.' },
      { head: 'Waarom', text: 'hoeveel herhalingen je van set tot set verliest hangt af van de oefening, het gewicht en de rust (matig bewijs).' },
    ],
  },
  'forge-tussen-oefeningen': {
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
  'forge-pauze': {
    title: 'Na een pauze lichter beginnen',
    lead: 'Na meer dan vier weken zonder krachttraining begint het voorstel iets lichter.',
    points: [
      { head: 'Waarom', text: 'tot ongeveer vier weken verlies je weinig kracht, daarna meer (matig bewijs).' },
      { head: 'Alleen een echte pauze', text: 'rustte alleen deze oefening terwijl je wel krachttraining deed, dan begint hij op je laatste niveau.' },
      { head: 'Hoeveel', text: 'het voorstel rekent met 5% minder kracht en kijkt na die training opnieuw.' },
      { head: 'Uit', text: 'dan begint het voorstel ook na een lange pauze op je laatste niveau.' },
    ],
  },
  'forge-leren': {
    title: 'Gewichten van toestellen',
    lead: 'Bij een toestel of kabel met een gewichtstapel bepaal je hoe streng de voorgestelde gewichten zijn.',
    points: [
      { head: 'Geleerd en geschat', text: 'het onthoudt de gewichten die je op dat toestel pakte, ook bij opwarmen. Boven en onder wat je gebruikte telt de stap die je op het toestel twee keer zag, anders de stap uit je sportschool. Een grote kloof ertussen wordt opgevuld. Zo kan er een gewicht tussen zitten dat het toestel niet heeft.' },
      { head: 'Alleen wat je gebruikte', text: 'Nooit een gewicht dat je er nog niet pakte. Vraagt je kracht om zwaarder, dan blijft het gewicht staan en gaan de herhalingen omhoog. Haal je de bovenkant met genoeg over, dan kies je zelf het eerstvolgende gewicht op het toestel. Zonder gebruikte gewichten op dat toestel gelden de stappen van je profiel.' },
      { head: 'Stappen van je profiel', text: 'Afgerond op de stap die je bij Kabels en toestellen instelde.' },
      { head: 'Eigen lijst', text: 'vulde je de gewichten van een toestel zelf in (Gewichten per toestel), dan gelden precies die, in elke keuze hierboven.' },
    ],
  },
  'bundel-invullen': {
    title: 'Bij het invullen',
    lead: 'Drie keuzes over wat het workoutscherm voor je doet terwijl je sets invult.',
    points: [
      { head: 'Alleen met sets in ASCEND', text: 'houd je sets in MacroFactor bij, dan is het workoutscherm alleen om mee te kijken en doen deze keuzes niets. Ze verdwijnen dan uit beeld.' },
      { head: 'Terugzetten', text: 'kan per keuze, of met Terug naar het advies bovenaan Instellingen.' },
    ],
  },
  'forge-oefeningen': {
    title: 'Oefeningen in een training',
    lead: 'Een oefening per scherm: je veegt opzij naar de volgende oefening, zoals in MacroFactor, en bovenaan staat een strook met een kaartje per oefening.',
    points: [
      { head: 'Een per scherm', text: 'het advies. Tik op een kaartje in de strook om naar die oefening te springen; een afgeronde oefening heeft een vinkje. Naar beneden scrollen kan binnen een oefening gewoon.' },
      { head: 'Een set verwijderen', text: 'veeg op het nummer of het voorschrift van de set naar links, zoals altijd. Elders op het scherm wisselt vegen van oefening.' },
      { head: 'Onder elkaar', text: 'alle oefeningen op een pagina, zoals eerst. Je kunt dit ook in het menu van de training zelf zetten.' },
    ],
  },
  'forge-verloop': {
    title: 'Verloop toont',
    lead: 'Het blad Verloop van de training zet per set een regel: het gewicht, de herhalingen en je RIR zoals de set uiteindelijk is, met alle redenen in een zin.',
    points: [
      { head: 'Alleen wijzigingen', text: 'het advies. Alleen de sets waar jij of Forge iets aan veranderde, of die onder het bereik bleven.' },
      { head: 'Alle sets', text: 'ook de sets volgens schema, met de zwaarste set per oefening. Een gedempt bolletje is een RIR die je niet zelf koos.' },
      { head: 'In het blad', text: 'je kunt ook wisselen in het blad zelf; die keuze blijft staan.' },
    ],
  },
  'forge-onderbreking': {
    title: 'Lange onderbreking vragen na',
    lead: 'Een training in Forge blijft open tot je afrondt of verwijdert, ook als je de app sluit. Kom je terug na een lange stilte, dan vraagt Forge eenmaal of die tijd meetelt.',
    points: [
      { head: 'Nee, als pauze', text: 'het advies. De tijd vanaf je laatste handeling tot nu wordt een pauze, en de duur van de training blijft eerlijk.' },
      { head: 'Ja, telt mee', text: 'de klok loopt door alsof je er was, bijvoorbeeld bij een lange rust tussen twee blokken.' },
      { head: 'Uit', text: 'Forge vraagt niets en telt alles mee. Pauzeren kan altijd zelf in het menu van de training.' },
    ],
  },
  'forge-concept': {
    title: 'Training bewaren als concept na',
    lead: 'Een training die je begon en vergat af te ronden, loopt niet dagen door. Na middernacht, of na deze grens zonder handeling, staat hij als concept klaar. Er gaat niets weg en je planning verandert niet.',
    points: [
      { head: 'Afronden', text: 'met de sets die je deed en de tijd tot je laatste handeling. Is het minder dan de helft, dan heet het eerlijk een korte training.' },
      { head: 'Verder', text: 'de stille tijd wordt een pauze en je gaat door waar je was.' },
      { head: 'Verwijderen', text: 'pas na een bevestiging. Je logboek verandert niet.' },
      { head: 'Na 12 uur', text: 'het advies. Middernacht geldt altijd, met een uur stilte, zodat een late training gewoon doorloopt.' },
    ],
  },
  'forge-vegen': {
    title: 'Vegen om te verwijderen',
    lead: 'In een training haal je een set weg door de rij naar links te vegen. Uit, dan beweegt de rij niet meer mee met je vinger.',
    points: [
      { head: 'Uit', text: 'een set verwijderen kan nog altijd: houd de rij ingedrukt en kies Set verwijderen.' },
      { head: 'Aan', text: 'een korte veeg laat een rode knop zien, een lange veeg verwijdert meteen. Je kunt het direct terugdraaien.' },
    ],
  },
  'forge-rir-vooraf': {
    title: 'RIR vooraf invullen',
    lead: 'Herhalingen in reserve (RIR) zijn alleen iets waard als jij ze zelf zei.',
    points: [
      { head: 'Als hint', text: 'het veld is leeg en het doel staat gedimd in beeld. Vul je niets in, dan wordt het doel bewaard met een merkje dat je het niet zelf invulde.' },
      { head: 'Met het doel', text: 'het doel staat er al als waarde, zoals voorheen. Raak je de set niet aan, dan krijgt hij hetzelfde merkje.' },
      { head: 'Waarom', text: 'Een aangenomen RIR telt als zwakke aanname, zodat zichtbaar blijft welke sets gemeten zijn. De rekenregels veranderen niet.' },
    ],
  },
  'forge-rir-snel': {
    title: 'Hoeveel over na een set',
    lead: 'Afvinken geeft het doel als RIR. Alleen als het anders ging vraagt Forge in de rij hoeveel je nog over had: 0, 1, 2 of 3+.',
    points: [
      { head: 'Als het anders ging', text: 'het advies: na een zware set (0 of 1 over, of tot falen), minder herhalingen dan gevraagd, ruim boven het bereik, de eerste set op een zwaarder gewicht en in je eerste drie trainingen van een oefening. Staat Afvinken telt als het doel uit, dan ook bij de eerste set die de bovenkant haalt, zodat de stap zwaarder kan komen.' },
      { head: 'Vaker vragen', text: 'ook na je eerste en je laatste werkset, ook als alles volgens schema ging, en verder alles wat het advies vraagt.' },
      { head: 'Eén tik', text: 'je kiest in de rij zelf, zonder blad. Het doel staat gedempt voorgekozen; kies je niets, dan blijft het staan als aangenomen RIR.' },
      { head: 'Waarom', text: 'van een RIR die je zelf kiest leert Forge hoe snel je moe wordt, en hij telt voor de stap zwaarder en voor klaar voor je doel. Een aangenomen RIR telt alleen als het doel mee in je geschatte kracht.' },
    ],
  },
  'forge-stappen': {
    title: 'Stappen bij calisthenics',
    lead: 'Forge toont bij een oefening op een ladder de stap, de toets en een tik naar een lichtere of zwaardere stap.',
    points: [
      { head: 'De toets', text: 'drie sets op de bovenkant met nette vorm, bijvoorbeeld 3 keer 8. Haal je dat, dan kan de volgende stap.' },
      { head: 'Stap lichter of zwaarder', text: 'wisselt de oefening alleen in deze training, zoals Ruilen. Je planning en je training blijven zoals ze zijn.' },
      { head: 'Uit', text: 'geen regels en geen tik. Seconden voor een houding blijven werken.' },
    ],
  },
  'forge-netjes': {
    title: 'Ging het netjes?',
    lead: 'Na een set op een ladderstap vraagt Forge of je vorm netjes was. Een Nee telt die set niet voor de stap.',
    points: [
      { head: 'Wanneer', text: 'alleen als de set de onderkant haalt: 5 herhalingen of 10 seconden. Eronder verandert het antwoord niets.' },
      { head: 'Niets kiezen', text: 'dan blijft het onbekend, en dat telt als netjes. Achteraf wijzigen kan door de set lang in te drukken.' },
    ],
  },
  'forge-band': {
    title: 'Band bij optrekken en dip',
    lead: 'Bij Pull-Up en Dip kies je de band die je gebruikt: geen, licht, middel of zwaar.',
    points: [
      { head: 'Telt niet voor de stap', text: 'met hulp haal je de stap nog niet. Je werkt door tot je de onderkant zonder band haalt.' },
      { head: 'Je vorige keer', text: 'Forge zet de band van je vorige keer klaar. Een keuze geldt voor de open sets.' },
    ],
  },
  'forge-stapvoorstel': {
    title: 'Stap voorstellen',
    lead: 'Haal je de toets van een ladderstap, dan stelt Forge de volgende stap voor. Haal je drie trainingen achter elkaar de onderkant niet, dan de lichtere stap.',
    points: [
      { head: 'Akkoord', text: 'de oefening in je training wordt de nieuwe stap, vanaf je volgende training. Sets en herhalingen blijven.' },
      { head: 'Liever niet', text: 'dan blijft je plan zoals het is en komt dit voorstel niet terug. Een voorstel voor een andere stap wel.' },
      { head: 'Terug', text: 'Ongedaan maken op de kaart, of later in het blad van de oefening.' },
      { head: 'Calisthenics algemeen', text: 'staat de squat op één been of de L-sit nog in geen enkele training, dan stelt Ascend één keer voor om de eerste stap in een krachttraining te zetten.' },
    ],
  },
  'forge-ijkset': {
    title: 'IJkset',
    lead: 'Een schatting van wat je over hebt is alleen goed als je hem af en toe controleert. Eens per vier weken zet Forge daarom één set erbij.',
    points: [
      { head: 'Wat', text: 'bij één hoofdoefening een set erbij, zo ver als netjes gaat. Daarna kies je zoals altijd hoeveel je over had.' },
      { head: 'Vragen', text: 'het advies: een kaart met Niet nu en Akkoord. Pas na Akkoord komt de set erbij; met Niet nu blijft je training zoals hij was en vraagt Forge het de volgende keer opnieuw.' },
      { head: 'Automatisch erbij', text: 'de set staat bij het openen al in je training, met één regel uitleg boven de oefening. Wil je hem niet, haal hem weg zoals elke set. De vier weken tellen pas als je de training afrondt met die set afgevinkt.' },
      { head: 'Wanneer niet', text: 'als je ziek bent of opbouwt na ziekte, op een dag zonder sportschool, in een vakantie of op een tocht, in een week met een tocht of test, in de week voor een wedstrijd, in een rustige week, als krachttraining uit staat, als Forge de training lichter maakt, en hooguit eens per vier weken.' },
    ],
  },
  'forge-soort': {
    title: 'Calisthenics per training',
    lead: 'Per krachttraining kies je kracht met gewicht, calisthenics met je eigen gewicht, of samen.',
    points: [
      { head: 'Calisthenics', text: 'duwen, optrekken en schouderdrukken gaan op hun ladder, op de stap waar je staat; elke ladder hoogstens één keer. Wat overblijft en je benen blijven met gewicht.' },
      { head: 'Samen', text: 'van de plekken die een ladder kunnen worden blijft de eerste helft met gewicht, de rest gaat op een ladder.' },
      { head: 'Akkoord', text: 'eerst een voorstel; je ziet het de volgende keer dat je de training opent. Je planning en je dagen blijven.' },
    ],
  },
  'forge-doorvoeren': {
    title: 'Wijzigingen doorvoeren',
    lead: 'Pas je het gewicht of de herhalingen van een set aan, dan kunnen de latere sets meegaan.',
    points: [
      { head: 'Gelijke sets', text: 'sets met hetzelfde gewicht en dezelfde herhalingen als deze set voor je wijziging nemen de nieuwe waarde over. Gewicht en herhalingen apart.' },
      { head: 'Zelfde verschil', text: 'ga je 2,5 kg omhoog, dan gaan de sets erna ook 2,5 kg omhoog. De herhalingen blijven.' },
      { head: 'Wat blijft staan', text: 'gedane sets, opwarmsets en sets die je zelf aanpaste. De RIR volgt nooit, die voel je per set.' },
    ],
  },
  'forge-schijven': {
    title: 'Schijven bij de set',
    lead: 'Onder een werkset met een stang staat welke schijven je per kant nodig hebt. Standaard uit: het cijferblok toont ze als je het gewicht intikt.',
    points: [
      { head: 'Altijd', text: 'past een gewicht niet precies met je schijven, dan staat dat onder de set, ook met deze instelling uit.' },
      { head: 'Tik erop', text: 'dan opent het invoerpaneel met de stang erbij getekend.' },
      { head: 'Je sportschool', text: 'de schijven en stangen komen uit je sportschoolprofiel.' },
    ],
  },
  'forge-opwarmset-later': {
    title: 'Opwarmset later dempen',
    lead: 'Een opwarmset op een beweging die al warm is, zoals de leg press na de squat, is vaak niet nodig.',
    points: [
      { head: 'Aan', text: 'de set blijft staan, gedempt, met één zin waarom. Afvinken telt als opwarmset; laten liggen telt niet als gemist.' },
      { head: 'Gewoon', text: 'bij een nieuwe spiergroep of een nieuwe beweging, en bij de stappen naar een zware topset.' },
      { head: 'Uit', text: 'elke opwarmset staat er zoals altijd.' },
    ],
  },
  'bundel-toets': {
    title: 'Voorstel naast MacroFactor',
    lead: 'Onderaan Forge staat hoe vaak een voorstel raak was: binnen het herhalingenbereik, met de herhalingen in reserve die de training vraagt.',
    points: [
      { head: 'Dezelfde toets', text: 'wat je deed en het voorstel krijgen voor dezelfde set op dezelfde dag dezelfde maat. Of de gewichten gelijk zijn zegt niets.' },
      { head: 'Een schatting', text: 'raak achteraf is een schatting uit de beste set van die dag. Pakte je in Forge het voorgestelde gewicht, dan is het gewoon wat er gebeurde.' },
      { head: 'Uit', text: 'het blok staat dan niet op Forge. De stand zie je hier, onder de schakelaar.' },
    ],
  },
  'forge-sinds': {
    title: 'Stil meten sinds',
    lead: 'De dag waarop het stille meerekenen begon. Wat daarna kwam, staat apart naast alles.',
    points: [
      { head: 'Standaard', text: '24 oktober 2026, de dag dat het MacroFactor-programma half af was.' },
      { head: 'Waarom', text: 'trainingen van voor het inlezen van je programma zijn met de huidige template en instellingen achteraf herberekend, en zeggen minder.' },
    ],
  },
  'forge-bergspieren': {
    title: 'Spieren voor de berg',
    lead: 'Bergop en bergaf met een rugzak vragen veel van je kuiten, je scheenspier en je bilspieren, en juist die slaat een gewoon krachtschema vaak over. Bij een bergdoel krijgen ze rustig aandacht.',
    points: [
      { head: 'De melding', text: 'krijgt een van die spieren de laatste vier weken gemiddeld minder dan 4 harde sets per week, dan staat dat één keer in de weekterugblik, met een voorstel voor één oefening. Een rustweek en een week met vakantie, een tocht of zonder sportschool tellen niet mee.' },
      { head: 'In Forge', text: 'hetzelfde voorstel staat ook rustig bovenaan de training waar de oefening bij zou komen, zolang je nog geen set afvinkte.' },
      { head: 'Pas na Akkoord', text: 'de oefening komt als laatste oefening in je krachttraining met het meeste beenwerk, vanaf de volgende keer. In het blad van de oefening haal je hem weer weg. Liever niet laat die spier acht weken met rust.' },
      { head: 'Bij Ruilen', text: 'is de keuze verder gelijk, dan staat een oefening voor zo’n spier voorop, met een korte reden. Forge ruilt nooit zelf.' },
      { head: 'Wat telt', text: 'werksets met hoogstens 4 herhalingen over, ook zonder RIR. Een onbekende oefening telt niet; dat staat er dan eerlijk bij.' },
      { head: 'Uit', text: 'geen melding, in de weekterugblik noch in Forge, en de gewone volgorde bij Ruilen.' },
    ],
  },
  'forge-enkel': {
    title: 'Enkel en evenwicht',
    lead: 'Bij bergwandelaars die vallen is de enkel de vaakst getroffen plek. Evenwichtstraining verlaagde in zeven studies het aantal verzwikkingen met ongeveer een derde, het duidelijkst bij wie al eens verzwikte.',
    points: [
      { head: 'De melding', text: 'deed je de laatste vier weken gemiddeld minder dan 2 sets per week met een evenwichtsoefening (lunges en split squats tellen hier niet), dan staat dat in de weekterugblik, na de spieren, met een voorstel: op één been staan in je training met het meeste beenwerk.' },
      { head: 'Zwaarder', text: 'in de uitleg van de oefening: eerst met je ogen dicht, dan op een kussen, of reiken op één been. Forge neemt je beste tijd van de vorige keer over.' },
      { head: 'Telt niet mee', text: 'een rustweek, en een week met vakantie, een tocht of zonder sportschool: dan train je niet in Forge, en zo komt er na je vakantie niet meteen een melding.' },
      { head: 'Pijn aan je enkel of voet', text: 'staat er in Lichaam een open klacht, dan geen voorstel. Een enkel na een verzwikking oefen je met een fysiotherapeut.' },
      { head: 'Uit', text: 'alleen de drie spieren. Liever niet bij de melding laat het acht weken met rust.' },
    ],
  },
};

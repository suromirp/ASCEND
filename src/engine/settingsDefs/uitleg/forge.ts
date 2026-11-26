// ASCEND: de uitleg achter de i bij de instellingen van de groep Forge, op id van de verklaring
// (docs/visie/Ontwerp instellingen op een plek.md, stap 3). Alleen geladen in Instellingen of als je op de i tikt
// (data/settingsHelpKeys.ts), zodat deze tekst niet bij de start van de app laadt. De verklaring zegt `help: true`.
// Ingekort volgens de stemgids in R10 (docs/beslissingen/2026-11-26-teksten-forge.md).

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
    lead: 'Opwarmsets komen voor je eerste zware oefening van een lichaamsdeel. Nooit bij lichte gewichten, curls, schouderheffingen, beencurls, kuiten, romp en vooral eigen gewicht.',
    points: [
      { head: 'Eerste oefening', text: 'ongeveer 50% voor 8 en 80% voor 3 tot 4 van je werkgewicht. Slim rekent uit je geschatte kracht, Schema met vaste percentages.' },
      { head: 'Daarna', text: 'op warme spieren één aanloopset van 65 tot 70% voor 4 of 5, zoals een leg press na squats. Een oefening met één gewricht krijgt dan niets.' },
      { head: 'Per oefening', text: 'dan krijgt elke samengestelde oefening de volle opbouw. De rust erna staat op 90 of 60 seconden.' },
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
    lead: 'Een blok op de Forge-pagina: schat Forge je goed in, gemeten aan je eigen trainingen van de laatste vier weken. Het verandert je plan en je logs nooit.',
    points: [
      { head: 'Voorspelling', text: 'hoeveel sets binnen één herhaling lagen van wat Forge verwachtte. Alleen als je het voorgestelde gewicht pakte en zelf invulde hoeveel je over had.' },
      { head: 'Bijgestuurd', text: 'hoe vaak je het gewicht of de afgevinkte herhalingen zelf veranderde voor je afvinkte.' },
      { head: 'Sterker', text: 'stijgt, blijft of daalt je geschatte maximum op je hoofdoefeningen over zes tot acht weken.' },
      { head: 'Te weinig sets', text: 'dan staat er "nog te weinig" in plaats van een getal.' },
    ],
  },
  'forge-weergave': {
    title: 'Forge toont',
    lead: 'Elke oefening op Forge heeft twee kanten: je geschatte 1RM en het werkgewicht. De keuze geldt voor alle kaarten, ook als je op een kaart wisselt.',
    points: [
      { head: '1RM', text: 'het getal van nu, de verandering over vier weken en een lijn door de tijd. Een 1RM uit MacroFactor staat ernaast.' },
      { head: 'Werkgewicht', text: 'wat je volgens de schatting aankunt bij de herhalingen van die oefening, met de lijn van eerder.' },
    ],
  },
  'forge-1rm-macrofactor': {
    title: 'MacroFactor-1RM erbij',
    lead: 'MacroFactor schat ook een 1RM. Die staat naast de jouwe, zonder ze te mengen.',
    points: [
      { head: 'Waar het vandaan komt', text: 'het blad "Exercises - 1-RM" van de volledige export. Lees de export opnieuw in voor nieuwe dagen.' },
      { head: 'Twee getallen', text: 'MacroFactor rekent anders, dus ze kunnen verschillen. Gebruik ze voor de richting, niet als maximum dat je moet halen.' },
      { head: 'Uit', text: 'alleen de schatting van ASCEND. Wat je inlas blijft bewaard.' },
    ],
  },
  'forge-vergelijken': {
    title: 'Vergelijken met',
    lead: 'Tik je op een oefening, dan staat je geschatte 1RM van nu naast die van een paar weken terug.',
    points: [
      { head: 'Een voorbeeld', text: 'nu 80 kg, vier weken terug 77,5 en acht weken terug 75: dan staat er +2,5 en +5. Je beste ooit staat ernaast.' },
      { head: '4 en 8 weken', text: 'het advies. Kies 2 en 4 als je vaak traint, of 12 en 26 voor het lange werk.' },
      { head: 'Geen oordeel', text: 'gelijk of lager is geen mislukking. Een hogere 1RM is niet het enige doel.' },
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
    lead: 'Een klein lijntje naast elke oefening toont hoe de laatste trainingen gingen.',
    points: [
      { head: 'Het lijntje', text: 'de laatste tien trainingen, met hetzelfde getal als rechts in de rij. Het puntje is je laatste training.' },
      { head: 'Openklappen', text: 'klap je een oefening open, dan staat de hele grafiek erboven.' },
      { head: 'Uit', text: 'alleen de getallen. De grafiek staat nog in de geschiedenis.' },
    ],
  },
  'forge-plaatjes': {
    title: 'Plaatjes bij oefeningen',
    lead: 'Naast een oefening in Forge staat een kaartje met de spieren die werken. Een tik toont de beweging, de spieren en waar je op let.',
    points: [
      { head: 'Spierkaart en tekening', text: 'het advies. Tekeningen van Workout Guide, door Everkinetic en Bryl Lim (CC BY-SA 4.0). Die van de calisthenicsladders maakte ASCEND, onder dezelfde licentie. Ze laden als je een oefening opent. Zonder netwerk zie je alleen het spierkaartje.' },
      { head: 'Alleen spierkaart', text: 'zonder tekening, er wordt niets geladen.' },
      { head: 'Uit', text: 'geen kaartje. Het menu van een oefening houdt de uitleg.' },
    ],
  },
  'forge-uitleg-open': {
    title: 'Uitleg standaard uitgeklapt',
    lead: 'In het blad van een oefening staat eerst In het kort, drie regels. Hier kies je of Lees verder al open staat.',
    points: [
      { head: 'Uit', text: 'het advies. Tik op Lees verder als je meer wilt weten.' },
      { head: 'Aan', text: 'de beginstand, de beweging, het tempo en de veelgemaakte fouten staan open. Dichtklappen kan nog.' },
      { head: 'Niet elke oefening', text: 'heeft al een uitleg. Dan zie je de oude drie regels.' },
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
      { head: 'Wanneer', text: 'herhalingen plus RIR blijven onder de onderkant van het bereik plus de gevraagde RIR. Zonder eigen RIR beslissen de herhalingen.' },
      { head: 'Zo rekent het', text: 'uit die set je kracht van vandaag, iets minder per volgende set. Forge kiest het zwaarste gewicht waarmee je de onderkant nog haalt. Past er niets, dan geen voorstel.' },
      { head: 'Jij beslist', text: 'Lichter zet het gewicht in de open sets die je niet zelf aanpaste. Liever niet laat alles staan.' },
    ],
  },
  'forge-spotter': {
    title: 'Zonder spotter',
    lead: 'Een stang op je borst of je schouders kan je klem zetten als je tot het uiterste gaat. Daarom schrijft Forge hier minstens 1 herhaling in reserve voor.',
    points: [
      { head: 'Welke oefeningen', text: 'bankdrukken en schuin bankdrukken met een stang, en squatten met de stang op je rug of voor je. Toestellen, kabels en dumbbells niet.' },
      { head: 'Nooit een slot', text: 'een klein teken bij de eerste set legt het uit. Ging het tot 0, vul dan 0 in: dat wordt bewaard zoals je het deed. Een bewuste 1 waar MacroFactor 0 voorschreef, telt niet als misser.' },
      { head: 'Veiligheidsarmen', text: 'heeft je sportschool die of een rek met vangers, zet dat aan bij Je sportschool. Dan mag het 0 zijn.' },
    ],
  },
  'bundel-sportschool': {
    title: 'Sportschool',
    lead: 'Train je in twee sportscholen, kies dan hier waar je nu bent.',
    points: [
      { head: 'Wat erbij hoort', text: 'de stangen, schijven en dumbbells, de gewichten per toestel en wat bekend is over de gewichten die je gebruikte.' },
      { head: 'Je log', text: 'een nieuwe krachttraining onthoudt zijn sportschool. Oudere trainingen hebben dat niet en tellen overal mee.' },
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
      { head: 'Vanzelf herkennen', text: 'staat er in het logboek van een oefening een gewicht boven je zwaarste dumbbell, dan telt die oefening als totaal. Log je ook bij lichtere oefeningen het totaal, kies dan Totaal van twee.' },
      { head: 'Totaal', text: 'de gewichten zijn sommen van twee gelijke dumbbells uit je rek, zoals "60 kg (2 x 30)".' },
      { head: 'Eén dumbbell', text: 'een oefening met één dumbbell, zoals de goblet squat, wordt nooit verdubbeld.' },
    ],
  },
  toestelgewichten: {
    title: 'Standen per toestel',
    lead: 'Een stand is een gewicht dat een kabel of toestel in jouw sportschool heeft. Forge onthoudt ze zelf. Hier pas je ze aan.',
    points: [
      { head: 'Weghalen', text: 'tik op een stand om hem door te strepen, zoals een typefout. Nog een tik zet hem terug.' },
      { head: 'Veel tegelijk', text: 'vaste stappen vul je in één keer in, als lijst of bereik: 4,5 tot 113 per 7.' },
      { head: 'Alleen deze standen', text: 'dan stelt Forge nooit een gewicht voor dat je niet zelf intikte, anders schat het ook ertussen en erboven. Standen horen bij een sportschool. Wissen laat je logboek staan.' },
    ],
  },
  'standen-onthouden': {
    title: 'Standen onthouden',
    lead: 'Forge onthoudt de gewichten die je op een kabel of toestel met blok afvinkt. Minder en Meer springen dan van stand naar stand.',
    points: [
      { head: 'Zonder vraag', text: 'na het afvinken staat er een regel met Terugdraaien. Die haalt alleen de stand weg, niet je set.' },
      { head: 'Eerste keer', text: 'bij een nieuw toestel neemt Forge de gewichten over uit je eerdere trainingen in deze sportschool. Een oude typefout streep je weg bij Standen per toestel.' },
      { head: 'Uit', text: 'er komen geen standen bij. Wat er staat blijft werken, anders gaan Minder en Meer met de stap van je sportschool.' },
    ],
  },
  tussengewichten: {
    title: 'Tussengewichten',
    lead: 'Een los plaatje of magneet bij het blok van een toestel vul je één keer in. Het telt op bij elk gewicht van het blok.',
    points: [
      { head: 'Voorbeeld', text: 'een blok per 5 kg met 2,3 kg los geeft 65, 67,3, 70 en verder. Forge toont het als 70 + 2,3.' },
      { head: 'Waar het geldt', text: 'alle toestellen met een gewichtstapel in deze sportschool. Per toestel kies je een eigen tussengewicht of geen.' },
      { head: 'Meer dan één', text: 'hoogstens drie, zoals 1,25 en 2,5. Ze tellen alleen of samen, elk één keer.' },
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
    lead: 'Het advies is Tonen, niet inkorten: de hele training staat er, met bij elke oefening kern, bijwerk of extra.',
    points: [
      { head: 'Tonen', text: 'na 60 minuten (beendag 75) met de kern af, zegt een regel onder de klok dat de rest bijwerk of extra is. Stoppen kan, pauzes tellen niet. Afronden met open bijwerk telt als gedaan.' },
      { head: 'Een grens', text: 'bij 45 tot 90 minuten rekent Forge met je eigen tijd per set. Eerst gaan sets extra en bijwerk weg, tot twee per oefening, dan hele oefeningen. De kern blijft, en bij de oefening staat wat wegviel.' },
      { head: 'Alleen vandaag', text: 'je planning en je logboek blijven zoals ze zijn.' },
    ],
  },
  'bundel-rekenmodel': {
    title: 'Rekenmodel',
    lead: 'Zeven keuzes over hoe Forge rekent. Het advies past bij de meeste mensen, je hoeft hier niets te doen.',
    points: [
      { head: 'Staat er Advies', text: 'dan staat alles op het advies. Anders staat er hoeveel keuzes anders staan. Terugzetten kan per keuze, of met Terug naar het advies bovenaan Instellingen.' },
      { head: 'Alleen voorstellen', text: 'het model verandert nooit stil je planning of je trainingen. Het stelt gewichten voor, jij beslist.' },
    ],
  },
  'forge-rekent-mee': {
    title: 'Forge rekent mee',
    lead: 'Forge rekent tijdens je training mee, met de regel van het voorschrift. Wat je zelf typt of al deed, verandert nooit.',
    points: [
      { head: 'Een ander gewicht', text: 'typ je een gewicht, dan zet Forge bij Herh. wat je daarbij waarschijnlijk haalt.' },
      { head: 'Na een set', text: 'ging het anders dan gevraagd, dan past Forge de volgende open set aan, zo nodig ook het gewicht. Na een topset met bekende RIR volgen de terugsets je kracht van die dag.' },
      { head: 'De volgende keer', text: 'haalde je de bovenkant met de gevraagde RIR, dan staat een stap zwaarder klaar. Zonder eigen RIR pas bij 3 of meer boven de bovenkant (10 bij 7+). Terugzetten kan met één tik.' },
      { head: 'Uit', text: 'de vakken blijven zoals voorgesteld en het gewicht volgt alleen je geschatte kracht.' },
    ],
  },
  'forge-afvinken-doel': {
    title: 'Afvinken telt als het doel',
    lead: 'Vink je een set af zonder te kiezen, dan telt het doel als wat je over had, behalve bij twijfel.',
    points: [
      { head: 'Wanneer het telt', text: 'je deed minstens de gevraagde herhalingen met minstens het gewicht van het voorschrift, en de set erna viel niet 2 of meer tekort. Dat houdt je kracht vast, meer herhalingen tellen half. Een stap zwaarder pas als al je werksets de bovenkant halen, of je topset twee keer op rij. Oudere trainingen tellen met de onderkant van het bereik.' },
      { head: 'Bij twijfel', text: 'vraagt Forge hoeveel je over had: onder het doel, 2 of meer boven het bereik, de eerste set op een zwaarder gewicht en je eerste drie trainingen van een oefening.' },
      { head: 'Uit', text: 'een set zonder eigen RIR telt zoals voorheen. Je log verandert nooit.' },
    ],
  },
  'forge-vermoeidheid': {
    title: 'Vermoeidheid per set',
    lead: 'Elke werkset kost de volgende een beetje kracht. Hoeveel verschilt per oefening.',
    points: [
      { head: 'Leren per oefening', text: 'je eigen sets laten zien hoeveel geschatte kracht je per set verliest. Daarmee rekent Forge de latere sets, de verwachte herhalingen en het bijsturen. Met weinig sets blijft het dicht bij 3%.' },
      { head: 'Vast 3%', text: 'elke oefening krijgt dezelfde daling, wat je ook deed.' },
      { head: 'Waarom', text: 'hoeveel herhalingen je per set verliest hangt af van de oefening, het gewicht en de rust (matig bewijs).' },
    ],
  },
  'forge-tussen-oefeningen': {
    title: 'Vermoeidheid tussen oefeningen',
    lead: 'Staan er meer harde sets voor dezelfde spieren voor een oefening dan normaal, dan begint de eerste set iets lichter.',
    points: [
      { head: 'Wat telt', text: 'werksets met 3 of minder over. Een gedeelde hoofdspier telt een hele set, een hulpspier een halve.' },
      { head: 'Hoeveel', text: 'ongeveer 2% kracht per harde set meer dan normaal, nooit meer dan 10%. Eerst in herhalingen, anders een stap lichter. Met Vermoeidheid per set op Geleerd leert Forge het per oefening, vanaf zes keer.' },
      { head: 'Uit', text: 'alleen de vermoeidheid binnen een oefening telt. Je log verandert nooit.' },
    ],
  },
  'forge-pauze': {
    title: 'Na een pauze lichter beginnen',
    lead: 'Na meer dan vier weken zonder krachttraining rekent het voorstel met 5% minder kracht. Na die training kijkt het opnieuw.',
    points: [
      { head: 'Waarom', text: 'tot ongeveer vier weken verlies je weinig kracht, daarna meer (matig bewijs).' },
      { head: 'Alleen een echte pauze', text: 'rustte alleen deze oefening terwijl je wel krachttraining deed, dan begint hij op je laatste niveau.' },
      { head: 'Uit', text: 'ook na een lange pauze begint het voorstel op je laatste niveau.' },
    ],
  },
  'forge-leren': {
    title: 'Gewichten van toestellen',
    lead: 'Bij een toestel of kabel met een gewichtstapel kies je hoe streng de voorgestelde gewichten zijn.',
    points: [
      { head: 'Geleerd en geschat', text: 'Forge onthoudt wat je op het toestel pakte en vult aan met de stap die je er zag, of die van je sportschool. Er kan dus een gewicht tussen zitten dat het toestel niet heeft.' },
      { head: 'Alleen wat je gebruikte', text: 'nooit een gewicht dat je er nog niet pakte. Kan het zwaarder, dan gaan de herhalingen omhoog en kies je zelf het volgende gewicht. Zonder gebruikte gewichten gelden de stappen van je profiel.' },
      { head: 'Stappen van je profiel', text: 'de stap van Kabels en toestellen. Een eigen lijst per toestel gaat altijd voor.' },
    ],
  },
  'bundel-invullen': {
    title: 'Bij het invullen',
    lead: 'Drie keuzes over wat het workoutscherm voor je doet terwijl je sets invult.',
    points: [
      { head: 'Alleen met sets in ASCEND', text: 'houd je je sets in MacroFactor bij, dan is het workoutscherm om mee te kijken en doen deze keuzes niets. Ze verdwijnen dan uit beeld.' },
      { head: 'Terugzetten', text: 'kan per keuze, of met Terug naar het advies bovenaan Instellingen.' },
    ],
  },
  'forge-oefeningen': {
    title: 'Oefeningen in een training',
    lead: 'Een oefening per scherm: je veegt opzij naar de volgende, zoals in MacroFactor. Bovenaan staat een strook met een kaartje per oefening.',
    points: [
      { head: 'Een per scherm', text: 'het advies. Een tik op een kaartje springt naar die oefening. Een afgeronde heeft een vinkje.' },
      { head: 'Een set verwijderen', text: 'veeg op het nummer of het voorschrift van de set naar links. Elders op het scherm wisselt vegen van oefening.' },
      { head: 'Onder elkaar', text: 'alle oefeningen op een pagina. Dit kan ook in het menu van de training.' },
    ],
  },
  'forge-verloop': {
    title: 'Verloop toont',
    lead: 'Het blad Verloop van de training zet per set een regel: gewicht, herhalingen en RIR zoals de set uiteindelijk is, met de redenen in één zin.',
    points: [
      { head: 'Alleen wijzigingen', text: 'het advies. Alleen de sets die jij of Forge veranderde, of die onder het bereik bleven.' },
      { head: 'Alle sets', text: 'ook de sets volgens schema, met de zwaarste set per oefening. Een gedempt bolletje is een RIR die je niet zelf koos.' },
      { head: 'In het blad', text: 'wisselen kan ook in het blad zelf. Die keuze blijft staan.' },
    ],
  },
  'forge-onderbreking': {
    title: 'Lange onderbreking vragen na',
    lead: 'Kom je na een lange stilte terug in een open training, dan vraagt Forge één keer of die tijd meetelt.',
    points: [
      { head: 'Nee, als pauze', text: 'het advies. De tijd sinds je laatste handeling wordt een pauze, zodat de duur eerlijk blijft.' },
      { head: 'Ja, telt mee', text: 'de klok loopt door alsof je er was, zoals bij een lange rust tussen twee blokken.' },
      { head: 'Uit', text: 'Forge vraagt niets en telt alles mee. Pauzeren kan altijd zelf in het menu van de training.' },
    ],
  },
  'forge-concept': {
    title: 'Training bewaren als concept na',
    lead: 'Een training die je vergat af te ronden, loopt niet dagen door. Na middernacht of na deze grens zonder handeling staat hij als concept klaar. Er gaat niets weg en je planning verandert niet.',
    points: [
      { head: 'Afronden', text: 'met je sets en de tijd tot je laatste handeling. Minder dan de helft heet een korte training.' },
      { head: 'Verder of Verwijderen', text: 'Verder maakt van de stille tijd een pauze. Verwijderen pas na een bevestiging, en je logboek verandert niet.' },
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
      { head: 'Als hint', text: 'het veld is leeg en het doel staat gedimd. Vul je niets in, dan wordt het doel bewaard met een merkje dat je het niet zelf invulde.' },
      { head: 'Met het doel', text: 'het doel staat er al als waarde, zoals voorheen. Raak je de set niet aan, dan krijgt hij hetzelfde merkje.' },
      { head: 'Waarom', text: 'een aangenomen RIR telt als zwakke aanname, zodat zichtbaar blijft welke sets gemeten zijn. De rekenregels veranderen niet.' },
    ],
  },
  'forge-rir-snel': {
    title: 'Hoeveel over na een set',
    lead: 'Afvinken geeft het doel als RIR. Alleen als het anders ging, vraagt Forge in de rij hoeveel je over had: 0, 1, 2 of 3+.',
    points: [
      { head: 'Als het anders ging', text: 'het advies: na 0 of 1 over of tot falen, minder herhalingen dan gevraagd, ruim boven het bereik, de eerste set op een zwaarder gewicht en je eerste drie trainingen van een oefening. Met Afvinken telt als het doel uit ook bij de eerste set op de bovenkant.' },
      { head: 'Vaker vragen', text: 'ook na je eerste en je laatste werkset als alles volgens schema ging.' },
      { head: 'Waarom', text: 'van een RIR die je zelf kiest leert Forge hoe snel je moe wordt, en die telt voor de stap zwaarder en klaar voor je doel. Kies je niets, dan telt het doel alleen mee in je geschatte kracht.' },
    ],
  },
  'forge-stappen': {
    title: 'Stappen bij calisthenics',
    lead: 'Forge toont bij een oefening op een ladder de stap, de toets en een tik naar een lichtere of zwaardere stap.',
    points: [
      { head: 'De toets', text: 'drie sets op de bovenkant met nette vorm, zoals 3 keer 8. Haal je dat, dan kan de volgende stap.' },
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
    lead: 'Haal je de toets van een ladderstap, dan stelt Forge de volgende stap voor. Haal je drie trainingen op rij de onderkant niet, dan de lichtere.',
    points: [
      { head: 'Akkoord', text: 'vanaf je volgende training staat de nieuwe stap erin. Sets en herhalingen blijven. Ongedaan maken kan op de kaart of in het blad van de oefening.' },
      { head: 'Liever niet', text: 'je plan blijft en dit voorstel komt niet terug. Een voorstel voor een andere stap wel.' },
      { head: 'Calisthenics algemeen', text: 'staat de squat op één been of de L-sit in geen training, dan stelt Ascend voor om je stap in een krachttraining te zetten.' },
    ],
  },
  'forge-ijkset': {
    title: 'IJkset',
    lead: 'Je schatting van wat je over hebt klopt alleen als je hem af en toe toetst. Eens per vier weken zet Forge daarom bij één hoofdoefening een set erbij, zo ver als netjes gaat.',
    points: [
      { head: 'Vragen', text: 'het advies: een kaart met Niet nu en Akkoord. Pas na Akkoord komt de set erbij. Na Niet nu vraagt Forge het de volgende keer.' },
      { head: 'Automatisch erbij', text: 'de set staat al in je training. Haal hem weg zoals elke set. De vier weken tellen pas als je afrondt met die set afgevinkt.' },
      { head: 'Wanneer niet', text: 'als je ziek bent of opbouwt, op een dag zonder sportschool, op vakantie of een tocht, in een week met een tocht, test of wedstrijd, in een rustige week, met krachttraining uit en als Forge de training lichter maakt.' },
    ],
  },
  'forge-soort': {
    title: 'Calisthenics per training',
    lead: 'Per krachttraining kies je kracht met gewicht, calisthenics met je eigen gewicht, of samen.',
    points: [
      { head: 'Calisthenics', text: 'duwen, optrekken en schouderdrukken gaan op hun ladder, elke ladder één keer. De rest en je benen blijven met gewicht.' },
      { head: 'Samen', text: 'van de plekken die een ladder kunnen worden blijft de eerste helft met gewicht, de rest gaat op een ladder.' },
      { head: 'Akkoord', text: 'eerst een voorstel, pas na Akkoord verandert er iets. Je ziet het als je de training weer opent. Je planning en je dagen blijven.' },
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
      { head: 'Aan', text: 'de set blijft staan, gedempt, met één zin waarom. Afvinken telt als opwarmset, laten liggen telt niet als gemist.' },
      { head: 'Gewoon', text: 'bij een nieuwe spiergroep of een nieuwe beweging, en bij de stappen naar een zware topset.' },
      { head: 'Uit', text: 'elke opwarmset staat er zoals altijd.' },
    ],
  },
  'bundel-toets': {
    title: 'Voorstel naast MacroFactor',
    lead: 'Onderaan Forge staat hoe vaak een voorstel raak was: binnen het herhalingenbereik, met de herhalingen in reserve die de training vraagt.',
    points: [
      { head: 'Dezelfde toets', text: 'wat je deed en het voorstel krijgen dezelfde maat. Gelijke gewichten zeggen niets.' },
      { head: 'Een schatting', text: 'raak achteraf is een schatting uit je beste set van die dag. Pakte je in Forge het voorgestelde gewicht, dan is het wat er gebeurde.' },
      { head: 'Uit', text: 'het blok staat niet op Forge. De stand zie je hier, onder de schakelaar.' },
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
    lead: 'Bergop en bergaf met een rugzak vragen veel van je kuiten, scheenspier en bilspieren, en een gewoon krachtschema slaat die vaak over.',
    points: [
      { head: 'De melding', text: 'minder dan 4 harde sets per week over de laatste vier weken staat één keer in de weekterugblik, en rustig bovenaan de training tot je een set afvinkt. Rustweken en weken met vakantie, een tocht of zonder sportschool tellen niet.' },
      { head: 'Pas na Akkoord', text: 'komt één oefening als laatste in je training met het meeste beenwerk, vanaf de volgende keer. Weghalen kan in het blad van de oefening. Liever niet laat die spier acht weken met rust.' },
      { head: 'Wat telt', text: 'werksets met hoogstens 4 over, ook zonder RIR. Bij Ruilen staat zo’n oefening bij gelijke keuze voorop. Forge ruilt nooit zelf.' },
      { head: 'Uit', text: 'geen melding en de gewone volgorde bij Ruilen.' },
    ],
  },
  'forge-enkel': {
    title: 'Enkel en evenwicht',
    lead: 'Bij bergwandelaars die vallen is de enkel de vaakst getroffen plek. Evenwichtstraining verlaagde in zeven studies het aantal verzwikkingen met ongeveer een derde, het duidelijkst bij wie al eens verzwikte.',
    points: [
      { head: 'De melding', text: 'minder dan 2 sets evenwicht per week over de laatste vier weken (lunges en split squats tellen niet) staat in de weekterugblik, na de spieren, met als voorstel op één been staan in je training met het meeste beenwerk. Rustweken en weken met vakantie, een tocht of zonder sportschool tellen niet.' },
      { head: 'Zwaarder', text: 'staat in de uitleg van de oefening: ogen dicht, op een kussen of reiken op één been.' },
      { head: 'Pijn aan je enkel of voet', text: 'staat er in Lichaam een open klacht, dan geen voorstel. Een enkel na een verzwikking oefen je met een fysiotherapeut.' },
      { head: 'Uit', text: 'alleen de drie spieren. Liever niet laat het acht weken met rust.' },
    ],
  },
};

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
  figuur: {
    title: 'Figuur',
    lead: 'Op het scherm Lichaam tik je op een spier of gewricht. Hier kies je of dat figuur een man of een vrouw is.',
    points: [
      { head: 'Automatisch', text: 'ASCEND neemt het over van een koppeling als die het weet. Nu weet geen enkele koppeling het, dus je ziet dan een man.' },
      { head: 'Man of vrouw', text: 'het silhouet verschilt een beetje in schouders, heupen en borst. De plekken en de oefeningen blijven hetzelfde.' },
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
  beweging: {
    title: 'Beweging',
    lead: 'Hoeveel de app beweegt: een zachte indruk bij een tik, ringen die vollopen, getallen die optellen.',
    points: [
      { head: 'Normaal', text: 'alles, kort en rustig. De missiekaart ademt zacht en nieuwe voorstellen knipperen een of twee keer.' },
      { head: 'Rustig', text: 'alleen feedback op je tik en overgangen van bladen. Geen adem, puls of optellen.' },
      { head: 'Uit', text: 'alles staat meteen op zijn plek. Heeft je telefoon beperkte beweging aan, dan geldt dit altijd.' },
    ],
  },
  wijzigingen: {
    title: 'Wijzigingen',
    lead: 'Na een training, een gemiste sessie of een nieuwe instelling kan je planning schuiven.',
    points: [
      { head: 'Vraag eerst', text: 'je ziet alles vooraf en geeft akkoord. Alleen de weekcontrole zet wat ASCEND zelf plande meteen recht (rustdag vrij, ruimte tussen zware dagen), met de melding Planning bijgewerkt en ongedaan maken.' },
      { head: 'Deels zelf', text: 'weken verder weg past ASCEND zelf aan, met een melding. Deze en volgende week, of iets schrappen, vraagt altijd eerst.' },
      { head: 'Alles zelf', text: 'alles meteen, met een melding en ongedaan maken.' },
    ],
  },
  ambitie: {
    title: 'Ambitie',
    lead: 'Hoe snel je lopen en tochten in minuten opbouwen.',
    points: [
      { head: 'Altijd', text: 'een training wordt nooit meer dan 10% langer dan je langste van de afgelopen maand.' },
      { head: 'Waarom', text: 'pezen en botten wennen langzamer dan je conditie.' },
      { head: 'Stevig', text: 'valt vanzelf terug op Standaard bij pijn of trainingen die te zwaar voelen.' },
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
  forgeDoorgeven: {
    title: 'Gewicht doorgeven',
    lead: 'Pas je bij een set het gewicht aan, dan schuiven de sets erna mee.',
    points: [
      { head: 'Alleen sets die je niet aanraakte', text: 'een set die je zelf aanpaste of afvinkte blijft zoals hij is.' },
      { head: 'Zelfde verschil', text: 'ga je 2,5 kg omhoog, dan gaan de volgende sets ook 2,5 kg omhoog.' },
      { head: 'Lege sets', text: 'een set zonder gewicht krijgt het nieuwe gewicht.' },
      { head: 'Herhalingen', text: 'blijven per set zoals ze waren.' },
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
      { head: 'Twee getallen', text: 'ze kunnen verschillen: MacroFactor en ASCEND rekenen niet hetzelfde. Gebruik ze om de richting te zien, niet als maximum dat je moet halen.' },
      { head: 'Uit', text: 'dan staat er alleen de schatting van ASCEND. Wat je ingelezen hebt blijft bewaard.' },
    ],
  },
  forgeVergelijken: {
    title: 'Vergelijken met',
    lead: 'Forge zet het getal van nu naast het getal van eerder, zodat je het verschil ziet.',
    points: [
      { head: '4 en 8 weken', text: 'het advies: een maand en twee maanden terug. Daarnaast staat altijd het beste ooit.' },
      { head: 'Andere momenten', text: 'kies 2 en 4 weken als je vaak traint, of 12 en 26 weken voor het lange werk.' },
      { head: 'Geen oordeel', text: 'het verschil is een kleine regel. Gelijk of lager is geen mislukking, een hogere 1RM is niet het enige doel.' },
    ],
  },
  forgeLeren: {
    title: 'Gewichten van toestellen leren',
    lead: 'Bij een toestel of kabel met een gewichtstapel stelt ASCEND alleen gewichten voor die er echt zijn.',
    points: [
      { head: 'Zo leert het', text: 'het onthoudt de gewichten die je op dat toestel pakte, ook bij opwarmen, en rondt af op het dichtstbijzijnde.' },
      { head: 'Buiten je bereik', text: 'boven en onder wat je gebruikte telt de stap die je op het toestel twee keer zag, anders de stap uit je sportschool. Een grote kloof ertussen wordt opgevuld.' },
      { head: 'Uit', text: 'dan rondt ASCEND af op de stap die je bij Kabels en toestellen instelde.' },
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
  drempel: {
    title: 'Drempel',
    lead: 'De hartslag die je ongeveer een uur vol kunt houden. Garmin noemt hem lactaatdrempel (LTHR).',
    points: [
      { head: 'Waar', text: 'in Garmin Connect, bij je hartslagzones.' },
      { head: 'Zonder', text: 'rekent ASCEND met je maximale hartslag. Dat is minder precies.' },
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
      { head: 'Terug', text: 'je eigen cijfers zijn bewaard en kun je terugzetten.' },
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
      { head: 'Toestemming', text: 'zonder toestemming van je toestel gebeurt er niets.' },
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
  rustNaTocht: {
    title: 'Rust na een bergtocht',
    lead: 'Hoe snel een zware beendag mag volgen op een bergtocht.',
    points: [
      { head: 'Soepel', text: 'een korte beendag mag al 48 uur na je tocht.' },
      { head: 'Streng', text: 'ASCEND houdt altijd 72 uur.' },
      { head: 'Geldt voor', text: 'nieuwe en gewijzigde tochten. Een tocht die al staat, houdt zijn planning tot je hem wijzigt.' },
    ],
  },
};

export type SettingsHelpKey = keyof typeof SETTINGS_HELP;

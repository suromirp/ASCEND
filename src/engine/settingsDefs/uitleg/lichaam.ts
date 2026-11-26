// ASCEND: de uitleg achter de i bij de instellingen van de groep Lichaam, op id van de verklaring
// (docs/visie/Ontwerp instellingen op een plek.md, stap 3). Alleen geladen in Instellingen of als je op de i tikt
// (data/settingsHelpKeys.ts), zodat deze tekst niet bij de start van de app laadt. De verklaring zegt `help: true`.

import type { SettingsHelp } from '../../../data/settingsHelp';

export const LICHAAM_UITLEG: Record<string, SettingsHelp> = {
  lichaamsgewicht: {
    title: 'Lichaamsgewicht',
    lead: 'Je gewicht, voor je rugzak, je zweetverlies, de beenindex, eiwit per kilo en oefeningen met je eigen gewicht. Je nieuwste weging telt.',
    points: [
      { head: 'Uit MacroFactor', text: 'het trendgewicht uit de export als dat er is, anders de weging zelf.' },
      { head: 'Uit Health Connect', text: 'in de Android-app je eerste weging van de dag.' },
      { head: 'Op dezelfde dag', text: 'wat je zelf invult of uit MacroFactor inleest gaat voor de weging uit Health Connect.' },
    ],
  },
  'health-connect-gewicht': {
    title: 'Gewicht uit Health Connect',
    lead: 'In de Android-app komen je wegingen uit Health Connect, met je vetpercentage als je weegschaal dat meet. Het advies is aan.',
    points: [
      { head: 'Welke weging', text: 'de eerste van de dag. Een getal onder 30 of boven 250 kg telt niet mee.' },
      { head: 'Voorrang', text: 'wat je zelf invult of uit MacroFactor inleest gaat op die dag voor.' },
      { head: 'Uit', text: 'Je gewicht komt niet meer binnen en telt niet mee. Wat er al stond blijft bewaard en gaat mee in je back-up.' },
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
  'gewicht-eigen': {
    title: 'Gewicht bij eigen gewicht',
    lead: 'Bij een push-up, optrekken of dip telt een deel van je lichaamsgewicht als last. Het advies is Trend.',
    points: [
      { head: 'Trend', text: 'het gemiddelde van je wegingen van de laatste twee weken. Eén weging schommelt een kilo met water en eten.' },
      { head: 'Laatste weging', text: 'het getal van je laatste weging.' },
      { head: 'Te weinig wegingen', text: 'onder de drie in twee weken, of met een trendgewicht uit MacroFactor, telt je laatste weging.' },
    ],
  },
  'gewicht-kaart': {
    title: 'Gewicht op Je stand',
    lead: 'Je gewicht staat ook op Je stand en in het Logboek. Het advies is aan.',
    points: [
      { head: 'Kaart', text: 'je trend of je laatste weging groot, met een lijn van de laatste weken. Een tik opent het overzicht Gewicht.' },
      { head: 'Logboek', text: 'elke weging is een eigen regel tussen je trainingen, met datum, kilo en bron.' },
      { head: 'Uit', text: 'de kaart en de regels verdwijnen. Je wegingen blijven bewaard.' },
    ],
  },
  vetpercentage: {
    title: 'Vetpercentage',
    lead: 'Een weegschaal schat je vet met een zwak stroompje door je lichaam. Kijk naar de trend, niet naar één dag.',
    points: [
      { head: 'Eerlijk', text: 'de meting schommelt met vocht, eten en het tijdstip. Het getal kan een paar procentpunten naast de werkelijkheid zitten.' },
      { head: 'Wel bruikbaar', text: 'de richting over weken, als je steeds hetzelfde weegt, bijvoorbeeld nuchter in de ochtend. Het gemiddelde van je laatste 7 metingen staat naast dat van 4 weken eerder.' },
      { head: 'Vetvrije massa', text: 'je gewicht min het vet. Voor kracht en je doel zegt die meer dan het percentage.' },
    ],
  },
  hartslag: {
    title: 'Drempel',
    lead: 'De hartslag die je ongeveer een uur vol kunt houden. Garmin noemt hem lactaatdrempel (LTHR).',
    points: [
      { head: 'Zelf', text: 'na een testloop van 5 km stelt ASCEND een nieuwe drempel voor. Loop hem met een borstband: hartslag van de pols is bij hard lopen te onzeker. Pas na Akkoord geldt hij.' },
      { head: 'Of uit Garmin', text: 'in Garmin Connect, bij je hartslagzones.' },
      { head: 'Zonder', text: 'geldt je maximale hartslag. Dat is minder precies.' },
    ],
  },
  blessures: {
    title: 'Blessures',
    lead: 'Waar je last van hebt, en wat je kunt rekken of versterken.',
    points: [
      { head: 'Je planning', text: 'verandert er niet door. Bij een klacht aan been of voet zie je een hint bij zware beentrainingen.' },
    ],
  },
  figuur: {
    title: 'Figuur',
    lead: 'Het figuur op Lichaam is een man of een vrouw.',
    points: [
      { head: 'Automatisch', text: 'Overgenomen van een koppeling. Nu weet geen koppeling het, dus je ziet een man.' },
      { head: 'Man of vrouw', text: 'het silhouet verschilt in schouders, heupen en borst. De plekken en de oefeningen blijven hetzelfde.' },
    ],
  },
  'bundel-wat': {
    title: 'Wat speelde er',
    lead: 'Je eigen aantekeningen bij een training of een dag, en wat ermee gebeurt.',
    points: [
      { head: 'Alleen op je telefoon', text: 'wat je vastlegt blijft hier.' },
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
    lead: 'In het blad van een training of een dag staat wat al bekend is, met de bron erbij.',
    points: [
      { head: 'Wat al bekend is', text: 'warmte uit het weer, een zware beendag uit je logboek, een korte nacht van je horloge en een ziekmelding. Dat telt altijd mee in "Wat doet dit met je?", ook als dit uit staat.' },
      { head: 'Je patroon', text: '"lijkt op" staat er pas als een reden minstens 4 keer is vastgelegd, je gewone lopen ook, en de banden elkaar niet raken.' },
      { head: 'Alcohol en wiet', text: 'komt nooit uit zichzelf ter sprake.' },
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
    lead: 'Na een avond die je zelf zwaar noteerde, kan een voorstel komen om een testloop te verschuiven.',
    points: [
      { head: 'Wanneer', text: 'een testloop vandaag na 3 of meer glazen de avond ervoor, of morgen na 6 of meer. Bij wiet alleen op dezelfde dag.' },
      { head: 'Altijd een voorstel', text: 'eerst een voorstel, pas na Akkoord verandert er iets. Gewone trainingen schuiven nooit om een reden.' },
    ],
  },
  'wat-namen': {
    title: 'Voorbeelden bij naam noemen',
    lead: 'De uitleg van Wat speelde er kan alcohol en wiet bij naam noemen, als geheugensteun.',
    points: [
      { head: 'Aan', text: 'de uitleg noemt alcohol en wiet bij naam.' },
      { head: 'Uit', text: 'neutrale woorden, zoals "wat je dronk of gebruikte". De keuzes voor je eigen notitie blijven staan.' },
      { head: 'Altijd', text: 'Alcohol of wiet staat nooit vanzelf als reden in een lijst, een melding of een tekst voor Strava.' },
    ],
  },
  'vroeg-ziek': {
    title: 'Vroeg ziek zien',
    lead: 'Als je ziek wordt, kan je rusthartslag stijgen en je HRV dalen voor je iets merkt. Daar kijkt Vroeg ziek zien naar.',
    points: [
      { head: 'Wanneer', text: 'twee ochtenden op rij je rusthartslag minstens 6 slagen hoger en je HRV onder je gewone bereik van de laatste vier weken. Na een gewone nacht kan één ochtend genoeg zijn (Eén duidelijke ochtend). Een nacht zonder je horloge telt niet mee en breekt de reeks niet.' },
      { head: 'Wat je ziet', text: 'een vraag op Vandaag: Voel me goed, Word ziek of Niet nu. Word ziek opent de gewone ziekmelding. Je planning verandert pas na Akkoord.' },
      { head: 'Hoe zeker', text: 'het bewijs is zwak tot matig. Alcohol, een warme kamer of stress geven hetzelfde beeld. Legde je bij Wat speelde er iets vast, dan komt er geen vraag. De HRV van een nacht die je Niet goed gemeten noemde telt niet mee. Die ochtend wordt overgeslagen als je rusthartslag wel hoger ligt.' },
      { head: 'Geen diagnose', text: 'bij hoge koorts, pijn op de borst of als je je echt slecht voelt: neem contact op met je huisarts.' },
    ],
  },
  'vroeg-ziek-een': {
    title: 'Eén duidelijke ochtend',
    lead: 'Een korte nacht verklaart een hoge rusthartslag en een lage HRV vaak al. Na een gewone nacht zegt dezelfde ochtend meer.',
    points: [
      { head: 'Aan', text: 'je rusthartslag minstens 6 slagen hoger en je HRV onder je gewone bereik, na een nacht van minstens 6 uur: dan komt de vraag al na één ochtend.' },
      { head: 'Uit', text: 'de vraag komt pas na twee ochtenden op rij.' },
      { head: 'Altijd', text: 'een nacht zonder je horloge telt niet en breekt geen reeks. Een nacht die je Niet goed gemeten noemde telt hier niet als gewone nacht.' },
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
  'weekdag-patroon': {
    title: 'Patronen per weekdag',
    lead: 'Acht weken terug gekeken: valt je training op één weekdag vaker weg dan op de andere?',
    points: [
      { head: 'Wanneer', text: 'de training stond er minstens zes keer, viel minstens vier keer en de helft van de keren weg, en duidelijk vaker dan op je andere dagen.' },
      { head: 'Wat telt', text: 'overgeslagen, gemist of door jou verschoven. Vrije dagen, vakanties, tochten en ziekte tellen niet mee.' },
      { head: 'Wat het doet', text: 'één zin op Week. Je planning verandert er niet door.' },
    ],
  },
  'hitte-tempo': {
    title: 'Hitte bij je tempo',
    lead: 'In warmte, en vooral bij vocht, loop je bij dezelfde moeite trager. Dat is je lichaam dat koelt, geen slechte vorm.',
    points: [
      { head: 'Wanneer', text: 'bij een loop buiten als het voelt als 22 graden of meer, of als het dauwpunt 16 of hoger is.' },
      { head: 'Wat je ziet', text: 'een regel onder het weer: loop op hartslag, 10 tot 20 seconden per km trager, 5 tot 10 als het alleen vochtig is, of 20 tot 40 als het heet of benauwd is. Bij intervallen en heuvelherhalingen: meer rust ertussen.' },
      { head: 'Hoe zeker', text: 'een gemiddelde over veel lopers (bewijs matig).' },
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
  'etappetijd-eigen': {
    title: 'Etappetijd op je eigen tempo',
    lead: 'De looptijd op de bordjes is een norm. Met je eigen klimtempo zie je hoe lang een etappe voor jou ongeveer duurt.',
    points: [
      { head: 'Wat je ziet', text: 'bij een etappe en op Je stand een band, zoals 6,5 tot 7,5 uur lopen, zonder pauzes.' },
      { head: 'Wanneer', text: 'zodra je klimtempo er is, na zes klimmen uit drie tochten. Tot dan blijft de looptijd van de site staan.' },
      { head: 'Hoe het rekent', text: 'vlak met 4 km per uur, omhoog en omlaag met jouw meters per uur, iets trager bij een zwaardere rugzak. Vermoeidheid na een paar dagen lopen telt niet mee.' },
    ],
  },
  tempocurve: {
    title: 'Tempocurve tussen testen',
    lead: 'Tussen twee testen loop je in training ook snelle stukken. De snelste staan naast je test, als controle.',
    points: [
      { head: 'Wat je ziet', text: 'op Je stand onder Lopen je snelste 5 km in training sinds je test, met één zin: past bij je testtempo\'s, wijst op iets sneller, of is rustiger.' },
      { head: 'De test blijft de bron', text: 'je tempo\'s, de voorspelling en wat naar je horloge gaat veranderen hier niet door.' },
      { head: 'Wanneer', text: 'drie weken na je test en na drie loopjes buiten met details. Het is een ondergrens.' },
    ],
  },
  'wennen-warmte': {
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
      { head: 'Alleen informatie', text: 'Geen oordeel of je moet gaan. Dat is vakwerk. Je planning verandert er niet door.' },
      { head: 'Waar het vandaan komt', text: 'Open-Meteo, hoogstens eens per uur, alleen als het weer je locatie volgt. Een weermodel rekent een bergkam grof uit.' },
    ],
  },
  'ochtend-voorstel': {
    title: 'Voorstel bij een slechte ochtend',
    lead: 'Wijken twee van de drie horlogegetallen af op de ochtend van een zware training, dan kan een latere dag helpen.',
    points: [
      { head: 'Wanneer', text: 'bij een tempoloop, intervallen, een test of een zware beendag. Je ziet een kaart met de getallen die afwijken. Eerst een voorstel, pas na Akkoord verandert er iets. Lichter doen kan ook.' },
      { head: 'Niet', text: 'bij een wedstrijd, als je zei dat je niet moe bent, als je ziek bent gemeld of als er al een voorstel voor die training ligt. Werkt alleen met Twee van drie aan.' },
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
  intensiteit: {
    title: 'Intensiteit tellen',
    lead: 'De kaart Intensiteit op Je stand toont hoeveel van je loop- en wandelminuten rustig waren.',
    points: [
      { head: 'Naar je hartslag', text: 'standaard. Rustig is zone 1 en 2, middel zone 3, hard zone 4 en hoger. Zonder genoeg hartslag, drempel of maximum telt die training naar plan.' },
      { head: 'Naar het plan', text: 'elke training telt als wat ze bedoeld was, ook als je harder liep.' },
    ],
  },
  'tempo-stukken': {
    title: 'Tempo uit stabiele stukken',
    lead: 'Tempo bij zone 2 rekent met vlakke stukken van minstens 5 minuten waarin je hartslag en tempo vast lagen.',
    points: [
      { head: 'Aan', text: 'standaard. Uit elke buitenloop, ook het inlopen van een intervaltraining. De eerste 10 minuten, heuvels en warme lopen tellen niet mee.' },
      { head: 'Uit', text: 'de gemiddelde hartslag van elke geplande rustige of lange loop.' },
      { head: 'Je planning', text: 'verandert hier niet door. Het is alleen een meting.' },
    ],
  },
  'eten-onderweg': {
    title: 'Eten onderweg',
    lead: 'Vanaf anderhalf uur lopen of wandelen, en per dag op een tocht, staat erbij hoeveel koolhydraten je ongeveer meeneemt, met wat dat is in gels, bananen of krentenbollen.',
    points: [
      { head: 'Waar', text: 'in De avond ervoor als één regel, op het trainingsscherm, bij je tochten en bij elke etappe.' },
      { head: 'Waarop', text: 'duur, soort en zwaarte: 30 tot 60 gram per uur bij lopen, 30 tot 40 bij wandelen. Geen gewicht, geen registratie.' },
      { head: 'Geen advies', text: 'een indicatie, geen medisch advies. Oefen het op lange trainingen.' },
      { head: 'Uit', text: 'nergens een regel over eten. Drinken blijft staan.' },
    ],
  },
  'rustiger-instap': {
    title: 'Rustiger instap na een pauze',
    lead: 'Na ziekte en een vakantie, of na twee weken met weinig training, krijg je op de dag dat je terug bent een rustiger week als voorstel.',
    points: [
      { head: 'Wanneer', text: 'op de eerste vier dagen terug, als je in de twee weken ervoor minder dan 40 procent van twee gewone weken deed. Niet terwijl je ziek bent of nog opbouwt na ziekte, niet met een test of wedstrijd in die week, en niet in de eerste twee weken van je plan.' },
      { head: 'Wat er verandert', text: 'zeven dagen lang duren je trainingen driekwart (het advies) of de helft van de gewone tijd. Welke trainingen er staan, je fase en je doeldatum blijven zoals ze zijn.' },
      { head: 'Alleen met Akkoord', text: 'eerst een voorstel met de trainingen die korter worden; pas na Akkoord verandert er iets, met Ongedaan maken. Uit: na een pauze gaat je plan gewoon verder.' },
    ],
  },
};

// De uitleg zonder namen, voor als "Voorbeelden bij naam noemen" uit staat (docs/beslissingen/2026-10-27-redenen-bij-naam.md).
export const LICHAAM_ZONDER_NAMEN: Record<string, SettingsHelp> = {
  'wat-oorzaak': {
    title: 'Mogelijke oorzaak',
    lead: 'In het blad van een training of een dag staat wat al bekend is, met de bron erbij.',
    points: [
      { head: 'Wat al bekend is', text: 'warmte uit het weer, een zware beendag uit je logboek, een korte nacht van je horloge en een ziekmelding. Dat telt altijd mee in "Wat doet dit met je?", ook als dit uit staat.' },
      { head: 'Je patroon', text: '"lijkt op" staat er pas als een reden minstens 4 keer is vastgelegd, je gewone lopen ook, en de banden elkaar niet raken.' },
      { head: 'Wat je dronk of gebruikte', text: 'komt nooit uit zichzelf ter sprake.' },
    ],
  },
  'wat-test': {
    title: 'Test verschuiven',
    lead: 'Na een avond die je zelf zwaar noteerde, kan een voorstel komen om een testloop te verschuiven.',
    points: [
      { head: 'Wanneer', text: 'een testloop vandaag of morgen, na een avond waarvan je veel vastlegde van wat je dronk of gebruikte. Bij wat je gebruikte alleen op dezelfde dag.' },
      { head: 'Altijd een voorstel', text: 'eerst een voorstel, pas na Akkoord verandert er iets. Gewone trainingen schuiven nooit om een reden.' },
    ],
  },
};

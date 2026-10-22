// ASCEND, de vraag van de week (engine/weeklyQuestion.ts).
//
// Elke vraag is een implementatie-intentie: "Als ..., wat doe je dan?". Je
// vult de dan-kant zelf in, in één regel. De vorm komt uit onderzoek naar
// implementatie-intenties: een voornemen met een concreet wanneer en wat
// (als situatie X, dan handeling Y) wordt vaker uitgevoerd dan alleen het
// doel. Gollwitzer en Sheeran 2006 (meta-analyse, 94 onafhankelijke tests)
// vonden een middelgroot tot groot effect op het halen van doelen, het sterkst
// als het plan een voorziene hindernis aanwijst en de handeling voor die
// hindernis alvast vastlegt. Dat is precies wat deze vragen doen: een
// tegenslag, pijn, slecht weer, een gemiste training, vermoeidheid of twijfel
// die je kunt zien aankomen, en een eigen antwoord klaar voordat het zover is.
// Bron: https://doi.org/10.1016/S0065-2601(06)38002-1
//
// Elke vraag heeft één korte stoïcijnse bron met vindplaats. Dat is dezelfde
// oefening in oude vorm: Seneca noemt het vooraf bedenken van tegenslag
// (Brieven aan Lucilius 91.4), Epictetus raadt aan vooraf te bedenken wat een
// handeling inhoudt (Handboekje 4 en 29). De bronnen staan er ter ondersteuning,
// niet om uit te leggen.
//
// De vertalingen zijn eigen, vrije vertalingen uit de Engelse (Long, Carter,
// Gummere, Stevenson) en Latijnse tekst, ingekort tot de kern. De vindplaatsen
// zijn nagelopen tegen de Engelse uitgaven op classics.mit.edu en Wikisource
// en de Latijnse tekst bij Seneca (De providentia, De ira, De brevitate vitae).
// Waar de schrijver iemand anders aanhaalt, staat dat in `noot`.
//
// De volgorde binnen een fase doet ertoe voor de fasen die vanaf het einde
// worden geteld (wedstrijd, expeditie, taper): daar staat de laatste vraag
// voor de laatste week. De andere fasen draaien rond (engine/weeklyQuestion.ts).
// Er zijn minstens evenveel vragen per fase als er weken in die fase vallen
// tussen nu en 1 augustus 2027 (zie weeklyQuestion.test.ts), zodat er tot de
// GR5 niets herhaald wordt.
//
// Toon: rustig en volwassen. Geen gedachtestreepjes in nieuwe tekst.

export type WeekQuestionPhase =
  | 'basis'
  | 'opbouw'
  | 'wedstrijd'
  | 'na_wedstrijd'
  | 'berg'
  | 'expeditie'
  | 'taper'
  | 'gr5';

export type WeekQuestionTheme =
  | 'tegenslag'
  | 'pijn_ziekte'
  | 'weer'
  | 'alleen'
  | 'gemist'
  | 'vermoeidheid'
  | 'twijfel'
  | 'voorbereiding'
  | 'uitrusting'
  | 'wedstrijd';

export interface WeekQuestionSource {
  tekst: string; // eigen vertaling, kort
  auteur: 'Marcus Aurelius' | 'Seneca' | 'Epictetus';
  werk: string; // werk en plaats, bijvoorbeeld "Overpeinzingen 4.49"
  noot?: string; // als de schrijver iemand anders aanhaalt
}

export interface WeekQuestion {
  id: string;
  phase: WeekQuestionPhase;
  theme: WeekQuestionTheme;
  vraag: string; // "Als ..., wat doe je dan?"
  bron: WeekQuestionSource;
}

export const WEEK_QUESTIONS: WeekQuestion[] = [
  // --- Basis: gewoonte, weer, vermoeidheid, een gemiste dag --------------------
  {
    id: 'WQ-basis-01', phase: 'basis', theme: 'gemist',
    vraag: 'Als je een training moet overslaan omdat de week anders loopt dan gepland, wat doe je dan op de eerstvolgende vrije dag?',
    bron: { tekst: 'Word niet moedeloos of ontevreden als het niet lukt alles te doen zoals het hoort. Ben je gestruikeld, keer dan terug, en wees tevreden als het meeste van wat je doet klopt.', auteur: 'Marcus Aurelius', werk: 'Overpeinzingen 5.9' },
  },
  {
    id: 'WQ-basis-02', phase: 'basis', theme: 'vermoeidheid',
    vraag: 'Als de wekker gaat en je bed aantrekkelijker is dan je training, wat is dan het eerste wat je doet?',
    bron: { tekst: 'Laat het je niet uitmaken of je het koud hebt of warm, slaperig bent of uitgeslapen, zolang je maar doet wat je moet doen.', auteur: 'Marcus Aurelius', werk: 'Overpeinzingen 6.2' },
  },
  {
    id: 'WQ-basis-03', phase: 'basis', theme: 'weer',
    vraag: 'Als je een buitentraining hebt gepland en regen, wind of kou zijn te verwachten, wat zeg je jezelf dan vooraf, en wat leg je klaar?',
    bron: { tekst: 'Bedenk bij alles wat je gaat doen eerst wat het inhoudt. Ga je baden, stel je dan voor wat er in het badhuis gebeurt: spattend water, geduw, gescheld.', auteur: 'Epictetus', werk: 'Handboekje 4' },
  },
  {
    id: 'WQ-basis-04', phase: 'basis', theme: 'vermoeidheid',
    vraag: 'Als je moe van je werk thuiskomt en je training nog wacht, wat is dan de kleinste versie die je toch doet?',
    bron: { tekst: 'Elke gewoonte en elk vermogen groeit door de handelingen die erbij horen: lopen door te lopen, rennen door te rennen.', auteur: 'Epictetus', werk: 'Gesprekken 2.18' },
  },
  {
    id: 'WQ-basis-05', phase: 'basis', theme: 'pijn_ziekte',
    vraag: 'Als je tijdens een training een pijn voelt die je niet kent, op welk teken stop je dan, en wat doe je de rest van die dag?',
    bron: { tekst: 'Zoals je tijdens het lopen oppast dat je niet op een spijker trapt of je voet verdraait, pas dan ook op dat je je eigen oordeel niet beschadigt.', auteur: 'Epictetus', werk: 'Handboekje 38' },
  },
  {
    id: 'WQ-basis-06', phase: 'basis', theme: 'pijn_ziekte',
    vraag: 'Als je ziek of verkouden wakker wordt op een trainingsdag, welk teken laat je rusten, en wat doe je dan in plaats van trainen?',
    bron: { tekst: 'Ziekte hindert het lichaam, maar niet je vermogen om te kiezen, tenzij je dat zelf wilt.', auteur: 'Epictetus', werk: 'Handboekje 9' },
  },
  {
    id: 'WQ-basis-07', phase: 'basis', theme: 'twijfel',
    vraag: 'Als je je afvraagt waarom je dit allemaal doet, welke zin over je doel zeg of lees je dan tegen jezelf?',
    bron: { tekst: 'Wie niet weet naar welke haven hij vaart, voor hem is geen wind de goede.', auteur: 'Seneca', werk: 'Brieven aan Lucilius 71.3' },
  },
  {
    id: 'WQ-basis-08', phase: 'basis', theme: 'gemist',
    vraag: 'Als je merkt dat je een training steeds naar later schuift, welk vast moment van de dag kies je dan, en wat laat je daarvoor vallen?',
    bron: { tekst: 'Maak jezelf vrij voor je eigen leven: verzamel en bewaar de tijd die je tot nu toe werd afgenomen, ontstolen of die je ontglipte.', auteur: 'Seneca', werk: 'Brieven aan Lucilius 1.1' },
  },
  {
    id: 'WQ-basis-09', phase: 'basis', theme: 'voorbereiding',
    vraag: 'Als je agenda deze week vol zit, welke twee trainingen houd je dan altijd, en op welke dag en welk uur?',
    bron: { tekst: 'Het is niet dat we weinig tijd hebben, maar dat we er veel van verspillen.', auteur: 'Seneca', werk: 'Over de kortheid van het leven 1.3' },
  },
  {
    id: 'WQ-basis-10', phase: 'basis', theme: 'alleen',
    vraag: 'Als je alleen buiten loopt en je hoofd vol zit met werk of zorgen, wat doe je dan in de eerste tien minuten?',
    bron: { tekst: 'Mensen zoeken een toevlucht op het platteland, aan de kust, in de bergen. Maar je kunt je op elk moment in jezelf terugtrekken: nergens vindt een mens meer rust.', auteur: 'Marcus Aurelius', werk: 'Overpeinzingen 4.3' },
  },
  {
    id: 'WQ-basis-11', phase: 'basis', theme: 'tegenslag',
    vraag: 'Als een training uitvalt door iets buiten je macht, welke korte oefening of wandeling doe je dan in de plaats?',
    bron: { tekst: 'De geest maakt van elke hindernis een hulp: wat op de weg ligt, helpt ons verder op die weg.', auteur: 'Marcus Aurelius', werk: 'Overpeinzingen 5.20' },
  },
  {
    id: 'WQ-basis-12', phase: 'basis', theme: 'vermoeidheid',
    vraag: 'Als je slecht hebt geslapen en je benen zwaar aanvoelen, welke ene keuze maak je dan, en wat laat je los?',
    bron: { tekst: 'Sommige dingen staan in onze macht en andere niet. In onze macht staan ons oordeel, ons streven en onze keuzes. Niet in onze macht staan ons lichaam, ons bezit en ons aanzien.', auteur: 'Epictetus', werk: 'Handboekje 1' },
  },
  {
    id: 'WQ-basis-13', phase: 'basis', theme: 'voorbereiding',
    vraag: 'Als iemand vraagt waarom je zaterdagavond vroeg naar huis gaat voor een lange tocht, wat antwoord je dan in één zin?',
    bron: { tekst: 'Doe je iets omdat je zeker weet dat het moet, schuw dan niet dat men je ziet, ook al denkt de menigte er het hare van.', auteur: 'Epictetus', werk: 'Handboekje 35' },
  },
  {
    id: 'WQ-basis-14', phase: 'basis', theme: 'twijfel',
    vraag: 'Als een training tegenviel, welke zin zeg je dan tegen jezelf in plaats van: ik kan het niet?',
    bron: { tekst: 'Zoals je gedachten gewoonlijk zijn, zo zal ook je geest zijn, want de ziel wordt gekleurd door de gedachten.', auteur: 'Marcus Aurelius', werk: 'Overpeinzingen 5.16' },
  },

  // --- Opbouw: langere loop, extra training, rustweek ---------------------------
  {
    id: 'WQ-opbouw-01', phase: 'opbouw', theme: 'vermoeidheid',
    vraag: 'Als de lange loop deze week langer is dan ooit, welke regel geef je jezelf dan voor de eerste helft?',
    bron: { tekst: 'Zonder tegenstander verwelkt kracht: pas als ze iets moet verdragen, blijkt wat ze waard is. Het gaat er niet om wat je draagt, maar hoe.', auteur: 'Seneca', werk: 'Over de voorzienigheid 2.4' },
  },
  {
    id: 'WQ-opbouw-02', phase: 'opbouw', theme: 'voorbereiding',
    vraag: 'Als ASCEND een extra training voorstelt en je twijfelt of je lichaam dat aankan, op welk teken zeg je dan nee?',
    bron: { tekst: 'Wil je winnen bij de Olympische Spelen? Bedenk eerst wat eraan voorafgaat en wat erop volgt, en begin dan pas. Je moet je aan regels houden, op vaste uren trainen, in hitte en in kou.', auteur: 'Epictetus', werk: 'Handboekje 29' },
  },
  {
    id: 'WQ-opbouw-03', phase: 'opbouw', theme: 'gemist',
    vraag: 'Als je plan een rustweek zegt en je voelt je juist goed, wat doe je dan om het plan te volgen?',
    bron: { tekst: 'Wie wil, wordt door het lot geleid; wie niet wil, wordt meegesleept.', auteur: 'Seneca', werk: 'Brieven aan Lucilius 107.11', noot: 'Seneca vertaalt hier een vers van Kleanthes.' },
  },
  {
    id: 'WQ-opbouw-04', phase: 'opbouw', theme: 'twijfel',
    vraag: 'Als je niet vooruit lijkt te gaan terwijl je trouw traint, welk getal of welke training neem je dan als maat, en hoe lang geef je het?',
    bron: { tekst: 'Gedraag je in het leven als op een feestmaal. Wordt er iets rondgegeven, neem dan met mate. Gaat het langs je heen, houd het niet tegen. Is het nog niet bij je, wacht dan rustig tot het komt.', auteur: 'Epictetus', werk: 'Handboekje 15' },
  },
  {
    id: 'WQ-opbouw-05', phase: 'opbouw', theme: 'gemist',
    vraag: 'Als je op zondagavond zegt dat je volgende week alles anders gaat doen, welke ene vaste handeling spreek je dan nu al af?',
    bron: { tekst: 'Filosofie leert ons te doen, niet te praten.', auteur: 'Seneca', werk: 'Brieven aan Lucilius 20.2' },
  },

  // --- Wedstrijdblok rond de 10 km (van blokstart tot en met wedstrijdweek) ------
  {
    id: 'WQ-wedstrijd-01', phase: 'wedstrijd', theme: 'wedstrijd',
    vraag: 'Als de eerste tempoloop van het wedstrijdblok zwaarder voelt dan verwacht, wat doe je dan met die uitslag?',
    bron: { tekst: 'Eis niet dat alles gaat zoals jij wilt, maar wil dat het gaat zoals het gaat, dan zal het je goed gaan.', auteur: 'Epictetus', werk: 'Handboekje 8' },
  },
  {
    id: 'WQ-wedstrijd-02', phase: 'wedstrijd', theme: 'twijfel',
    vraag: 'Als je midden in een tempoloop denkt: dit hou ik niet vol, welke woorden zeg je dan, en wat doe je met je ademhaling?',
    bron: { tekst: 'Zeg tegen elke harde indruk: jij bent maar een indruk, en niet precies wat je lijkt te zijn. Onderzoek haar dan.', auteur: 'Epictetus', werk: 'Handboekje 1.5' },
  },
  {
    id: 'WQ-wedstrijd-03', phase: 'wedstrijd', theme: 'weer',
    vraag: 'Als de wind of regen op de dag van een tempoloop tegenzit, welke aanpassing maak je dan zonder de training weg te gooien?',
    bron: { tekst: 'De fiches en de dobbelstenen zijn onverschillig. Hoe de worp valt weet ik niet, maar hem zorgvuldig en vaardig spelen is mijn zaak.', auteur: 'Epictetus', werk: 'Gesprekken 2.5' },
  },
  {
    id: 'WQ-wedstrijd-04', phase: 'wedstrijd', theme: 'wedstrijd',
    vraag: 'Als je op je horloge of in een app snellere tijden van anderen ziet, welke maat gebruik je dan alleen voor jezelf?',
    bron: { tekst: 'Hoeveel moeite bespaart wie niet kijkt naar wat een ander zegt, doet of denkt, maar alleen naar wat hij zelf doet. Kijk niet om, maar loop rechtdoor langs de lijn.', auteur: 'Marcus Aurelius', werk: 'Overpeinzingen 4.18', noot: 'Marcus haalt hier de dichter Agathon aan.' },
  },
  {
    id: 'WQ-wedstrijd-05', phase: 'wedstrijd', theme: 'tegenslag',
    vraag: 'Als een training in het blok zwaarder is dan je aankunt, hoe besluit je dan ter plekke of je doorgaat, terugschakelt of stopt?',
    bron: { tekst: 'Komt er een moeilijkheid op je af, bedenk dan dat je bent gekoppeld aan een ruwe jonge tegenstander, zoals een trainer dat bij een worstelaar doet. Zonder zweet word je geen overwinnaar.', auteur: 'Epictetus', werk: 'Gesprekken 1.24' },
  },
  {
    id: 'WQ-wedstrijd-06', phase: 'wedstrijd', theme: 'pijn_ziekte',
    vraag: 'Als de laatste herhaling van een tempoblok brandt in je benen en longen, welk woord zeg je dan tegen jezelf?',
    bron: { tekst: 'Vraag bij elke gebeurtenis welk vermogen je hebt om er goed mee om te gaan. Heb je pijn, dan vind je uithoudingsvermogen. Hoor je kwetsende woorden, dan vind je geduld.', auteur: 'Epictetus', werk: 'Handboekje 10' },
  },
  {
    id: 'WQ-wedstrijd-07', phase: 'wedstrijd', theme: 'wedstrijd',
    vraag: 'Als er op wedstrijddag iets misgaat, bijvoorbeeld een losse veter, kou of een te snelle start, wat is dan je vaste antwoord?',
    bron: { tekst: 'Niets mag ons onverwacht overkomen. Stuur je gedachten vooruit naar alle moeilijkheden en bedenk niet wat gewoonlijk gebeurt, maar wat kan gebeuren.', auteur: 'Seneca', werk: 'Brieven aan Lucilius 91.4' },
  },
  {
    id: 'WQ-wedstrijd-08', phase: 'wedstrijd', theme: 'twijfel',
    vraag: 'Als je de dagen voor de wedstrijd zenuwachtig wordt, wat doe je dan met die energie?',
    bron: { tekst: 'Laat toekomstige dingen je niet verontrusten, want je komt erbij, als het nodig is, met dezelfde redelijkheid die je nu voor het heden gebruikt.', auteur: 'Marcus Aurelius', werk: 'Overpeinzingen 7.8' },
  },
  {
    id: 'WQ-wedstrijd-09', phase: 'wedstrijd', theme: 'wedstrijd',
    vraag: 'Als je aan de start van de wedstrijd staat en het tempo van de anderen je meesleept, welk tempo houd je dan de eerste drie kilometer aan?',
    bron: { tekst: 'Je kunt onoverwinnelijk zijn, als je alleen een strijd aangaat waarvan de winst in je eigen macht ligt.', auteur: 'Epictetus', werk: 'Handboekje 19' },
  },

  // --- De week na de wedstrijd ---------------------------------------------------
  {
    id: 'WQ-na-wedstrijd-01', phase: 'na_wedstrijd', theme: 'twijfel',
    vraag: 'Als je de wedstrijd hebt gelopen, hoe het ook ging, welke twee zinnen schrijf je dan op over wat goed ging en wat je volgende keer anders doet?',
    bron: { tekst: 'Elke avond ga ik mijn dag langs. Ik verberg niets voor mezelf en sla niets over. Waarom zou ik mijn fouten vrezen als ik kan zeggen: pas op dat je dat niet nog eens doet, nu vergeef ik het je?', auteur: 'Seneca', werk: 'Over de woede 3.36' },
  },

  // --- Bergcapaciteit: lange zondag met hoogtemeters en rugzak -------------------
  {
    id: 'WQ-berg-01', phase: 'berg', theme: 'uitrusting',
    vraag: 'Als de rugzak na twee uur gaat knellen, welke ene aanpassing probeer je dan eerst, voordat je gaat klagen?',
    bron: { tekst: 'Alles heeft twee handvatten: een waaraan je het kunt dragen en een waaraan niet.', auteur: 'Epictetus', werk: 'Handboekje 43' },
  },
  {
    id: 'WQ-berg-02', phase: 'berg', theme: 'vermoeidheid',
    vraag: 'Als je halverwege een lange klim denkt dat je niet meer kunt, welke kleine stap neem je dan, bijvoorbeeld twintig passen of tot die rots?',
    bron: { tekst: 'Het is beschamend dat de ziel het eerder opgeeft dan het lichaam.', auteur: 'Marcus Aurelius', werk: 'Overpeinzingen 6.29' },
  },
  {
    id: 'WQ-berg-03', phase: 'berg', theme: 'weer',
    vraag: 'Als de weersvoorspelling voor zondag slecht is en je er nu al van wakker ligt, op welk moment besluit je dan pas, en wat kijk je dan na?',
    bron: { tekst: 'Sommige dingen kwellen ons meer dan nodig is, sommige eerder dan nodig is, en sommige kwellen ons terwijl ze ons helemaal niet zouden moeten kwellen.', auteur: 'Seneca', werk: 'Brieven aan Lucilius 13.5' },
  },
  {
    id: 'WQ-berg-04', phase: 'berg', theme: 'tegenslag',
    vraag: 'Als je een tocht moet afbreken of omkeren voor de top, wat zeg je dan tegen jezelf, en wat schrijf je erover op?',
    bron: { tekst: 'Wil je jezelf oefenen in inspanning en harde proeven, doe het dan voor jezelf en niet voor de wereld.', auteur: 'Epictetus', werk: 'Handboekje 47' },
  },
  {
    id: 'WQ-berg-05', phase: 'berg', theme: 'alleen',
    vraag: 'Als je alleen loopt en er gaat iets mis waar je hulp bij nodig hebt, wie bel je dan als eerste, en wat zeg je?',
    bron: { tekst: 'Schaam je niet om geholpen te worden. Je taak is je plicht te doen, als een soldaat bij de bestorming van een muur. Wat als je de borstwering kreupel alleen niet kunt halen, maar met een ander wel?', auteur: 'Marcus Aurelius', werk: 'Overpeinzingen 7.7' },
  },
  {
    id: 'WQ-berg-06', phase: 'berg', theme: 'weer',
    vraag: 'Als het de hele tocht regent en je merkt dat je wilt klagen, wat doe je dan in plaats daarvan, hardop of in gedachten?',
    bron: { tekst: 'Ik moet in ballingschap. Wie belet me dan te gaan met een glimlach, opgewekt en tevreden?', auteur: 'Epictetus', werk: 'Gesprekken 1.1' },
  },
  {
    id: 'WQ-berg-07', phase: 'berg', theme: 'voorbereiding',
    vraag: 'Als je onderweg wilt stoppen voor een uitzicht of een omweg, welke aankomsttijd bewaak je dan toch?',
    bron: { tekst: 'Gaat je schip voor anker en ga je aan wal water halen, dan mag je onderweg een schelpdier of een ui rapen, maar je aandacht moet bij het schip blijven, voor het geval de kapitein roept.', auteur: 'Epictetus', werk: 'Handboekje 7' },
  },
  {
    id: 'WQ-berg-08', phase: 'berg', theme: 'gemist',
    vraag: 'Als je een tocht al twee keer hebt uitgesteld, welke datum zet je dan vast, en wie weet ervan?',
    bron: { tekst: 'Bedenk hoe lang je dit al uitstelt, en hoe vaak je een kans kreeg en haar niet gebruikte.', auteur: 'Marcus Aurelius', werk: 'Overpeinzingen 2.4' },
  },

  // --- Expeditieklaar: twee dagen achter elkaar, slapen buiten, generale repetitie
  {
    id: 'WQ-expeditie-01', phase: 'expeditie', theme: 'uitrusting',
    vraag: 'Als je dit weekend buiten slaapt met je volle uitrusting, welk ongemak neem je dan bewust voor lief, en wat schrijf je erover op?',
    bron: { tekst: 'Kies een aantal dagen waarop je tevreden bent met het karigste eten en ruwe kleren, en zeg dan tegen jezelf: is dit de toestand waar ik bang voor was?', auteur: 'Seneca', werk: 'Brieven aan Lucilius 18.5' },
  },
  {
    id: 'WQ-expeditie-02', phase: 'expeditie', theme: 'vermoeidheid',
    vraag: 'Als je op de tweede dag achter elkaar met rugzak chagrijnig wordt, wat doe je dan voordat je het tempo of de route verandert?',
    bron: { tekst: 'Je moet van geest veranderen, niet van hemelstreek.', auteur: 'Seneca', werk: 'Brieven aan Lucilius 28.1' },
  },
  {
    id: 'WQ-expeditie-03', phase: 'expeditie', theme: 'vermoeidheid',
    vraag: 'Als je op een lange dag met zware rugzak denkt aan alle kilometers die nog komen, welk eerstvolgend punt neem je dan als doel, een bocht, een bron of een pauze?',
    bron: { tekst: 'Verontrust jezelf niet door aan je hele leven te denken. Vraag bij elke moeilijkheid: wat hierin is onverdraaglijk? Bedenk dat noch de toekomst noch het verleden je pijn doet, maar alleen het heden.', auteur: 'Marcus Aurelius', werk: 'Overpeinzingen 8.36' },
  },
  {
    id: 'WQ-expeditie-04', phase: 'expeditie', theme: 'tegenslag',
    vraag: 'Als er tijdens de generale repetitie iets misgaat met je spullen of je planning, wat schrijf je dan op dat je voor vertrek nog wilt oplossen?',
    bron: { tekst: 'Niets lijkt mij ongelukkiger dan wie nooit tegenslag heeft gekend.', auteur: 'Seneca', werk: 'Over de voorzienigheid 3.3', noot: 'Seneca haalt hier de filosoof Demetrius aan.' },
  },

  // --- Taper: de laatste weken voor vertrek --------------------------------------
  {
    id: 'WQ-taper-01', phase: 'taper', theme: 'uitrusting',
    vraag: 'Als je voor de laatste keer je rugzak inpakt, wat haal je dan eruit dat je op je testtochten niet hebt gebruikt?',
    bron: { tekst: 'Het lichaam is voor ieder de maat van wat hem toekomt, zoals de voet de maat is van de schoen. Blijf daarbij, dan houd je de maat.', auteur: 'Epictetus', werk: 'Handboekje 39' },
  },
  {
    id: 'WQ-taper-02', phase: 'taper', theme: 'twijfel',
    vraag: 'Als je rusteloos wordt omdat je nu minder traint, wat doe je dan met je tijd en je energie?',
    bron: { tekst: 'De volmaaktheid van karakter bestaat erin elke dag te leven alsof het de laatste is, zonder opwinding, zonder lusteloosheid en zonder schijn.', auteur: 'Marcus Aurelius', werk: 'Overpeinzingen 7.69' },
  },
  {
    id: 'WQ-taper-03', phase: 'taper', theme: 'tegenslag',
    vraag: 'Als er op de dag van vertrek iets niet loopt zoals gepland, een trein, het weer of je uitrusting, wat is dan je eerste handeling?',
    bron: { tekst: 'De geest maakt van wat zich tegen hem keert zijn eigen stof, zoals een sterk vuur alles in zich opneemt wat erop wordt gegooid en juist daardoor hoger oplaait.', auteur: 'Marcus Aurelius', werk: 'Overpeinzingen 4.1' },
  },

  // --- Onderweg op de GR5 --------------------------------------------------------
  {
    id: 'WQ-gr5-01', phase: 'gr5', theme: 'twijfel',
    vraag: 'Als je moe bent en denkt dat je beter voorbereid had moeten zijn, welke ene kleine stap doe je dan nu?',
    bron: { tekst: 'Je bent geen jongen meer, maar een volwassen man. Denk dat dit het moment is: de strijd is nu, de spelen zijn nu, en ze kunnen niet worden uitgesteld.', auteur: 'Epictetus', werk: 'Handboekje 51' },
  },
  {
    id: 'WQ-gr5-02', phase: 'gr5', theme: 'alleen',
    vraag: 'Als je onderweg iemand tegenkomt die onvriendelijk of lastig is, wat zeg je dan tegen jezelf voordat je antwoordt?',
    bron: { tekst: 'Begin de ochtend met tegen jezelf te zeggen: ik zal vandaag bemoeizuchtige, ondankbare, hooghartige, bedrieglijke, afgunstige en ongezellige mensen ontmoeten.', auteur: 'Marcus Aurelius', werk: 'Overpeinzingen 2.1' },
  },
  {
    id: 'WQ-gr5-03', phase: 'gr5', theme: 'weer',
    vraag: 'Als een slechte dag eindigt in kou of regen bij je tent, wat is dan je vaste avondroutine om te herstellen?',
    bron: { tekst: 'Wees als de klip waartegen de golven blijven breken: hij blijft staan en de woede van het water rondom hem zakt.', auteur: 'Marcus Aurelius', werk: 'Overpeinzingen 4.49' },
  },
  {
    id: 'WQ-gr5-04', phase: 'gr5', theme: 'pijn_ziekte',
    vraag: 'Als je ’s avonds pijnlijke voeten of benen hebt, wat doe je dan eerst, en op welk teken neem je een rustdag?',
    bron: { tekst: 'Pijn is niet onverdraaglijk en niet eindeloos, zolang je bedenkt dat ze grenzen heeft en je er in je verbeelding niets aan toevoegt.', auteur: 'Marcus Aurelius', werk: 'Overpeinzingen 7.64', noot: 'Marcus haalt hier Epicurus aan.' },
  },
];

// ASCEND: de uitleg achter de i bij de instellingen van de groep Doel en tochten, op id van de verklaring
// (docs/visie/Ontwerp instellingen op een plek.md, stap 3). Alleen geladen in Instellingen of als je op de i tikt
// (data/settingsHelpKeys.ts), zodat deze tekst niet bij de start van de app laadt. De verklaring zegt `help: true`.

import type { SettingsHelp } from '../../../data/settingsHelp';

export const DOEL_UITLEG: Record<string, SettingsHelp> = {
  doelen: {
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
  richting: {
    title: 'Richting',
    lead: 'Zonder doel plant ASCEND je weken naar een richting, in golven van vier weken. Een bergtocht en een rugzak komen pas met een tocht als doel.',
    points: [
      { head: 'Fit blijven', text: 'het advies. 150 minuten en 2 keer kracht, elke vierde week wat lichter.' },
      { head: 'Fitter of sterker worden', text: 'Fitter worden begint bij wat je de laatste vier weken deed en bouwt op. Bij Sterker worden staat kracht voorop.' },
      { head: 'Rustig aan', text: '90 minuten en 1 keer kracht, nooit een harde training. Een andere richting is eerst een voorstel, pas na Akkoord verandert er iets.' },
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
  'lange-zondag': {
    title: 'De lange zondag',
    lead: 'Op zondag staat je langste training: een bergtocht of een lange duurloop. Een andere keuze laat eerst zien wat er verschuift.',
    points: [
      { head: 'Bergdoel', text: 'is je hoofddoel een bergtocht, dan staat deze keuze er niet.' },
    ],
  },
  'na-hoofddoel': {
    title: 'Na je hoofddoel',
    lead: 'Wat ASCEND plant als je doel voorbij is: niets (advies) of onderhoudsweken.',
    points: [
      { head: 'Tijdens de tocht', text: 'verandert er nooit iets.' },
    ],
  },
  'klaar-weging': {
    title: 'Weging bij een doeltijd',
    lead: 'Bij een wedstrijd met een doeltijd gaat het vooral over snelheid. Dit bepaalt hoe zwaar die meetelt in je percentage.',
    points: [
      { head: 'Snelheid weegt het zwaarst', text: 'het gat tussen je verwachte tijd en je doeltijd telt voor 60% mee. Je langste loop en je weekvolume tellen voor 20% elk.' },
      { head: 'Gelijk', text: 'alle meters tellen even zwaar, zoals voor een doel zonder doeltijd. Sterker worden volgt dezelfde keuze, met 60% voor de krachtmeter en 40% voor je harde sets.' },
      { head: 'Je verwachte tijd', text: 'komt uit je testloop die meetelt. Zonder testloop, of zolang je snelste 5 km op je Akkoord wacht, telt snelheid niet mee.' },
    ],
  },
  'klaar-groei': {
    title: 'Groei bij het rekenen',
    lead: 'Hoe snel je beter wordt, verschilt sterk tussen mensen. ASCEND rekent het gat naar je doel om in weken werk met één groeigetal.',
    points: [
      { head: 'Gemiddeld', text: 'het midden van de band, bij hardlopen 0,55% per week. Afgeleid uit meerdere onderzoeken, niet uit één studie.' },
      { head: 'Voorzichtig', text: 'de onderkant van de band, bij hardlopen 0,3% per week. Je doel vraagt dan meer weken en de meters staan lager.' },
      { head: 'Overal hetzelfde', text: 'het getal, de meters, de regel onder het getal en een voorstel voor je doeltijd gebruiken dezelfde groei.' },
    ],
  },
  'klaar-marge': {
    title: 'Marge bij een tijdslimiet',
    lead: 'Bij een dagtocht met een tijdslimiet of een trailrun met een cutoff telt ASCEND een marge onder die tijd.',
    points: [
      { head: '10%', text: 'het advies. Ruimte voor eten, pauzes en een tragere dag. Bij een limiet van 8 uur ligt de grens op 7:12.' },
      { head: '5% of geen', text: 'krapper. Kies dit alleen als je je dag goed kent.' },
      { head: 'Alleen de meter', text: 'je planning en je doel veranderen er niet door.' },
    ],
  },
  'doeltijd-voorstel': {
    title: 'Doeltijd aanpassen voorstellen',
    lead: 'Je doel blijft je doel. Staat dit aan, dan mag ASCEND na een testloop één keer voorstellen om je doeltijd aan te passen.',
    points: [
      { head: 'Liever niet', text: 'ASCEND vraagt er voor dit doel niet meer naar, tot je de doeltijd zelf verandert.' },
      { head: 'Uit', text: 'er komt nooit een voorstel voor je doeltijd. De kaart blijft laten zien hoeveel er nog te winnen is.' },
      { head: 'Akkoord', text: 'verandert alleen je doeltijd, niets anders in je planning.' },
    ],
  },
  'bundel-ascend': {
    title: 'Op de Ascend-tab',
    lead: 'Wat Ascend naast je doelen laat zien: de seizoensstrook en je vaardigheden.',
    points: [
      { head: 'Per onderdeel', text: 'elk onderdeel zet je apart aan of uit in het blad.' },
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
  racedag: {
    title: 'Racedag-blad',
    lead: 'In de laatste week voor een 10 km staat op Vandaag en bij je doel één rij naar het blad Racedag.',
    points: [
      { head: 'In het blad', text: 'de start, het weer thuis met wat je aantrekt, het inlopen en een tempo per km voor je doeltijd en je verwachte tijd.' },
      { head: 'De dag erna', text: 'een korte terugblik met je tijd uit het log.' },
      { head: 'Alleen tekst', text: 'je planning en je doel veranderen er niet door.' },
    ],
  },
  'bundel-tochten': {
    title: 'Tochten',
    lead: 'Wat ASCEND doet rond een tocht: op Vandaag tonen, water per etappe, rust erna en je schoenen.',
    points: [
      { head: 'Per onderdeel', text: 'elk onderdeel zet je apart aan of uit in het blad.' },
    ],
  },
  'slapen-onderweg': {
    title: 'Slapen onderweg',
    lead: 'Waar je slaapt op je meerdaagse tocht: in hutten, met tent, of beide.',
    points: [
      { head: 'Met tent', text: 'het advies. Wie klaar is voor een tent, is ook klaar voor hutten. De paklijst heeft tent, slaapzak en kookspullen, de Reisplanner de taken voor tent, brander en bivak.' },
      { head: 'In hutten', text: 'de paklijst laat tent en kookspullen weg en de Reisplanner vraagt je hutten te reserveren.' },
      { head: 'Beide', text: 'je draagt de tent altijd mee, dus de paklijst is die van een tent. De Reisplanner heeft de taken van allebei.' },
      { head: 'Je planning', text: 'een andere keuze verandert de soort van je tocht en daarmee de afbouw. Je rugzakgewicht blijft wat bij je doel staat. Eerst een voorstel, pas na Akkoord verandert er iets.' },
    ],
  },
  'water-per-etappe': {
    title: 'Water per etappe tonen',
    lead: 'Bij elke etappe staat ongeveer hoeveel je onderweg zweet, uit je zweettempo en de uren van de etappe.',
    points: [
      { head: 'Je tempo', text: 'komt uit je eigen wegingen voor en na een training. Zonder wegingen staat er een standaard, met de woorden nog niet gemeten.' },
      { head: 'Geen advies', text: 'het is een richtlijn voor wat je kwijtraakt, geen medisch advies. Het gaat om niet te veel uitdrogen, niet om alles terug te drinken.' },
      { head: 'Uit', text: 'de etappes tonen geen water. Je wegingen blijven bewaard.' },
    ],
  },
  'rust-na-tocht': {
    title: 'Rust na een bergtocht',
    lead: 'Hoe snel een zware beendag mag volgen op een bergtocht.',
    points: [
      { head: 'Soepel', text: 'een korte beendag mag al 48 uur na je tocht.' },
      { head: 'Streng', text: 'ASCEND houdt altijd 72 uur.' },
      { head: 'Geldt voor', text: 'nieuwe en gewijzigde tochten. Een tocht die al staat, houdt zijn planning tot je hem wijzigt.' },
    ],
  },
  afdaalklok: {
    title: 'Afdaalklok',
    lead: 'Na een afdaling zijn je bovenbenen een paar weken beschermd tegen de spierpijn van de volgende.',
    points: [
      { head: 'Wat telt', text: 'een wandeling of loop met 100 meter dalen of meer, of een afdaaltraining zoals Trap af.' },
      { head: 'Na 21 dagen', text: 'één regel op Vandaag en een voorstel voor een korte trapsessie op een vrije dag. Is die er niet, dan na een herstelwandeling of een rustige loop op dezelfde dag.' },
      { head: 'Voor een tocht', text: '7 tot 14 dagen voor vertrek vraagt ASCEND om nog één afdaling die je kent. In de laatste week niets nieuws meer.' },
      { head: 'Zonder hoogtemeters', text: 'weet ASCEND niet of je afdaalde, en dat staat er dan bij.' },
      { head: 'Akkoord', text: 'pas dan staat de trapsessie in je week. Met Liever niet verandert er niets en blijft het drie weken stil.' },
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
  'bergschoenen-herinnering': {
    title: 'Herinnering bij lange tochten',
    lead: 'Op een lange wandeling of bergtocht met rugzak staat een korte regel zolang je schoenen nog niet ingelopen zijn.',
    points: [
      { head: 'Alleen een regel', text: 'er verandert niets aan je planning.' },
      { head: 'Pas zichtbaar', text: 'nadat je in de Reisplanner hebt vastgelegd sinds wanneer je ze draagt.' },
    ],
  },
  'vrije-dagen': {
    title: 'Vrije dagen en vakanties',
    lead: 'Dagen zonder training, een vakantie of een tocht. Je zet ze in Week.',
    points: [
      { head: 'Voorstel', text: 'eerst een voorstel, pas na Akkoord verandert er iets.' },
    ],
  },
};

// ASCEND: de uitleg achter de i bij de instellingen van de groep Gegevens en back-up, op id van de verklaring
// (docs/visie/Ontwerp instellingen op een plek.md, stap 3). Alleen geladen in Instellingen of als je op de i tikt
// (data/settingsHelpKeys.ts), zodat deze tekst niet bij de start van de app laadt. De verklaring zegt `help: true`.

import type { SettingsHelp } from '../../../data/settingsHelp';

export const GEGEVENS_UITLEG: Record<string, SettingsHelp> = {
  backup: {
    title: 'Laatste back-up',
    lead: 'Al je gegevens in één bestand, om te bewaren of terug te zetten.',
    points: [
      { head: 'Alleen hier', text: 'alles staat alleen op deze telefoon, dus dit is je enige kopie.' },
    ],
  },
  'auto-backup': {
    title: 'Automatische back-up',
    lead: 'Alles staat alleen op deze telefoon. Met een wekelijkse back-up raak je hoogstens een week kwijt, met dagelijks hoogstens een dag.',
    points: [
      { head: 'Wanneer', text: 'zondagavond vanaf 18:00, of bij dagelijks elke avond. Is de app dan dicht, dan gebeurt het de eerstvolgende keer dat je hem opent.' },
      { head: 'In de app en in de browser', text: 'de app maakt het bestand zelf in Interne opslag > Documents > ASCEND. Er gaat niets naar buiten. In de browser staat er een kaart op Vandaag met Back-up maken, tenzij je browser je vaste map zonder vragen vrijgeeft.' },
      { head: 'Bewaren', text: 'het aantal dat je kiest (het advies is 8) blijft staan, oudere gaan weg. Wat je er zelf in zet blijft altijd staan. Lukt een back-up niet, dan staat dat hier en op Vandaag.' },
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
  'ruimte-app': {
    title: 'Ruimte op dit toestel',
    lead: 'Je browser reserveert een deel van de ruimte op je telefoon voor ASCEND. Hier zie je hoeveel daarvan in gebruik is.',
    points: [
      { head: 'Bijna vol', text: 'boven 80 % krijg je een waarschuwing. Maak dan een back-up en verwijder de reeksen onder Ruimte van reeksen. De kilometers blijven.' },
      { head: 'Ongeveer', text: 'de browser geeft een schatting, geen exact getal.' },
    ],
  },
  momentopnamen: {
    title: 'Kopieën van voor een import',
    lead: 'Voor elke import blijft een kopie bewaard, zodat je terug kunt. De laatste vijf blijven.',
    points: [
      { head: 'Waarom', text: 'een import vervangt je gegevens. Met de kopie kun je terug als het niet is wat je dacht.' },
    ],
  },
  'reeksen-bewaren': {
    title: 'Volledige reeks bewaren',
    lead: 'Je horloge meet bijna elke seconde je tempo, hartslag en hoogte. Dat kan helemaal op deze telefoon bewaard blijven.',
    points: [
      { head: 'Waarvoor', text: 'kilometer na kilometer, de rondes van je horloge en de grafieken van een loop. Verandert je drempel later, dan gaat de berekening opnieuw, zonder iets op te halen.' },
      { head: 'Ruimte', text: 'ongeveer 120 KB voor een uur lopen, enkele tientallen MB per jaar.' },
      { head: 'Uit', text: 'alleen de samenvatting en de kilometers. Wat al bewaard is blijft staan. Je route wordt nooit bewaard, alleen de richting per kilometer, voor de wind.' },
    ],
  },
  'reeksen-backup': {
    title: 'Reeksen in back-up',
    lead: 'De reeksen van je horloge komen van intervals.icu, en die kan ze later misschien niet meer geven. Daarom gaan die van de laatste 2 jaar standaard mee in je back-up.',
    points: [
      { head: 'De laatste 2 jaar', text: 'ongeveer 100 KB per training, 15 tot 25 MB per jaar.' },
      { head: 'Alle of geen', text: 'alle reeksen geeft een back-up die elk jaar groeit. Geen reeksen geeft een kleine back-up. Na een herstel komen ze opnieuw binnen zolang dat kan.' },
      { head: 'Altijd mee', text: 'de samenvatting per loop: kilometers, rondes en je beste stukken. Kopieën van voor een import bevatten de reeksen nooit.' },
    ],
  },
  'ochtend-backup': {
    title: 'Ochtendgetallen in back-up',
    lead: 'Je slaap, rusthartslag en HRV komen van intervals.icu. Geeft die ze later niet meer, dan is je telefoon het enige exemplaar. Daarom gaan ze standaard mee in je back-up.',
    points: [
      { head: 'Wat mee gaat', text: 'per ochtend de datum, je rusthartslag, je HRV, hoe lang je sliep en je slaapscore. Niets anders van je horloge. Zolang dit aan staat blijven ze op je telefoon, ook na 400 dagen en als je ontkoppelt.' },
      { head: 'Let op', text: 'het back-upbestand bevat dan ook gezondheidsgegevens. Bewaar het waar alleen jij erbij kunt.' },
      { head: 'Uit', text: 'een back-up zonder ochtendgetallen. Zet je dit uit zonder koppeling, dan komt er eerst een vraag, want de bewaarde ochtenden gaan dan van je telefoon.' },
    ],
  },
  aangepast: {
    title: 'Aangepaste instellingen',
    lead: 'Hier staat wat jij anders instelde dan het advies.',
    points: [
      { head: 'Tikken', text: 'een regel opent de instelling zelf. Kies je het advies, dan staat het terug.' },
      { head: 'Alles terugzetten', text: 'zet alles terug naar het advies. Raakt het je planning, dan verandert die zoals je bij Wijzigingen koos: eerst een voorstel, of meteen met een melding en ongedaan maken.' },
    ],
  },
  wissen: {
    title: 'Alles verwijderen',
    lead: 'Wist alles op deze telefoon. Maak eerst een back-up, want dit kan niet terug.',
    points: [
      { head: 'Eerst een back-up', text: 'maak er een bij Laatste back-up, dan kun je alles later terugzetten.' },
    ],
  },
  'auto-bijwerken': {
    title: 'Automatisch bijwerken',
    lead: 'De app kijkt bij het openen of er een nieuwe versie is, haalt hem op de achtergrond op en gebruikt hem bij de volgende start.',
    points: [
      { head: 'Wat er naar buiten gaat', text: 'niets van jou. Alleen een klein versiebestand en de nieuwe versie komen van de site van ASCEND.' },
      { head: 'Gaat het mis', text: 'start een nieuwe versie niet goed, dan valt de app terug op de vorige. Vraagt een versie een nieuwe toestemming, dan zegt de app dat er een nieuwe klaarstaat om te installeren.' },
      { head: 'Uit', text: 'de app blijft zoals hij is tot je zelf een nieuwe installeert.' },
    ],
  },
  'voorstellen-opruimen': {
    title: 'Oude voorstellen opruimen',
    lead: 'Elk voorstel blijft bewaard met alle details. Na een paar maanden blijft er een korte regel over.',
    points: [
      { head: 'Blijft staan', text: 'de datum, de titel, of je Akkoord of Liever niet koos, en wat het uit je planning haalde.' },
      { head: 'Nooit', text: 'een voorstel dat nog open staat, een training die er nog aan vastzit, iets wat je ongedaan maakte, of een vrije periode die nog bestaat.' },
      { head: 'Wanneer', text: 'bij het openen van een nieuwe versie en vlak voor je een back-up maakt.' },
    ],
  },
  herbouwen: {
    title: 'Adviezen opnieuw berekenen',
    lead: 'Je planning en je adviezen krijgen een nieuwe berekening. Er verdwijnt niets.',
    points: [
      { head: 'Meestal niet nodig', text: 'het gebeurt vanzelf na een update of import. Dit is een noodknop.' },
    ],
  },
  startniveau: {
    title: 'Startniveau zelf invullen',
    lead: 'Meestal niet nodig, want wat ontbreekt, komt vanzelf als vraag. Hier vul je het in als je dat liever doet.',
    points: [
      { head: 'Je historie', text: 'blijft zoals hij was.' },
    ],
  },
};

// ASCEND: de instellingen van de groep Gegevens en back-up (docs/visie/Ontwerp instellingen op een plek.md).
//
// Stap 1: alleen de teksten en de plek, één keer gegenereerd uit de exports van 14 november en daarna met de
// hand bijgewerkt. De bron blijft data/settingsIndex.ts, settingsLayout.ts, settingsHelp.ts en
// settingsChoices.ts tot stap 2 en 3; settingsDefs.parity.test.ts bewaakt dat de teksten gelijk zijn. De volgorde
// is die van de pagina: een rij, met daaronder wat in haar blad staat.

import { B } from './parts';
import type { SettingDef } from './types';

export const GEGEVENS: SettingDef[] = [
  {
    id: 'backup',
    page: 'gegevens',
    place: { row: true },
    title: 'Laatste back-up',
    note: 'Bewaar al je gegevens in een bestand, of zet er een terug.',
    keywords: ['exporteren', 'importeren', 'export', 'import', 'bestand', 'bewaren', 'terugzetten', 'herstellen', 'json'],
    help: {
      title: 'Laatste back-up',
      lead: 'Al je gegevens in één bestand, om te bewaren of terug te zetten.',
      points: [
        { head: 'Alleen hier', text: 'alles staat alleen op deze telefoon, dus dit is je enige kopie.' },
      ],
    },
  },
  {
    id: 'auto-backup',
    page: 'gegevens',
    place: { row: true },
    title: 'Automatische back-up',
    note: 'Wekelijks op zondagavond, dagelijks of uit. In de app komt het bestand vanzelf in een map, in de browser zet Vandaag een kaart neer.',
    keywords: ['automatisch', 'back-up', 'backup', 'wekelijks', 'dagelijks', 'zondag', 'elke dag', 'vanzelf', 'bestand', 'map', 'google drive', 'kopie', 'herinnering'],
    help: {
      title: 'Automatische back-up',
      lead: 'Alles staat alleen op deze telefoon. Met een wekelijkse back-up raak je hoogstens een week kwijt, met dagelijks hoogstens een dag.',
      points: [
        { head: 'Wanneer', text: 'zondagavond vanaf 18:00, of bij dagelijks elke avond. Is de app dan dicht, dan gebeurt het de eerstvolgende keer dat je hem opent.' },
        { head: 'In de app en in de browser', text: 'de app maakt het bestand zelf in Interne opslag > Documents > ASCEND. Er gaat niets naar buiten. In de browser staat er een kaart op Vandaag met Back-up maken, tenzij je browser je vaste map zonder vragen vrijgeeft.' },
        { head: 'Bewaren', text: 'het aantal dat je kiest (het advies is 8) blijft staan, oudere ruimt ASCEND op. Wat je er zelf in zet blijft altijd staan. Lukt een back-up niet, dan zegt ASCEND dat hier en op Vandaag.' },
      ],
    },
    helpKey: 'autoBackup',
    choice: {
      key: 'autoBackup',
      def: {
        group: 'Gegevens en back-up',
        title: 'Automatische back-up',
        line: 'Wanneer ASCEND vanzelf een back-up maakt.',
        advice: 'weekly',
        help: 'autoBackup',
        options: [
          { value: 'weekly', label: 'Wekelijks', note: 'Zondagavond vanaf 18:00', short: 'Wekelijks' },
          { value: 'daily', label: 'Dagelijks', note: 'Elke avond vanaf 18:00', short: 'Dagelijks' },
          { value: 'off', label: 'Uit', note: 'Je maakt hem zelf, na 7 dagen herinnert Vandaag je eraan', short: 'Uit' },
        ],
      },
    },
  },
  {
    id: 'backup-bewaren',
    page: 'gegevens',
    place: { in: 'auto-backup' },
    title: 'Back-ups bewaren',
    note: 'Hoeveel back-ups ASCEND in de map laat staan. Oudere die ASCEND zelf maakte ruimt hij op.',
    keywords: ['bewaren', 'opruimen', 'oude back-ups', 'aantal', 'map', 'ruimte', 'laatste 8'],
    choice: {
      key: 'autoBackupKeep',
      def: {
        group: 'Gegevens en back-up',
        title: 'Bewaren',
        line: 'Hoeveel back-ups ASCEND in de map laat staan.',
        advice: 8,
        help: 'autoBackup',
        options: [
          { value: 4, label: 'De laatste 4', short: '4' },
          { value: 8, label: 'De laatste 8', note: 'Bij wekelijks ongeveer twee maanden', short: '8' },
          { value: 16, label: 'De laatste 16', short: '16' },
          { value: 0, label: 'Alles bewaren', note: 'ASCEND ruimt niets op', short: 'Alles' },
        ],
      },
    },
  },
  {
    id: 'backupmap',
    page: 'gegevens',
    place: { row: true },
    title: 'Back-up: vaste map',
    rowTitle: 'Vaste map',
    note: 'Een vaste map waar de back-up automatisch naartoe gaat.',
    keywords: ['map', 'folder', 'downloads', 'vaste plek', 'export', 'back-upmap'],
    help: {
      title: 'Vaste map',
      lead: 'Een map die de browser onthoudt, zodat een back-up daar vanzelf landt.',
      points: [
        { head: 'Niet gekozen', text: 'dan bewaar je het bestand elke keer zelf.' },
        { head: 'In de app', text: 'gaat de automatische back-up naar Interne opslag > Documents > ASCEND op je telefoon. Die map zie je in je bestandsbeheerder, en een app die mappen naar Google Drive kopieert kan hem meenemen.' },
      ],
    },
    showWhen: [B.folder],
  },
  {
    id: 'toestemmingen',
    page: 'gegevens',
    place: { row: true },
    title: 'Toestemmingen',
    note: 'Wat je telefoon ASCEND toestaat: meldingen, de exacte wekker en Health Connect.',
    keywords: ['toestemming', 'toestemmingen', 'rechten', 'meldingen', 'wekker', 'alarm', 'exact', 'android', 'health connect', 'stappen', 'trappen', 'opslag'],
    help: {
      title: 'Toestemmingen',
      lead: 'Wat je telefoon ASCEND toestaat. Zonder een toestemming werkt alleen dat ene ding niet.',
      points: [
        { head: 'Amber stip', text: 'een toestemming staat uit terwijl iets wat je aan hebt staan hem nodig heeft.' },
        { head: 'Exacte wekker', text: 'zonder kan een melding een paar minuten te laat komen. Voor het einde van je rust is dat te laat.' },
        { head: 'Back-up van Android', text: 'een kopie van je gegevens in je Google-back-up, versleuteld met je schermvergrendeling. Je eigen back-up blijft de echte. Boven ongeveer 25 MB slaat Android hem over.' },
        { head: 'Widget', text: 'de widget Vandaag onthoudt alleen de naam en duur van je training van vandaag. Ben je ziek, dan staat er alleen Rust vandaag. Dat staat op deze telefoon en gaat nergens heen.' },
      ],
    },
  },
  {
    id: 'locatie',
    page: 'gegevens',
    place: { in: 'toestemmingen' },
    title: 'Je locatie',
    note: 'Alleen je plek van nu, voor het weer en voor je etappe. Niets bewaard of gedeeld behalve de afgeronde plek die het weer nodig heeft.',
    keywords: ['locatie', 'gps', 'plek', 'waar ben ik', 'weer', 'etappe', 'tocht', 'toestemming', 'privacy', 'onderweg', 'bergweer'],
    help: {
      title: 'Je locatie',
      lead: 'Alleen je plek van nu. Niets wordt bewaard of gedeeld, behalve de afgeronde plek die het weer nodig heeft.',
      points: [
        { head: 'Waarvoor', text: 'het weer op je plek, en op een tochtdag hoeveel kilometer je nog hebt tot het eind van je etappe.' },
        { head: 'Toestemming', text: 'je telefoon of browser vraagt die pas als je dit aanzet. Lukt het niet binnen tien seconden, dan blijft dit uit en zie je waarom.' },
        { head: 'Wat blijft', text: 'het weer bewaart je plek afgerond op ongeveer een kilometer. Je plek op een etappe verdwijnt als je de app sluit. Geen route, geen spoor. Uit: het weer blijft op de laatste plek.' },
      ],
    },
  },
  {
    id: 'opslag',
    page: 'gegevens',
    place: { in: 'toestemmingen' },
    title: 'Opslag beschermd',
    note: 'Vraagt de telefoon om je gegevens niet zomaar op te ruimen.',
    keywords: ['opslag', 'beveiligen', 'verlies', 'wissen', 'browser', 'persistent', 'beschermen'],
  },
  {
    id: 'ruimte-app',
    page: 'gegevens',
    place: { row: true },
    title: 'Ruimte op dit toestel',
    note: 'Hoeveel ruimte ASCEND op deze telefoon gebruikt, met een waarschuwing als het krap wordt.',
    keywords: ['ruimte', 'opslag', 'vol', 'krap', 'megabyte', 'gigabyte', 'grootte', 'quota', 'geheugen'],
    help: {
      title: 'Ruimte op dit toestel',
      lead: 'Je browser geeft ASCEND een deel van de ruimte op je telefoon. Hier zie je hoeveel daarvan in gebruik is.',
      points: [
        { head: 'Bijna vol', text: 'boven 80 % waarschuwt ASCEND. Maak dan een back-up en verwijder de reeksen onder Ruimte van reeksen. De kilometers blijven.' },
        { head: 'Ongeveer', text: 'de browser geeft een schatting, geen exact getal.' },
      ],
    },
    helpKey: 'ruimteApp',
  },
  {
    id: 'momentopnamen',
    page: 'gegevens',
    place: { row: true },
    title: 'Kopieën van voor een import',
    note: 'Een kopie die ASCEND maakt vóór een import, om terug te kunnen.',
    keywords: ['snapshot', 'kopie', 'terug', 'ongedaan', 'import', 'momentopnamen'],
    help: {
      title: 'Kopieën van voor een import',
      lead: 'Voor elke import bewaart ASCEND een kopie, zodat je terug kunt. De laatste vijf blijven.',
      points: [
        { head: 'Waarom', text: 'een import vervangt je gegevens. Met de kopie kun je terug als het niet is wat je dacht.' },
      ],
    },
  },
  {
    id: 'reeksen-bewaren',
    page: 'gegevens',
    place: { row: true },
    title: 'Volledige reeks bewaren',
    note: 'Bewaart per loop of tocht alles wat je horloge schreef, zodat ASCEND er kilometers en rondes uit kan rekenen.',
    keywords: ['reeks', 'reeksen', 'streams', 'kilometers', 'rondes', 'ruimte', 'opslag', 'horloge', 'loopgegevens', 'seconde'],
    help: {
      title: 'Volledige reeks bewaren',
      lead: 'Je horloge meet bijna elke seconde je tempo, hartslag en hoogte. ASCEND kan dat helemaal op deze telefoon bewaren.',
      points: [
        { head: 'Waarvoor', text: 'kilometer na kilometer, de rondes van je horloge en de grafieken van een loop. Verandert je drempel later, dan rekent ASCEND opnieuw zonder iets op te halen.' },
        { head: 'Ruimte', text: 'ongeveer 120 KB voor een uur lopen, enkele tientallen MB per jaar.' },
        { head: 'Uit', text: 'alleen de samenvatting en de kilometers. Wat al bewaard is blijft staan. Je route wordt nooit bewaard, alleen de richting per kilometer, voor de wind.' },
      ],
    },
    helpKey: 'reeksenBewaren',
  },
  {
    id: 'reeksen-backup',
    page: 'gegevens',
    place: { row: true },
    title: 'Reeksen in back-up',
    note: 'Welke volledige reeksen meegaan in je back-up: de laatste 2 jaar, alle of geen. De kilometers gaan altijd mee.',
    keywords: ['reeks', 'reeksen', 'back-up', 'backup', 'groot', 'klein', 'grootte', 'exporteren', 'horloge', '2 jaar', 'twee jaar'],
    help: {
      title: 'Reeksen in back-up',
      lead: 'De reeksen van je horloge komen van intervals.icu, en die kan ze later misschien niet meer geven. Daarom gaan die van de laatste 2 jaar standaard mee in je back-up.',
      points: [
        { head: 'De laatste 2 jaar', text: 'ongeveer 100 KB per training, 15 tot 25 MB per jaar.' },
        { head: 'Alle of geen', text: 'alle reeksen geeft een back-up die elk jaar groeit. Geen reeksen geeft een kleine back-up. Na een herstel haalt ASCEND ze opnieuw op zolang dat kan.' },
        { head: 'Altijd mee', text: 'de samenvatting per loop: kilometers, rondes en je beste stukken. Kopieën van voor een import bevatten de reeksen nooit.' },
      ],
    },
    helpKey: 'reeksenBackup',
    choice: {
      key: 'reeksenBackup',
      def: {
        group: 'Gegevens en back-up',
        title: 'Reeksen in back-up',
        line: 'Welke volledige reeksen van je horloge mee gaan.',
        advice: 'twoYears',
        help: 'reeksenBackup',
        options: [
          { value: 'twoYears', label: 'De laatste 2 jaar', note: 'Ongeveer 15 tot 25 MB per jaar', short: '2 jaar' },
          { value: 'all', label: 'Alle reeksen', note: 'De back-up groeit elk jaar mee', short: 'Alle' },
          { value: 'none', label: 'Geen reeksen', note: 'Een kleine back-up, de kilometers gaan wel mee', short: 'Geen' },
        ],
      },
    },
  },
  {
    id: 'reeksen-ruimte',
    page: 'gegevens',
    place: { row: true },
    title: 'Ruimte van reeksen',
    note: 'Hoeveel ruimte de reeksen op dit toestel innemen, met de keuze om ze te verwijderen.',
    keywords: ['reeks', 'reeksen', 'ruimte', 'opslag', 'megabyte', 'verwijderen', 'wissen', 'grootte'],
  },
  {
    id: 'ochtend-backup',
    page: 'gegevens',
    place: { row: true },
    title: 'Ochtendgetallen in back-up',
    note: 'Je slaap, rusthartslag en HRV gaan mee in je back-up, zodat ze niet verloren gaan als de bron stopt.',
    keywords: ['ochtend', 'slaap', 'rusthartslag', 'hrv', 'wellness', 'back-up', 'backup', 'exporteren', 'horloge', 'garmin', 'gezondheid'],
    help: {
      title: 'Ochtendgetallen in back-up',
      lead: 'Je slaap, rusthartslag en HRV komen van intervals.icu. Geeft die ze later niet meer, dan is je telefoon het enige exemplaar. Daarom gaan ze standaard mee in je back-up.',
      points: [
        { head: 'Wat mee gaat', text: 'per ochtend de datum, je rusthartslag, je HRV, hoe lang je sliep en je slaapscore. Niets anders van je horloge. Zolang dit aan staat blijven ze op je telefoon, ook na 400 dagen en als je ontkoppelt.' },
        { head: 'Let op', text: 'het back-upbestand bevat dan ook gezondheidsgegevens. Bewaar het waar alleen jij erbij kunt.' },
        { head: 'Uit', text: 'een back-up zonder ochtendgetallen. Zet je dit uit zonder koppeling, dan vraagt ASCEND eerst, want de bewaarde ochtenden gaan dan van je telefoon.' },
      ],
    },
    helpKey: 'ochtendBackup',
  },
  {
    id: 'aangepast',
    page: 'gegevens',
    place: { row: true },
    title: 'Aangepaste instellingen',
    note: 'Wat je zelf anders instelde dan het advies, met de keuze om het terug te zetten.',
    keywords: ['advies', 'anders', 'terugzetten', 'standaard', 'reset', 'fabrieksinstellingen', 'aangepast'],
    help: {
      title: 'Aangepaste instellingen',
      lead: 'Hier staat wat jij anders instelde dan het advies.',
      points: [
        { head: 'Tikken', text: 'een regel opent de instelling zelf. Kies je het advies, dan staat het terug.' },
        { head: 'Alles terugzetten', text: 'zet alles terug naar het advies. Raakt het je planning, dan verandert die zoals je bij Wijzigingen koos: eerst een voorstel, of meteen met een melding en ongedaan maken.' },
      ],
    },
  },
  {
    id: 'wissen',
    page: 'gegevens',
    place: { row: true },
    title: 'Alles verwijderen',
    note: 'Wist alles op deze telefoon en begint opnieuw. Dit kan niet terug.',
    keywords: ['reset', 'wissen', 'leegmaken', 'opnieuw beginnen', 'verwijderen', 'demo'],
    help: {
      title: 'Alles verwijderen',
      lead: 'Wist alles op deze telefoon. Maak eerst een back-up, want dit kan niet terug.',
      points: [
        { head: 'Eerst een back-up', text: 'maak er een bij Laatste back-up, dan kun je alles later terugzetten.' },
      ],
    },
  },
  {
    id: 'auto-bijwerken',
    page: 'gegevens',
    place: { row: true, advanced: true },
    title: 'Automatisch bijwerken',
    note: 'De Android-app haalt een nieuwe versie stil op en gebruikt hem bij de volgende start.',
    keywords: ['bijwerken', 'update', 'nieuwe versie', 'versie', 'android', 'apk', 'automatisch'],
    help: {
      title: 'Automatisch bijwerken',
      lead: 'De app kijkt bij het openen of er een nieuwe versie is, haalt hem op de achtergrond op en gebruikt hem bij de volgende start.',
      points: [
        { head: 'Wat er naar buiten gaat', text: 'niets van jou. ASCEND vraagt alleen een klein versiebestand en de nieuwe versie op bij de site van ASCEND.' },
        { head: 'Gaat het mis', text: 'start een nieuwe versie niet goed, dan valt de app terug op de vorige. Vraagt een versie een nieuwe toestemming, dan zegt de app dat er een nieuwe klaarstaat om te installeren.' },
        { head: 'Uit', text: 'de app blijft zoals hij is tot je zelf een nieuwe installeert.' },
      ],
    },
    helpKey: 'autoBijwerken',
    showWhen: [B.liveUpdate],
  },
  {
    id: 'voorstellen-opruimen',
    page: 'gegevens',
    place: { row: true, advanced: true },
    title: 'Oude voorstellen opruimen',
    note: 'Besliste voorstellen worden na 3 maanden kort samengevat, zodat je gegevens klein blijven.',
    keywords: ['voorstel', 'voorstellen', 'opruimen', 'samenvatten', 'wijzigingen', 'logboek', 'ruimte', 'oud'],
    help: {
      title: 'Oude voorstellen opruimen',
      lead: 'ASCEND bewaart elk voorstel met alle details. Na een paar maanden maakt het daar een korte regel van.',
      points: [
        { head: 'Blijft staan', text: 'de datum, de titel, of je Akkoord of Liever niet koos, en wat het uit je planning haalde.' },
        { head: 'Nooit', text: 'een voorstel dat nog open staat, een training die er nog aan vastzit, iets wat je ongedaan maakte, of een vrije periode die nog bestaat.' },
        { head: 'Wanneer', text: 'bij het openen van een nieuwe versie en vlak voor je een back-up maakt.' },
      ],
    },
    helpKey: 'voorstellenOpruimen',
    choice: {
      key: 'voorstellenOpruimen',
      def: {
        group: 'Gegevens en back-up',
        title: 'Oude voorstellen opruimen',
        line: 'Besliste voorstellen worden na een tijd kort samengevat.',
        advice: 3,
        help: 'voorstellenOpruimen',
        options: [
          { value: 3, label: 'Na 3 maanden', short: 'Na 3 maanden' },
          { value: 6, label: 'Na 6 maanden', short: 'Na 6 maanden' },
          { value: 12, label: 'Na een jaar', short: 'Na een jaar' },
          { value: 0, label: 'Nooit', note: 'Elk voorstel blijft met alle details staan', short: 'Nooit' },
        ],
      },
    },
  },
  {
    id: 'herbouwen',
    page: 'gegevens',
    place: { row: true, advanced: true },
    title: 'Adviezen opnieuw berekenen',
    note: 'Laat ASCEND nu meteen opnieuw kijken. Er wordt niets verwijderd.',
    keywords: ['herbouw', 'adviezen', 'vernieuwen', 'opnieuw', 'aanbevelingen'],
    help: {
      title: 'Adviezen opnieuw berekenen',
      lead: 'ASCEND kijkt opnieuw naar je planning en je adviezen. Er wordt niets verwijderd.',
      points: [
        { head: 'Meestal niet nodig', text: 'ASCEND doet het zelf na een update of import. Dit is een noodknop.' },
      ],
    },
  },
  {
    id: 'startniveau',
    page: 'gegevens',
    place: { row: true, advanced: true },
    title: 'Startniveau zelf invullen',
    note: 'Meestal niet nodig: ASCEND vraagt zelf wat nog ontbreekt.',
    keywords: ['baseline', 'niveau', 'conditie', 'bewijs', 'invullen', 'beginnen'],
    help: {
      title: 'Startniveau zelf invullen',
      lead: 'Meestal niet nodig, want ASCEND vraagt zelf wat ontbreekt. Hier vul je het in als je dat liever doet.',
      points: [
        { head: 'Je historie', text: 'blijft zoals hij was.' },
      ],
    },
  },
  {
    id: 'versie',
    page: 'gegevens',
    place: { row: true, footer: true },
    title: 'Versie en bijwerken',
    note: 'Welke versie je hebt, en zoeken naar een nieuwere.',
    keywords: ['update', 'bijwerken', 'nieuwe versie', 'vernieuwen', 'build'],
  },
];

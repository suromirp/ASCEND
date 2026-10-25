// ASCEND — Reisplanner: the tasks on the way to the GR5 that are not training
// (docs/visie/GR5-reis en coaching.md, idee 2). Fixed data, no AI.
//
// Each task has a window in weeks before the main goal, like the topics in
// data/knowledge.ts: from the most weeks before to the fewest. The task is
// "aan de beurt" from the week it opens and fits until the week it closes;
// what is not done by then simply stays open, never overdue or red.
// Which task is the one of this week is a pure function in
// engine/journey.ts. The texts are for a solo trek with a tent.
//
// Rules and prices change (bivouac rules especially): every task that
// leans on one says "controleer" and carries a link.

export interface JourneyLink {
  label: string;
  // Either an outside page or a screen inside ASCEND.
  url?: string;
  to?: string;
}

export interface JourneyTask {
  id: string;
  title: string;
  // Why, in a sentence or three, with the numbers explained.
  why: string;
  // Weeks before the main goal: [opens, closes]. opens >= closes >= 1.
  window: [number, number];
  link?: JourneyLink;
}

export const JOURNEY_TASKS: JourneyTask[] = [
  {
    id: 'grote-drie-kiezen',
    title: 'Kies je tent, slaapzak en matje',
    why: 'Deze drie bepalen samen de helft van je basisgewicht. Richtgetallen voor augustus: een eenpersoons dubbelwandige tent van ongeveer 1.100 g (in de Vanoise en de Mercantour moet het een laag model zijn), een donzen slaapzak met comfort rond 0 °C van ongeveer 850 g, en een opblaasbaar matje met R-waarde 3 tot 4 van ongeveer 450 g. De R-waarde zegt hoe goed het matje van de koude grond isoleert.',
    window: [41, 35],
    link: { label: 'Je paklijst', to: '/reis/paklijst' },
  },
  {
    id: 'besluit-dagen',
    title: 'Besluit hoeveel dagen je loopt en vraag verlof aan',
    why: 'Dertig loopdagen zonder rustdag is met tent en 12 tot 15 kg krap. Met 32 tot 35 dagen en een rustdag per vijf tot zeven etappes loop je veiliger. Reken de reisdagen heen en terug mee.',
    window: [41, 34],
  },
  {
    id: 'verzekering',
    title: 'Regel je verzekering',
    why: 'Een gewone reisverzekering dekt bergwandelen buiten gebaande paden lang niet altijd. Het lidmaatschap van de NKBV (de Nederlandse bergsportvereniging) geeft een reisverzekering met bergsportdekking, inclusief opsporing en redding. Lees de voorwaarden en bewaar het polisnummer voor je vertrekbrief.',
    window: [41, 30],
    link: { label: 'Consumentenbond over bergwandelen', url: 'https://www.consumentenbond.nl/reisverzekering/bergwandelen-niet-altijd-verzekerd' },
  },
  {
    id: 'route-keuze',
    title: 'Kies je route: hoofdroute of varianten',
    why: 'De GR55 door de hoge Vanoise en de GR52 naar Menton zijn mooier en hoger, maar de bivakregels en de bevoorrading zijn er anders. Beslis nu of je dat vooraf vastlegt of onderweg kiest.',
    window: [40, 30],
    link: { label: 'De GR5 in etappes', to: '/kennis/route-gr5' },
  },
  {
    id: 'grote-drie-kopen',
    title: 'Koop je tent, slaapzak en matje',
    why: 'Koop ze deze winter, dan kun je ze in het voorjaar uitgebreid testen. Weeg alles bij thuiskomst: dat gewicht ga je invullen in je paklijst.',
    window: [36, 27],
  },
  {
    id: 'rugzak-kiezen',
    title: 'Kies een rugzak die 15 kg aankan',
    why: 'Een rugzak van 50 tot 60 liter met stevige heupband, gemaakt voor 15 kg, weegt ongeveer 1.300 g. Pas hem in een winkel met gewicht erin: de heupband draagt het meeste.',
    window: [34, 26],
    link: { label: 'Je rugzak pakken', to: '/kennis/uitrusting-pakken' },
  },
  {
    id: 'alles-wegen',
    title: 'Weeg alles en vul je paklijst in',
    why: 'Zo zie je je basisgewicht (alles wat in de rugzak zit, zonder eten en water) en weet je waar je 100 of 200 g kunt besparen. Het voorbeeld in de paklijst komt uit op ongeveer 7,8 kg.',
    window: [30, 24],
    link: { label: 'Je paklijst', to: '/reis/paklijst' },
  },
  {
    id: 'meet-zweetverlies',
    title: 'Meet je zweetverlies',
    why: 'Hoeveel je zweet verschilt sterk van mens tot mens, en op de GR5 loop je zomerdagen van 6 tot 8 uur waar bronnen soms uren uit elkaar liggen. Weeg jezelf zonder kleren en na het plassen, vlak voor en vlak na een lange wandeling of loop op een warme dag. Schrijf op wat je dronk, en wat je onderweg plaste. Open daarna de training in je Logboek en kies Zweetverlies. Een kilo minder is ongeveer een liter zweet. Met twee metingen weet ASCEND je tempo bij die temperatuur en rekent het water per etappe daarmee. Deze taak is af zodra je twee metingen hebt.',
    window: [16, 4],
    link: { label: 'Water per etappe', to: '/etappes' },
  },
  {
    id: 'reservering-data',
    title: 'Zoek uit wanneer je bivakplekken kunt reserveren',
    why: 'In de drie natuurreservaten van de Haute-Savoie reserveer je bivakplekken online. In het hart van de Vanoise mag je alleen bivakkeren bij bepaalde refuges en op reservering. Kijk in januari wanneer de reserveringen opengaan en noteer de data.',
    window: [30, 25],
    link: { label: 'Reserveringssite Haute-Savoie', url: 'https://bivouac.nature-haute-savoie.fr' },
  },
  {
    id: 'schoenen',
    title: 'Kies je schoenen en begin met inlopen',
    why: 'Nieuwe schoenen op de eerste dag is een klassieke fout. Loop ze minstens 6 weken en 100 km in voor vertrek. Laat ze op een winterwandeling kennismaken met je voeten.',
    window: [31, 14],
    link: { label: 'Voeten, schoenen en blaren', to: '/kennis/voeten-blaren' },
  },
  {
    id: 'kaarten-gpx',
    title: 'Haal kaarten en de GPX van elke etappe offline binnen',
    why: 'De officiële site geeft per etappe afstand, hoogtemeters en een GPX (het routebestand voor je horloge of telefoon). De route verandert: zo ligt er een omleiding bij Peisey. Haal ze nu binnen en controleer ze in de laatste weken nog een keer.',
    window: [29, 20],
    link: { label: 'Route per etappe', url: 'https://www.grande-traversee-alpes.com/en/litineraire-par-troncons/' },
  },
  {
    id: 'kookset',
    title: 'Kies je brander, pan en waterfilter',
    why: 'Een brander met schroefdraad past op de meeste gascartouches. In kleine dorpen ligt soms alleen Campingaz met een eigen aansluiting, dus koop gas in de grote plaatsen. Richtgewicht: brander, pan en lepel samen ongeveer 235 g.',
    window: [28, 22],
  },
  {
    id: 'slaapplan',
    title: 'Bepaal per gebied waar je slaapt',
    why: 'De regels verschillen per gebied: de Haute-Savoie met reservering, de Vanoise alleen bij bepaalde refuges, de Queyras op meer dan een uur van het dorp, de Mercantour van 19.00 tot 9.00 uur. Slapen in je tent en eten in de hut is voor een sologanger vaak de beste combinatie: minder eten dragen en mensen spreken.',
    window: [27, 18],
    link: { label: 'Slapen: hutten, bivak en tent', to: '/kennis/slapen-hutten-bivak' },
  },
  {
    id: 'thuisfront',
    title: 'Spreek de dagelijkse check-in af met je thuisfront',
    why: 'Wie weet waar je slaapt en hoe laat je een bericht stuurt? Spreek ook af wat er gebeurt als het bericht uitblijft, bijvoorbeeld na twee uur bellen en na zes uur 112 bellen met je etappeplan erbij. Er staat niemand naast je die zegt dat het zo niet verder gaat, dus de afspraak moet vooraf.',
    window: [26, 14],
  },
  {
    id: 'kookset-testen',
    title: 'Test je brander en filter thuis',
    why: 'Kook één keer een maaltijd op je eigen brander en filter water uit de kraan of een beek. Je wilt niet pas in de bergen ontdekken dat een onderdeel ontbreekt.',
    window: [24, 17],
  },
  {
    id: 'satelliet-kiezen',
    title: 'Kies hoe je noodhulp regelt zonder bereik',
    why: 'Een Garmin-horloge belt zelf geen hulpdiensten en werkt alleen met mobiel bereik. Voor dalen en kampplekken zonder bereik is een satellietcommunicator het echte vangnet (rond 300 tot 400 euro, plus een abonnement dat sinds juni 2025 per maand opzegbaar is). Heb je een recente iPhone, dan kan die via satelliet een noodoproep doen: zoek zelf uit of dat voor jou geldt.',
    window: [24, 19],
    link: { label: 'Kosten Garmin inReach', url: 'https://gpstraining.co.uk/blogs/news/garmin-simplifies-inreach-subscription-plans-june-2025-update' },
  },
  {
    id: 'eerste-nacht',
    title: 'Slaap een eerste nacht alleen buiten, dichtbij huis',
    why: 'Zet je tent op, kook, slaap en pak de ochtend erna in. Het hoeft niet ver: het gaat erom wat je mist en wat niet werkt. Zoek een plek waar het mag.',
    window: [21, 14],
    link: { label: 'Trainingsplekken', to: '/plekken' },
  },
  {
    id: 'satelliet-kopen',
    title: 'Koop je satellietcommunicator en test hem',
    why: 'Stuur een testbericht naar thuis, buiten, met vrij zicht op de lucht. Pas dan weet je dat de koppeling met je telefoon werkt en dat thuis het bericht ook echt ontvangt.',
    window: [19, 13],
  },
  {
    id: 'vervoer-uitzoeken',
    title: 'Zoek je reis heen en terug uit',
    why: 'De start ligt bij Thonon-les-Bains of Saint-Gingolph, het eind bij Menton of Nice. Vanuit Nederland is de trein via Parijs, of via Genève en de Léman Express naar Thonon, de logische heenreis. Terug kan met de TGV vanaf Nice. Dezelfde bussen zijn je uitwijkroute bij slecht weer of een blessure.',
    window: [18, 12],
    link: { label: 'Bereikbaarheid van de GTA', url: 'https://www.grande-traversee-alpes.com/en/portfolio-item/les-transports/' },
  },
  {
    id: 'etappeplan',
    title: 'Maak een grof etappeplan met rustdagen',
    why: 'Plak etappes aan elkaar tot dagen die bij je passen, houd de eerste drie dagen licht en plan elke vijf tot zeven dagen een rustdag of korte dag. Noteer erbij waar je slaapt en waar je eten kunt kopen.',
    window: [18, 10],
  },
  {
    id: 'bivakweekend',
    title: 'Boek een plek voor je eerste bivakweekend',
    why: 'Twee dagen met 12 kg en zelf koken is de eerste echte test van je opzet. De Eifel heeft trekkingplekken met een composttoilet die je boekt voor 10 tot 15 euro per tent per nacht. Controleer de regels en prijzen voor je boekt.',
    window: [17, 11],
    link: { label: 'Trekkingplekken Eifel', url: 'https://www.eifel.info/en/book/trekking-sites' },
  },
  {
    id: 'bivak-reserveren',
    title: 'Reserveer je bivakplekken',
    why: 'Doe het zodra het kan, want de plekken in de Vanoise (ongeveer 20) en bij de reservaten in de Haute-Savoie zijn beperkt. Een bivakplek bij een refuge kost een paar euro. Zorg voor een tweede plan op de nachten die niet lukken.',
    window: [15, 9],
    link: { label: 'Bivak in de Vanoise', url: 'https://www.ffrandonnee.fr/s-informer/actualites/le-bivouac-dans-le-c%C5%93ur-du-parc-national-de-la-vanoise' },
  },
  {
    id: 'trein-heen',
    title: 'Boek de trein heen',
    why: 'Boek de heenreis en kies een ticket dat je kunt omboeken, want je vertrekdatum kan nog verschuiven. Controleer de dienstregeling en de prijs zelf voor je boekt.',
    window: [14, 8],
  },
  {
    id: 'repetitie',
    title: 'Plan je generale repetitie van drie dagen',
    why: 'Drie dagen met volle uitrusting en rond 14 kg in de heuvels (de Eifel, de Ardennen of de Vogezen). Kies plek en dagen nu, dan kan het in juni. Daarna maak je je paklijst definitief.',
    window: [13, 8],
    link: { label: 'Trainingsplekken', to: '/plekken' },
  },
  {
    id: 'omkeerregels',
    title: 'Schrijf je omkeerregels op',
    why: 'Bijvoorbeeld: onweer voorspeld na 14.00 uur betekent dat je de hoge col voor 12.00 uur over bent, anders neem je de lage variant. Een regel die je vooraf opschrijft houdt stand als je moe bent.',
    window: [12, 6],
    link: { label: 'Onweer herkennen', to: '/kennis/weer-onweer' },
  },
  {
    id: 'bevoorrading',
    title: 'Plan waar je eten en gas koopt',
    why: 'Je hoeft zelden meer dan twee tot drie dagen eten te dragen. Grote plaatsen op de route zijn onder andere Thonon, Les Houches, Chamonix, Bourg-Saint-Maurice, Modane, Briançon en Guillestre. In het zuiden worden de gaten groter. Rond 15 augustus (Maria Hemelvaart) kan alles tegelijk vol en dicht zijn.',
    window: [10, 5],
  },
  {
    id: 'paklijst-definitief',
    title: 'Maak je paklijst definitief',
    why: 'Na je generale repetitie weet je wat je niet gebruikte en wat je miste. Haal weg wat niet nodig was en vink alleen af wat minstens één keer buiten is geweest.',
    window: [9, 5],
    link: { label: 'Je paklijst', to: '/reis/paklijst' },
  },
  {
    id: 'terugreis',
    title: 'Kies hoe je terugreist',
    why: 'Je einddatum is onzeker, dus kies een ticket dat je kunt omboeken of boek pas kort van tevoren. Zoek het dichtstbijzijnde station bij je eindpunt op.',
    window: [8, 3],
  },
  {
    id: 'vertrekbrief',
    title: 'Schrijf je vertrekbrief voor thuis',
    why: 'Zet erin: je data, waar je naar verwachting slaapt, je uitwijkroutes, je check-in-tijd, het nummer van je satellietcommunicator en je polisnummer. Geef hem een week voor vertrek aan je thuisfront.',
    window: [7, 2],
    link: { label: 'Als het misgaat', to: '/kennis/noodgevallen' },
  },
  {
    id: 'satelliet-abonnement',
    title: 'Zet het abonnement van je satellietcommunicator aan',
    why: 'Het abonnement is per maand opzegbaar, dus zet het pas aan voor de laatste testweken en de tocht. Reken op ongeveer 18 euro per maand plus eenmalig rond 50 euro activering.',
    window: [6, 2],
  },
  {
    id: 'regels-controle',
    title: 'Controleer de bivakregels nog een keer',
    why: 'De bronnen spreken elkaar over de precieze periodes en uren tegen en regels veranderen. Kijk per gebied op de officiële site en noteer wat er geldt op de nachten die je hebt gepland.',
    window: [5, 2],
    link: { label: 'Bivak op de GTA', url: 'https://www.ffrandonnee.fr/s-informer/actualites/le-bivouac-sur-la-grande-traversee-des-alpes-gr-5-gta' },
  },
  {
    id: 'weer-sneeuw',
    title: 'Check weer en sneeuw op de hoge cols',
    why: 'Oude sneeuwvelden kunnen begin augustus nog liggen op de hoogste passen. Kijk een week voor vertrek naar de voorspelling en naar recente berichten van de refuges, en bedenk een lage variant.',
    window: [3, 1],
    link: { label: 'Sneeuwvelden in de zomer', to: '/kennis/sneeuw-velden' },
  },
  {
    id: 'laatste-week',
    title: 'Laatste controle voor vertrek',
    why: 'Contant geld voor refuges, je paspoort en verzekeringspapieren, offline kaarten, opgeladen apparaten. Gas mag niet mee in het vliegtuig, dus koop het bij de start.',
    window: [2, 1],
  },
];

export function journeyTaskById(id: string): JourneyTask | undefined {
  return JOURNEY_TASKS.find((t) => t.id === id);
}

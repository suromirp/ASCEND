import type { KnowledgeContent } from '../knowledge';

const content: KnowledgeContent = {
  intro:
    'In augustus trekt er op veel middagen bewolking over de cols van de GR5, en op een pas boven 2500 m zit je dan zomaar in de wolk met 20 m zicht. Het pad is meestal nog te volgen, maar op brede weiden, puinvelden en oude sneeuw verdwijnen pad en markering tegelijk. Wie een paar vaste technieken beheerst, loopt dan gewoon door, of weet precies waarom hij wacht.',
  weeklyTip:
    'Zie je de volgende wit-rode markering niet meer, loop dan terug naar de laatste die je wel zag, niet vooruit.',
  sections: [
    {
      heading: 'Voordat de wolk er is',
      items: [
        'Kijk in de bergweersverwachting (Météo-France montagne, MeteoSchweiz) naar de wolkenbasis. Ligt die onder de hoogte van je col, dan loop je er middenin.',
        'Lees de etappe \'s ochtends op de kaart: waar is het pad breed en duidelijk, waar loopt het over een open weide of plateau, waar ligt een sneeuwveld. Daar moet je straks scherp zijn.',
        'Zie je wolken aankomen, kijk dan even goed en prent je de richting van het pad in: op welke rug, naar welk dal, met hoeveel graden ongeveer.',
        'Noteer het tijdstip en je hoogte bij elk vast punt (col, hut, splitsing). Dat wordt straks je referentie.',
      ],
    },
    {
      heading: 'In de wolk: de vaste technieken',
      items: [
        'Kort het doel in. Loop van herkenbaar punt naar herkenbaar punt (een beekje, een bocht, een markeringspaal), stukken van 200 tot 500 m.',
        'Leuning: volg een lijn in het terrein die je niet kunt missen, een beek, een rug, een hek, een duidelijke rand.',
        'Opvanglijn: kies een lijn achter je doel die je stopt als je eroverheen schiet, bijvoorbeeld een dalbodem of een meer.',
        'Bewust ernaast mikken: wil je een brug of een hut aan een beek vinden, mik dan met opzet een paar graden links ervan. Kom je bij de beek uit, dan weet je zeker dat je rechtsaf moet.',
        'Haasje-over in een groep: één loper gaat vooruit tot de rand van het zicht, de ander stuurt met het kompas bij, dan schuift de achterste op.',
      ],
    },
    {
      heading: 'Afstand meten zonder zicht',
      body:
        'In mist wordt elke afstand langer. Tel dubbelpassen: de meeste mensen zetten op vlak terrein zo\'n 60 tot 70 dubbelpassen per 100 m, bergop en met je rugzak (12 tot 15 kg met tent) meer. Meet je eigen waarde thuis op een atletiekbaan en in een helling. Tijd werkt ook: volgens de DAV-norm (DIN 33466) reken je met 4 km per uur vlak, 300 m stijgen of 500 m dalen per uur. De kleinste van horizontale en verticale tijd halveer je en tel je op bij de grootste. In dichte mist loop je trager, reken op de helft. Je hoogtemeter is in de wolk je beste vriend: zit je op 2450 m en ligt de col op 2510 m, dan weet je hoe ver je nog moet.',
    },
    {
      heading: 'GPS als vangnet, niet als hoofdzaak',
      body:
        'Met de course op je Forerunner 255 krijg je een waarschuwing zodra je van de lijn afwijkt, en TracBack brengt je over je eigen spoor terug. Op een sneeuwveld of breed plateau is dat goud waard. Let op twee dingen: het horloge toont geen terrein, dus het weet niet dat er tussen jou en de lijn een afgrond ligt, en vlak onder steile wanden springt de positie soms tientallen meters. Combineer: GPS voor de richting, kaart en hoogte voor wat er tussen ligt.',
    },
    {
      heading: 'Wanneer je beter stil blijft staan',
      body:
        'Stoppen is een navigatietechniek, geen nederlaag. De Deutscher Alpenverein zegt het kort: blijf staan en stel eerst vast waar je bent. Doe dat zodra je twee markeringen mist, je hoogte niet meer klopt met de kaart of je op een sneeuwveld de uitgang niet ziet. Zoek een beschutte plek, eet iets, trek een laag aan en wacht een kwartier: wolken op een col breken vaak open. Een sneeuwveld dat je in mist niet veilig kunt oversteken laat je liggen; keer om naar de laatste zekere plek of neem de alternatieve route.',
    },
  ],
  videos: [
    {
      title: 'The Alpkit Survival Guide | How to Navigate in Poor Visibility with the Edale Mountain Rescue',
      channel: 'Alpkit',
      url: 'https://www.youtube.com/watch?v=CiYYN5FBEds',
      minutes: 3,
      language: 'en',
      note: 'Een bergreddingsteam laat zien hoe zij navigeren in mist.',
    },
    {
      title: 'Lost in a whiteout? What to do?',
      channel: 'Glenmore Lodge',
      url: 'https://www.youtube.com/watch?v=vLkijkQ4pKQ',
      minutes: 4,
      language: 'en',
      note: 'Het Schotse nationale outdoorcentrum over wat je doet als alles wit is.',
    },
    {
      title: 'Winter Navigation: Distance, timing and pacing',
      channel: 'Glenmore Lodge',
      url: 'https://www.youtube.com/watch?v=RyxSjRAPSi4',
      minutes: 3,
      language: 'en',
      note: 'Passen tellen en tijd meten, precies wat je in een wolk nodig hebt.',
    },
    {
      title: 'How to Navigate in Poor Visibility using leapfrogging',
      channel: 'Sperrin Outdoors',
      url: 'https://www.youtube.com/watch?v=xapvzqZXjRo',
      minutes: 6,
      language: 'en',
      note: 'De haasje-over-techniek met twee of meer mensen uitgelegd.',
    },
  ],
  sources: [
    { label: 'DAV BergwanderCheck: Nebel, dichte Wolken, Whiteout', url: 'https://www.alpenverein.de/artikel/bergwandercheck-nebel-dichte-wolken-whiteout_7ef7b669-8e8a-4722-bb48-f34135ec7aa2' },
    { label: 'DAV: Gehzeitrechner', url: 'https://www.alpenverein.de/Gehzeitrechner/' },
    { label: 'Mountaineering Ireland: navigatie oefenen in slecht zicht (pdf)', url: 'https://www.mountaineering.ie/_files/202111117130_48929277.pdf' },
  ],
};

export default content;

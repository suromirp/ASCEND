import type { KnowledgeContent } from '../knowledge';

const content: KnowledgeContent = {
  intro:
    'De meeste lawineslachtoffers maken hun lawine zelf los, op een helling die ze zelf kozen. Wie begrijpt hoe een sneeuwdek breekt, een bulletin echt kan lezen en hellingshoek als harde grens gebruikt, kan in de winter veel meer en in de zomer weet je waarom een oude lawinekegel op je pad iets vertelt.',
  weeklyTip:
    'Onder de 30 graden komt een plaatlawine zelden van de grond: meet de steilste stukken van je route, en kijk ook naar wat erboven ligt.',
  sections: [
    {
      heading: 'Hoe een lawine ontstaat',
      body:
        'Een sneeuwdek is een stapel lagen, elke sneeuwval en elke windperiode een nieuwe. Gevaarlijk wordt het als een samenhangende laag, de plaat, op een zwakke laag ligt, zoals begraven rijp of grove, suikerachtige kristallen. Breekt die zwakke laag door extra gewicht (een skiër, een wandelaar, nieuwe sneeuw), dan loopt de breuk zijwaarts door en glijdt de hele plaat in één keer weg, soms ook vanaf een afstand of van onderaf losgemaakt. Dat is de plaatlawine, verantwoordelijk voor bijna alle doden. Een losse-sneeuwlawine begint in één punt en waaiert uit; gevaarlijk vooral als die je van je voeten trekt boven een afgrond. Natte lawines ontstaan als smeltwater of regen het sneeuwdek verzwakt, typisch bij warmte en in de middag. Alarmsignalen ter plaatse: een doffe "woem" onder je voeten, scheuren die van je ski\'s wegschieten, verse lawines op vergelijkbare hellingen, veel nieuwe sneeuw met wind, en snelle opwarming.',
    },
    {
      heading: 'De vijf lawineproblemen',
      items: [
        'Nieuwe sneeuw: tijdens en tot een paar dagen na een flinke sneeuwval, zodra de kritische hoeveelheid nieuwe sneeuw bereikt is.',
        'Ingewaaide sneeuw (windplaat): wind blaast sneeuw naar de luwte, achter kammen, in geulen en kommen. Vaak goed te herkennen aan duinvormen en overhangende wechten. Meestal een paar dagen kritisch.',
        'Oude sneeuw (persistente zwakke laag): een begraven zwakke laag die weken tot maanden actief blijft. Moeilijk te zien, vaak op afstand of op dunne plekken los te maken. Het verraderlijkste probleem, ook bij lage gevarengraad.',
        'Natte sneeuw: water verzwakt het sneeuwdek. Speelt bij warmte, regen en in de lente op de middag. Vroeg vertrekken en vroeg binnen zijn is hier de hele strategie.',
        'Glijsneeuw: het hele sneeuwpakket glijdt over gladde grond als gras of rotsplaten. Je ziet de scheuren (vissenbekken) vooraf, maar wanneer het loskomt is nauwelijks te voorspellen. Niet eronder blijven staan.',
      ],
    },
    {
      heading: 'De gevarenschaal en het bulletin',
      body:
        'Europa gebruikt sinds 1993 één schaal van 1 tot 5: gering, matig, aanzienlijk, groot, zeer groot (in Frankrijk faible, limité, marqué, fort, très fort). De schaal is niet lineair: het risico verdubbelt ruwweg per stap. Volgens het SLF valt zo\'n 50 procent van de doden bij niveau 3 en zo\'n 30 procent bij niveau 2, gewoon omdat er dan veel mensen op pad zijn. Het SLF verfijnt vanaf niveau 2 met min, neutraal en plus, en EAWS heeft in 2025 de onderliggende beoordelingsmatrix als standaard vastgelegd; de vijf niveaus zelf zijn gebleven. Lees een bulletin in deze volgorde: gevarengraad, dan de hoogte en hellingsrichtingen waar het geldt (het kompasroosje), dan het lawineprobleem, dan de tekst en de trend. Het probleem vertelt je meer over wat je moet doen dan het getal. Zwitserland: SLF. Frankrijk: Météo-France, het BERA per massief. Alle Europese diensten vind je via avalanches.org.',
    },
    {
      heading: 'Terrein: hellingshoek en vallen',
      items: [
        'In Zwitserse gegevens begint 96 procent van de lawines op hellingen tussen 30 en 50 graden, de meeste tussen 34 en 45. Meet het steilste stuk, niet het gemiddelde, met de hellingskleuren op een digitale kaart of een app.',
        'Terreinvallen maken een kleine lawine dodelijk: een geul of beekdal waar sneeuw zich meters diep ophoopt, kliffen eronder, bomen, een meer.',
        'ATES (Canada, nu wereldwijd gebruikt) deelt terrein in van 0, geen lawinegevaar, via eenvoudig, uitdagend en complex tot 4, extreem. De Avaluator combineert die terreinklasse met de lawinesituatie tot een advies.',
        'Munters reductiemethode: gevarenpotentieel 2, 4, 8 of 16 bij niveau 1 tot 4, gedeeld door reductiefactoren. Steilste stuk 35 tot 39 graden geeft factor 2, rond 34 graden factor 4, onder 30 graden factor 6; daarbij factoren voor het mijden van de kritische hellingsrichtingen en voor groepsgrootte en afstand. Uitkomst 1 of lager is het aanvaarde restrisico.',
      ],
    },
    {
      heading: 'Plannen en de groep',
      body:
        'Munters 3x3-filter is een handig denkkader: sneeuw, terrein en mens, beoordeeld thuis bij de planning, ter plaatse in het gebied en aan de voet van de helling zelf. Plan een route met uitwijkmogelijkheden en een vast keerpunt. Spreek af dat iedereen nee mag zeggen en dat één nee genoeg is. Steile stukken ga je één voor één, van veilige plek naar veilige plek, met oogcontact. Grotere afstanden verminderen de belasting en zorgen dat niet iedereen tegelijk bedolven raakt. De bekende valkuilen zijn menselijk: vertrouwdheid met een plek, haast, een groep die het al wil, en verse sporen die veiligheid suggereren.',
    },
    {
      heading: 'Uitrusting en kameradenhulp',
      body:
        'Pieper, sonde en schep horen bij elkaar; zonder één ervan is redden nauwelijks mogelijk. Test bij vertrek of iedereen zendt. Volgens de Nature-studie van Falk en Brugger (1994) is na 15 minuten nog ruim 90 procent in leven, daarna stort de kans in tot ongeveer een derde rond 35 minuten, als het slachtoffer geen luchtholte heeft. Een studie uit 2024 over 1981 tot 2020 laat zien dat die gunstige fase eerder 10 minuten is. Kameraden redden gemiddeld veel sneller dan georganiseerde hulp, dus de groep zelf is de redding. Volgorde: kijk waar je iemand het laatst zag, iedereen pieper op zoeken, alarm 112 zodra het kan zonder het zoeken op te houden, grof zoeken, fijn zoeken laag bij de sneeuw, sonderen in een spiraal tot je raakt, sonde laten staan. Graaf vanaf een stuk onder de sonde, zo\'n anderhalf keer de bedekkingsdiepte, en schep met meerdere mensen als een lopende band. Eerst hoofd en luchtweg vrij. Een opgeblazen airbag halveerde in een studie uit 2014 de sterfte (van 22 naar 11 procent), maar ging in 20 procent van de gevallen niet open, meestal door de gebruiker.',
    },
    {
      heading: 'In de zomer',
      body:
        'Op de GR5 in augustus speelt vooral natte sneeuw: op warme middagen kunnen oude sneeuwvelden op steile hellingen boven het pad nog afglijden, zeker na een sneeuwrijke winter. Oude lawinekegels in dalen zijn hard, soms vol stenen en ondergraven door smeltwater. Een zomerse sneeuwval op 2500 m met wind vormt weer verse windplaten op steile passen; geef het dan een dag of twee met zon en warmte.',
    },
  ],
  videos: [
    {
      title: 'Avalanche Rescue: How to Use Your Beacon, Probe & Shovel',
      channel: 'MSRGear',
      url: 'https://www.youtube.com/watch?v=X90kUtxMd_Q',
      language: 'en',
      note: 'Overzicht van een zoekactie met pieper, sonde en schep in de juiste volgorde.',
    },
    {
      title: 'Avalanche Rescue Series: Organizing a Backcountry Rescue',
      channel: 'Backcountry Access',
      url: 'https://www.youtube.com/watch?v=gywtmukgt8s',
      language: 'en',
      note: 'Hoe je als groep een redding organiseert: wie zoekt, wie belt, wie graaft.',
    },
    {
      title: 'Wind Slab avalanche problem',
      channel: 'CAIC',
      url: 'https://www.youtube.com/watch?v=OJiAeHDJoNU',
      language: 'en',
      note: 'Het lawinecentrum van Colorado legt uit hoe windplaten ontstaan en waar je ze vindt.',
    },
    {
      title: 'So viele Lawinen! | Wie entsteht der Lawinenlagebericht?',
      channel: 'Deutscher Alpenverein (DAV)',
      url: 'https://www.youtube.com/watch?v=a4P-y3I5DPw',
      language: 'de',
      note: 'Het hoofd van de Beierse lawinedienst laat zien hoe een bulletin tot stand komt, zodat je het beter leest.',
    },
  ],
  sources: [
    {
      label: 'EAWS: de Europese lawinegevarenschaal',
      url: 'https://www.avalanches.org/standards/avalanche-danger-scale/',
    },
    {
      label: 'EAWS: de typische lawineproblemen',
      url: 'https://www.avalanches.org/standards/avalanche-problems/',
    },
    {
      label: 'SLF: gevarenniveaus, verdeling van ongevallen en aanbevelingen',
      url: 'https://www.slf.ch/en/avalanche-bulletin-and-snow-situation/about-the-avalanche-bulletin/danger-levels/',
    },
    {
      label: 'avalanche.org: Avalanche Terrain Exposure Scale (ATES)',
      url: 'https://avalanche.org/avalanche-encyclopedia/terrain/avalanche-terrain-exposure/avalanche-terrain-exposure-scale-ates/',
    },
    {
      label: 'Haegeli e.a. (2014): de effectiviteit van lawine-airbags',
      url: 'https://pubmed.ncbi.nlm.nih.gov/24909367/',
    },
    {
      label: 'PlanetSKI: overlevingskans bij bedelving sinds 1994 (JAMA Network Open, 2024)',
      url: 'https://planetski.eu/2024/09/29/survival-rate-for-avalanche-burials-increases-by-10-since-1994/',
    },
  ],
};

export default content;

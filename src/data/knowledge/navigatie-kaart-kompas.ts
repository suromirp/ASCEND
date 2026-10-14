import type { KnowledgeContent } from '../knowledge';

const content: KnowledgeContent = {
  intro:
    'De GR5 is goed gemarkeerd, maar markeringen verdwijnen onder oude sneeuw, in mist en op brede alpenweiden waar tien paadjes door elkaar lopen. Wie de kaart kan lezen als landschap, ziet vooraf waar een pas steil wordt, waar het pad een rug volgt en waar je een fout snel opmerkt. Dat maakt je sneller en rustiger, ook als je de GPS gewoon aan hebt.',
  weeklyTip:
    'Leg bij elke pauze de kaart op het noorden en wijs drie dingen aan die je echt ziet: een top, een meer, een bergkam.',
  sections: [
    {
      heading: 'Welke kaarten, welke schaal',
      body:
        'Op de Franse GR5 loop je op IGN-kaarten. De TOP 25 (blauwe kaft) is 1:25.000: 1 cm op de kaart is 250 m in het terrein, en een vakje van het kilometerraster is 4 cm. In de bergen is de equidistantie (hoogteverschil tussen twee hoogtelijnen) 10 m, in vlak land soms 5 m; check altijd de legenda. Elke vijfde lijn is dikker en heeft een hoogtegetal. Rond Col de Chésery kom je kort langs en over de Zwitserse grens. Swisstopo-kaarten zijn 1:25.000 met 20 m equidistantie in de Alpen (10 m in het laagland), of 1:50.000 met 20 m. Italiaanse wandelkaarten (Tabacco, Fraternali) hebben op 1:25.000 meestal 25 m tussen de lijnen. Wissel je van kaart, dan wisselt dus ook je gevoel voor steilte.',
    },
    {
      heading: 'Hoogtelijnen lezen zoals een gids',
      items: [
        'Lijnen dicht op elkaar is steil. Liggen ze op een TOP 25 1 mm uit elkaar, dan stijg je 10 m over 25 m: ongeveer 22 graden. Bij een halve millimeter is het al bijna 40 graden, en lopen ze samen dan is het rots.',
        'Een V die naar boven wijst is een dal of greppel, een V of U die naar beneden wijst is een rug of uitloper. Volg in gedachten waar het water heen loopt.',
        'Een col is een zadel: twee lijnenbundels die elkaar bijna raken met hogere grond aan twee kanten. Een pas op de GR5 herken je zo voordat je de naam leest.',
        'Op de kaart hoort niet alleen het pad. Kijk naar grijs puin, rotsarcering en blauwe gletsjerlijnen: daar ligt in augustus kans op oude sneeuw op noordhellingen.',
      ],
    },
    {
      heading: 'Je kompas en de declinatie',
      body:
        'Een kompas met doorzichtige grondplaat en draaibare ring (bijvoorbeeld Silva of Suunto) is genoeg. Magnetisch noorden ligt in augustus 2027 langs de hele route ongeveer 3 graden oost van het ware noorden, volgens het World Magnetic Model van NOAA; de waarde schuift elk jaar ongeveer 0,1 graad op en staat ook in de kaartrand. Van kaart naar terrein trek je die 3 graden af, van terrein naar kaart tel je ze op. Zonder correctie zit je na 1 km ongeveer 50 m naast je doel. Houd het kompas weg van je telefoon, horloge en de magneet van een kaarthoes, die trekken de naald gemakkelijk een paar graden scheef.',
    },
    {
      heading: 'Een koers nemen in drie stappen',
      items: [
        'Leg de rand van de grondplaat van waar je bent naar waar je heen wilt, pijl in looprichting.',
        'Draai de ring tot de noordlijnen in het kompas evenwijdig lopen met het kilometerraster, met N naar het noorden van de kaart. Corrigeer de declinatie.',
        'Houd het kompas plat voor je borst, draai je lichaam tot de rode naald in het pijltje op de ring valt en loop in de richting van de looprichtingspijl. Kies een rotsblok in die lijn en loop daarheen, niet naar de naald.',
      ],
    },
    {
      heading: 'Waar ben ik: positie bepalen',
      body:
        'De makkelijkste methode op een pad: je weet dat je op de GR5 staat, dus je zoekt alleen nog hoe ver. Neem een koers op een herkenbare top of col, zet die terug op de kaart (declinatie erbij) en waar die lijn het pad kruist, sta je. Twee koersen op twee punten die minstens 60 graden uit elkaar liggen geven een kruispunt zonder pad. Je hoogtemeter is daarbij een derde lijn: hoogte plus pad levert vaak al een punt op. IJk hem op de bordjes van de Franse wegwijzers, die meestal plaatsnaam en hoogte tonen.',
    },
    {
      heading: 'Markeringen onderweg',
      body:
        'GR-routes in Frankrijk zijn gemarkeerd met een witte streep boven een rode, 10 bij 2 cm. Een geknikte wit-rode markering betekent afslaan, een wit-rood kruis betekent: niet deze kant op. Geel-rood is een GR de Pays, geel een kortere PR. Rood-wit geschilderde boomgrenzen van gemeentebossen lijken op GR-markering, dus volg de kaart als iets niet klopt. In Zwitserland heten bergpaden wit-rood-wit, in Italië markeert de CAI met rood-wit-rood en een padnummer.',
    },
  ],
  videos: [
    {
      title: "Comment s'orienter avec une boussole et une carte IGN ?",
      channel: 'IGNcommunication',
      url: 'https://www.youtube.com/watch?v=XfFVhjWUrfw',
      minutes: 3,
      language: 'fr',
      note: 'Het IGN zelf laat zien hoe je kompas en TOP 25-kaart samen gebruikt.',
    },
    {
      title: 'Hill Walking: How to Take a Bearing using your Map and Compass',
      channel: 'BMC TV',
      url: 'https://www.youtube.com/watch?v=GH8iXHjdAYw',
      minutes: 2,
      language: 'en',
      note: 'Kort en helder: een koers nemen van kaart naar terrein.',
    },
    {
      title: 'Understanding contour lines with Steve Backshall and Ordnance Survey',
      channel: 'Ordnance Survey',
      url: 'https://www.youtube.com/watch?v=4i_6eToM3X8',
      minutes: 1,
      language: 'en',
      note: 'Hoogtelijnen in één minuut omgezet naar echt terrein.',
    },
    {
      title: 'Conseil : Comment utiliser une boussole en randonnée',
      channel: 'CIMALP TV',
      url: 'https://www.youtube.com/watch?v=37CDUaTSkEc',
      minutes: 10,
      language: 'fr',
      note: 'Uitgebreider over het kompas in het veld, inclusief kaart oriënteren.',
    },
  ],
  sources: [
    { label: 'NOAA NCEI: Magnetic Field Calculators (declinatie)', url: 'https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml' },
    { label: 'FFRandonnée: balisage, repérer les bonnes balises', url: 'https://www.ffrandonnee.fr/s-informer/actualites/balisage-reperer-les-bonnes-balises' },
    { label: 'Randozone: les courbes de niveau', url: 'https://www.randozone.com/article/les-courbes-de-niveau-cartographie-randonnee/' },
    { label: 'IGN: livret Découvrez la carte', url: 'https://www.ign.fr/publications-de-l-ign/institut/Ressources_pedagogiques/livret_decouvrez_LMDC.pdf' },
  ],
};

export default content;

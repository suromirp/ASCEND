import type { KnowledgeContent } from '../knowledge';

const content: KnowledgeContent = {
  intro:
    'Het Alpendeel van de GR5, de Grande Traversée des Alpes, loopt van het Meer van Genève naar Nice: afhankelijk van bron en varianten 600 tot 675 km, met volgens de FFRandonnée zo\'n 30.000 m stijgen. Wie de opbouw kent, weet waar de hoge passen zitten, waar je kunt kiezen en waar je moet bijtanken. Dat maakt een maand lopen overzichtelijk in plaats van één lange onbekende lijn.',
  weeklyTip:
    'Ken de zes secties: Chablais naar Les Houches, Mont Blanc en Beaufortain, Vanoise, Briançonnais en Queyras, Ubaye en Mercantour, en de afdaling naar Nice.',
  sections: [
    {
      heading: 'De opbouw in zes secties',
      body:
        'De Cicerone-gids van Paddy Dillon deelt de route op in 28 etappes van 15 tot 29 km, de FFRandonnée telt er 36 kortere. Reken op ongeveer een maand. Sectie 1: St-Gingolph of Thonon naar Les Houches, via Samoëns en het Refuge de Moëde Anterne. Sectie 2: Les Houches naar Landry, rond de westkant van de Mont Blanc. Sectie 3: Landry naar Modane, dwars door de Vanoise via Val d\'Isère. Sectie 4: Modane naar Ceillac, via de Mont Thabor en Briançon. Sectie 5: Ceillac naar St-Dalmas, door de Ubaye en de Mercantour. Sectie 6: St-Dalmas via Utelle en Aspremont naar Nice.',
    },
    {
      heading: 'De hoge passen',
      items: [
        'Col du Bonhomme, 2329 m, en direct daarna de Croix du Bonhomme, rond 2480 m: lang en open, tussen Les Contamines en Plan de la Lai.',
        'Col du Palet, 2652 m: boven Tignes, op weg naar Val d\'Isère.',
        'Col de l\'Iseran, 2764 m: het hoogste punt van de hoofdroute, tussen Val d\'Isère en Bessans.',
        'Col Girardin, 2699 m: de overgang van de Queyras naar de Ubaye, vanaf Ceillac langs het Lac Sainte-Anne.',
        'Col de Mallemort, 2558 m, en Col des Fourches, 2262 m: de eerste dagen in de Mercantour, van Maljasset via Larche naar Bousieyas.',
      ],
    },
    {
      heading: 'Varianten die je onderweg kiest',
      items: [
        'GR55 door de Vanoise: drie etappes hoog, met de Col de Chavière van rond 2800 m. Volgens Dillon het op een na hoogste punt van alle routes samen.',
        'Col des Fours: alternatief voor de Iseran tussen Val d\'Isère en Bessans, hoger en ruiger.',
        'GR5E: twee lage etappes van Bonneval naar Modane door het dal van de Arc. Je uitwijkroute als de hoge Vanoise slecht is.',
        'Col de Tricot: een steilere en mooiere dag van Les Houches naar Les Contamines.',
        'GR52: zes etappes vanaf St-Dalmas door de Vallée des Merveilles naar Menton, wilder en hoger dan het laatste stuk naar Nice.',
      ],
    },
    {
      heading: 'Waar het zwaar is',
      body:
        'De Vanoise is het hoogste blok: meerdere dagen achter elkaar boven de 2500 m, met de Iseran als dak. Queyras en Ubaye geven lange dagen met grote hoogteverschillen tussen afgelegen dorpen, en tussen Auron en St-Dalmas zit je in de stilste stukken van de Mercantour, met weinig voorzieningen. De laatste drie etappes zijn laag, maar in augustus vaak heet en droog. Neem daar meer water mee dan je gewend bent.',
    },
    {
      heading: 'Begin augustus op pad',
      body:
        'Het seizoen loopt van juni tot september. Begin augustus zijn de meeste passen meestal sneeuwvrij, maar onder de hoogste cols, vooral op noordhellingen in de Vanoise en rond de Girardin, kunnen oude sneeuwvelden blijven liggen. Hoeveel verschilt sterk per jaar. Half juli tot half augustus is ook de Franse vakantie: het beste weer, maar volle refuges en gîtes. De vereniging Grande Traversée des Alpes vermeldt zo\'n honderd adressen langs de route. Reserveer in de drukke weken een paar dagen vooruit.',
    },
  ],
  videos: [
    {
      title: 'The GR5 Highlights from Lake Geneva to Nice',
      channel: 'Cicerone Press',
      url: 'https://www.youtube.com/watch?v=4r9aM8HjK5A',
      language: 'en',
      note: 'Van de uitgever van de bekendste GR5-gids: in korte tijd een beeld van het landschap per sectie.',
    },
    {
      title: '6 Days Alone in the French Alps: Tour du Mont Thabor (Hiking Film)',
      channel: 'Michal Škrabálek',
      url: 'https://www.youtube.com/watch?v=jVhfFK9kugc',
      language: 'en',
      note: 'Een rustige film over het gebied rond de Mont Thabor, waar de GR5 tussen Modane en Briançon doorheen loopt.',
    },
  ],
  sources: [
    { label: 'FFRandonnée: La Grande Traversée des Alpes, GR 5', url: 'https://www.ffrandonnee.fr/s-informer/actualites/la-grande-traversee-des-alpes-gta-gr-5-une-aventure-a-vivre-a-pied-dans-les-alpes' },
    { label: 'Cicerone: The GR5 Trail (etappes, varianten, seizoen)', url: 'https://www.cicerone.co.uk/the-gr5-trail' },
    { label: 'Paddy Dillon: The GR5 Trail', url: 'https://www.paddydillon.co.uk/guidebook/the-gr5-trail/' },
    { label: 'Envie de Queyras: Col Girardin', url: 'https://www.envie-de-queyras.com/guide/itineraires/col-girardin/' },
  ],
};

export default content;

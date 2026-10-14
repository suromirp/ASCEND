import type { KnowledgeContent } from '../knowledge';

const content: KnowledgeContent = {
  intro:
    'Op de GR5 ga je weken achter elkaar elke dag over een of twee passen tussen 2000 en 2800 m. Het weer bepaalt zelden of je loopt, wel hoe laat je vertrekt, welke variant je kiest en of de tweede pas vandaag of morgen komt. Wie een bergverwachting kan lezen en de lucht kan duiden, loopt rustiger en verder.',
  weeklyTip:
    'Lees de avond ervoor de verwachting voor de hoogte van je pas, niet voor het dal, en kijk om 9 uur naar de lucht: stapelwolken boven de toppen voor 10 uur betekent onweer al vroeg in de middag.',
  sections: [
    {
      heading: 'Welke bron voor welk stuk',
      items: [
        'Meteo-France (app en meteofrance.com, rubriek Montagne): de basis, want de GR5 ligt in Frankrijk. Kies de plaats die het hoogst ligt bij je pas, niet het dorp in het dal. Kijk ook naar de vigilance-kaart: oranje voor orages in je departement betekent zware buien.',
        'MeteoSwiss (app): handig voor de eerste etappes in de Chablais, tegen het Wallis aan. Je ziet de neerslagkans per uur en een grijze band die laat zien hoe onzeker de hoeveelheid is.',
        'ARPA Piemonte en het Centro funzionale van Valle d\'Aosta: de Italiaanse kant. Hun bulletins geven het nulgradenniveau (zero termico) en de wind op 3000 m. Relevant vanaf de Haute-Maurienne tot de Mercantour, omdat slecht weer uit het oosten daar uit Italië komt.',
        'Meteoblue multimodel en Bergfex: leg meerdere modellen naast elkaar. Liggen ze dicht bij elkaar, dan is de verwachting betrouwbaar. Lopen ze ver uiteen, plan dan een kortere dag of een uitwijkroute.',
        'De gardien van de hut: kent het lokale patroon en hangt de verwachting vaak bij de ingang.',
      ],
    },
    {
      heading: 'Wat je uit een verwachting haalt',
      items: [
        'Nulgradenniveau: in augustus meestal tussen 3500 en 4500 m. Zakt het onder de 2500 m, dan is het koud op de passen en kan er verse sneeuw liggen.',
        'Temperatuur: reken op ongeveer 0,6 tot 0,7 °C koeler per 100 m. Is het 26 °C in Modane op 1050 m, dan is het op de Col de Chavière (2796 m) rond de 15 °C, zonder wind.',
        'Wind op 2000 en 3000 m: windstoten boven de 60 km/u maken een open kam met 12 kg op je rug onrustig en koud. Harde zuidwestenwind op hoogte gaat vaak vooraf aan een front.',
        'Onweer: lees de tekst, niet het icoontje. "Orages l\'après-midi" is het gewone zomerpatroon. "Orages dès la mi-journée" of onweer in de nacht en de ochtend wijst op een front of heel onstabiele lucht.',
      ],
    },
    {
      heading: 'Het zomerpatroon: warmteonweer',
      body:
        'Op een mooie zomerdag warmt de zon de zuidhellingen op. Vanaf de late ochtend stroomt warme lucht langs de hellingen omhoog, en boven de toppen ontstaan stapelwolken. Groeien die sneller in de hoogte dan in de breedte, dan worden het torens en uiteindelijk een onweersbui met aambeeld. Zulke warmteonweders zijn plaatselijk en komen volgens de Oostenrijkse Alpenverein meestal in de late middag en de avond, met juli als onweersrijkste maand, gevolgd door augustus. Tijdens een periode van mooi weer neemt de onweerskans per dag toe, en de wolken bouwen elke dag iets eerder op. Kleine torentjes op een wolkenlaag op middelhoogte in de vroege ochtend (altocumulus castellanus) betekenen onstabiele lucht: reken dan op buien voor de middag. Een heldere, koude nacht is een goed teken, een benauwde, bewolkte nacht niet.',
    },
    {
      heading: 'Fronten en weer uit Italië',
      items: [
        'Een koufront komt meestal uit het westen of noordwesten. Het onweer ervan valt op elk uur, ook in de nacht of de ochtend, maar het is goed voorspeld en trekt als een lijn over. Daarna kan het 10 °C kouder zijn en blijft het soms dagen fris.',
        'Voorboden van een warmtefront: sluierbewolking (cirrus) die dikker wordt, een kring om de zon, dan een grijze laag waar de zon wazig doorheen schijnt. Regen volgt vaak binnen 12 tot 24 uur.',
        'Lenswolken boven de toppen (lenticularis) betekenen harde wind op hoogte, vaak bij föhn of een naderende verandering.',
        'Retour d\'est: een lagedrukgebied boven de Golf van Genua duwt vochtige lucht uit de Povlakte tegen de grens. Dan regent of onweert het hard in de Haute-Maurienne, het Queyras en de Ubaye, terwijl het verder naar het westen droog blijft. Het duurt meestal hooguit een paar dagen. Kijk dan vooral naar de Italiaanse bulletins.',
      ],
    },
    {
      heading: 'Een dag rond het weer plannen',
      items: [
        'Vertrek bij het eerste licht. Begin augustus komt de zon rond half zeven op, en de koelste, stabielste uren zijn de eerste.',
        'Op een dag met onweerskans wil je rond het middaguur over je hoogste punt zijn en in de vroege middag bij de hut of in het dal.',
        'Heeft de etappe twee passen, beslis dan op de eerste pas rond 11 uur of je de tweede nog doet. De lucht van dat moment telt meer dan de verwachting van gisteravond, en kijk ook achterom: buien bouwen vaak achter of naast je op.',
      ],
    },
  ],
  videos: [
    {
      title: 'Mountain Survival: Basic Weather',
      channel: 'Snowdonia Mountain Guides',
      url: 'https://www.youtube.com/watch?v=tjYtZJjYWn0',
      language: 'en',
      note: 'Berggidsen leggen uit hoe je vanuit een algemene verwachting inschat wat het weer op de toppen doet.',
    },
    {
      title: 'How To Read Clouds To Forecast the Weather | Outside',
      channel: 'Outside',
      url: 'https://www.youtube.com/watch?v=OEWQzUl1jQc',
      language: 'en',
      note: 'Goed om de wolkentypen te leren herkennen die een weersverandering aankondigen.',
    },
    {
      title: 'Gewitterserie Teil 1 - Wolkentypen',
      channel: 'wettercom',
      url: 'https://www.youtube.com/watch?v=C2ClmN_yRaw',
      language: 'de',
      note: 'Meteorologen laten zien welke wolken bij het ontstaan van onweer horen.',
    },
  ],
  sources: [
    {
      label: 'Österreichischer Alpenverein: Gewitter am Berg, 5 Tipps zur Risikominimierung (2021)',
      url: 'https://www.alpenverein.at/portal_wAssets/docs/service/presse/2021/gewitter/PA_Alpenverein-Gewitter-am-Berg-2021.pdf',
    },
    {
      label: 'Regione Valle d\'Aosta, Centro funzionale: bergweerbulletin met nulgradenniveau en wind op 3000 m',
      url: 'https://cf.regione.vda.it/allegati/previsioni/Bollettino_F.pdf',
    },
    {
      label: 'Envie de Queyras: het retour d\'est uitgelegd',
      url: 'https://www.envie-de-queyras.com/news/retour-est-en-queyras',
    },
    {
      label: 'Meteo-France: Météo Montagne Alpes du Nord',
      url: 'https://meteofrance.com/meteo-montagne/alpes-du-nord',
    },
  ],
};

export default content;

import type { KnowledgeContent } from '../knowledge';

const content: KnowledgeContent = {
  intro:
    'Een ongeluk in de bergen loopt meestal goed af als de oproep snel, duidelijk en met een precieze positie binnenkomt. De GR5 loopt bijna helemaal door Frankrijk, maar langs de Zwitserse en Italiaanse grens pikt je telefoon soms een buitenlands netwerk op, en dan krijg je de centrale van dat land aan de lijn.',
  weeklyTip: 'Oefen het voorlezen van je positie: open je kaart-app, lees je coördinaten hardop in decimale graden en weet waar dat scherm zit.',
  sections: [
    {
      heading: 'Welke nummers',
      items: [
        'Frankrijk: 112 is in de bergen het beste nummer. Je komt bij de hulpdiensten van het departement, en die sturen bij een bergongeval de PGHM (de bergeenheid van de gendarmerie), in sommige gebieden de CRS Montagne of de brandweer. 15 is de SAMU (medisch), 18 de brandweer. Wie niet kan praten of horen kan de 114 sms\'en.',
        'Zwitserland: 144 voor ambulance, 1414 voor Rega (vanaf een buitenlands nummer +41 333 333 333). In Wallis, dat in het noorden van de route aan de Chablais grenst, gaat de bergredding via 144. 112 werkt ook.',
        'Italië: 112. De bergredding is daar het Soccorso Alpino (CNSAS).',
        '112 gebruikt elk netwerk dat je telefoon ziet, ook van een andere provider. Eén streepje van een concurrent is genoeg.',
      ],
    },
    {
      heading: 'De oproep zelf',
      body:
        'Rustig, in het Engels of met wat Frans, en in deze volgorde. Hang pas op als de centrale dat zegt, houd daarna je telefoon aan en bereikbaar, en bel alleen terug als er iets verandert.',
      items: [
        '"Ik meld een bergongeval. Mijn naam is ..., mijn nummer is ..."',
        'Waar: coördinaten, en daarbij de naam van de dichtstbijzijnde col, hut of meer, tussen welke etappeplaatsen op de GR5, ongeveer welke hoogte en aan welke kant van het dal.',
        'Wat en wanneer: wat er gebeurde en hoe laat.',
        'Wie: hoeveel gewonden, welk letsel, bij bewustzijn, ademhaling normaal, bloeding.',
        'Omstandigheden: weer, zicht, wind, en hindernissen voor een helikopter zoals kabels.',
        'Wie er verder is: hoeveel mensen ter plaatse en welke uitrusting jullie hebben.',
      ],
    },
    {
      heading: 'Je positie, ook zonder bereik',
      items: [
        'Geef coördinaten in WGS84, het liefst als decimale graden (bijvoorbeeld 45.29812 N, 6.58431 E): eerst breedte, dan lengte, en zeg welk formaat je gebruikt.',
        'Bel je 112 met een moderne Android- of iPhone, dan stuurt je telefoon automatisch je GPS-positie per sms naar de centrale (Advanced Mobile Location). In Frankrijk werkt dat landelijk sinds ongeveer 2020. Zet locatievoorzieningen aan; zonder netwerk gaat er niets.',
        'Geen bereik: klim naar een kam of open plek. Een sms komt soms door waar bellen niet lukt.',
        'Garmin inReach: SOS gaat via satelliet naar Garmin Response, een centrale die dag en nacht de lokale hulpdienst inschakelt en via berichten contact houdt. Alleen met een actief abonnement, en de reddingskosten vallen er niet onder. Typ wat er aan de hand is.',
        'iPhone 14 en nieuwer heeft Noodmelding via satelliet, ook in Frankrijk, Zwitserland en Italië; de lijst verandert, dus check hem voor vertrek. Satelliet wil open lucht, in een diep dal kan het minuten duren.',
      ],
    },
    {
      heading: 'Signalen en wachten',
      items: [
        'Alpien noodsignaal: zes keer per minuut (elke tien seconden) fluiten, met licht knipperen of iets fels zwaaien, dan een minuut stilte en herhalen. Het antwoord is drie keer per minuut.',
        'Helikopter: beide armen schuin omhoog in een Y betekent ja, wij hebben hulp nodig. Eén arm schuin omhoog en één schuin omlaag, een N, betekent nee.',
        'Landingsplek: zo mogelijk een vlak stuk van ongeveer 25 bij 25 meter. Zet alles vast wat kan wegwaaien en loop pas naar de helikopter als de bemanning je wenkt.',
        'Wachten: gewonde van de grond isoleren met rugzak en isomat, alle lagen aan, uit de wind, bivakzak of nooddeken, iets eten. Houd je telefoon warm in een binnenzak; kou trekt een batterij snel leeg.',
      ],
    },
    {
      heading: 'Afbreken of alarmeren',
      items: [
        'Draai om bij onweer dat zich voor de middag opbouwt, bij een sneeuwveld te hard of te steil voor je uitrusting, of als iemand traag, onhandig of verward wordt. Spreek voor een hoge pas een omkeertijd af en houd je eraan.',
        'Alarmeer als iemand niet meer kan lopen, bij hoofdletsel met verwardheid, letsel aan borst, buik of rug, zware bloeding, ernstige onderkoeling, verergerende hoogteziekte, of als je verdwaald bent en het donker wordt.',
        'Bel liever vroeg: een redding bij daglicht en goed weer is veel eenvoudiger dan een zoektocht in nacht en mist.',
      ],
    },
    {
      heading: 'Kosten en verzekering',
      items: [
        'Frankrijk: redding door PGHM, CRS en brandweer is in principe gratis, mits gerechtvaardigd. Medische zorg, ambulance en ziekenhuis betaal je wel. Een reddingshelikopter kost 3.000 tot 4.500 euro per uur, en of de gratis redding blijft is in Frankrijk een terugkerend debat.',
        'Zwitserland: redding wordt gefactureerd, en een helikopterinzet loopt al snel in de duizenden franken.',
        'Italië: verschilt per regio. In onder meer Valle d\'Aosta en Piemonte betaal je een eigen bijdrage, en een helikopterredding die de arts aan boord niet gerechtvaardigd vindt kan honderden euro per persoon kosten.',
        'Vanuit Nederland: je basisverzekering dekt zorg in het buitenland tot het Nederlandse tarief, maar opsporing en redding meestal niet. Check of je reisverzekering bergwandelen buiten gebaande paden en opsporing en redding dekt. Als NKBV-lid kun je hun reisverzekering met bergsportdekking afsluiten, inclusief opsporing, redding en repatriëring.',
      ],
    },
  ],
  videos: [
    {
      title: 'inReach: What Happens When You Trigger an SOS?',
      channel: 'Garmin',
      url: 'https://www.youtube.com/watch?v=vEaF2Atxo-s',
      minutes: 2,
      language: 'en',
      note: 'Garmin laat zien wat er achter de SOS-knop gebeurt, van satelliet tot lokale hulpdienst.',
    },
    {
      title: 'When to Hit SOS on Your inReach, According to Garmin',
      channel: 'HikingGuy.com',
      url: 'https://www.youtube.com/watch?v=BubPk8T2fO8',
      minutes: 9,
      language: 'en',
      note: 'Wanneer je wel en niet op SOS drukt, en wat je beter eerst via een bericht regelt.',
    },
    {
      title: 'Emergency situation on the mountain: What to do in an alpine emergency - Tutorial (31/43)',
      channel: 'ORTOVOX SAFETY ACADEMY',
      url: 'https://www.youtube.com/watch?v=M-spasPYNn0',
      minutes: 6,
      language: 'en',
      note: 'De volgorde van handelen bij een ongeval in de Alpen, inclusief de alarmering.',
    },
    {
      title: 'Rega: Unterwegs mit Bergrettern | Notruf 1414 | Einstein | SRF Wissen',
      channel: 'SRF Wissen',
      url: 'https://www.youtube.com/watch?v=i5bWbCwlR5o',
      minutes: 36,
      language: 'de',
      note: 'Een documentaire over hoe een Rega-inzet verloopt, van de oproep tot de lier.',
    },
  ],
  sources: [
    { label: 'Rega, How to raise the alarm correctly', url: 'https://rega.ch/en/news/news-from-the-world-of-rega/detail/how-to-raise-the-alarm-correctly' },
    { label: 'Rega, Emergency numbers', url: 'https://www.rega.ch/en/about-us/contact/emergency-numbers' },
    { label: 'FFRandonnée, Les secours en montagne ne sont pas automatiquement gratuits', url: 'https://www.ffrandonnee.fr/s-informer/actualites/les-secours-en-montagne-ne-sont-pas-automatiquement-gratuits' },
    { label: 'Garmin, Get to know Garmin Response', url: 'https://www.garmin.com/en-AU/blog/get-to-know-garmin-response/' },
    { label: 'Alpine distress signal (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Alpine_distress_signal' },
    { label: 'Montagna.tv, 4.250 euro voor een niet-gerechtvaardigde helikopterredding op de Mont Blanc', url: 'https://www.montagna.tv/50532/monte-bianco-4250-euro-per-soccorso-non-giustificato-in-elicottero/amp/' },
  ],
};

export default content;

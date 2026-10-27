// ASCEND: wat je doet bij last en hoe je het voorkomt, per soort plek op het figuur
// (docs/beslissingen/2026-10-24-lichaam-als-figuur.md). Pure tekst, geen React.
//
// Rustig en zonder beloftes: "kan helpen", "verkleint de kans", nooit "voorkomt".
// De onderbouwing staat bij elke plek, met de sterkte van het bewijs zoals in
// docs/onderzoek/. Waar daar niets over een plek staat, zegt de tekst dat eerlijk en
// is het een algemene, rustige aanpak. Dit is algemene uitleg, geen diagnose.

export interface CareExercise {
  name: string;
  // "3 × 8 per been": hoe vaak of hoe lang.
  dose: string;
  // Eén korte aanwijzing hoe je het doet.
  note?: string;
}

export interface BodyCare {
  // Wat je doet bij last: korte, rustige punten.
  bijLast: string[];
  // Plekspecifieke redenen voor een fysio, als zinsdeel na "Naar een fysio of je huisarts bij:".
  fysio: string[];
  // Iets wat niet kan wachten: een volledige zin (huisarts of 112).
  direct?: string;
  voorkomen: {
    intro: string;
    oefeningen: CareExercise[];
    // De onderbouwing, met de sterkte van het bewijs.
    basis: string;
  };
}

// Voor elke plek: wanneer je naar een fysio of je huisarts gaat.
export const GENERAL_RED_FLAGS = [
  'een flinke zwelling',
  'de plek niet kunnen belasten',
  'pijn die je ’s nachts wakker houdt of ook in rust blijft',
  'klachten die na een tot twee weken niet minder worden',
  'een plek die rood en warm is met koorts erbij (dan naar je huisarts)',
];

// Hoe erg is het nu: dezelfde drie niveaus als de opgeslagen klacht (models/injury.ts).
export const SEVERITY_CHOICES = [
  { value: 'licht', label: 'Licht', line: 'Je merkt het, maar het hindert niet.' },
  { value: 'matig', label: 'Matig', line: 'Het hindert bij sporten of lopen.' },
  { value: 'ernstig', label: 'Ernstig', line: 'Het hindert ook in het gewone leven.' },
] as const;

const KNAPIK = 'Roeien en optrekken helpen bij rugzakdragen (Knapik e.a. 2012, bewijs: matig, in het onderzoek “Aanvullend onderzoek GR5 voorbereiding”).';
const ROMP = 'Rompoefeningen staan in het krachtmenu van het onderzoek “Aanvullend onderzoek GR5 voorbereiding” (bewijs: expert).';
const NIETS_APART = 'Voor deze plek staat in het onderzoek achter ASCEND niets apart. Dit is een rustige, algemene aanpak; krachttraining verlaagt over sporten heen het aantal blessures (Lauersen e.a. 2014, bewijs: matig tot sterk).';

export const BODY_CARE: Record<string, BodyCare> = {
  nek: {
    bijLast: [
      'Een stijve nek komt vaak van een zware rugzak, een slechte slaaphouding of lang naar beneden kijken. Beweeg rustig, draai en buig binnen wat zonder pijn gaat.',
      'Vermijd grote, snelle nekrollen. Warmte en lichte beweging kunnen vaak meer helpen dan stilhouden.',
    ],
    fysio: ['pijn met tintelen of minder kracht in de arm'],
    direct: 'Duizeligheid of dubbelzien bij nekpijn: ga dezelfde dag naar je huisarts, en bel 112 als er uitval bij komt, zoals een scheve mond of een arm die niet meer meewerkt.',
    voorkomen: {
      intro: 'Een sterke bovenrug en sterke schouderbladen kunnen werk van de nek overnemen. Twee keer per week is genoeg.',
      oefeningen: [
        { name: 'Kin intrekken met vasthouden', dose: '2 × 8, 5 seconden vast', note: 'Lang in je nek, kin recht naar achter' },
        { name: 'Roeien met een elastiek', dose: '3 × 10', note: 'Schouderbladen rustig naar elkaar' },
        { name: 'Schouderbladen naar achter en omlaag', dose: '2 × 12', note: 'Zonder je schouders op te trekken' },
      ],
      basis: `${KNAPIK} ${NIETS_APART}`,
    },
  },
  schouder: {
    bijLast: [
      'Een zeurende schouder na een zware rugzak komt vaak door de banden en een gespannen nek en bovenrug. Stel de heupband en de schouderbanden opnieuw af en neem wat lichter mee.',
      'Blijf rustig bewegen binnen wat zonder pijn gaat. Forceer niets boven schouderhoogte.',
    ],
    fysio: ['een val of klap op de schouder', 'een arm die slap of tintelend aanvoelt'],
    voorkomen: {
      intro: 'Sterke schouderbladen en een sterke rug kunnen een rugzak makkelijker dragen. Twee keer per week.',
      oefeningen: [
        { name: 'Roeien met een elastiek of gewicht', dose: '3 × 10', note: 'Rustig terug, niet zwaaien' },
        { name: 'Buitenwaartse rotatie met een elastiek', dose: '2 × 12 per kant', note: 'Elleboog tegen je zij' },
        { name: 'Scapular wall slides', dose: '2 × 10', note: 'Rug en onderarmen tegen de muur' },
      ],
      basis: `${KNAPIK} De buitenwaartse rotatie is afgeleid van gangbare praktijk en niet apart onderzocht.`,
    },
  },
  borst: {
    bijLast: [
      'Een strakke of pijnlijke borstspier komt vaak van veel drukken of van een rugzak die je naar voren trekt. Rek rustig en doe een paar dagen minder drukwerk.',
    ],
    fysio: [],
    direct: 'Pijn op de borst die niet bij een beweging hoort, of met benauwdheid of uitstraling naar arm of kaak: bel direct je huisarts of 112.',
    voorkomen: {
      intro: 'Houd trekken en duwen in balans. Twee keer per week.',
      oefeningen: [
        { name: 'Roeien met een elastiek', dose: '3 × 10' },
        { name: 'Opdrukken schuin tegen een tafel', dose: '3 × 8', note: 'Lijf in een rechte lijn' },
        { name: 'Face pull met een elastiek', dose: '2 × 12', note: 'Naar je gezicht, ellebogen hoog' },
      ],
      basis: `${KNAPIK} ${NIETS_APART}`,
    },
  },
  buik: {
    bijLast: [
      'Een strakke of pijnlijke buik- of zijspier na draaien of dragen is meestal overbelasting. Beweeg rustig en vermijd een paar dagen zwaar draaien.',
    ],
    fysio: [],
    direct: 'Buikpijn met koorts of misselijkheid hoort niet bij een spier: laat het dezelfde dag door je huisarts bekijken, geen fysio.',
    voorkomen: {
      intro: 'Een stevige romp kan je rug en heupen helpen bij een zware rugzak. Twee tot drie keer per week.',
      oefeningen: [
        { name: 'Onderarmsteun (plank)', dose: '3 × 30 seconden', note: 'Billen niet omhoog, niet inzakken' },
        { name: 'Suitcase carry', dose: '3 × 20 meter per kant', note: 'Een gewicht in één hand, rechtop blijven' },
        { name: 'Pallof press', dose: '2 × 10 per kant', note: 'Met een elastiek, niet laten draaien' },
      ],
      basis: ROMP,
    },
  },
  onderarm: {
    bijLast: [
      'Pijn in pols of onderarm door veel pakken, typen of wandelstokken komt vaak door overbelaste pezen. Geef het een paar dagen rust van zwaar grijpen.',
      'Beweeg de pols rustig door de dag heen. Stilhouden maakt het meestal niet beter.',
    ],
    fysio: ['tintelen of een doof gevoel in de vingers dat blijft'],
    voorkomen: {
      intro: 'Opbouwen met weinig gewicht en veel rust ertussen. Twee keer per week.',
      oefeningen: [
        { name: 'Polscurl met een licht gewicht', dose: '2 × 15', note: 'Onderarm op een tafel, rustig' },
        { name: 'Omgekeerde polscurl', dose: '2 × 15', note: 'Met een nog lichter gewicht' },
        { name: 'Een handdoek of flesje knijpen', dose: '2 × 20 seconden' },
      ],
      basis: NIETS_APART,
    },
  },
  heup: {
    bijLast: [
      'Een strakke heup of lies na lange dagen met een rugzak komt vaak van gespannen heupbuigers. Beweeg rustig en vermijd een paar dagen forse stappen en snel bergaf.',
      'Pijn in de lies die erger wordt terwijl je loopt is een uitzondering: stop dan met lopen.',
    ],
    fysio: ['pijn in de lies of heup die erger wordt als je doorloopt (dat kan het bot zijn)'],
    voorkomen: {
      intro: 'Sterke heupspieren kunnen je knie en bekken rustig houden. Twee keer per week.',
      oefeningen: [
        { name: 'Heup zijwaarts heffen', dose: '2 × 12 per kant', note: 'Op je zij, tenen naar voren' },
        { name: 'Step-up op een tree', dose: '3 × 8 per been', note: 'Later met een rugzak' },
        { name: 'Bilbrug', dose: '3 × 12', note: 'Boven even aanspannen' },
      ],
      basis: 'Heupabductie en step-ups staan in het krachtmenu van het onderzoek “Aanvullend onderzoek GR5 voorbereiding” (bewijs: expert; heupkracht bij kniepijn voorin: bewijs matig, als behandeling). De bilbrug is afgeleid.',
    },
  },
  dij: {
    bijLast: [
      'Een pijnlijke voorkant van de dij na bergaf of zware benen is meestal spierpijn. Rustig lopen of fietsen mag, doe 1 tot 2 dagen geen harde training.',
      'Spierpijn zit breed in de spier en zakt als je warm bent. Pijn op één punt, of pijn die erger wordt als je doorgaat, is iets anders.',
    ],
    fysio: ['plotselinge scherpe pijn met een knap of een blauwe plek'],
    voorkomen: {
      intro: 'Sterkere bovenbenen kunnen het dalen beter opvangen. Eén tot twee keer per week, langzaam zakkend.',
      oefeningen: [
        { name: 'Step-down van een lage trede', dose: '3 × 8 per been', note: 'Zak in 3 tot 4 seconden' },
        { name: 'Langzaam zakkende squat', dose: '3 × 8', note: 'Omhoog in 1, omlaag in 3 seconden' },
        { name: 'Split squat', dose: '3 × 6 per been', note: 'Rechtop, knie boven je voet' },
      ],
      basis: 'Step-downs en langzaam zakken zijn de beste vervanger voor afdalen (het onderzoek “Aanvullend onderzoek GR5 voorbereiding”, bewijs: expert). Echte afdalingen blijven de best onderbouwde prikkel.',
    },
  },
  knie: {
    bijLast: [
      'Pijn rond de knieschijf na veel dalen is meestal overbelasting. Doe een paar dagen minder trap en afdalen. Fietsen en vlak wandelen gaan vaak wel.',
      'Houd de pijn tijdens het bewegen op 2 van 10 of lager en kijk de ochtend erna. Is het dan erger dan gisteren, dan was het te veel.',
    ],
    fysio: ['een knie die op slot slaat, doorzakt of snel dik wordt'],
    voorkomen: {
      intro: 'Sterkere bovenbenen en heupen kunnen het dalen beter opvangen. Twee keer per week, rustig opbouwen.',
      oefeningen: [
        { name: 'Step-down van een lage trede', dose: '3 × 8 per been', note: 'Zak in 3 tot 4 seconden, knie boven je tweede teen' },
        { name: 'Langzaam zakkende squat', dose: '3 × 8' },
        { name: 'Heup zijwaarts heffen', dose: '2 × 12 per kant' },
      ],
      basis: 'Langzaam zakken en step-downs: het onderzoek “Aanvullend onderzoek GR5 voorbereiding” (bewijs: expert voor afdalen). Heupkracht naast kniewerk helpt bij pijn voorin de knie (JOSPT 2018, bewijs: matig, als behandeling en niet als voorkomen).',
    },
  },
  scheen: {
    bijLast: [
      'Pijn verdeeld over 5 cm of meer langs de binnenkant van het scheenbeen past bij overbelasting. Loop een paar dagen rustiger op zacht terrein en bouw daarna langzaam weer op.',
      'Pijn op één puntje op het bot is iets anders: stop dan met lopen op die plek.',
    ],
    fysio: ['pijn op één plekje op het bot die erger wordt (dat kan een stressreactie zijn)'],
    voorkomen: {
      intro: 'Sterke kuiten, voeten en scheenspieren kunnen de landing helpen dragen. Twee keer per week.',
      oefeningen: [
        { name: 'Tenen omhoog (tibialis raise)', dose: '2 × 15', note: 'Hakken tegen de muur' },
        { name: 'Eenbenige kuitheffing', dose: '3 × 12 per been', note: 'Langzaam omlaag' },
        { name: 'Korte-voetoefening', dose: '10 minuten, 2 tot 3 keer per week', note: 'Trek je voorvoet naar je hiel zonder je tenen te buigen' },
      ],
      basis: 'Voetspiertraining maakte recreatieve lopers 2,4 keer minder vatbaar voor een loopblessure, in één onderzoek (Taddei e.a. 2020, bewijs: matig). De rest is afgeleid uit het krachtmenu van het onderzoek “Aanvullend onderzoek GR5 voorbereiding”.',
    },
  },
  enkel: {
    bijLast: [
      'Een enkel die dik of gevoelig is na omslaan: beweeg de eerste dagen rustig en belast zolang het zonder scherpe pijn gaat.',
      'Pijn onderin de voet, vooral bij de eerste stappen, komt vaak van overbelasting. Rek de kuit en rol de voet rustig uit.',
    ],
    fysio: ['een enkel die instabiel voelt of steeds omslaat'],
    voorkomen: {
      intro: 'Balans en sterke voeten kunnen je enkels stabieler maken. Twee tot drie keer per week.',
      oefeningen: [
        { name: 'Op één been staan', dose: '3 × 30 seconden per been', note: 'Daarna met je ogen dicht' },
        { name: 'Eenbenige kuitheffing', dose: '3 × 12 per been' },
        { name: 'Korte-voetoefening', dose: '10 minuten, 2 tot 3 keer per week' },
      ],
      basis: 'Evenwichtstraining verlaagde het aantal blessures over sporten heen (Lauersen e.a. 2014, bewijs: matig tot sterk). Voetspiertraining: Taddei e.a. 2020 (bewijs: matig, één onderzoek).',
    },
  },
  bovenrug: {
    bijLast: [
      'Een stijve bovenrug en schouders na een zware rugzak komt vaak door de druk op de schouderbanden. Stel de rugzak hoger af en verdeel het gewicht over je heupen.',
      'Beweeg vaak: rustig rollen en draaien kan meestal meer helpen dan stilzitten.',
    ],
    fysio: ['pijn tussen de schouderbladen die uitstraalt naar de arm met tintelen'],
    direct: 'Pijn tussen de schouderbladen met benauwdheid: bel direct je huisarts of 112.',
    voorkomen: {
      intro: 'Een sterke bovenrug kan een rugzak makkelijker dragen. Twee keer per week.',
      oefeningen: [
        { name: 'Roeien met een elastiek of gewicht', dose: '3 × 10' },
        { name: 'Scapular wall slides', dose: '2 × 10' },
        { name: 'Rugstrekken liggend', dose: '2 × 10', note: 'Rustig omhoog, niet in je nek hangen' },
      ],
      basis: KNAPIK,
    },
  },
  onderrug: {
    bijLast: [
      'Een stijve of zeurende onderrug door een zware rugzak of lang zitten is meestal niet gevaarlijk. Blijf rustig bewegen en vermijd een dag of twee zwaar tillen.',
      'Rust houden helpt zelden. Rustig lopen en bewegen kan meestal meer helpen.',
    ],
    fysio: [],
    direct: 'Een doof gevoel rond je zitvlak of liezen, moeite met plassen of een been dat zwakker wordt: ga dezelfde dag naar een huisarts of de spoedpost.',
    voorkomen: {
      intro: 'Een stevige romp en sterke billen en hamstrings kunnen je rug ontlasten. Twee keer per week.',
      oefeningen: [
        { name: 'Vogelhond (bird dog)', dose: '3 × 8 per kant', note: 'Rug vlak, rustig wisselen' },
        { name: 'Onderarmsteun (plank)', dose: '3 × 30 seconden' },
        { name: 'Romeense deadlift met licht gewicht', dose: '3 × 8', note: 'Heupen naar achter, rug lang' },
      ],
      basis: `${ROMP} Bij militairen zit de rug op de tweede plaats van de blessures met een zware rugzak (Orr e.a. 2021).`,
    },
  },
  bil: {
    bijLast: [
      'Pijn diep in de bil, soms met uitstraling naar de achterkant van het been, komt vaak van een gespannen piriformis of bilspier. Doe een paar dagen rustiger aan en rek zacht.',
    ],
    fysio: ['uitstraling met een doof gevoel of minder kracht in het been'],
    voorkomen: {
      intro: 'Sterke billen kunnen werk van je rug en knieën overnemen. Twee keer per week.',
      oefeningen: [
        { name: 'Bilbrug', dose: '3 × 12', note: 'Boven even aanspannen' },
        { name: 'Romeense deadlift met licht gewicht', dose: '3 × 8' },
        { name: 'Heup zijwaarts heffen', dose: '2 × 12 per kant' },
      ],
      basis: 'Romeense deadlift en heupabductie staan in het krachtmenu van het onderzoek “Aanvullend onderzoek GR5 voorbereiding” (bewijs: matig en expert). De bilbrug is afgeleid.',
    },
  },
  hamstring: {
    bijLast: [
      'Een hamstring die tijdens het lopen steeds strakker wordt is geen spierpijn: stop dan met die training.',
      'Spierpijn achter in het bovenbeen na een zware dag mag je rustig weglopen. Houd het tempo laag en doe geen sprints.',
    ],
    fysio: ['plotselinge scherpe pijn met een knap of een blauwe plek achter in het bovenbeen'],
    voorkomen: {
      intro: 'Sterke hamstrings kunnen de kans op een scheur verkleinen. Twee keer per week, met een klein volume.',
      oefeningen: [
        { name: 'Nordic curl', dose: '2 × 4, 2 keer per week', note: 'Zo langzaam mogelijk voorover, met hulp van je handen' },
        { name: 'Romeense deadlift', dose: '3 × 8' },
        { name: 'Bilbrug', dose: '3 × 12' },
      ],
      basis: 'De Nordic curl halveert hamstringblessures bijna, maar dat bewijs komt uit teamsporten met sprints (van Dyk e.a. 2019, bewijs: sterk daar). Voor wandelaars en lopers is het niet apart onderzocht.',
    },
  },
  kuit: {
    bijLast: [
      'Een zeurende kuit na veel klimmen of lopen is meestal vermoeidheid. Rustig lopen mag, rek na afloop en loop een paar dagen minder bergop.',
      'Een plotselinge scherpe pijn, alsof je getrapt wordt, of een knap is geen spierpijn.',
    ],
    fysio: ['een plotselinge scherpe pijn of een knap in de kuit'],
    direct: 'Een dikke, warme en pijnlijke kuit, vooral aan één kant en zonder duidelijke oorzaak, laat je dezelfde dag door je huisarts bekijken.',
    voorkomen: {
      intro: 'Sterke kuiten kunnen veel van de stappen opvangen. Twee keer per week.',
      oefeningen: [
        { name: 'Eenbenige kuitheffing, knie gestrekt', dose: '3 × 12 per been', note: 'Langzaam omlaag' },
        { name: 'Kuitheffing met gebogen knie', dose: '3 × 10 per been', note: 'Voor de diepe kuitspier' },
        { name: 'Tenen omhoog (tibialis raise)', dose: '2 × 15' },
      ],
      basis: 'Eenbenige kuitheffingen staan in het krachtmenu van het onderzoek “Aanvullend onderzoek GR5 voorbereiding” (bewijs: expert). Normen voor aantallen komen van coaches en zijn niet bewezen (bewijs: zwak).',
    },
  },
  achilles: {
    bijLast: [
      'Stijfheid of pijn in de pees, vooral bij de eerste stappen ’s ochtends, wijst op een overbelaste pees. Het kan wegwarmen en toch te veel zijn geweest.',
      'Houd de pijn tijdens het bewegen op 2 van 10 of lager en kijk de ochtend erna. Is het dan erger dan normaal, dan was het te veel.',
    ],
    fysio: [],
    direct: 'Een klap of knap achter in de enkel, of niet meer op je tenen kunnen staan: laat het dezelfde dag door je huisarts bekijken.',
    voorkomen: {
      intro: 'Een pees kan wennen aan belasting als je langzaam opbouwt. Twee tot drie keer per week.',
      oefeningen: [
        { name: 'Kuitheffing, langzaam omlaag', dose: '3 × 12 per been', note: 'In 3 seconden zakken' },
        { name: 'Kuitheffing met gebogen knie', dose: '3 × 10 per been' },
        { name: 'Korte-voetoefening', dose: '10 minuten, 2 tot 3 keer per week' },
      ],
      basis: 'Het pijnmodel van Silbernagel en Thomeé: bewijs matig voor de achillespees (docs/onderzoek, Pijn spierpijn en vermoeidheid melden). Voetspiertraining: Taddei e.a. 2020 (bewijs: matig, één onderzoek).',
    },
  },
};

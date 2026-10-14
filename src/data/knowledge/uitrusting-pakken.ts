import type { KnowledgeContent } from '../knowledge';

const content: KnowledgeContent = {
  intro:
    'Op de GR5 draag je je rugzak een maand lang over zo\'n 30.000 m stijgen en evenveel dalen. Hoe je 12 kg pakt en afstelt, bepaalt of het voelt als 12 of als 16 kg, en hoe je knieën en schouders er na drie weken aan toe zijn. Elke 100 gram die thuis blijft, til je niet duizenden keren op.',
  weeklyTip:
    'Laat je heupgordel het werk doen: midden op je bekkenkam, schouderbanden alleen om de rugzak tegen je aan te houden.',
  sections: [
    {
      heading: 'Wat 12 kg eigenlijk is',
      body:
        'De vuistregel van de DAV is maximaal 20 tot 25 procent van je lichaamsgewicht. Bij 75 kg is dat 15 tot 19 kg, dus 12 kg is ruim binnen de grens. Maar die 12 kg is inclusief water en eten. Anderhalve liter water weegt 1,5 kg, een dag aan lunch en snacks al gauw 0,5 tot 1 kg. Wil je met 12 kg vertrekken, dan moet je basisgewicht, alles zonder water en eten, rond de 9 kg liggen. Voor een hut- en gîtetocht is 35 tot 45 liter genoeg. Een grotere rugzak nodigt uit om hem vol te stoppen.',
    },
    {
      heading: 'Inpakken in zones',
      items: [
        'Onderin: licht en pas voor de avond nodig, zoals lakenzak, hutkleding en donsjas.',
        'Midden, tegen je rug en op schouderhoogte: het zwaarste, zoals eten en water. Zo blijft het zwaartepunt dicht bij je lichaam en zwaait de rugzak niet op smalle paden.',
        'Bovenin en in de klep: regenjas, warme laag, kaart, zonnebrand, EHBO en snacks. Wat je onderweg pakt, moet je zonder uitpakken kunnen bereiken.',
        'Heupgordelzakken: telefoon, lippenbalsem, een reep. Zo eet je ook als je niet wilt stoppen.',
        'Alles binnenin, in een binnenzak of drybags. Buitenop alleen iets lichts, zoals stokken op een vlak stuk.',
      ],
    },
    {
      heading: 'Afstellen in zes stappen',
      items: [
        'Pak de rugzak in met realistisch gewicht en zet alle banden los.',
        'Heupgordel: de vleugels midden op je bekkenkam. Te hoog knelt je buik af, te laag schuurt in je liezen.',
        'Schouderbanden aantrekken, stevig maar niet strak. De heup draagt het meeste gewicht.',
        'Controleer dat de schouderbanden tussen je schouderbladen aan de rug vastzitten. Zit het hoger of lager, stel dan de ruglengte bij.',
        'Borstband sluiten op een hoogte waar hij niet je ademhaling hindert.',
        'Lastregelbanden boven je schouders aantrekken tot ze onder 30 tot 45 graden naar de rugzak lopen.',
      ],
    },
    {
      heading: 'Mee of thuis',
      items: [
        'Mee: een lakenzak. Franse refuges hebben meestal dekens, maar die worden niet na elke gast gewassen. Zijde weegt een fractie van katoen.',
        'Mee: oordoppen, hoofdlamp, contant geld (pinnen kan lang niet overal), een kleine powerbank, muts en dunne handschoenen voor een koude pas.',
        'Mee: toiletspullen in kleine flesjes, een paar losse pagina\'s of foto\'s uit de gids in plaats van het hele boek.',
        'Thuis: hutschoenen (de meeste hutten hebben slippers), extra setjes kleding, boeken, een dikke portemonnee.',
        'Wat je voor sneeuwvelden meeneemt, staat in de les over sneeuw in de zomer.',
      ],
    },
    {
      heading: 'Waar je gewicht wint',
      body:
        'Weeg alles op een keukenweegschaal en zet het in een lijst. Je ziet meteen waar de kilo\'s zitten: meestal in de rugzak zelf, de regenkleding en dubbele spullen. Een lichte rugzak van rond 1 kg in plaats van 2 kg scheelt meer dan tien kleine dingen samen. Neem van alles één: één fleece, één extra shirt, één paar reservesokken. Je wast \'s avonds. Bevoorraad elke paar dagen in de dalen, zodat je nooit meer dan anderhalve dag eten draagt. Na de eerste week weet je wat je niet gebruikt. Stuur het vanuit een postkantoor naar huis.',
    },
  ],
  videos: [
    {
      title: 'How to Fit a Backpacking Pack',
      channel: 'REI',
      url: 'https://www.youtube.com/watch?v=0SGiGZlppMM',
      language: 'en',
      note: 'Duidelijk stap voor stap: ruglengte, heupgordel, schouderbanden en lastregelbanden.',
    },
    {
      title: 'How to Pack a Backpack: REI Experts',
      channel: 'REI',
      url: 'https://www.youtube.com/watch?v=HB7ZOjnnFS8',
      language: 'en',
      note: 'Laat zien hoe je de zones vult zodat het gewicht dicht op je rug blijft.',
    },
    {
      title: 'Schlafsack Vergleich: Vor- und Nachteile von Seide, Baumwolle, Fleece, Daune | Berge im Kopf',
      channel: 'Deutscher Alpenverein (DAV)',
      url: 'https://www.youtube.com/watch?v=ZEj8icU_AwI',
      language: 'de',
      note: 'Welke lakenzak of hutslaapzak je kiest en wat dat scheelt in gewicht en warmte.',
    },
  ],
  sources: [
    { label: 'DAV: Ausrüstung für die Hüttentour', url: 'https://www.alpenverein.de/artikel/ausruestung-huettentour_8dfd81f9-83ae-46c9-a074-3f92d1ab5399' },
    { label: 'Alpenverein München & Oberland: Rucksack packen', url: 'https://www.alpenverein-muenchen-oberland.de/dav-ausruestungsverleih-in-muenchen/dav-packlisten/rucksack-packen' },
    { label: 'Deuter: Rucksack richtig einstellen', url: 'https://www.deuter.com/ch-de/beratung/rucksack-richtig-einstellen/' },
  ],
};

export default content;

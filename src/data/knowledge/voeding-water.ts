import type { KnowledgeContent } from '../knowledge';

const content: KnowledgeContent = {
  intro:
    'Op de GR5 loop je weken achter elkaar dagen van 6 tot 9 uur met vaak meer dan 1.000 meter stijgen, en dan is eten geen bijzaak meer maar brandstof. Wie elke dag een paar honderd kcal tekortkomt, merkt dat pas in week twee: zware benen, slechte nachten, kortere lontjes. Water is in het noorden makkelijk, in het droge zuiden een planningsvraag.',
  weeklyTip:
    'Eet elk uur iets, ook als je geen honger hebt: 40 tot 60 gram koolhydraten per uur houdt je benen tot de laatste col.',
  sections: [
    {
      heading: 'Hoeveel je verbrandt en wat je nodig hebt',
      body:
        'Voor iemand van rond de 80 kg met je rugzak (12 tot 15 kg met tent) op de rug kost een bergdag van 7 tot 8 uur met 1.000 tot 1.500 meter klimmen ruwweg 4.000 tot 5.500 kcal, inclusief je ruststofwisseling. Een klein tekort is prima, een structureel gat van 1.500 kcal per dag kost je over vier weken spiermassa en herstel. Onderweg werken 30 tot 60 gram koolhydraten per uur (de richtlijn uit de sportvoeding voor inspanning langer dan een uur), bij jouw tempo is 40 tot 60 gram een goed doel: een broodje met jam, een handvol gedroogde vruchten of een reep. Drinken: reken op 0,4 tot 0,8 liter per uur bij warm weer en stijgen, minder in de koelte. Met zweet verlies je per liter grofweg een halve tot een hele gram natrium, dus zout eten op hete dagen is geen luxe.',
    },
    {
      heading: 'Wat je eet, overdag en ’s avonds',
      items: [
        'Ontbijt in een refuge is vaak mager (brood, boter, jam, koffie). Neem zelf iets extra: muesli, notenpasta of een paar plakken kaas.',
        'Overdag: brood, comté of beaufort, saucisson, noten, gedroogde abrikozen, chocolade, pain d’épices. Saucisson en kaas leveren ook het zout dat je kwijtraakt.',
        'Avond: de demi-pension in een gîte of refuge (soep, hoofdgerecht, kaas, dessert) is precies wat je nodig hebt. Eet het allemaal en vraag gerust om een tweede bord.',
        'Eiwit voor herstel: ruwweg 20 tot 30 gram bij het avondeten en ontbijt. Kaas, eieren, linzen en vlees in de refuge-maaltijd dekken dat meestal.',
      ],
    },
    {
      heading: 'Bevoorrading langs de route',
      body:
        'In de noordelijke helft (Haute-Savoie, Beaufortain, Vanoise) kom je bijna dagelijks langs een dorp, een bemande refuge of een gîte die een panier-repas verkoopt (rond 10 tot 13 euro, de avond ervoor bestellen). Vanaf Ceillac zuidwaarts, door de Ubaye en de Mercantour, worden de gaten groter en zijn de winkels klein: neem daar eten voor 2 tot 3 dagen mee. Denk aan Franse openingstijden: veel épiceries zijn tussen ongeveer 12.30 en 15.30 dicht, op zondagmiddag gesloten en hebben een vaste sluitingsdag, vaak maandag. De bakker opent vroeg, dus koop je brood voor je vertrekt. Na half september sluit veel; in augustus zit je goed. Check de openingsdagen per etappe in je topoguide of bij het office de tourisme.',
    },
    {
      heading: 'Water vinden en zuiveren',
      items: [
        'Bronnen en dorpsfonteinen zijn je beste bron. Een bordje eau non potable betekent: niet gecontroleerd, niet per se slecht.',
        'Op de alpages graast vee en in het zuiden lopen grote schaapskuddes. Water onder weides kan Giardia en Cryptosporidium bevatten: zuiveren.',
        'Een filter met poriën van 0,2 micron (zoals een Sawyer Squeeze of Katadyn BeFree) houdt bacteriën en protozoa tegen, de grootste risico’s hier. Laat het filter niet bevriezen en spoel het terug als de doorstroom zakt.',
        'Chloordioxidetabletten zijn een lichte back-up. Volgens de fabrikanten werken ze binnen ongeveer 30 minuten tegen bacteriën en virussen, maar voor Cryptosporidium heb je 2 tot 4 uur nodig. Gewone chloor en jodium doden Cryptosporidium in veldsterkte niet.',
        'Koken werkt altijd, ook op hoogte: aan de kook brengen is genoeg.',
        'Draag standaard 1,5 tot 2 liter. Op droge zuidelijke etappes en de laatste dagen richting Nice: 3 liter, en tank vol bij elke fontein.',
      ],
    },
    {
      heading: 'Gewicht tegen calorieën',
      body:
        'Als je een paar dagen eten draagt, telt de energiedichtheid. Mik op gemiddeld 400 tot 500 kcal per 100 gram, dan is een dag van 4.000 kcal ongeveer 800 tot 1.000 gram. Olijfolie (ongeveer 880 kcal per 100 g), noten (600), chocolade (530) en harde kaas (400) zijn je zwaargewichten; brood (260) en verse vruchten zijn lekker maar zwaar per kcal. Een zakje olijfolie of een stuk boter door je avondpasta is de goedkoopste manier om 300 kcal toe te voegen zonder volume. Drie dagen eten voor het zuiden weegt zo rond de 3 kg, en dat gewicht neemt elke dag af.',
    },
  ],
  videos: [
    {
      title: 'Backpacking Food Basics: How many calories should YOU pack?',
      channel: 'Backcountry Foodie',
      url: 'https://www.youtube.com/watch?v=u39iDdLk9i8',
      language: 'en',
      note: 'Rekent voor wat jouw eigen calorieën per dag zijn en hoe je dat vertaalt naar gewicht in je rugzak.',
    },
    {
      title: 'The Volumetric Calorie Density of Backpacking Food',
      channel: 'GearSkeptic',
      url: 'https://www.youtube.com/watch?v=8-lF5WV82_A',
      language: 'en',
      note: 'Nerdy maar nuttig: welk eten de meeste energie geeft per gram en per liter rugzakruimte.',
    },
    {
      title: 'Best Way to Filter Water on the Trail | Sawyer Squeeze + Cnoc',
      channel: "Let's Hit the Trail",
      url: 'https://www.youtube.com/watch?v=X3AvVaxl-GY',
      language: 'en',
      note: 'Laat een snelle en schone werkwijze met filter en vuilwaterzak zien, handig voor bronnen en beken.',
    },
  ],
  sources: [
    {
      label: 'Wilderness Medical Society: richtlijn waterbehandeling (2023/2024)',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10961906',
    },
    {
      label: 'DAV: Bergsport und Ernährung',
      url: 'https://www.alpenverein.de/artikel/bergsport-und-ernaehrung_2cfe480b-2e95-4748-8afa-a47424fadd05',
    },
    {
      label: 'Chris Townsend: Food on the GR5 trail through the Alps',
      url: 'https://www.christownsendoutdoors.com/2018/12/food-on-gr5-trail-through-alps.html',
    },
    {
      label: 'Refuge de Rabuons (FFCAM): tarieven maaltijden en panier-repas',
      url: 'https://refugederabuons.ffcam.fr/GB_tarifs.html',
    },
  ],
};

export default content;

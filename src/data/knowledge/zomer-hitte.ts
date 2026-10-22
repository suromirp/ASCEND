import type { KnowledgeContent } from '../knowledge';

const content: KnowledgeContent = {
  intro:
    'De GR5 begint op 370 m aan het Meer van Genève en eindigt op zeeniveau in Nice. Daartussen daal je steeds weer af naar dalen rond de 1000 tot 1400 m, waar een middag in augustus makkelijk boven de 30 °C komt, en de laatste week door de Mercantour en het achterland van Nice is lager, droger en ligt op het zuiden. Op deze tocht kost hitte je meer dan hoogte.',
  weeklyTip:
    'Vertrek bij het eerste licht, drink op dorst en eet zout bij je water: wie alleen water drinkt, verdunt zichzelf.',
  sections: [
    {
      heading: 'Waar het heet wordt',
      items: [
        'De lucht koelt ongeveer 0,6 tot 0,7 °C af per 100 m. Elke afdaling naar een dal als Modane, Briançon of Barcelonnette brengt je dus terug in de zomer van het laagland.',
        'Klimmen uit een dal over een zuidhelling: na 10 uur sta je in volle zon, zonder wind, met 1000 m stijgen voor je.',
        'Hittegolven reiken tot hoog in de bergen. In de nacht van 20 op 21 augustus 2023 mat MeteoSwiss het nulgradenniveau op een recordhoogte van 5298 m. Op zulke dagen is het ook op 2500 m nauwelijks koel.',
        'De laatste etappes via Utelle, Levens en Aspremont naar Nice lopen door laag, droog struikland met weinig schaduw. De afdaling naar Sospel op de variant naar Menton staat bekend als heel heet in de zomer.',
        'Na droge zomers vallen bronnen en fonteinen droog, en in de Alpes-Maritimes gelden dan beperkingen; in 2022 sloot een dorp als Villars-sur-Var zelfs de kraan. Een bordje "eau non potable" betekent filteren of overslaan.',
      ],
    },
    {
      heading: 'Drinken en zout',
      body:
        'Bergop met je rugzak (12 tot 15 kg met tent) in de warmte zweet je grofweg een halve tot ruim een liter per uur. In onderzoek bij mannen die in de hitte werkten, bevatte zweet bij gewende mensen gemiddeld zo\'n 45 mmol natrium per liter: ongeveer 1 gram natrium, ofwel 2,5 gram zout, per liter zweet, met grote verschillen tussen mensen. De Wilderness Medical Society raadt aan te drinken op dorst, niet volgens schema. Wie liters gewoon water drinkt zonder zout, kan zijn bloed verdunnen (hyponatriëmie): hoofdpijn, misselijkheid, opgezette handen en verwardheid, wat sterk op hitte-uitputting lijkt. Neem op droge etappes 3 liter capaciteit mee, vul bij elke bron bij en eet zout bij het drinken: bouillon, worst, kaas, chips of elektrolytentabletten. Plas je weinig en donker, dan loop je achter.',
    },
    {
      heading: 'Tijd, tempo en wennen',
      items: [
        'Vertrek rond zonsopgang, begin augustus rond half zeven. Doe de zuidhelling voor de zon er vol op staat.',
        'Op de lage, hete etappes: loop in de ochtend, rust in de schaduw tijdens de heetste uren, en loop eventueel nog een stuk in de late middag.',
        'Houd een tempo waarop je kunt praten. Bij hetzelfde tempo loopt je hartslag in de hitte op, dus ga langzamer lopen in plaats van door te duwen.',
        'Wennen gaat snel: ongeveer 80 procent van de aanpassing komt in 7 dagen met 1 tot 2 uur inspanning per dag in de warmte. Drie trainingen van 90 minuten in de warmte in een week verlagen de hittebelasting al met zo\'n 20 procent. Train in juli dus ook op warme dagen.',
      ],
    },
    {
      heading: 'Zon',
      items: [
        'UV wordt sterker naarmate je hoger komt, en je loopt de hele dag buiten.',
        'Verbrande huid zweet ongeveer een week minder goed, ook nadat roodheid en pijn weg zijn. Zonnebrand in week één maakt week twee zwaarder.',
        'Pet met nekflap, een licht shirt met lange mouwen, zonnebril categorie 3 en lippenbalsem met SPF 50.',
        'Maak pet en buff nat in elke beek: verdamping koelt meer dan je denkt.',
      ],
    },
    {
      heading: 'Hitteziekte herkennen',
      items: [
        'Hitte-uitputting: dorst, zwakte, hoofdpijn, misselijkheid, duizelig, veel zweten, maar helder van geest. Stoppen in de schaduw, natmaken, drinken met zout en rusten. Binnen een half uur moet het beter gaan.',
        'Hitteberoerte: lichaamstemperatuur boven 40 °C en het hoofd doet niet meer mee: verwardheid, vreemd gedrag, struikelen, flauwvallen of een aanval. Bij inspanning kan de huid nog nat van het zweet zijn, dus droge huid is geen voorwaarde.',
        'Bij een vermoeden van hitteberoerte gaat koelen voor alles: leg iemand in een beek of meer tot aan de nek, of maak hem nat en waaier, en bel intussen 112. Onderdompelen in koud water koelt het snelst.',
        'Krampen in kuiten en dijen bij lang zweten: rust, rek en zout.',
      ],
    },
  ],
  videos: [
    {
      title: 'Top tips for hiking in hot weather',
      channel: 'Mountaineering Scotland',
      url: 'https://www.youtube.com/watch?v=8ZW4N4aBdJk',
      language: 'en',
      note: 'Praktische tips van een bergsportbond voor wandelen in de warmte.',
    },
    {
      title: "Heat exhaustion vs heat stroke: What's the difference?",
      channel: 'Northwell Health',
      url: 'https://www.youtube.com/watch?v=4EI2ohKv1qI',
      language: 'en',
      note: 'Een spoedarts zet de signalen van hitte-uitputting en hitteberoerte naast elkaar.',
    },
  ],
  sources: [
    {
      label: 'American Family Physician: Prevention and Treatment of Heat Illness, richtlijnen van de Wilderness Medical Society (2025)',
      url: 'https://www.aafp.org/pubs/afp/issues/2025/1200/practice-guidelines-heat-illness.html',
    },
    {
      label: 'Journal of Occupational Medicine and Toxicology: Sweat rate and sodium loss during work in the heat',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2267797/',
    },
    {
      label: 'Swissinfo: klimaatrecords tijdens de hittegolf van augustus 2023',
      url: 'https://www.swissinfo.ch/eng/sci-tech/climate-records-tumble-as-switzerland-swelters-in-heatwave/48752472',
    },
    {
      label: 'L\'Info Durable: Alpes-Maritimes, een gemeente sluit het kraanwater door droogte',
      url: 'https://www.linfodurable.fr/alpes-maritimes-face-la-secheresse-une-commune-coupe-leau-du-robinet-32805',
    },
  ],
};

export default content;

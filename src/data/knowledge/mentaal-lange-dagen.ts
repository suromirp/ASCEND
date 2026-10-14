import type { KnowledgeContent } from '../knowledge';

const content: KnowledgeContent = {
  intro:
    'Een maand lopen wordt zelden beslist door je benen, maar door je hoofd en door de groep. De meeste lastige momenten beginnen met kleine keuzes die je moe, hongerig of onder tijdsdruk maakt. Wie weet hoe dat werkt, beslist rustiger en loopt verder.',
  weeklyTip:
    'Spreek voor elke etappe af waar en hoe laat jullie beslissen: door of terug.',
  sections: [
    {
      heading: 'Een maand in hapklare stukken',
      items: [
        'Denk niet in 650 km, maar in de volgende col, de volgende hut, de volgende sectie. Een doel dat je vandaag haalt, houdt je gaande.',
        'De eerste week is vaak de zwaarste: je lijf moet wennen aan elke dag 1000 m of meer stijgen. Daarna wordt het ritme meestal makkelijker.',
        'Plan rustdagen in een dal met voorzieningen, zoals Landry, Modane of Briançon. Een halve dag niets doen werkt beter dan doorbijten tot je leeg bent.',
        'Je humeur volgt je bloedsuiker en je slaap. Eet elke één tot anderhalf uur iets en neem chagrijn bij jezelf of een ander eerst als signaal: wanneer is er gegeten?',
      ],
    },
    {
      heading: 'Tegenslag opvangen',
      body:
        'Regen, een blaar, een volle hut of een pas die nog onder sneeuw ligt: op een maand gebeurt het allemaal. Het helpt als je het plan B al kent voordat je het nodig hebt, zoals de lage GR5E door het dal van de Arc in plaats van de hoge Vanoise, of een bus naar het volgende dorp. Een dag aanpassen is geen mislukking. De DAV noemt omkeren uitdrukkelijk een vaardigheid, geen nederlaag, en zegt dat het verschil zit tussen geluk gehad en goed beslist.',
    },
    {
      heading: 'Het 3x3 van de DAV',
      body:
        'Beoordeel drie dingen: de mens (jullie conditie, ervaring, vermoeidheid), het terrein (steilte, blootstelling, sneeuw) en de omstandigheden (weer, zicht, tijd). Doe dat drie keer: thuis bij het plannen, onderweg, en vlak voor het sleutelstuk van de dag. Het voordeel is dat het ook werkt als je moe of gehaast bent, omdat je niet hoeft na te denken over wat je moet afvinken. Een onrustig gevoel op een stuk pad is een signaal: kom eerst tot rust, kijk opnieuw, en kies bij blijvende twijfel de veilige kant.',
    },
    {
      heading: 'Valkuilen in een groep',
      body:
        'Onderzoek van Ian McCammon naar ruim 700 lawineongelukken leverde het ezelsbruggetje FACETS op: zes patronen waardoor groepen meer risico nemen dan elk lid alleen zou doen. Ze gelden net zo goed voor een pas in de zomer.',
      items: [
        'Familiarity: op bekend terrein let je minder op, juist als je ervaren bent.',
        'Acceptance: je wilt niet degene zijn die de rest ophoudt.',
        'Commitment: de hut is geboekt, het schema moet gehaald worden.',
        'Expert halo: iedereen volgt de meest ervaren loper, ook als die zich vergist.',
        'Scarcity: het gevoel dat het nu moet, omdat het weervenster sluit.',
        'Social facilitation: er lopen anderen voor je, dus het zal wel gaan.',
      ],
    },
    {
      heading: 'Samen beslissen in de praktijk',
      items: [
        'Leg \'s ochtends een keerpunt vast: een plek, een tijd en wat jullie daar willen zien. Dan beslis je niet pas als je al moe bent.',
        'Beslis stilstaand, niet al lopend. Even de rugzak af en iedereen kijkt mee.',
        'Laat de minst ervaren loper als eerste zeggen wat hij ziet en voelt. Zo voorkom je dat iedereen het oordeel van de ervarenste overneemt.',
        'Eén twijfel is genoeg om stil te staan. Wil één persoon terug of om, dan is dat het uitgangspunt van het gesprek, niet iets dat je moet wegpraten.',
        'Praat \'s avonds kort na over de dag. De DAV-bergwandelstudie laat zien dat bijna-ongelukken bespreken je gewoontes verbetert.',
      ],
    },
  ],
  videos: [
    {
      title: 'Überfordert: Wann sage ich Stopp? | Selbsteinschätzung und Gruppendynamik: die Entscheidung Folge 3',
      channel: 'Deutscher Alpenverein (DAV)',
      url: 'https://www.youtube.com/watch?v=sLO1F2Idwm4',
      language: 'de',
      note: 'Met een berggids op tour: hoe je jezelf eerlijk inschat als de rest gewoon doorloopt.',
    },
    {
      title: '(falsche) Gruppendynamiken: Interview mit Dr. Bernhard Streicher, Teil 2',
      channel: 'Deutscher Alpenverein: im Fokus',
      url: 'https://www.youtube.com/watch?v=3yfNNsYE42U',
      language: 'de',
      note: 'Een psycholoog legt uit hoe groepen elkaar in risico praten en hoe je dat doorbreekt.',
    },
    {
      title: 'Wie kann man Risiko berechnen? | Risiko-Drei-Schritt | 3x3 im Sommer',
      channel: 'Deutscher Alpenverein (DAV)',
      url: 'https://www.youtube.com/watch?v=62Ajx5i3Sy0',
      language: 'de',
      note: 'De 3x3-methode toegepast op zomertochten, kort en concreet.',
    },
  ],
  sources: [
    { label: 'DAV: Weiter oder umdrehen? Auf Bergtour richtig entscheiden', url: 'https://www.alpenverein.de/artikel/weiter-oder-umdrehen-auf-bergtour-richtig-entscheiden_fa57b374-315c-46aa-9826-67132f4deeb9' },
    { label: 'DAV Sicherheitsforschung: Bergwanderstudie Beinahe-Unfälle', url: 'https://www.alpenverein.de/artikel/sicherheitsforschung-wanderstudie_6ae0e95b-b4ee-4690-a3bd-1cb75e2e4d18' },
    { label: 'Avalanche.org: FACETS, menselijke factoren', url: 'https://avalanche.org/avalanche-encyclopedia/human/decision-making/human-factors/f-a-c-e-t-s/' },
  ],
};

export default content;

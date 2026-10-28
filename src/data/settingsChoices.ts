// ASCEND: de keuzes in de instellingen, op één plek. Een keuze heeft een titel, één
// regel erboven, het advies en per optie een naam, één regel eronder en soms
// een kortere waarde voor in de rij. Het keuzeblad (ChoiceSheet) en de samenvatting
// (engine/settingsSummary.ts) lezen allebei hier, zodat de rij en het blad nooit
// iets anders zeggen. Elke regel onder een optie is een feit over wat de keuze doet,
// geen uitleg; uitleg staat in data/settingsHelp.ts.

export interface ChoiceDef<T extends string | number> {
  // De groep boven de titel in het blad.
  group: string;
  title: string;
  line?: string;
  advice: T;
  // De sleutel van de uitleg in data/settingsHelp.ts, voor "Meer uitleg".
  help?: string;
  options: { value: T; label: string; note?: string; short?: string }[];
}

function def<T extends string | number>(d: ChoiceDef<T>): ChoiceDef<T> {
  return d;
}

export const CHOICES = {
  wijzigingen: def({
    group: 'Planning',
    title: 'Wijzigingen',
    line: 'Als ASCEND je planning wil aanpassen.',
    advice: 'auto_small' as 'always_ask' | 'auto_small' | 'auto_all',
    help: 'wijzigingen',
    options: [
      { value: 'always_ask', label: 'Vraag eerst', note: 'Wacht op je Akkoord, de weekcontrole meldt wat ze rechtzet' },
      { value: 'auto_small', label: 'Deels zelf', note: 'Weken verder weg zelf, met een melding' },
      { value: 'auto_all', label: 'Alles zelf', note: 'Meteen, met een melding achteraf' },
    ],
  }),
  testStilstaan: def({
    group: 'Planning',
    title: 'Stilstaan bij een testloop',
    line: 'Wachten voor een stoplicht in je snelste 5 km.',
    advice: 'skip' as 'skip' | 'count',
    help: 'testStilstaan',
    options: [
      { value: 'skip', label: 'Niet meetellen', note: 'De tijd dat je stilstond telt niet, ASCEND noemt de stops erbij', short: 'Niet meetellen' },
      { value: 'count', label: 'Meetellen', note: 'De klok loopt door, zoals het was', short: 'Meetellen' },
    ],
  }),
  ambitie: def({
    group: 'Planning',
    title: 'Ambitie',
    line: 'Hoe snel lopen en tochten opbouwen.',
    advice: 'standaard' as 'rustig' | 'standaard' | 'stevig',
    help: 'ambitie',
    options: [
      { value: 'rustig', label: 'Rustig', note: '10% trager, voor drukke weken' },
      { value: 'standaard', label: 'Standaard', note: 'Het plan zoals het is' },
      { value: 'stevig', label: 'Stevig', note: '10% sneller, terug naar standaard bij pijn' },
    ],
  }),
  rustdagDoen: def({
    group: 'Planning',
    title: 'Op je rustdag',
    line: 'Wat er op je rustdag staat.',
    advice: 'rest' as 'rest' | 'active',
    options: [
      { value: 'rest', label: 'Rust', note: 'Wandelen mag, er valt niets af te vinken' },
      { value: 'active', label: 'Hersteldag', note: '20 tot 30 min heel rustig, telt niet mee' },
    ],
  }),
  meerdere: def({
    group: 'Planning',
    title: 'Twee trainingen per dag',
    line: 'Als je tijd per dag het toelaat.',
    advice: 'automatic' as 'automatic' | 'always' | 'only_if_useful' | 'never',
    help: 'meerdere',
    options: [
      { value: 'automatic', label: 'Automatisch', note: 'ASCEND beslist zelf op je tijd per dag', short: 'Auto' },
      { value: 'always', label: 'Ja', note: 'Zoveel mogelijk samen als de tijd het toelaat', short: 'Ja' },
      { value: 'only_if_useful', label: 'Alleen als het moet', note: 'Alleen als er anders echt geen plek is', short: 'Alleen nodig' },
      { value: 'never', label: 'Nee', note: 'Nooit meer dan één training per dag', short: 'Nee' },
    ],
  }),
  kracht: def({
    group: 'Forge',
    title: 'Sets en gewichten',
    line: 'Waar je je krachttraining bijhoudt.',
    advice: 'ascend' as 'ascend' | 'macrofactor',
    options: [
      { value: 'ascend', label: 'In ASCEND', note: 'Invullen na je training', short: 'In ASCEND' },
      { value: 'macrofactor', label: 'In MacroFactor', note: 'Hier één tik om af te vinken', short: 'In MacroFactor' },
    ],
  }),
  volgorde: def({
    group: 'Forge',
    title: 'Eerst ophogen',
    line: 'Wat zwaarder wordt als het goed gaat.',
    advice: 'weight_first' as 'weight_first' | 'reps_first',
    options: [
      { value: 'weight_first', label: 'Gewicht', note: 'Een stap zwaarder zodra het kan' },
      { value: 'reps_first', label: 'Herhalingen', note: 'Eerst de bovenkant van je bereik' },
    ],
  }),
  werksets: def({
    group: 'Forge',
    title: 'Werksets',
    line: 'Door vermoeidheid til je per set iets minder.',
    advice: 'descending' as 'descending' | 'equal',
    options: [
      { value: 'descending', label: 'Dalend', note: 'Elke set een tikje lichter' },
      { value: 'equal', label: 'Gelijk', note: 'Alle sets hetzelfde gewicht' },
    ],
  }),
  opwarmen: def({
    group: 'Forge',
    title: 'Opwarmen',
    line: 'Volledig bij de eerste zware oefening, daarna één set of niets.',
    advice: 'smart' as 'smart' | 'scheme' | 'off',
    options: [
      { value: 'smart', label: 'Slim', note: 'Uit je geschatte kracht en je schijven' },
      { value: 'scheme', label: 'Schema', note: '40, 60 en 80% van je werkgewicht' },
      { value: 'off', label: 'Uit', note: 'Geen opwarmsets' },
    ],
  }),
  opwarmbereik: def({
    group: 'Forge',
    title: 'Opwarmen per',
    line: 'Wie de volle opbouw krijgt.',
    advice: 'group' as 'group' | 'exercise',
    options: [
      { value: 'group', label: 'Per spiergroep', note: 'Volle opbouw bij de eerste zware oefening van benen of bovenlichaam, daarna één set', short: 'Per spiergroep' },
      { value: 'exercise', label: 'Per oefening', note: 'Elke samengestelde oefening de volle opbouw', short: 'Per oefening' },
    ],
  }),
  doorvoeren: def({
    group: 'Forge',
    title: 'Wijzigingen doorvoeren',
    line: 'Wat er met de latere sets gebeurt als je een set aanpast.',
    advice: 'equal' as 'equal' | 'shift' | 'off',
    help: 'forgeDoorvoeren',
    options: [
      { value: 'equal', label: 'Gelijke sets', note: 'Latere sets die precies hetzelfde waren nemen de nieuwe waarde over', short: 'Gelijke sets' },
      { value: 'shift', label: 'Zelfde verschil', note: 'Het gewicht van de sets erna schuift evenveel mee', short: 'Zelfde verschil' },
      { value: 'off', label: 'Uit', note: 'Elke set pas je zelf aan', short: 'Uit' },
    ],
  }),
  rirVooraf: def({
    group: 'Forge',
    title: 'RIR vooraf invullen',
    line: 'Wat er in het RIR-veld van een werkset staat voor je iets invult.',
    advice: 'hint' as 'hint' | 'target',
    help: 'forgeRirVooraf',
    options: [
      { value: 'hint', label: 'Als hint', note: 'Het veld is leeg, het doel staat gedimd in beeld', short: 'Als hint' },
      { value: 'target', label: 'Met het doel', note: 'Het doel staat er al in, je past het aan als het anders was', short: 'Met het doel' },
    ],
  }),
  schatting: def({
    group: 'Forge',
    title: 'Sets die meetellen',
    line: 'Hoe meer herhalingen, hoe ruwer de schatting.',
    advice: 20 as 12 | 15 | 20,
    options: [
      { value: 12, label: 'Tot 12', note: 'Het strengst', short: 'Tot 12' },
      { value: 15, label: 'Tot 15', note: 'Ertussenin', short: 'Tot 15' },
      { value: 20, label: 'Tot 20', note: 'Ook hoge bereiken tellen mee', short: 'Tot 20' },
    ],
  }),
  forgeWeergave: def({
    group: 'Forge',
    title: 'Forge toont',
    line: 'Wat de kaart van een oefening laat zien. Op de kaart zelf kun je ook wisselen.',
    advice: 'one_rm' as 'one_rm' | 'work_weight',
    options: [
      { value: 'one_rm', label: '1RM', note: 'Je geschatte 1RM, met die van MacroFactor ernaast', short: '1RM' },
      { value: 'work_weight', label: 'Werkgewicht', note: 'Wat je bij je herhalingen aankunt', short: 'Werkgewicht' },
    ],
  }),
  forgeVergelijken: def({
    group: 'Forge',
    title: 'Vergelijken met',
    line: 'Met welke momenten Forge het getal van nu naast elkaar zet.',
    advice: '4_8' as '4_8' | '2_4' | '8_12' | '12_26',
    options: [
      { value: '4_8', label: '4 en 8 weken', note: 'Een maand en twee maanden terug', short: '4 en 8 weken' },
      { value: '2_4', label: '2 en 4 weken', note: 'Dichterbij, voor wie vaak traint', short: '2 en 4 weken' },
      { value: '8_12', label: '8 en 12 weken', note: 'Rustiger, een blok van een kwartaal', short: '8 en 12 weken' },
      { value: '12_26', label: '12 en 26 weken', note: 'Het lange werk, tot een half jaar terug', short: '12 en 26 weken' },
    ],
  }),
  forgeLeren: def({
    group: 'Forge',
    title: 'Gewichten van toestellen',
    line: 'Welke gewichten ASCEND op een toestel of kabel voorstelt.',
    advice: 'learned' as 'learned' | 'used_only' | 'profile',
    help: 'forgeLeren',
    options: [
      { value: 'learned', label: 'Geleerd en geschat', note: 'Wat je gebruikte, met de gaten en het stuk erboven aangevuld', short: 'Geleerd' },
      { value: 'used_only', label: 'Alleen wat je gebruikte', note: 'Nooit een gewicht dat je er nog niet pakte', short: 'Alleen gebruikt' },
      { value: 'profile', label: 'Stappen van je profiel', note: 'De stap die je bij Kabels en toestellen instelde', short: 'Profiel' },
    ],
  }),
  dumbbellLog: def({
    group: 'Forge',
    title: 'Dumbbells in je log',
    line: 'Of het gewicht dat je logt één dumbbell is of het totaal van twee.',
    advice: 'auto' as 'auto' | 'each' | 'total',
    help: 'forgeDumbbells',
    options: [
      { value: 'auto', label: 'Vanzelf herkennen', note: 'Per oefening, aan de gewichten in je logboek', short: 'Vanzelf' },
      { value: 'each', label: 'Per dumbbell', note: 'Het gewicht is die ene dumbbell', short: 'Per dumbbell' },
      { value: 'total', label: 'Totaal van twee', note: 'Het gewicht is beide dumbbells samen', short: 'Totaal van twee' },
    ],
  }),
  vermoeidheid: def({
    group: 'Forge',
    title: 'Vermoeidheid per set',
    line: 'Hoeveel kracht elke werkset de volgende kost.',
    advice: 'learned' as 'learned' | 'fixed',
    help: 'forgeVermoeidheid',
    options: [
      { value: 'learned', label: 'Leren per oefening', note: 'Uit je eigen sets, met 3% als start', short: 'Leren' },
      { value: 'fixed', label: 'Vast 3%', note: 'Voor elke oefening hetzelfde', short: 'Vast 3%' },
    ],
  }),
  forgeVolgorde: def({
    group: 'Forge',
    title: 'Volgorde van de oefeningen',
    line: 'Hoe de lijst op Forge gesorteerd staat.',
    advice: 'most' as 'most' | 'recent' | 'name',
    options: [
      { value: 'most', label: 'Meest getraind', note: 'De oefeningen die je het vaakst deed eerst', short: 'Meest getraind' },
      { value: 'recent', label: 'Laatst getraind', note: 'Wat je het laatst deed bovenaan', short: 'Laatst getraind' },
      { value: 'name', label: 'Op naam', note: 'Van A tot Z', short: 'Op naam' },
    ],
  }),
  restsignaal: def({
    group: 'Forge',
    title: 'Signaal als de rust om is',
    line: 'Een korte toon mengt met je muziek; trillen voel je ook in je zak.',
    advice: 'sound_vibrate' as 'sound_vibrate' | 'vibrate' | 'sound' | 'off',
    options: [
      { value: 'sound_vibrate', label: 'Geluid en trillen', short: 'Geluid en trillen' },
      { value: 'vibrate', label: 'Alleen trillen', note: 'Met het ritme van je gekozen geluid', short: 'Trillen' },
      { value: 'sound', label: 'Alleen geluid', short: 'Geluid' },
      { value: 'off', label: 'Niets', note: 'Je kijkt zelf op de balk onderaan', short: 'Niets' },
    ],
  }),
  rustgeluid: def({
    group: 'Forge',
    title: 'Geluid na de rust',
    line: 'Tik om te horen. Trillen volgt het ritme.',
    advice: 'chime' as 'chime' | 'bell' | 'beep' | 'boxing' | 'whistle' | 'gong',
    options: [
      { value: 'chime', label: 'Klokjes', note: 'Drie zachte tonen omhoog', short: 'Klokjes' },
      { value: 'bell', label: 'Bel', note: 'Eén diepe, ronde toon', short: 'Bel' },
      { value: 'beep', label: 'Piep', note: 'De korte piepjes van eerst', short: 'Piep' },
      { value: 'boxing', label: 'Boksbel', note: 'Een korte ringbel, zoals bij een ronde', short: 'Boksbel' },
      { value: 'whistle', label: 'Fluitje', note: 'Een kort sportfluitje met triller', short: 'Fluitje' },
      { value: 'gong', label: 'Gong', note: 'Eén lage, rustige gong met lange uitklank', short: 'Gong' },
    ],
  }),
  herinnering: def({
    group: 'Lichaam',
    title: 'Herinnering',
    line: 'Op Vandaag, als MacroFactor niets nieuws geeft.',
    advice: 14 as 0 | 1 | 2 | 7 | 14 | 28,
    options: [
      { value: 1, label: 'Elke dag' },
      { value: 2, label: 'Om de dag' },
      { value: 7, label: 'Elke week' },
      { value: 14, label: 'Elke 2 weken' },
      { value: 28, label: 'Elke 4 weken' },
      { value: 0, label: 'Nooit' },
    ],
  }),
  langeZondag: def({
    group: 'Doel en tochten',
    title: 'De lange zondag',
    line: 'Vanaf de fase Bergcapaciteit.',
    advice: 'hike' as 'hike' | 'run',
    options: [
      { value: 'hike', label: 'Bergtocht', note: 'Hoogtemeters en een rugzak die zwaarder wordt', short: 'Bergtocht' },
      { value: 'run', label: 'Duurloop', note: 'Elke zondag hardlopen', short: 'Duurloop' },
    ],
  }),
  langeLoopGroei: def({
    group: 'Planning',
    title: 'Groei van de lange loop',
    line: 'Hoe snel de lange loop groeit naar je hardloopwedstrijd.',
    advice: 'weekly' as 'weekly' | 'biweekly' | 'wave' | 'firm' | 'fast',
    help: 'langeLoopGroei',
    options: [
      { value: 'wave', label: 'Heel rustig', note: 'Per blok van vier weken, zoals eerst', short: 'Heel rustig' },
      { value: 'biweekly', label: 'Rustiger', note: 'Om de twee weken een stap van 10%', short: 'Rustiger' },
      { value: 'weekly', label: 'Volgens het onderzoek', note: 'Elke week hoogstens 10%, de piek om de week', short: 'Volgens het onderzoek' },
      { value: 'firm', label: 'Stevig', note: 'Elke week hoogstens 10%, de piek elke week toegestaan', short: 'Stevig' },
      { value: 'fast', label: 'Sneller dan het onderzoek', note: 'Wekelijks tot 120% van je langste loop van 30 dagen', short: 'Sneller dan het onderzoek' },
    ],
  }),
  klaarWeging: def({
    group: 'Doel en tochten',
    title: 'Weging bij een doeltijd',
    line: 'Hoe zwaar snelheid meetelt bij een wedstrijd met een doeltijd.',
    advice: 'speed' as 'speed' | 'equal',
    help: 'klaarWeging',
    options: [
      { value: 'speed', label: 'Snelheid weegt het zwaarst', note: 'Snelheid 60%, langste loop en weekvolume 20% elk; bij Sterker worden kracht 60% en harde sets 40%', short: 'Snelheid' },
      { value: 'equal', label: 'Gelijk', note: 'Elke meter telt even zwaar mee', short: 'Gelijk' },
    ],
  }),
  klaarGroei: def({
    group: 'Doel en tochten',
    title: 'Groei bij het rekenen',
    line: 'Hoe snel je volgens ASCEND beter wordt, in de meters van Klaar voor je doel.',
    advice: 'average' as 'average' | 'careful',
    help: 'klaarGroei',
    options: [
      { value: 'average', label: 'Gemiddeld', note: 'Het midden van de band, bij hardlopen 0,55% per week', short: 'Gemiddeld' },
      { value: 'careful', label: 'Voorzichtig', note: 'De onderkant van de band, bij hardlopen 0,3% per week', short: 'Voorzichtig' },
    ],
  }),
  klaarMarge: def({
    group: 'Doel en tochten',
    title: 'Marge bij een tijdslimiet',
    line: 'Hoeveel ruimte onder de limiet of cutoff ASCEND je gunt.',
    advice: 'ten' as 'ten' | 'five' | 'none',
    help: 'klaarMarge',
    options: [
      { value: 'ten', label: '10%', note: 'Ruimte voor eten, pauzes en een tragere dag', short: '10%' },
      { value: 'five', label: '5%', note: 'Krapper, voor wie strak plant', short: '5%' },
      { value: 'none', label: 'Geen', note: 'De limiet zelf is de grens', short: 'Geen' },
    ],
  }),
  rustNaTocht: def({
    group: 'Doel en tochten',
    title: 'Rust na een bergtocht',
    line: 'Voor je benen, na een tocht met veel dalen.',
    advice: 'soft' as 'soft' | 'strict',
    help: 'rustNaTocht',
    options: [
      { value: 'soft', label: 'Soepel', note: 'Een korte beendag mag na 48 uur' },
      { value: 'strict', label: 'Streng', note: 'Altijd 72 uur' },
    ],
  }),
  bergschoenen: def({
    group: 'Doel en tochten',
    title: 'Bergschoenen inlopen',
    line: 'Hoeveel kilometer wandelen en tochten je nieuwe schoenen nodig hebben.',
    advice: 100 as 50 | 75 | 100 | 150,
    help: 'bergschoenen',
    options: [
      { value: 50, label: '50 km', note: 'Voor schoenen die al bijna zitten' },
      { value: 75, label: '75 km' },
      { value: 100, label: '100 km', note: 'Samen met minstens 6 weken voor vertrek' },
      { value: 150, label: '150 km', note: 'Meer dan het advies' },
    ],
  }),
  naHoofddoel: def({
    group: 'Doel en tochten',
    title: 'Na je hoofddoel',
    line: 'Tijdens de tocht plant ASCEND nooit.',
    advice: 'stop' as 'stop' | 'maintain',
    options: [
      { value: 'stop', label: 'Niets meer plannen', note: 'Geen training tijdens en na de tocht', short: 'Niets meer' },
      { value: 'maintain', label: 'Onderhoudsweken', note: 'Gewone weken na de laatste tochtdag', short: 'Onderhoud' },
    ],
  }),
  terugknop: def({
    group: 'Vandaag en meldingen',
    title: 'Terugknop op een tab',
    line: 'Een blad of keuzemenu sluit altijd eerst.',
    advice: 'today' as 'today' | 'previous',
    options: [
      { value: 'today', label: 'Eerst naar Vandaag', note: 'Zoals de meeste Android-apps', short: 'Naar Vandaag' },
      { value: 'previous', label: 'Naar de vorige tab', note: 'In de volgorde waarin je ze opende', short: 'Vorige tab' },
    ],
  }),
  beweging: def({
    group: 'Vandaag en meldingen',
    title: 'Beweging',
    line: 'Hoeveel de app beweegt. Beperkte beweging van je telefoon gaat voor.',
    advice: 'full' as 'full' | 'calm' | 'off',
    help: 'beweging',
    options: [
      { value: 'full', label: 'Normaal', note: 'Tikfeedback, overgangen, vullen en optellen', short: 'Normaal' },
      { value: 'calm', label: 'Rustig', note: 'Alleen tikfeedback en overgangen', short: 'Rustig' },
      { value: 'off', label: 'Uit', note: 'Alles staat meteen op zijn plek', short: 'Uit' },
    ],
  }),
  plaatjes: def({
    group: 'Forge',
    title: 'Plaatjes bij oefeningen',
    line: 'Wat je ziet als je op het kaartje bij een oefening tikt.',
    advice: 'beide' as 'beide' | 'spierkaart' | 'uit',
    help: 'plaatjes',
    options: [
      { value: 'beide', label: 'Spierkaart en tekening', note: 'Welke spieren werken en hoe de beweging gaat', short: 'Kaart en tekening' },
      { value: 'spierkaart', label: 'Alleen spierkaart', note: 'Geen tekeningen, dus ook niets om te laden', short: 'Alleen spierkaart' },
      { value: 'uit', label: 'Uit', note: 'Geen kaartje bij een oefening', short: 'Uit' },
    ],
  }),
  lijfvraag: def({
    group: 'Vandaag en meldingen',
    title: 'Hoe voelt je lijf?',
    line: 'Een korte kaart op Vandaag over spierpijn, stijfheid of pijn.',
    advice: 'reden' as 'reden' | 'elke-week' | 'uit',
    help: 'lijfvraag',
    options: [
      { value: 'reden', label: 'Alleen als er reden is', note: 'Bij pijn, een zware week of na een tocht of wedstrijd', short: 'Bij reden' },
      { value: 'elke-week', label: 'Elke week', note: 'Ook zonder reden, op de dag van de weekterugblik', short: 'Elke week' },
      { value: 'uit', label: 'Uit', note: 'Geen kaart. Klachten melden kan altijd op Lichaam', short: 'Uit' },
    ],
  }),
  lichterbenen: def({
    group: 'Vandaag en meldingen',
    title: 'Lichter bij vermoeide benen',
    line: 'Na spierpijn of een zware loop een lichtere beendag of een dag later.',
    advice: 'voorstel' as 'voorstel' | 'regel' | 'uit',
    help: 'lichterbenen',
    options: [
      { value: 'voorstel', label: 'Met een voorstel', note: 'Een kaart met Lichter, een dag later en Liever niet', short: 'Voorstel' },
      { value: 'regel', label: 'Alleen een regel', note: 'Wat ASCEND ziet, zonder dat er iets te kiezen is', short: 'Regel' },
      { value: 'uit', label: 'Uit', note: 'Niets, ook niet bij het verplaatsen van een beendag', short: 'Uit' },
    ],
  }),
  lichterbenenHoe: def({
    group: 'Vandaag en meldingen',
    title: 'Hoe licht',
    line: 'Wat Lichter doet met een beendag.',
    advice: 'standaard' as 'standaard' | 'alleen-gewicht' | 'extra',
    help: 'lichterbenenHoe',
    options: [
      { value: 'standaard', label: 'Standaard', note: 'Zeker 3 herhalingen over en een set minder per oefening', short: 'Standaard' },
      { value: 'alleen-gewicht', label: 'Alleen gewicht', note: 'Zeker 3 herhalingen over, alle sets blijven staan', short: 'Alleen gewicht' },
      { value: 'extra', label: 'Extra licht', note: 'Zeker 4 herhalingen over en een set minder', short: 'Extra licht' },
    ],
  }),
  lucht: def({
    group: 'Vandaag en meldingen',
    title: 'Lucht bovenaan',
    line: 'De lichte lucht bovenaan een tab, of een donkere voor de avond.',
    advice: 'auto' as 'auto' | 'day' | 'night',
    help: 'lucht',
    options: [
      { value: 'auto', label: 'Op tijd', note: 'Licht overdag, donker in de avond en nacht', short: 'Op tijd' },
      { value: 'day', label: 'Altijd licht', short: 'Altijd licht' },
      { value: 'night', label: 'Altijd donker', short: 'Altijd donker' },
    ],
  }),
  luchtVanaf: def({
    group: 'Vandaag en meldingen',
    title: 'Donker vanaf',
    line: 'Met de zon volgt de echte zonsondergang en zonsopkomst op je plek. Een vaste tijd wordt om 07:00 weer licht.',
    advice: 'zon' as 'zon' | '19:00' | '20:00' | '21:00' | '22:00',
    help: 'lucht',
    options: [
      { value: 'zon', label: 'Met de zon', note: 'Donker na zonsondergang, licht bij zonsopkomst', short: 'Met de zon' },
      { value: '19:00', label: '19:00', short: 'Vanaf 19:00' },
      { value: '20:00', label: '20:00', short: 'Vanaf 20:00' },
      { value: '21:00', label: '21:00', short: 'Vanaf 21:00' },
      { value: '22:00', label: '22:00', short: 'Vanaf 22:00' },
    ],
  }),
  intensiteit: def({
    group: 'Lichaam',
    title: 'Intensiteit tellen',
    line: 'Waarop de kaart Intensiteit op Je stand je loop- en wandelminuten telt.',
    advice: 'heartrate' as 'heartrate' | 'plan',
    help: 'intensiteit',
    options: [
      { value: 'heartrate', label: 'Naar je hartslag', note: 'Wat je echt liep, per zone. Zonder hartslag telt het plan', short: 'Naar je hartslag' },
      { value: 'plan', label: 'Naar het plan', note: 'Elke training telt als wat ze bedoeld was', short: 'Naar het plan' },
    ],
  }),
  figuur: def({
    group: 'Lichaam',
    title: 'Figuur',
    line: 'Het lichaam op het scherm Lichaam, als man of als vrouw.',
    advice: 'auto' as 'auto' | 'man' | 'vrouw',
    help: 'figuur',
    options: [
      { value: 'auto', label: 'Automatisch', note: 'Van je koppeling, als die het weet. Anders Man', short: 'Automatisch' },
      { value: 'man', label: 'Man', short: 'Man' },
      { value: 'vrouw', label: 'Vrouw', short: 'Vrouw' },
    ],
  }),
  oorzaak: def({
    group: 'Wat speelde er',
    title: 'Mogelijke oorzaak',
    line: 'Wat ASCEND erbij noemt als je hartslag afwijkt.',
    advice: 'patroon' as 'uit' | 'weet' | 'patroon',
    help: 'wat-oorzaak',
    options: [
      { value: 'uit', label: 'Uit', note: 'Geen feiten in het blad. Ze tellen wel mee in het overzicht', short: 'Uit' },
      { value: 'weet', label: 'Wat ASCEND weet', note: 'Weer, horloge, logboek en je ziekmelding', short: 'Wat ASCEND weet' },
      { value: 'patroon', label: 'Ook je patroon', note: 'Plus "lijkt op" vanaf 4 keer', short: 'Ook je patroon' },
    ],
  }),
  ochtendTijd: def({
    group: 'Vandaag en meldingen',
    title: 'Tijd van de ochtendmelding',
    line: 'De melding komt na deze tijd, niet precies erop.',
    advice: '07:30' as '06:30' | '07:00' | '07:30' | '08:00' | '08:30' | '09:00',
    help: 'ochtendmelding',
    options: [
      { value: '06:30', label: '06:30', short: 'Rond 06:30' },
      { value: '07:00', label: '07:00', short: 'Rond 07:00' },
      { value: '07:30', label: '07:30', short: 'Rond 07:30' },
      { value: '08:00', label: '08:00', short: 'Rond 08:00' },
      { value: '08:30', label: '08:30', short: 'Rond 08:30' },
      { value: '09:00', label: '09:00', short: 'Rond 09:00' },
    ],
  }),
  hervatten: def({
    group: 'Vandaag en meldingen',
    title: 'Na een herstart',
    line: 'Terug op de pagina waar je was, binnen deze tijd.',
    advice: 120 as 0 | 60 | 120 | 240 | 480,
    options: [
      { value: 0, label: 'Uit', note: 'Altijd op Vandaag beginnen' },
      { value: 60, label: 'Binnen 1 uur' },
      { value: 120, label: 'Binnen 2 uur' },
      { value: 240, label: 'Binnen 4 uur' },
      { value: 480, label: 'Binnen 8 uur' },
    ],
  }),
  hartslagHorloge: def({
    group: 'Koppelingen',
    title: 'Hartslag op je horloge',
    line: 'Welke slagen je horloge bij een hartslagdoel krijgt.',
    advice: 'ascend' as 'ascend' | 'intervals',
    help: 'hartslagHorloge',
    options: [
      { value: 'ascend', label: 'Zones van ASCEND', note: 'Dezelfde slagen als in de app', short: 'ASCEND' },
      { value: 'intervals', label: 'Zones van intervals.icu', note: 'De zonenaam, intervals.icu rekent om', short: 'intervals.icu' },
    ],
  }),
  voorvoegsel: def({
    group: 'Koppelingen',
    title: 'Voorvoegsel voor de naam',
    line: 'Zo herken je de trainingen van ASCEND.',
    advice: 'short' as 'short' | 'long' | 'none',
    options: [
      { value: 'short', label: 'Kort', note: 'ASC, past het beste op je horloge', short: 'Kort' },
      { value: 'long', label: 'Lang', note: 'ASCEND, voor de naam', short: 'Lang' },
      { value: 'none', label: 'Geen', note: 'De naam zoals die is', short: 'Geen' },
    ],
  }),
  ochtendVanaf: def({
    group: 'Vandaag en meldingen',
    title: 'Ochtend begint om',
    advice: '5' as '4' | '5' | '6' | '7',
    options: [
      { value: '4', label: '4 uur', note: 'Voor wie heel vroeg opstaat', short: '04:00' },
      { value: '5', label: '5 uur', note: 'Na een late avond nog geen ochtendvraag', short: '05:00' },
      { value: '6', label: '6 uur', note: 'Iets later', short: '06:00' },
      { value: '7', label: '7 uur', note: 'Voor wie later opstaat', short: '07:00' },
    ],
  }),
  kaarten: def({
    group: 'Vandaag en meldingen',
    title: 'Kaarten op Vandaag',
    line: 'Welke kaarten je op Vandaag ziet. Je training staat er altijd.',
    advice: 'alles' as 'alles' | 'belangrijkst' | 'training',
    help: 'kaarten',
    options: [
      { value: 'alles', label: 'Alles laten zien', note: 'Alle kaarten, zoals het advies', short: 'Alles' },
      { value: 'belangrijkst', label: 'Alleen het belangrijkste', note: 'Je training, de ochtendcheck en het weer', short: 'Het belangrijkste' },
      { value: 'training', label: 'Alleen je training', note: 'Ook de ochtendcheck en het weer gaan uit', short: 'Alleen training' },
    ],
  }),
  terugblikDag: def({
    group: 'Vandaag en meldingen',
    title: 'Dag van de terugblik',
    advice: 'both' as 'both' | 'sunday' | 'monday',
    options: [
      { value: 'both', label: 'Zo en ma', note: 'Zondag de lopende week, maandag de vorige', short: 'Zo en ma' },
      { value: 'sunday', label: 'Zondag', note: 'Over de week die nog loopt', short: 'Zondag' },
      { value: 'monday', label: 'Maandag', note: 'Over de week die voorbij is', short: 'Maandag' },
    ],
  }),
} as const;

export type ChoiceId = keyof typeof CHOICES;

// De korte waarde van een keuze in de rij: de `short` van de optie, anders het label.
export function choiceShort(id: ChoiceId, value: string | number): string {
  const options = CHOICES[id].options as readonly { value: string | number; label: string; short?: string }[];
  const option = options.find((o) => o.value === value);
  return option ? option.short ?? option.label : String(value);
}

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
      { value: 'always_ask', label: 'Vraag eerst', note: 'Wacht op je akkoord, de weekcontrole meldt wat ze rechtzet' },
      { value: 'auto_small', label: 'Deels zelf', note: 'Weken verder weg zelf, met een melding' },
      { value: 'auto_all', label: 'Alles zelf', note: 'Meteen, met een melding achteraf' },
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
      { value: 'auto', label: 'Automatisch', note: 'Van je koppeling, als die het weet. Anders een man', short: 'Automatisch' },
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

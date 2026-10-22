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
      { value: 'always_ask', label: 'Vraag eerst', note: 'Elke wijziging wacht op je akkoord' },
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
    title: 'Twee trainingen op een dag',
    line: 'Als je tijd per dag het toelaat.',
    advice: 'automatic' as 'automatic' | 'always' | 'only_if_useful' | 'never',
    help: 'meerdere',
    options: [
      { value: 'automatic', label: 'Automatisch', note: 'ASCEND beslist zelf op je tijd per dag' },
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
    line: 'Nooit bij lichte gewichten en isolatie.',
    advice: 'smart' as 'smart' | 'scheme' | 'off',
    options: [
      { value: 'smart', label: 'Slim', note: 'Uit je geschatte kracht en je schijven' },
      { value: 'scheme', label: 'Schema', note: '40, 60 en 80% van je werkgewicht' },
      { value: 'off', label: 'Uit', note: 'Geen opwarmsets' },
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
  herinnering: def({
    group: 'Lichaam',
    title: 'Herinnering',
    line: 'Op Vandaag, als MacroFactor niets nieuws geeft.',
    advice: 14 as 0 | 7 | 14 | 28,
    options: [
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

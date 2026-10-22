// ASCEND — wat je doet bij een ongeluk als je alleen onderweg bent, kort en
// met bron. Uit docs/onderzoek/Noodhulp via satelliet.md ("Hoe hulp in de
// Franse Alpen werkt") en docs/visie/GR5-reis en coaching.md ("Alleen
// onderweg"). De volledige uitleg staat in de Kennisbank, "Als het misgaat".

export const ALARM_STEPS: string[] = [
  'Bel 112. Dat werkt in heel Frankrijk, ook als jouw aanbieder geen bereik heeft: een noodoproep gaat over elk netwerk dat je telefoon ziet. In de bergen komt de oproep meestal bij de PGHM (de bergeenheid van de gendarmerie) of de CRS-bergredders uit.',
  'Is het bereik te zwak voor een gesprek, stuur dan een sms naar 114. Dat nummer is bedoeld voor doven en slechthorenden, maar iedereen mag het gebruiken.',
  'Zeg waar je bent (coördinaten en de naam van de dichtstbijzijnde col of refuge), wat er gebeurde en hoeveel gewonden er zijn.',
  'Blijf bereikbaar. Na de eerste oproep stuurt de meldkamer vaak een link om je locatie te bepalen (Gendloc). Open die.',
  'Heb je een satellietcommunicator, druk dan op SOS. In een dal zonder bereik is dat het enige vangnet.',
  'Stuur daarna thuis een bericht, zodra dat kan.',
];

export const ALARM_COST_NOTE =
  'Reddingen door de staat zijn in Frankrijk in principe gratis, maar een gemeente mag kosten verhalen bij duidelijke nalatigheid. Controleer of je reisverzekering bergredding en helikopter dekt.';

export const NO_COVERAGE_NOTE =
  'Op de GR5 is mobiel bereik wisselvallig. In dalen zoals de Clarée voorbij Névache is er vrijwel niets. Reken op dagen zonder bereik.';

export const ALARM_SOURCES: { label: string; url: string }[] = [
  { label: 'FFRandonnée, wandelen in zones zonder bereik', url: 'https://www.ffrandonnee.fr/randonner-en-zone-blanche' },
  { label: 'OVO Network, noodnummers in de Franse Alpen', url: 'https://www.ovonetwork.com/blog/emergency-numbers-french-alps/' },
  { label: 'Banque des Territoires, facturering van bergredding', url: 'https://www.banquedesterritoires.fr/le-ministre-jean-didier-berger-entrouvre-la-porte-de-la-facturation-du-secours-en-montagne' },
];

export const ALARM_REPORT = 'Onderzoek "Noodhulp via satelliet op de GR5", oktober 2026';

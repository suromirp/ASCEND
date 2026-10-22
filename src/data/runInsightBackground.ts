// ASCEND: de achtergrond achter het blad "Waarom" bij het loopinzicht: korte
// alinea's met de bewijsgraad erbij, in de stijl van docs/visie. De volledige
// bronnen staan in data/researchSources.ts en dus bij Meer, Kennis (Bronnen).
// Uitwerking: docs/onderzoek/Loopgegevens en vooruitgang.md, hoofdstuk 3.
//
// "Eigen aanname" betekent: een drempel die ASCEND zelf voorstelt zonder bron, om
// na een paar weken te ijken op jouw eigen gegevens.

import type { InsightTopic } from '../engine/runComparison';

export interface BackgroundPart {
  heading: string;
  text: string;
  // Bewijs: sterk, matig, zwak, expertopinie, afgeleid of eigen aanname.
  evidence: string;
  sources: string[];
}

const HEART: BackgroundPart = {
  heading: 'Waarom hartslag bij vast tempo',
  text: 'De hartslag bij een vast, rustig tempo is de betrouwbaarste hartslagmaat, maar wel met een dag-tot-dagschommeling van ongeveer 3 procent. Daarom vergelijkt ASCEND alleen met jouw eigen eerdere loopjes van dezelfde soort, vlak, in dezelfde hartslagzone en bij een vergelijkbaar weer, en kijkt hij naar het midden van je laatste drie tot vijf loopjes. Een echte verbetering is ongeveer 1 tot 2 procent per maand, dus na één loop zegt de app alleen iets bij een groot verschil. De gewone voortgang zie je in de trend op Je stand.',
  evidence: 'Bewijs: matig',
  sources: ['Buchheit 2014', 'Nuuttila e.a. 2022', 'Vesterinen e.a. 2014', 'Muñoz e.a. 2014'],
};

const LEGS: BackgroundPart = {
  heading: 'Waarom je benen in de weg zitten',
  text: 'Na bergaf hardlopen kost hetzelfde tempo tot drie dagen later 4 tot 7 procent meer zuurstof. Moe-van-dalen benen maken je efficiëntiecijfer dus slechter zonder dat je minder fit bent. Daarom telt ASCEND alleen loopjes mee waarvoor je benen uitgerust waren, en zegt hij het als ze dat niet waren.',
  evidence: 'Bewijs: matig',
  sources: ['Bontemps e.a. 2020', 'Vernillo e.a. 2017'],
};

const DRIFT: BackgroundPart = {
  heading: 'Wat drift is en wat die 5 procent wel en niet is',
  text: 'Drift is het zakken van je snelheid per hartslag binnen één inspanning, van de eerste naar de tweede helft. Onder de 5 procent noemt een bekende coach goed, 5 tot 10 procent een matige beperking en erboven te zwaar voor je uithoudingsvermogen. Dat is een richtlijn en geen gemeten grens: er is geen studie gevonden die ze naast een fysiologische grens legt. Drift reageert langzaam op training en verschilt sterk per persoon, dus ASCEND vergelijkt met je eigen eerdere lange dagen en niet met een tabel. Een GR5-dag is precies zo\'n lange inspanning, daarom telt het.',
  evidence: 'Bewijs: expertopinie voor de percentages, matig voor het begrip durability',
  sources: ['TrainingPeaks, aerobe uithouding en decoupling', 'Matomäki e.a. 2023', 'Maunder e.a. 2021'],
};

const CLIMB: BackgroundPart = {
  heading: 'Waarom alleen dezelfde helling en dezelfde rugzak',
  text: 'De energie per hoogtemeter hangt sterk af van de helling en van wat je draagt, en is het laagst rond 20 tot 30 procent helling. Daarom vergelijkt ASCEND klimmen alleen binnen een hellingklasse van vier procent breed en met een rugzak binnen 2 kg. Klimsnelheid zonder hartslag zegt alleen dat je harder ging, dus hij kijkt naar dezelfde hartslag met meer snelheid, of dezelfde snelheid met minder hartslag. De grenzen van 8 procent snelheid en 4 of 5 slagen zijn eigen aannames.',
  evidence: 'Bewijs: sterk voor het principe (Minetti), eigen aanname voor de drempels',
  sources: ['Minetti e.a. 2002'],
};

const DESCENT: BackgroundPart = {
  heading: 'Waarom bergaf alleen feiten zijn',
  text: 'Dalen kost je benen het meest op een GR5-dag, en hartslagmaten missen het, want de oorzaak is de excentrische arbeid van de dijspieren en niet je hart. Er is geen gevalideerde maat voor beheerst dalen uit tempo, hartslag of cadans. Daarom toont ASCEND bergaf alleen feiten en geen oordeel. Het enige signaal is binnen één daling: zakt de snelheid in het laatste derde met 15 procent of meer terwijl je hartslag niet stijgt, dan past dat bij vermoeide benen.',
  evidence: 'Bewijs: matig voor de oorzaak, eigen aanname voor de 15 procent',
  sources: ['Vernillo e.a. 2017', 'Bontemps e.a. 2020'],
};

const FORM: BackgroundPart = {
  heading: 'Waarom pas en vorm binnen één loop',
  text: 'Bij hetzelfde tempo wordt de grondcontacttijd langer en de pas korter als je moe wordt. De reacties verschillen sterk per persoon, dus ASCEND vergelijkt het eerste derde met het laatste derde van dezelfde loop, zodat schommelingen van dag tot dag wegvallen. De borstband meet de loopvorm goed op een loopband, maar er is geen krachtplaatvergelijking. De grenzen (5 procent langer contact, 4 procent kortere pas, 3 stappen per minuut, twee van de drie tegelijk) zijn eigen aannames. Verticale oscillatie noemt de app nooit als regel: daar is geen spreidingscijfer van.',
  evidence: 'Bewijs: matig tot zwak, eigen aanname voor de drempels',
  sources: ['Zandbergen e.a. 2023', 'Miqueleiz e.a. 2025', 'Cabrera-Linares e.a. 2025', 'Zhang e.a. 2025'],
};

export const RUN_INSIGHT_BACKGROUND: Record<InsightTopic, BackgroundPart[]> = {
  efficiency: [HEART, LEGS],
  drift: [DRIFT, LEGS],
  climb: [CLIMB, LEGS],
  descent: [DESCENT],
  form: [FORM],
};

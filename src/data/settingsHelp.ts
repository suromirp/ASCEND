// ASCEND: de uitleg achter de InfoButton in de instellingen. Eén bestand, zodat
// de rijen zelf kort blijven (docs/beslissingen/2026-10-22-instellingen-in-groepen.md).
//
// Elke uitleg heeft één zin vooraf en twee of drie korte punten met een
// vetgedrukt begin ("Altijd: ...", "Waarom: ..."). Zo is lange uitleg toch snel
// te lezen. Het begin van een punt is kort; de dubbele punt komt van de weergave.

export interface SettingsHelp {
  title: string;
  lead: string;
  points: { head: string; text: string }[];
}

export const SETTINGS_HELP: Record<string, SettingsHelp> = {
  wijzigingen: {
    title: 'Wijzigingen',
    lead: 'Na een training, een gemiste sessie of een nieuwe instelling kan je planning schuiven.',
    points: [
      { head: 'Vraag eerst', text: 'je ziet alles vooraf en geeft akkoord.' },
      { head: 'Deels zelf', text: 'weken verder weg past ASCEND zelf aan, met een melding. Deze en volgende week, of iets schrappen, vraagt altijd eerst.' },
      { head: 'Alles zelf', text: 'alles meteen, met een melding en ongedaan maken.' },
    ],
  },
  ambitie: {
    title: 'Ambitie',
    lead: 'Hoe snel je lopen en tochten in minuten opbouwen.',
    points: [
      { head: 'Altijd', text: 'een training wordt nooit meer dan 10% langer dan je langste van de afgelopen maand.' },
      { head: 'Waarom', text: 'pezen en botten wennen langzamer dan je conditie.' },
      { head: 'Stevig', text: 'valt vanzelf terug op Standaard bij pijn of trainingen die te zwaar voelen.' },
    ],
  },
  meerdere: {
    title: 'Meerdere trainingen op één dag',
    lead: 'Mag ASCEND twee sessies op dezelfde dag plannen, als je tijd die dag het toelaat?',
    points: [
      { head: 'Automatisch', text: 'ASCEND beslist zelf op basis van je tijdbudget per dag.' },
      { head: 'Nee', text: 'nooit meer dan één training per dag.' },
      { head: 'Zwaar', text: 'benen en een zware loop op één dag staat apart onder Geavanceerd.' },
    ],
  },
  forge: {
    title: 'Kracht meerekenen',
    lead: 'ASCEND rekent stil mee met de krachttrainingen die je uit MacroFactor inleest.',
    points: [
      { head: 'Je krijgt', text: 'per oefening een voorstel voor de volgende keer.' },
      { head: 'Je planning', text: 'verandert er niet door.' },
    ],
  },
  gewicht: {
    title: 'Lichaamsgewicht',
    lead: 'ASCEND rekent met je trendgewicht, want dat is rustiger dan één weging.',
    points: [
      { head: 'Uit MacroFactor', text: 'staat er een trendgewicht in de export, dan gebruikt ASCEND dat. Anders de weging zelf.' },
      { head: 'Waarvoor', text: 'je rugzak als deel van je lichaamsgewicht, de beenindex en eiwit per kilo.' },
      { head: 'Zelf invullen', text: 'een globaal getal is genoeg.' },
    ],
  },
  drempel: {
    title: 'Drempel',
    lead: 'De hartslag die je ongeveer een uur vol kunt houden. Garmin noemt hem lactaatdrempel (LTHR).',
    points: [
      { head: 'Waar', text: 'in Garmin Connect, bij je hartslagzones.' },
      { head: 'Zonder', text: 'rekent ASCEND met je maximale hartslag. Dat is minder precies.' },
    ],
  },
  vanzelfAfvinken: {
    title: 'Vanzelf afvinken',
    lead: 'Een training van je horloge vinkt zichzelf af, maar alleen als het niet anders kan.',
    points: [
      { head: 'Alleen', text: 'dezelfde dag, één geplande training van dezelfde soort en ongeveer even lang.' },
      { head: 'Nooit', text: 'een test of wedstrijd. Die vink je zelf af.' },
      { head: 'Daarna', text: 'vraagt ASCEND hoe het ging. Met Klopt niet haal je het weg.' },
    ],
  },
  garminLeidend: {
    title: 'Garmin is leidend',
    lead: 'Komt een training die je zelf invulde ook van je horloge, dan tellen de cijfers van het horloge.',
    points: [
      { head: 'Overgenomen', text: 'duur, afstand, hartslag en hoogtemeters.' },
      { head: 'Blijft staan', text: 'gevoel, inspanning, pijn en je rugzak.' },
      { head: 'Terug', text: 'je eigen cijfers zijn bewaard en kun je terugzetten.' },
    ],
  },
  macrofactorLeidend: {
    title: 'Leidend voor kracht',
    lead: 'Voor een krachttraining die je al vastlegde, nemen de cijfers van MacroFactor het over.',
    points: [
      { head: 'Overgenomen', text: 'duur, oefeningen, sets en herhalingen in reserve.' },
      { head: 'Blijft staan', text: 'gevoel, inspanning, pijn en notities.' },
      { head: 'Uit', text: 'ASCEND vult alleen aan wat nog leeg is.' },
    ],
  },
  plaats: {
    title: 'Plaats voor het weer',
    lead: 'ASCEND haalt het weer bij Open-Meteo, voor één plek.',
    points: [
      { head: 'Volgt je locatie', text: 'je plek, afgerond op ongeveer een kilometer, wordt bijgewerkt als je de app opent. Hoogstens eens per uur.' },
      { head: 'Vaste plaats', text: 'de plek die je koos blijft zoals ze is.' },
      { head: 'Toestemming', text: 'zonder toestemming van je toestel gebeurt er niets.' },
    ],
  },
  ochtendcheck: {
    title: 'Ochtendcheck',
    lead: 'Een korte vraag over je benen, energie en slaap, voor je training.',
    points: [
      { head: 'Moe', text: 'dan kan ASCEND een rustiger dag voorstellen.' },
      { head: 'Pijn', text: 'een pijnplek van de laatste twee weken blijft altijd gevolgd, ook als dit uit staat.' },
    ],
  },
  kleding: {
    title: 'Je kleding',
    lead: 'Na een buitentraining kun je tikken of je kleding goed zat.',
    points: [
      { head: 'Dan', text: 'schuift ASCEND je voorkeur een halve graad op, hooguit vier graden per sport.' },
      { head: 'Terug', text: 'met Terug naar de standaard begint ASCEND weer bij nul.' },
    ],
  },
  trainingsduur: {
    title: 'Trainingsduur',
    lead: 'ASCEND leert hoe lang een krachttraining duurt uit de echte duur van je trainingen.',
    points: [
      { head: 'Na drie trainingen', text: 'rekent ASCEND met wat je meestal nodig hebt.' },
      { head: 'Eerder', text: 'helpt een eigen schatting, onder Geavanceerd.' },
    ],
  },
  rustNaTocht: {
    title: 'Rust na een bergtocht',
    lead: 'Hoe snel een zware beendag mag volgen op een bergtocht.',
    points: [
      { head: 'Soepel', text: 'een korte beendag mag al 48 uur na je tocht.' },
      { head: 'Streng', text: 'ASCEND houdt altijd 72 uur.' },
      { head: 'Geldt voor', text: 'nieuwe en gewijzigde tochten. Een tocht die al staat, houdt zijn planning tot je hem wijzigt.' },
    ],
  },
};

export type SettingsHelpKey = keyof typeof SETTINGS_HELP;

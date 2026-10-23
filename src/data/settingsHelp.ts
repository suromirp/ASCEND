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
  forgeDoorgeven: {
    title: 'Gewicht doorgeven',
    lead: 'Pas je bij een set het gewicht aan, dan schuiven de sets erna mee.',
    points: [
      { head: 'Alleen sets die je niet aanraakte', text: 'een set die je zelf aanpaste of afvinkte blijft zoals hij is.' },
      { head: 'Zelfde verschil', text: 'ga je 2,5 kg omhoog, dan gaan de volgende sets ook 2,5 kg omhoog.' },
      { head: 'Herhalingen', text: 'blijven per set zoals ze waren.' },
    ],
  },
  forgeSchijven: {
    title: 'Schijven bij de set',
    lead: 'Onder een werkset met een stang staat welke schijven je per kant nodig hebt.',
    points: [
      { head: 'Tik erop', text: 'dan opent het invoerpaneel met de stang erbij getekend.' },
      { head: 'Je sportschool', text: 'de schijven en stangen komen uit je sportschoolprofiel.' },
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
      { head: 'Horloge', text: 'slaap en hartslag kun je erin laten meetellen bij Koppelingen.' },
    ],
  },
  ochtendkaart: {
    title: 'Ochtendkaart',
    lead: 'Bovenaan Vandaag staat in de ochtend de vraag hoe je je voelt, zodat je hem niet hoeft te zoeken.',
    points: [
      { head: 'Alvast ingevuld', text: 'je slaap uit je horloge, en je benen volgens je beenindex. Bij elke keuze staat waar hij vandaan komt.' },
      { head: 'Slaap', text: 'gaat via Garmin Connect naar intervals.icu en komt soms later binnen dan je rusthartslag. Staat hij er nog niet, tik dan op Opnieuw ophalen.' },
      { head: 'Weg', text: 'zodra je hebt ingevuld, na twaalven of als je training van vandaag gelogd is.' },
      { head: 'Uit', text: 'de vraag blijft staan als regel bij Je dag.' },
    ],
  },
  ochtendmelding: {
    title: 'Ochtendmelding',
    lead: 'Een melding in de ochtend met de vraag hoe je je voelt. Tik erop en het blad staat open.',
    points: [
      { head: 'Tijdstip', text: 'bij benadering. Chrome bepaalt zelf wanneer ASCEND op de achtergrond wakker mag worden, meestal een paar keer per dag. De melding komt dus ergens na de tijd die jij kiest, en niet na elven.' },
      { head: 'Alleen geïnstalleerd', text: 'het werkt op Chrome voor Android, met ASCEND op je beginscherm. Chrome wekt een app vaker als je hem vaker gebruikt.' },
      { head: 'Toestemming', text: 'bij het aanzetten vraagt je telefoon om meldingen te mogen sturen. Er gaat niets naar een server: de melding wordt op je telefoon bedacht.' },
      { head: 'Kan het niet', text: 'dan krijg je de vraag als je de app opent.' },
    ],
  },
  loopinzicht: {
    title: 'Inzicht na een training',
    lead: 'Na een loop of tocht zie je hoogstens twee regels over wat beter ging en waar je op moet letten.',
    points: [
      { head: 'Vergelijkt', text: 'je loop met je eigen rustige loopjes, nooit met anderen.' },
      { head: 'Onderwerpen', text: 'zet je apart aan of uit onder Geavanceerd.' },
      { head: 'Reeksen', text: 'komen van je horloge, zet dat aan bij Koppelingen (Details van loopjes).' },
    ],
  },
  borstband: {
    title: 'Hartslag van de borstband',
    lead: 'Zonder borstband kan de hartslag van een andere bron komen, en dan vergelijkt ASCEND niet eerlijk.',
    points: [
      { head: 'Aan', text: 'elke loop telt als gemeten met de band.' },
      { head: 'Uit', text: 'ASCEND vergelijkt geen loopjes waarbij de bron kan zijn gewisseld.' },
    ],
  },
  loopweer: {
    title: 'Weer bij loopinzicht',
    lead: 'Voor eerlijk vergelijken zoekt ASCEND het weer van die dag op bij Open-Meteo.',
    points: [
      { head: 'Wat gaat mee', text: 'alleen een plek afgerond op ongeveer een kilometer.' },
      { head: 'Uit', text: 'er gaat niets naar de weerdienst voor loopinzicht.' },
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

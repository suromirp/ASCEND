// ASCEND: de uitleg achter de i bij de instellingen van de groep Koppelingen, op id van de verklaring
// (docs/visie/Ontwerp instellingen op een plek.md, stap 3). Alleen geladen in Instellingen of als je op de i tikt
// (data/settingsHelpKeys.ts), zodat deze tekst niet bij de start van de app laadt. De verklaring zegt `help: true`.

import type { SettingsHelp } from '../../../data/settingsHelp';

export const KOPPELINGEN_UITLEG: Record<string, SettingsHelp> = {
  garmin: {
    title: 'Via intervals.icu',
    lead: 'Je trainingen, slaap en hartslag komen van je Garmin via intervals.icu binnen, zonder overtypen.',
    points: [
      { head: 'Waarvoor', text: 'afvinken, slaap, rusthartslag en HRV. Wat je gebruikt kies je bij Gebruik van je horloge.' },
      { head: 'Niet te lezen', text: 'lukt het kijken naar de koppeling even niet, dan staat dat er. Probeer het zo opnieuw.' },
    ],
  },
  'bundel-horloge-gebruik': {
    title: 'Gebruik van je horloge',
    lead: 'Per soort gegeven: ophalen of niet.',
    points: [
      { head: 'Uit', text: 'betekent: niet ophalen en niet bewaren.' },
      { head: 'Health Connect', text: 'de keuzes gelden ook daarvoor. Staat Health Connect aan, dan heet deze rij Gebruik van je gegevens.' },
    ],
  },
  'vanzelf-afvinken': {
    title: 'Vanzelf afvinken',
    lead: 'Een training van je horloge vinkt zichzelf af, maar alleen als het niet anders kan.',
    points: [
      { head: 'Alleen', text: 'dezelfde dag, één geplande training van dezelfde soort en ongeveer even lang.' },
      { head: 'Nooit', text: 'een test of wedstrijd. Die vink je zelf af.' },
      { head: 'Daarna', text: 'komt de vraag hoe het ging. Met Klopt niet haal je het weg.' },
    ],
  },
  'garmin-leidend': {
    title: 'Garmin is leidend',
    lead: 'Komt een training die je zelf invulde ook van je horloge, dan tellen de cijfers van het horloge.',
    points: [
      { head: 'Overgenomen', text: 'duur, afstand, hartslag en hoogtemeters.' },
      { head: 'Blijft staan', text: 'gevoel, inspanning, pijn en je rugzak.' },
      { head: 'Terug', text: 'je eigen cijfers zijn bewaard. Je kunt ze terugzetten.' },
    ],
  },
  'correcties-overnemen': {
    title: 'Correcties uit intervals.icu overnemen',
    lead: 'Knip je in intervals.icu een stuk van een training af, of corrigeer je de hoogtemeters of de afstand, dan volgt de training hier.',
    points: [
      { head: 'Overgenomen', text: 'duur, afstand, stijging, daling, hartslag en cadans, alleen als ze in intervals.icu veranderden.' },
      { head: 'Blijft staan', text: 'gevoel, inspanning, pijn, notities, je rugzak, je krachtsets en de koppeling aan je planning. Een inkorting in ASCEND ook: het logboek vraagt dan of je de nieuwe cijfers wilt.' },
      { head: 'Terug', text: 'de vorige cijfers zijn bewaard. In het logboek zet je ze terug.' },
    ],
  },
  'horloge-stil': {
    title: 'Melden als je horloge stilvalt',
    lead: 'Geeft intervals.icu niets meer door, dan zie je geen foutmelding: het ophalen lukt, er komt alleen niets mee. Daar komt een melding van.',
    points: [
      { head: 'Wanneer', text: 'drie dagen geen ochtendgetallen, of geen training terwijl je er wel een invulde, en de koppeling zelf werkt.' },
      { head: 'Waar', text: 'één zin op Vandaag. Een tik opent de koppeling, Begrepen verbergt hem tot het opnieuw gebeurt.' },
      { head: 'Wat je kunt doen', text: 'kijk of je horloge nog synchroniseert met Garmin Connect en of intervals.icu je activiteiten nog toont.' },
    ],
  },
  'bundel-horloge-sturen': {
    title: 'Trainingen naar je horloge',
    lead: 'Ze komen in je intervals.icu-agenda en Garmin brengt ze naar je horloge.',
    points: [
      { head: 'Komende week', text: 'de trainingen van de komende week staan er.' },
    ],
  },
  'horloge-voorvoegsel': {
    title: 'Voorvoegsel voor de naam',
    lead: 'Voor de naam standaard ASC, anders de hele naam ASCEND, of niets. Zo herken je de trainingen van ASCEND op je horloge.',
    points: [
      { head: 'Geen', text: 'dan staat de naam van de training er alleen.' },
    ],
  },
  'horloge-hartslag': {
    title: 'Hartslag op je horloge',
    lead: 'Bij een hartslagdoel krijgt je horloge slagen, uit de zones van ASCEND of uit die van intervals.icu.',
    points: [
      { head: 'ASCEND', text: 'je horloge piept op dezelfde slagen als die waarop de training achteraf een oordeel krijgt.' },
      { head: 'intervals.icu', text: 'Alleen de zonenaam gaat mee en intervals.icu rekent die om met zijn eigen drempel. Dat kan anders uitkomen.' },
      { head: 'Rustige loop', text: 'de grens loopt van het begin van zone 1 tot het einde van zone 2. Zonder drempel of maximale hartslag blijft het bij de zonenaam.' },
    ],
  },
  'horloge-rustige-loop': {
    title: 'Rustige loop: ruime grens',
    lead: 'Bij een rustige loop loopt de grens van zone 1 tot en met zone 2, zodat je niet piept bij even zakken. Alleen bij een hartslagdoel.',
    points: [
      { head: 'Waarom', text: 'hardlopend kom je zelden onder zone 1, dus het horloge piept vooral als je te hoog gaat.' },
    ],
  },
  'horloge-eigen-workout': {
    title: 'Eigen workout bij een andere manier',
    lead: 'Kies je bij een looptraining de StairMaster, dan krijgt je horloge een wandelworkout met dezelfde blokken.',
    points: [
      { head: 'Waarom', text: 'een hardloopworkout met tempo klopt niet op de trap. De wandelworkout gaat op gevoel en hartslag.' },
      { head: 'Let op', text: 'je start hem bij Wandelen, dus je horloge legt de training vast als wandeling, zonder traptelling.' },
      { head: 'Uit', text: 'de workout van de training blijft staan en je start de manier zonder workout.' },
    ],
  },
  'horloge-gedaan-weghalen': {
    title: 'Gedane trainingen weghalen',
    lead: 'Een training die je deed of oversloeg, verdwijnt weer uit je agenda.',
    points: [
      { head: 'Waarom', text: 'een opgeruimde agenda laat zien wat er nog komt.' },
    ],
  },
  'horloge-status': {
    title: 'Laten zien of het gelukt is',
    lead: 'Eén regel bij de training en een klein horloge in Week, alleen als het verstuurd is of niet lukte.',
    points: [
      { head: 'Uit', text: 'geen regel en geen horloge, het versturen gaat gewoon door.' },
    ],
  },
  'health-connect': {
    title: 'Health Connect',
    lead: 'In de Android-app komen je trainingen, slaap, rusthartslag, HRV en gewicht uit Health Connect, als je dat aanzet.',
    points: [
      { head: 'Toestemming', text: 'Android vraagt pas als je het aanzet. Alleen leesrechten, en er komt nooit iets in Health Connect. Wat je bij Gebruik van je gegevens uitzet, blijft ook hier liggen.' },
      { head: 'Met intervals.icu', text: 'intervals.icu gaat voor. Health Connect vult alleen aan wat ontbreekt. Ophalen gebeurt bij het openen van de app, hoogstens elke drie uur.' },
      { head: 'Je planning', text: 'verandert er niet door. Een training wordt pas een log als je hem op Vandaag opslaat. Uit haalt wat al opgehaald was van je telefoon. Je logs blijven staan.' },
    ],
  },
  macrofactor: {
    title: 'Laatste export',
    lead: 'Krachttrainingen en gewicht uit je MacroFactor-export, met de echte duur en herhalingen in reserve.',
    points: [
      { head: 'Opnieuw inlezen', text: 'lees de export opnieuw in voor nieuwe dagen.' },
    ],
  },
  'macrofactor-leidend': {
    title: 'Leidend voor kracht',
    lead: 'Voor een krachttraining die je al vastlegde, nemen de cijfers van MacroFactor het over.',
    points: [
      { head: 'Overgenomen', text: 'duur, oefeningen, sets en herhalingen in reserve.' },
      { head: 'Blijft staan', text: 'gevoel, inspanning, pijn en notities.' },
      { head: 'Uit', text: 'Je eigen cijfers blijven staan; alleen lege velden krijgen een waarde.' },
    ],
  },
  'bundel-strava': {
    title: 'Tekst voor Strava',
    lead: 'Er staat een titel klaar die zegt wat voor training het was. Je plakt hem zelf in Strava.',
    points: [
      { head: 'Wat', text: 'een titel zoals Heuvelintervallen · 6 × 90 s, en als je wilt één regel waarom. Geen afstand, totale tijd of tempo: die toont Strava al.' },
      { head: 'Waar', text: 'bij een gedane training in het logboek en in de vraag erna op Vandaag.' },
      { head: 'Zelf plakken', text: 'Niets gaat vanzelf naar Strava. Daar is een server voor nodig.' },
    ],
  },
  datavelden: {
    title: 'Datavelden voor je horloge',
    lead: 'Per soort training staat welke datapagina\'s je op je horloge zet. Er verandert niets aan je planning.',
    points: [
      { head: 'Zelf kiezen', text: 'tik een veld aan en kies een ander. Het advies zelf blijft staan.' },
      { head: 'Zelf instellen', text: 'Er gaat niets naar je horloge.' },
      { head: 'Bij een training', text: 'onder Horloge op het trainingsscherm staan ze als tekst.' },
    ],
  },
  'horloge-soort': {
    title: 'Soort van een loop toetsen',
    lead: 'Je horloge noemt een activiteit een loop als je hem als loop startte. Tempo en hartslag tellen mee voordat hij wordt opgeslagen.',
    points: [
      { head: 'Wandeltempo', text: 'een loop van 10 min per km of trager wordt een wandeling. Bij Andere training sla je hem toch als loop op.' },
      { head: 'Hard', text: 'een losse loop met een gemiddelde hartslag ruim boven zone 2 wordt een harde training (meestal de tempoloop), geen rustige duurloop. Zonder hartslag telt je tempo, zonder beide volgt geen oordeel.' },
      { head: 'Altijd', text: 'te kort, te hard of in wandeltempo vinkt nooit vanzelf af en heet nooit "zoals gepland", ook als dit uit staat.' },
    ],
  },
};

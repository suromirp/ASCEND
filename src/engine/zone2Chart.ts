// ASCEND: de grafiek en de uitleg achter de i bij Tempo bij zone 2.
//
// Leest alleen de uitkomst van aerobicTrend (metingen en de ene uitspraak, zone2Statement):
// geen tweede berekening van het tempo, dus grafiek, kaart en tekst zeggen hetzelfde.
// Het venster is dat van de uitspraak (R.lineWeeks, 8 weken tot vandaag). Elke stip is één
// loop, want stukken uit dezelfde loop zijn samen één meting (hoofdstuk 6 van het verslag).
// De lijn en de waaier staan er alleen bij een uitspraak die iets zegt; bij een eerste schatting
// en bij te veel verschil alleen de stippen. Besluit: docs/beslissingen/2026-11-09-tempo-grafiek.md.
//
// Puur: geen React, geen IndexedDB. Plant niets.

import { addDays, daysBetween } from '../utils/dates';
import { bandPhrase, formatPace, type AerobicTrend, type Zone2Measurement } from './aerobicTrend';
import { ZONE2_RULES as R } from './zone2Rules';

export interface Zone2ChartDot {
  logId: string;
  date: string;
  // 0 is het begin van het venster, 1 is vandaag.
  x: number;
  paceSec: number;
  // Een warme loop staat er gedimd bij en telt niet mee.
  counts: boolean;
  pieces: number;
  from: Zone2Measurement['from'];
}

export type Zone2ChartState = 'leeg' | 'eerste-schatting' | 'uitspraak' | 'te-veel-verschil';

export interface Zone2Chart {
  state: Zone2ChartState;
  fromDate: string;
  toDate: string;
  dots: Zone2ChartDot[];
  // De lijn van de uitspraak, van de eerste loop tot vandaag.
  line?: { x1: number; x2: number; sec1: number; sec2: number };
  // De waaier: hoe schuin de lijn met de band van 80 procent kan lopen, rond het zwaartepunt van
  // de lopen. Per rand twee punten (bij x1 en x2), in seconden per km.
  fan?: { x1: number; x2: number; fast1: number; fast2: number; slow1: number; slow2: number };
  // De as: boven het snelste tempo (minste seconden), onder het traagste. Sneller staat boven.
  fastSec: number;
  slowSec: number;
  ticks: number[];
  // Wat de uitspraak draagt: lopen die meetellen, hun stukken samen, lopen die met de hele loop
  // tellen (geen stukken), en warme lopen die gedimd staan.
  runs: number;
  pieces: number;
  wholeRuns: number;
  warmRuns: number;
}

const TICK_STEPS = [5, 10, 15, 30, 60, 120];

// Rechte getallen voor de as: twee tot vier streepjes, op een stap van 5, 10, 15, 30 of 60 s.
function axis(lo: number, hi: number): { fastSec: number; slowSec: number; ticks: number[] } {
  const span = Math.max(hi - lo, 10);
  const step = TICK_STEPS.find((s) => span / s <= 3) ?? TICK_STEPS[TICK_STEPS.length - 1];
  const fastSec = Math.floor((lo - step / 2) / step) * step;
  const slowSec = Math.ceil((hi + step / 2) / step) * step;
  const ticks: number[] = [];
  for (let t = fastSec + step; t < slowSec; t += step) ticks.push(t);
  return { fastSec, slowSec, ticks };
}

export function zone2Chart(trend: Pick<AerobicTrend, 'measurements' | 'statement'>, today: string): Zone2Chart {
  const days = 7 * R.lineWeeks;
  const fromDate = addDays(today, -days);
  // Hetzelfde venster als zone2Statement: na het begin, tot en met vandaag.
  const inWindow = trend.measurements.filter((m) => m.date > fromDate && m.date <= today);
  const xOf = (date: string) => daysBetween(fromDate, date) / days;
  const dots: Zone2ChartDot[] = inWindow.map((m) => ({ logId: m.logId, date: m.date, x: xOf(m.date), paceSec: m.paceSec, counts: m.counts, pieces: m.pieces, from: m.from }));
  const counted = inWindow.filter((m) => m.counts);
  const s = trend.statement;
  const state: Zone2ChartState = !s || counted.length === 0 ? 'leeg' : s.kind === 'eerste-schatting' ? 'eerste-schatting' : s.verdict === 'te-veel-verschil' ? 'te-veel-verschil' : 'uitspraak';

  let line: Zone2Chart['line'];
  let fan: Zone2Chart['fan'];
  if (state === 'uitspraak' && s?.kind === 'uitspraak') {
    const x1 = xOf(s.line.fromDate);
    const x2 = xOf(s.line.toDate);
    line = { x1, x2, sec1: s.line.fromSec, sec2: s.line.toSec };
    // Het zwaartepunt: het gewogen gemiddelde van de dagen, zoals in zone2Statement. Daar draait
    // de lijn om als de helling binnen de band verschuift.
    const totalW = counted.reduce((n, m) => n + m.weight, 0);
    const cx = counted.reduce((n, m) => n + xOf(m.date) * m.weight, 0) / totalW;
    const at = (x: number) => (x2 === x1 ? line!.sec1 : line!.sec1 + ((line!.sec2 - line!.sec1) * (x - x1)) / (x2 - x1));
    const cy = at(cx);
    // De band gaat over 4 weken; per deel van het venster is dat days / firstSpanDays keer zoveel.
    const per = days / R.firstSpanDays;
    const edge = (changeSec: number, x: number) => cy + changeSec * per * (x - cx);
    fan = { x1, x2, fast1: edge(s.highSec, x1), fast2: edge(s.lowSec, x2), slow1: edge(s.lowSec, x1), slow2: edge(s.highSec, x2) };
  }

  const values = [...dots.map((d) => d.paceSec), ...(line ? [line.sec1, line.sec2] : []), ...(fan ? [fan.fast1, fan.fast2, fan.slow1, fan.slow2] : [])];
  const { fastSec, slowSec, ticks } = values.length > 0 ? axis(Math.min(...values), Math.max(...values)) : { fastSec: 0, slowSec: 0, ticks: [] };

  return {
    state,
    fromDate,
    toDate: today,
    dots,
    ...(line ? { line } : {}),
    ...(fan ? { fan } : {}),
    fastSec,
    slowSec,
    ticks,
    runs: counted.length,
    pieces: counted.reduce((n, m) => n + m.pieces, 0),
    wholeRuns: counted.filter((m) => m.from === 'whole').length,
    warmRuns: inWindow.filter((m) => !m.counts).length,
  };
}

const plural = (n: number, one: string, more: string) => `${n === 1 ? 'één' : n} ${n === 1 ? one : more}`;

export interface Zone2ExplainOptions {
  // De instelling "Tempo uit stabiele stukken".
  pieces: boolean;
  // Hartslag ingevuld: dan is de vaste hartslag het midden van je eigen zone 2.
  zones: boolean;
  referenceHr: number;
}

// De uitleg in gewone woorden, in alinea's. Elke zin volgt de code: het venster, de drempels uit
// zone2Rules en de ene uitspraak. Bij te weinig gegevens zegt de tekst dat, en niets meer.
export function zone2Explanation(chart: Zone2Chart, statement: AerobicTrend['statement'], o: Zone2ExplainOptions): string[] {
  const out: string[] = [];
  const hrWords = o.referenceHr > 0 ? `${o.referenceHr} slagen per minuut` : 'één vaste hartslag';

  // Wat het getal is.
  if (o.pieces) {
    out.push(
      `Het getal is je tempo per km bij ${hrWords}${o.zones && o.referenceHr > 0 ? ', het midden van je zone 2' : ''}. ASCEND haalt het uit stabiele stukken van je buitenlopen: minstens ${R.minPieceSec / 60} minuten met een vaste hartslag en een vast tempo, op vrijwel vlak terrein, en nooit uit de eerste ${R.startAfterSec / 60} minuten van een loop. Een stuk een paar slagen hoger of lager rekent ASCEND om naar die ene hartslag.`,
    );
  } else {
    out.push(`Het getal is je tempo per km bij ${hrWords}. Tempo uit stabiele stukken staat uit, dus elke vlakke rustige of lange duurloop telt met de gemiddelde hartslag van de hele loop.`);
  }
  if (!o.zones) out.push('Je hartslag is nog niet ingevuld. Vul hem in bij Instellingen, Lichaam, dan rekent ASCEND met je eigen zone 2.');

  // Wat sneller of trager betekent.
  out.push('Sneller bij dezelfde hartslag past bij fitter worden. In de grafiek staat sneller boven. Trager kan ook komen door vermoeidheid, warmte of weinig slaap. Van dag tot dag schommelt dit tempo al snel een paar procent, daarom telt de lijn over weken en niet één loop.');

  // Wat de uitspraak draagt, en wanneer hij zwijgt.
  const runs = plural(chart.runs, 'loop', 'lopen');
  const carried = o.pieces && chart.pieces > 0 ? `${runs} met samen ${plural(chart.pieces, 'stuk', 'stukken')}` : runs;
  const whole = o.pieces && chart.wholeRuns > 0 ? ` ${chart.wholeRuns === 1 ? 'Eén loop telt' : `${chart.wholeRuns} lopen tellen`} met de hele loop, omdat er geen reeks van de loop is of hij op de loopband was.` : '';
  const oneMeasurement = o.pieces && chart.pieces > chart.runs ? ' Stukken uit dezelfde loop tellen samen als één meting, want ze delen dezelfde dag, slaap en weer.' : '';
  const need = `Voor een uitspraak over sneller of trager zijn minstens ${R.firstRuns} lopen nodig, verspreid over minstens ${R.firstSpanDays / 7} weken en ${R.firstWeeks} verschillende weken.`;
  if (chart.state === 'leeg') {
    out.push(`Er is nog geen loop die meetelt in de laatste ${R.lineWeeks} weken. Daarom zegt ASCEND nog niets over je tempo. ${need}`);
  } else if (chart.state === 'eerste-schatting') {
    out.push(`Dit rust op ${carried} uit de laatste ${R.lineWeeks} weken.${oneMeasurement}${whole} Dat is te weinig voor een verandering. ${need} Tot dan is het getal een eerste schatting en zegt ASCEND niets over sneller of trager.`);
  } else if (statement?.kind === 'uitspraak') {
    const base = `De lijn loopt door ${carried} uit de laatste ${R.lineWeeks} weken.${oneMeasurement}${whole}`;
    if (chart.state === 'te-veel-verschil') {
      out.push(`${base} Je lopen verschillen nog te veel: de band rond de verandering is breder dan ${R.tooWideSec} seconden. Dan zegt ASCEND niets over sneller of trager, en staat er geen lijn in de grafiek.`);
    } else {
      const phrase = bandPhrase(statement);
      const band = phrase === 'gelijk' ? `Afgerond op ${R.roundSec} seconden is de verandering per ${R.firstSpanDays / 7} weken nul.` : `De verandering per ${R.firstSpanDays / 7} weken ligt waarschijnlijk tussen twee grenzen: ${phrase} per km, afgerond op ${R.roundSec} seconden.`;
      const unclear = statement.verdict === 'geen-duidelijke-verandering' && phrase !== 'gelijk' ? ' Die band ligt aan beide kanten van nul, dus ASCEND noemt het nog geen duidelijke verandering.' : '';
      out.push(`${base} ${band} Waarschijnlijk betekent hier: in ongeveer 8 van de 10 gevallen valt de echte verandering binnen die band. De lichte waaier in de grafiek laat zien hoe schuin de lijn daarmee kan lopen.${unclear}`);
    }
  }
  if (chart.warmRuns > 0) out.push(`${chart.warmRuns === 1 ? 'Eén warme loop staat' : `${chart.warmRuns} warme lopen staan`} gedimd in de grafiek: boven ${R.heatOutC} graden gevoelstemperatuur telt een loop niet mee.`);
  out.push('Je plan verandert hier nooit door.');
  return out;
}

// Een stip in woorden, voor wie de grafiek niet ziet.
export function dotLabel(d: Zone2ChartDot): string {
  const what = d.from === 'whole' ? 'hele loop' : plural(d.pieces, 'stuk', 'stukken');
  return `${formatPace(d.paceSec)} per km, ${what}${d.counts ? '' : ', warm, telt niet mee'}`;
}

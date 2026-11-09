// Regels voor de opbouw en het doel: rustweek overslaan, week herhalen,
// rugzakdoel voor een tent en de doeltijd.

import { proposeRestWeekSkip } from './restWeek';
import { costSentence, proposeRepeatWeek, shortfallSentence } from './repeatWeek';
import { mondayOfWeek, formatWeekdayDateNL } from '../utils/dates';
import { PACK_WEIGHT_EXPLANATION } from './gr5Profile';
import { checkTargetTime, outlookSaid, outlookWeeksSaid, racePaces } from './racePaces';
import { countedTests, formatRaceTime } from './racePrediction';
import { RACE_TEMPLATE_ID } from './raceBlock';
import { formatNumberNL } from '../utils/number';
import { awaitsEffort, testStopsRemark } from './testJudgment';
import { stopsShort } from './bestEffort';
import type { AdviceInputs, Advice } from './adviceShared';

export function restWeekSkipAdvice(inputs: AdviceInputs): Advice[] {
  if (!inputs.program) return [];
  const found = proposeRestWeekSkip({
    program: inputs.program, plannedSessions: inputs.plannedSessions, logs: inputs.logs, templates: inputs.templates,
    today: inputs.asOf, illnessEpisodes: inputs.illnessEpisodes, respondedIds: inputs.respondedIds,
  });
  if (!found) return [];
  const title = 'Rustweek overslaan?';
  const effect = `De week van ${formatWeekdayDateNL(found.weekStart)} is een rustweek. Je liep de afgelopen weken ${found.doneMinutes} van de ${found.plannedMinutes} geplande minuten. Er is dus weinig om van te herstellen. Voorstel: doortrainen als een normale opbouwweek, geen tweede zwaarste week.`;
  const why = 'Een rustweek is er om de vermoeidheid van de weken ervoor kwijt te raken. Trainers zien hem als hulpmiddel, niet als vaste regel (Bell e.a. 2023), en na een licht begin is er weinig vermoeidheid. Je loopt nog steeds nooit meer dan 10% langer dan je langste loop van de afgelopen maand. Voelen je benen toch zwaar, zet de rustweek dan terug in Week.';
  return [{ id: found.id, trigger: 'plan_update', ruleId: 'REST-WEEK-SKIP', title, effect, why, priority: 2, restWeekSkip: found.weekStart }];
}

// --- Rule REPEAT-WEEK --------------------------------------------------------
// Trigger: last week clearly fell short (under 60% of the trainings, or the
// key session missed), and it was no rest week and no ill week. Rule: this
// week carries last week's load instead of stepping up. Always a proposal:
// Akkoord records it on the program, Liever niet leaves everything as it is
// and the question is not asked again for this week.
export function repeatWeekAdvice(inputs: AdviceInputs): Advice[] {
  const found = proposeRepeatWeek({
    program: inputs.program, plannedSessions: inputs.plannedSessions, logs: inputs.logs, templates: inputs.templates,
    today: inputs.asOf, illnessEpisodes: inputs.illnessEpisodes, planChangeLog: inputs.extraSession?.planChangeLog,
    // Races still ahead (their goals) and races already run (their session
    // or log): the week after a race is its own recovery, never a repeat.
    raceWeeks: [...new Set([
      ...(inputs.raceGoals ?? []).map((r) => r.raceWeek),
      ...inputs.plannedSessions.filter((s) => s.templateId === RACE_TEMPLATE_ID).map((s) => mondayOfWeek(s.scheduledDate)),
      ...inputs.logs.filter((l) => l.templateId === RACE_TEMPLATE_ID).map((l) => mondayOfWeek(l.completedDate)),
    ])], respondedIds: inputs.respondedIds,
  });
  if (!found) return [];
  const title = 'Deze week nog een keer?';
  const effect = `${shortfallSentence(found)} Voorstel: deze week houdt de belasting van vorige week, in plaats van een stap omhoog. ${costSentence(found.impact)} De rustweek, de golven daarna, de taper en je doeldatum blijven zoals ze waren. Met Liever niet blijft alles staan en vraagt ASCEND er deze week niet meer naar.`;
  const why = 'Een week herhalen na een tegenvallende week werkt beter dan doorschuiven naar de zwaardere week: je bouwt pas verder als de belasting van vorige week er echt in zit. ASCEND remt alleen. Na een goede week bouwt het niet sneller, want vooruitgang laat je zien in je test, niet in extra minuten; bijsturen door te remmen geeft in studies vooral minder slechte uitkomsten (Nuuttila e.a. 2022). Het kost je doeldatum niets: alleen de zwaarste week van deze golf wordt lichter, de rustweek en alle golven daarna staan nog op de kalender. De 110%-regel houdt de stap daarna klein, want die meet tegen wat je echt liep. Was je ziek, dan geldt het terugkomschema en vraagt ASCEND dit niet. Je kunt het altijd terugzetten in Week.';
  return [{ id: found.id, trigger: 'plan_update', ruleId: 'REPEAT-WEEK', title, effect, why, priority: 3, repeatWeek: found.weekStart }];
}

export function tentPackAdvice(inputs: AdviceInputs): Advice[] {
  const p = inputs.tentPack;
  if (!p) return [];
  return [{
    id: p.id,
    trigger: 'plan_update',
    ruleId: 'GR5-PACK-TENT',
    title: 'Rugzakdoel voor de GR5 omhoog?',
    effect: `Je rugzakdoel staat op ${p.fromKg} kg, het gewicht voor een tocht van hut naar hut. ${PACK_WEIGHT_EXPLANATION} Voorstel: je rugzakdoel op ${p.toKg} kg. Wat er dan verandert: je bergtochten en rugzakwandelingen gaan stap voor stap naar dit gewicht (piek ongeveer 1 kg erboven, in de zwaarste weken), en kamp 11 vraagt dan een tocht met ${p.toKg} kg. Wat je al behaalde blijft behaald. Slaap je vooral in hutten, dan kies je Liever niet.`,
    why: 'Zo\'n 12 kg past bij hutten. Met tent, slaapzak, matje, kookspullen, water en eten voor twee tot vier dagen komt een goed gepakte rugzak op 12,5 tot 14,5 kg uit (basisgewicht rond 8 kg, plus 0,8 tot 1 kg eten per dag en 2 tot 3 liter water). Je rugzak-voortgang en de vergelijking met een GR5-dag rekenen tegen dit doelgewicht. Je kunt het altijd zelf aanpassen bij Doelen.',
    priority: 1,
    goalChange: { goalId: p.goalId, packWeightKg: p.toKg },
  }];
}

// --- Rule TARGET-TIME --------------------------------------------------------
// Trigger: a test run (engine/racePaces.ts) says the target time of a race
// goal is outside what is realistic by race day. Rule: propose the middle of
// the realistic band as the new target time. Always a proposal: Akkoord sets
// it, Liever niet leaves the goal exactly as it is and the same test is not
// asked about again (the id carries the test date; a newer test is new
// information and may ask once more, from a narrower band).
// Changed 28 October (decision 2026-10-28-klaar-voor-je-doel-snelheid.md): the goal stays the goal. The id
// now carries the target time instead of the test date, so one Liever niet is enough for every later test
// until the target time itself changes. The setting "Doeltijd aanpassen voorstellen" can switch the rule off.
// Antwoorden met het oude id `goaltime:<doel>:JJJJ-MM-DD` gaan eenmalig over op het nieuwe id met de doeltijd,
// zolang het doel na het antwoord niet meer veranderde. Daarna telt alleen nog een andere doeltijd als nieuw;
// een andere volgorde, datum of label vraagt niet opnieuw. Geeft undefined als er niets over te zetten is.
export function carryTargetTimeAnswers<R extends { at?: string }>(responses: Record<string, R>, goals: { id: string; updatedAt?: string; targetMinutes?: number }[]): Record<string, R> | undefined {
  const byGoal = new Map(goals.map((g) => [g.id, g]));
  const added: Record<string, R> = {};
  for (const [id, r] of Object.entries(responses)) {
    const m = /^goaltime:(.+):\d{4}-\d{2}-\d{2}$/.exec(id);
    const goal = m ? byGoal.get(m[1]) : undefined;
    if (!goal?.targetMinutes) continue;
    if ((r.at ?? '9999') < (goal.updatedAt ?? '')) continue;
    const next = `goaltime:${goal.id}:${Math.round(goal.targetMinutes)}`;
    if (!responses[next] && !added[next]) added[next] = r;
  }
  return Object.keys(added).length > 0 ? { ...responses, ...added } : undefined;
}

export function targetTimeAdvice(inputs: AdviceInputs): Advice[] {
  if (inputs.proposeTargetTime === false) return [];
  const tests = countedTests(inputs.logs, { judgments: inputs.testJudgments, ask: inputs.askDoubtTest }).tests;
  if (tests.length === 0) return [];
  const out: Advice[] = [];
  for (const race of inputs.raceGoals ?? []) {
    if (!race.targetMinutes || race.raceDate < inputs.asOf) continue;
    // Without a distance there is nothing honest to compare the test with.
    if (!race.distanceKm) continue;
    const km = race.distanceKm;
    const paces = racePaces(tests, km);
    if (!paces) continue;
    // A best 5 km of this test waits for Akkoord and will change the number: no advice on it yet.
    if (awaitsEffort(inputs.logs, paces.test.logId)) continue;
    const check = checkTargetTime(paces, race.targetMinutes, race.raceDate, inputs.asOf, inputs.goalGrowth);
    if (!check) continue;
    // The id keeps the whole minute (answers are kept under it); the words use the clock of the card.
    const target = Math.round(race.targetMinutes);
    const clockTarget = formatRaceTime(race.targetMinutes);
    const distance = formatNumberNL(km, km % 1 === 0 ? 0 : 1);
    // Say what it counts on: the best 5 km of the run, or the whole run.
    const test = paces.test.basis === 'effort'
      ? `snelste ${formatNumberNL(paces.test.km, paces.test.km % 1 === 0 ? 0 : 1)} km in ${formatRaceTime(paces.test.minutes)}${stopsShort(paces.test) ? `, ${stopsShort(paces.test)}` : ''}`
      : `${formatNumberNL(paces.test.km, paces.test.km % 1 === 0 ? 0 : 1)} km in ${formatRaceTime(paces.test.minutes)} (hele loop)`;
    const now = `${Math.round(check.predictedMinutes)} minuten`;
    // Dezelfde rekening als de doelkaart: gemiddelde groei, geteld vanaf vandaag.
    const said = outlookWeeksSaid(check.outlook);
    const raceDay = formatWeekdayDateNL(race.raceDate);
    const outlookText = `Rond ${raceDay} haal je ${outlookSaid(check.outlook, km)}, bij ${inputs.goalGrowth === 'careful' ? 'voorzichtige' : 'gemiddelde'} groei`;
    const ambitious = check.verdict === 'ambitious';
    const title = ambitious
      ? `Doeltijd ${distance} km: ${clockTarget} vraagt meer dan je test laat zien`
      : `Doeltijd ${distance} km: ${clockTarget} is ruim langzamer dan je test`;
    const lead = `${distance} km past nu bij ongeveer ${now}. Je testloop van ${formatWeekdayDateNL(paces.test.date)}: ${test}.${testStopsRemark(paces.test) ? ` ${testStopsRemark(paces.test)}` : ''}`;
    const effect = ambitious
      ? `${lead} ${outlookText}. Voor ${clockTarget} heb je ongeveer ${said.need} ${said.need === 1 ? 'week' : 'weken'} nodig, er ${said.left === 1 ? 'is er' : 'zijn er'} ${said.left}. Voorstel: zet je doeltijd op ${check.suggested} minuten. Met Liever niet blijft ${clockTarget} staan en vraagt ASCEND hier niet meer naar.`
      : `${lead} ${outlookText}. ${clockTarget} laat dus veel liggen. Voorstel: scherp je doeltijd aan naar ${check.suggested} minuten. Met Liever niet blijft ${clockTarget} staan en vraagt ASCEND hier niet meer naar.`;
    const growthWhy = inputs.goalGrowth === 'careful'
      ? 'Jij koos in de instellingen voor voorzichtige groei: ASCEND rekent met de onderkant van een band van 0,3 tot 0,8% per week, 0,3% dus. Die band is afgeleid uit meerdere onderzoeken (onder andere Muñoz e.a. 2014 en Nuuttila e.a. 2022), niet uit één studie.'
      : 'ASCEND rekent met 0,55% per week: het midden van een band van 0,3 tot 0,8% die uit meerdere onderzoeken is afgeleid (onder andere Muñoz e.a. 2014 en Nuuttila e.a. 2022), niet uit één studie.';
    const why = `De testloop is het eerlijkste meetpunt dat ASCEND heeft. Uit de tijd rekent ASCEND je tempo op andere afstanden uit. Hoe snel iemand sneller wordt, verschilt sterk. ${growthWhy} Dat is doorgerekend tot je wedstrijd, met dezelfde rekening als de meter Snelheid op je doelkaart, met ruimte voor een test die op een warme of vermoeide dag viel. Eerst een voorstel, pas na Akkoord verandert er iets. Wil je jouw tijd houden, kies dan Liever niet. Dan vraagt ASCEND hier niet meer naar, tot je de doeltijd zelf verandert.`;
    out.push({
      id: `goaltime:${race.goalId}:${target}`, trigger: 'plan_update', ruleId: 'TARGET-TIME', title, effect, why, priority: 3,
      relatedLogId: paces.test.logId, goalTargetTime: { goalId: race.goalId, minutes: check.suggested },
    });
  }
  return out;
}

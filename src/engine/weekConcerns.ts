// ASCEND: wat er in een week niet klopt, in woorden. De weekcontrole
// (engine/weekValidator.ts) vindt het al; hier worden de bevindingen van de
// getoonde week gelezen als meldingen voor Week: één regel voor de kaart, een
// droog feit eronder en een korte tekst voor de rij van elke betrokken
// training (docs/visie/Waarschuwingen in Week.md, hoofdstuk 4).
//
// Acht regels: REST-DAY, LEG-SPACING, TWO-HARD-RUNS, TEST-DAY, AFTER-TEST, ONE-LONG,
// TEST-FRESH en TEST-REST (rust voor een test). De controle draait met `reportYours`, zodat ook een training op
// je rustdag meetelt die jij of een geaccepteerd voorstel vastzette. Alleen
// toekomstige dagen van de getoonde week; een verleden week meldt niets.
//
// Puur: geen React, geen IndexedDB.

import type { PlannedSession, SessionTemplate } from '../models/training';
import { daysBetween, mondayOfWeek, weekdayLongNL } from '../utils/dates';
import { idHasRole, idIsTestOrRace } from './templateRoles';
import { isIntentionalBackToBack, legHeavyDayBefore, legSpacingDays, requiredSpacingDays } from './scheduler';
import { freeDaysOfWeek, validateWeeks, type CheckInput, type CheckRule, type Finding } from './weekValidator';
import { intensityOfLog, isSportLogSession, restHoursFor, sportDoneLine, sportLogIdOf } from './sportDays';
import { anySportDefinition } from '../data/sports';

export const CONCERN_RULES: readonly CheckRule[] = ['LEAVE-OFF', 'REST-DAY', 'LEG-SPACING', 'TWO-HARD-RUNS', 'TEST-DAY', 'AFTER-TEST', 'ONE-LONG', 'TEST-FRESH', 'TEST-REST'];

export interface WeekConcern {
  // Dezelfde sleutel als de bevinding; verandert er iets in de week, dan verandert hij mee.
  key: string;
  rule: CheckRule;
  // De ene zin die het probleem zegt (kaart) en het droge feit eronder.
  headline: string;
  fact: string;
  // De naam van een voorstel en de reden erbij, voor de Advice.
  title: string;
  why: string;
  // De korte tekst per training in de rij.
  notes: Record<string, string>;
  finding: Finding;
  // Je koos op Vandaag dat deze training blijft staan (engine/weekKept.ts). Afgeleid, nooit opgeslagen.
  kept?: boolean;
}

export const dayName = (iso: string) => `${weekdayLongNL(iso)} ${Number(iso.slice(8, 10))}`;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function weekConcerns(input: CheckInput, weekStart: string): WeekConcern[] {
  const monday = mondayOfWeek(weekStart);
  const names = new Map(input.templates.map((t) => [t.id, t.name]));
  const byId = new Map(input.sessions.map((s) => [s.id, s]));
  const nameOf = (id: string) => names.get(byId.get(id)?.templateId ?? '') ?? 'Training';
  const dateOf = (id: string) => byId.get(id)?.scheduledDate ?? monday;
  const findings = validateWeeks({ ...input, reportYours: true }, new Set([monday])).filter((f) => CONCERN_RULES.includes(f.rule));
  // Een dag zonder training (of met alleen Herstel) is een vrije dag; dezelfde opvatting als de controle.
  const freeDays = freeDaysOfWeek(monday, input.sessions, input.logs, new Map(input.templates.map((t) => [t.id, t])));

  return findings.map((f): WeekConcern => {
    const base = { key: `${f.rule}:${[...f.sessionIds].sort().join(',')}`, rule: f.rule, finding: f };
    const [a, b] = f.sessionIds;
    switch (f.rule) {
      case 'REST-DAY': {
        const noneFree = freeDays.length === 0;
        const level2 = f.level >= 2;
        return {
          ...base,
          headline: noneFree ? 'Deze week heeft geen rustdag.' : 'Je rustdag heeft een training.',
          fact: noneFree ? 'Op elke dag staat een training.' : `${nameOf(a)} staat op ${dayName(dateOf(a))}, je rustdag.`,
          title: noneFree ? 'Je week heeft geen rustdag' : 'Een training van je rustdag halen',
          why: level2
            ? `Een rustdag is er om te herstellen. ${idHasRole(byId.get(a)?.templateId ?? '', 'race', input.templates) ? 'Je wedstrijd' : 'Je testloop'} schuift niet zonder jouw Akkoord, dus ASCEND vraagt het eerst.`
            : 'Een rustdag is er om te herstellen. Je koos dit zelf of accepteerde het in een voorstel, dus ASCEND vraagt het eerst.',
          notes: { [a]: 'op je rustdag' },
        };
      }
      case 'LEAVE-OFF': {
        // Een training die jij of een voorstel vastzette staat op een dag waarop je vrij bent of op tocht.
        // De planning zelf laat die staan; hier staat het, met een voorstel voor wat van jou is.
        const test = f.level >= 2 || idIsTestOrRace(byId.get(a)?.templateId ?? '', input.templates);
        return {
          ...base,
          headline: `${nameOf(a)} staat op ${dayName(dateOf(a))}, een dag waarop je vrij bent.`,
          fact: f.message,
          title: 'Een training van je vrije dag halen',
          why: test
            ? `Een testloop of wedstrijd schuift niet zonder jouw Akkoord. Je ziet hier alleen dat hij op een vrije dag staat.`
            : 'Je bent die dag vrij of op tocht. Je koos dit zelf of accepteerde het in een voorstel, dus ASCEND vraagt het eerst.',
          notes: { [a]: 'op een vrije dag' },
        };
      }
      case 'LEG-SPACING': {
        // Een sport die je deed en die meetelt (engine/sportDays.ts): het feit eerst, met de rust van die sport.
        const sportLog = f.fromSport ? input.logs.find((l) => l.id === sportLogIdOf(a) || l.id === sportLogIdOf(b)) : undefined;
        if (sportLog?.countedSport) {
          const late = isSportLogSession(a) ? b : a;
          const sport = sportLog.countedSport;
          const label = anySportDefinition(sport).label.toLowerCase();
          const base = input.templates.find((t) => t.id === sportLog.templateId);
          const hours = restHoursFor(sport, intensityOfLog(sportLog, sport), !!base?.restShort);
          const gap = Math.abs(daysBetween(sportLog.completedDate, dateOf(late)));
          return {
            key: `${f.rule}:${[...f.sessionIds].sort().join(',')}`, rule: f.rule, finding: f,
            headline: `${sportDoneLine(sport, sportLog.completedDate, input.today)} ${nameOf(late)} staat er vlak na.`,
            fact: `${nameOf(late)} staat op ${dayName(dateOf(late))}, ${plural(gap, 'dag', 'dagen')} na je ${label}. ASCEND houdt liefst ${hours} uur tussen een zware sport en een zware beendag.`,
            title: `${nameOf(late)} verder van je ${label}`,
            why: `Wat je ${label === 'zwemmen' ? 'zwom' : 'speelde'} telt mee voor je benen. Het kan helpen om een zware beendag niet vlak erna te zetten. Het bewijs voor recreanten is matig.`,
            notes: { [late]: `${plural(gap, 'dag', 'dagen')} na ${label}` },
          };
        }
        const gap = Math.abs(daysBetween(dateOf(a), dateOf(b)));
        const early = dateOf(a) <= dateOf(b) ? a : b;
        const late = early === a ? b : a;
        const between = Math.max(0, gap - 1);
        const days = plural(gap, 'dag', 'dagen');
        const tplOf = (id: string): SessionTemplate | undefined => input.templates.find((t) => t.id === byId.get(id)?.templateId);
        const [tEarly, tLate] = [tplOf(early), tplOf(late)];
        const need = tEarly && tLate ? Math.max(1, legSpacingDays(tEarly, tLate)) : 1;
        // A pair that belongs together on its own days, put elsewhere (engine/weekValidator.ts): said as two
        // heavy leg days in a row, with both names and days, so a name with "en" in it stays readable.
        if (tEarly && tLate && isIntentionalBackToBack(tEarly, tLate)) {
          return {
            ...base,
            headline: 'Twee zware beendagen achter elkaar.',
            fact: `${nameOf(early)} op ${dayName(dateOf(early))} en ${nameOf(late)} op ${dayName(dateOf(late))}, zonder dag ertussen. Liefst ${need === 2 ? 72 : 48} uur ertussen.`,
            title: 'Zware beendagen verder uit elkaar',
            why: `Deze twee horen bewust bij elkaar, op hun eigen dagen. Op andere dagen houdt ASCEND liefst ${need === 2 ? 72 : 48} uur tussen zware beendagen. Jij zette ze zo neer, dus er verschuift niets zonder jouw Akkoord.`,
            notes: { [early]: `${days} voor ${nameOf(late)}`, [late]: `${days} na ${nameOf(early)}` },
          };
        }
        // The same sum as the check itself (findHeavyConflicts in engine/scheduler.ts): a day more after a
        // session whose own log was unusually heavy, so the text never asks for less than the check does.
        const recentLogs = input.logs.filter((l) => daysBetween(l.completedDate, input.today) <= 56);
        const heavyId = [early, late].find((id) => requiredSpacingDays(id, recentLogs) > 1);
        const templateMap = new Map(input.templates.map((t) => [t.id, t]));
        const raw = tEarly && tLate ? legSpacingDays(tEarly, tLate) : 1;
        const bumped = raw === 0 && legHeavyDayBefore(dateOf(early), input.sessions, templateMap, [early, late]) ? 1 : raw;
        const wanted = Math.max(1, bumped + (heavyId ? 1 : 0));
        const betweenText = between === 0 ? 'geen dag' : plural(between, 'dag', 'dagen');
        // Enough days between and still reported: the session between them is heavy for the legs too.
        const three = between >= wanted;
        return {
          ...base,
          headline: `${nameOf(early)} en ${nameOf(late)} liggen te dicht op elkaar.`,
          fact: three
            ? `Er zit ${betweenText} tussen, maar de training ertussen is ook zwaar voor je benen. Dat zijn drie zware beendagen achter elkaar.`
            : `Er zit ${betweenText} tussen, liefst ${plural(wanted, 'dag', 'dagen')} ertussen (${(wanted + 1) * 24} uur).${heavyId ? ` ${nameOf(heavyId)} was zwaarder dan normaal, daarom een dag extra.` : ''}`,
          title: 'Zware beendagen verder uit elkaar',
          why: `Zware beendagen hebben tijd nodig om te herstellen. ASCEND houdt er liefst ${(wanted + 1) * 24} uur tussen.`,
          notes: { [early]: `${days} voor ${nameOf(late)}`, [late]: `${days} na ${nameOf(early)}` },
        };
      }
      case 'TWO-HARD-RUNS':
        return {
          ...base,
          headline: `Twee harde lopen op ${dayName(f.date)}.`,
          fact: `${nameOf(a)} en ${nameOf(b)} staan op dezelfde dag.`,
          title: 'Niet twee harde lopen op een dag',
          why: 'Twee harde lopen op een dag zijn veel voor je benen. Eén per dag laat ze herstellen.',
          notes: { [b]: 'tweede harde loop' },
        };
      case 'TEST-DAY': {
        // a is de andere training, b de test of wedstrijd (de volgorde van de bevinding).
        const kind = idHasRole(byId.get(b)?.templateId ?? '', 'race', input.templates) ? 'wedstrijd' : 'testloop';
        return {
          ...base,
          headline: `${nameOf(a)} staat op dezelfde dag als je ${kind}.`,
          fact: `${nameOf(a)} en je ${kind} staan allebei op ${dayName(f.date)}.`,
          title: `Niets zwaars op de dag van je ${kind}`,
          why: `Op de dag van een ${kind} doe je niets anders zwaars, zodat de ${kind === 'wedstrijd' ? 'wedstrijd' : 'test'} laat zien wat je kunt.`,
          notes: { [a]: `zelfde dag als je ${kind}` },
        };
      }
      case 'AFTER-TEST': {
        const kind = idHasRole(byId.get(b)?.templateId ?? '', 'race', input.templates) ? 'wedstrijd' : 'testloop';
        return {
          ...base,
          headline: `De dag na je ${kind} staat een zware training.`,
          fact: `${nameOf(a)} staat op ${dayName(dateOf(a))}, een dag na je ${kind} op ${dayName(dateOf(b))}.`,
          title: `Geen zware training na je ${kind}`,
          why: `Na een ${kind} krijgt je lijf een dag zonder zwaar werk.`,
          notes: { [a]: `dag na je ${kind}` },
        };
      }
      case 'ONE-LONG': {
        const list = f.sessionIds.map((id) => byId.get(id)).filter((s): s is PlannedSession => !!s).sort((x, y) => x.scheduledDate.localeCompare(y.scheduledDate));
        const first = list[0];
        const last = list[list.length - 1];
        return {
          ...base,
          headline: 'Deze week staan twee volle lange trainingen.',
          fact: nameOf(first.id) === nameOf(last.id)
            ? `${nameOf(first.id)} staat op ${dayName(first.scheduledDate)} en op ${dayName(last.scheduledDate)}, allebei de volle lengte.`
            : `${nameOf(first.id)} op ${dayName(first.scheduledDate)} en ${nameOf(last.id)} op ${dayName(last.scheduledDate)}, allebei de volle lengte.`,
          title: 'Eén volle lange training in de week',
          why: 'Twee volle lange trainingen in een week zijn veel. Eén vol en de ander korter houdt de week te doen.',
          notes: { [last.id]: 'tweede lange training' },
        };
      }
      case 'TEST-REST': {
        // Het droge feit eerst: hoeveel uur er tussen de zware dag en de test zit, en hoeveel ASCEND liefst houdt.
        const rest = f.rest!;
        const test = f.sessionIds[f.sessionIds.length - 1];
        const heavy = f.sessionIds.length > 1 ? f.sessionIds[0] : undefined;
        const heavyName = rest.name;
        return {
          ...base,
          headline: `Je testloop staat ${rest.hours} uur na een zware dag.`,
          fact: `${heavyName} op ${dayName(rest.date)} en je testloop op ${dayName(dateOf(test))}. Liefst ${rest.limitHours} uur ertussen.`,
          title: 'Meer rust voor je testloop',
          why: `Een test laat zien wat je kunt met frisse benen. ASCEND houdt liefst ${rest.limitHours} uur tussen een zware loop- of beendag en een test. Bij Rust voor een test kies je ook ${rest.limitHours === 72 ? '48' : '72'} uur. ${f.subjectId === test ? 'De zware dag is gedaan, dus alleen je testloop kan schuiven, niet zonder jouw Akkoord.' : 'Jij of een voorstel zette dit zo neer, dus er verschuift niets zonder jouw Akkoord.'}`,
          notes: { ...(heavy ? { [heavy]: `${rest.hours} uur voor je testloop` } : {}), [test]: `${rest.hours} uur na ${heavyName}` },
        };
      }
      default: {
        const index = f.legIndex === undefined ? '' : f.legIndex.toFixed(1).replace('.', ',');
        const kind = idHasRole(byId.get(a)?.templateId ?? '', 'race', input.templates) ? 'wedstrijd' : 'testloop';
        return {
          ...base,
          headline: `Je benen zijn nog niet fris genoeg voor je ${kind}.`,
          fact: `Op ${dayName(f.date)} is je beenindex ${index}. Fris is ${f.limit} of lager. De beenindex zegt hoe zwaar je benen de laatste dagen belast zijn.`,
          title: `Frissere benen voor je ${kind}`,
          why: 'Zware beendagen vlak voor een test maken je benen moe. Een kortere of latere beendag maakt ze frisser.',
          notes: { [a]: 'benen niet fris' },
        };
      }
    }
  });
}

// Wat de kaart zegt: bij één punt de zin zelf, bij meer de telling.
export function noticeHeadline(concerns: WeekConcern[]): string {
  return concerns.length === 1 ? concerns[0].headline : `Deze week heeft ${concerns.length} punten die niet kloppen.`;
}

// De tekst per training voor de rij, uit alle meldingen samen.
export function rowNotes(concerns: WeekConcern[]): Map<string, string> {
  const out = new Map<string, string[]>();
  for (const c of concerns) for (const [id, text] of Object.entries(c.notes)) out.set(id, [...(out.get(id) ?? []), text]);
  return new Map([...out].map(([id, list]) => [id, list.join(' · ')]));
}

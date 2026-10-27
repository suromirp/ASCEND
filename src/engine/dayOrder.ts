// ASCEND — two trainings on one day: which one first, how long between them,
// and why (docs/onderzoek/Volgorde van twee trainingen.md). Running and the
// trek are the main goals, strength second, so the session that matters most
// for the goal goes first. A tip, never a block: the leg rule of the scheduler
// (engine/scheduler.ts) stays in charge, and nothing is said afterwards.
//
// Pure: no React, no IndexedDB.

import type { PlannedSession, SessionTemplate } from '../models/training';
import { resolveEffectiveStressProfile } from './stressProfile';
import { templateSport } from './sports';
import { hasRole } from './templateRoles';

export type DayRole = 'test' | 'race' | 'heuvelsOpEnAf' | 'hardeLoop' | 'langeLoop' | 'rustigeLoop' | 'rustigDuur' | 'bergtocht' | 'benen' | 'bovenlichaam' | 'overig';

// Sessions that end at tempo count as hard even when the profile says moderate.

export function roleOf(t: SessionTemplate): DayRole {
  if (hasRole(t, 'test')) return 'test';
  if (hasRole(t, 'race')) return 'race';
  const p = resolveEffectiveStressProfile(t);
  if (t.type === 'strength') return p.lowerBodyLoad === 'heavy' ? 'benen' : 'bovenlichaam';
  const sport = templateSport(t);
  if (sport === 'running') {
    if (p.eccentricLoad === 'heavy') return 'heuvelsOpEnAf';
    if (hasRole(t, 'hard_run') || p.intensity === 'high' || (p.intensity === 'moderate' && p.cardioLoad === 'heavy')) return 'hardeLoop';
    if (p.intensity === 'low' && p.cardioLoad === 'heavy') return 'langeLoop';
    return 'rustigeLoop';
  }
  if (sport === 'hiking' || sport === 'cycling' || t.type === 'hiking') return p.eccentricLoad === 'heavy' ? 'bergtocht' : 'rustigDuur';
  return 'overig';
}

export type Evidence = 'sterk' | 'matig' | 'zwak' | 'expertopinie' | 'afgeleid';

export interface DayOrderAdvice {
  order: string[]; // session ids, first one first
  gapHours?: number; // preferably this much between them
  minGapHours?: number; // at the least; earlier when you feel fit again
  avoid?: boolean; // better not on one day at all
  headline: string; // "Eerst Tempoloop, dan Benen A"
  reason: string; // one sentence why
  why: string; // the longer reason, behind "waarom"
  evidence: Evidence;
  sources: { label: string; url: string }[];
}

const SRC = {
  doma2013: { label: 'Doma en Deakin 2013: loop eerst, kracht 6 uur later', url: 'https://pubmed.ncbi.nlm.nih.gov/23724883/' },
  doma2014: { label: 'Doma e.a. 2014: hard lopen 6 uur na zware benen', url: 'https://pubmed.ncbi.nlm.nih.gov/24345968/' },
  ratamess: { label: 'Ratamess e.a. 2016: kracht na een loop', url: 'https://pubmed.ncbi.nlm.nih.gov/26200191/' },
  sporer: { label: 'Sporer en Wenger 2003: herstel tussen sessies', url: 'https://pubmed.ncbi.nlm.nih.gov/14636100/' },
  schumann: { label: 'Schumann e.a. 2022: kracht en duur samen', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8891239/' },
  robineau: { label: 'Robineau e.a. 2016: 6 uur of 24 uur ertussen', url: 'https://pubmed.ncbi.nlm.nih.gov/25546450/' },
};

interface Pair { a: PlannedSession; b: PlannedSession; ta: SessionTemplate; tb: SessionTemplate; ra: DayRole; rb: DayRole }

const isRun = (r: DayRole) => r === 'hardeLoop' || r === 'langeLoop' || r === 'rustigeLoop' || r === 'heuvelsOpEnAf' || r === 'test' || r === 'race';
const isHardRun = (r: DayRole) => r === 'hardeLoop' || r === 'heuvelsOpEnAf' || r === 'test' || r === 'race';

// The gap: preferably 6 hours (Doma; Robineau 2016: 6 hours gave the same
// strength gains as 24), at the least 3 (Schumann 2022: below 3 hours the
// long-term adaptations suffer). Feel fit again sooner: go sooner. The 6 is a
// preference, not a wall.
// One rule per pair of roles, in this priority (the first that fits wins).
function rule(p: Pair, tomorrowHard: boolean): DayOrderAdvice | undefined {
  const { a, b, ta, tb, ra, rb } = p;
  const has = (r: DayRole) => ra === r || rb === r;
  const pick = (r: (x: DayRole) => boolean) => (r(ra) ? { s: a, t: ta, r: ra, o: b, ot: tb, or: rb } : { s: b, t: tb, r: rb, o: a, ot: ta, or: ra });

  // 1. Test or race + something.
  if (has('race') && (ra === 'benen' || rb === 'benen' || ra === 'bovenlichaam' || rb === 'bovenlichaam')) {
    const x = pick((r) => r === 'race');
    return { order: [x.s.id, x.o.id], avoid: true, headline: `Op een wedstrijddag geen krachttraining`, reason: `Verplaats ${x.ot.name} naar later in de week.`, why: 'Een wedstrijd vraagt alles van je benen; kracht op dezelfde dag helpt de wedstrijd niet en kost je herstel.', evidence: 'expertopinie', sources: [] };
  }
  if (has('test')) {
    const x = pick((r) => r === 'test');
    if (x.or === 'benen') return { order: [x.s.id, x.o.id], gapHours: 6, minGapHours: 3, headline: `Eerst de ${x.t.name.toLowerCase()}, dan ${x.ot.name}`, reason: 'Liefst 6 uur later, minstens 3, of morgen. Een test meet alleen iets als je fris bent.', why: 'Eerst lopen en 6 uur later kracht liet de loopeconomie de dag erna normaal; kracht eerst niet. En de test zelf heeft frisse benen nodig.', evidence: 'matig', sources: [SRC.doma2013, SRC.sporer] };
    return { order: [x.s.id, x.o.id], headline: `Eerst de ${x.t.name.toLowerCase()}, dan ${x.ot.name}`, reason: 'De test eerst, fris. Wat erna komt mag op elk moment.', why: 'Een test meet je tempo; alles wat ervoor komt, maakt de uitslag minder eerlijk.', evidence: 'afgeleid', sources: [] };
  }
  // 2. Two runs.
  if (isRun(ra) && isRun(rb)) {
    if (isHardRun(ra) && isHardRun(rb)) return { order: [a.id, b.id], avoid: true, headline: 'Twee harde loopjes op één dag', reason: 'Verplaats er één naar een andere dag.', why: 'Twee kwaliteitstrainingen op één dag laten de tweede niet meer goed lukken, en je herstel loopt achter.', evidence: 'expertopinie', sources: [] };
    const x = pick(isHardRun);
    if (isHardRun(x.r)) return { order: [x.s.id, x.o.id], gapHours: 5, minGapHours: 3, headline: `Eerst ${x.t.name}, dan ${x.ot.name}`, reason: 'De rustige loop liefst 5 uur later, en kort.', why: 'De harde loop is de training die telt; die doe je fris. De rustige loop erna is herstel.', evidence: 'expertopinie', sources: [] };
    return { order: [a.id, b.id], gapHours: 5, minGapHours: 3, headline: `Twee rustige loopjes`, reason: 'Liefst 5 uur ertussen, de tweede kort.', why: 'Twee keer rustig lopen kan, maar geeft meer klappen dan één langere loop.', evidence: 'expertopinie', sources: [] };
  }
  // 3. Long run + something.
  if (has('langeLoop')) {
    const x = pick((r) => r === 'langeLoop');
    if (x.or === 'benen') return { order: [x.s.id, x.o.id], gapHours: 6, minGapHours: 3, avoid: true, headline: `Beter niet op één dag`, reason: `Moet het, doe dan eerst de ${x.t.name.toLowerCase()} en ${x.ot.name} liefst 6 uur later, en houd morgen rustig.`, why: 'Beide zijn zwaar voor je benen. Loop eerst: kracht vooraf maakt een lange loop zwaarder dan andersom.', evidence: 'matig', sources: [SRC.doma2013, SRC.ratamess] };
    return { order: [x.s.id, x.o.id], headline: `Eerst de ${x.t.name.toLowerCase()}, dan ${x.ot.name}`, reason: 'De lange loop eerst en liefst alleen; daarna mag het op elk moment.', why: 'De lange duurloop is de training die het meest naar je doelen vertaalt; die doe je met frisse benen.', evidence: 'afgeleid', sources: [] };
  }
  // 4. Hills up and down + legs.
  if (has('heuvelsOpEnAf') && has('benen')) {
    const x = pick((r) => r === 'heuvelsOpEnAf');
    return { order: [x.s.id, x.o.id], gapHours: 6, minGapHours: 3, avoid: true, headline: 'Beter niet op één dag', reason: `Bergaf en zware benen geven allebei spierschade, en die stapelt. Moet het: eerst ${x.t.name.toLowerCase()}, ${x.ot.name} liefst 6 uur later.`, why: 'Excentrisch werk (bergaf, het zakken in een squat) geeft de meeste spierschade; twee keer op een dag telt op.', evidence: 'afgeleid', sources: [SRC.doma2014] };
  }
  // 5. Hard run + legs.
  if ((isHardRun(ra) && rb === 'benen') || (isHardRun(rb) && ra === 'benen')) {
    const x = pick(isHardRun);
    return { order: [x.s.id, x.o.id], gapHours: 6, minGapHours: 3, headline: `Eerst ${x.t.name}, dan ${x.ot.name}`, reason: 'Liefst 6 uur later. De loop telt voor je doel en lijdt onder zware benen; de kracht verliest er op termijn niets door. Houd morgen rustig.', why: 'Loop eerst en 6 uur later kracht: de loopeconomie was de dag erna normaal, andersom niet. 6 uur gaf dezelfde krachtwinst als 24 uur.', evidence: 'matig', sources: [SRC.doma2013, SRC.robineau, SRC.schumann] };
  }
  // 6. Hard run + upper body.
  if ((isHardRun(ra) && rb === 'bovenlichaam') || (isHardRun(rb) && ra === 'bovenlichaam')) {
    const x = pick(isHardRun);
    return { order: [x.s.id, x.o.id], headline: `Eerst ${x.t.name}, dan ${x.ot.name}`, reason: 'Je armen hebben weinig last van lopen; de tijd ertussen is vrij.', why: 'Bankdrukken en ander bovenlichaamwerk bleef in studies gelijk na een loop.', evidence: 'matig', sources: [SRC.sporer] };
  }
  // 7. Easy run + legs.
  if ((ra === 'rustigeLoop' && rb === 'benen') || (rb === 'rustigeLoop' && ra === 'benen')) {
    const run = pick((r) => r === 'rustigeLoop');
    if (tomorrowHard) return { order: [run.s.id, run.o.id], gapHours: 6, minGapHours: 3, headline: `Eerst de ${run.t.name.toLowerCase()}, dan ${run.ot.name}`, reason: 'Liefst 6 uur later. Zo staan je benen morgen frisser voor je harde training.', why: 'Kracht na een loop verstoort de loop van de volgende dag niet; kracht vooraf wel.', evidence: 'zwak', sources: [SRC.doma2013] };
    return { order: [run.o.id, run.s.id], gapHours: 6, minGapHours: 3, headline: `Eerst ${run.ot.name}, dan de ${run.t.name.toLowerCase()}`, reason: 'De loop liefst 6 uur later. Een rustige loop heeft weinig last van kracht, maar een loop vooraf kost je beensessie herhalingen.', why: 'Na een loop haalde je 9 tot 19% minder herhalingen met je benen; een rustige loop 6 uur na zware benen was normaal.', evidence: 'matig', sources: [SRC.ratamess, SRC.doma2014] };
  }
  // 8. Easy endurance (walk, ruck, bike, mountain hike) + legs.
  if ((ra === 'rustigDuur' || ra === 'bergtocht') && rb === 'benen' || (rb === 'rustigDuur' || rb === 'bergtocht') && ra === 'benen') {
    const legs = pick((r) => r === 'benen');
    return { order: [legs.s.id, legs.o.id], gapHours: 3, headline: `Eerst ${legs.t.name}, dan ${legs.ot.name}`, reason: 'Liefst een paar uur later. Wandelen op wat vermoeide benen kan; kracht na een lange wandeling is minder.', why: 'Kracht vooraf geeft de beste sets; rustig duurwerk daarna lijdt er weinig onder.', evidence: 'afgeleid', sources: [SRC.ratamess] };
  }
  // 9. Easy + upper body, or anything else: no tip.
  return undefined;
}

export function dayOrder(daySessions: PlannedSession[], tomorrowSessions: PlannedSession[], templateById: Map<string, SessionTemplate>): DayOrderAdvice | undefined {
  const active = daySessions.filter((s) => s.status !== 'skipped' && templateById.get(s.templateId) && templateById.get(s.templateId)!.type !== 'recovery');
  if (active.length < 2) return undefined;
  const tomorrowHard = tomorrowSessions.some((s) => s.status !== 'skipped' && templateById.get(s.templateId) && isHardRun(roleOf(templateById.get(s.templateId)!)));
  // With three or more: the first pair that gets a rule.
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const ta = templateById.get(active[i].templateId)!;
      const tb = templateById.get(active[j].templateId)!;
      const advice = rule({ a: active[i], b: active[j], ta, tb, ra: roleOf(ta), rb: roleOf(tb) }, tomorrowHard);
      if (advice) {
        const rest = active.filter((s) => !advice.order.includes(s.id)).map((s) => s.id);
        return { ...advice, order: [...advice.order, ...rest] };
      }
    }
  }
  return undefined;
}

// The sessions of a day in the advised order (unchanged without advice).
export function orderDay<T extends { id: string }>(sessions: T[], advice: DayOrderAdvice | undefined): T[] {
  if (!advice) return sessions;
  const rank = (s: T) => { const i = advice.order.indexOf(s.id); return i < 0 ? Number.MAX_SAFE_INTEGER : i; };
  return [...sessions].sort((x, y) => rank(x) - rank(y));
}

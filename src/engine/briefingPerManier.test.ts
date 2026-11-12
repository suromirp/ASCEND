// De Briefing per manier van trainen (besluit docs/beslissingen/2026-11-12-briefing-per-manier.md). Nagemaakte
// trainingen, logs en tempo's; geen echte data.
(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';

import { describe, expect, it } from 'vitest';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { WORKOUTS } from '../data/workoutStructure';
import { getModalities, modalitySport } from '../data/modalities';
import { placeBriefKeys } from '../data/placeBrief';
import { resolveWatchModel } from './watchFields';
import { briefing, hasBriefing, howWithoutSport, OTHER_PLACE, placeRow, placeTransition, watchPlaceLine, PLACE_ROW_MAX, type BriefingInput } from './briefing';
import { buildWorkoutPlan } from './workoutPlan';
import { setAmbition, setKindAmounts } from './substitutions';
import { buildSessionBrief, durationLabel } from './sessionBrief';
import { racePaces } from './racePaces';
import { missionCardView } from './missionCard';
import { placeChoices, shortPlaceLabels } from './trainingPlace';
import { addDays } from '../utils/dates';

const { templates, program } = buildDefaultProgramData();
const byId = (id: string) => templates.find((t) => t.id === id) as SessionTemplate;
const HILLS = byId('tpl_hill_intervals');
const DESCENT = byId('tpl_hills_descent');
const EASY = byId('tpl_easy_run');
const LONG = byId('tpl_long_run');
const TEST = byId('tpl_test_run');
const TODAY = '2026-11-11';
const NOW = new Date(2026, 10, 11, 8, 0);
// Nagemaakt: 5 km in 29:05.
const PACES = racePaces([{ date: '2026-10-29', km: 5, minutes: 29 + 5 / 60 }])!;

const plan = (templateId: string): PlannedSession => ({ id: 'p1', templateId, scheduledDate: TODAY, weekStartDate: '2026-11-09', status: 'planned', order: 0 });

function input(template: SessionTemplate, over: Partial<BriefingInput> = {}): BriefingInput {
  return {
    template,
    session: plan(template.id),
    date: TODAY,
    now: NOW,
    program: null,
    logs: [],
    routeOn: true,
    watchLink: { linked: true, autoTick: true, activities: true },
    watch: { showStatus: true, fieldsShown: true, model: resolveWatchModel(undefined), store: undefined, hasZonesNote: false },
    watchStatus: { kind: 'sent', sentAt: new Date(2026, 10, 11, 7, 18).toISOString() },
    weatherOn: true,
    clothingOn: true,
    fuelOn: true,
    ...over,
  };
}
const view = (t: SessionTemplate, place?: string, over: Partial<BriefingInput> = {}) => briefing(input(t, { storedPlace: place, ...over }))!;
const allText = (v: ReturnType<typeof view>) => [
  v.head.purpose, ...v.heart.facts.map((f) => `${f.value} ${f.label}`), v.heart.paceNote, v.placeLine, ...v.rows.map((r) => r.line), ...v.stopSignals,
  ...(v.heart.plan?.timeline.map((s) => `${s.label} ${s.detail ?? ''}`) ?? []),
].filter(Boolean).join(' | ');

describe('heuvelintervallen per manier', () => {
  it('heuvel (de standaard): hard bergop, op de heuvel, terug naar beneden', () => {
    const v = view(HILLS);
    expect(v.place).toBe('hill_repeats_outdoor');
    expect(v.heart.facts.map((f) => f.label)).toEqual(['totaal', 'hard bergop', 'op de heuvel']);
    expect(v.stopSignals.join(' ')).toContain('terug naar beneden');
    expect(v.heart.plan?.timeline.some((s) => s.label === 'Hard bergop')).toBe(true);
  });
  it('StairMaster: geen heuvel, geen bergop, geen terug naar beneden', () => {
    const v = view(HILLS, 'stairmaster_intervals');
    const text = allText(v).toLowerCase();
    for (const word of ['bergop', 'heuvel op', 'op de heuvel', 'naar beneden']) expect(text).not.toContain(word);
    expect(v.heart.facts.map((f) => f.label)).toEqual(['totaal', 'stevig traplopen', 'op de trap']);
    expect(v.stopSignals.join(' ')).toContain('rustig doorstappen');
    expect(v.heart.plan?.timeline.map((s) => s.label)).toContain('Stevig traplopen');
  });
  it('loopband op helling: op de helling en op de band', () => {
    const v = view(HILLS, 'incline_treadmill_intervals');
    const text = allText(v).toLowerCase();
    expect(text).not.toContain('op de heuvel');
    expect(text).not.toContain('naar beneden');
    expect(v.heart.facts.map((f) => f.label)).toEqual(['totaal', 'hard op de helling', 'op de loopband']);
    expect(v.stopSignals.join(' ')).toContain('rustig op de band');
  });
  it('heuvelsprints en afdalen op de band of de StairMaster zegt eerlijk dat de afdaling mist', () => {
    expect(view(DESCENT, 'incline_treadmill_intervals').heart.facts[2].value).toBe('Geen afdaling');
    expect(view(DESCENT, 'stairmaster_intervals').heart.facts[2].value).toBe('Geen afdaling');
    expect(allText(view(DESCENT, 'stairmaster_intervals')).toLowerCase()).not.toContain('bergop');
  });
  it('welke sport een manier telt blijft: StairMaster telt als wandelen', () => {
    expect(modalitySport('stairmaster_intervals')).toBe('hiking');
    expect(view(HILLS, 'stairmaster_intervals').head.eyebrow).toBe('WANDELEN · TRAP');
    expect(view(HILLS, 'stairmaster_intervals').head.purpose).toBe('Klimkracht in je benen, in korte stevige blokken op de trap.');
    expect(view(HILLS, 'stairmaster_intervals').heart.label).toBe('Wat je doet');
    expect(view(HILLS).heart.label).toBe('Wat je loopt');
    expect(view(HILLS).head.eyebrow).toBe('HARDLOPEN · BERGOP');
  });
  it('elke eigen tekst hoort bij een manier die die training echt kent', () => {
    for (const { place, templateId } of placeBriefKeys()) expect(getModalities(templateId)?.some((m) => m.key === place)).toBe(true);
  });
});

describe('geen zin dubbel in één blok', () => {
  it('"telt als wandelen" staat één keer in de regel onder de chips', () => {
    const line = view(HILLS, 'stairmaster_intervals').placeLine!;
    expect(line.match(/telt als wandelen/gi)).toHaveLength(1);
    expect(howWithoutSport('A. Telt als wandelen, niet als hardlopen.', undefined)).toContain('Telt als');
  });
  it('voor elke training en elke manier: geen zin twee keer in de regel, de stopregels of de kerngetallen', () => {
    for (const t of templates) {
      for (const p of placeChoices(t.id)) {
        const v = briefing(input(t, { storedPlace: p.key }));
        if (!v) continue;
        for (const block of [splitSentences(v.placeLine ?? ''), v.stopSignals, v.heart.facts.map((f) => `${f.value} ${f.label}`)]) {
          const seen = block.map((s) => s.toLowerCase().replace(/^dit /, ''));
          expect(new Set(seen).size, `${t.id} ${p.key}: ${block.join(' / ')}`).toBe(seen.length);
        }
      }
    }
  });
});

function splitSentences(s: string): string[] {
  return s.split(/(?<=\.)\s+/).map((x) => x.trim()).filter(Boolean);
}

describe('het totaal bovenaan is het einde van de tijdlijn', () => {
  it('de zaak van de eigenaar: 35 minuten gepland en zes herhalingen pasten niet (10 + 6 x 3 + 10 = 38)', () => {
    const t: SessionTemplate = {
      ...HILLS,
      durationVariants: { ...HILLS.durationVariants, full: 35 },
      weeklyProgression: [{ weekInPhase: 1, targetMinutes: 30 }],
    };
    const p = buildWorkoutPlan(t, TODAY, null)!;
    expect(p.repeats).toBe(6);
    const seconds = p.timeline.reduce((s, x) => s + x.seconds, 0);
    expect(seconds).toBe(35 * 60);
    // Uitlopen geeft de tijd eerst terug, tot 5 minuten; het opwarmen blijft dan 10.
    expect(p.timeline[0].seconds).toBe(10 * 60);
    expect(p.timeline.at(-1)!.seconds).toBe(7 * 60);
    expect(view(t).heart.facts[0]).toEqual({ value: '35 min', label: 'totaal' });
  });
  // Rustig (ambitie) en Minder (hoeveel per soort) maken trainingen korter; dan passen de herhalingen het vaakst niet.
  // Data uit de vergelijking oud tegen nieuw over 400 dagen (besluit 2026-11-12-briefing-per-manier.md, punt 3).
  const edgesOf = (p: ReturnType<typeof buildWorkoutPlan>) => p!.items.filter((i) => 'step' in i).map((i) => ('step' in i ? i.step.seconds / 60 : 0));
  const withSetting = <T,>(setting: 'rustig' | 'minder', fn: () => T): T => {
    if (setting === 'rustig') setAmbition('rustig');
    else setKindAmounts({ strength: 'less', long: 'less', hard: 'less', ruck: 'less', easy: 'less', cycling: 'less' });
    try { return fn(); } finally { setAmbition('standaard'); setKindAmounts(undefined); }
  };
  for (const setting of ['rustig', 'minder'] as const) {
    it(`${setting}: heuvelintervallen 25, tempoloop 30, intervallen 40 en fartlek 35 passen; uitlopen eerst, opwarmen bij hard nooit onder 8`, () => {
      withSetting(setting, () => {
        const cases: [string, string, number, number[]][] = [
          ['tpl_hill_intervals', '2026-11-30', 25, [10, 6]],
          ['tpl_tempo_run', '2026-11-30', 30, [8, 5]],
          ['tpl_intervals', '2026-11-30', 40, [12, 7]],
          ['tpl_fartlek', '2026-11-16', 35, [11.5, 6]],
        ];
        for (const [id, date, minutes, edges] of cases) {
          const p = buildWorkoutPlan(byId(id), date, program)!;
          expect(p.totalMinutes, id).toBe(minutes);
          expect(p.timeline.reduce((s, x) => s + x.seconds, 0), id).toBe(minutes * 60);
          expect(edgesOf(p), id).toEqual(edges);
        }
        // Negen keer fartlek in 35 minuten past niet: uitlopen staat al op 5, opwarmen stopt op 8; 35:30 blijft over.
        const over = buildWorkoutPlan(byId('tpl_fartlek'), '2026-11-23', program)!;
        expect(over.repeats).toBe(9);
        expect(edgesOf(over)).toEqual([8, 5]);
        expect(over.timeline.reduce((s, x) => s + x.seconds, 0)).toBe(35 * 60 + 30);
      });
    });
  }
  it('standaard: fartlek 40 met zeven herhalingen eindigt op 40, niet op 40:30', () => {
    const p = buildWorkoutPlan(byId('tpl_fartlek'), '2026-09-01', program)!;
    expect(p.timeline.reduce((s, x) => s + x.seconds, 0)).toBe(p.totalMinutes * 60);
  });
  it('voor elke training, elke manier en een half jaar aan dagen', () => {
    for (const t of templates) {
      if (!WORKOUTS[t.id]) continue;
      for (let d = 0; d < 26 * 7; d += 3) {
        const date = addDays('2026-09-01', d);
        const p = buildWorkoutPlan(t, date, program);
        const v = briefing(input(t, { date, program, session: undefined }));
        if (!p || !v || v.heart.facts[0]?.label !== 'totaal') continue;
        const end = Math.round(p.timeline.reduce((s, x) => s + x.seconds, 0) / 60);
        expect(v.heart.facts[0].value, `${t.id} ${date}`).toBe(durationLabel(end));
      }
    }
  });
});

describe('de rij met manieren valt niet af', () => {
  it('hoogstens drie chips; bij meer de standaard en een chip naar het blad, met de gekozen naam (zoals Start bij)', () => {
    const many = ['a', 'b', 'c', 'd', 'e'].map((key) => ({ key }));
    expect(placeRow(many.slice(0, 3), 'c')).toEqual({ chips: many.slice(0, 3), more: false });
    expect(placeRow(many, 'd')).toEqual({ chips: [many[0]], more: true, other: many[3] });
    expect(placeRow(many, 'a')).toEqual({ chips: [many[0]], more: true });
    expect(placeRow(many, undefined)).toEqual({ chips: [many[0]], more: true });
  });
  it('de heuvelintervallen: Heuvel, Loopband, StairMaster', () => {
    expect(shortPlaceLabels(placeChoices('tpl_hill_intervals').map((p) => p.label))).toEqual(['Heuvel', 'Loopband', 'StairMaster']);
  });
  it('elke training te voet: de korte namen in de rij passen in 328 px (ruwe maat: 7,5 px per teken, 34 px rand, Meer 90 px; de echte maat meet Lookout op 360 px)', () => {
    for (const t of templates) {
      const places = placeChoices(t.id).filter((p) => !p.locked);
      if (places.length < 2 || !hasBriefing(t)) continue;
      for (const chosen of places) {
        const row = placeRow(places, chosen.key);
        const shown = row.more ? [...row.chips, row.other ?? { label: OTHER_PLACE }] : row.chips;
        // De korte namen zoals de rij ze toont; de chip naar het blad heeft een pijl van 20 px erbij.
        const all = shortPlaceLabels(places.map((p) => p.label));
        const names = shown.map((p) => ('key' in p ? all[places.indexOf(p as typeof places[number])] : p.label));
        const width = names.reduce((s, n, i) => s + Math.min(n.length * 7.5, 136) + 34 + (row.more && i === names.length - 1 ? 20 : 0), 0) + 8 * (names.length - 1);
        expect(width, `${t.id} ${chosen.key}`).toBeLessThanOrEqual(328);
        expect(row.chips.length).toBeLessThanOrEqual(PLACE_ROW_MAX);
      }
    }
  });
});

describe('het horloge bij een andere manier', () => {
  it('StairMaster: zegt eerlijk dat de hardloopworkout erop staat en wat je start', () => {
    expect(watchPlaceLine(HILLS, 'stairmaster_intervals', 'on')).toBe('Er staat een hardloopworkout op. Start Stair Stepper zonder workout.');
    const row = view(HILLS, 'stairmaster_intervals').rows.find((r) => r.id === 'watch')!;
    expect(row.line).toBe('Er staat een hardloopworkout op. Start Stair Stepper zonder workout. Vinkt zelf af.');
    expect(row.tone).toBe('warn');
  });
  it('nog niet verstuurd (pending, later): er komt een workout op je horloge', () => {
    for (const kind of ['pending', 'later'] as const) {
      const row = view(HILLS, 'stairmaster_intervals', { watchStatus: kind === 'later' ? { kind, goesOn: '2026-11-12' } : { kind } }).rows.find((r) => r.id === 'watch')!;
      expect(row.line).toBe(`Er komt ${kind === 'later' ? 'morgen ' : ''}een hardloopworkout op je horloge. Start Stair Stepper zonder workout. Vinkt zelf af.`);
      expect(row.tone).toBe('warn');
    }
  });
  it('zelf instellen: de gewone toon, geen amber', () => {
    const row = view(HILLS, 'stairmaster_intervals', { watchStatus: { kind: 'unlinked' } }).rows.find((r) => r.id === 'watch')!;
    expect(row.tone).toBeUndefined();
  });
  it('de loopband is ook hardlopen: geen regel, de workout past', () => {
    expect(watchPlaceLine(HILLS, 'incline_treadmill_intervals', 'on')).toBeUndefined();
    expect(watchPlaceLine(EASY, 'run_treadmill', 'on')).toBeUndefined();
    expect(view(HILLS, 'incline_treadmill_intervals').rows.find((r) => r.id === 'watch')?.tone).toBeUndefined();
  });
  it('een horloge dat niet afvinkt: dezelfde regel, zonder Vinkt zelf af', () => {
    const row = view(HILLS, 'stairmaster_intervals', { watchLink: { linked: true, autoTick: false, activities: true } }).rows.find((r) => r.id === 'watch')!;
    expect(row.line).toBe('Er staat een hardloopworkout op. Start Stair Stepper zonder workout.');
  });
  it('Horlogestatus tonen uit: toch de eerlijke regel, want de workout staat er wel op', () => {
    const v = view(HILLS, 'stairmaster_intervals', { watch: { showStatus: false, fieldsShown: true, model: resolveWatchModel(undefined), store: undefined, hasZonesNote: false } });
    expect(v.rows.find((r) => r.id === 'watch')?.line).toContain('Er staat een hardloopworkout op.');
  });
  it('geen workout van ASCEND op je horloge (niet gekoppeld): alleen wat je start, geen Workout zelf instellen', () => {
    const v = view(HILLS, 'stairmaster_intervals', { watchStatus: { kind: 'unlinked' }, watchLink: { linked: false, autoTick: false, activities: false } });
    const line = v.rows.find((r) => r.id === 'watch')?.line ?? '';
    expect(line).toBe('Start Stair Stepper zonder workout.');
    expect(watchPlaceLine(HILLS, 'stairmaster_intervals', undefined)).toBe('Start Stair Stepper zonder workout.');
  });
});

describe('de eigen wandelworkout op de StairMaster (besluit 2026-11-12-stairmaster-horloge.md)', () => {
  const row = (watchStatus: BriefingInput['watchStatus'], over: Partial<BriefingInput> = {}) => view(HILLS, 'stairmaster_intervals', { watchStatus, watchLink: { linked: true, autoTick: false, activities: true }, ...over }).rows.find((r) => r.id === 'watch')!;
  it('verstuurd: de wandelworkout staat erop, zonder amber en zonder Start zonder workout', () => {
    const r = row({ kind: 'sent', wants: 'Walk', wrote: 'Walk' });
    expect(r.line).toBe('Er staat een wandelworkout op. Start hem bij Wandelen.');
    expect(r.tone).toBeUndefined();
  });
  it('gekozen na het versturen: de hardloopworkout staat er nog', () => {
    const r = row({ kind: 'stale', wants: 'Walk', wrote: 'Run' });
    expect(r.line).toBe('Er staat nog een hardloopworkout op. De wandelworkout komt eraan.');
    expect(r.tone).toBe('warn');
  });
  it('gekozen voor het versturen, de dag zelf of de avond ervoor: hij komt eraan', () => {
    expect(row({ kind: 'pending', wants: 'Walk' }).line).toBe('Er komt een wandelworkout op je horloge.');
    // Verder weg dan 7 dagen: de dag erbij waarop hij gaat (vandaag is 11 november).
    expect(row({ kind: 'later', goesOn: '2026-11-12', wants: 'Walk' }).line).toBe('Er komt morgen een wandelworkout op je horloge.');
    expect(row({ kind: 'later', goesOn: '2026-11-14', wants: 'Walk' }).line).toBe('Er komt op zaterdag 14 november een wandelworkout op je horloge.');
    expect(row({ kind: 'pending', wants: 'Walk' }).tone).toBeUndefined();
  });
  it('versturen mislukt of de koppeling verlopen: de oude blijft en de regel zegt dat', () => {
    const r = row({ kind: 'failed', reason: 'sleutel niet herkend', wants: 'Walk', wrote: 'Run' });
    expect(r.line).toBe('Versturen lukte niet: er staat nog een hardloopworkout op. Start Stair Stepper zonder workout.');
    expect(r.tone).toBe('warn');
    expect(row({ kind: 'failed', reason: 'geen verbinding', wants: 'Walk' }).line).toBe('Versturen lukte niet. Start Stair Stepper zonder workout.');
  });
  it('horloge sturen staat uit: er komt niets, alleen wat je start', () => {
    expect(row({ kind: 'unlinked' }).line).toBe('Start Stair Stepper zonder workout.');
  });
  it('de instelling uit nadat de wandelworkout erop stond: de regel zegt wat er echt staat', () => {
    expect(row({ kind: 'stale', wants: 'Run', wrote: 'Walk' }).line).toBe('Er staat een wandelworkout op. Start Stair Stepper zonder workout.');
  });
  it('terug naar buiten: de regel zegt dat de wandelworkout er nog staat, ook als het versturen mislukt', () => {
    const outside = (watchStatus: BriefingInput['watchStatus']) => view(HILLS, 'hill_repeats_outdoor', { watchStatus, watchLink: { linked: true, autoTick: false, activities: true } }).rows.find((x) => x.id === 'watch')!;
    expect(outside({ kind: 'stale', wants: 'Run', wrote: 'Walk' }).line).toBe('Er staat nog een wandelworkout op. De hardloopworkout komt eraan.');
    const failed = outside({ kind: 'failed', reason: 'geen verbinding', wants: 'Run', wrote: 'Walk' });
    expect(failed.line).toBe('Versturen lukte niet: er staat nog een wandelworkout op.');
    expect(failed.tone).toBe('warn');
    // Weer verstuurd: de gewone regel.
    expect(outside({ kind: 'sent', sentAt: new Date(2026, 10, 11, 7, 18).toISOString() }).line).toContain('Staat erop');
  });
  it('mislukt met een oudere wandelworkout erop: de regel spreekt zichzelf niet tegen', () => {
    const r = row({ kind: 'failed', reason: 'geen verbinding', wants: 'Walk', wrote: 'Walk' });
    expect(r.line).toBe('Er staat een wandelworkout op. Een wijziging versturen lukte niet. Start hem bij Wandelen.');
    expect(r.line).not.toContain('zonder workout');
    expect(r.tone).toBe('warn');
  });
  it('de lange duurloop als wandeling buiten: geen eigen workout, de eerlijke regel van voorheen', () => {
    const r = view(LONG, 'long_hike_outdoor').rows.find((x) => x.id === 'watch')!;
    expect(r.line).toContain('Er staat een hardloopworkout op.');
  });
  it('past op 360 px: geen regel langer dan drie regels van 40 tekens', () => {
    for (const st of [{ kind: 'sent', wants: 'Walk', wrote: 'Walk' }, { kind: 'stale', wants: 'Walk', wrote: 'Run' }, { kind: 'failed', wants: 'Walk', wrote: 'Run' }, { kind: 'failed', wants: 'Walk', wrote: 'Walk' }] as const) {
      expect(view(HILLS, 'stairmaster_intervals', { watchStatus: st }).rows.find((r) => r.id === 'watch')!.line.length).toBeLessThanOrEqual(120);
    }
  });
});

describe('het tempo staat in de Briefing', () => {
  it('een duurloop met testloop: het tempo als kerngetal en de zin over de testloop', () => {
    const v = view(EASY, undefined, { paces: PACES });
    expect(v.heart.facts.at(-1)).toEqual({ value: '7:15 tot 8:20', label: 'per km' });
    expect(v.heart.paceNote).toMatch(/^Tempo uit je testloop van 29 oktober\./);
  });
  it('een duurloop op de loopband: ook het tempo (je stelt de band erop in)', () => {
    expect(view(EASY, 'run_treadmill', { paces: PACES }).heart.facts.at(-1)?.label).toBe('per km');
    expect(view(LONG, 'long_run_treadmill', { paces: PACES }).heart.facts.some((f) => f.label === 'omhoog als het kan')).toBe(false);
  });
  it('geen testloop: geen tempo en geen testloopzin', () => {
    const v = view(EASY);
    expect(v.heart.facts.some((f) => f.label === 'per km')).toBe(false);
    expect(v.heart.paceNote).toBeUndefined();
  });
  it('heuvelsprints op de band met testloop: het tempo komt erbij, Geen afdaling blijft', () => {
    const facts = view(DESCENT, 'incline_treadmill_intervals', { paces: PACES }).heart.facts;
    expect(facts.some((f) => f.value === 'Geen afdaling')).toBe(true);
    expect(facts.at(-1)?.label).toBe('per km');
  });
  it('StairMaster of fietsen: geen tempo per km', () => {
    expect(view(HILLS, 'stairmaster_intervals', { paces: PACES }).heart.facts.some((f) => f.label === 'per km')).toBe(false);
    expect(view(EASY, 'bike_outdoor', { paces: PACES }).heart.facts.some((f) => f.label === 'per km')).toBe(false);
  });
  it('de testloop zelf: de feiten van de test, geen verzonnen tempo', () => {
    const v = view(TEST, undefined, { paces: PACES });
    expect(v.heart.facts[0]).toEqual({ value: '5 km', label: 'op tijd' });
    expect(v.heart.facts.some((f) => f.label === 'per km')).toBe(false);
  });
  it('de missiekaart heeft geen tempo meer voor een training met een Briefing', () => {
    expect(missionCardView({ briefingReach: true, briefingButton: false, quickComplete: false, inAppStrength: false }).pace).toBe(false);
    expect(missionCardView({ briefingReach: false, briefingButton: false, quickComplete: false, inAppStrength: false }).pace).toBe(true);
  });
  it('de kerngetallen van de sessie zelf (Vandaag, info) veranderen niet', () => {
    expect(buildSessionBrief(HILLS, TODAY, null).facts.map((f) => f.label)).toEqual(['totaal', 'hard bergop', 'op de heuvel']);
  });
});

describe('beweging', () => {
  it('de overgang bij een andere manier: in Rustig en Uit direct op de eindstand', () => {
    expect(placeTransition('full')).toContain('200ms');
    expect(placeTransition('calm')).toBeUndefined();
    expect(placeTransition('off')).toBeUndefined();
  });
});

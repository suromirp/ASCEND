import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { SessionLog } from '../models/training';
import { draftKey, saveDraft } from '../utils/loggerDraft';
import { briefingEntry } from '../engine/briefing';
import { durationNeedsCheck } from '../engine/inputLimits';
import { alreadyLogged, clearsDraft, footState, HOW_TEXT, SAVE_LIMIT_MS, saveWithLimit, submitLog } from './logForm/howDidItGo';
import { asksPain } from './logForm/formRules';
import { useLogForm } from './logForm/useLogForm';
import sheetSrc from './HowDidItGoSheet.tsx?raw';
import frameSrc from './SheetFrame.tsx?raw';
import partsSrc from './logForm/LogFormParts.tsx?raw';
import rulesSrc from './logForm/howDidItGo.ts?raw';
import loggerSrc from './ExerciseLogger.tsx?raw';
import missionSrc from './TodayMissionCard.tsx?raw';
import actionSrc from './SessionActionSheet.tsx?raw';

// Het blad Hoe ging het? (spoor 5), echt gerenderd zonder DOM. Nagemaakte trainingen en logs.
// node:fs samengesteld omdat het project geen Node-typen meldt (zoals watch/watch.test.ts).
const nodeFs = (await import('node:' + 'fs')) as { readFileSync: (url: URL, encoding: string) => string };
const css = nodeFs.readFileSync(new URL('../index.css', import.meta.url), 'utf8');
const app = vi.hoisted(() => ({ logs: [] as unknown[] }));
vi.mock('./Portal', () => ({ Portal: ({ children }: { children: ReactNode }) => children }));
vi.mock('./motion', () => ({ useMotionMode: () => 'full' }));
vi.mock('../state/AppDataContext', () => ({
  useAppData: () => ({ logSession: async () => true, settings: {}, weather: {}, sessionLogs: app.logs, strengthExternal: false, templates: [], plannedSessions: [] }),
}));

const { HowDidItGoSheet, StepTwo, SheetFoot } = await import('./HowDidItGoSheet');
const { ExerciseLogger } = await import('./ExerciseLogger');

const { templates, program } = buildDefaultProgramData();
const tpl = (id: string) => templates.find((t) => t.id === id)!;
const TODAY = '2026-11-12';

// sessionStorage zoals in de app: blijft na herladen staan.
const store = new Map<string, string>();
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${TODAY}T10:00:00`));
  store.clear();
  app.logs = [];
  vi.stubGlobal('sessionStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const sheet = (id: string, date = TODAY, planned: string | null = 'ps1') =>
  renderToStaticMarkup(createElement(HowDidItGoSheet, { template: tpl(id), plannedSessionId: planned ?? undefined, scheduledDate: date, program, onClose: () => undefined }));

function StepTwoOf({ id, date, planned }: { id: string; date: string; planned?: string }) {
  const form = useLogForm({ template: tpl(id), plannedSessionId: planned, scheduledDate: date, program, startAtForm: true });
  return createElement(StepTwo, { form, template: tpl(id), scheduledDate: date, otherOpen: false, onToggleOther: () => undefined });
}
const stepTwo = (id: string, date = TODAY, planned: string | null = 'ps1') => renderToStaticMarkup(createElement(StepTwoOf, { id, date, planned: planned ?? undefined }));

describe('stap 1 van Hoe ging het?', () => {
  it('de dag zelf: duur, Beter/Normaal/Slechter, pijn, zwaarte, de rij naar stap 2 en één mint knop Opslaan', () => {
    const html = sheet('tpl_long_run');
    expect(html).toContain(HOW_TEXT.title);
    expect(html).toContain('Vandaag');
    for (const text of ['Duur', 'Normaal', 'Slechter', 'Pijn op een plek?', 'Zwaarte, 1 tot 10', HOW_TEXT.more, '>Opslaan<', '>Annuleren<']) expect(html).toContain(text);
    expect(html.match(/mx-primary/g)).toHaveLength(1);
    // Zonder de uitleg erboven, en de velden van stap 2 nog niet.
    for (const text of ['Zo doe je het', 'Stop of schakel terug', 'Eten onderweg', 'Gedaan op', 'Notities']) expect(html).not.toContain(text);
    // Twee stappen zoals het blad van een training in Week: het greepje, de kop en het kruis.
    expect(html).toContain('animate-sheet-in');
    expect(html).toContain('aria-label="Sluiten"');
  });

  it('een dag in het verleden: de dag staat in de kop en Gedaan op staat in stap 2, met die dag gekozen', () => {
    const html = sheet('tpl_easy_run', '2026-11-10');
    expect(html).not.toContain('>Vandaag<');
    expect(html).toMatch(/di 10 nov/i);
    const two = stepTwo('tpl_easy_run', '2026-11-10');
    expect(two).toContain('Gedaan op');
    expect(two).toContain('>vandaag<');
    expect(two).toMatch(/aria-pressed="true"[^>]*>di 10 nov/i);
    expect(two).toMatch(/aria-pressed="false"[^>]*>vandaag</);
  });

  it('de gekozen plek staat stil in de kop van stap 1, zonder extra tik', () => {
    expect(sheet('tpl_easy_run')).toContain('Vandaag · Buiten');
    // Eén plek (wedstrijd): geen plek in de kop.
    expect(sheet('tpl_race')).not.toContain('Vandaag ·');
  });

  it('korte vragen in het blad, de uitleg van de zwaarte achter de i, en nergens (optioneel)', () => {
    const one = sheet('tpl_easy_run');
    expect(one).toContain('Ten opzichte van normaal');
    expect(one).toContain('aria-label="Wat is zwaarte?"');
    expect(one).not.toContain('hoe zwaar voelde de hele training?');
    const two = stepTwo('tpl_intervals');
    expect(two).toContain('Benen bij het inlopen');
    for (const html of [one, two]) expect(html).not.toContain('optioneel');
  });

  it('de dag zelf: geen Gedaan op bij een geplande training', () => {
    expect(stepTwo('tpl_easy_run')).not.toContain('Gedaan op');
    expect(sheet('tpl_easy_run')).not.toContain('Gedaan op');
  });

  it('een losse training: Gedaan op staat in stap 1, de dag is de eerste vraag', () => {
    const html = sheet('tpl_long_run', TODAY, null);
    expect(html).toContain('Gedaan op');
    expect(html).toContain('type="date"');
    expect(stepTwo('tpl_long_run', TODAY, null)).not.toContain('Gedaan op');
  });

  it('één mint: gekozen chips en segmenten zijn stil in het blad, invoervelden 44 px', () => {
    saveDraft(draftKey('tpl_easy_run', 'ps1', TODAY), { rpe: 4, subjectiveFeel: 'normal' });
    const html = sheet('tpl_easy_run');
    expect(html).toContain('quiet-form');
    expect(html).toMatch(/class="st-chip quiet"[^>]*>4</);
    expect(html).not.toContain('var(--color-action-muted)');
    expect(html).toContain('min-h-[44px]');
  });

  it('stap 2: de overige velden van het oude formulier', () => {
    const two = stepTwo('tpl_easy_run');
    for (const text of ['Waar train je?', 'Afstand', 'Stijging', 'Gem. hartslag', 'Iets anders gedaan?', 'Notities']) expect(two).toContain(text);
    const hike = stepTwo('tpl_mountain_hike');
    for (const text of ['Daling', 'Met stokken', 'Rugzak', 'Terrein']) expect(hike).toContain(text);
  });

  it('testloop en wedstrijd: altijd zelf invullen, in hetzelfde blad', () => {
    for (const id of ['tpl_test_run', 'tpl_race']) {
      const html = renderToStaticMarkup(createElement(ExerciseLogger, { template: tpl(id), plannedSessionId: 'ps1', scheduledDate: TODAY, program, startAtForm: true, onClose: () => undefined }));
      expect(html).toContain(HOW_TEXT.more);
      expect(html).toContain('Pijn op een plek?');
      expect(html).not.toContain('animate-fade-in');
    }
  });

  it('de rustdag houdt het oude scherm', () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ExerciseLogger, { template: tpl('tpl_herstel'), plannedSessionId: 'ps1', scheduledDate: TODAY, program, startAtForm: true, onClose: () => undefined })));
    expect(html).toContain('animate-fade-in');
    expect(html).not.toContain(HOW_TEXT.more);
  });

  it('een concept na het sluiten en opnieuw openen van de app komt terug, ook van het oude scherm', () => {
    saveDraft(draftKey('tpl_easy_run', 'ps1', TODAY), { duration: 55, notes: 'Halverwege ingevuld', reachedForm: true });
    expect(sheet('tpl_easy_run')).toContain('value="55"');
    expect(stepTwo('tpl_easy_run')).toContain('Halverwege ingevuld');
  });

  it('een al gedane training: geen formulier en geen Opslaan, alleen de regel en Sluiten', () => {
    app.logs = [{ id: 'l1', plannedSessionId: 'ps1' } as SessionLog];
    const html = sheet('tpl_easy_run');
    for (const text of ['Duur', 'Pijn op een plek?', 'Zwaarte', HOW_TEXT.more]) expect(html).not.toContain(text);
    expect(html).toContain(HOW_TEXT.already);
    expect(html).toContain('>Sluiten<');
    expect(html).not.toContain('>Opslaan<');
    expect(html).not.toContain('mx-primary');
  });
});

describe('opslaan in het blad', () => {
  it('al gedaan herkent alleen een log van dezelfde geplande training', () => {
    expect(alreadyLogged('ps1', [{ plannedSessionId: 'ps1' }])).toBe(true);
    expect(alreadyLogged('ps1', [{ plannedSessionId: 'ps2' }])).toBe(false);
    expect(alreadyLogged(undefined, [{ plannedSessionId: undefined }])).toBe(false);
  });

  it('de lange-duurbevestiging komt nog: Klopt dit? met Aanpassen en Ja, opslaan', () => {
    expect(durationNeedsCheck(900)).toBe(true);
    expect(footState({ alreadyDone: false, confirmLong: true })).toBe('confirm');
    const html = renderToStaticMarkup(createElement(SheetFoot, { state: 'confirm', saving: false, slow: false, failed: false, rest: false, minutes: 900, onClose: () => undefined, onAdjust: () => undefined, onSave: () => undefined }));
    expect(html).toContain('Klopt dit?');
    expect(html).toContain('>Aanpassen<');
    expect(html).toContain('>Ja, opslaan<');
    // Het blad vraagt het voor het opslaan, met de minuten die worden opgeslagen.
    expect(sheetSrc).toMatch(/if \(!confirmed && durationNeedsCheck\(input\.durationMinutes\)\) \{\s*setConfirmLong\(true\);\s*return;/);
    // Aanpassen brengt je terug bij het duurveld in stap 1.
    expect(sheetSrc).toContain('onAdjust={() => { setConfirmLong(false); setStep(1); }}');
  });

  it('een fout bij het opslaan: het blad blijft open met de melding, het concept blijft, Opslaan kan weer', async () => {
    for (const save of [async () => false, async () => { throw new Error('schijf vol'); }]) {
      const busy = { current: false };
      const onSaved = vi.fn();
      const onFailed = vi.fn();
      expect(await submitLog({ busy, save, onSlow: () => undefined, onSaved, onFailed })).toBe('failed');
      expect(onSaved).not.toHaveBeenCalled();
      expect(onFailed).toHaveBeenCalledOnce();
      expect(busy.current).toBe(false);
    }
    const html = renderToStaticMarkup(createElement(SheetFoot, { state: 'save', saving: false, slow: false, failed: true, rest: false, minutes: 40, onClose: () => undefined, onAdjust: () => undefined, onSave: () => undefined }));
    expect(html).toContain(HOW_TEXT.failed);
    expect(html).not.toMatch(/disabled=""[^>]*>Opslaan</);
    // Een losse training: eerst in je logboek kijken, want een tweede tik kan een tweede log geven.
    const loose = renderToStaticMarkup(createElement(SheetFoot, { state: 'save', saving: false, slow: false, failed: true, loose: true, rest: false, minutes: 40, onClose: () => undefined, onAdjust: () => undefined, onSave: () => undefined }));
    expect(loose).toContain(HOW_TEXT.failedLoose);
  });

  it('gelukt: één aanroep met het hele log, daarna concept weg en blad dicht; een tweede tik tijdens het opslaan doet niets', async () => {
    const busy = { current: false };
    let resolve: (ok: boolean) => void = () => undefined;
    const save = vi.fn(() => new Promise<boolean>((r) => { resolve = r; }));
    const onSaved = vi.fn();
    const first = submitLog({ busy, save, onSlow: () => undefined, onSaved, onFailed: () => undefined });
    expect(await submitLog({ busy, save, onSlow: () => undefined, onSaved, onFailed: () => undefined })).toBe('busy');
    resolve(true);
    expect(await first).toBe('saved');
    expect(save).toHaveBeenCalledOnce();
    expect(onSaved).toHaveBeenCalledOnce();
    expect(sheetSrc).toContain('onSaved: () => { form.clearDraft(); onSaved?.(); finish(); }');
  });

  it('een grens in tijd: na de grens zegt het blad dat het lang duurt, de uitkomst blijft die van het opslaan', async () => {
    vi.useFakeTimers();
    let resolve: (ok: boolean) => void = () => undefined;
    const slow = vi.fn();
    const result = saveWithLimit(() => new Promise<boolean>((r) => { resolve = r; }), slow);
    vi.advanceTimersByTime(SAVE_LIMIT_MS + 1);
    expect(slow).toHaveBeenCalledOnce();
    resolve(true);
    expect(await result).toBe(true);
    const quick = vi.fn();
    expect(await saveWithLimit(async () => true, quick)).toBe(true);
    vi.advanceTimersByTime(SAVE_LIMIT_MS + 1);
    expect(quick).not.toHaveBeenCalled();
    const html = renderToStaticMarkup(createElement(SheetFoot, { state: 'save', saving: true, slow: true, failed: false, rest: false, minutes: 40, onClose: () => undefined, onAdjust: () => undefined, onSave: () => undefined }));
    expect(html).toContain(HOW_TEXT.slow);
    expect(html).toContain('Opslaan…');
    // Na de grens mag je weg: Annuleren staat aan, het concept blijft staan.
    expect(html).not.toMatch(/disabled=""[^>]*>Annuleren</);
    expect(sheetSrc).toContain('const canClose = () => !savingRef.current || slowRef.current;');
    expect(sheetSrc).toContain('if (!savingRef.current && clearsDraft(wayRef.current, form.filled())) form.clearDraft();');
  });

  it('sluiten: alleen Annuleren wist een ingevuld concept, elke andere weg laat het staan; leeg mag altijd weg', () => {
    for (const way of ['backdrop', 'drag', 'back', 'cross'] as const) {
      expect(clearsDraft(way, true), way).toBe(false);
      expect(clearsDraft(way, false), way).toBe(true);
    }
    expect(clearsDraft('cancel', true)).toBe(true);
    expect(clearsDraft('already', true)).toBe(true);
    // Elke weg loopt via useSheetClose en kiest met clearsDraft; Annuleren en Sluiten zeggen wie ze zijn.
    expect(sheetSrc).toContain('if (!savingRef.current && clearsDraft(wayRef.current, form.filled())) form.clearDraft();');
    expect(sheetSrc).toContain("const wayRef = useRef<CloseWay>('backdrop');");
    expect(sheetSrc).toContain("const close = closeAs('cross');");
    expect(sheetSrc).toContain("onClose={closeAs(foot === 'already' ? 'already' : 'cancel')}");
  });

  it('ingevuld: een teruggelezen concept of een andere waarde dan het begin; de plek uit de opslag telt niet', () => {
    const Filled = ({ id }: { id: string }) => createElement('i', null, String(useLogForm({ template: tpl(id), plannedSessionId: 'ps1', scheduledDate: TODAY, program }).filled()));
    expect(renderToStaticMarkup(createElement(Filled, { id: 'tpl_easy_run' }))).toBe('<i>false</i>');
    saveDraft(draftKey('tpl_easy_run', 'ps1', TODAY), { notes: 'iets' });
    expect(renderToStaticMarkup(createElement(Filled, { id: 'tpl_easy_run' }))).toBe('<i>true</i>');
  });

  it('terug sluit laag voor laag: in stap 2 eerst terug naar stap 1', () => {
    expect(sheetSrc).toContain('useBackToClose(step === 2, () => setStep(1));');
  });
});

describe('waar het blad opengaat', () => {
  it('Gedaan en Zelf invullen voor een training te voet openen het blad, kracht en de rustdag niet', () => {
    expect(loggerSrc).toContain("if (briefingEntry(props.template) && !props.preview) return <HowDidItGoSheet {...props} />;");
    expect(briefingEntry(tpl('tpl_long_run'))).toBe(true);
    expect(briefingEntry(tpl('tpl_mountain_hike'))).toBe(true);
    expect(briefingEntry(tpl('tpl_herstel'))).toBe(false);
    expect(briefingEntry(tpl('tpl_upper_a'))).toBe(false);
  });
  it('Zelf invullen in de Briefing legt het blad over de Briefing, op Vandaag en in Week', () => {
    for (const src of [missionSrc, actionSrc]) {
      expect(src).toContain('onManual={() => setShowManual(true)}');
      expect(src).toMatch(/showBriefing && showManual && \(\s*<HowDidItGoSheet/);
    }
  });
  it('de pijnvraag staat er bij elke loop en wandeling', () => {
    const onFoot = templates.filter((t) => briefingEntry(t));
    expect(onFoot.length).toBeGreaterThan(10);
    for (const t of onFoot) expect(asksPain(t), t.id).toBe(true);
  });
});

describe('ontwerpregels van het blad', () => {
  const files = { sheetSrc, frameSrc, partsSrc, rulesSrc };
  it('geen hex of rgba, niets onder 12 px, geen uppercase, geen gedachtestreepjes', () => {
    for (const [name, src] of Object.entries(files)) {
      expect(src, name).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
      expect(src, name).not.toMatch(/text-\[(?:[0-9]|1[01])px\]/);
      expect(src, name).not.toMatch(/\buppercase\b/);
      expect(src, name).not.toMatch(/[\u2013\u2014]/);
    }
  });
  it('Rustig en Uit: alleen de gedeelde beweging van een blad, die in Uit op de eindstand staat', () => {
    for (const src of [sheetSrc, frameSrc]) {
      expect(src).not.toMatch(/animation:|transition-|@keyframes/);
    }
    expect(frameSrc).toContain("closing ? 'animate-sheet-out' : 'animate-sheet-in'");
    expect(css).toMatch(/html\[data-motion='off'\] \*,/);
    expect(css).toMatch(/prefers-reduced-motion: reduce/);
  });
});

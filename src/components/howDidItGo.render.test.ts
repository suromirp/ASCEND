import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { SessionLog } from '../models/training';
import { draftKey, saveDraft } from '../utils/loggerDraft';
import { briefingEntry } from '../engine/briefing';
import { durationNeedsCheck } from '../engine/inputLimits';
import { alreadyLogged, footState, HOW_TEXT, SAVE_LIMIT_MS, saveWithLimit } from './logForm/howDidItGo';
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
  useAppData: () => ({ logSession: async () => true, settings: {}, sessionLogs: app.logs, strengthExternal: false, templates: [], plannedSessions: [] }),
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

const sheet = (id: string, date = TODAY, planned: string | undefined = 'ps1') =>
  renderToStaticMarkup(createElement(HowDidItGoSheet, { template: tpl(id), plannedSessionId: planned, scheduledDate: date, program, onClose: () => undefined }));

function StepTwoOf({ id, date, planned }: { id: string; date: string; planned?: string }) {
  const form = useLogForm({ template: tpl(id), plannedSessionId: planned, scheduledDate: date, program, startAtForm: true });
  return createElement(StepTwo, { form, template: tpl(id), plannedSessionId: planned, scheduledDate: date, otherOpen: false, onToggleOther: () => undefined });
}
const stepTwo = (id: string, date = TODAY, planned: string | undefined = 'ps1') => renderToStaticMarkup(createElement(StepTwoOf, { id, date, planned }));

describe('stap 1 van Hoe ging het?', () => {
  it('de dag zelf: duur, Beter/Normaal/Slechter, pijn, zwaarte, de rij naar stap 2 en één mint knop Opslaan', () => {
    const html = sheet('tpl_long_run');
    expect(html).toContain(HOW_TEXT.title);
    expect(html).toContain('Vandaag');
    for (const text of ['Duur', 'Normaal', 'Slechter', 'Pijn op een plek?', 'Zwaarte (RPE)', HOW_TEXT.more, '>Opslaan<', '>Annuleren<']) expect(html).toContain(text);
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
    expect(two).toMatch(/aria-pressed="true"[^>]*>di 10 nov|class="[^"]*"[^>]*>di 10 nov/i);
  });

  it('de dag zelf: geen Gedaan op bij een geplande training', () => {
    expect(stepTwo('tpl_easy_run')).not.toContain('Gedaan op');
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

  it('een al gedane training: geen Opslaan, de regel dat er geen tweede log komt, en Sluiten', () => {
    app.logs = [{ id: 'l1', plannedSessionId: 'ps1' } as SessionLog];
    const html = sheet('tpl_easy_run');
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
  });

  it('een fout halverwege: alles of niets, het blad blijft open met de melding en Opslaan kan weer', async () => {
    expect(await saveWithLimit(async () => false, () => undefined)).toBe(false);
    expect(await saveWithLimit(async () => { throw new Error('schijf vol'); }, () => undefined)).toBe(false);
    const html = renderToStaticMarkup(createElement(SheetFoot, { state: 'save', saving: false, slow: false, failed: true, rest: false, minutes: 40, onClose: () => undefined, onAdjust: () => undefined, onSave: () => undefined }));
    expect(html).toContain(HOW_TEXT.failed);
    expect(html).not.toMatch(/disabled=""[^>]*>Opslaan</);
    // Eén aanroep van logSession met het hele log; mislukt: geen clearDraft en geen onClose.
    expect(sheetSrc.match(/logSession\(/g)).toHaveLength(1);
    expect(sheetSrc).toMatch(/if \(!ok\) \{\s*setFailed\(true\);\s*return;\s*\}\s*form\.clearDraft\(\);/);
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
  });

  it('sluiten zonder opslaan gooit het concept weg, terwijl het opslaat blijft het blad open', () => {
    expect(sheetSrc).toContain('useSheetClose(() => { form.clearDraft(); onClose(); }, 200, () => !savingRef.current)');
    expect(sheetSrc).toContain('const close = () => { if (!savingRef.current) requestClose(); };');
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
      expect(src, name).not.toMatch(/[–—]/);
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

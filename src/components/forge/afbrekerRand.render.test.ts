// Afbreker randgevallen (backlog I-4, Warden 15 november). Echt gerenderd zonder DOM waar het kan; wat alleen met
// een DOM te mounten is (een effect, een tik) staat als pure stap in engine/forgeSession.ts en is daar gedragsgetest,
// met hier de controle dat het component die stap gebruikt. Nagemaakte trainingen en tijden.
(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { SessionTemplate } from '../../models/training';
import type { WorkoutExercise } from '../../engine/forgeWorkout';
import { afterChoiceClose, askBreakNow, choiceSheetSeesGone, finishDayChoices, finishDayDefault, GONE_NEXT_TEXT, pillSlot, rememberDismiss, SESSION_GONE_TEXT } from '../../engine/forgeSession';
import { toISODate } from '../../utils/dates';
import clockSrc from './useForgeClock.ts?raw';
import choiceSrc from './SessionChoiceSheet.tsx?raw';
import pillSrc from './SessionPill.tsx?raw';
import appSrc from '../../App.tsx?raw';
import uiSrc from '../TextButton.tsx?raw';

vi.mock('../Portal', () => ({ Portal: ({ children }: { children: ReactNode }) => children }));
vi.mock('../motion', () => ({ useMotionMode: () => 'full' }));
vi.mock('../../state/AppDataContext', () => ({ useAppData: () => ({ templates: [], settings: {} }) }));

const { FinishSheet } = await import('./FinishSheet');
const { GoneNote } = await import('./SessionChoiceSheet');

const dayOf = (ms: number) => toISODate(new Date(ms));
const at = (iso: string) => Date.parse(iso);

afterEach(() => {
  vi.useRealTimers();
});

describe('1. Lange onderbreking: het gesloten blad wordt onthouden', () => {
  it('sluiten zonder antwoord onthoudt de stilte; de minuut-tik vraagt dan niet opnieuw, een terugkomst wel', () => {
    const last = at('2026-11-17T21:30:00Z');
    const dismissedFor = rememberDismiss({ asking: true, lastActionAt: last });
    expect(dismissedFor).toBe(last);
    expect(askBreakNow({ gapMs: 3 * 3_600_000, source: 'tik', lastActionAt: last, dismissedFor })).toBe(false);
    expect(askBreakNow({ gapMs: 3 * 3_600_000, source: 'terug', lastActionAt: last, dismissedFor })).toBe(true);
    // Een nieuwe handeling en daarna weer een lange stilte: dat is een nieuwe stilte, die vraagt wel.
    expect(askBreakNow({ gapMs: 3 * 3_600_000, source: 'tik', lastActionAt: last + 60_000, dismissedFor })).toBe(true);
  });

  it('sluiten terwijl de vraag niet openstond: wat er onthouden was blijft (tweede poging verandert niets)', () => {
    const last = at('2026-11-17T21:30:00Z');
    expect(rememberDismiss({ asking: false, lastActionAt: last + 5_000, dismissedFor: last })).toBe(last);
    expect(rememberDismiss({ asking: false, lastActionAt: last })).toBeUndefined();
  });

  it('de hook gebruikt deze stap en geeft het onthouden door aan askBreakNow', () => {
    expect(clockSrc).toMatch(/dismissedFor\.current = rememberDismiss\(\{ asking: asking\.current, lastActionAt: lastAction\.current/);
    expect(clockSrc).toMatch(/askBreakNow\(\{[^}]*dismissedFor: dismissedFor\.current/);
  });
});

// --- FinishSheet -----------------------------------------------------------------------------------------------

const template = { id: 'tpl_upper_a', name: 'Bovenlichaam A', type: 'strength', exercises: [] } as unknown as SessionTemplate;
const workoutTicked = (doneAt: number[]): WorkoutExercise[] => [
  {
    slot: 'a',
    exerciseId: 'a',
    name: 'Bankdrukken',
    known: true,
    restSec: 120,
    rows: doneAt.map((t, i) => ({ id: `r${i}`, kind: 'work', target: { repsLow: 8, repsHigh: 10 }, done: true, doneAt: t })),
  } as unknown as WorkoutExercise,
];
const finish = (o: { workout: WorkoutExercise[]; plannedSessionId?: string; scheduledDate?: string }) =>
  renderToStaticMarkup(
    createElement(FinishSheet, {
      template,
      readOnly: false,
      workout: o.workout,
      elapsedSeconds: 45 * 60,
      defaultMinutes: 60,
      ...(o.plannedSessionId ? { plannedSessionId: o.plannedSessionId } : {}),
      ...(o.scheduledDate ? { scheduledDate: o.scheduledDate } : {}),
      onClose: () => undefined,
      onSave: async () => true,
    }),
  );
const pressed = (html: string) => [...html.matchAll(/<button[^>]*aria-pressed="true"[^>]*>([^<]*)</g)].map((m) => m[1]);
const dayButtons = (html: string) => [...html.matchAll(/<button[^>]*aria-pressed="(?:true|false)"[^>]*class="st-chip[^"]*"[^>]*>([^<]*)</g)].map((m) => m[1]);

describe('2. FinishSheet: de keuze van de laatste tik, gerenderd', () => {
  it('een losse training van gisteren: het veld Gedaan op staat op de dag van je laatste set', () => {
    vi.useFakeTimers();
    vi.setSystemTime(at('2026-11-18T07:00:00Z')); // wo 18 november 08:00 in Amsterdam
    const html = finish({ workout: workoutTicked([at('2026-11-17T21:40:00Z'), at('2026-11-17T22:10:00Z')]) });
    expect(html).toContain('Gedaan op');
    expect(html).toMatch(/<input type="date"[^>]*value="2026-11-17"/);
  });

  it('een losse training van vandaag: vandaag', () => {
    vi.useFakeTimers();
    vi.setSystemTime(at('2026-11-18T19:00:00Z'));
    const html = finish({ workout: workoutTicked([at('2026-11-18T18:30:00Z')]) });
    expect(html).toMatch(/<input type="date"[^>]*value="2026-11-18"/);
  });
});

describe('3. Een geplande training een dag eerder of later: het nieuwe log krijgt de dag van de laatste set', () => {
  it('een dag later: gepland ma 16, gedaan di 17, afgerond di 17. Was ma 16, nu di 17', () => {
    vi.useFakeTimers();
    vi.setSystemTime(at('2026-11-17T19:00:00Z'));
    const lastTickAt = at('2026-11-17T18:40:00Z');
    expect(finishDayDefault({ today: '2026-11-17', plannedSessionId: 'ps1', scheduledDate: '2026-11-16', lastTickAt, dayOf })).toBe('2026-11-17');
    const html = finish({ workout: workoutTicked([lastTickAt]), plannedSessionId: 'ps1', scheduledDate: '2026-11-16' });
    expect(pressed(html)).toEqual(['vandaag']);
    expect(dayButtons(html)).toEqual(['ma 16 november', 'vandaag']);
  });

  it('een dag eerder: gepland wo 18, gedaan di 17, afgerond wo 18 (concept over de nacht). Was wo 18, nu di 17', () => {
    vi.useFakeTimers();
    vi.setSystemTime(at('2026-11-18T07:00:00Z'));
    const lastTickAt = at('2026-11-17T19:30:00Z');
    expect(finishDayDefault({ today: '2026-11-18', plannedSessionId: 'ps1', scheduledDate: '2026-11-18', lastTickAt, dayOf })).toBe('2026-11-17');
    const html = finish({ workout: workoutTicked([lastTickAt]), plannedSessionId: 'ps1', scheduledDate: '2026-11-18' });
    // Gepland vandaag, de set gisteren: de keuze staat er nu wel (voorheen geen keuze en stil vandaag).
    expect(dayButtons(html)).toEqual(['di 17 november', 'vandaag']);
    expect(pressed(html)).toEqual(['di 17 november']);
  });

  it('een dag eerder gedaan en dezelfde dag afgerond: gepland do 19, alles wo 18. Vandaag, geen keuze nodig', () => {
    vi.useFakeTimers();
    vi.setSystemTime(at('2026-11-18T20:00:00Z'));
    const lastTickAt = at('2026-11-18T19:30:00Z');
    expect(finishDayDefault({ today: '2026-11-18', plannedSessionId: 'ps1', scheduledDate: '2026-11-19', lastTickAt, dayOf })).toBe('2026-11-18');
    const html = finish({ workout: workoutTicked([lastTickAt]), plannedSessionId: 'ps1', scheduledDate: '2026-11-19' });
    expect(html).not.toContain('Gedaan op');
  });

  it('over middernacht in Amsterdam: 23:59 is nog de dag ervoor, 00:00 is de dag erna', () => {
    // 22:59 UTC op 17 november is 23:59 in Amsterdam; 23:00 UTC is 00:00 op 18 november.
    const before = at('2026-11-17T22:59:00Z');
    const after = at('2026-11-17T23:00:00Z');
    expect(finishDayDefault({ today: '2026-11-18', plannedSessionId: 'ps1', scheduledDate: '2026-11-18', lastTickAt: before, dayOf })).toBe('2026-11-17');
    expect(finishDayDefault({ today: '2026-11-18', plannedSessionId: 'ps1', scheduledDate: '2026-11-17', lastTickAt: after, dayOf })).toBe('2026-11-18');
    // Zomertijd: 21:59 UTC op 30 juni is 23:59 in Amsterdam.
    expect(finishDayDefault({ today: '2027-07-01', plannedSessionId: 'ps1', scheduledDate: '2027-07-01', lastTickAt: at('2027-06-30T21:59:00Z'), dayOf })).toBe('2027-06-30');
    expect(finishDayDefault({ today: '2027-07-01', plannedSessionId: 'ps1', scheduledDate: '2027-06-30', lastTickAt: at('2027-06-30T22:00:00Z'), dayOf })).toBe('2027-07-01');
  });

  it('de knoppen: geplande dag, dag van de set en vandaag, oud naar nieuw; nooit een geplande dag na vandaag', () => {
    const lastTickAt = at('2026-11-17T18:00:00Z');
    expect(finishDayChoices({ today: '2026-11-18', scheduledDate: '2026-11-16', lastTickAt, dayOf })).toEqual(['2026-11-16', '2026-11-17', '2026-11-18']);
    expect(finishDayChoices({ today: '2026-11-18', scheduledDate: '2026-11-20', lastTickAt, dayOf })).toEqual(['2026-11-17', '2026-11-18']);
    expect(finishDayChoices({ today: '2026-11-18', scheduledDate: '2026-11-18', dayOf })).toEqual([]);
  });

  it('de training blijft gekoppeld: Afronden geeft de geplande sessie mee, alleen de dag volgt het werk', async () => {
    const { forgeLogInput } = await import('./forgeFinishLog');
    const input = forgeLogInput({
      template,
      variant: 'standard' as never,
      extra: { minutes: 45, pain: [], notes: '', doneOn: '2026-11-17' },
      workout: workoutTicked([at('2026-11-17T18:40:00Z')]),
      readOnly: false,
      plannedSessionId: 'ps1',
      plannedStill: true,
      gymProfileId: 'gym1',
      forgeLog: [],
    });
    expect(input.plannedSessionId).toBe('ps1');
    expect(input.completedDate).toBe('2026-11-17');
  });
});

describe('4. Begrepen bij Er loopt nog een training: de gekozen training start', () => {
  it('weg en een vervolg: het vervolg (de nieuwe training), niet sluiten', () => {
    expect(afterChoiceClose({ discarded: false, gone: true, hasNext: true, choice: null })).toBe('next');
    expect(afterChoiceClose({ discarded: true, gone: false, hasNext: true, choice: null })).toBe('next');
    // Zonder vervolg (de pil): sluiten.
    expect(afterChoiceClose({ discarded: false, gone: true, hasNext: false, choice: null })).toBe('close');
    // Annuleren of wegvegen zonder keuze: sluiten. Een keuze: Forge openen.
    expect(afterChoiceClose({ discarded: false, gone: false, hasNext: true, choice: null })).toBe('close');
    expect(afterChoiceClose({ discarded: false, gone: false, hasNext: true, choice: 'finish' })).toBe('open');
  });

  it('het blad zegt eerlijk wat Begrepen doet als er een vervolg is, en niets extra zonder', () => {
    const withNext = renderToStaticMarkup(createElement(GoneNote, { next: true }));
    expect(withNext).toContain(SESSION_GONE_TEXT);
    expect(withNext).toContain(GONE_NEXT_TEXT);
    expect(renderToStaticMarkup(createElement(GoneNote, { next: false }))).not.toContain(GONE_NEXT_TEXT);
  });

  it('het blad gebruikt die stap; een gemiste tik op Begrepen (laat, tweede keer) gaat langs dezelfde weg', () => {
    expect(choiceSrc).toMatch(/afterChoiceClose\(\{ discarded: discarded\.current, gone: goneRef\.current, hasNext: !!onDiscarded/);
    expect(choiceSrc).toContain('<GoneNote next={!!onDiscarded} />');
    // Weg staat in een ref (voor het sluiten) en in de staat (voor het scherm), altijd samen.
    expect(choiceSrc.match(/setGone\(true\)/g)).toHaveLength(1);
  });
});

describe('5. De pil: verdwijnt de training terwijl het blad openstaat, dan zegt het blad dat', () => {
  it('pillSlot houdt het blad vast met de laatste stand, de pil zelf gaat weg', () => {
    const keyOf = (s: string) => s;
    expect(pillSlot({ live: 'a', last: 'a', sheetOpen: false, keyOf })).toEqual({ session: 'a', gone: false });
    expect(pillSlot({ live: undefined, last: 'a', sheetOpen: true, keyOf })).toEqual({ session: 'a', gone: true });
    expect(pillSlot({ live: undefined, last: 'a', sheetOpen: false, keyOf })).toBeUndefined();
  });

  it('het blad zegt weg, behalve als het hem zelf verwijderde of al een keuze maakte', () => {
    expect(choiceSheetSeesGone({ stillThere: false, discarded: false, picked: false })).toBe(true);
    expect(choiceSheetSeesGone({ stillThere: false, discarded: true, picked: false })).toBe(false);
    expect(choiceSheetSeesGone({ stillThere: false, discarded: false, picked: true })).toBe(false);
    expect(choiceSheetSeesGone({ stillThere: true, discarded: false, picked: false })).toBe(false);
  });

  it('App, pil en blad zijn zo verbonden: de plek, het luisteren naar de opslag en de zin', () => {
    expect(appSrc).toContain('<SessionPillSlot session={pill} />');
    expect(appSrc).not.toContain('{pill && <SessionPill ');
    expect(pillSrc).toContain('pillSlot({ live: session, last: last ?? session, sheetOpen, keyOf: sessionIdentity })');
    expect(pillSrc).toContain('vanished={gone}');
    expect(choiceSrc).toContain('subscribeSession(() => checkGone.current())');
    expect(choiceSrc).toMatch(/if \(vanished\) checkGone\.current\(\)/);
  });
});

describe('6. De rode Verwijderen in de bevestiging is de primitive TextButton met de gevaarstijl', () => {
  it('geen losse button meer in SessionChoiceSheet, en de kleur komt uit TextButton', () => {
    expect(choiceSrc).not.toMatch(/<button\b/);
    expect(choiceSrc).toMatch(/<TextButton tone="danger" onClick=\{\(\) => tapDiscard\(close\)\} className="flex-1 justify-center rounded-xl border"/);
    expect(uiSrc).toContain("danger: 'var(--color-danger-text)'");
  });
});

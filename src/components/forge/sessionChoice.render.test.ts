import { describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { SessionState } from '../../utils/forgeSessionStore';
import type { LeftSession } from '../../engine/forgeSession';
import hostSrc from './ForgeSessionHost.tsx?raw';
import workoutSrc from './ForgeWorkout.tsx?raw';
import otherSrc from './OtherSessionRunning.tsx?raw';
import choiceSrc from './SessionChoiceSheet.tsx?raw';
import draftSrc from './useForgeDraft.ts?raw';

// Het blad bij een training die bleef liggen en bij "Er loopt nog een training", en de pil van een concept
// (profiel afbreker, 14 november, backlog N). Echt gerenderd zonder DOM; nagemaakte sessie.
const hook = vi.hoisted(() => ({ left: undefined as LeftSession | undefined }));
vi.mock('../Portal', () => ({ Portal: ({ children }: { children: ReactNode }) => children }));
vi.mock('../motion', () => ({ useMotionMode: () => 'full' }));
vi.mock('../../state/AppDataContext', () => ({ useAppData: () => ({ templates: [], settings: {} }) }));
vi.mock('./useForgeSession', () => ({ useLeftSession: () => hook.left, useLeftCheck: () => () => hook.left, useSessionWorld: () => ({ loading: false }) }));

const { SessionChoiceSheet } = await import('./SessionChoiceSheet');
const { whenPhrase } = await import('../../engine/forgeSession');
const { SessionPill } = await import('./SessionPill');

const start = Date.parse('2026-11-17T21:30:00Z');
const session = (doneSets: number): SessionState => ({
  pointer: { key: 'ascend.afvinkconcept.ps1:forge', templateId: 'tpl_upper_a', name: 'Bovenlichaam A', plannedSessionId: 'ps1', scheduledDate: '2026-11-17' },
  startedAt: start,
  pauses: [],
  lastActionAt: start + 35 * 60_000,
  doneSets,
});
const left: LeftSession = { reason: 'nacht', lastActionAt: start + 35 * 60_000 };
const sheet = (s: SessionState, l?: LeftSession) => renderToStaticMarkup(createElement(SessionChoiceSheet, { session: s, ...(l ? { left: l } : {}), onClose: () => undefined }));
const order = (html: string, ...words: string[]) => words.map((w) => html.indexOf(`>${w}<`));

describe('een training die bleef liggen', () => {
  it('de drie keuzes in het blad zelf: Afronden met wat je deed voorop, dan Verder, Verwijderen en Niet nu', () => {
    const html = sheet(session(3), left);
    expect(html).toContain('Training niet afgerond');
    expect(html).toContain('Bovenlichaam A: 3 sets afgevinkt, 35 min getraind.');
    expect(html).toContain('er gaat niets weg tot je kiest');
    const [finish, resume, discard, later] = order(html, 'Afronden met 3 sets', 'Verder', 'Verwijderen', 'Niet nu');
    expect(finish).toBeGreaterThan(0);
    expect(finish).toBeLessThan(resume);
    expect(resume).toBeLessThan(discard);
    expect(discard).toBeLessThan(later);
    expect(html).not.toMatch(/<button[^>]*uppercase/);
  });

  it('zonder afgevinkte set geen Afronden: dan zou er een log van niets komen', () => {
    const html = sheet(session(0), left);
    expect(html).not.toContain('Afronden met');
    expect(html).toContain('>Verder<');
    expect(html).toContain('>Verwijderen<');
  });

  it('overgeslagen in je planning: het blad zegt het', () => {
    expect(sheet(session(2), { reason: 'overgeslagen', lastActionAt: start })).toContain('In je planning staat hij als overgeslagen.');
  });
});

describe('er loopt nog een training (een andere starten)', () => {
  it('Naar de training, Afronden, Verwijderen en Annuleren, met hoeveel sets', () => {
    const html = sheet(session(3));
    expect(html).toContain('Er loopt nog een training');
    expect(html).toContain('3 sets afgevinkt');
    const [go, finish, discard, cancel] = order(html, 'Naar de training', 'Afronden met 3 sets', 'Verwijderen', 'Annuleren');
    expect(go).toBeGreaterThan(0);
    expect(go).toBeLessThan(finish);
    expect(finish).toBeLessThan(discard);
    expect(discard).toBeLessThan(cancel);
  });

  it('na Verwijderen start de nieuwe training (ForgeWorkout zet other weg), andere keuzes sluiten', () => {
    expect(workoutSrc).toContain('onDiscarded={() => setOther(undefined)}');
    expect(otherSrc).toContain('SessionChoiceSheet');
  });

  it('Verwijderen: beide knoppen lopen door discardTap, en alleen daarna wordt er verwijderd', () => {
    // De eerste weergave toont geen bevestiging; de stap zelf staat getest in engine/forgeLeft.test.ts (discardTap).
    const html = sheet(session(3), left);
    expect(html).not.toContain('Training verwijderen?');
    expect(html).not.toContain('gaan weg');
    // Precies één plek roept discardSession aan, in tapDiscard na de controle op de tweede tik; elke knop
    // Verwijderen roept tapDiscard aan. Een mutant die bij de eerste tik verwijdert, voegt een aanroep toe.
    expect(choiceSrc.match(/discardSession\(/g)).toHaveLength(1);
    expect(choiceSrc).toMatch(/const next = discardTap\(step\);[\s\S]*?if \(!next\.discard\) return;[\s\S]*?discardSession\(session\.pointer\)/);
    expect(choiceSrc.match(/onClick=\{\(\) => tapDiscard\(close\)\}/g)).toHaveLength(2);
  });

  it('Afronden opent Forge meteen op het afrondblad', () => {
    expect(hostSrc).toContain('startAtForm={finish}');
    expect(choiceSrc).toContain("requestOpenSession(choice.current === 'finish' ? 'finish' : undefined)");
  });
});

describe('de pil', () => {
  it('een concept: Niet afgerond in amber, geen lopende klok, en het blad staat vanzelf open', () => {
    hook.left = left;
    const html = renderToStaticMarkup(createElement(SessionPill, { session: session(3) }));
    const pill = html.slice(0, html.indexOf('</button>'));
    expect(pill).toContain('Niet afgerond');
    expect(pill).toContain('var(--color-warning)');
    expect(pill).not.toMatch(/\d+:\d\d/);
    expect(pill).toContain('niet afgerond, 3 sets');
    expect(html).toContain('Training niet afgerond');
  });

  it('een lopende training: de klok zoals altijd', () => {
    hook.left = undefined;
    const html = renderToStaticMarkup(createElement(SessionPill, { session: session(3) }));
    expect(html).not.toContain('Niet afgerond');
    expect(html).toMatch(/\d+:\d\d/);
  });
});

describe('whenPhrase', () => {
  it('vandaag, gisteren of de dag, met de tijd', () => {
    const t = new Date(2026, 10, 17, 22, 41).getTime();
    expect(whenPhrase(t, '2026-11-17')).toBe('vandaag om 22:41');
    expect(whenPhrase(t, '2026-11-18')).toBe('gisteren om 22:41');
    expect(whenPhrase(t, '2026-11-24')).toBe('di 17 nov om 22:41');
  });
});

describe('terug tijdens een set', () => {
  it('terug of sluiten schrijft het concept meteen weg (ook een half getypte set), niet pas na de vertraging', () => {
    // Het wegschrijven zelf (saveSessionDraft) is gedragsgetest in utils/forgeSessionStore.test.ts; hier dat het bij
    // het sluiten en bij pagehide gebeurt, wat zonder DOM niet te mounten is.
    expect(draftSrc).toMatch(/return \(\) => \{[\s\S]*?flushDraft\(\);\s*\};\s*\}, \[flushDraft\]\)/);
    expect(draftSrc).toContain("window.addEventListener('pagehide', flushDraft)");
    // De vlag volgt de uitkomst van het wegschrijven, nooit de poging (Warden 15 november).
    expect(draftSrc).toMatch(/wrote\.current = saveSessionDraft\(/);
    expect(draftSrc).not.toMatch(/wrote\.current = true/);
  });
});

# Warden: herstelopdracht oud trainingsscherm

Branch `claude/oud-trainingsscherm`, laatste commit 47e3dfb (backlog I-9, I-30 deels, I-32). Bekeken: de drie eigen commits 6341b18, 13cba0f en 47e3dfb; de rest van de branch is `claude/nacht`.

Oordeel: NIET AKKOORD. Geen blokkerend punt, twee punten die moeten, beide klein en beide in `src/state/logSave.ts`.

## Wat klopt

- Logs blijven append-only: de wijziging schrijft alleen via `logSession`, raakt geen bestaand log en bewaart geen vlag. Status blijft afgeleid uit `SessionLog`.
- Een leesfout of een time-out haalt niets weg: concept blijft, scherm blijft, geen log (proef P2, P3, T4).
- Laat ja met het scherm weg: een log, concept weg, het scherm wordt niet aangeraakt (P4). Laat nee met het scherm weg: concept blijft, de fout gaat bovenin (P5).
- Tweede tik op hetzelfde scherm kan niet (knop uit tot het antwoord). Scherm opnieuw open bij een geplande training: nooit een tweede log (P6). Dubbele tik met dezelfde invulling bij een losse training: een log (P9).
- Hoe ging het? leest "stond er al" als al gedaan en nooit als mislukt; een nee zonder log blijft mislukt (H1, H2).
- Geen opgeslagen vorm veranderd, dus geen migratie nodig. Geen hex, geen `uppercase`, geen gedachtestreepjes en geen persoonsgegevens in de wijziging. Het besluit staat in `docs/beslissingen/2026-11-15-oud-trainingsscherm.md`.

## Moet

### M1. Tweede keer afvinken terwijl de eerste nog loopt is stil

`src/state/logSave.ts:316-320` (`tickOff`), tekst in `src/storage/storageError.ts:44`.

Na de grens zegt de melding bovenin "zo niet, vink hem dan nog eens af". Doe je dat terwijl de eerste poging nog hangt, dan geeft `logSession` nee zonder schrijffout (`loggingInFlight`), `tickOff` geeft `failed` terug en niemand meldt iets. Heb je de melding weggetikt, dan gebeurt er op je tik niets zichtbaars. Dat is de valkuil uit het werkbriefje ("Opnieuw tikken terwijl een poging loopt geeft `LOG_STILL_RUNNING_NOTE`, niet probeer het nog eens") en de regel dat elke knop die wacht een zichtbare uitkomst heeft. Proef T1.

Voorstel: laat `tickOff` de schrijffout zelf opvangen (`onWriteError`) en bij `failed` kiezen: met schrijffout `report(fout)`, zonder schrijffout `report(new TickOffStillRunning())`. Pas de zin aan zodat hij niet meer aanraadt nog eens af te vinken zolang het loopt; neem de woorden van `STILL_RUNNING_HELP`.

### M2. Scherm opnieuw open en Opslaan terwijl de eerste poging hangt zegt amber "Opslaan lukte niet"

`src/state/logSave.ts:205-215` (`saveOnLogger`, `show`) met `formNoteText` op regel 170-175.

Het besluit maakt Sluiten de uitweg na de grens. Open je daarna dezelfde geplande training opnieuw en tik je Opslaan, dan krijg je meteen amber "Opslaan lukte niet. Je invulling staat er nog; probeer het opnieuw." terwijl de eerste poging nog kan slagen. Landt die, dan blijft de amber zin staan op een training die gedaan is. Er komt geen tweede log, maar de zin is onwaar en zegt precies wat het werkbriefje verbiedt. De kaart Van je horloge (`cardAfterSave`, `stillRunning`) en de sportvraag (`thrownSaveNote`) maken dit onderscheid al. Proef P6.

Voorstel: in `show` is `failed` zonder schrijffout bij een geplande training "loopt nog": toon `LOG_STILL_RUNNING_NOTE` (niet amber) in plaats van de mislukt-zin. Zet het als pure keuze naast `formAfterSave`, met een test. Het blad Hoe ging het? heeft hetzelfde gat (`HowDidItGoSheet.tsx:119-123`); neem het mee of zet het op de backlog.

## Mag

### De twee open punten van de vorige review

1. De melding van `tickOff` blijft staan als het log toch landt. Blijft mag. De zin is voorwaardelijk ("kijk zo of hij er staat"), de rij is zichtbaar afgevinkt, en nog eens tikken geeft "stond er al" zonder tweede log. Netter: bij een laat ja of "stond er al" de melding intrekken als hij er nog staat (`onLate`). Doe het mee met M1 als het weinig kost.

2. Een laat ja wist het concept, ook als je het scherm opnieuw opende. Blijft mag. Bij een geplande training is het juist: het log staat er, een concept hoort bij een log dat er niet is (P6). Bij een losse training met een andere invulling gaat die tweede invulling zonder melding weg als beide schermen dicht zijn (P7); de wachtzin belooft daar "je invulling blijft bewaard". Het vraagt twee keer achter elkaar een opslag die langer dan tien seconden hangt. Voorstel: `clearDraft` alleen laten wissen als het concept nog gelijk is aan wat deze poging opsloeg.

### Verder

3. `tickOff` bij "stond er al" leest het logboek niet opnieuw (`logSave.ts:316`). Liep het scherm achter, dan zie je op je tik niets. `cardAfterSave` doet dat wel (`refresh`).
4. `ExerciseLogger.tsx:150`: `handleSave` kijkt naar de state `saving`, niet naar `savingRef`. `saveOnLogger` zet de ref wel direct, dus een dubbele tik in hetzelfde frame is alleen door de render van React gedekt. Kijk ook naar de ref.
5. Losse training, tweede scherm in beeld als de eerste landt: amber "kijk eerst in je logboek", knop weer aan, en een derde tik schrijft een tweede log (P8). Dat is het besluit `2026-11-14-opslaan-rest.md` en niet nieuw; genoteerd omdat het de enige weg naar twee logs binnen een tabblad is.

## Niet van deze branch, wel voor de backlog

Twee tabbladen die dezelfde geplande training tegelijk opslaan of afvinken schrijven twee logs (P10, T3). `loggingInFlight` leeft per tabblad en kijken en schrijven in `src/state/logSession.ts:92-127` is niet een transactie. Staat ook zo op main; `tickOff` maakt het niet erger. Voorstel: kijken en schrijven in een `readwrite`-transactie op de logs, of een Web Lock per `plannedSessionId`.

## Voorgestelde regel voor het werkbriefje (Valkuilen, historie-en-logs)

"Nee zonder schrijffout bij een geplande training is 'loopt nog', nooit 'mislukt': elk scherm en ook `tickOff` zegt dan `LOG_STILL_RUNNING_NOTE` of de zin van de grens. Een melding die aanraadt nog eens te tikken hoort een zichtbare uitkomst op die tweede tik te hebben."

## Controles

- `npx tsc -p tsconfig.app.json --noEmit`: groen.
- `npm run lint`: groen, een bestaande waarschuwing in `LegFatigueCard.tsx`.
- `npx vitest run`: 10851 tests groen.
- `npm run build`: groen.
- `npm run kennisindex:vergelijk`: geen verschil.
- Proefmerge: de branch als geheel botst met main omdat `claude/nacht` er nog onder zit. De drie eigen commits op `origin/main` (09c716d) gezet: een conflict, `docs/kennisindex/README.md`, weg na `npm run kennisindex`. Daarna tsc groen en `npx vitest run src/state src/components src/storage/planGolden.test.ts` groen (633 tests).
- Niet gedaan: `npm run kaart:vergelijk` liep langer dan tien minuten en was niet klaar bij het schrijven; geen doorloop in een browser (Lookout).

## Proeftests

Zet dit als `src/state/wardenProef.test.ts`, draai `npx vitest run src/state/wardenProef.test.ts --disable-console-intercept`. Alle zestien slagen; ze leggen het gedrag vast, ook het gedrag van M1 en M2. Na het herstel horen de verwachtingen bij P6 (`second` is niet meer `failed` met amber) en T1 (een melding op de tweede tik) om te gaan. Niet voor main.

Gemeten uitvoer:

```
P6 tweede poging: failed {"text":"Opslaan lukte niet. Je invulling staat er nog; probeer het opnieuw.","warn":true} knop uit: false
P6 na landen: concept undefined zin tweede scherm {"text":"Opslaan lukte niet. Je invulling staat er nog; probeer het opnieuw.","warn":true} bovenin 0
P7 concept b na landen eerste: undefined bovenin: 0
P8 tweede scherm: {"text":"Opslaan lukte niet. Kijk eerst in je logboek of hij er toch staat; je invulling staat er nog.","warn":true} knop uit: false concept: undefined
P8 derde tik: saved logs: 2
P9 saved saved
P10 twee tabbladen: saved saved logs: 2
T1 tweede tik: failed meldingen: 0 bovenin via logSession: 0
T3 twee tabbladen: saved saved logs: 2
```

```ts
// Warden: proeftests oud trainingsscherm (niet voor main). Alles nagemaakt.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlannedSessionsRepo, SessionLogsRepo, wipeAllData } from '../storage/database';
import { runLogSession, type LogSessionDeps, type LogSessionOpts } from './logSession';
import { saveOnLogger, tickOff, logOrAlready, resetFailedNotes, FORM_SAVE_NOTE, LOG_STILL_RUNNING_NOTE, type LoggerSaveUi, type ShownSaveNote } from './logSave';
import { submitLog } from '../components/logForm/howDidItGo';
import { describeWriteError, TICK_OFF_STILL_RUNNING } from '../storage/storageError';
import type { LogSessionInput } from './appDataTypes';

const planned = { id: 'p1', templateId: 'tpl_rest', scheduledDate: '2026-11-10', weekStartDate: '2026-11-09', status: 'planned' as const, order: 0 };
const forPlanned: LogSessionInput = { templateId: 'tpl_rest', type: 'recovery', variant: 'full', durationMinutes: 30, plannedSessionId: 'p1' };
const loose: LogSessionInput = { templateId: 'tpl_cycling', type: 'cardio', variant: 'full', durationMinutes: 45, completedDate: '2026-11-10' };

let general: unknown[] = [];
// Een tabblad: eigen loggingInFlight, dezelfde opslag.
function tab() {
  const deps: LogSessionDeps = {
    settings: {} as LogSessionDeps['settings'],
    loggingInFlight: { current: new Set<string>() },
    reportStorageError: (err) => general.push(err),
    refresh: async () => undefined,
    announceSaved: () => undefined,
  };
  return (input: LogSessionInput, opts?: LogSessionOpts) => runLogSession(input, opts, deps);
}
// Het concept in sessionStorage: een sleutel per training, gedeeld door elk scherm dat hem opent.
const drafts = new Map<string, string>();
function screen(key: string, over: Partial<LoggerSaveUi> = {}) {
  const seen = { notes: [] as (ShownSaveNote | null)[], closed: 0, busy: [] as boolean[], mounted: true, showing: true };
  const ui: LoggerSaveUi = {
    loose: false, mounted: () => seen.mounted, showing: () => seen.showing,
    busy: (on) => { seen.busy.push(on); }, clearDraft: () => { drafts.delete(key); },
    report: (err) => general.push(err),
    apply: (next) => { if (next.close) seen.closed += 1; else seen.notes.push(next.note); },
    limitMs: 20, ...over,
  };
  return { ui, seen };
}
function heldPut() {
  const real = SessionLogsRepo.put.bind(SessionLogsRepo);
  let go!: (fail?: Error) => void;
  const hold = new Promise<Error | undefined>((resolve) => (go = resolve));
  vi.spyOn(SessionLogsRepo, 'put').mockImplementation(async (log) => { const fail = await hold; if (fail) throw fail; return real(log); });
  return go;
}
const settle = () => new Promise((r) => setTimeout(r, 80));

beforeEach(async () => { await wipeAllData(); general = []; drafts.clear(); resetFailedNotes(); });
afterEach(() => { vi.restoreAllMocks(); });

describe('saveOnLogger', () => {
  it('P1 in beeld, gelukt: een log, concept weg, dicht', async () => {
    await PlannedSessionsRepo.put(planned);
    drafts.set('p1', 'a');
    const { ui, seen } = screen('p1');
    expect(await saveOnLogger(tab(), forPlanned, ui)).toBe('saved');
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
    expect(drafts.has('p1')).toBe(false);
    expect(seen.closed).toBe(1);
  });

  it('P2 leesfout bij het kijken: mislukt, niets weg, geen log', async () => {
    await PlannedSessionsRepo.put(planned);
    drafts.set('p1', 'a');
    vi.spyOn(SessionLogsRepo, 'getAll').mockRejectedValue(new Error('lezen kapot'));
    const { ui, seen } = screen('p1');
    expect(await saveOnLogger(tab(), forPlanned, ui)).toBe('failed');
    expect(drafts.get('p1')).toBe('a');
    expect(seen.closed).toBe(0);
    expect(seen.notes.at(-1)?.warn).toBe(true);
    expect(general).toEqual([]);
  });

  it('P3 time-out, Sluiten, dan nooit een antwoord: concept blijft, niets gesloten of gewist', async () => {
    await PlannedSessionsRepo.put(planned);
    drafts.set('p1', 'a');
    heldPut();
    const { ui, seen } = screen('p1');
    expect(await saveOnLogger(tab(), forPlanned, ui)).toBe('slow');
    seen.showing = false; seen.mounted = false;
    await settle();
    expect(drafts.get('p1')).toBe('a');
    expect(await SessionLogsRepo.getAll()).toHaveLength(0);
    expect(seen.busy.at(-1)).toBe(true);
  });

  it('P4 weg, laat ja: een log, concept weg, scherm niet aangeraakt, niets bovenin', async () => {
    await PlannedSessionsRepo.put(planned);
    drafts.set('p1', 'a');
    const go = heldPut();
    const { ui, seen } = screen('p1');
    await saveOnLogger(tab(), forPlanned, ui);
    const before = seen.notes.length;
    seen.mounted = false;
    go();
    await settle();
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
    expect(drafts.has('p1')).toBe(false);
    expect(seen.notes.length).toBe(before);
    expect(seen.closed).toBe(0);
    expect(general).toEqual([]);
  });

  it('P5 weg, laat nee: concept blijft, fout bovenin, geen log', async () => {
    await PlannedSessionsRepo.put(planned);
    drafts.set('p1', 'a');
    const go = heldPut();
    const { ui, seen } = screen('p1');
    await saveOnLogger(tab(), forPlanned, ui);
    seen.mounted = false;
    go(new Error('kapot'));
    await settle();
    expect(drafts.get('p1')).toBe('a');
    expect(general).toHaveLength(1);
    expect(await SessionLogsRepo.getAll()).toHaveLength(0);
  });

  it('P6 gepland, scherm opnieuw open, tweede poging terwijl de eerste hangt: een log; WAT ZEGT HET TWEEDE SCHERM', async () => {
    await PlannedSessionsRepo.put(planned);
    drafts.set('p1', 'a');
    const go = heldPut();
    const logSession = tab();
    const one = screen('p1');
    expect(await saveOnLogger(logSession, forPlanned, one.ui)).toBe('slow');
    one.seen.mounted = false;
    // Opnieuw open: het concept is teruggelezen en aangepast.
    drafts.set('p1', 'b');
    const two = screen('p1');
    const second = await saveOnLogger(logSession, { ...forPlanned, durationMinutes: 50 }, two.ui);
    console.log('P6 tweede poging:', second, JSON.stringify(two.seen.notes.at(-1)), 'knop uit:', two.seen.busy.at(-1));
    expect(await SessionLogsRepo.getAll()).toHaveLength(0);
    go();
    await settle();
    const logs = await SessionLogsRepo.getAll();
    expect(logs).toHaveLength(1);
    expect(logs[0].durationMinutes).toBe(30);
    console.log('P6 na landen: concept', drafts.get('p1'), 'zin tweede scherm', JSON.stringify(two.seen.notes.at(-1)), 'bovenin', general.length);
    // Derde tik op het tweede scherm: stond er al, geen tweede log.
    expect(await saveOnLogger(logSession, { ...forPlanned, durationMinutes: 50 }, two.ui)).toBe('already');
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
    // Vastgelegd gedrag (bevinding M1): de tweede poging zegt amber "lukte niet, probeer het opnieuw" terwijl de eerste nog loopt.
    expect(second).toBe('failed');
  });

  it('P7 los, opnieuw open met andere invulling, tweede scherm ook weg: de tweede invulling', async () => {
    drafts.set('los', 'a');
    const go = heldPut();
    const logSession = tab();
    const one = screen('los', { loose: true });
    expect(await saveOnLogger(logSession, loose, one.ui)).toBe('slow');
    expect(one.seen.notes.at(-1)?.text).toBe(FORM_SAVE_NOTE.slowLoose);
    one.seen.mounted = false;
    drafts.set('los', 'b');
    const two = screen('los', { loose: true });
    expect(await saveOnLogger(logSession, { ...loose, durationMinutes: 60 }, two.ui)).toBe('slow');
    two.seen.mounted = false;
    go();
    await settle();
    const logs = await SessionLogsRepo.getAll();
    expect(logs).toHaveLength(1);
    expect(logs[0].durationMinutes).toBe(45);
    console.log('P7 concept b na landen eerste:', drafts.get('los'), 'bovenin:', general.length);
  });

  it('P8 los, tweede scherm in beeld als de eerste landt: zin, knop, en een derde tik', async () => {
    drafts.set('los', 'a');
    const go = heldPut();
    const logSession = tab();
    const one = screen('los', { loose: true });
    await saveOnLogger(logSession, loose, one.ui);
    one.seen.mounted = false;
    drafts.set('los', 'b');
    const two = screen('los', { loose: true });
    await saveOnLogger(logSession, { ...loose, durationMinutes: 60 }, two.ui);
    go();
    await settle();
    console.log('P8 tweede scherm:', JSON.stringify(two.seen.notes.at(-1)), 'knop uit:', two.seen.busy.at(-1), 'concept:', drafts.get('los'));
    vi.restoreAllMocks();
    const third = await saveOnLogger(logSession, { ...loose, durationMinutes: 60 }, two.ui);
    console.log('P8 derde tik:', third, 'logs:', (await SessionLogsRepo.getAll()).length);
  });

  it('P9 dubbele tik met dezelfde invulling (los): een log', async () => {
    const logSession = tab();
    const a = screen('los', { loose: true });
    const b = screen('los', { loose: true });
    const [x, y] = await Promise.all([saveOnLogger(logSession, loose, a.ui), saveOnLogger(logSession, loose, b.ui)]);
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
    console.log('P9', x, y);
  });

  it('P10 twee tabbladen, zelfde geplande training, tegelijk', async () => {
    await PlannedSessionsRepo.put(planned);
    const a = screen('p1'); const b = screen('p1');
    const [x, y] = await Promise.all([saveOnLogger(tab(), forPlanned, a.ui), saveOnLogger(tab(), forPlanned, b.ui)]);
    console.log('P10 twee tabbladen:', x, y, 'logs:', (await SessionLogsRepo.getAll()).length);
  });
});

describe('tickOff', () => {
  it('T1 na de grens, tweede tik terwijl de eerste loopt: WAT ZIE JE', async () => {
    await PlannedSessionsRepo.put(planned);
    const go = heldPut();
    const logSession = tab();
    const report: unknown[] = [];
    expect(await tickOff(logSession, forPlanned, (e) => report.push(e), 20)).toBe('slow');
    expect(report.map(describeWriteError)).toEqual([TICK_OFF_STILL_RUNNING]);
    // De eigenaar veegt de melding weg en vinkt nog eens af, zoals de melding zegt.
    report.length = 0;
    const second = await tickOff(logSession, forPlanned, (e) => report.push(e), 20);
    console.log('T1 tweede tik:', second, 'meldingen:', report.length, 'bovenin via logSession:', general.length);
    expect(second).toBe('failed');
    expect(report).toHaveLength(0);
    expect(general).toHaveLength(0);
    go();
    await settle();
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
    // Laat gelukt: niemand trekt de melding in.
    expect(report).toHaveLength(0);
  });

  it('T2 na de grens, laat nee: de schrijffout komt bovenin over de wachtmelding', async () => {
    await PlannedSessionsRepo.put(planned);
    const go = heldPut();
    const top: unknown[] = [];
    general = top;
    expect(await tickOff(tab(), forPlanned, (e) => top.push(e), 20)).toBe('slow');
    go(new Error('kapot'));
    await settle();
    expect(top.map(describeWriteError)).toHaveLength(2);
    expect(describeWriteError(top[1])).not.toBe(TICK_OFF_STILL_RUNNING);
    expect(await SessionLogsRepo.getAll()).toHaveLength(0);
  });

  it('T3 twee tabbladen tegelijk afvinken', async () => {
    await PlannedSessionsRepo.put(planned);
    const [x, y] = await Promise.all([tickOff(tab(), forPlanned, () => undefined), tickOff(tab(), forPlanned, () => undefined)]);
    console.log('T3 twee tabbladen:', x, y, 'logs:', (await SessionLogsRepo.getAll()).length);
  });

  it('T4 leesfout: melding bovenin, geen log', async () => {
    await PlannedSessionsRepo.put(planned);
    vi.spyOn(SessionLogsRepo, 'getAll').mockRejectedValue(new Error('lezen kapot'));
    expect(await tickOff(tab(), forPlanned, (e) => general.push(e))).toBe('failed');
    expect(general).toHaveLength(1);
  });
});

describe('Hoe ging het?', () => {
  it('H1 stond er al: onAlready, niet onFailed, geen tweede log', async () => {
    await PlannedSessionsRepo.put(planned);
    const logSession = tab();
    await logSession(forPlanned);
    const calls: string[] = [];
    const r = await submitLog({ busy: { current: false }, save: () => logOrAlready(logSession, forPlanned, () => undefined), onSlow: () => calls.push('slow'), onSaved: () => calls.push('saved'), onAlready: () => calls.push('already'), onFailed: () => calls.push('failed') });
    expect(r).toBe('already');
    expect(calls).toEqual(['already']);
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
  });
  it('H2 eerdere poging loopt nog (nee zonder log): mislukt, nooit al gedaan', async () => {
    await PlannedSessionsRepo.put(planned);
    const go = heldPut();
    const logSession = tab();
    void logSession(forPlanned);
    await new Promise((r) => setTimeout(r, 10));
    expect(await logOrAlready(logSession, forPlanned, () => undefined)).toBe(false);
    go(); await settle();
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
  });
});
void LOG_STILL_RUNNING_NOTE;
```

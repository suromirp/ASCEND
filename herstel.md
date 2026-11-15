# Warden: herstelopdracht back-up, de drie mag-punten

Branch `claude/backup-mag`, commit 3d910e3. Bekeken: alleen die ene commit. De andere vijf back-upcommits op de branch (9fe581a tot en met 0dcb233) staan al in main via 8cce377; de rest van de branch is een oude basis.

Oordeel: AKKOORD. Geen blokkerend punt en geen punt dat voor deze commit moet.

## Wat naar main moet

Alleen 3d910e3, als cherry-pick op origin/main (09c716d). De proefmerge is schoon, zonder conflict, en raakt drie bestanden: `src/integrations/backupFolder.ts`, `src/storage/autoBackup.test.ts`, `src/storage/manualBackup.test.ts`.

Geen squash van de boom van de branch. De basis is bf7acc7; `git diff origin/main HEAD` laat 135 bestanden zien met 3165 regels eraf, waaronder Week telt zoals hij toont, Routes op reis en kracht uit. Een `commit-tree HEAD^{tree}` zou dat allemaal terugdraaien.

## Controles op de proefmerge (origin/main plus 3d910e3)

- `npx tsc -p tsconfig.app.json --noEmit`: groen.
- `npm run lint`: groen.
- `npx vitest run`: groen, 733 bestanden en 10909 tests, de 16 proeftests meegeteld.
- `npm run build`: groen.
- De vijf back-uptestbestanden los: 116 tests groen. De 16 proeftests hieronder: groen.
- Niet gedraaid: Chromium en een echte telefoon. De wijziging is niet zichtbaar in de app.

Eerlijk erbij: de eerste volle ronde gaf een rode test, `src/engine/leavePlanAround.test.ts` (a long plan up to the goal day stays fast: 4247 ms tegen een grens van 4000). Op dat moment draaide er een tweede testronde naast. Los en in een tweede volle ronde is hij groen. Hij heeft niets met de back-up te maken, maar de grens is krap op een drukke machine.

## Wat klopt

- De vorm `^\.[a-z0-9]{10,}\.(tmp|old)$` dekt elk id dat de app maakt: met de hand en routes 12 tekens, automatisch 14. Zesduizend nagemaakte ids, de kortste nog boven de tien (T1). Een rest van een echte poging gaat dus nog steeds weg (T1, A7).
- Wat iemand zelf hernoemde blijft: `.kopie.old`, `.old`, `.2025.old`, hoofdletters, spaties, een andere uitgang, een andere naam ervoor (T2).
- Een leesfout haalt nooit iets weg: niet te lezen na schrijven laat het bestand heel staan, met de hand (H2, H4) en automatisch (A3). Bij A3 staat het oude bestand nog opzij tot de volgende poging goed is nagekeken.
- Een kapotte opvolger kost nooit de back-up die er stond: het oude komt terug, ook als weghalen niet lukt (H3, A2, A4).
- Geen -2 bij een lege map als stat hapert (H1, A1). Een vreemd bestand blijft heel, ook bij een haperende stat (A6).
- De twee nieuwe tests in `autoBackup.test.ts` toetsen wat ze zeggen: twijfel na undo telt als staat er nog, en een naam die echt weg is wordt vergeten zodat een vreemd bestand later heel blijft.
- Geen opgeslagen vorm veranderd, geen tekst in de app veranderd, geen gedachtestreepjes, geen hex, geen persoonsgegevens. Het besluit `docs/beslissingen/2026-11-15-backup-eerste-keer.md` dekt dit; een nieuw besluit is niet nodig.

## Mag, bij deze commit

### G1. Een eigen woord van tien kleine letters of cijfers telt nog als rest

`src/integrations/backupFolder.ts:97`. `<naam>.backup2025.old` en `<naam>.reservekopie.old` gaan na een gelukte back-up op die naam nog steeds weg (T3). De kans is klein: het moet precies achter de naam van een back-up van die minuut of die dag staan.

Voorstel: geef het id een vast begin dat niemand typt, bijvoorbeeld `p-` gevolgd door tijd en willekeur, en laat de vorm daarop passen. Oude resten zonder dat begin blijven dan staan; dat is de veilige kant.

## Voor een volgende ronde (staat al op main, niet van deze commit)

### V1. Moet: automatisch, laat antwoord na de tijdsgrens geeft een -2 en een bestand dat nooit wordt opgeruimd

`src/storage/autoBackup.ts:281-287`. De schrijfactie loopt door na de grens van `withTimeout`. Landt het bestand daarna, dan staat het onder de naam van vandaag, maar niet in `halfWritten` en niet in `state.files`. De volgende poging ziet een bezette naam die niet eigen is en schrijft `-2`. Het eerste bestand staat in geen lijst en gaat dus nooit weg bij het opruimen van oude back-ups (A5).

Voorstel: bij een `TimeoutError` uit `target.write` de kandidaat in `halfWritten` zetten. De naam was vrij of eigen toen de poging begon, dus wat er later onder staat is van deze poging.

### V2. Mag: met de hand, opruimen zonder eigen grens

`src/storage/manualBackup.ts:111-112`. `keep` en `tidy` wachten zonder grens. Antwoordt `readdir` niet, dan zegt de app na twintig seconden dat het te lang duurde, terwijl het bestand er staat en is nagekeken (H6). Het automatische pad geeft beide vijf seconden.

Voorstel: dezelfde `withTimeout(..., 5_000).catch(() => undefined)` als in `autoBackup.ts:307-308`.

### V3. Mag: met de hand, het late antwoord is al binnen en je tikt opnieuw

`src/storage/manualBackup.ts:48-62`. Loopt de eerste poging nog, dan sluit de tweede tik aan en blijft het een bestand. Is de eerste al klaar na "duurde te lang", dan maakt een tik in dezelfde minuut een tweede bestand met -2 (H5).

Voorstel: onthoud de naam van een poging die klaar was nadat de wachter al was weggegaan, en geef die terug bij een tik in dezelfde minuut.

## Nieuwe valkuil voor `docs/werkbriefjes/koppelingen-en-data.md`

Voorgestelde regel: "Een tijdsgrens stopt de schrijfactie niet. Wat na de grens nog landt is van de app: onthoud de naam (`halfWritten`, `orphans`), anders krijgt de volgende poging een volgnummer en ruimt niemand het eerste bestand op."

## Proeftests

Bestand `src/storage/wardenBackupProef.test.ts` op de proefmerge. Het begin is regel 1 tot en met 119 van `src/storage/manualBackup.test.ts` (de nagebouwde map), zonder de import van `AutoBackupError` en met drie toevoegingen: in `mem` de velden `truncate: 0` en `readdirHangs: false`; in `writeFile` de regel `mem.files.set(path, mem.truncate > 0 && path.endsWith('.tmp') ? (mem.truncate--, data.slice(0, 10)) : data);`; in `readdir` vooraan `if (mem.readdirHangs) return new Promise(() => undefined);`. Daarna:

```ts
import { forgetManualBackupAttempts, saveManualBackup } from './manualBackup';
import { appBackupFolder } from '../integrations/backupFolder';
import { MetaRepo, PlannedSessionsRepo, wipeAllData } from './database';
import { forgetHalfWritten, runAutoBackupIfDue } from './autoBackup';
import type { PlannedSession } from '../models/training';

const NOW = new Date(2026, 10, 2, 14, 30);
const NAME = 'ascend-2026-11-02-14u30.ascend-backup.json';
const TEXT = JSON.stringify({ backupSchemaVersion: 5, payload: {} });
const fast = { now: NOW, verifyPauseMs: 0 };
const names = () => [...mem.files.keys()].filter((k) => k.startsWith('ASCEND/')).sort();
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const session: PlannedSession = { id: 'ps_a', templateId: 'tpl_easy_run', scheduledDate: '2026-11-03', weekStartDate: '2026-11-02', status: 'planned', order: 0 };
const MONDAY = new Date(2026, 10, 2, 8, 0);
const later = (h: number) => new Date(MONDAY.getTime() + h * 3_600_000);
const TODAY = 'ASCEND/ascend-2026-11-02.ascend-backup.json';
const TODAY2 = 'ASCEND/ascend-2026-11-02-2.ascend-backup.json';
const good = (p: string) => typeof (JSON.parse(mem.files.get(p)!) as { backupSchemaVersion?: unknown }).backupSchemaVersion === 'number';

beforeEach(async () => {
  forgetManualBackupAttempts();
  forgetHalfWritten();
  mem.files.clear();
  mem.permission = 'granted';
  mem.hang = false;
  mem.failWrite = false;
  mem.hidden.clear();
  mem.noDir = false;
  mem.renameFails = 0;
  mem.renameCopiesThenFails = 0;
  mem.statMisses = 0;
  mem.deleteFails = false;
  mem.writeDelayMs = 0;
  mem.writes = 0;
  mem.statErrors = 0;
  mem.readErrors = 0;
  mem.renameWorksThenFails = 0;
  mem.truncate = 0;
  mem.readdirHangs = false;
  await wipeAllData();
  await PlannedSessionsRepo.put(session);
});

describe('Warden proef: tidy op de vorm van een poging (3d910e3)', () => {
  it('T1 elke echte poging-id (hand, automatisch, route) valt onder de vorm: de rest gaat weg', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 3000; i++) {
      ids.push(`${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`);
      ids.push(`${NOW.getTime().toString(36)}${Math.random().toString(36).slice(2, 8)}`);
    }
    expect(Math.min(...ids.map((i) => i.length))).toBeGreaterThanOrEqual(10);
    for (const id of ids.slice(0, 200)) {
      mem.files.set(`ASCEND/${NAME}.${id}.tmp`, 'half');
      mem.files.set(`ASCEND/${NAME}.${id}.old`, 'opzij');
    }
    expect(await saveManualBackup(appBackupFolder()!, TEXT, fast)).toEqual({ name: NAME });
    expect(names()).toEqual([`ASCEND/${NAME}`]);
  });

  it('T2 wat iemand zelf hernoemde blijft: korte woorden, hoofdletters, spaties, andere uitgang, andere naam', async () => {
    const keep = [`${NAME}.kopie.old`, `${NAME}.old`, `${NAME}.2025.old`, `${NAME}.Reservekopie1.old`, `${NAME}.mijn kopie 2025.old`, `${NAME}.reservekopie.bak`, `${NAME}.reservekopie.old.txt`, `x${NAME}.mi0abc12x9k3.old`, 'ascend-2026-11-02-14u31.ascend-backup.json.mi0abc12x9k3.old'];
    for (const k of keep) mem.files.set(`ASCEND/${k}`, 'van jou');
    expect(await saveManualBackup(appBackupFolder()!, TEXT, fast)).toEqual({ name: NAME });
    expect(names()).toEqual([NAME, ...keep].map((k) => `ASCEND/${k}`).sort());
  });

  it('T3 (mag) een eigen woord van tien kleine letters of cijfers lijkt nog steeds op een poging en gaat weg', async () => {
    mem.files.set(`ASCEND/${NAME}.backup2025.old`, 'van jou');
    mem.files.set(`ASCEND/${NAME}.reservekopie.old`, 'van jou');
    expect(await saveManualBackup(appBackupFolder()!, TEXT, fast)).toEqual({ name: NAME });
    // Zo is het nu. Met een vast voorvoegsel in het id (bijvoorbeeld "p") zou dit blijven staan.
    expect(names()).toEqual([`ASCEND/${NAME}`]);
  });
});

describe('Warden proef: Back-up maken met de hand, elk pad', () => {
  it('H1 lege map, stat hapert: de eerste naam, geen -2 en geen rest', async () => {
    mem.statErrors = 1;
    expect(await saveManualBackup(appBackupFolder()!, TEXT, fast)).toEqual({ name: NAME });
    expect(names()).toEqual([`ASCEND/${NAME}`]);
  });

  it('H2 niet te lezen na schrijven: het bestand blijft heel staan; de tweede poging vervangt het, één bestand, geen rest', async () => {
    const folder = appBackupFolder()!;
    mem.readErrors = 3;
    await expect(saveManualBackup(folder, TEXT, fast)).rejects.toMatchObject({ step: 'verify' });
    expect(names()).toEqual([`ASCEND/${NAME}`]);
    expect(mem.files.get(`ASCEND/${NAME}`)).toBe(TEXT);
    expect(await saveManualBackup(folder, TEXT, fast)).toEqual({ name: NAME });
    expect(names()).toEqual([`ASCEND/${NAME}`]);
  });

  it('H3 tweede poging komt afgekapt aan op een onthouden naam: het eerdere hele bestand komt terug, geen rest', async () => {
    const folder = appBackupFolder()!;
    mem.readErrors = 3;
    await expect(saveManualBackup(folder, TEXT, fast)).rejects.toMatchObject({ step: 'verify' });
    mem.truncate = 1;
    await expect(saveManualBackup(folder, TEXT, fast)).rejects.toMatchObject({ step: 'verify' });
    expect(names()).toEqual([`ASCEND/${NAME}`]);
    expect(mem.files.get(`ASCEND/${NAME}`)).toBe(TEXT);
    // Derde poging: gewoon goed, nog steeds één bestand.
    expect(await saveManualBackup(folder, TEXT, fast)).toEqual({ name: NAME });
    expect(names()).toEqual([`ASCEND/${NAME}`]);
  });

  it('H4 tweede poging niet te lezen op een onthouden naam: er staat altijd minstens één heel bestand, en na de derde precies één', async () => {
    const folder = appBackupFolder()!;
    mem.readErrors = 3;
    await expect(saveManualBackup(folder, TEXT, fast)).rejects.toMatchObject({ step: 'verify' });
    mem.readErrors = 3;
    await expect(saveManualBackup(folder, TEXT, fast)).rejects.toMatchObject({ step: 'verify' });
    expect(names().filter((n) => mem.files.get(n) === TEXT).length).toBeGreaterThanOrEqual(1);
    expect(names().filter((n) => n.endsWith('.json'))).toEqual([`ASCEND/${NAME}`]);
    expect(await saveManualBackup(folder, TEXT, fast)).toEqual({ name: NAME });
    expect(names()).toEqual([`ASCEND/${NAME}`]);
  });

  it('H5 (bestaand op main) het late antwoord is al binnen, daarna een tik in dezelfde minuut: een tweede bestand met -2', async () => {
    mem.writeDelayMs = 60;
    const folder = appBackupFolder()!;
    await expect(saveManualBackup(folder, TEXT, { ...fast, limitMs: 10 })).rejects.toMatchObject({ reason: 'timeout' });
    await wait(120);
    expect(await saveManualBackup(folder, TEXT, fast)).toEqual({ name: `ascend-2026-11-02-14u30-2.ascend-backup.json` });
  });

  it('H6 (bestaand op main) opruimen antwoordt niet: het bestand staat er en is nagekeken, en toch "duurde te lang"', async () => {
    mem.readdirHangs = true;
    const folder = appBackupFolder()!;
    await expect(saveManualBackup(folder, TEXT, { ...fast, limitMs: 50 })).rejects.toMatchObject({ reason: 'timeout' });
    expect(mem.files.get(`ASCEND/${NAME}`)).toBe(TEXT);
  });
});

describe('Warden proef: automatische back-up op de echte app-map', () => {
  const run = (now: Date, extra: object = {}) => runAutoBackupIfDue({ now, target: appBackupFolder()!, verifyPauseMs: 0, onSaved: () => undefined, ...extra });

  it('A1 lege map, stat hapert: de naam van vandaag, geen -2', async () => {
    mem.statErrors = 1;
    expect(await run(MONDAY)).toBe('saved');
    expect(names()).toEqual([TODAY]);
  });

  it('A2 eigen bestand van vandaag, de opvolger komt afgekapt aan: het goede komt terug, geen -2 en geen rest', async () => {
    expect(await run(MONDAY)).toBe('saved');
    const first = mem.files.get(TODAY)!;
    mem.truncate = 1;
    expect(await run(later(2))).toBe('failed');
    expect(names()).toEqual([TODAY]);
    expect(mem.files.get(TODAY)).toBe(first);
    expect(await run(later(4))).toBe('saved');
    expect(names()).toEqual([TODAY]);
    expect(good(TODAY)).toBe(true);
  });

  it('A3 eigen bestand van vandaag, de opvolger is niet te lezen: niets gaat weg, en na de volgende poging precies één heel bestand', async () => {
    expect(await run(MONDAY)).toBe('saved');
    const first = mem.files.get(TODAY)!;
    mem.readErrors = 3;
    expect(await run(later(2))).toBe('failed');
    // Het nieuwe staat onder de naam, het oude staat nog opzij.
    expect(names().length).toBe(2);
    expect(names().some((n) => n.endsWith('.old') && mem.files.get(n) === first)).toBe(true);
    expect(await run(later(4))).toBe('saved');
    expect(names()).toEqual([TODAY]);
    expect(good(TODAY)).toBe(true);
  });

  it('A4 kapot en weghalen lukt niet: het oude komt toch terug onder de naam', async () => {
    expect(await run(MONDAY)).toBe('saved');
    const first = mem.files.get(TODAY)!;
    mem.truncate = 1;
    mem.deleteFails = true;
    expect(await run(later(2))).toBe('failed');
    mem.deleteFails = false;
    expect(mem.files.get(TODAY)).toBe(first);
    expect(names()).toEqual([TODAY]);
  });

  it('A5 (bestaand op main) laat antwoord na de tijdsgrens: de volgende poging neemt een volgnummer', async () => {
    mem.writeDelayMs = 60;
    expect(await run(MONDAY, { timeoutMs: 10 })).toBe('failed');
    await wait(150);
    mem.writeDelayMs = 0;
    const after = names();
    expect(await run(later(2))).toBe('saved');
    // Vastgelegd zoals het nu is; zie herstel.md.
    expect(after).toEqual([TODAY]);
    expect(names()).toEqual([TODAY2, TODAY].sort());
    // Het eerste bestand staat niet in de lijst van eigen bestanden en wordt dus nooit opgeruimd.
    expect((await MetaRepo.get('autoBackupState') as { files: string[] }).files).toEqual(['ascend-2026-11-02-2.ascend-backup.json']);
  });

  it('A6 een vreemd bestand met de naam van vandaag blijft heel, ook als stat hapert', async () => {
    mem.files.set(TODAY, 'van jou');
    mem.statErrors = 2;
    expect(await run(MONDAY)).toBe('saved');
    expect(mem.files.get(TODAY)).toBe('van jou');
    expect(names()).toEqual([TODAY2, TODAY].sort());
  });

  it('A7 resten van een oude poging op de naam van vandaag gaan weg na een gelukte back-up, een eigen kopie blijft', async () => {
    mem.files.set(`${TODAY}.mi0abc12x9k3ab.old`, 'opzij');
    mem.files.set(`${TODAY}.kopie.old`, 'van jou');
    expect(await run(MONDAY)).toBe('saved');
    expect(names()).toEqual([TODAY, `${TODAY}.kopie.old`].sort());
  });
});
```

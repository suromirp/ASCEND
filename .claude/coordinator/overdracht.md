# Overdracht coördinator ASCEND

Bijgewerkt: 21 november 2026 door coördinator session_01LnDpSmhQECnxdG9gnj4X2S. Vaste vorm, onder 10 KB: stand, wat aan de sessie hangt, open vragen, besluiten met reden. Oudere standen: git-geschiedenis.

## Zuinige stand (21 november 00:10, lees dit eerst)

- Eigenaar via de chat ASCEND: zuinige stand, vastgelegd in skill `werkverdeling` (bovenaan) en besluit `2026-11-21-zuinige-stand.md`, op main 68eca8b1. Kort: Sonnet voor bouwer en Warden, Opus alleen planner/opslag/migraties/historie, nooit Fable tenzij de eigenaar vraagt; poorten naar risico; één Warden en één Lookout per bouwmoment; bouwen alleen ma/wo/vr; Mag naar de backlog; wissel rond 150k of na elke bouwronde; geen wakeups zonder reden.
- Toegepast op deze ronde: geen Pathfinder (geen nieuw scherm of flow); één Lookout op Haiku over I-94 en I-95; Mag-punten van Warden I-94/96 die nog niet gestuurd waren gaan naar de backlog. Het Mag-herstel voor StepProposalNotice was al gestuurd voor de zuinige stand; laten afmaken.
- Na de squash van deze bundel: wissel (ronde klaar).
- Aanvulling (mandaat eigenaar, main e7f61702): poortregel naar risico in CLAUDE.md en besluit; CLAUDE.md 15 naar 8 KB; Werkkaart-taak trig_01JoRN6XzHJ17frpcWQAdEzB van elk uur naar 8:20, 13:20, 20:20; uit werkverdeling weg: Fable-standaard, effort high, Wachter, zelfreview, check-in. Worktree wt-zuinig in de scratchpad opruimen.

## Stand 20 november avond, ronde 2

- 18:00 Amsterdam: nieuwe coördinator session_01LnDpSmhQECnxdG9gnj4X2S draait. Ronde gestart:
  - I-93 en I-97 (opslag, back-up import): losse chat session_01LnDpSnhGZjC8AaNw6gB9My op Fable, branch claude/backup-import.
  - I-95 (koppelvoorstel noemt verschuiving testloop): helper Sherpa op Fable, branch claude/koppel-testloop.
  - I-94 en I-96 (ijksetkaart Akkoord, tests en uitleg niet goed gemeten): helper Sherpa op Sonnet, branch claude/klein-94-96.
- 21 november 23:55: limiet per vijf uur (Fable en Sonnet) stopte drie helpers op 20 november rond 18:40; de werker herstartte. Back-up import: alle controles groen door coördinator (11811 tests, kaart gelijk). I-95 klaar op b1bbd8a1. Drie helpers hervat (twee Wardens, Sherpa I-94/96).
- 21 november: Warden back-up import en Warden I-95: geen Moet. Back-up: Mag-punten in de docs door coördinator gedaan (fdc93a33 op claude/backup-import); Mag 5 (wedloop met dezelfde waarde) blijft liggen. Losse chat back-up (session_01LnDpSnhGZjC8AaNw6gB9My) archiveren na de squash. Worktrees wt-backup en wt-nacht in de scratchpad opruimen.
- I-95: herstelronde loopt bij dezelfde Sherpa (drie standen bezig/zin/niets, knoppen uit tot 4 s, valkuil, test weekgrens, "van vandaag", zin in besluit).
- I-94/96 klaar op e5646a90 (Akkoord als SecondaryButton met 18% mint, want Afronden is al de gevulde mint). Warden Sonnet loopt. Screenshot bekeken: leesbaar.
- Daarna: één Lookout (Haiku) voor I-94 en I-95; één squash naar main voor de bundel I-93 tot I-97.
- Nieuw voor de Inbox (I-98 tot I-101): import filtert `manual:`, `garmin:`, `macrofactor:` nog (alleen filteren wat `pruneWellness` raakt, `backupApply.ts:140-142`); koppelvoorstel zegt niet dat een loop later in de week zijn korte test verliest (`shortTestSessionIds`, sinds I-91); gedeelde hook `useShortTestStreams`; strengere variant: zonder bijpassende lijst het paar weghalen.
- Geleerd: geef elke helper een eigen mapnaam in de scratchpad. Een Warden zette de hoofdmap /home/user/ascend op een andere branch (detached): zeg in elke opdracht "geen checkout in de hoofdmap, gebruik git diff of git show". `src/state/logSave.test.ts` wankelde één keer onder volle last; bij de laatste controle voor main op letten.
- Gemeld aan de eigenaar: 20 november live I-68, I-83, I-92, I-84, I-91, weekkamzin en twee werkwijzebesluiten; na de wissel nog niets live. Vorige coördinator gearchiveerd ($46).

## Vaste afspraken

- Eigenaar 16 november 09:20 "Ja" op: eerlijke Graphify-proef met de koppeling (`graphify install`: hook en CLAUDE.md-regel), alleen op een proefbranch `claude/proef-graphify-3`, nooit op main. Dit is zijn eigen toestemming voor die instellingenwijziging op de proefbranch (zeg dat letterlijk in de opdracht aan de bouwer, met dit citaat). Start na de reset van de weeklimiet, zondag 22 november 18:00 Lisbon. Opzet: graaf één keer bouwen (kosten apart), drie echte taken van verschillende grootte uit de Inbox, elk met en zonder graaf op hetzelfde model, meten kosten, tijd, resultaat (Warden kort op beide); uitslag als aanvulling in `docs/onderzoek/Ponytail en Graphify.md` en aan de eigenaar. Eerdere proef was half (graaf binnen de meting, geen hook, één kleine taak); zeg dat eerlijk.

- Eigenaar 16 november 08:08: "Omdat je elke keer stopt terwijl bouwers al klaar zijn". Nooit stil wachten: zet bij elke wachtende bouwer of controle meteen een send_later van 15 minuten (get_session, git log) en ga zelf door; poorten en proefmerge parallel draaien, niet na elkaar.

- Stijl Jarvis met "meneer"; vragen apart onderaan onder **Vraag aan u**, advies voorop, wat er zonder antwoord gebeurt.
- Eigenaar 12:15: "ik vertrouw erop dat jij weet wat de beste aanpak is": zelf beslissen met het advies, keuzes hier vastleggen. Niet op hem wachten.
- Zonder sportschool (eigenaar, "Ja advies"): alleen wat de sportschool nodig heeft vervalt; een loop of wandeling die je niet deed telt als gemist.
- Elke afspraak meteen hier; elke verandering in vragen, stuk of live meteen in `eigenaar.md`.
- Werkwijze: klaar werk na de volle controles op `claude/nacht`; Warden (planner en opslag op Fable), Lookout en Pathfinder bij iets zichtbaars, eigen blik op de afdrukken; dan main via squash (`git commit-tree HEAD^{tree} -p origin/main`), daarna `npm run backlog:bij` en meecommitten op nacht, pushmelding, `eigenaar.md` Net live, Werkkaart extra ronde met create_trigger op session_01LnDpSktfMxYFgMMgDhw8Do (run_once_at een paar minuten vooruit), nooit fire_trigger: dat opent een lege chat zonder repo.
- Backlog: elk Inboxpunt heeft een code [I-n]; een bouwer zet `Klaar: I-n` in zijn commit; voor een start eerst `git log origin/main --grep "I-n"` en in de code kijken of het al gebouwd is (vandaag twee keer oud werk in de Inbox).
- Kennisindex: elk nieuw document in docs/ krijgt een regel in `docs/kennisindex/bronnen.json`, dan `npm run kennisindex`; na een proefmerge altijd `npm run kennisindex` opnieuw. Zet dat in elke bouwopdracht.
- Een Warden pusht zijn herstel als `herstel.md` op `warden/<onderwerp>-herstel`: zet dat in zijn eerste opdracht (achteraf vragen weigert hij). Bouwers melden zich niet: kijk met get_session; list_sessions children werkt, de tag-filter niet. list_events heb je niet: laat bevindingen in een bestand of in de samenvatting landen.
- Eigenaar 19:41: oude bouwers, coördinators en chats archiveren zodra ze klaar zijn. Niet aanraken: Werkkaart session_01LnDpSktfMxYFgMMgDhw8Do, de vastgezette chat ASCEND, ECHO en Dual Ubuntu (geen ASCEND-werk), en de coördinator van de middag zolang de Wachter daar draait.
- Helpers in de coördinator-chat: zeg in elke opdracht dat ze alleen in een eigen worktree werken en /home/user/ascend nooit van branch wisselen (een Pathfinder deed dat om 22:35).

## Werkwijze, geleerd

- De vastgezette chat "ASCEND" (session_013ZuQA6MkeoKDCxdu4uMmEd) stuurt opdrachten van de eigenaar door als geplande taak; daar start ook de wissel (create_trigger, naam "Wissel coördinator").
- Warden schrijft nooit bestanden: herstel naar de bouwer of zelf. Bij een squash botsen gegenereerde kennisindexbestanden: neem die van main en draai `npm run kennisindex`. claude/nacht loopt in code achter op main; bouwers takken af van origin/main; docs voor main maak je op een tak van origin/main.

- Twee branches die elk een instelling toevoegen botsen in `src/engine/__snapshots__/instellingen-foto.json`: kies een kant en maak hem opnieuw met `npx vitest run -u src/engine/settingsFoto.test.ts`.
- Draai `kaart:vergelijk` nooit midden in een merge-conflict.
- Een fix in foutafhandeling opent telkens een nieuwe naad: vraag elk pad vooraf (in beeld, weg, laat antwoord, tweede poging, automatisch). Vandaag: een leesfout mag nooit tot weghalen leiden.
- Uit het archief halen kan (unarchive_session), alleen voor een kleine herstelronde dezelfde dag; anders een verse bouwer.
- Een werkbriefje heeft hoogstens 45 regels. Lookout-poorten: noem een vrije poort.
- Wissel op lengte: bij ongeveer 250k tot 300k context of na een afgeronde bouwronde (besluit 2026-11-20-lange-chat-en-kosten.md).

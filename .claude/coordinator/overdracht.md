# Overdracht coördinator ASCEND

Bijgewerkt: 22 november 2026 door coördinator session_01LnDpSip9wpY6fuZXMm2yqw (opvolger van session_01LnDpSmhQECnxdG9gnj4X2S). Vaste vorm, onder 10 KB: stand, wat aan de sessie hangt, open vragen, besluiten met reden. Oudere standen: git-geschiedenis.

## Stand 22 november 00:55 (nieuwe coördinator)

- Coördinator nu session_01LnDpSip9wpY6fuZXMm2yqw, vastgezet door de chat ASCEND. Geen bouwers, geen open poorten. Weeklimiet staat op waarschuwing tot zondag 22 november 18:00 UTC: tot dan niets starten.
- Gepland: send_later zondag 18:10 Lisbon voor de Graphify-proef (zie Vaste afspraken). Bouwmoment maandag start vanzelf in de sessie Bouwmoment ASCEND.
- Vraag aan u in `eigenaar.md` leeggemaakt: I-79 (drempel en korte test) is op 17 en 18 november met het advies gebouwd (3651a77d, 5ecd92cd); routes wandelen, horlogetoets en Forge-concept staan sinds 15 november met het advies live. Besloten met het advies volgens CLAUDE.md; alles blijft instelbaar.
- Inbox gecontroleerd voor maandag: I-98 tot I-103 zijn nog niet gebouwd (git log en `backupApply.ts:140` filtert nog via filterRecovery).
- Worktree wt-zuinig stond in de scratchpad van de vorige coördinator; die container is niet de mijne, er is niets op te ruimen.

## Zuinige stand (21 november 00:10, lees dit eerst)

- Eigenaar via de chat ASCEND: zuinige stand, vastgelegd in skill `werkverdeling` (bovenaan) en besluit `2026-11-21-zuinige-stand.md`, op main 68eca8b1. Kort: Sonnet voor bouwer en Warden, Opus alleen planner/opslag/migraties/historie, nooit Fable tenzij de eigenaar vraagt; poorten naar risico; één Warden en één Lookout per bouwmoment; bouwen alleen ma/wo/vr; Mag naar de backlog; wissel rond 150k of na elke bouwronde; geen wakeups zonder reden.
- Toegepast op deze ronde: geen Pathfinder (geen nieuw scherm of flow); één Lookout op Haiku over I-94 en I-95; Mag-punten van Warden I-94/96 die nog niet gestuurd waren gaan naar de backlog. Het Mag-herstel voor StepProposalNotice was al gestuurd voor de zuinige stand; laten afmaken.
- Bundel is live; wissel via de chat ASCEND aangevraagd.
- Aanvulling (mandaat eigenaar, main e7f61702): poortregel naar risico in CLAUDE.md en besluit; CLAUDE.md 15 naar 8 KB; Werkkaart-taak trig_01JoRN6XzHJ17frpcWQAdEzB van elk uur naar 8:20, 13:20, 20:20; uit werkverdeling weg: Fable-standaard, effort high, Wachter, zelfreview, check-in. Worktree wt-zuinig in de scratchpad opruimen.

## Stand na ronde 2 (bundel I-93 tot I-97 live)

- Main 223614f0 (bundel, squash) en ec171b9f (backlog: I-93 tot I-97 onder Pas live, I-98 tot I-103 in de Inbox, hoogste code I-103). Alle controles groen: 11831 tests, kaart gelijk, kennisindex gelijk.
- Poorten gehaald: Warden back-up en I-95 (geen Moet), Warden I-94/96 (Sonnet, geen Moet), één Lookout (Sonnet in plaats van Haiku: de kit dekt de wachtstand van de koppelkaart niet) groen op 360/390/412, eigen blik op de afdrukken.
- Opgeruimd: losse chat back-up gearchiveerd, alle worktrees weg. Branches claude/backup-import, claude/koppel-testloop, claude/klein-94-96, claude/bundel-93-97 en claude/backlog-bij zijn gesquasht en mogen weg. Werkkaart-ronde gepland (trig_01Rf4bAHmxs26o8YtR4xpc2b), wissel aangevraagd (trig_015Bv75ndPBH2jZcjUcGajgT).
- Vangnet-taak trig_017XyDyhXCk5qFayfNhbYfeS: delete_trigger werd door de classifier geweigerd; de taak vuurde 23:16 UTC en is genegeerd. Gemeld aan de eigenaar.
- Volgende bouwmoment: maandag (zuinige stand: ma, wo, vr). Kandidaten: I-98 (opslag, Opus), I-102 (klein), I-99.
- Geleerd: geef elke helper een eigen mapnaam in de scratchpad en zeg "geen checkout in /home/user/ascend". `src/state/logSave.test.ts` wankelde één keer onder volle last.

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

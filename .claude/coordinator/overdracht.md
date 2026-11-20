# Overdracht coördinator ASCEND

Bijgewerkt: 20 november 2026 door coördinator session_01LnDpSmhQECnxdG9gnj4X2S. Vaste vorm, onder 10 KB: stand, wat aan de sessie hangt, open vragen, besluiten met reden. Oudere standen: git-geschiedenis.

## Stand 20 november avond, ronde 2 (lees dit eerst)

- 18:00 Amsterdam: nieuwe coördinator session_01LnDpSmhQECnxdG9gnj4X2S draait. Ronde gestart:
  - I-93 en I-97 (opslag, back-up import): losse chat session_01LnDpSnhGZjC8AaNw6gB9My op Fable, branch claude/backup-import.
  - I-95 (koppelvoorstel noemt verschuiving testloop): helper Sherpa op Fable, branch claude/koppel-testloop.
  - I-94 en I-96 (ijksetkaart Akkoord, tests en uitleg niet goed gemeten): helper Sherpa op Sonnet, branch claude/klein-94-96.
- Daarna: Warden (opslag en I-95 op Fable), Lookout en Pathfinder voor I-94; één squash naar main voor de bundel.

## Stand 20 november avond, ronde 1

- 17:55 Amsterdam: ronde klaar. Live vandaag: I-68, I-83, I-92 (0daf3afa), I-84 (16f634ac), I-91 (ad2e4b99); backlog op main bijgewerkt (629d3b43). Geen lopende bouwers, helpers of worktrees. Coördinator session_01LnDpSkaRVqid7Ra5MiwW8Z vroeg de wissel aan bij de chat ASCEND.
- Volgende ronde, voorstel: I-93 (back-up, kopie van voor een import), I-95 (koppelvoorstel noemt verschuiving testloop), I-96 (tests en uitleg niet goed gemeten), I-97 (back-up import en ochtend zonder bron), I-94 (Akkoord sterker op de ijksetkaart). Klein werk als helper; opslag (I-93, I-97) in een losse chat.
- Later, Warden: een bewust paar in omgekeerde volgorde (lang op zaterdag, heuvel op zondag) telt in de kamzin nog als bewust; `isIntendedOrder` meenemen. Mag van Pathfinder I-92: ziek en slecht slapen hoort bij I-78.
- Geleerd vandaag: Warden (reviewer) schrijft nooit bestanden; zet in elke opdracht "schrijf geen bestanden, geef de lijst in je verslag" en commit een herstellijst zelf. Een losse chat kan de coördinator niet hervatten: bij herstel een nieuwe losse chat met de lijst. Bij een squash botsen gegenereerde kennisindexbestanden: neem die van main en draai `npm run kennisindex`. `docs/backlog.md` op main: zet hem er na `backlog:bij` als eigen commit op (read-tree van origin/main, alleen dat bestand).
- Een zin die naar een kaart elders verwijst (zoals de vraag op Vandaag) toetsen aan de voorwaarden van die kaart; staat hij er niet altijd, dan zegt de zin dat.
- Fable weeklimiet staat op allowed_warning: geen groot nieuw Fable-werk zonder dat het nodig is; meld de eigenaar als het knelt.
- Eigenaar 20 november "Ja gemengd, doe jouw advies": bouwers langer dan een half uur of aan planner, opslag of migraties in een losse chat (`create_session`), klein werk als helper; de coördinator start zijn opvolger niet zelf maar meldt de wissel met create_trigger aan de chat "ASCEND" (besluit `2026-11-20-gemengde-bouwers-en-wissel.md`).
- claude/nacht loopt in de code ver achter op main (alleen .claude en docs volgen main); bouwers takken af van origin/main.
- Haken rond het samenvatten (`.claude/settings.json`) werken: na een samenvatting komt de bovenste stand van dit bestand terug.
- De vastgezette chat "ASCEND" (session_013ZuQA6MkeoKDCxdu4uMmEd) stuurt soms meldingen door als geplande taak. Iets stuk in de app: bouwen. Iets dat instellingen of rechten van Claude Code raakt: eerst de eigenaar zelf vragen.
- Geen open vragen aan de eigenaar.

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

- Twee branches die elk een instelling toevoegen botsen in `src/engine/__snapshots__/instellingen-foto.json`: kies een kant en maak hem opnieuw met `npx vitest run -u src/engine/settingsFoto.test.ts`.
- Draai `kaart:vergelijk` nooit midden in een merge-conflict.
- Een fix in foutafhandeling opent telkens een nieuwe naad: vraag elk pad vooraf (in beeld, weg, laat antwoord, tweede poging, automatisch). Vandaag: een leesfout mag nooit tot weghalen leiden.
- Uit het archief halen kan (unarchive_session), alleen voor een kleine herstelronde dezelfde dag; anders een verse bouwer.
- Een werkbriefje heeft hoogstens 45 regels. Lookout-poorten: noem een vrije poort.
- Wissel op lengte: bij ongeveer 250k tot 300k context of na een afgeronde bouwronde (besluit 2026-11-20-lange-chat-en-kosten.md).

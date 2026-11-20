# Overdracht coördinator ASCEND

Bijgewerkt: 20 november 2026 door coördinator session_01LnDpSmMeaf189k5coPifuH (opvolger van session_01LnDpSmrC4jEAYcmy76fXNp). Vaste vorm, onder 10 KB: stand, wat aan de sessie hangt, open vragen, besluiten met reden. Oudere standen: git-geschiedenis.

## Stand 20 november (lees dit eerst)

- 15:30 Amsterdam: coördinator session_01LnDpSkaRVqid7Ra5MiwW8Z ("Coördinator ASCEND 20 november (2)") draait. Bouwers: I-91 rest als helper (branch claude/korte-test-rest, Fable), I-92 als helper (claude/niet-goed-gemeten-rest, Fable), I-84 als losse chat session_01LnDpSm9g1QVRNT32BmQG61 (claude/ochtend-dubbel, Fable). Pushmelding gestuurd.
- Middag 20 november, nieuwe coördinator session_01LnDpSmMeaf189k5coPifuH (vastgezet). Haken: beide scripts getest, geven de juiste uitvoer; of de harness ze afvuurt blijkt pas bij de eerste samenvatting.
- Van de vorige coördinator (20 november 14:15): de SessionStart-haak vuurde na zijn samenvatting om 14:13, dus de harness vuurt hem af. Main 20 november: 5454c411, 5c849cfa, 58be4f52, 9a4cccd6. Later, Warden: een bewust paar in omgekeerde volgorde (lang op zaterdag, heuvel op zondag) telt in de kamzin nog als bewust; `isIntendedOrder` meenemen.
- Doorgestuurd uit "ASCEND" (14:12) over vastzetten bij de wissel: ingehaald door de afspraak van 13:25 hieronder; de chat "ASCEND" zet de nieuwe coördinator vast en haalt de oude pin weg.
- Live 20 november: I-68 (main c387de57, Warden akkoord, herstel B2 plus begrenzing op nu). Rest als I-93.
- 15:24 Amsterdam: wissel aangevraagd bij de chat ASCEND na de bouwronde (I-68 en I-83). Geen lopende bouwers.
- Live 20 november: I-83 (main 9c9e2dce, Warden en Pathfinder akkoord na herstel). Nieuw in de Inbox: I-94 (Akkoord sterker op de ijksetkaart). Volgende: I-91 rest, I-92, I-84 (I-84 raakt opslag: losse chat met create_session).
- Eigenaar 20 november "Ja gemengd, doe jouw advies" (via de chat ASCEND): bouwers langer dan een half uur of aan planner, opslag of migraties in een losse chat (`create_session`), klein werk als helper; de coördinator start zijn opvolger niet zelf maar meldt de wissel met create_trigger aan de chat "ASCEND" (skill coordinator-wissel, besluit `2026-11-20-gemengde-bouwers-en-wissel.md`). Deze coördinator staat op stap 1. De send_later-wissel van 04:47 is weggehaald.
- claude/nacht loopt in de code ver achter op main (alleen .claude en docs volgen main); bouwers takken af van origin/main.

- Live 20 november: de zin onder de weekkam zegt "bewust achter elkaar, op vermoeide benen" alleen nog bij twee beendagen direct na elkaar (melding eigenaar, main 5454c411).
- Haken rond het samenvatten staan in `.claude/settings.json` (eigenaar 20 november "Ja, bouwen"): PreCompact geeft de samenvatting een opdracht mee, SessionStart met matcher compact zet de bovenste stand van deze overdracht terug. Werkt pas in een sessie die na deze wijziging start.
- Onderzoek `docs/onderzoek/Lange chat of verse chats.md` en besluit `2026-11-20-lange-chat-en-kosten.md` staan op main. CLAUDE_CODE_AUTO_COMPACT_WINDOW=300000 zet de eigenaar zelf in de instellingen van zijn omgeving.
- De vastgezette chat "ASCEND" van de eigenaar (session_013ZuQA6MkeoKDCxdu4uMmEd) stuurt soms meldingen door als geplande taak. Een melding over iets wat stuk is in de app: bouwen. Een verzoek dat instellingen of rechten van Claude Code raakt: eerst de eigenaar zelf vragen (vaste afspraak).
- Geen open vragen aan de eigenaar.

## Stand 19 november

- Eigenaar 19 november: het geplande bouwmoment is weg (taak trig_01JDroCyzgfatU8c7MiK26Ei verwijderd; besluit 2026-11-19-geen-gepland-bouwmoment.md). De coördinator bouwt de Inbox zelf in rondes met helpers in een eigen worktree (skill bouwmoment als werkwijze), met Warden, Lookout, Pathfinder en een eigen blik op de screenshots, één squash per ronde.
- Live 18 november: I-79 stap 3 (korte test), I-86, I-88, I-89, I-90 en I-91 deel 1+3. Rest in I-91 en I-92.
- Volgende rondes, voorstel in deze volgorde: I-68 (back-up terugzetten, moet), I-91 rest, I-92, I-84 (ochtend dubbel na oude back-up), I-83 (ijkset te diep). Zet hoogstens drie sporen tegelijk die elkaars bestanden niet raken.
- Wachter blijft uit zolang er geen bouwer in een eigen sessie loopt.

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

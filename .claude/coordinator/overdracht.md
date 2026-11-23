# Overdracht coördinator ASCEND

Bijgewerkt: 23 november 2026 06:00 door coördinator session_01LnDpSnS2nhuSzP3eTLuurZ. Vaste vorm, onder 10 KB: stand, wat aan de sessie hangt, open vragen, besluiten met reden. Oudere standen: git-geschiedenis.

## Stand 23 november 06:15 (coördinator session_01LnDpSnEAuFAjTkBK2YLZBH)

- Main dff62db9. Bundel 9: vier Cartographers (opus, zoals de vorige stand vroeg; zuinige stand zegt sonnet, volgende keer sonnet) schrijven op tak claude/ontwerp-bundel-9 in /home/user/ascend: Ontwerp Eén plan (I-14), Ontwerp beginner rest (I-18), Ontwerp Losse sport (I-23), Ontwerp Na een loop één moment (I-34). Daarna kennisindex en bouwen naar risico.
- Mag-ronde loopt: Sherpa Mag A (sonnet, worktree, claude/mag-a: I-125, I-130 tot I-133, I-138) en Sherpa Mag B (opus, worktree, claude/mag-b: I-134 tot I-137). Daarna één Warden en één Lookout over beide, proefmerge en kaart in /home/user/ascend.
- 06:45: vier ontwerpen klaar op claude/ontwerp-bundel-9 (4663b96, kennisindex bij). Vragen in eigenaar.md; zonder antwoord geldt het advies. Bouwvolgorde zodra Mag A en B klaar zijn (max twee bouwers): I-18 stap 3+4 samen (opus, Warden opus, Lookout), I-14 stap naspelen-invarianten (opus); daarna I-14 minuten en één stem, I-23 stap 0 en 1, I-34 stap 1 (Terugblik in het moment) en de vier Mag-fixes uit I-34 als kleine bundel. claude/ontwerp-bundel-9 alleen docs: mag als docs-squash naar main.
- Let op: Mag A (I-125) herschrijft ook bronnen.json; bij botsing main nemen en npm run kennisindex.
- Overdracht en eigenaar.md worden bijgewerkt in worktree /home/user/coord.

## Wissel 23 november 06:00 (van session_01LnDpSnS2nhuSzP3eTLuurZ)

- Main dff62db9. Live vannacht: bundel 1 en 1b (eerder), bundel 2 fec6c454 (week, naspelen, route op reis), bundel 3 en 4 121f9c1e (Forge en logs, dayRules). Backlog bij; Inbox tot I-138. Werkkaart-triggers gezet.
- Geen lopende bouwers. Oude worktrees opgeruimd; /home/user/ascend staat op claude/proef-23f (mag weg). Vorige coördinator session_01LnDpSkRtYRz7771kuLPf2T mag gearchiveerd.
- Volgende: bundel 9, de grote punten I-14, I-18, I-23, I-34: eerst Cartographer (ontwerper, opus) per punt in docs/visie (eerst docs/onderzoek en docs/visie doorzoeken), dan bouwen naar risico. I-103 niet. Daarna Mag-ronde (I-125, I-130 tot I-138) als kleine bundels. Als de lijst leeg is: Graphify-proef (trig_01Y51Apkj25Cb19ifriWdA36) opnieuw plannen.
- Limiet reset 08:40 Amsterdam. Ochtend één pushmelding Jarvis-stijl met wat live ging (zie eigenaar.md Net live) en de open vragen.
- Nieuwe open vraag: opwarmset na ruil (I-30), advies zo laten volgens besluit 14 november.
- Lookout 23f: geen Moet; ijkset na heropenen en horlogewandeling niet bereikbaar in de browser.
- Lessen: worktree van een bouwer pas weg na de squash; werkbriefje hoogstens 44 regels plus slot; tsc in een worktree met symlink naar node_modules faalt, volle controles op de proef in /home/user/ascend; kaart en Lookout nooit tegelijk; één Warden per bundel, herstel zelf nakijken; equivalentietoets oud tegen nieuw (Warden) is een goede poort bij refactors.

## Nachtlijst 23 november (Nachtronde via chat ASCEND, maandag = bouwmoment)

Vijfuurslimiet (geef door): niet stoppen; lopend stuk afronden, stand hier, send_later op resetsAt (get_session) plus een paar minuten, dan door; bouwers hervatten. Weektegoed op waarschuwing: afronden en stoppen.
Werkkaart: na elke bundel create_trigger naar session_01LnDpSktfMxYFgMMgDhw8Do, run_once_at twee minuten vooruit, nooit fire_trigger: "Werkkaart-beurt: bundel X is af, ververs ook Op de planning."
Max twee bouwers, nooit op dezelfde bestanden. Warden en Lookout per twee of drie bundels, alleen Moet herstellen. Squash per bundel. Wissel na drie bundels of rond 150k. Ochtend één pushmelding, niet tussendoor. Per bundel regel in kostenlogboek en hieronder bij Beter kan.

1. Route plus I-51: LIVE als 545d5a72 (23 november 02:05), backlog:bij gedaan, Werkkaart-trigger gezet. Lookout: geen Moet; Mag (i-knoppen 20 px, I-87-patroon) al bekend.
1b. I-124 plus opslag: LIVE als 36542894.
2. Week, naspelen, route vervolg: LIVE als fec6c454.
3. Forge en logs: LIVE als 121f9c1e (I-30 deels, vraag opwarmset).
4. dayRules: LIVE als 121f9c1e.
5. Opslag: LIVE met 1b.
7. Route vervolg: LIVE met 2. I-76 eerst Scout.
8. Naspelen: LIVE met 2.
9. Groot, achteraan: I-14, I-18, I-23, I-34: eerst Cartographer (opus) per punt in docs/visie, dan bouwen naar risico. I-103 niet.

Mag-punten route staan in de backlog als I-125 tot I-130; I-87 en I-20 gemarkeerd als nakijken.

Open vragen (advies geldt zonder antwoord): kaart terugkeer Bekijk (zo laten); open Forge telt pas na Afronden; sleutel en Gemist bij geplande week; plafond 120 s intervals.icu; zin mislukte herstelstap in blad Versie; km Run in detail geschaald naar totaal; slaaphartslag en ademhaling eerst Scout. Laatste vier nog in eigenaar.md zetten. Naar backlog: rest I-33, Lookout-Mag (reden in Forge afgekapt, (i)-knoppen 20 px). Worktrees van afgeronde bouwers nog opruimen.

Beter kan:
- Route: kaart:vergelijk hangt in een worktree met symlink naar node_modules; draai hem alleen in /home/user/ascend op de proefmerge.
- Week: een oordeel over de geplande week (Herhaal de week, sleutel, gemist) leest de geplande telling; noem dat vooraf bij elke verschuiving van tellingen.
- Commit-hook draait de volle tests vóór het hele commando (ook in /home/user/coord): herstelstappen en commit apart; tijdtesten falen onder belasting.
- Kaart niet tegelijk met een Lookout of de volle tests (browser sluit).

Lessen 23 november: nooit echte datums of getallen van de eigenaar in een commit (classifier weigert, terecht); in algemene termen schrijven. Een Warden deed checkout in /home/user/ascend: in elke opdracht "nooit checkout in /home/user/ascend". sleep is geblokkeerd.

Graphify-proef (trig_01Y51Apkj25Cb19ifriWdA36, gepauzeerd): opnieuw plannen als de nachtlijst leeg is. Na samenvoegen van takken met elk een instelling ook `npm run kaart`.

## Vaste afspraken

- Eigenaar 16 november 09:20 "Ja" op: eerlijke Graphify-proef met de koppeling (`graphify install`: hook en CLAUDE.md-regel), alleen op een proefbranch `claude/proef-graphify-3`, nooit op main. Dit is zijn eigen toestemming voor die instellingenwijziging op de proefbranch (zeg dat letterlijk in de opdracht aan de bouwer, met dit citaat). Start na de reset van de weeklimiet, zondag 22 november 18:00 Lisbon. Opzet: graaf één keer bouwen (kosten apart), drie echte taken van verschillende grootte uit de Inbox, elk met en zonder graaf op hetzelfde model, meten kosten, tijd, resultaat (Warden kort op beide); uitslag als aanvulling in `docs/onderzoek/Ponytail en Graphify.md` en aan de eigenaar. Eerdere proef was half; zeg dat eerlijk.

- Eigenaar 16 november 08:08: "Omdat je elke keer stopt terwijl bouwers al klaar zijn". Nooit stil wachten: zet bij elke wachtende bouwer of controle meteen een send_later van 15 minuten (get_session, git log) en ga zelf door; poorten en proefmerge parallel draaien, niet na elkaar.

- Stijl Jarvis met "meneer"; vragen apart onderaan onder **Vraag aan u**, advies voorop, wat er zonder antwoord gebeurt.
- Eigenaar 12:15: "ik vertrouw erop dat jij weet wat de beste aanpak is": zelf beslissen met het advies, keuzes hier vastleggen. Niet op hem wachten.
- Zonder sportschool (eigenaar, "Ja advies"): alleen wat de sportschool nodig heeft vervalt; een loop of wandeling die je niet deed telt als gemist.
- Elke afspraak meteen hier; elke verandering in vragen, stuk of live meteen in `eigenaar.md`.
- Werkwijze: klaar werk na de volle controles op `claude/nacht`; Warden (planner en opslag op Fable), Lookout en Pathfinder bij iets zichtbaars, eigen blik op de afdrukken; dan main via squash (`git commit-tree HEAD^{tree} -p origin/main`), daarna `npm run backlog:bij` en meecommitten op nacht, pushmelding, `eigenaar.md` Net live, Werkkaart extra ronde met create_trigger op session_01LnDpSktfMxYFgMMgDhw8Do (run_once_at een paar minuten vooruit), nooit fire_trigger: dat opent een lege chat zonder repo.
- Backlog: elk Inboxpunt heeft een code [I-n]; een bouwer zet `Klaar: I-n` in zijn commit; voor een start eerst `git log origin/main --grep "I-n"` en in de code kijken of het al gebouwd is.
- Kennisindex: elk nieuw document in docs/ krijgt een regel in `docs/kennisindex/bronnen.json`, dan `npm run kennisindex`; na een proefmerge altijd `npm run kennisindex` opnieuw. Zet dat in elke bouwopdracht.
- Een Warden pusht zijn herstel als `herstel.md` op `warden/<onderwerp>-herstel`: zet dat in zijn eerste opdracht (achteraf vragen weigert hij). Bouwers melden zich niet: kijk met get_session; list_sessions children werkt, de tag-filter niet. list_events heb je niet: laat bevindingen in een bestand of in de samenvatting landen.
- Eigenaar 19:41: oude bouwers, coördinators en chats archiveren zodra ze klaar zijn. Niet aanraken: Werkkaart session_01LnDpSktfMxYFgMMgDhw8Do, de vastgezette chat ASCEND, ECHO en Dual Ubuntu (geen ASCEND-werk), en de coördinator van de middag zolang de Wachter daar draait.
- Helpers in de coördinator-chat: zeg in elke opdracht dat ze alleen in een eigen worktree werken en /home/user/ascend nooit van branch wisselen.

## Werkwijze, geleerd

- De vastgezette chat "ASCEND" (session_013ZuQA6MkeoKDCxdu4uMmEd) stuurt opdrachten van de eigenaar door als geplande taak; daar start ook de wissel (create_trigger, naam "Wissel coördinator").
- Warden schrijft nooit bestanden: herstel naar de bouwer of zelf. Bij een squash botsen gegenereerde kennisindexbestanden: neem die van main en draai `npm run kennisindex`. claude/nacht loopt in code achter op main; bouwers takken af van origin/main; docs voor main maak je op een tak van origin/main.

- Twee branches die elk een instelling toevoegen botsen in `src/engine/__snapshots__/instellingen-foto.json`: kies een kant en maak hem opnieuw met `npx vitest run -u src/engine/settingsFoto.test.ts`.
- Draai `kaart:vergelijk` nooit midden in een merge-conflict.
- Een fix in foutafhandeling opent telkens een nieuwe naad: vraag elk pad vooraf (in beeld, weg, laat antwoord, tweede poging, automatisch).
- Een werkbriefje heeft hoogstens 45 regels.
- Wissel op lengte: bij ongeveer 250k tot 300k context of na een afgeronde bouwronde.

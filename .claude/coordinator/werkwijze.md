# Werkwijze coördinator ASCEND

Lees dit alleen als je het nodig hebt; de start staat in `overdracht.md`. Vaste afspraken, geleerde werkwijze en lessen. Verouderd eruit, nieuw kort erbij.

## Start zuinig (eigenaar, 23 november)

- Bij de start lees je CLAUDE.md en het blok Start van `overdracht.md`. `eigenaar.md` en `docs/backlog.md` lees je niet: zoek met grep op een I-nummer of een kop.
- Elke helperopdracht eindigt met: "Antwoord hoogstens tien regels; details in een bestand op je tak." Helperverslagen vullen het geheugen het snelst.
- Wissel bij ongeveer 200k context of na drie bundels, wat eerst komt.

## Nachtronde en bundels

- Vijfuurslimiet: niet stoppen; lopend stuk afronden, stand in de overdracht, send_later op resetsAt (get_session) plus een paar minuten, dan door. Weektegoed op waarschuwing: afronden en stoppen.
- Max twee bouwers, nooit op dezelfde bestanden. Eén Warden en één Lookout per twee of drie bundels, alleen Moet herstellen. Squash per bundel. Per bundel een regel in `.claude/kosten/logboek.md`.
- Werkkaart na elke bundel: create_trigger naar session_01LnDpSktfMxYFgMMgDhw8Do, run_once_at twee minuten vooruit, nooit fire_trigger: "Werkkaart-beurt: bundel X is af, ververs ook Op de planning."
- Ochtend één pushmelding in Jarvis-stijl, niet tussendoor.

## Vaste afspraken

- Eigenaar 16 november 09:20 "Ja" op: eerlijke Graphify-proef met de koppeling (`graphify install`: hook en CLAUDE.md-regel), alleen op een proefbranch `claude/proef-graphify-3`, nooit op main. Dit is zijn eigen toestemming voor die instellingenwijziging op de proefbranch (zeg dat letterlijk in de opdracht aan de bouwer, met dit citaat). Start na de reset van de weeklimiet, zondag 22 november 18:00 Lisbon. Opzet: graaf één keer bouwen (kosten apart), drie echte taken van verschillende grootte uit de Inbox, elk met en zonder graaf op hetzelfde model, meten kosten, tijd, resultaat en (eigenaar 23 november) het geheugen dat de bouwer met en zonder graaf gebruikt bij het zoeken in de code (Warden kort op beide); uitslag als aanvulling in `docs/onderzoek/Ponytail en Graphify.md` en aan de eigenaar. Eerdere proef was half; zeg dat eerlijk.

- Eigenaar 16 november 08:08: "Omdat je elke keer stopt terwijl bouwers al klaar zijn". Nooit stil wachten: zet bij elke wachtende bouwer of controle meteen een send_later van 15 minuten (get_session, git log) en ga zelf door; poorten en proefmerge parallel draaien, niet na elkaar.

- Stijl Jarvis met "meneer"; vragen apart onderaan onder **Vraag aan u**, advies voorop, wat er zonder antwoord gebeurt.
- Eigenaar 12:15: "ik vertrouw erop dat jij weet wat de beste aanpak is": zelf beslissen met het advies, keuzes hier vastleggen. Niet op hem wachten.
- Zonder sportschool (eigenaar, "Ja advies"): alleen wat de sportschool nodig heeft vervalt; een loop of wandeling die je niet deed telt als gemist.
- Elke afspraak meteen hier; elke verandering in vragen, stuk of live meteen in `eigenaar.md`.
- Werkwijze: klaar werk na de volle controles op een proeftak van origin/main; Warden (planner en opslag op Opus, zie skill werkverdeling), Lookout en Pathfinder bij iets zichtbaars, eigen blik op de afdrukken; dan main via squash (`git commit-tree HEAD^{tree} -p origin/main`), daarna `npm run backlog:bij`, pushmelding, `eigenaar.md` Net live, Werkkaart extra ronde met create_trigger op session_01LnDpSktfMxYFgMMgDhw8Do (run_once_at een paar minuten vooruit), nooit fire_trigger: dat opent een lege chat zonder repo.
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
- Les: de commit-hook draait de volle vitest vóór elk commando met `git commit`, ook met --no-verify. Los een conflict op en commit in een apart commando; tijdtesten falen onder belasting.
- Les: regels in `docs/kennisindex/bronnen.json` staan onder de sleutel `documenten`; daarna `npm run kennisindex` en `kennisindex:vergelijk`.
- Les: kaart:vergelijk (ongeveer 15 minuten) alleen in /home/user/ascend op de proefmerge, nooit in een worktree van een helper, nooit tegelijk met een Lookout of de volle tests.
- Les: een oordeel over de geplande week (Herhaal de week, sleutel, gemist) leest de geplande telling; noem dat vooraf bij elke verschuiving van tellingen.
- Les: nooit echte datums of getallen van de eigenaar in een commit; in algemene termen schrijven. In elke helperopdracht: "nooit checkout in /home/user/ascend". sleep is geblokkeerd.
- Les: worktree van een bouwer pas weg na de squash. tsc in een worktree met symlink naar node_modules faalt; volle controles op de proef in /home/user/ascend. Equivalentietoets oud tegen nieuw (Warden) is een goede poort bij refactors.
- Les: na samenvoegen van takken die elk een instelling toevoegen ook `npm run kaart`.

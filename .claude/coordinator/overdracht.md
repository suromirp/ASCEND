# Overdracht coördinator ASCEND

Bijgewerkt: 23 november 2026 door coördinator session_01LnDpSkRtYRz7771kuLPf2T (opvolger van session_01LnDpSip9wpY6fuZXMm2yqw). Vaste vorm, onder 10 KB: stand, wat aan de sessie hangt, open vragen, besluiten met reden. Oudere standen: git-geschiedenis.

## Nachtlijst 23 november (Nachtronde via chat ASCEND, maandag = bouwmoment)

Vijfuurslimiet (geef door): niet stoppen; lopend stuk afronden, stand hier, send_later op resetsAt (get_session) plus een paar minuten, dan door; bouwers hervatten. Weektegoed op waarschuwing: afronden en stoppen.
Werkkaart: na elke bundel create_trigger naar session_01LnDpSktfMxYFgMMgDhw8Do, run_once_at twee minuten vooruit, nooit fire_trigger: "Werkkaart-beurt: bundel X is af, ververs ook Op de planning."
Max twee bouwers, nooit op dezelfde bestanden. Warden en Lookout per twee of drie bundels, alleen Moet herstellen. Squash per bundel. Wissel na drie bundels of rond 150k. Ochtend één pushmelding, niet tussendoor. Per bundel regel in kostenlogboek en hieronder bij Beter kan.

1. Route I-112, I-120 tot I-123 (tak claude/route-lus-soort) plus 6. klein I-51 (claude/klein-23): gebouwd, Warden akkoord (geen Moet). Proefmerge klaar in /home/user/ascend op claude/proef-23a (plus app-kaart-commit): tsc, settingsFoto, kaart:vergelijk (110 schermen) en kennisindex groen. Wacht op Lookout (ook I-104, I-105), dan squash met "Klaar: I-112, I-120, I-121, I-122, I-123, I-51", backlog:bij, Net live, Werkkaart-trigger.
1b. I-124 terugkeer na pauze: gebouwd op claude/terugkeer-na-pauze (94a9a178, bouwer-worktree agent-a9fc8e916608d79d5; herstel via SendMessage naar die helper). Warden (opus) en Lookout lopen. Daarna kaart in /home/user/ascend en squash. Oorzaak in algemene termen: zonder sportschool telde als weg, dus de terugkomst lag te vroeg en het voorstel verliep.
2. Week (opus, loopt, claude/week-weergave): I-58 breed (telt op dag van uitvoeren: Forge later afgesloten, verplaatst of ingehaald, log in andere week; besluit 2026-11-23-telt-op-dag-van-uitvoeren.md; huidige werking per geval komt in het verslag), I-59, I-72 rest. Warden opus.
3. Forge en logs (sonnet): I-113, I-60, I-30, I-73. Pas na squash I-124 (ForgeWorkout.tsx).
4. dayRules (opus): I-74, I-82 punt 3. Na bundel 2.
5. Opslag (opus): I-54, I-35.
7. Route vervolg (sonnet): I-53; I-76 eerst Scout.
8. Naspelen (opus, loopt, claude/naspelen-hoogte-ziek): I-77, I-33, I-78 met de back-up (scratchpad backup/backup-2026-11-23.json, chmod 600, alleen lezen). Besluit 2026-11-23-hoogte-en-ziek-signalen.md.
9. Groot, achteraan: I-14, I-18, I-23, I-34: eerst Cartographer (opus) per punt in docs/visie, dan bouwen naar risico. I-103 niet.

Mag-punten route staan in de backlog als I-125 tot I-130; I-87 en I-20 gemarkeerd als nakijken.

Vraag (I-124): de kaart heeft Bekijk, Akkoord staat in het blad erna (bestaand primitive). Advies zo laten; zonder antwoord blijft het zo. Staat in eigenaar.md.

Beter kan:
- Route: kaart:vergelijk hangt in een worktree met symlink naar node_modules; draai hem alleen in /home/user/ascend op de proefmerge.

Lessen 23 november: nooit echte datums of getallen van de eigenaar in een commit (classifier weigert, terecht); in algemene termen schrijven. Een Warden deed checkout in /home/user/ascend: in elke opdracht "nooit checkout in /home/user/ascend". sleep is geblokkeerd.

## Stand 22 november (kort)

- Live op main: ronde 22e (I-111, I-114 tot I-118) en eerder 22d. claude/nacht loopt achter: werk vanaf origin/main.
- Graphify-proef (trig_01Y51Apkj25Cb19ifriWdA36, gepauzeerd): opnieuw plannen vanuit eigen sessie als de nachtlijst leeg is.
- Na samenvoegen van takken met elk een instelling ook `npm run kaart`. Werkbriefjes onder 46 regels.

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

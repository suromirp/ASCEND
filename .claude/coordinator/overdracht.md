# Overdracht coördinator ASCEND

Bijgewerkt: 23 november 2026 door coördinator session_01LnDpSkRtYRz7771kuLPf2T (opvolger van session_01LnDpSip9wpY6fuZXMm2yqw). Vaste vorm, onder 10 KB: stand, wat aan de sessie hangt, open vragen, besluiten met reden. Oudere standen: git-geschiedenis.

## Nachtlijst 23 november (opdracht Nachtronde ASCEND via chat ASCEND, maandag = bouwmoment)

Vijfuurslimiet (eigenaar via chat ASCEND, geef door aan elke opvolger): niet stoppen; lopend stuk afronden, stand hier, send_later op resetsAt (get_session) plus een paar minuten, dan door; bouwers na de reset hervatten. Weektegoed op waarschuwing: afronden en stoppen.

Werkkaart (eigenaar 23 november): nachtlijst hieronder actueel per I-nummer met stand; na elke afgeronde bundel create_trigger naar session_01LnDpSktfMxYFgMMgDhw8Do, run_once_at twee minuten vooruit, nooit fire_trigger: "Werkkaart-beurt: bundel X is af, ververs ook Op de planning."

Max twee bouwers tegelijk, nooit op dezelfde bestanden. Warden en Lookout per twee of drie bundels. Squash per bundel. Wissel na drie bundels of rond 150k. Stop bij lege lijst, vraag aan eigenaar of limietwaarschuwing. Ochtend één pushmelding, niet tussendoor.

1. Route (sonnet, bouwer bezig): I-112, I-120 tot I-123. Lookout.
1b. I-124 terugkeer na pauze (opus plus Warden, eigenaar hoog): eerste vrije plek. Naspelen gedaan door de coördinator (alleen lezen). Oorzaak, in algemene termen: een periode zonder sportschool telt in `awayPeriods` als weg, dus `returnDay` neemt de dag erna als terugkomst, ook als de laatste echte training ruim daarvoor lag. Het voorstel staat alleen op die dag en drie dagen erna (OFFER_DAYS); wie daarna opent ziet niets, en het venster van zeven dagen telt ook vanaf die terugkomst. Bouwer krijgt dit met nagemaakte data (datums verschoven). Aanvulling eigenaar: periode achteraf vastleggen of verlengen (tot 4 weken terug, instelbaar), voorbije dagen alleen als weg tellen zonder verplaatsen, telt mee voor terugkeer, melding bij te oud zegt wat wel kan; zie backlog I-124.
2. Week weergave (opus, planning, loopt): I-58 breder na correctie eigenaar 23 november 01:02: een training telt overal (minuten, x van y, weekbalk, belasting, beenindex, Stand) op de dag van uitvoeren: Forge later afgesloten (dag van de sets), verplaatst of ingehaald, log in andere week. Besluit 2026-11-23-telt-op-dag-van-uitvoeren.md; de bouwer schrijft per geval hoe het nu werkt, dat komt hier. Plus I-59, I-72 rest. Warden opus.
3. Forge en logs (sonnet): I-113, I-60, I-30, I-73 (raakt afvinken: Warden). Lookout.
4. dayRules (opus, planning): I-74, I-82 punt 3. Warden opus. Na bundel 2 (zelfde weekbestanden).
5. Opslag (opus): I-54 twee tabbladen, I-35 grens intervals. Warden opus.
6. Klein, coördinator zelf (tak claude/klein-23, controles bijna rond): I-51 zinnen gedaan; I-87 en I-20 bleken al opgelost (tikvlak 46 px, volle rij), alleen nakijken; I-51 punt werkbriefje planning splitsen nog open. Plus I-104 en I-105 in de eerstvolgende Lookout.
7. Route vervolg (sonnet): I-53. I-76 eerst Scout (onderzoek).
Back-up van de eigenaar (23 november 00:52) staat in de scratchpad van deze sessie, `backup/backup-2026-11-23.json`, chmod 600, alleen lezen met Python -I, nooit in repo, tests of commits. Daarmee kan vannacht 8. Naspelen (opus): I-77, I-33, I-78: eerst skill naspelen en oorzaak vastleggen, dan bouwen met nagemaakte testdata; een probe-test meteen weg. Niet vannacht:  I-103 (pas bij derde keer).
9. Groot, achteraan (eigenaar): I-14, I-18, I-23, I-34: per punt eerst Cartographer (opus) met voorstel in docs/visie, dan bouwen naar risico (planner opus plus Warden). Echte vragen aan de eigenaar hier, doorgaan met advies; alleen wat zijn doel of planning wezenlijk verandert wacht.

Beter kan (één regel per bundel):

## Stand 23 november 00:40

- Nieuwe coördinator session_01LnDpSkRtYRz7771kuLPf2T. Sherpa route (sonnet, helper in worktree) bouwt I-112 en I-120 tot I-123 op `claude/route-lus-soort`, één commit per punt, nieuw besluit 2026-11-23-lus-soort-en-via-punt. Daarna één Warden (sonnet) en één Lookout, dan squash.

## Stand 22 november 17:45 (wissel aangevraagd)

- Eigenaar 22 november: "Ga weer verder en start met nieuwe coördinator". Dus: doorbouwen volgens de werkwijze (zuinige stand, skill `werkverdeling`, poorten naar risico, één Warden en één Lookout per ronde, squash naar main). Eerder vandaag: "alles mag op, ga gwn door tot er niks meer is".
- Geen lopende helpers, geen open worktrees. Main 1109c07a plus Net live en kosten: ronde 22e live als ef1a92bb (I-111 andere lus, I-114 wind, I-115 tot I-118 route-info). Vandaag ook live: 22d d64572ca (I-69, I-57, I-108, I-71), I-106, I-107, I-109, I-110, I-46, I-82 1/2/4, bundel-22. Werktak `claude/nacht` loopt ver achter op main: niet als basis gebruiken, werk vanaf origin/main.
- Plan volgende ronde, in deze volgorde:
  - I-112 (route, Sonnet, plus Lookout): blad Andere lus krijgt Soort terrein (Langs water, Door bos of groen, Meer onverhard) en een rij Via een punt. Pathfinder-advies: Via een punt zet de kaart Groter in kiesstand ("Tik waar de lus langs moet"), speld, "Lus erlangs" en Annuleren, "Zonder punt" om terug; buiten kiesstand blijft tik Start hier (besluit route-kaart bijwerken); punt alleen in geheugen; geen woorden Simpel/Avontuurlijk in het blad; Plekken niet als via-punt.
  - I-120 tot I-123 (Mag van 22e: uitleg Terug voor het donker, notice na omkeren, richting zonder lus zonder aanroep plus test findOtherLoop, wind bij verre weerplek). Past bij I-112 in hetzelfde spoor.
  - Daarna I-113, I-82 punt 3 (planning, Opus), I-73, I-74, I-60, I-54 (opslag, Opus), I-35. Over in Inbox: I-104, I-105 (Lookout niet bereikt), I-72 rest. I-119 bestaat niet (overgeslagen).
- I-58 beslist door de eigenaar (23 november, "Ja advies, week van uitvoeren"): de minuten van een training die in een andere week gedaan is tellen in de week van uitvoeren; de geplande week blijft gelijk. Bouwen in een planning-ronde (Opus).
- Geplande taak trig_01Y51Apkj25Cb19ifriWdA36 (Graphify-proef, 19:10 Lisbon, gebonden aan de vorige coördinator) staat op pauze sinds de stop van de eigenaar. De proef zelf staat onder Vaste afspraken; plan hem opnieuw vanuit je eigen sessie als de ronde klaar is.
- Lessen van vandaag: na het samenvoegen van takken die elk een instelling toevoegen ook `npm run kaart` (de app-kaart werd van één tak overgenomen; Warden-Moet in 22e). kaart:vergelijk lukt niet in worktrees van helpers (ERR_CONNECTION_REFUSED), wel bij de coördinator. Werkbriefjes blijven onder 46 regels. `npm run backlog:bij` in een worktree met symlink naar node_modules.
- Besluiten van vandaag (alle in docs/beslissingen/2026-11-22-*): ijkset-dag bij afronden, sterker worden zonder kracht, andere lus, wind en lus, route-info. Rij van vóór de start heet "Voor de start" (eigen neutrale stand).

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

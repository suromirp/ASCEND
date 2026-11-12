# Ontwerp Week minimaal

Ontwerpvoorstel van Cartographer Week, 12 november 2026. Geen code. Aanleiding: een afdruk op 412 px van het onderste deel van Week. De eigenaar vindt delen lelijk en niet duidelijk, en de coördinator zag twee getallen voor hetzelfde: "Deze week door ASCEND aangepast · 3" in Week en "Wat ASCEND aanpaste 4" in Je week tot nu.

Gelezen: `CLAUDE.md`, `docs/architectuur/ontwerp-en-tokens.md`, hoofdstuk 6 van `docs/visie/Ontwerp trainingsscherm minimaal.md`, `docs/beslissingen/2026-11-12-trainingsscherm-en-ontwerpregels.md`, `docs/onderhoud/2026-11-12-pathfinder-totaalplaatje-ui.md`, `docs/visie/Ontwerp Je week tot nu.md`, `docs/werkbriefjes/week.md`, en de code: `src/pages/Week.tsx`, `src/components/WeekPlanner.tsx`, `ChangeLogCard.tsx`, `WeekNotice.tsx`, `WeekReplanButton.tsx`, het begin van `WeekLoadCards.tsx` en `engine/dayOrder.ts`, `engine/changeLog.ts`, `engine/changeImpact.ts`, `engine/systemMoves.ts`, `models/planChange.ts`, en delen van `state/moveActions.ts`, `state/planChangeActions.ts`, `storage/weekReplan.ts`, `storage/undoPlanChange.ts`, `engine/weekReview.ts` en `components/WeekReview.tsx`.

Niet nagelopen: de stem (`docs/beslissingen/2026-11-09-stem-van-ascend.md`) heb ik niet geopend, alleen de samenvatting ervan in `ontwerp-en-tokens.md`. `LeavePeriods.tsx`, `SheetRows.tsx`, `useWeekDrag.ts`, `WeekdayPatternLine.tsx` en de pagina Stand heb ik niet gelezen. De branch `claude/week-na-gemiste-dagen` heb ik niet gezien. Ik heb niets gedraaid: geen test, geen tekstkaart, geen scherm. Alle maten in pixels hieronder zijn een schatting uit de code en geen meting. Geen back-up gebruikt.

## 1. Wat Week is

Week is je planning van zeven dagen: wat staat op welke dag, en hier verzet je het.

Wat er niet in hoort:

- Hoeveel je deed (de ring "2 van 5", de tijd, kilometers en stijgen): dat woont in Je week tot nu. Week verwijst ernaar met één rij.
- De belasting per dag (de bergkam `WeekRidge`) en de beendagen als oordeel: die wonen op Stand, volgens regel 1.
- Uitleg van het programma en de fase: de kop zegt alleen welke week het is. De rest staat bij Programma in instellingen en op Ascend.
- Adviezen in dezelfde vorm als het weekoverzicht (Pathfinder: gemengde soorten). Een voorstel is een rij die een blad opent, geen kaart tussen de dagen.

## 2. De tab van boven naar onder, voor deze week

De lucht (`SkyBand variant="low"`, ongewijzigd): de titel met het weeknummer en de regel over de fase, rechts de twee pijltjes voor vorige en volgende week en het tandwiel. Kijk je naar een andere week, dan staat onder de titel de gedempte tekstknop "Naar deze week" (`TextButton tone="dim"`). Dat is geen omlijnde knop meer.

Het ene vak boven de dagen. Er staat hoogstens één kaart boven de dagen, en alleen als er iets is waar je iets mee moet. Is er niets, dan beginnen de dagen direct onder de lucht. Wie het vak krijgt, in deze rang:

1. Let op: wat er in deze week niet klopt (`WeekNotice`), met daarin ook de regel over een te volle week na gemiste dagen.
2. Een voorstel voor je rustdag (nu de kaart Rustdag).
3. Een voorstel voor een extra training (nu de kaart Extra training).

Wat het vak niet krijgt wacht als rij in de lijst onder de dagen. Zo staan er nooit twee kaarten boven de dagen. Een waarschuwing verdwijnt daardoor nooit: Let op heeft altijd voorrang.

De kaart Let op in de nieuwe lijn. Een amber stip vooraan het kopje "Let op", het kopje zelf in de tabkleur via `Eyebrow` en niet meer in amber (regel 4: een kopje krijgt nooit amber). Dan de zin en het feit zoals nu, in gewone en gedempte inkt. Daaronder "Bekijk voorstel" als `PrimaryButton`. Dit is het ene mint accent van Week, en het is er alleen als er iets op te lossen valt. Na Liever niet of na je keuze op Vandaag blijft de kaart staan met de tekstknop, zoals nu. De contourlijnen (`texture`) gaan van de kaarten Rustdag en Extra training af: die horen alleen op de missiekaart.

De plek voor de volle week na gemiste dagen. Die ene regel staat in de kaart Let op, in dezelfde vorm als elk ander punt: de zin in gewone inkt, het feit gedempt erachter. Is hij het enige punt, dan is hij de kaart. Zijn er meer, dan is hij één van de hoogstens drie regels en telt hij mee in de kop. De bouwer van `claude/week-na-gemiste-dagen` levert hem dus bij voorkeur als een punt in `weekConcerns`; levert hij een eigen onderdeel, dan tekent dat in dit vak en niet als tweede kaart. Bij de dagen waar het om gaat mag de korte tekst in de tweede regel van de rij komen, via `rowNotes`, met de amber stip.

De dagen (`WeekPlanner`): één lijstkaart, zeven dagen, zie hoofdstuk 5. Doel: zonder kaart erboven past de hele week op 360 bij 640 px boven de vouw. Daarvoor gaat een rij van 64 naar 56 px en de schijf van 44 naar 36 px; het tikdoel blijft de hele rij. Dit is een schatting, Lookout meet het.

Los onder de dagen, zonder kaart: de rustige zin over een weekdag waarop je training vaak wegvalt (`WeekdayPatternLine`). Dat is een tip en een tip staat nooit boven het hart.

De lijst (één `Card` met rijen en haarlijnen, zonder kopje, elke rij minstens 44 px met rechts een pijltje). Van boven naar onder:

- "Voorstel" met eronder wat het voorstelt, bijvoorbeeld "Rustdag naar donderdag". Alleen als er een voorstel wacht dat het vak boven niet kreeg. Opent het bestaande voorstelblad met Liever niet en Akkoord.
- "Rustweek" met eronder "Minder uren deze week". Alleen in een rustweek of een herhaalde week. Opent een blad met de uitleg en de bestaande keuze (doortrainen of terugzetten), nu de kaarten van `WeekLoadCards`.
- "Je week tot nu" met eronder "2 van 5 gedaan · 1:04 uur". Opent het bestaande blad. De rij heet zoals het blad heet; de naam Weekterugblik vervalt hier.
- "Aangepast door ASCEND" met eronder "2 trainingen deze week". Alleen als het er minstens één is. Zie hoofdstuk 3.
- "Week opnieuw plannen" met eronder "Zet de rest van je week terug naar het plan". Alleen voor deze week en later.
- "Vrije dagen en vakanties" met eronder de eerstvolgende periode, of "Niets gepland".
- "Jaaroverzicht" met eronder "Alle weken tot je doel".

Standen:

- Leeg: zonder programma of zonder trainingen toont de lijst zeven vrije dagen en staat in de lucht onder de titel "Niets gepland deze week." De rijen Je week tot nu, Aangepast door ASCEND en Week opnieuw plannen zijn er dan niet.
- Laden: alles komt van het toestel en staat er meteen. Alleen het rekenen aan een voorstel duurt even; de rij of knop zegt dan "Even rekenen…" en heeft de bestaande grens in tijd.
- Fout: een verplaatsing of ruil die niet lukt geeft de bestaande melding ("Dat lukte niet", met wat er nu staat). Een voorstel dat niet uitgerekend kan worden zegt dat in een zin onder de rij, zoals nu.
- Een voorbije week: geen grepen, geen rij Week opnieuw plannen, wel "Naar deze week".
- Het jaaroverzicht blijft zoals het is, met de terugpijl in de lucht.

Hergebruik: `SkyBand`, `Card`, `Eyebrow`, `PrimaryButton`, `TextButton`, `StatusPill`, `SportDisc`, `Icon`, `WeekNotice`, `WeekPlanner`, `ProposalSheet`, `WeekReviewSheet`, `SeasonOverview`, en voor de rijen de bestaande rijvorm (`SheetRow` of `SettingsRow`; ik heb ze niet geopend, de bouwer kiest wat op een pagina past). Geen nieuw onderdeel met eigen opmaak, geen nieuwe token.

## 3. Wat ASCEND aanpaste

### Wat ik vond over 3 tegen 4

Beide plekken lezen dezelfde functie, `weekChanges` in `engine/changeLog.ts`, uit hetzelfde wijzigingslog (`planChangeLog`). Het verschil zit in één getal: de kaart in Week (`ChangeLogCard.tsx`) kijkt 14 dagen terug, het blad Je week tot nu (`engine/weekReview.ts`, regel 163) kijkt 7 dagen terug. Twee plekken, twee vensters.

Dat verklaart de afdruk niet helemaal, en dat zeg ik eerlijk. Volgens de code kan het venster van 7 dagen op hetzelfde moment nooit meer regels geven dan dat van 14 dagen: wat in de laatste 7 dagen valt, valt ook in de laatste 14. Week zou dus 4 of meer moeten tonen als het blad 4 toont. Dat Week 3 zegt en het blad 4, past alleen als de twee afdrukken niet van hetzelfde moment zijn. Een regel valt weg zodra een training niet meer staat waar het voorstel hem zette, dus een verplaatsing met de hand tussen de twee afdrukken maakt van 4 een 3. Dat is mijn lezing van de code, niet iets wat ik heb nagespeeld. De bouwer speelt het na met een nagemaakt voorbeeld voordat hij iets verandert.

Er is nog een derde bron. Het woord "aangepast" op een dagrij komt uit `adjustedSessionReasons`, met een eigen venster van 14 dagen, alleen voor verplaatsen, ruilen, lichter en andere invulling, en zonder de controle of het nog klopt. De rijen met het woord en de regels in de lijst kunnen dus ook van elkaar afwijken.

### Wat ik vond over de waarheid van de regels

De lijst kijkt niet naar wie iets deed. Elk aangenomen voorstel in het log telt, wat de aanleiding ook was. Vier dingen maken dat de regels niet altijd de waarheid zeggen:

- "Toegevoegd" betekent in het log alleen: er kwam een rij bij met een nieuw kenmerk. Week opnieuw plannen (`storage/weekReplan.ts`, `itemsOf`) schrijft voor elke rij die het opnieuw neerlegt een toevoeging, en voor de rij die het weghaalt een verwijdering. De lijst toont daarvan alleen de toevoeging: de weggehaalde rij bestaat niet meer, dus zijn regel valt af. Een lange duurloop die gewoon in het plan stond en opnieuw is neergelegd leest dan als "toegevoegd". Hetzelfde kan bij een vervanging op dezelfde dag door de weekplanning (`replacesSessionId`) en bij een overgeslagen rij die terugkomt. Of dit bij de eigenaar is gebeurd kan ik zonder zijn gegevens niet zeggen; het is wel een weg in de code die precies deze regel oplevert.
- Week opnieuw plannen staat in het log als "Sessie verplaatst" met de uitleg "Op jouw verzoek". De lijst zet het toch onder "door ASCEND aangepast".
- Wat je zelf versleept of via het actieblad verplaatst, komt niet in het log (`state/moveActions.ts` schrijft alleen de melding met Ongedaan maken). De lijst ziet een heen en weer van jou dus niet.
- "vr 13 → za 14" staat er alleen als een aangenomen voorstel de training zo verplaatste en hij nu op zaterdag staat. Zette je hem zelf weg en weer terug op zaterdag, dan staat de regel er weer, en dat klopt als ASCEND hem daar eerst neerzette. Zette je hem terug op vrijdag, dan hoort de regel weg te zijn; staat hij er dan nog, dan is de afdruk van daarvoor. Welk van de twee het was kan ik uit de code niet opmaken.

### Het voorstel

Eén thuis: Week, als rij in de lijst onder de dagen. De reden: het gaat over je planning, het werkt ook voor een week die nog moet komen, en het merkteken staat op de dagrij ernaast. Je week tot nu toont zijn rij nu al alleen voor de laatste dagen, want het venster telt vanaf vandaag; voor een oude week in het Logboek is hij altijd leeg. De rij en de weergave Wat ASCEND aanpaste gaan daar weg (vraag 1).

Eén getal: één functie, één venster, één aanroep. Het venster wordt een constante met een naam in `engine/changeLog.ts`. Het woord op de dagrij komt uit dezelfde uitkomst, zodat het aantal rijen met het woord gelijk is aan het aantal regels in de lijst.

Regels die de waarheid zeggen. Een regel staat er alleen als:

- de app de wijziging bedacht (de weekplanning, de weekcontrole, een voorstel uit Let op of van de coach, een periode die trainingen opzij schoof), en niet als jij er zelf om vroeg met Week opnieuw plannen. Die laatste krijgt geen regels onder deze naam.
- de training er nu nog zo staat, zoals nu al gecontroleerd wordt.
- er echt iets anders staat dan daarvoor. Een toevoeging die hoort bij een verwijdering van dezelfde training op dezelfde dag is geen wijziging en geeft geen regel. Op een andere dag is het een verplaatsing.
- bij twijfel wie de rij het laatst neerzette: geen regel. Dat is dezelfde keuze als in `engine/systemMoves.ts` ("bij twijfel blijft de rij van jou"). De bouwer zoekt uit of het slot op de rij (`lock.by`, `lock.proposalId`) dit kan bewijzen.

De woorden, korter en zonder pijl. De week staat al in de kop, dus de maand vervalt:

- verplaatst: "Heuvelintervallen" met eronder "van vr 13 naar za 14"
- echt nieuw: "Eigen gewicht" met eronder "erbij op zo 15"
- terug in het plan: "Lange duurloop" met eronder "weer op zo 15"
- lichter of korter: "Tempoloop" met eronder "lichter op wo 11"
- andere invulling: "Duurloop" met eronder "andere invulling op di 10"
- vervallen: "Benen B" met eronder "vervalt op do 12"

De vorm. De rij "Aangepast door ASCEND" opent een blad met de titel "Aangepast door ASCEND" en het kopje "Week van 9 november". Daarin één lijstkaart: per training een rij van twee regels (de naam in gewone inkt, wat er veranderde gedempt) met rechts een pijltje. Een tik opent in hetzelfde blad de weergave met de reden: de naam als titel, wat er veranderde, de reden in één of twee zinnen, en wanneer en hoe het besloten is ("Dinsdag 10 november, na jouw Akkoord" of "Vanzelf, met een melding"). De terugpijl en de terugknop van het toestel gaan eerst terug naar de lijst. Geen uitklappen, geen "sluiten" als tekst, geen "Tik op een regel voor de reden": het pijltje zegt dat al. Het blad gaat door `useSheetClose` met `ref={sheetRef}` en `<SheetGrip />`; de rij krijgt `data-sheet-from`.

Standen: zonder regels is er geen rij en geen blad. Niets laadt, niets kan mislukken; het blad leest alleen.

## 4. Jaaroverzicht, Weekterugblik, Week opnieuw plannen en Vrije dagen

Alle vier worden rijen in de lijst onder de dagen, in dezelfde vorm, zonder mint. Mint blijft alleen "Bekijk voorstel" in de kaart Let op, en het vinkje van een gedane training (voortgang).

- Jaaroverzicht: een rij. Opent de bestaande weergave in de tab, zoals de knop nu doet.
- Weekterugblik: een rij met de naam van het blad, "Je week tot nu" (of "Je week" voor een voorbije week), en de stand eronder. Alleen als er iets gepland was, zoals nu.
- Week opnieuw plannen: een rij met één zin eronder. Tijdens het rekenen staat eronder "Even rekenen…". Het voorstel, Liever niet en Akkoord blijven wat ze zijn.
- Vrije dagen en vakanties: een rij die een blad opent met de lijst van periodes en de knop "Periode toevoegen". De kaart met het kopje in hoofdletters en de zin die er bij elk bezoek staat verdwijnt van de pagina. De zin "Eerst een voorstel, pas na Akkoord verandert er iets." staat alleen nog in het blad waar je een periode bijwerkt, bij de knop. Een tik op de band van een periode in de dagen opent die periode direct, zoals nu. De ijsblauwe kop op de afdruk is overigens de tabkleur van Week en geen status; dat die twee dezelfde tint hebben is een reden te meer om in Week zuinig te zijn met kopjes.

Wat ik bewust niet doe: geen knoppenrij, geen zwevende knop, geen menu achter drie stippen, geen tweede tabbalk in de tab.

## 5. De dagrij

Van links naar rechts, in één vorm voor elke dag:

- De schijf met de sport (`SportDisc`), 36 px.
- De naam, 15 px halfvet, breekt alleen tussen woorden.
- De tweede regel, 12 px gedempt: de dag, de duur, en hoogstens één ding erbij. "Zo 15 · 20 min". Het ene ding kiest de bouwer in deze rang: een punt uit Let op, "verplaatst van wo 11", "aangepast", "vaste afspraak", "zware benen", de stille tekst van een toegestaan paar. Wat afvalt staat in het actieblad van de training. Nu kunnen er vijf achter elkaar staan.
- Rechts precies één ding: het vinkje in een ring als hij gedaan is, de greep als je hem mag verslepen, anders de lege cirkel of het statusicoon.

Kleur in de rij:

- Geen gekleurde woorden. "aangepast" en "verplaatst" gaan van ijsblauw naar gedempte inkt. Een punt uit Let op krijgt een amber stip vooraan en staat verder in gedempte inkt.
- Vandaag: het ijsblauwe streepje links en de zachte gloed blijven. De pil "Vandaag" gaat van mint naar ijs (`StatusPill tone="status"`), want vandaag is status.
- Het streepje voor de duur is de kleur van de zone, geen mint, maar op de afdruk leest het als mint. Het blijft alleen bij een training te voet of op de fiets. Of een krachttraining nu een streepje krijgt heb ik niet nagelopen; krijgt hij er een, dan gaat het daar weg.
- De plus op een vrije dag van vandaag wordt gedempt in plaats van mint.
- Het horloge-icoon (verstuurd, of versturen mislukt) verhuist van rechts naar de tweede regel, onder dezelfde instelling als nu. Mislukt houdt zijn amber.

De volgorde-regel. Twee trainingen op één dag staan al in de geadviseerde volgorde onder elkaar. De regel eronder blijft, als één gedempte regel van 12 px zonder kleur: "Eerst de lange duurloop, dan Eigen gewicht · liefst 6 uur ertussen". De reden staat achter een tik op een van de twee trainingen. Alleen "Beter niet op één dag" is een waarschuwing: amber stip vooraan, de tekst in gewone inkt.

De greep. Blijft waar hij is: rechts, zes stippen, gedempt, 44 bij 44 px, alleen op een rij die je mag verslepen. Terwijl je hem vasthoudt mag hij mint zijn, zoals nu; dat hoort bij het slepen en beweegt niet. Geen tweede teken ernaast.

Wat ik bewust niet doe: geen kleur per sport over de hele rij, geen balk met de zwaarte per dag, geen uitklappende dag, geen knoppen in de rij.

## 6. Voor de bouwer

Sporen, elk met een eigen einde. Wacht met spoor 2 en 3 tot `claude/week-na-gemiste-dagen` op main staat, anders botsen twee bouwers in `Week.tsx` en `WeekNotice.tsx`.

1. De waarheid en het ene getal (`engine/changeLog.ts`, alleen lezen van het log). Eerst naspelen met nagemaakte voorbeelden, dan: één venster als constante, de regels van hoofdstuk 3, de korte woorden, en het woord op de dagrij uit dezelfde uitkomst. Het log zelf wordt niet herschreven; oude voorstellen blijven staan zoals ze zijn. Einde: een nieuw testbestand `src/engine/changeLog.test.ts` (er is er nu geen; `weekChanges` komt alleen voor in `adviceEngine.test.ts`) en een invariant op de tekstkaart: het getal op de rij is het aantal regels in het blad en het aantal dagrijen met het woord.
2. De pagina (`src/pages/Week.tsx`, alleen weergave): de kaart met ring, tijd en bergkam eruit, het ene vak boven de dagen, de lijst onder de dagen, "Naar deze week" in de lucht. De bergkam gaat pas weg als Stand de belasting per dag toont (vraag 2).
3. De kaart Let op in de nieuwe vorm en de plek voor de volle week.
4. De dagrij (`WeekPlanner.tsx`): kleuren, één ding in de tweede regel, één ding rechts, de hoogte. Kijk eerst of `useWeekDrag`, `WeekDragGhost` of `useFlipList` met de hoogte van 64 px rekenen; ik heb dat niet nagelopen.
5. Aangepast door ASCEND als rij en blad; `ChangeLogCard` vervalt. Daarna de rij en weergave uit Je week tot nu.
6. Vrije dagen als rij en blad; Rustweek als rij en blad.

Wat niet mag bewegen:

- Slepen: `moveTo`, `decideMove`, `dragEligibility`, `useWeekDrag`, `dragHandlesShown`, het slot en Ongedaan maken, en de kenmerken waar het slepen op leunt (`data-session-row`, `data-week-day`, `data-drag-handle`, `data-period-rail`, `data-sheet-from`). `useVerticalDrag` is gedeeld met Ascend.
- Inhalen: `catchUpRows`, `writeCatchUp`, dat de oude rij verborgen is en de nieuwe "verplaatst van" zegt.
- Voorstellen en Akkoord: `planWeekFix`, `planWeekReplan`, `checkSwap`, `ProposalSheet`, `RescheduleDialog`. Niets verandert stil; Liever niet laat de melding staan. Een waarschuwing staat nooit achter een rij of een i: Let op blijft een kaart op het scherm.
- `engine/sessionStatus.ts`: gedaan blijft afgeleid uit een log. Geen vlag, geen log herschreven, `engine/logDay.ts` blijft alleen weergave.
- Het wijzigingslog: alleen lezen. Geen voorstel wordt aangepast of verwijderd om de lijst kloppend te maken.
- `src/storage/planGolden.test.ts`: er verandert niets aan de planning.
- De instellingen van Week (slepen, het horloge-teken, voorstellen bij Let op, de terugblik). Er komt geen keuze van de app bij, dus geen nieuwe instelling.

Testen:

- Nagemaakte voorbeelden voor spoor 1: Week opnieuw plannen dat een lange duurloop op dezelfde dag opnieuw neerlegt (geen regel); een voorstel dat van vrijdag naar zaterdag verplaatst (één regel); daarna zelf terug naar vrijdag (geen regel); zelf weg en terug naar zaterdag (de uitkomst die de bouwer kiest, vastgelegd); een echt extra training (één regel "erbij"); een Ongedaan maken (geen regel); een week in de toekomst.
- De standen van hoofdstuk 2: niets te melden, één punt, vier punten, de volle week na gemiste dagen alleen en samen met een ander punt, een voorstel dat wacht terwijl Let op het vak heeft, een rustweek, een voorbije week, een week zonder programma, een week met een periode.
- De dagrij: twee trainingen op één dag met en zonder "Beter niet op één dag", een rij met vijf dingen voor de tweede regel, vandaag, gedaan, gemist met greep, een vaste afspraak, een losse training.
- Vast: `npx vitest run src/engine/week src/engine/leaveWeek src/engine/catchUp src/engine/replanWeek src/storage/week src/storage/catchUp src/engine/changeLog src/components/sheetDrag`, daarna `npm run kaart:vergelijk` met elk verschil verklaard.
- Lookout op 360 en 390 px met vertraagde processor: zonder kaart alle zeven dagen boven de vouw, hoogstens één gevulde mint knop, elke amber plek een waarschuwing, hoogstens drie kopjes in beeld, geen tikdoel onder 44 px, en slepen, ruilen en inhalen werken zoals ervoor.

## 7. Het blad van een training in Week

Toegevoegd op verzoek van de coördinator, na een tweede afdruk van de eigenaar (Rustige duurloop, donderdag): een lang blad met zeven koppen in hoofdletters, drie vakjes, weer, route, kleding, uitleg en onderaan alleen Sluiten. De eigenaar: "Hier kun je echt helemaal niks mee."

### Wat ik vond

Extra gelezen: `src/components/SessionActionSheet.tsx`, `src/engine/sessionActions.ts`, `src/engine/guideMenu.ts` en het midden van `src/components/TrainingGuideSheet.tsx`. Niet gelezen: `TrainingBriefing.tsx`, `SessionHeader`, `MoveSuggestions`, `engine/briefing.ts`.

- Het blad op de afdruk is `TrainingGuideSheet`, het uitlegblad "Waarom deze training". De koppen Waarom, Zo voelt elk tempo en Wat het vraagt van je lichaam, de groepen uit `guideMenu` en de tekstknop Sluiten staan alleen daar.
- In de code die ik las opent een tik op een training in Week iets anders: `SessionActionSheet`, met één hoofdknop en de rijen Ruilen, Briefing, Vandaag al doen en Overslaan. Het uitlegblad opent daar pas achter de i in de kop. Hoe de eigenaar met één tik op het uitlegblad kwam kan ik uit de code niet opmaken; mogelijk tikte hij de i, of zijn versie loopt anders. De bouwer speelt dit eerst na.
- Het uitlegblad opent op vijf plekken met dezelfde inhoud: de missiekaart, de Briefing, dit blad in Week, het oude trainingsscherm en Forge.
- "Week 3 van 18" komt uit de kop van de training (de fase). "Week 3 van 4" is de regel onder de rij "Deze fase, week voor week" en telt de weken in `plan.weeks`. Twee tellingen onder één blad. Wat `plan.weeks` precies telt heb ik niet nagelopen.
- De twee balkjes bij Wat het vraagt van je lichaam zijn mint (`--color-action`), terwijl het geen actie en geen voortgang is.

### Wat de bladen zijn

Er zijn straks precies drie dingen voor één training, elk met één taak, volgens regel 8:

- Het blad in Week: deze training in je week. Vooruitkijken en schuiven. Hier beslis je wanneer.
- De Briefing: het ene scherm vooraf. Wat je doet, waar, en wat je regelt. Hier bereid je voor.
- Waarom deze training: het blad achter de i van de Briefing. Alleen de reden en de achtergrond. Hier lees je.

Het blad in Week legt de training niet uit en de Briefing verplaatst niets.

### Het blad in Week, van boven naar onder

Voor de Rustige duurloop van donderdag, bekeken op dinsdag:

- De kop (`SheetHeader`): het kopje "Do 12 november", de naam Rustige duurloop, en één regel met feiten: "Hardlopen, rustig · 50 min". Geen i meer bij een training te voet; de uitleg bereik je via de Briefing. Zo is er één weg naar de uitleg in plaats van twee.
- Eén gedempte regel, alleen als er iets te zeggen valt: waarom hij op deze dag staat, in één zin (`placeReason`). De uitklapknop "Waarom staat dit hier?" vervalt; is de zin te lang voor één regel, dan wordt het een rij "Waarom op donderdag" die een weergave in hetzelfde blad opent. De zin over een toegestaan paar en "Kan ook op de fiets" verhuizen naar de Briefing of het uitlegblad; ze gaan niet over schuiven.
- De hoofdknop, de enige gevulde mint knop: wat `sessionSheetActions` voor deze dag kiest. Voor een dag die nog komt is dat Verplaatsen. Op de dag zelf is het Briefing (als je horloge afvinkt) of Gedaan. Voor een overgeslagen training Toch doen.
- De lijst Andere keuzes (`SheetRows`), in de volgorde van de engine: Ruilen, Briefing met eronder de regel uit `briefingRowLine`, Vandaag al doen, Overslaan. Elke rij opent zijn eigen stap of scherm, zoals nu.

Alles daaronder (opwarmen, de versie-keuze, de horlogeregel) blijft zoals het is en alleen op de dag zelf. Dit blad is al kort; het wordt vooral strenger: geen i, geen uitklapper, geen zinnen die uitleg zijn.

Standen:

- Gedaan: de kop met "Gedaan · 48 min", de rij Training bekijken en Ongedaan maken, zoals nu.
- Voorbij en niet gedaan: de hoofdknop Gedaan opent het blad Hoe ging het?; Verplaatsen is de inhaal, zoals nu.
- Rustdag: de bestaande korte vorm.
- De oude rij van een inhaal: alleen het feit waar hij nu staat, geen acties, zoals nu.
- Niets laadt. Een verplaatsing of ruil die mislukt geeft de bestaande melding.

### Wat de Briefing opent

- In Week: de rij Briefing in dit blad voor een dag die nog komt, en de hoofdknop op de dag zelf als je horloge afvinkt. Dat is wat `sessionSheetActions` nu al doet voor een training buiten te voet.
- Op Vandaag: de knop op de missiekaart.
- Voor wat nog geen Briefing heeft (kracht, fietsen, binnen) blijft de rij "Hoe je het doet" naar het oude scherm, tot die trainingen hun eigen ontwerp krijgen. Dat valt buiten dit voorstel, net als in het ontwerp van het trainingsscherm.

### Waarom deze training, het blad achter de i

Dit blad houdt alleen wat nergens anders staat. Van boven naar onder:

- De kop: het kopje met de soort ("Hardlopen, rustig"), de naam, en het kruis. Dit is het enige kopje in hoofdletters.
- De reden, één alinea in gewone inkt, zonder kop erboven: de titel van het blad zegt al dat dit het waarom is.
- Eén regel "Vraagt van je lichaam" in de rijvorm: links het vaste woord gedempt, rechts "Benen licht · conditie gemiddeld". Geen balkjes.
- Eén lijst zonder kopjes: Te zwaar? Zo pas je het aan; De stappen (alleen bij een training met stappen); Deze fase, week voor week; Achtergrond en bronnen. De rij over de fase krijgt geen eigen weektelling eronder; het blad erachter markeert de huidige week.

Wat eruit gaat, en waar het blijft:

- De drie vakjes (50 min, Zone 2, Praten kan), de zin onder de titel en "Week 3 van 18": staan in de hartkaart en de kop van de Briefing.
- Zo voelt elk tempo: wordt het blad Zones achter de zonebalk in de Briefing.
- De weerregel, Route voorstellen en de drie regels kleding: staan in de Briefing (de rij Weer en de kaart met je lus).
- Waar en waarmee: de keuze Waar train je staat in de Briefing; de pagina met plekken open je daar.
- De koppen Waarom, Wat je doet, Waar en waarmee en Achtergrond, en de tekstknop Sluiten. Het kruis en de terugknop sluiten.

Geteld tegen de afdruk: zeven koppen in hoofdletters naar één, zone 2 en praten van drie keer naar nul (ze wonen in de Briefing), twee weektellingen naar geen, en het blad past op één scherm.

Wat ik bewust niet doe: geen knoppen om te verplaatsen in het uitlegblad, geen uitleg in het blad van Week, geen derde scherm, en geen wijziging aan wat `sessionSheetActions` kiest.

### Voor de bouwer

- Spoor 7: het blad in Week strenger (`SessionActionSheet.tsx`, alleen weergave). De i vervalt alleen waar een Briefing is; anders blijft hij.
- Spoor 8: het uitlegblad korter (`TrainingGuideSheet.tsx` en `engine/guideMenu.ts`). Dit blad opent op vijf plekken; de wijziging is dus zichtbaar op Vandaag, in de Briefing, in Week, in het oude scherm en in Forge. Voor kracht en Forge, waar nog geen Briefing is, mogen de delen die daar nergens anders staan pas weg als ze een ander thuis hebben. Doe dit spoor na of samen met de sporen van de Briefing uit `docs/visie/Ontwerp trainingsscherm minimaal.md`, anders verdwijnt iets voordat het zijn nieuwe plek heeft.
- Niet bewegen: `engine/sessionActions.ts` (welke knop en welke rijen), de stappen Verplaatsen, Ruilen en Gedaan, `askAlways` bij Verplaatsen, het inhalen, en alles wat een log schrijft.
- Testen: het blad voor een dag die komt, vandaag met en zonder horloge dat afvinkt, voorbij, overgeslagen, gedaan, rustdag, de oude rij van een inhaal, kracht in MacroFactor en kracht in ASCEND. Het uitlegblad vanaf alle vijf de plekken. `npx vitest run src/engine/sessionActions src/engine/guideMenu src/components/sheetDrag` (welke daarvan bestaan heb ik niet nagekeken) en de tekstkaart.

## Samenvatting

Het blad van een training in Week blijft het korte blad om te schuiven, zonder i en zonder uitleg; de Briefing opent via de rij of de hoofdknop; het lange uitlegblad van de afdruk wordt een kort blad Waarom deze training achter de i van de Briefing.

Week wordt de lucht, hoogstens één kaart als er iets moet, de zeven dagen, en één lijst met rijen. De ring, de tijd en de bergkam gaan naar Je week tot nu en Stand. De twee mint knoppen, de tekstknop, de kaart met aanpassingen en de kaart met vrije dagen worden rijen in dezelfde vorm. Mint is alleen nog "Bekijk voorstel" en het vinkje. In de dagrij verdwijnen de gekleurde woorden en staat rechts één ding. Wat ASCEND aanpaste krijgt één thuis in Week, één venster en regels die alleen zeggen wat de app echt veranderde. Het verschil tussen 3 en 4 komt uit twee vensters (14 en 7 dagen) op dezelfde functie, maar verklaart de afdruk niet volledig; dat moet eerst nagespeeld worden. Geen nieuwe kleur, token of instelling, en slepen, inhalen, voorstellen, logs en de planning bewegen niet.

## Vragen

1. Wat ASCEND aanpaste: thuis in Week, en weg uit Je week tot nu? Mijn advies: ja. Het gaat over de planning, het werkt ook voor een week die nog komt, en in Je week tot nu is de rij voor oudere weken toch altijd leeg.
2. De ring, de tijd en de bergkam uit Week? Mijn advies: ja, met één voorwaarde. De ring en de tijd staan al in Je week tot nu en worden de regel onder die rij. De bergkam gaat pas weg nadat is nagekeken dat Stand de belasting per dag toont; anders verhuist hij eerst.

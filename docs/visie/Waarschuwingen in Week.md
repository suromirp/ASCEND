# Waarschuwingen in Week

Ontwerp van Cartographer. Geen code. Status: voorstel, wacht op de eigenaar.

Aanleiding: de eigenaar zag in Week amber driehoekjes naast Benen A, Lange duurloop en Heuvelsprints en afdalen, en zei: "Dat icoontje is niet duidelijk genoeg en ik had in dit scenario wel een voorstel verwacht." Na een geaccepteerd voorstel had de week geen rustdag meer. Hij wil in één oogopslag zien wat er aan de hand is.

## 1. Wat er nu gebeurt

Het driehoekje is geen waarschuwing. Het is `LegMark` in `src/components/WeekIcons.tsx`, en `SessionRow` in `src/components/WeekPlanner.tsx` zet hem achter elke training waarvoor `isLegHeavyTemplate` waar is: een zware beendag. Dat zijn Benen A, de lange duurloop en de heuvelsprints. De enige uitleg staat in de legenda van de bergkam (`WeekRidge.tsx`, "zware beendag"), een scherm hoger. In de rij zelf zegt alleen een onzichtbare schermlezertekst wat het is. De eigenaar leest amber en een driehoek als "let op", en dat is ook wat `--color-warning` overal elders in de app betekent. Het icoon liegt dus.

Een tik op de driehoek doet niets. Een tik op de rij opent het gewone actieblad van die training (`SessionActionSheet`), zonder woord over het driehoekje.

De echte bevindingen van de weekcontrole (`validateWeeks` in `src/engine/weekValidator.ts`) komen nergens in beeld. Na elke planningsrun blijven ze achter in `PlanPassResult.remaining`, en `src/storage/database.ts` (rond regel 1516) schrijft ze alleen met `console.info` weg. Er is dus geen scherm dat zegt: je week klopt niet.

Er is ook een gat in de regel zelf. REST-DAY meldt alleen een training op je rustdag als die van het systeem is of een test of wedstrijd (`level(s) >= 2`). Een training met een slot, dus iets wat jij verplaatste of wat een geaccepteerd voorstel vastzette (niveau 1), levert geen bevinding op. Een week zonder rustdag na een geaccepteerd voorstel is daarom voor de controle onzichtbaar. Dat verklaart het scenario van de eigenaar.

Samengevat: wat er wel amber staat zegt niets over een probleem, en wat er mis is zegt niemand.

## 2. Uitgangspunten

Amber betekent in Week voortaan alleen "hier klopt iets niet". Een zware beendag is informatie en wordt gedempte tekst, geen kleur.

Eerst één regel bovenaan die het probleem in woorden zegt, daarna per training een korte tekst die de regel aanwijst, en daarna pas de lijst. Geen icoon dat uitleg nodig heeft.

Als de controle het zelf niet mag herstellen omdat een slot in de weg zit, doet ze niets stil. Ze toont het probleem en doet een voorstel met Akkoord, met de herstelling die ze anders zou doen. Liever niet laat de week zoals hij is, en de melding blijft rustig staan.

Alles wat de planning verandert gaat via de bestaande `ProposalSheet`, nooit direct.

## 3. Week, van boven naar beneden

De opbouw van de pagina blijft zoals hij is, met twee toevoegingen: een meldingskaart en een andere tekst in de rij.

Eerst `SkyBand variant="low"` met de titel "Week 12" en de pijltjes, ongewijzigd.

Dan, alleen als er iets mis is, de meldingskaart `WeekNotice` (nieuw, in `src/components/`). Hij staat direct onder de lucht en boven de voortgangskaart met de ring, zodat hij zonder scrollen zichtbaar is. Hij is gebouwd uit bestaande onderdelen: `Card` (zonder `texture`), `Eyebrow` met `tone="var(--color-warning)"`, `PrimaryButton`, `TextButton`. Opbouw:

Een `Eyebrow` met de tekst "Let op", amber.

Een kopregel van 16 px in `--color-ink`, de ene zin die het probleem zegt.

Eronder een regel van 14 px in `--color-ink-dim`, het droge feit erbij.

Onderaan `PrimaryButton` "Bekijk voorstel", het enige gevulde mint van dit scherm. Zonder voorstel (zie de standen) staat er geen knop.

Bij meer dan één probleem is de kopregel "Deze week heeft 2 punten die niet kloppen." en volgen de punten als korte regels van 14 px, elk met zijn eigen feit, hoogstens drie. Bij meer dan drie staat onder de derde "en nog 2" als `TextButton` die een onderblad (`Sheet`) opent met de hele lijst. Geen uitklapblok. Eén knop "Bekijk voorstel" opent het eerste voorstel; staan er meer voorstellen, dan toont het blad ze één voor één en na elk Akkoord of Liever niet het volgende.

Dan de bestaande kaarten Rustdag en Extra training (de adviezen van `REST-PULL` en dergelijke), voortgangskaart met ring en bergkam, de lijst, en de knoppen eronder. Niets daarvan verandert, behalve de rij.

De rij (`SessionRow`) verliest het amberen driehoekje. In de tweede regel, waar nu "Wo 4 · 60 min" staat, komt achter de duur een korte tekst. Zijn er geen problemen, dan staat er alleen "zware benen" in `--color-ink-dim` bij een zware beendag, zodat je het verschil ziet zonder dat het schreeuwt. Is er een probleem, dan staat er in plaats daarvan of erbij een tekst in `--color-warning`, 12 px, zoals de teksten "aangepast" en "verplaatst" nu al staan. Voorbeeld: "Wo 4 · 60 min · 1 dag na Lange duurloop". De regel mag omslaan naar een tweede regel; de rij is al `flex-wrap`.

Een tik op een rij met een probleem opent het gewone actieblad. Bovenaan dat blad komt dezelfde tekst als in de rij, in een volledige zin, met onder de zin dezelfde knop "Bekijk voorstel". Zo hoort de uitleg bij de plek waar je tikt.

De legenda van de bergkam heet nu "zware beendag" met een amber driehoekje. Dat driehoekje wordt `--color-ink-dim`, zodat amber in Week nergens meer een andere betekenis heeft. Zie de vragen.

## 4. De meldingen per bevinding

Elke bevinding krijgt drie teksten: de regel in de kaart, de korte tekst in de rij en, waar een voorstel kan, de tekst van het voorstel. De voorbeelden gebruiken namen en dagen uit de schermafdruk. De werkelijke zinnen komen uit het rapport van de controle (de `message` in de bevinding is nu één zin voor de console; er komt een aparte, gestructureerde tekst bij).

De stem is die van `docs/beslissingen/2026-10-27-stem-van-ascend.md`: het droge feit eerst, één zin, "je" waar het past, geen uitroepen, geen humor bij een probleem.

REST-DAY, de week heeft geen vrije dag. Kaart: "Deze week heeft geen rustdag." Feit: "Op elke dag staat een training." Rij, bij de training op je rustdag: "op je rustdag". Voorstel, titel: "Je week heeft geen rustdag". Effect, eerste optie: "Lange duurloop gaat van maandag 2 naar dinsdag 3, bij Bovenlichaam A. Maandag is dan vrij." Tweede optie: "Laat Rustige duurloop op donderdag 5 gaan. Dan heb je donderdag vrij." Uitleg: "Een rustdag is er om te herstellen. Deze training stond er door een voorstel dat je accepteerde, daarom vraagt ASCEND het eerst." De eerste optie komt alleen als je tijd voor die dag het toelaat (`dailyTimeBudget`); de tweede kiest de lichtste training zonder rol als lange duurloop, test of wedstrijd, en komt nooit voor een zware beendag, een harde loop of een tocht. Is er niets wat zonder pijn kan vervallen, dan is er geen voorstel en staat er alleen de melding.

REST-DAY, er zijn wel andere vrije dagen. Kaart: "Je rustdag heeft een training." Feit: "Lange duurloop staat op maandag 2, je rustdag." Rij: "op je rustdag". Voorstel: "Lange duurloop gaat van maandag 2 naar dinsdag 3. Maandag is weer vrij." De dag die het verst van andere zware dagen ligt gaat voor; dat is dezelfde keus als `relocate` in de weekcontrole.

LEG-SPACING. Kaart: "Benen A en Lange duurloop liggen te dicht op elkaar." Feit: "Er zit 1 dag tussen, liefst 2 voor dezelfde spieren." (de eis van 48 uur tussen zware beendagen). Rij, bij beide trainingen: "1 dag voor Lange duurloop" en "1 dag na Benen A". Voorstel: "Benen A gaat van woensdag 4 naar vrijdag 6. Dan zit er 48 uur tussen." Als twee kanten mogelijk zijn, staan er twee opties: de latere schuift, of de eerdere. Vindt de controle geen dag die beter is, dan komt er geen voorstel en zegt de kaart: "ASCEND vond deze week geen dag die beter past." Heuvelsprints en lange duurloop op twee opeenvolgende dagen blijft een bewuste keus van het programma en wordt niet gemeld (`isIntentionalBackToBack`, zo doet `findHeavyConflicts` het al).

TWO-HARD-RUNS. Kaart: "Twee harde loopjes op donderdag 5." Feit: "Heuvelsprints en afdalen en Tempoloop staan op dezelfde dag." Rij: "tweede harde loop". Voorstel: "Heuvelsprints en afdalen gaat van donderdag 5 naar vrijdag 6. Dan heb je één harde loop per dag."

AFTER-TEST. Kaart: "De dag na je testloop staat een zware training." Feit: "Benen A staat op zondag 8, een dag na je testloop op zaterdag 7." Rij: "dag na je testloop". Voorstel: "Benen A gaat van zondag 8 naar dinsdag 10. Na een testloop krijgt je lijf een dag zonder zwaar werk." Waar de testloop zelf al een voorstel heeft (TEST-MAKE-ROOM in `adviceEngine.ts`), toont de kaart dat voorstel in plaats van een tweede, zodat er nooit twee voorstellen voor dezelfde training staan.

ONE-LONG. Kaart: "Deze week staan twee volle lange trainingen." Feit: "Lange duurloop op maandag 2 en op zondag 8, allebei de volle lengte." Rij, bij de latere: "tweede lange training". Voorstel: "Lange duurloop op zondag 8 wordt de korte versie, 45 minuten. De eerste blijft zoals hij is." Dit is het enige voorstel dat een lengte verandert in plaats van een dag.

TEST-FRESH. Kaart: "Je benen zijn nog niet fris genoeg voor je testloop." Feit: "Op zaterdag 7 is je beenindex 13,2. Fris is 12 of lager. De beenindex zegt hoe zwaar je benen de laatste dagen belast zijn." Rij, bij de test: "benen niet fris", bij de zwaarste training ervoor: "weegt zwaar voor je test". Voorstel komt uit TEST-MAKE-ROOM waar dat er al is. Is er geen, dan: "Benen A op woensdag 4 wordt de korte versie, 40 minuten. Je beenindex op zaterdag gaat van 13,2 naar 11,4." De ProposalSheet toont die index al stil bij het verplaatsen van een zware dag (`moveLegNote`); die regel wordt hier hergebruikt.

De andere regels van de controle (DAY-FULL, DUPLICATE, WEEK-START, GOAL-DAY, TEST-DAY, AFTER-GOAL, LEAVE-OFF, LEAVE-LIGHT) lopen door dezelfde machine, maar komen in een latere stap. Eerst de zes die de eigenaar zal tegenkomen.

## 5. Hoe het voorstel ontstaat

Alles in `engine/`, puur, met tests.

Nieuw: `src/engine/weekConcerns.ts` met `weekConcerns(input, weekStart)`. Hij draait `validateWeeks` voor die ene week (de tweede parameter `onlyWeeks` bestaat al), groepeert de bevindingen en geeft per bevinding de drie teksten uit het vorige hoofdstuk terug. Alleen toekomstige dagen en alleen de getoonde week; een verleden week meldt niets.

Aanpassing in `weekValidator.ts`: een optie `CheckInput.reportYours` (standaard uit). Aan, dan meldt REST-DAY ook een training met een slot. Uit, dan verandert er niets, dus `planGolden.test.ts` blijft staan en `leaveBlock.ts` telt dezelfde bevindingen als nu.

Aanpassing in `repairWeeks`: een optie `CheckInput.mayMove`, een lijst met id's van trainingen met een slot (niveau 1) die mogen schuiven. `movable` en het filter op `f.level === 3` accepteren dan ook die id's. Niveau 0 (verleden, gedaan) en niveau 2 (test, wedstrijd) blijven onaantastbaar. Hiermee doet de controle voor één bevinding dezelfde herstelling als altijd, maar op de training die jij of een voorstel vastzette.

Nieuw: `src/engine/weekFixProposal.ts` met `planWeekFix(input, concern)`. Het zet `mayMove` op de training die de regel zou aanpassen (`Finding.subjectId`, bij LEG-SPACING ook de partner voor de tweede optie), draait `repairWeeks` en vergelijkt het resultaat met het opgeslagen plan, zoals `planRestDayChange` in `restDayProposal.ts` dat al doet. Het verschil wordt een `PlanChangeProposal` met `PlanChangeItem`s. Een item zonder `restore`, zodat de verplaatste training weer een slot krijgt zoals elke andere geaccepteerde wijziging. Het voorstel wordt alleen gedaan als de week er aantoonbaar beter van wordt: minder bevindingen en geen nieuwe, dezelfde maat als `judge` in `repairWeeks`.

Het voorstel gaat als `Advice` (`ruleId: 'WEEK-CHECK'`, `trigger: 'plan_update'`) door `ProposalSheet`, dus Akkoord en Liever niet lopen langs `respondToAdvice` in `AppDataContext`. Het id bevat de regel, de id's van de trainingen en hun datums, bijvoorbeeld `weekfix:REST-DAY:ses_14:2026-11-02`. Verandert er iets in de week, dan is het een ander id en komt het voorstel opnieuw; hetzelfde voorstel dat je weigerde komt niet terug. De voorvertoning (`previewProposal`, `planPreviewPass`) draait zoals bij elk voorstel de rest van de planningsrun erover, zodat "Zo ziet je week eruit" klopt met wat je krijgt.

Waar het gebeurt: in `AppDataContext` komt een `useMemo` die `weekConcerns` en `planWeekFix` voor de getoonde week draait, op dezelfde invoer als `planPreviewPass` (rustdag, tijd per dag, vakanties, doelen). Week leest dat en toont de kaart en de rijen. De dagelijkse sync verandert niet.

## 6. Standen

Leeg: klopt de week, dan staat er niets. Geen "alles goed"-kaart; de kaart verschijnt alleen met een reden, zoals Vandaag dat ook doet. De rij toont alleen de gewone gedempte tekst.

Laden: de gegevens zijn lokaal, dus er is geen wachtstand. Tot de plannen geladen zijn staat de kaart er niet; hij verschijnt zodra `useAppData` de sessies heeft, zonder verspringen van de lijst eronder (de kaart staat boven de ring, dus eenmalig wordt de pagina iets langer; dit moet Lookout op 360 en 390 px bekijken).

Fout: gooit de controle of de voorstelberekening een fout, dan wordt dat gelogd en toont Week alleen de gewone lijst. De pagina start nooit op een leeg scherm. Kan het voorstel niet worden berekend of vindt het geen betere dag, dan staat er wel een kaart, zonder knop, met de eerlijke regel "ASCEND vond deze week geen dag die beter past."

Liever niet: de kaart blijft, maar rustiger. De `Eyebrow` wordt "Let op" in `--color-ink-dim`, de knop "Bekijk voorstel" verdwijnt, de kopregel en het feit blijven. Daaronder een `TextButton` "Toch een voorstel". De tekst in de rij blijft amber, want het probleem is er nog. Weigeren verbergt dus een voorstel, nooit het probleem.

Akkoord: het voorstel wordt toegepast zoals elk voorstel, met de melding "Planning bijgewerkt" en ongedaan maken (`ChangeNotice`). De kaart verdwijnt zodra de bevinding weg is.

## 7. Instelling

Alles is instelbaar, en een nieuwe functie zonder instelling is niet af. Naam: "Voorstel bij een probleem in de week". Aan is het advies. Eén zin uitleg achter de InfoButton: "Staat er in je week iets wat niet klopt en mag ASCEND het niet zelf herstellen, omdat jij of een eerder voorstel de training vastzette, dan krijg je een voorstel met Akkoord." Korte punten: wat telt als probleem (geen rustdag, zware beendagen te dicht op elkaar, twee harde loopjes op een dag, een zware training na een test, twee volle lange trainingen, benen niet fris voor een test); dat Liever niet de week laat zoals hij is; dat ASCEND nooit stil iets verschuift.

Uit betekent: de kaart en de teksten in de rijen blijven, want dat is informatie, maar er komt geen knop "Bekijk voorstel".

Waar het moet komen volgens de werkafspraken: `AppSettings.weekFixProposal` in `src/storage/database.ts` (afwezig telt als aan, zoals `newTestOnStops`), een regel in `PlanningGroup.tsx` (`SummaryRow`, id "weekvoorstel", waarde Aan of Uit), een uitleg in `src/data/settingsHelp.ts`, een ingang in `settingsIndex.ts` en `settingsLayout.ts`, de waarde in `engine/settingsSummary.ts`, een regel in `engine/settingsDiff.ts`, en de sleutel in de lijst van `storage/backup.ts` zodat de keuze meegaat in de back-up.

## 8. Een kleine eerste bouwstap

Stap 1, zonder voorstel en zonder instelling, klein en veilig:

Haal `LegMark` uit `SessionRow` en zet "zware benen" in `--color-ink-dim` in de tweede regel. Kleur het driehoekje van de legenda in `WeekRidge` om naar `--color-ink-dim`.

Voeg `reportYours` toe aan `CheckInput` en laat REST-DAY dan ook niveau 1 melden. Test: een week met alle zeven dagen vol en een slot op de rustdag meldt REST-DAY; zonder de optie niets, en `planGolden.test.ts` verandert niet.

Schrijf `weekConcerns.ts` met de kaartregel, het feit en de rijtekst voor de zes bevindingen, plus tests per regel met de voorbeeldzinnen uit dit document.

Bouw `WeekNotice` en de rijtekst in amber. Controle: Lookout op 360 en 390 px, en een screenshot van Week met de week van de eigenaar nagebootst.

Stap 2: `mayMove`, `planWeekFix`, de `Advice` met `ProposalSheet`, en de instelling met alle plekken uit hoofdstuk 7. Stap 3: de zin in het actieblad van een training, de koppeling met TEST-MAKE-ROOM bij AFTER-TEST en TEST-FRESH, en de overige regels. Bij aanname schrijft de coördinator het besluit in `docs/beslissingen/`.

## 9. Wat dit bewust niet doet

Geen nieuw icoon voor een waarschuwing en geen losse driehoekjes meer; tekst legt uit.

Geen stille herstelling van wat jij of een voorstel vastzette. Zonder Akkoord verandert er niets.

Geen melding voor verleden weken en niet voor weken die je niet bekijkt; geen teller of badge op het tabje Week.

Geen kaart "alles goed" en geen groene bevestiging.

Geen tweede voorstel naast een bestaand voorstel (TEST-MAKE-ROOM, TEST-RETRY) voor dezelfde training.

Geen melding voor de bewuste combinatie van heuvelsprints en lange duurloop op twee dagen achter elkaar.

Geen nieuwe kleur, geen nieuw onderdeel buiten `WeekNotice` en alleen tokens uit `src/index.css`.

Geen uitklapblok: het derde en verdere punt gaat naar een onderblad.

## Samenvatting

Het amberen driehoekje in Week is geen waarschuwing maar het merkteken van een zware beendag (`LegMark`), met alleen een legenda een scherm hoger als uitleg. De echte bevindingen van de weekcontrole worden niet getoond: ze gaan naar de console. Bovendien meldt REST-DAY geen training met een slot, en dat is precies het geval van de eigenaar.

Het ontwerp: het driehoekje verdwijnt, zware beendagen krijgen gedempte tekst, amber betekent voortaan alleen een probleem. Boven de lijst komt één kaart "Let op" met de ene zin die zegt wat er mis is, en elke betrokken training krijgt een korte tekst in de rij. Kan de controle het niet zelf herstellen vanwege een slot, dan komt er een voorstel met Akkoord in dezelfde `ProposalSheet`, met de herstelling die de controle anders zou doen. Liever niet laat de week staan en de melding blijft rustig zichtbaar. Een instelling "Voorstel bij een probleem in de week" staat standaard aan.

## Vragen voor de eigenaar

1. Moet een training die jij zelf op je rustdag zette ook een melding en voorstel geven, of alleen een training die door een voorstel of de planning daar kwam? Mijn advies is allebei, met Liever niet als rustig antwoord, omdat de controle het verschil toch niet kan zien.

2. In een week waarin elke dag vol zit, is de enige herstelling een training laten vervallen of twee op een dag zetten. Vind je het goed dat ASCEND dat voorstelt, met de lichtste training als eerste keus (nooit een lange duurloop, harde loop, test of tocht)?

3. De kaart staat bovenaan, onder de lucht en boven de voortgangskaart. Liever lager, direct boven de lijst? Bovenaan zie je het in één oogopslag, maar hij schuift de ring en de bergkam naar beneden zolang er een probleem is.

4. De zware beendag blijft bestaan als gedempte tekst "zware benen" in de rij en als gedempt driehoekje in de bergkam. Of liever helemaal weg uit de rij en alleen in de bergkam?

5. Moet de melding ook op Vandaag komen als het probleem binnen twee dagen speelt, als één stille regel? Dat is nu niet ontworpen.

6. Mag de melding in Week ook uit, los van het voorstel (een tweede instelling), of is een kaart die er alleen is als er echt iets mis is altijd goed?

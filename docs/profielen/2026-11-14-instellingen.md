# Profiel: de instellingen-draaier

Lookout en Pathfinder, 14 november 2026, tweede ronde. Chromium op 412 px, 4x vertraagde processor, echte touch, klok vast met Playwright `page.clock` (Europe/Amsterdam), build van origin/main (versie 14 nov, 17:33). Alles nagemaakt, geen back-up van de eigenaar. Schermafdrukken staan in de scratchpad, niet in de repo.

Wat ik deed: een lege app, Nieuw beginnen met Fit blijven en de rest op het advies, Akkoord. Week 1 (16 tot 22 november): een krachttraining, een rustige duurloop en een lange duurloop gelogd. Week 2 (vanaf 23 november): instellingen één per keer omgezet vanaf dezelfde stand, steeds met een eigen controle op Vandaag, Week of het zoekveld. Daarna vijf instellingen tegelijk, Alles terug naar het advies, export, wissen en importeren.

Eerlijke grenzen: de twee weken zijn geen twee volle weken dagelijks gebruik. Week 1 heeft drie logs, week 2 heb ik op maandag en dinsdag bekeken. De sets in Forge heb ik niet echt ingevuld (de training stond op 0 van 23 sets, 75 min). Dat valt buiten de vraag, maar het betekent dat ik Opwarmset later dempen alleen aan de instelling zelf heb kunnen toetsen.

## Moet

**Alles terug naar het advies verandert de planning stil, en de melding zegt dat er niets verandert.**
- Scherm: Instellingen, Gegevens en back-up, Aangepaste instellingen, Alles terug naar het advies, Terugzetten.
- Wat ik zag: op een verse app staat daar al "1" (zie het eerste Mag). Zet ik die terug (Beginnersstart van Nee naar Automatisch), dan krijgt de melding de tekst "Alle instellingen: terug naar het advies. Je planning hoeft niet te veranderen." Maar Week toont daarna de Rustige duurloop op 35 min in plaats van 55 en de Lange duurloop op 60 min in plaats van 95. Er kwam geen voorstel met Akkoord, alleen een melding met Ongedaan maken. Dezelfde klok, dezelfde stand zonder terugzetten: 55 en 95.
- Wat ik verwachtte: een instelling die de lengte van trainingen verandert, gaat via een voorstel met Akkoord, of de melding zegt wat er veranderde. In elk geval niet "hoeft niet te veranderen".
- Waar: `src/components/settings/useAdviceReset.tsx:25-28` (alleen een voorstel als `planTitles` gevuld is, anders alleen `updateSettings`), `src/engine/settingsDiff.ts:175` (beginnersstart staat als planinstelling), `src/engine/horizonChange.ts:117` (de zin als er geen verschil geteld is). Ik heb niet kunnen vaststellen of de verkorting direct bij het terugzetten gebeurt of bij de eerstvolgende planningsronde bij het openen; het gevolg is hetzelfde. Wel zeker: de zin klopt niet met wat er daarna in Week staat.
- Naspelen: klok dinsdag 24 november 2026 07:30. Lege app, Nieuw beginnen, Fit blijven, Volgende vier keer, "Nee, ik sport geregeld", Bekijk je plan, Akkoord. Gegevens en back-up, Aangepaste instellingen, Alles terug naar het advies, Terugzetten. Kijk naar Week, donderdag en zondag.
- Dit raakt de regel "alles wat de planning inhoudelijk verandert is een voorstel met Akkoord, nooit stil".

**In het zoekveld staat bij 189 van 281 instellingen de waarde van een andere rij.**
- Scherm: Instellingen, zoekveld. Zoek "vragen na je loop".
- Wat ik zag: het resultaat zegt "Vragen na je loop, Vandaag en meldingen, Alles". In het blad Kaarten op Vandaag staat dezelfde instelling op "Kort". Zo ook "Opwarmset later dempen, Forge, Advies" terwijl de schakelaar in het blad Bij het invullen op Uit kan staan, en "Kledingadvies, 11 van 11 aan" terwijl alleen dit ene net uit is. Het zoekresultaat leest de waarde van de rij waarin het blad opent, niet van de instelling zelf.
- Wat ik verwachtte: de eigen waarde van de gezochte instelling, of geen waarde.
- Waar: `src/pages/settings/SettingsOverview.tsx:119` roept `searchValue(placement.row, facts)` aan; bij een instelling in een blad is `placement.row` het ouderrij-id (`src/data/settingsLayout.ts:155`, `inSheet`). Ik telde 189 van de 281 instellingen in de index met een andere rij dan hun eigen id.
- Naspelen: stand na Beweging en Kledingadvies uit; Instellingen, zoek "kledingadvies": de waarde bij het resultaat is die van Weer en kleding.

## Mag

**Wie nog niets instelde, ziet al "Aangepaste instellingen 1".**
- Scherm: Gegevens en back-up, op dag 1 en op Instellingen.
- Wat ik zag: het blad zegt "Dit koos je zelf anders dan het advies" met Beginnersstart, "nu Nee, advies Automatisch". Dat is het antwoord op de startvraag over weinig sporten, niet een instelling die ik opende. Alles terug naar het advies zet dat antwoord terug en leidt tot het Moet hierboven.
- Verwacht: een antwoord uit de start telt niet als afwijking, of het blad zegt waar het vandaan komt.
- Waar: `src/engine/settingsDiff.ts:175`.

**Opwarmset later dempen zegt "Gedempt, met één zin waarom" ook als hij uit staat.**
- Scherm: Forge, Geavanceerd, Bij het invullen.
- Wat ik zag: schakelaar uit (aria-checked false), de regel eronder blijft "Gedempt, met één zin waarom".
- Verwacht: de regel volgt de schakelaar (bijvoorbeeld "Elke opwarmset staat erbij").
- Waar: `src/engine/settingsSummary.ts:604`: `sub` hangt alleen aan `warmupScope`, niet aan `warmupMuted`.
- Of Uit ook in de training werkt, kon ik niet zien: Bovenlichaam A heeft geen opwarmset op een al warme beweging (5 W-sets aan en uit), en Benen A staat niet in de week van dit profiel.

**Kracht uitzetten kan nergens.**
- Scherm: Doel en tochten, Zonder doel, Weekbudget, Keer kracht per week.
- Wat ik zag: Minder keer kracht stopt bij 1 (bij Sterker worden bij 2). Forge, Kracht meerekenen op Uit laat Bovenlichaam A gewoon in de week staan met Training starten; de instelling gaat alleen over de voorstellen per oefening. De startvraag "Wil je ook krachttraining?" is daarna niet meer te veranderen.
- Verwacht: een weg naar nul, of een zin die zegt dat dat niet kan.
- Waar: `src/components/settings/groups/WeekBudgetSheet.tsx:73`. De rij zelf heet "Kracht meerekenen" terwijl de zoeknotitie bij `forge` (`src/data/settingsIndex.ts:48`) nog over MacroFactor spreekt; dat leest als "kracht aan en uit".

**Eenheden en UV bestaan niet als instelling.**
- Wat ik zag: zoeken op "eenheden" of "mijl" vindt niets; alles is kg en km. Zoeken op "uv" vindt Heuvels en trappen in de buurt (de letters zitten in "heuvels") en Benen en een zware loop. UV zit alleen in Kledingadvies (`src/engine/clothing.ts:129`), "zonnebrand" vindt dat wel.
- Verwacht: als dit bewust zo is, geen actie. Maar de opdracht verwachtte beide. Een zoekwoord "uv" en "zon" bij Kledingadvies in `src/data/settingsIndex.ts` kost één regel.

**Acht rijen hebben geen uitleg-knop.**
- Gemeten in de DOM: Zonder doel (`DoelGroup.tsx:62`), Opwarmen per (`ForgeGroup.tsx:59`), Weergave op Forge (`ForgeGroup.tsx:60`), Signalen uit je gegevens (`LichaamGroup.tsx:37`), Ochtend begint om en Dag van de terugblik (`VandaagGroup.tsx:119,121`), Model bij Datavelden (`KoppelingenGroup.tsx:169`), Ruimte van reeksen (`GegevensGroup.tsx:48`). De regel "elke instelling één zin uitleg" geldt hier niet. Bij de overige rijen opent de uitleg een blad met een zin en twee of drie punten (`src/data/settingsHelp.ts:6`), dus meer dan één zin; de werkafspraak en het besluit zeggen iets anders. Kies één van de twee.

**Vragen na je loop staat in het blad Kaarten op Vandaag.**
- Wie na een loop zoekt naar de vragen, opent bij het zoekresultaat het blad Kaarten, waar ook Weekterugblik, Citaat en Geluid staan. Het zoekveld brengt je er goed heen; zonder zoekveld zoek je een vraag onder Kaarten. Pathfinder: een eigen rij of de naam "Vragen en kaarten" zou het vindbaar maken.

**Normaal heeft een lus van 4 seconden op Vandaag.**
- Met Beweging op Normaal draait `mx-breathe` oneindig (`src/index.css:980`). De designregel zegt "geen lus". Rustig en Uit hebben op Vandaag geen lopende animatie meer (zie Goed). Bedoeld zijn ze waarschijnlijk, maar CLAUDE.md en de code spreken elkaar tegen.

**Na Ja, alles verwijderen blijf je op Gegevens staan.**
- Scherm: Gegevens en back-up, Alles verwijderen. Er zijn twee bevestigingen (Verwijderen, daarna Ja, alles verwijderen), goed. Daarna sluit het blad, maar het scherm blijft de instellingen tonen met standaardwaarden; Welkom verschijnt pas na het openen van de app opnieuw. Er is geen melding dat het gelukt is.

**Zoekresultaat Vanzelf afvinken en Vragen na je loop in één lijst.**
- Een zoekopdracht op "vanzelf afvinken" geeft ook Gebruik van je horloge en Vragen na je loop. Vanzelf afvinken zelf zegt "Zichtbaar zodra Garmin is gekoppeld, Verborgen" en de sprong landt op Koppelingen met diezelfde zin. Dat werkt goed. Ik kon het effect niet toetsen: koppelen heeft netwerk nodig.

## Goed

- Rustdag naar woensdag: eerst een voorstel met per dag wat verschuift, pas na Akkoord verandert er iets. Daarna staat de week goed, de rij zegt "Rust wo", en er is een melding met Ongedaan maken.
- Beweging: de rij zegt meteen de juiste waarde. Gemeten met `document.getAnimations()` op zes schermen: Uit heeft nul animaties, Rustig geen lopende, Normaal alleen de adem op Vandaag. `<html data-motion>` volgt de keuze direct.
- Ochtendkaart uit: de ochtendvraag wordt een regel bij Je dag, zoals de uitleg zegt, en komt weer terug als hij aan gaat.
- Kledingadvies uit: de rij Weer en kleding telt meteen "10 van 11 aan".
- Alles terug naar het advies vraagt eerst "Annuleren of Terugzetten" met het aantal.
- Zoeken: alle 281 instellingen in de index hebben een plek, en elke instelling staat in de eerste tien resultaten bij zijn eigen titel (gecontroleerd met een tijdelijke test, weer verwijderd).
- Export, wissen en importeren: Volledig herstellen zette alles terug: de drie logs, de planning, Rust wo, en de vijf aangepaste instellingen (Beweging Uit, Ochtendkaart uit, Kledingadvies uit, Opwarmset later uit, Beginnersstart Nee). Week en Instellingen zijn na de import gelijk aan de stand ervoor. Een lege en een vreemde back-up heb ik niet opnieuw geprobeerd; die staan in het verslag van de beginner.
- Geen console-fouten, geen Engels op de instellingenschermen (de oefennamen in Forge blijven Engels, al gemeld).

## De drie belangrijkste

1. Alles terug naar het advies verandert lengtes in de planning zonder voorstel en met de melding "hoeft niet te veranderen". Dit is het enige punt dat tegen een harde regel ingaat.
2. Het zoekveld toont bij 189 van 281 instellingen de waarde van de rij eromheen. Daardoor is het zoekresultaat het ene moment goed en het andere moment misleidend.
3. Een antwoord uit de start telt als aangepaste instelling en wordt zo de eerste valkuil van Terug naar advies. Kracht uitzetten kan nergens, en eenheden en UV bestaan niet; zeg dat laatste hardop als het bewust is.

## Niet gecontroleerd

Vanzelf afvinken (heeft een Garmin-koppeling nodig), Meldingen met toestemming (Ochtendvraag staat in deze browser op Niet mogelijk), het effect van Opwarmset later dempen en Opwarmen per oefening in een echte Benen-training, UV en weer (geen netwerk), 360 en 390 px, en elke dag van twee volle weken.

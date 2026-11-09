# Forge: standen per toestel, opslag en regels

Datum: 2026-11-09
Status: aangenomen (stap 1, 2 en 4 van het bouwplan; engine en opslag)

## Besluit

Een kabel of toestel met gewichtsblok krijgt per sportschool standen: de gewichten die je er gebruikte. Ze staan in het nieuwe optionele veld `GymProfile.exerciseStandsKg` (per oefening `{ kg, only? }`), worden één keer uit je trainingen ingelezen en groeien bij het afvinken van een set. Ontwerp: `docs/visie/Toestelstanden in Forge.md`. Code: `src/engine/toestelStanden.ts`, `src/storage/machineStands.ts`.

De zes vragen uit het ontwerp zijn, omdat de eigenaar niet bereikbaar was, door de coördinator met het advies beantwoord: stil onthouden met Terugdraaien; standen zijn kilo's; de hulp van een optrekstation krijgt geen standen; de rij heet straks "Standen per toestel"; de profielstap blijft als vangnet; standen worden bij het eerste openen uit je logs overgenomen, en een typefout streep je weg.

## Eigen keuzes van de bouwer

- Geen migratiestap en geen nieuw schemanummer. Het veld is nieuw en optioneel, en geen bestaand veld verandert van vorm: een profiel zonder `exerciseStandsKg` leest precies zoals vroeger. Tests bewijzen dat voor een oud profiel zonder lijst, met eigen lijst, met bereik (ook in pond) en met alleen de profielstap, en voor een oude back-up via de hele importroute (`src/storage/machineStands.test.ts`, `src/engine/toestelStanden.test.ts`).
- De instelling "Standen onthouden" bestaat nog niet als opgeslagen keuze (stap 6). De engine en de opslag nemen een parameter `remember`; uit betekent niets inlezen en niets onthouden. Bestaande standen worden dan wel gelezen, zoals het ontwerp zegt. Zolang er geen standen zijn, is het gedrag precies dat van nu.
- `withMachineSetup` (het formulier van nu) schrijft nog de oude lijst en het bereik, en haalt de standen van dat toestel weg. Zo blijft het huidige blad kloppen met wat geldt, tot het nieuwe blad van stap 5 naar de standen zelf schrijft. Het ontwerp liet dat in stap 1 al naar de standen schrijven; dat zou het huidige formulier leeg laten tonen.
- Een toestel met een oude lijst of bereik wordt niet ingelezen uit je logs: die lijst blijft de gesloten lijst tot je het toestel aanraakt. Bij aanraken gaat het in één keer om naar standen met `only`. Past dat niet binnen 40 standen (een bereik kan tot 200 gewichten hebben), dan blijft alles zoals het was en wordt het gewicht geen stand.
- Bij het inlezen met meer dan 40 gebruikte gewichten blijven de 40 die je het vaakst gebruikte. Een opgeslagen lijst met meer dan 40 wordt bij het lezen de lichtste 40.
- Boven de hoogste stand schat het model met het laatste verschil tussen twee standen, onder de laagste met het eerste, nooit kleiner dan de helft van de profielstap en nooit onder 0,25 kg. Bij één stand is het de profielstap.
- Schrijven gaat alles of niets: de nieuwe instellingen worden helemaal uitgerekend en in één keer geschreven, met een grens van 4 seconden. Twee tikken kort na elkaar wachten op elkaar, zodat geen stand verloren gaat.
- Geen nieuwe uitzondering op de historie: een stand staat nooit in een log en geen log wordt gelezen om te schrijven of herschreven. Wegstrepen verandert alleen de lijst van het toestel.

## Reden

De eigenaar vindt het intikken van elk gewicht op een ongelijk blok te veel werk; de profielstap past daar nooit. Standen uit eigen gebruik kosten geen tik vooraf.

## Alternatieven

Een migratiestap die oude lijsten meteen naar standen omzet. Niet gekozen: dan verandert een oude back-up bij het lezen, en het gedrag van een gesloten lijst kan stil verschuiven.

## Bron

`docs/visie/Toestelstanden in Forge.md` (Cartographer), de wens van 5 november in `docs/backlog.md`, `docs/beslissingen/2026-10-26-gewichten-per-toestel.md` en `docs/beslissingen/2026-10-28-tussengewichten.md`.

## Vervangt

Niets.

## Terugdraaien

Het veld weglaten: zonder `exerciseStandsKg` werkt alles zoals voor dit besluit. De code leest het veld alleen via `cleanStandList`.

## Aanvulling: het scherm (stap 3, 5 en 6, ook stap 4 aangesloten)

Datum: 2026-11-09. Status: aangenomen, gebouwd door Sherpa Forge-toestelstanden scherm. Hierboven blijft staan zoals het was.

Eigen keuzes van de bouwer:

- De instelling heet in de opslag `learnStands` (Standen onthouden, standaard aan) en staat in het blad Je sportschool naast Standen per toestel, zodat de Forge-pagina binnen het plafond van rijen blijft. Ze hoort in `checkModelKey`. Uit betekent: niets inlezen en niets onthouden; bestaande standen blijven werken, Minder en Meer gebruiken ze, en zonder standen geldt de profielstap. Een aparte instelling heet `learnStacks` (oud); de twee zijn niet hetzelfde.
- `withMachineSetup` en `withMachineWeights` blijven de oude lijst en het oude bereik schrijven. De ontwerptekst liet ze naar de standen schrijven, maar een bereik in pond moet pond blijven bij opslaan en lezen (bestaande tests) en `poundStackProposal` slaat het toestel nog als pondbereik op. Het nieuwe blad schrijft via `withStandsSet` en `withStandsCleared` (engine) en `saveStandsNow` en `clearStandsNow` (opslag). `poundStack.ts` is niet veranderd: een toestel met een gesloten lijst krijgt geen voorstel, zoals voorheen.
- Minder en Meer springen via `nextStand` en `standJump` (`forgeInput.ts`). Een gewicht van 0 of lager verandert bij Minder niet; een verschil tussen standen is nooit kleiner dan de helft van de profielstap en nooit onder 0,25 kg, zoals het model. Het doelgewicht staat klein (12 px) onder de toets en in het label voor schermlezers ("Minder, naar 14 kilo"), alleen op een toestel met minstens één stand. `makeSnap` kreeg geen nieuwe code: `candidatesFor` leest de standen al sinds stap 2, en een test bewijst dat hij op een stand afrondt.
- Inlezen uit je logs gebeurt bij het eerste afvinken, bij het openen van een veld of het menu van een toestel, en bij het openen van het blad (`usedKgFromLogs`, alleen lezen). Het blad toont wat er is; komt het inlezen later binnen, dan zet het formulier de standen er zelf bij.
- De regel in het blok heeft alleen Terugdraaien. Een mislukte schrijfactie (of een grens van 4 seconden) laat een regel in `--color-danger-text` zien en niets half. De eerste-keerregel ("Tik het getal dat op het blok staat. Forge onthoudt het.") staat bij een toestel met blok zonder standen, zolang de instelling aan staat.
- Alles afvinken in het menu onthoudt elk gewicht dat daarbij afgevinkt wordt; de regel toont de laatste.
- Het blad: chips van 44 bij 44 px (de bestaande `WeightChip`, doorgestreept als weggehaald), Stand toevoegen, Veel tegelijk met de bestaande Lijst en Bereik (wat daaruit komt wordt bij de standen gevoegd), de keuzestrook "Wat Forge voorstelt", Annuleren en Opslaan, en Standen wissen. Standen wissen laat een lege sleutel staan, zodat het toestel niet opnieuw uit je logs wordt ingelezen.
- Standen per toestel telt toestellen met minstens één stand (ook een oude lijst of bereik); een lege sleutel telt niet. De waarde in het blad is "7, 14, 23, 32" of "7 tot 109 kg", met ", alleen deze".

Wat blijft liggen:

- Lookout (Chromium op 360 en 390 px, vertraagde processor) en Warden zijn nog niet geweest; de screenshots zijn nog niet bekeken.
- De uitleg bij Exporteren is niet veranderd (een oudere app laat `exerciseStandsKg` weg).
- Standen in pond, plaatjesnummers en standen voor de hulp van een optrekstation blijven buiten bereik, zoals het ontwerp zegt.
- Een stand die in Forge onthouden is telt direct mee in `checkModelKey` (het profiel verandert); dat telt de controle tegen MacroFactor opnieuw. Gewenst, maar niet apart gemeten.
- `useForgeStands.onOpen` leest per toestel één keer per sessie; een mislukte inleesactie probeert het bij het volgende openen opnieuw.

## Aanvulling na review van Warden

- Elke beurt in de schrijfwachtrij (`serial`) heeft een grens in tijd, en het lezen heeft er een eigen: een hangende lezing of schrijfactie houdt Opslaan en Standen wissen niet meer vast. Een schrijfactie die na de grens alsnog slaagt kan niet worden uitgesloten; de foutregel in het blok zegt daarom "Opslaan duurde te lang of lukte niet. Kijk bij Standen per toestel." en de standen zelf zijn idempotent bij een nieuwe poging.
- Een stand komt alleen uit een gewicht dat je zelf intikte of bevestigde (afvinken van één set); bij Alles afvinken telt alleen een gewicht dat je zelf intikte (`ownWeightsTickedAll`), nooit een voorgesteld doelgewicht.
- De regel met Terugdraaien blijft staan tot er een nieuwe stand bij komt, je terugdraait of de oefening wisselt. Er is geen aparte knop om hem weg te tikken. Er is één regel tegelijk.
- Een beschadigde opgeslagen lijst (niets bruikbaars in een lijst die niet leeg was) telt als niet opgeslagen, zodat het toestel opnieuw wordt ingelezen.
- Minder onder de laagste stand stopt waar het model stopt (`standsStack`): niet onder 0,25 kg en niet onder één verschil; daaronder blijft het gewicht staan.
- `standJump` neemt de instelling mee: uit betekent dat een oude lijst of bereik (nog geen sleutel) werkt als voor de standen, met de profielstap; opgeslagen standen blijven werken.
- Een oude lijst of bereik met meer dan 40 gewichten past niet in de standen. Terugdraaien laat dan alles zoals het was (zoals het besluit zegt); in het blad geeft Opslaan de melding over 40 standen.
- Een bereik in pond wordt bij omzetten de kilo's op 0,01 (zo staat het in het ontwerp); de standen kunnen daardoor twee decimalen hebben.

Wat blijft liggen (Warden, klein): de sleutel van het formulier (`stored`) vernieuwt het formulier als het inlezen binnenkomt, en dat kan een half ingevulde bewerking wissen in de eerste milliseconden; Standen wissen heeft geen Terugdraaien (alleen Annuleren vooraf, de logs blijven).

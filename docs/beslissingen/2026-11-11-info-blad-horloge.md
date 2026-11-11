# Info-blad, spoor 1: het blad Je horloge

Datum: 2026-11-11
Status: aangenomen

## Besluit

Het trainingsscherm krijgt onderaan de knop Horloge in plaats van Info. Die opent het nieuwe blad Je horloge met de workout (de stand via intervals.icu met Nu versturen of Opnieuw, en Zelf nabouwen in Garmin Connect), de datavelden als tekst per pagina, Bekijken en aanpassen naar de pagina Datavelden, en Hartslagzones op je horloge. Wat het blad toont bepaalt `src/engine/watchSheet.ts`; `src/components/WatchSheet.tsx` tekent alleen. Dit is spoor 1 van richting A in `docs/visie/Ontwerp Info-blad.md`.

## Eigen keuzes

- Uitleg blijft bereikbaar via een i rechts naast de naam in de lucht (label "Uitleg bij deze training", 44 bij 44 px), zoals het ontwerp voor het trainingsscherm tekent. Heeft het blad Je horloge niets te tonen, dan heet de knop onderaan Uitleg; zonder gids blijft het Annuleren. In de leesstand: Horloge of Uitleg naast Sluiten.
- Wat je gebruikt staat bovenaan (vraag 4, advies gekozen): is de training gekoppeld (stand verstuurd, wacht, later, mislukt), dan eerst de stand en daarna Zelf nabouwen. Niet gekoppeld of een losse training: eerst Zelf nabouwen, daarna de zin "Deze workout staat nog niet op je horloge." met Vanzelf laten sturen.
- Staat "Laten zien of het gelukt is" uit, dan vallen de stand en de vraag om te koppelen allebei weg, net als op het trainingsscherm (`WatchStatusRow` toont dan ook geen koppelvraag).
- Het blad bestaat alleen als er een workout is of datavelden met advies. Kracht (dat opent toch Forge), rust en wedstrijd krijgen dus geen knop Horloge; de zones-rij alleen maakt geen blad.
- Een soort zonder advies (fietsen) toont "Voor deze training heb ik geen advies." en de rij opent de pagina zonder soort, dus op Zone 2.
- De regels tonen het advies; een eigen versie krijgt de regel "Je hebt ook een eigen versie." (vraag 2, advies gekozen).
- Een rij met Pagina sluit het blad en het trainingsscherm (`closeSheet`, zonder het concept weg te gooien) en navigeert daarna. Terug van die pagina komt op Week of Vandaag, niet in het blad.
- `guideMenu.ts` verliest Stappen voor je Garmin en Datavelden; de Garmin-opmerking over hartslagzones verhuist uit Achtergrond en bronnen naar Je horloge. De stappen en de plekken blijven nog in Uitleg: die verhuizen in spoor 3, samen met het opschonen.
- `trainingGuideSheet.scan.test.ts` gaat bewust van zes naar vijf onderbladen, niet naar vier: alleen het Garmin-onderblad verhuisde. De vier van het ontwerp komen pas met spoor 3, als De stappen weggaat. Nieuwe scans: Je horloge gaat door `Sheet`, heeft geen eigen kleur of animatie, de stand komt uit `WatchStatusRow` (met zijn grens van 30 seconden en zichtbare uitkomst), en de pagina-rij sluit eerst en navigeert dan.
- Beweging: het blad gebruikt `Sheet` en volgt dus de vaste regels. Uit en beperkte beweging zetten het meteen op de eindstand (gemeten: animatie 0,01 ms). In Rustig schuift het blad in zoals elk blad; het uitgroeien uit de rij is alleen in Normaal. Het ontwerp zegt "in Rustig meteen op de eindstand", maar de regel van de app (`docs/beslissingen/2026-10-24-beweging.md`) laat bladen in Rustig bewegen; daar wijk ik niet van af voor één blad.
- Geen nieuwe instelling (het ontwerp noemt er geen). Wel een punt erbij in de uitleg van Datavelden en de zoekwoorden "je horloge" en "workout" bij Datavelden en Datavelden bekijken.

## Reden

De eigenaar vond de datavelden nauwelijks (11 november: "dat infomenu is kut"). Nu staan ze één tik vanaf de training, als tekst, zonder de training te verlaten, en staat het horloge op één plek.

## Alternatieven

Richting B (één blad met segmenten) en C (alles op het trainingsscherm), zie het ontwerp. De knop Info laten staan en Horloge als derde knop ernaast: past niet naast de hoofdknop op 360 px.

## Bron

`docs/visie/Ontwerp Info-blad.md`; de eigenaar koos op 11 november het advies op alle vijf vragen.

## Controles

De tekstkaart toont geen verschil: hij opent alleen het blad van een training in Week, niet het trainingsscherm of de uitleg. Een kaart van het trainingsscherm en de invarianten uit het ontwerp ("elke ingang naar de uitleg heet Uitleg") horen bij spoor 2 en 3, als de namen in Week en op Vandaag mee veranderen.

## Vervangt

Niets. Het besluit over datavelden van 9 november blijft; "Niets op Vandaag" verandert pas in spoor 2.

## Terugdraaien

Draai de commit terug: de knop heet weer Info, de rijen staan weer in `guideMenu.ts`, de scan telt weer zes.

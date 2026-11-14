# Een training die bleef liggen

Datum: 2026-11-14
Status: aangenomen

## Besluit

Een begonnen, niet afgeronde training in Forge loopt niet dagen door. Na middernacht (met een uur stilte), na een vaste grens zonder handeling (advies 12 uur, instelbaar: alleen middernacht, 4, 8 of 12 uur) of als de geplande sessie in je planning overgeslagen is, wordt hij een concept. De klok staat stil op je laatste handeling, de pil zegt "Niet afgerond" in amber en bij het openen van de app gaat eenmaal het blad Training niet afgerond open met Afronden met wat je deed, Verder en Verwijderen (na een tweede tik met Annuleren). Het blad "Er loopt nog een training" heeft dezelfde uitweg; na Verwijderen start de nieuwe training gewoon. Er gaat nooit iets stil weg en de planning verandert niet.

Een open Forge schrijft zijn concept niet terug als de wijzer elders weg is (`mayWriteDraft`): een Verwijderen in een ander tabblad blijft weg. Overgeslagen telt pas na tien minuten stilte, zodat Verder echt verder gaat. Forge kijkt ook elke minuut naar de stilte als het scherm open blijft liggen: wie langer dan de drempel van Lange onderbreking (advies 45 minuten) niets doet met Forge open, krijgt de vraag ook zonder weg te zijn geweest. Dat is bewust: een nacht met het scherm aan telt anders als training. Sluit je die vraag zonder antwoord, dan komt hij voor dezelfde stilte niet op de minuut-tik terug, alleen bij een echte terugkomst (`askBreakNow`).

Herstelronde na Warden: het woord is Verwijderen, zoals in het menu van Forge (DiscardSheet) en de rest van de app. "Schreef al" in een open Forge volgt de uitkomst van de wijzer (`saveSessionDraft`), zodat een Forge naast een andere lopende sessie zijn concept blijft bewaren. Het blad gaat vanzelf open bij het opstarten (zodra de app geladen is) en bij een terugkomst, nooit op een minuut-tik midden in gebruik, en niet achter "Er loopt nog een training". Is de training elders al weg, dan zegt het blad dat met Begrepen. Afronden van een losse training stelt bij Gedaan op de dag van je laatst afgevinkte set voor (`finishDayDefault`).

## Reden

Profiel afbreker (14 november, backlog N): een vergeten sessie liep 154 uur door naast "blijven liggen" en "Niet gedaan?", en het blok bij een nieuwe training had geen Verwijderen. Afronden met de klok van een nacht gaf een duur van uren.

## Alternatieven

Een sessie na de grens stil weggooien (verliest je sets, tegen "nooit stil weg"). Een overgeslagen sessie dood verklaren in `sessionIsDead` (zelfde verlies). De planner laten weten dat er een concept is (`missedTraining.ts`): planner-bestand, buiten deze opdracht; staat als vervolg.

## Bron

`docs/profielen/2026-11-14-afbreker.md` op `claude/profiel-afbreker`, punten 1, 3, 6 en 8.

## Vervangt

Niets. Vult `2026-10-29-forge-als-sessie.md` aan: een sessie eindigt nog steeds alleen met Afronden of Verwijderen, nooit door tijd; de tijd maakt hem alleen een concept.

## Terugdraaien

`leftSession` in `src/engine/forgeSession.ts` laten teruggeven `undefined`; de pil en het blad gedragen zich dan als voorheen. De instelling `forgeLeftAfter` is optioneel en wordt bij import van een onbekende waarde weggelaten.

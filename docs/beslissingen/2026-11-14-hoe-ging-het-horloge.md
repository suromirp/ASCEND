# Hoe ging het?, spoor 6: na je horloge een rij in Je dag en hetzelfde blad

Datum: 2026-11-14
Status: aangenomen

## Besluit

Spoor 6 van `docs/visie/Ontwerp trainingsscherm minimaal.md` is gebouwd. De kaart Van je horloge die op Vandaag vroeg hoe een afgevinkte training ging (`WatchAskCard`) is weg. Daarvoor staat bovenaan Je dag een rij, "Lange duurloop is afgevinkt" met eronder "Hoe ging het?", die het blad Hoe ging het? opent (`src/components/WatchAskSheet.tsx`). Het blad stelt dezelfde vragen in dezelfde volgorde als zelf invullen (regel 7): Beter, Normaal of Slechter; pijn Nee of Ja; zwaarte. Wat het horloge al weet staat als één regel bovenaan ("76 min, 11,4 km, +310 m, vandaag"). Onderaan Opslaan, en de tekstknoppen Klopt niet en Niet nu. De uitleg (waarom de app afvinkte, wat Klopt niet doet) staat achter de i.

De nieuwe instelling Vragen na je loop (Vandaag en meldingen, onder Kaarten op Vandaag): Kort (advies) zet gevoel, pijn en zwaarte in stap 1 en je gewicht na, Inkorten en de tekst voor Strava achter de rij Meer; Alles zet alles in één stap. De regels staan in `engine/afterRun.ts`.

Spoor 5 (zelf invullen als blad) stond al live sinds 12 november (c92df03, besluit `2026-11-12-hoe-ging-het.md`) en is niet opnieuw gebouwd.

## Eigen keuzes

1. De zwaarte blijft in Kort staan. Het besluit van 12 november (vraag 2) stelde als voorwaarde dat de belasting zonder zwaarte niet wegvalt en geen gok wordt. Nagelopen: zonder zwaarte rekent `engine/standing.ts#weeklyLoad` de minuten maal de zwaarte van het plan en markeert het als schatting; de verdeling rustig en hard (`engine/weekEffort.ts`) leest eerst de hartslag van het log, en de beenindex (`engine/legFatigue.ts`) valt terug op de zwaarte van het plan. De belasting valt dus niet weg, maar wordt wel een aanname: een rustige loop die zwaar voelde telt als rustig. Daarom blijft de zwaarte in stap 1, met de waarde van je horloge vooraf ingevuld en de regel "Zo stond het op je horloge.". Kort en Alles verschillen dan alleen in wat achter Meer staat.
2. Niet nu sluit alleen het blad. De rij blijft staan zolang de vraag open mag (72 uur, `autoTick.ts#QUESTION_HOURS`). Op de oude kaart verborg Niet nu de vraag tot de app opnieuw opende; nu blijft hij zichtbaar, zoals het ontwerp vraagt.
3. De rij valt nooit achter Nog (`engine/yourDay.ts#arrangeYourDay`, zoals de pijnplekvraag) en staat bovenaan. De geplande training waar de vraag over gaat staat er niet nog eens als gedane training (`afterRun.ts#withoutAskedTraining`, regel 1).
4. Opslaan en Klopt niet hebben een grens van 10 seconden (`afterRun.ts#attemptWithin`): daarna "Opslaan duurt lang. Je antwoord blijft staan." en mag het blad dicht. Mislukt het, dan blijft het blad open met de melding en je antwoord. De oude kaart had geen grens en geen eigen melding.
5. Een voorstel van je horloge (een activiteit die nog niet is opgeslagen) wacht niet meer tot de vraag beantwoord is: de vraag staat in Je dag, het voorstel op zijn eigen plek. Vanzelf afvinken zelf (`autoTick.ts`, `WatchActivityCard`) verandert niet.
6. De rij Meer noemt alleen wat er voor die training is (`afterRun.ts#availableFields`): zonder weging, zonder iets om in te korten en met de Strava-tekst uit is er geen rij Meer. Een rustdag krijgt geen vragen, zoals bij zelf invullen.
7. Gevoel en zwaarte komen uit dezelfde onderdelen als zelf invullen (`logForm/LogFormParts.tsx#FeelChoice` en `#RpeChoice`; `FeelField` en `RpeField` gebruiken ze nu ook). Het oude scherm tekent hetzelfde als voorheen.
8. Wat het opslaat is gelijk aan de kaart: gevoel, zwaarte en pijn via `setLogFeedback` (`autoTick.ts#applyFeedback`), de weging via `useSweatAfter`, en daarna is de vraag af. Geen nieuw veld op het log.

## Niet gedaan

`SportFeltBlock` (de vraag hoe zwaar een sport die meetelt voelde, in het blad van een log) heeft niet dezelfde vragen gekregen. Die vraag kiest een woord dat een aangenomen zwaarte vervangt en daarna vaststaat (`engine/sessionLoad.ts#mayAskFelt`); gevoel en pijn zijn daar nooit gevraagd. Gelijktrekken verandert wat er voor zo'n sport op het log komt en hoort bij de derde ingang van regel 7 (Hoe ging het? vanuit het Logboek). Dat is een eigen spoor met een eigen besluit.

## Reden

Regel 6 en 7 van het ontwerp: een vraag is een taak van vandaag en dus een rij in Je dag, en Hoe ging het? heeft één vorm. De kaart verhuist bewust van de volgorde rond de missie naar Je dag (besluit `2026-11-12-trainingsscherm-en-ontwerpregels.md`, vraag 6).

## Alternatieven

De zwaarte achter Meer, zoals het ontwerp eerst voorstelde: maakt de belasting voor elke loop zonder ingevulde zwaarte een aanname uit het plan. De kaart op Vandaag laten en alleen de vragen gelijktrekken: blijft een tweede vorm en een kaart boven Je dag.

## Bron

`docs/visie/Ontwerp trainingsscherm minimaal.md` hoofdstuk 3, regel 6 en 7, hoofdstuk 7 spoor 6; besluit `2026-11-12-trainingsscherm-en-ontwerpregels.md`; backlog, Samenhang (Pathfinder): Hoe ging het? spoor 6.

## Vervangt

Niets. Vult `2026-11-12-hoe-ging-het.md` aan.

## Terugdraaien

Draai de commit terug: `WatchAskCard` komt terug in `WatchActivityCard`. Logs, afvinken en de planning veranderen niet; de instelling `afterRunQuestions` is optioneel en een oudere versie negeert hem.

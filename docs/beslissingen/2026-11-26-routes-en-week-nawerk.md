# Routes en Week: nawerk na het routepakket (I-163)

Datum: 2026-11-26
Status: aangenomen

## Besluit

Het nawerk van het routepakket en de rustdag (I-160, I-162, I-150) kent twaalf punten. De keuzes die daarbij zijn gemaakt:

- Een route van een rij die weg is (een wees) staat bij het lezen niet meer in de stand en gaat bij de eerstvolgende schrijfactie ook uit de opslag. Lezen schrijft niets; een log wordt nooit aangeraakt.
- Een inhaal van een inhaal toont de route van de oorspronkelijke rij: de keten wordt teruggevolgd met de lijst van geplande trainingen. Zonder lijst blijft het één stap.
- Een bewaarde route onthoudt hoe ver de voet van de helling van je plek lag (`footStartM`, optioneel en aanvullend, dus geen nieuwe schemaversie) en zegt dezelfde regel als een nieuwe lus, uit dezelfde functie.
- Opnieuw proberen geeft bij dezelfde fout een nieuwe zin: de tweede poging zegt "De kaart kwam weer niet binnen (poging 2)".
- Hoogtemeters halen maakt de lus hoogstens 1,3 keer zo lang als de training. Komen de hoogtemeters dan niet binnen, dan staat de beste lus binnen die grens er, met de zin dat er minder hoogtemeters in zitten. Echte kaartdata is niet getoetst; de test gebruikt een nagemaakte helling.
- De rustdagrij zegt niet "bewust herstel" naast een open training en telt een losse training mee. De regel staat in `src/engine/restRow.ts`; `restRowLine` in `dayPlan.ts` bleef staan, omdat dat bestand bij een ander spoor hoort.
- Een sleep naar je rustdag geeft één blad met jouw verplaatsing en de rustdag samen, met één Akkoord en één Ongedaan maken dat beide terugzet. Liever niet laat alles zoals het was. Voorheen volgde na het eerste Akkoord een tweede blad, en het tweede Akkoord nam de melding van jouw sleep over.
- `goalRef` noemt de hele eerste naam van het doel tot 28 tekens, anders tot het laatste hele woord dat past, met een beletselteken. Nooit midden in een woord.
- Op een rij met een routeregel mag "verplaatst van do 26" naar een tweede regel in plaats van af te kappen. Op 360 px niet gemeten in een browser.
- De vaste tekst "je tocht" in de trainingsgids volgt je doel: met een tocht als doel blijft hij staan, anders staat er "je doel" (`engine/guideWording.ts`, `state/useTrainingGuide.ts`). De gegevens in `data/` zijn niet veranderd.

## Punt 6: rustdag en de dag voor een test

`restDayFollows.ts` weert de dag direct naast een test of wedstrijd, ook de dag ervoor. Daar was geen besluit voor. Besluit: dat weren blijft. Een test na een rustdag is beter dan een rustdag vlak voor een test, en bij de test regelt de rust voor de test of de raceweek de rust al. Het gedrag is niet veranderd; dit besluit legt het vast.

## Reden

De review van het bouwmoment van 25 november vond deze punten, elk klein maar zichtbaar voor de eigenaar.

## Alternatieven

Het tweede blad na de sleep laten staan en alleen de melding bewaren: dan zijn het nog steeds twee bladen. Een route per inhaal kopiëren naar elke nieuwe rij: dat schrijft meer dan nodig; volgen is genoeg. De afstandsgrens bij Hoogtemeters halen instelbaar maken: 1,3 is het advies en een instelling kan later volgen als de eigenaar dat wil.

## Bron

Review van Warden en Lookout na bouwmoment 25 november, backlog I-163. Geen persoonsgegevens.

## Vervangt

Niets. Vult `2026-11-24-route-per-training.md` en het besluit over de rustdag die meeschuift aan.

## Terugdraaien

Per punt los: `withRestDayFollow` niet meer gebruiken in `Week.tsx#moveTo` geeft de twee bladen terug; `MAX_LOOP_DISTANCE_FACTOR` hoog zetten haalt de grens weg; `footStartM` negeren geeft de regel niet meer.

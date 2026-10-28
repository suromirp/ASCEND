# Slepen in Week

Datum: 2026-10-28
Status: aangenomen

## Besluit

Een training in Week verplaats je met het greepje rechts in de rij naar een andere dag van dezelfde week. Slepen is een snellere hand, geen nieuwe regel: loslaten gaat via dezelfde weg als "Verplaatsen" in het actieblad (`Week.tsx#moveTo`, `engine/weekDrag.ts#decideMove`), met hetzelfde slot, `movedFromDate` en dezelfde melding met Ongedaan maken. Ontwerp: `docs/visie/Slepen in Week.md`.

## Wat is vastgesteld

Alleen de greep, geen lang drukken. Niet naar een andere week; zondag naar maandag blijft kunnen via het actieblad. Een wedstrijd is niet sleepbaar (die gaat via het doel op Ascend); een test wel, en loslaten opent dan altijd het blad met Akkoord. Gelogd, voorbij, overgeslagen, een rustdag of herstelwandeling en wat een vakantie of tocht neerzette hebben geen greep (`dragEligibility`).

De rustdag is een doel in amber: loslaten vraagt eerst of je dat echt wilt ("Liever niet" is de hoofdknop). Een dag waar de tijd niet past vraagt hetzelfde. Een derde training op een dag, vakantie, tochtdag, de lichte dag bij een tocht voor een zware training, de dagen op of na je doel en je ziekte kunnen niet. Alleen de 48 uur tussen zware beendagen gaat vooraf via het voorstel, zoals `moveSession` al doet. Een verplaatsing die een weekmelding oplevert wordt niet tegengehouden; je ziet het tijdens het slepen in de zin, en daarna zegt de kaart "Let op" het met een voorstel.

Tijdens het slepen staat er een label op de dag onder je vinger (hoogstens 28 tekens) en onderaan een zin met het droge feit eerst. Staat de vinger in het onderste derde van het scherm, dan springt de zin naar boven. Valt dat onrustig, dan blijft alleen het label over (`WeekDragNote`).

Een korte tik (`haptics.tap`) alleen bij oppakken. Een korte tik op de greep zonder slepen opent het actieblad op de stap Verplaatsen (`startStep`), ook de weg voor TalkBack.

De instelling "Trainingen slepen in Week" (`AppSettings.dragWeek`, afwezig is aan) staat in Planning onder "Voorstel bij een probleem in de week". Uit haalt de grepen weg en verandert verder niets.

## Reden

De eigenaar vindt het slepen van doelen op Ascend soepel en wil dat ook voor trainingen. Het actieblad vraagt een tik, "Verplaatsen" en een dag zoeken. Door alles wat de planning verder verandert dan jouw eigen verplaatsing een voorstel met Akkoord te laten blijven, verandert er niets stil.

## Alternatieven

Lang drukken op de hele rij: botst op Android met tekstselectie, het contextmenu en het scrollen. Slepen naar een andere week: lastig te besturen en maakt de dagen onder je vinger onvoorspelbaar. Een wedstrijd laten verslepen: de dag hoort bij het doel en het blok eromheen hangt eraan. De rustdag helemaal dichtzetten: strenger dan het datumveld in het actieblad.

## Bron

`docs/visie/Slepen in Week.md`, de keuzes van de coördinator bij de open keuzes, en het slepen van doelen in `docs/beslissingen/2026-10-26-ascend-tab-als-doelen.md`.

## Vervangt

Niets.

## Terugdraaien

Zet "Trainingen slepen in Week" uit: de grepen verdwijnen en het actieblad blijft zoals het was. De gedeelde sleephaak (`components/useVerticalDrag.ts`) draagt ook Ascend; die is daarbij ongewijzigd in gedrag (zelfde grenzen van 90 en 130 px, 10 px per beeld).

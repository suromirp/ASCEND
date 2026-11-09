# Uitleg bij oefeningen, proef met vijf teksten

Datum: 2026-11-09
Status: aangenomen

## Besluit

Een oefening kan een uitleg in twee lagen krijgen: In het kort (drie regels, altijd zichtbaar) en Lees verder (achter een tik, hoogstens 130 woorden). De proef heeft vijf teksten: Push-Up, Pull-Up, Step-Down, Barbell Romanian Deadlift en de 45° Incline Barbell Press. Een oefening zonder uitleg houdt zijn drie oude regels.

## Reden

De drie oude regels (Doen, Let op, Vaak fout) zijn kaal en soms fout: bij de 45° Incline Barbell Press stond "een lichte helling". Het onderzoek *Uitleg bij oefeningen en open bronnen* stelt een vaste opbouw voor (beginstand, beweging, tempo en adem, fouten met oplossing, lichter en zwaarder). Eerst vijf teksten, zodat de eigenaar de lengte en de toon kan beoordelen voor er meer komen.

## Wat er gebouwd is

- Model: optioneel veld `guide` op `Exercise` (`src/models/exercise.ts`) met `short`, `setup`, `movement`, `tempo`, `mistakes`, `easier`, `harder` en `source`. De teksten staan in `src/data/exerciseGuides.ts`; `src/data/exercises.ts` voegt ze samen. Geen opslag, dus geen migratie.
- Blad: `ExerciseArtSheet` en de Tips in het menu van een oefening (als de plaatjes uit staan) tonen In het kort, de zorgzin en Lees verder. Lichter en Zwaarder zijn een tik naar de uitleg van die oefening, alleen als het id bestaat.
- Instelling: Uitleg standaard uitgeklapt (`guideOpen`, afwezig is uit).
- Bronnenlijst: `docs/onderzoek/Bronnen bij de uitleg van oefeningen.md`, door Scout te toetsen.

## Eigen keuzes buiten de opdracht

- De zorgzin "Doet het pijn, stop dan en vraag een arts of fysiotherapeut." staat zichtbaar onder In het kort en niet onderaan Lees verder. De opdracht noemt beide plekken; de zorgregel gaat voor: hij staat nooit achter een tik.
- De grens voor Lees verder is 130 woorden in de scan-test (de opdracht: ongeveer 120 in de tekst, hoogstens 130 in de test). De vijf teksten zitten er ruim onder.
- Pull-Up: Lichter wijst naar `negative-chin-up` (Negative Chin-Up, met Negative Pull-Up als bijnaam), want er is geen band en geen aparte negatieve pull-up. De machine-assisted pull-up leek me minder een trap lager van dezelfde beweging. Zwaarder heeft geen eigen oefening (Weighted Pull-Up is een bijnaam van Pull-Up zelf); het staat daarom als een zin in de beweging: gewicht aan een riem.
- Push-Up heeft geen Lichter en Zwaarder: de catalogus heeft geen schuine, knie- of voeten-hoog-variant. Step-Down heeft alleen Zwaarder (`step-down-pack`); ik kon niet met zekerheid zeggen dat de Step-Up een lichtere stap is. De Romanian Deadlift heeft alleen Lichter (`dumbbell-rdl`). De 45° Incline Barbell Press heeft geen van beide, omdat ik niet zeker wist welke naastgelegen oefening lichter of zwaarder is. Waar ik twijfelde heb ik het weggelaten.
- Veiligheidsarmen of een spotter staat in de beginstand van de 45° Incline Barbell Press ("stel veiligheidsarmen in als je alleen traint"), omdat die oefening in de catalogus `failureRisk` heeft.
- De oude regels van de 45° Incline Barbell Press zijn gecorrigeerd ("bank op 45 graden", "steiler dan 45 graden wordt een schouderpers"). Ze blijven in `cues` staan en zijn nergens zichtbaar zolang de uitleg er is, maar kloppen nu ook als ze weer nodig zijn.
- Lichter of Zwaarder opent de uitleg in hetzelfde blad, met Terug naar de vorige. Het blad schuift niet opnieuw open en het sluiten werkt zoals altijd via `useSheetClose`. Zonder tekeningenblad gebeurt hetzelfde in de Tips.
- Uitklappen hergebruikt het patroon `.mx-unfold` (0,25 s ease-out, geen lus, Rustig en Uit direct op de eindstand). Geen nieuwe animatie.
- De rij van de instelling staat in het blad Weergave op Forge, naast Plaatjes bij oefeningen. Dat is een blad onder de pagina Forge, geen rij op de pagina zelf; de pagina houdt zijn rijen, dus het maximum van een pagina speelt niet en er is geen andere pagina nodig.
- De kopjes in het blad (Beginstand, Beweging, Tempo en adem, Veelgemaakte fouten) staan in zinsletters, niet in de hoofdletter-eyebrow van de rest van het blad, vanwege de eis geen `uppercase` in de uitleg.
- Een tekst die ik niet zeker wist heb ik weggelaten: de hoogte van de verhoging bij de Step-Down, en studiegetallen. In de bronnenlijst staat waar Scout moet toetsen.

## Alternatieven

Een tabblad of een apart scherm voor de uitleg: meer beweging en een extra laag, terwijl het blad al het huis van de uitleg is. De uitleg verplicht uitgeklapt tonen: te veel tekst bij het loggen midden in een set. De teksten in `exercises.ts` zelf zetten: dat bestand is al groot en de volgorde en ids daar mogen niet bewegen.

## Bron

`docs/onderzoek/Uitleg bij oefeningen en open bronnen.md`, `docs/onderzoek/Bronnen bij de uitleg van oefeningen.md`, `docs/beslissingen/2026-10-27-stem-van-ascend.md` en `docs/beslissingen/2026-10-28-plaatjes-bij-oefeningen.md`.

## Vervangt

Niets. De oude regels in `cues` blijven voor elke oefening zonder uitleg.

## Terugdraaien

Haal een oefening uit `src/data/exerciseGuides.ts` en hij valt terug op zijn drie oude regels. Het hele veld weghalen kan zonder migratie; een oude back-up met `guideOpen` wordt door `storage/backupClean.ts` schoon gelezen.

## Stand na de review

Bij een wissel (Lichter, Zwaarder, Terug naar) springt het blad naar boven en staat de focus op het blad zelf. De terugknop van het toestel sluit het hele blad, ook na een wissel; alleen Terug naar gaat één stap terug. Gekozen om het blad één stap in de historie te houden (zoals elk blad); een stap terug via de terugknop kan later als dat in gebruik hinderlijk blijkt.

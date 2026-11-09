# Forge: bij ruilen eerst de echte vervangers

Datum: 2026-11-09
Status: aangenomen

## Besluit

Het ruilblad in Forge toont twee groepen: "Doet hetzelfde" (dezelfde beweging, met een korte reden, de eerste is aanbevolen) en daaronder "Zelfde spier, anders". Elke oefening krijgt een familie (de beweging) en eventueel kenmerken (nuance) in `src/data/exerciseFamilies.ts`, naast de lijst. De logica staat in `src/engine/forgeWorkout.ts#swapGroups`.

## Reden

`swapScore` gaf Dips en Dumbbell Bench Press dezelfde score voor Barbell Bench Press en sorteerde dan op naam, dus Dips stond bovenaan. De score kan een andere beweging niet van een andere uitrusting onderscheiden. Een familie doet dat wel, en de reden onder elke keuze zegt wat er hetzelfde is en wat anders.

## Eigen keuzes

- De familie en nuance zijn optionele velden op `Exercise` (het verslag noemt `family` verplicht). Optioneel laat een oefening zonder familie veilig terugvallen op de oude lijst; een scan-test eist dat alle 120 oefeningen er een hebben.
- De kaarten staan in een eigen bestand, `src/data/exerciseFamilies.ts`, en worden in `ex()` samengevoegd. Het zijn statische data: geen opslag, geen migratie.
- Afstand binnen een familie: 1 voor andere uitrusting, 1 als de ene je eigen gewicht is en de andere een last die je kiest, 1 per kenmerk dat maar één van beide heeft. Bij gelijke afstand de volgorde in de lijst. De voorkeur voor bergspieren speelt dus alleen nog in de tweede groep, waar ze bij gelijke `swapScore` blijft werken.
- Hack Squat zit in de familie `squat`. Push-Up en Dips hebben elk een eigen familie en staan dus in de tweede groep.
- `swapOptions` blijft bestaan als de twee groepen achter elkaar. De grens van 8 telt over beide groepen samen; de echte vervangers gaan voor.
- Een lege eerste groep (Dips) laat de kop en de groep weg, zonder extra zin.
- Reden per echte vervanger: "Zelfde beweging en spieren" plus wat anders is (uitrusting, dan kenmerken), bijvoorbeeld "Zelfde beweging en spieren, met dumbbells." De eerste keuze krijgt er "Aanbevolen." voor. De tweede groep houdt haar spieren en de bestaande bergreden.
- Geen instelling: er is geen keuze voor de gebruiker, alleen een betere volgorde van dezelfde keuzes.
- Een ruil geldt nog steeds alleen voor deze training en wijzigt geen template of planning.

## Alternatieven

- Eerst een andere uitrusting bij gelijke afstand, zodat bij een bezet rek Hack Squat bovenaan staat: niet gekozen, de volgorde in de lijst is met zorg gemaakt en je kiest zelf.
- Hack Squat bij `leg_press`: niet gekozen, de beweging lijkt meer op een squat.
- Push-Up in `flat_press` met een hoge afstand: niet gekozen, de last staat vast.
- De velden als argumenten in elke `ex()`-regel: niet gekozen, 120 regels open.

## Bron

`docs/onderzoek/Echte vervangers bij ruilen in Forge.md`.

## Vervangt

Niets. Het gedrag van `swapScore` en de bergvoorkeur uit `docs/onderzoek/Spierindex opzet.md` blijft voor de tweede groep.

## Terugdraaien

Laat `ExerciseSheets.tsx#SwapList` en `ForgeMenus.tsx#SwapSheet` weer `swapOptions` als één lijst tonen en verwijder `exerciseFamilies.ts`; er is niets opgeslagen.

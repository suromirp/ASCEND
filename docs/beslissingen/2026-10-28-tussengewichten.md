# Tussengewichten

Datum: 2026-10-28
Status: aangenomen

## Besluit

Een los tussengewicht (een plaatje of magneet van bijvoorbeeld 2,3 kg dat je bij elk gewicht van het blok kunt leggen) is vrij in te stellen: voor de hele sportschool, voor alle kabels en toestellen met een gewichtstapel, en per toestel als overschrijving. Een toestel kan een eigen lijst hebben, of "geen" terwijl de sportschool er wel een heeft.

## Reden

Een toestel met een blok in stappen van 5 kg (65, 70, 75) en een los gewicht van 2,3 kg kan ook 67,3, 72,3 en 77,3. Zonder dit stelde Forge die gewichten nooit voor en rekende "Lichter" met een te grove stap.

Wat is besloten, in volgorde:

1. `GymProfile.addOnKg` is de lijst voor de hele sportschool. `GymProfile.exerciseAddOnKg` is de keuze per toestel (op oefening-id) en gaat voor: een lijst vervangt die van de sportschool, een lege lijst betekent "geen", geen vermelding betekent "zoals de sportschool".
2. Hoogstens 3 tussengewichten van 0,25 tot 25 kg, zonder dubbele, oplopend. Meer dan 3 wordt bij het inlezen afgekapt op de lichtste drie; in het veld is het een foutmelding.
3. Het simpelste dat klopt: elk tussengewicht hoogstens één keer, alle combinaties. Met 1,25 en 2,5 zijn dat 1,25, 2,5 en 3,75 erbij. Zonder het blok zelf is het tussengewicht geen gewicht: 2,3 kg alleen wordt niet voorgesteld.
4. Het geldt alleen voor een kabel of toestel met een gewichtstapel (`hasStack`). Een stang, dumbbells en toestellen met schijven hebben hun eigen manier van combineren.
5. `strengthWeights.ts#externalWeights` legt het tussengewicht over de lijst van het blok heen, dus ook over een eigen lijst van het toestel ("Gewichten per toestel") en over geleerde en gebruikte gewichten. Alles wat kandidaten gebruikt (de gewichtskeuze met de kleinste verwachte misser, "Lichter", "Geen gewicht past", de stap in het invoerpaneel) rekent dus vanzelf mee. Gebruikte gewichten worden eerst terug naar het blok gebracht, zodat 72,3 dat je gebruikte niet 74,6 als kandidaat oplevert.
6. Forge laat onder een werkset zien waar een gewicht uit bestaat als het met tussengewicht gemaakt is ("70 + 2,3 kg"). Het menu van een oefening heeft "Tussengewicht van dit toestel".
7. In de instellingen staat in de groep Forge, onder "Je sportschool", de rij "Tussengewichten" met de waarde ("2,3 kg", "Geen") en een blad om in te vullen, met de toestellen die het anders doen.

Er verandert niets stil aan de planning of aan een bestaande training. Het tussengewicht werkt alleen op het gewicht dat Forge voorstelt.

## Opgeslagen vormen

`addOnKg` en `exerciseAddOnKg` zijn optioneel en additief op `GymProfile`. Ze gaan door `normalizeProfile` (zoals `exerciseWeightsKg`) die rommel weglaat; een oude back-up heeft ze niet en werkt zoals altijd. Het schemanummer van de back-up verandert niet en er is geen aparte migratiestap nodig. Een test zet beide velden in een back-up en terug. Een nieuwe sportschool begint zonder de eigen keuzes per toestel, maar met het tussengewicht van de sportschool dat de actieve had.

## Alternatieven

Een tussengewicht als gewone regel in de lijst van een toestel ("65 67,3 70 ..."). Valt af: je moet elk gewicht typen en het geldt niet voor een toestel zonder eigen lijst.

Een tussengewicht per toestel zonder sportschoolbrede keuze. Valt af: het plaatje ligt bij de sportschool en geldt voor alle toestellen.

Elke hoeveelheid van een tussengewicht (twee plaatjes van 2,3). Valt af: de eigenaar noemde elk hoogstens één keer, en het houdt de lijst kort.

## Bron

Een wens van de eigenaar op 28 oktober 2026 (Kelso shrug met een los gewicht van 2,3 kg). Vult `2026-10-26-gewichten-per-toestel.md` aan.

## Vervangt

Niets.

## Terugdraaien

Wis de tussengewichten van de sportschool en van de toestellen; de kandidaten zijn dan weer die van het blok. In de code is het één plek: `externalWeights` in `engine/strengthWeights.ts`.

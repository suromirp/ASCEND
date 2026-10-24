# Geschatte 1RM op Forge

Datum: 2026-10-24
Status: aangenomen

## Besluit

Forge laat per oefening de geschatte 1RM zien: het getal van nu, de
verandering over vier weken en een lijn over alle trainingen. Het staat aan
als standaard en gaat uit met de instelling "Geschatte 1RM tonen" in de groep
Forge. Staat de lijn van de 1RM er, dan valt de lijn van het werkgewicht weg,
zodat een kaart één lijn heeft.

## Reden

De eigenaar vroeg om zijn 1RM, of een schatting op basis van zijn prestaties,
met een los getal van nu en een grafiek of trendlijn. Het getal bestond al:
het krachtmodel (`engine/strengthModel.ts`) rekent na elke training een
afgevlakte schatting uit werksets (`isWorkSet`), en de voorstellen rekenen
ermee. Op Forge heette het "geschatte kracht", wat vaag was. Nu heet het wat
het is, een geschatte 1RM, en `engine/strengthOneRm.ts` haalt per training
hetzelfde getal op. Er is geen nieuwe formule, dus Forge en de voorstellen
zeggen hetzelfde.

De verandering telt pas mee met minstens drie trainingen en een punt van
minstens vier weken eerder. Met minder zou een enkele goede of slechte dag het
hele verhaal bepalen.

Twee lijnen onder elkaar (werkgewicht en 1RM) vertelden twee keer hetzelfde.
Bij een oefening met hulp blijft de eerste lijn wel staan, omdat die iets
anders laat zien: wat je zelf optilt.

## Alternatieven

- De 1RM uit de MacroFactor-export ernaast tonen. Nog niet: de import leest die
  waarde nu niet in, daarvoor moeten import en opslag eerst worden uitgebreid.
- Een eigen 1RM-formule naast het model. Afgewezen: dan zouden Forge en de
  voorstellen verschillende getallen gebruiken.
- Altijd beide lijnen. Afgewezen omdat de kaart dan druk wordt zonder iets toe
  te voegen.

## Bron

De vraag van de eigenaar over zijn 1RM op Forge, en
`docs/beslissingen/2026-10-22-kracht-per-set.md` voor het tellen van werksets.

## Vervangt

Niets.

## Terugdraaien

De instelling uitzetten haalt het blok weg en brengt de lijn van het
werkgewicht terug. In de code: het blok in `ExerciseCard` in
`src/pages/Forge.tsx` weghalen en `showOneRm` laten liggen; een opgeslagen
waarde zonder het veld leest als aan en doet dan niets.

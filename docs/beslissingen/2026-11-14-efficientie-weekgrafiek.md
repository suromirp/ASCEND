# Het blad Efficiëntie tekent de weekgrafiek van de kaart

Datum: 2026-11-14
Status: aangenomen

## Besluit

Het blad Efficiëntie op Je stand tekent dezelfde weekgrafiek als de kaart Tempo bij zone 2 (`Zone2WeekChart`, gevoed door `zone2WeekChart`): een stip per week en als lijn de regressie. Het getal "Nu, op de lijn" is het eindpunt van die lijn.

## Reden

Het blad tekende de weekgemiddelden aan elkaar, terwijl het cijfer de regressie is: lijn en getal spraken elkaar tegen. De regel eronder, "Je eerdere lopen met de datum", sprak over lopen terwijl het weken waren.

## Eigen keuzes

- `SheetModel` krijgt twee optionele velden, `weekChart` en `weekCaption`. Alleen Efficiëntie vult ze; de andere bladen tekenen `series` zoals eerst.
- Het blad hergebruikt de component van de kaart, dus ook de tik op een stip met week en aantal lopen, het eindlabel en de stijl. Geen nieuwe grafiekstijl.
- De lijst eronder vervalt: de tooltip zegt al de week en het aantal lopen, dus een lijst per week was dubbel. Er staat één zin onder de grafiek (`zone2SheetCaption`) die zegt wat de stip en de lijn zijn.
- Bij een eerste schatting of te veel verschil (de kaart tekent dan geen lijn) staan er alleen stippen, ook bij "Te weinig gegevens"; zonder enige loop blijft het blad zonder grafiek.
- `series` blijft in het model staan (de rij op Je stand leest `points`); alleen het blad kiest de weekgrafiek.
- Geen wijziging in `aerobicTrend.ts`, dus geen cijfer verandert, alleen wat getekend wordt.

## Bron

Backlog, Sherpa Zone 2, 12 november. Besluit `2026-11-12-zone2-kaart.md`.

## Vervangt

Niets.

## Terugdraaien

Haal `weekChart` en `weekCaption` uit `runTrends.ts#efficiencyRow` weg; het blad valt terug op `series`.

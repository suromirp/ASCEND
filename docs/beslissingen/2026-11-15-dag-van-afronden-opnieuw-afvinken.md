# Een set opnieuw afvinken verzet de dag van Afronden niet

Datum: 2026-11-15
Status: aangenomen

## Besluit

Afronden in Forge stelt de dag voor van het laatste echte werk in de training, niet van de laatste tik. Een set die je uit en weer aan zet, telt op het moment dat je hem de eerste keer afvinkte (`engine/forgeWorkout.ts#lastWorkMoment`, het conceptveld `firstDoneAt`). Een nieuwe set die je later voor het eerst afvinkt is wel nieuw werk en neemt de dag mee. Alleen afgevinkte rijen tellen. Aanvulling op `2026-11-15-dag-van-afronden.md`.

## Reden

Warden (15 november, I-45): gepland maandag 16 en maandag gedaan; woensdag 18 voor het afronden een set uit en weer aan gezet. De voorgestelde dag werd woensdag, en bij een beendag telde de rust dan twee dagen te laat. Het was zichtbaar, maar de standaard hoort te kloppen.

## Alternatieven

Laten zoals het was en het in het besluit noemen: de standaard blijft dan bij een gewone handeling verkeerd. De klok van de sessie (pauzes, laatste handeling) als grens: een tik is zelf een handeling, dus de klok ziet het verschil tussen opnieuw afvinken en nieuw werk niet. Het moment van de eerste keer ook in het log zetten (`SetLog.at`): niet nodig voor de dag, en het log zegt dan iets anders dan wat je deed; `SetLog.at` blijft het moment van afvinken.

## Bron

Uitslag van Warden op `warden/afbreker-herstel`, punten 2 en 3 (Mag); backlogpunt I-45.

## Vervangt

Niets. Vult `2026-11-15-dag-van-afronden.md` aan.

## Terugdraaien

In `FinishSheet.tsx` weer de laatste `doneAt` van de afgevinkte rijen nemen in plaats van `lastWorkMoment`. Het veld `firstDoneAt` in het concept mag blijven staan; het komt nooit in een log.

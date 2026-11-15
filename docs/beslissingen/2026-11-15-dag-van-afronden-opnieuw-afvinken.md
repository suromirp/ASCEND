# Een set opnieuw afvinken verzet de dag van Afronden niet

Datum: 2026-11-15
Status: aangenomen

## Besluit

Afronden in Forge stelt de dag voor van het laatste echte werk in de training, niet van de laatste tik. Een set die je uit en weer aan zet, telt op het moment dat je hem de eerste keer afvinkte (`engine/forgeWorkout.ts#lastWorkMoment`, het conceptveld `firstDoneAt`). Een nieuwe set die je later voor het eerst afvinkt is wel nieuw werk en neemt de dag mee. Alleen afgevinkte rijen tellen. Aanvulling op `2026-11-15-dag-van-afronden.md`.

Het tijdstip (`completedAt`) van het nieuwe log hoort bij die dag (`engine/forgeSession.ts#finishCompletedAt`): vandaag is het het moment van opslaan; een eerdere dag krijgt het moment van je laatste echte werk als dat op die dag viel, anders 12:00 op die dag. Nooit later dan nu en nooit op een andere dag dan `completedDate`.

## Reden

Warden (15 november, I-45): gepland maandag 16 en maandag gedaan; woensdag 18 voor het afronden een set uit en weer aan gezet. De voorgestelde dag werd woensdag, en bij een beendag telde de rust dan twee dagen te laat. Het was zichtbaar, maar de standaard hoort te kloppen.

Wat het kost: vink je een set per ongeluk af en meteen weer uit, en doe je hem dagen later echt, dan telt hij op de eerste keer. Dat raakt de dag alleen als je die latere dag niets anders voor het eerst afvinkt; de knoppen bij Gedaan op laten de dag dan zien en kiezen. `SetLog.at` blijft het moment van de laatste keer afvinken; geen lezer in de engine maakt daar een dag van (15 november nagezocht), de dag komt uit `completedDate`. Een oefening met alleen uitgezette sets houdt `firstDoneAt` bij een nieuw plan (`engine/forgeInput.ts#touchedInDraft`).

De onderhoudsronde van 15 november (`warden/onderhoud-15-nov`, punt 1, moet): een training op een eerdere dag afgerond kreeg de dag van de laatste set maar het tijdstip van nu. De kracht-historie, de kalibratie van Forge en de belasting sorteren op `completedAt`, dus "de laatste keer" en "vermoeide benen ervoor" klopten dan niet.

## Alternatieven

Laten zoals het was en het in het besluit noemen: de standaard blijft dan bij een gewone handeling verkeerd. De klok van de sessie (pauzes, laatste handeling) als grens: een tik is zelf een handeling, dus de klok ziet het verschil tussen opnieuw afvinken en nieuw werk niet. Het moment van de eerste keer ook in het log zetten (`SetLog.at`): niet nodig voor de dag, en het log zegt dan iets anders dan wat je deed; `SetLog.at` blijft het moment van afvinken.

## Bron

Uitslag van Warden op `warden/afbreker-herstel`, punten 2 en 3 (Mag); backlogpunt I-45.

## Vervangt

Niets. Vult `2026-11-15-dag-van-afronden.md` aan.

## Terugdraaien

In `FinishSheet.tsx` weer de laatste `doneAt` van de afgevinkte rijen nemen in plaats van `lastWorkMoment`. Het veld `firstDoneAt` in het concept mag blijven staan; het komt nooit in een log.

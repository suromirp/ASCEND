# Het voorstel van Spieren voor de berg in lagen

Datum: 2026-11-14
Status: aangenomen

## Besluit

Het voorstel van Spieren voor de berg (weekterugblik en de melding in Forge) toont in deze volgorde één korte laag per regel: de Nederlandse naam van de oefening als titel, in welke training hij komt, wat je doet met de dosis, waarom (het droge feit en "kan helpen"), wat de telling minder zeker maakt, en wat er na Akkoord gebeurt. Alle woorden komen uit `muscleNoticeText` in `src/engine/mountainMuscles.ts`; Forge en de weekterugblik hebben geen eigen versie.

Daarbij:

- Elke oefening die het voorstel kan kiezen heeft een Nederlandse naam als alias in `src/data/exercises.ts`. In Forge, logs en MacroFactor blijft de Engelse naam.
- Heet de oefening in Forge anders, dan staat er één zin bij: "In Forge heet hij Single Leg Stance." Ook na Akkoord.
- "Harde sets" en "werk op één been" staan niet meer op het scherm. De vierde rij heet een evenwichtsoefening, want de telling kijkt alleen naar oefeningen met patroon `balance`.
- Op het scherm staan alleen de weken die meetelden ("de laatste drie weken"). Wat niet meetelde staat per rij juist achter de i: bij de drie spieren een rustweek, bij evenwicht ook een week met vakantie, een tocht of zonder sportschool.
- Sets die aan geen oefening gekoppeld konden worden staan op het scherm, ook in Forge, nooit alleen achter de i; Forge heeft geen i.
- Na Akkoord zegt de tekst dat de oefening vanaf je volgende keer de laatste oefening in die training is. De naam van de training staat achteraan, zodat een naam met haakjes zoals Benen A (zwaar) goed leest.

## Reden

De eigenaar snapte het oude blad niet. "Werk op één been" klonk als lunges, "zonder rustweek of vakantie" las alsof je geen vakantie had, en "zo lang je stil kunt staan" en "harde sets" zeiden niet wat je moest doen. De titel was een halve zin met een Engelse naam.

## Alternatieven

De Engelse naam houden zoals in Forge: dan leest het voorstel als een lijstje uit de sportschool en niet als een zin. Een aparte tabel met Nederlandse namen naast de data: dan staan namen op twee plekken. De alias in de data volgt het besluit `2026-11-12-je-week-tot-nu.md` (de naam wordt opgezocht, niet verzonnen).

## Bron

Melding van de eigenaar over het blad Voorstel in de weekterugblik (week van 9 november), de stemgids `docs/beslissingen/2026-11-09-stem-van-ascend.md`, en de gids van Op één been staan in `src/data/exerciseGuides.ts`.

## Vervangt

Niets. De telling en de keuze van het voorstel (`docs/beslissingen/2026-11-02-forge-herinrichting.md`, `docs/beslissingen/2026-11-11-enkel-evenwicht.md`) blijven zoals ze zijn.

## Terugdraaien

Zet `muscleNoticeText`, `WeekReview.tsx` en `MountainMuscleNotice.tsx` terug naar de commit vóór de branch `claude/voorstel-begrijpelijk`. De Nederlandse aliassen mogen blijven staan; ze veranderen alleen de naam in het voorstel en helpen bij het herkennen van een Nederlandse naam.

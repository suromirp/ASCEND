# Kleding zelf bijstellen

Datum: 2026-10-24
Status: aangenomen

## Besluit

Je kunt wat ASCEND over je kleding leerde ook zelf bijstellen. Het blad dat eerst "Geleerd over je kleding" heette, heet nu "Kleding bijstellen" en toont per sport (hardlopen, wandelen en fietsen) een min en een plus. Min is warmer kleden, plus is lichter kleden. Een tik is een halve graad, hooguit vier graden de ene of de andere kant op; bij die grens gaat de knop op slot. Daartussen staat de waarde: "Standaard" bij nul, anders bijvoorbeeld "1,5° lichter" of "0,5° warmer". Eronder blijft "Terug naar de standaard", die alleen werkt als er iets is bijgesteld. De rijen per sport hebben geen label "auto" meer, want de waarde is nu van jou en van ASCEND samen. In de lijst met instellingen toont de rij "Je kleding" het label nog wel zodra er iets is bijgesteld (de waarde komt uit `clothingValue` in `src/engine/settingsSummary.ts`); die rij moet dit nog volgen.

## Reden

Het blad liet alleen zien wat een tik na een buitentraining had opgeleverd. Klopte een bijstelling niet meer, dan kon je niets anders dan alles terugzetten naar de standaard. Nu kun je één sport een halve graad terugdraaien of vooruitschuiven zonder de rest te raken. De knoppen doen precies wat een tik na de training doet: ze roepen dezelfde functie aan (`applyClothingFeedback`, "Te koud" voor min en "Te warm" voor plus) en schrijven in hetzelfde veld, `AppSettings.clothingAdjust`. Er is dus geen nieuw veld en geen migratie nodig, en het kledingadvies rekent met dezelfde waarde als eerst. Het label "auto" hoort bij wat ASCEND zelf bijhoudt; een waarde die je ook zelf verandert is dat niet meer.

## Alternatieven

Het blad alleen laten tonen wat er geleerd is, zoals het was: dan blijft een misser alleen met "Terug naar de standaard" te herstellen. Een veld om graden in te typen: preciezer dan nodig, want het advies werkt in halve graden en de tikken na de training doen dat ook. Het label "auto" houden naast knoppen om zelf te veranderen: dat zegt dat ASCEND het bijhoudt terwijl jij er net aan zit.

## Bron

De bouw in commit `74111ff` (Kleding zelf bijstellen): `src/components/settings/groups/VandaagSheets.tsx` (`ClothingSheet`) en `src/engine/clothingFeedback.ts`. Het kledingadvies zelf staat in `docs/beslissingen/2026-10-22-kledingadvies-bij-het-weer.md`.

## Vervangt

Vult `2026-10-22-kledingadvies-bij-het-weer.md` aan, dat de bijstelling alleen via de tik na de training kende, en neemt in `2026-10-22-instellingen-in-groepen.md` het kleine punt over dat wat ASCEND over je kleding leerde het label "auto" krijgt. Die besluiten blijven verder staan.

## Terugdraaien

In `ClothingSheet` de twee knoppen per sport weghalen en de titel "Geleerd over je kleding" terugzetten, met het label `AutoTag` bij een bijgestelde sport. Het veld `clothingAdjust` blijft zoals het was.

# 48 uur tussen zware beenkracht en de lange duurloop

Datum: 2026-11-02
Status: aangenomen

## Besluit

Tussen zware beenkracht (Benen A, Benen B, Forge voor de benen) en de lange duurloop houdt de planner 48 uur, in beide volgordes. De lange duurloop telt voor deze regel als beenzwaar (`engine/scheduler.ts#legSpacingDays`).

Daarbij:

1. Een instelling, standaard uit: "Beenkracht de dag na de lange duurloop" (Planning, onder Geavanceerd, `AppSettings.longRunThenLegs`). Aan mag beenkracht 24 uur na de lange duurloop, alleen in die volgorde, en niet als de dag vóór de lange duurloop al beenzwaar is (`findHeavyConflicts` met `legHeavyDayBefore`), zodat er nooit drie zware beendagen op rij komen. Dat geldt ook vanaf de andere kant: een beenzware sessie op de dag vóór een lange loop met kracht de dag erna botst met die krachtsessie. Kracht en dan de dag erna de lange duurloop blijft 48 uur, ook met de instelling aan.
2. Het weekendblok (heuvels op zaterdag, lange duurloop op zondag, `pairingOverride: 'prefer'`) blijft vrijgesteld, alleen in die volgorde en op de eigen dagen. "Op de eigen dagen" geldt voor de melding (`reportYours` in `engine/weekValidator.ts`): staat het blok door jou buiten zijn eigen dagen, dan meldt Week het, maar de planningsronde herstelt dat niet zelf.
3. Wat blijft zoals het was: 72 uur na een tocht met afdalen, 48 uur tussen heuvels en kracht, 48 uur tussen twee krachtdagen voor de benen, en de extra dag bij een gelogde RPE van 9 of hoger of een piek (`requiredSpacingDays`).
4. Bestaande planningen: de planningsronde verschuift alleen wat het systeem zelf plande en niet vastgezet is (niveau 3 in `engine/weekValidator.ts#lockLevel`). Wat jij of een voorstel vastzette blijft staan, en Week meldt het als LEG-SPACING. Historie verandert niet.
5. Wat dezelfde regel leest, volgt mee: het advies SAME-MUSCLE-SPACING (`engine/adviceEngine.ts`), de zin over je week (`engine/weekProfile.ts`) en de opmerking "mag na rustige loop" in Week (`engine/allowedPair.ts`), die nu alleen nog verschijnt met de instelling aan.

## Reden

Het onderzoek laat zien dat het bewijs niet symmetrisch is. Na een rustige lange loop is de beenkracht binnen 24 uur meestal terug, maar na zware beenkracht piekt de spierpijn 24 tot 48 uur later, en een lange loop duurt lang genoeg om dat te voelen. Belangrijker voor de planning: na het weekendblok gaf de oude regel van 24 uur ruimte voor Benen A op maandag, en dat zijn drie beenzware dagen op rij (heuvels, lange duurloop, Benen A). De eigenaar wil geen twee zware beendagen achter elkaar, met het weekendblok als enige bewuste uitzondering.

## Alternatieven

- De oude regel houden, 24 uur in beide volgordes. Afgewezen: maakt drie beenzware dagen op rij mogelijk en past niet bij wat de eigenaar wil.
- 24 uur alleen in de volgorde lange loop en dan kracht, als standaard. Afgewezen als standaard: fysiologisch te verdedigen, maar het onderzoek raadt 48 uur aan als advies; het is nu de instelling.
- 72 uur na heuvels met afdalen zolang je het afdalen niet gewend bent. Niet gedaan: vraagt eerst een telling van gewenning in de beenindex.

## Bron

`docs/onderzoek/Lange duurloop en een zware beendag.md` (vraag 4, het voorstel voor `legSpacingDays`) en de wens van de eigenaar om geen twee zware beendagen achter elkaar te hebben.

## Vervangt

Het 24-uursdeel van `docs/beslissingen/2026-10-27-groei-tot-de-wedstrijdpiek.md`, onder "Bewust niet gedaan": "Een zware beendag de dag voor een lange loop blijft toegestaan ... tussen de lange loop en beenkracht geldt 24 uur". De rest van dat besluit blijft staan.

## Terugdraaien

Zet de instelling "Beenkracht de dag na de lange duurloop" aan voor 24 uur in de volgorde lange loop en dan kracht. Helemaal terug naar 24 uur in beide volgordes kan alleen in de code: `legSpacingDays` gaf voor een rustige loop naast kracht 0 in elke volgorde. Er is niets opgeslagen dat terug moet; de sleutel `longRunThenLegs` is optioneel en een oude back-up zonder die sleutel leest als uit.

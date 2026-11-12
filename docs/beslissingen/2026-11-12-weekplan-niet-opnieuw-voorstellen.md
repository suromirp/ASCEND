# Het weekvoorschrift stelt niet opnieuw voor wat niet bleef staan

Datum: 2026-11-12
Status: aangenomen

## Besluit

Het weekvoorschrift zet een training alleen neer als de planningsronde hem zelf heeft bevestigd, en stelt niet opnieuw voor wat al eens is aangenomen en er nu toch niet staat. De zin over weken waar niet alles past zegt niet meer dat elke dag bezet is.

## Reden

Bij de eigenaar kwam op één dag twaalf keer hetzelfde aangenomen voorstel binnen: een Wandeldag op een zaterdag zestien weken vooruit, die er daarna niet stond. Het voorschrift rekent bij elke opening opnieuw uit wat een week mist. Blijft een toevoeging niet staan, dan mist de week hem de volgende opening weer en komt hetzelfde voorstel terug, met elke keer een melding en een regel in het logboek.

Drie dingen zijn veranderd.

- Natellen tot het klopt (`engine/weeklyPrescriptionDiff.ts#settleWithRound`). De controle "laat de ronde dit staan" liep hoogstens drie keer en gaf na de derde keer een rest terug die niemand had nageteld. Nu komt alleen een uitkomst terug die de ronde zelf bevestigde. Lukt dat niet binnen acht keer, dan blijft alleen over wat geen rij raakt.
- De ronde rekent met het voorstel al in het logboek. De echte ronde leest het logboek (een test die het voorschrift weghaalde komt terug); de proefronde las het logboek van ervoor. Een weghaling die de ronde terugdraait telt niet meer als weghaling.
- Geheugen (`engine/weeklyPrescriptionDiff.ts#withoutRepeatedAttempts`). Het logboek van aangenomen voorstellen van het weekvoorschrift is het geheugen: dezelfde training op dezelfde dag, dezelfde rij naar dezelfde dag, of dezelfde rij eruit terwijl ze er weer staat, komt niet nog eens. Wie het terugdraaide maakt niet uit: de ronde, een periode of jij met Ongedaan maken.

De gevolgzin was "In 36 weken is elke dag al bezet, dus niet alles past." Een week telt daar ook mee als er wel een dag vrij is waar de training niet mag (een dag waarop je niet traint, te weinig tijd, te dicht op een zware dag). De zin is nu "In 36 weken past niet alles: er is geen dag waar het bij kan."

## Eigen keuzes buiten de opdracht

- Het geheugen gebruikt het bestaande logboek en geen nieuw veld. Er is dus geen migratie nodig; een oude back-up met samengevatte voorstellen (zonder wijzigingen) houdt niets tegen.
- Het geheugen geldt ook na Ongedaan maken. Voorheen zette de volgende opening terug wat je net ongedaan had gemaakt.
- Het geheugen verloopt vanzelf met het opruimen van oude voorstellen (`engine/proposalTidy.ts`): een samengevat voorstel telt niet meer.
- De bestaande test op de oude gevolgzin (`engine/weeklyPrescriptionEngine.test.ts`) is aangepast aan de nieuwe zin, omdat de opdracht om een zin vroeg die klopt.

## Wat niet is gevonden

De precieze oorzaak in de gegevens van de eigenaar is niet nagespeeld: zonder zijn back-up gaf geen van ruim negentig nagemaakte standen (doel, dagbudget, eigen slot, vakantie, tocht, vrije dagen) een toevoeging die de proefronde liet staan en die daarna verdween. Het gat in het natellen is aangetoond met een eenheidstest, de herhaling met een opslagtest waarin de rij na elke opening weg is. Speel de back-up na de merge na (skill naspelen): de lus moet weg zijn, en het logboek laat zien wat de rij weghaalde.

Los daarvan gevonden, niet gewijzigd: `consecutiveKeepWeeks` in het weekvoorschrift telt openingen in plaats van weken (elke week neemt de opgeslagen teller van de week ervoor plus één). Daardoor schrijft de stap de eerste tien tot vijftien openingen na een verandering elke keer voorschriften weg en leest de app een keer extra. Er komt geen melding van en de teller wordt nergens gelezen.

## Alternatieven

- Alleen het natellen herstellen. Dat dicht het gat dat in de code te zien is, maar bewijst niet dat de lus bij de eigenaar daar vandaan komt. Zonder geheugen kan een andere oorzaak dezelfde lus geven.
- Een nieuw veld met "al geprobeerd" per week. Dat vraagt een migratie en zegt hetzelfde als het logboek al zegt.
- De toevoeging vastzetten met een slot zodat de ronde hem laat staan. Dat zou een regel van de ronde omzeilen; de ronde wint.

## Bron

Melding van de eigenaar van 12 november, nagespeeld door de coördinator. `src/storage/weeklyPrescriptionRepeat.test.ts`, `src/engine/weeklyPrescriptionDiff.test.ts`, `docs/werkbriefjes/planning.md`.

## Vervangt

Niets. Bouwt voort op de valkuil van 9 november in `docs/werkbriefjes/planning.md` (het voorschrift houdt alleen wat de ronde laat staan).

## Terugdraaien

Haal de aanroep van `withoutRepeatedAttempts` uit `src/storage/weeklyPrescriptionStep.ts`; het natellen en de zin staan los daarvan.

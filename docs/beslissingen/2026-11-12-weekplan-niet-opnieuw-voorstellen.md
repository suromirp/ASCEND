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
- Geheugen van vier weken (`engine/weeklyPrescriptionDiff.ts#withoutRepeatedAttempts`, `REPEAT_MEMORY_DAYS`). Het logboek van aangenomen voorstellen van het weekvoorschrift is het geheugen: dezelfde training op dezelfde dag, dezelfde rij naar dezelfde dag, of dezelfde rij eruit terwijl ze er weer staat, komt vier weken lang niet nog eens. Wie het terugdraaide maakt niet uit: de ronde, een periode of jij met Ongedaan maken. Na vier weken mag het voorschrift het één keer opnieuw proberen, met de gewone melding; wat de rij weghaalde kan tijdelijk zijn geweest. Staat dezelfde training er die dag al, dan komt er nooit een tweede rij bij.
- Een paar blijft een paar, beide kanten op (`withoutOrphanedAdds`). Valt de weghaling weg omdat de rij er weer staat, dan valt de toevoeging die haar zou vervangen mee; anders krijgt een volle week er een training bij in plaats van een vervanging.

De gevolgzin was "In 36 weken is elke dag al bezet, dus niet alles past." Een week telt daar ook mee als er wel een dag vrij is waar de training niet mag (een dag waarop je niet traint, te weinig tijd, te dicht op een zware dag). De zin is nu "In 36 weken past niet alles: er is geen dag waar het bij kan." De teller komt uit wat het voorschrift wil, voordat de dagen die niet mogen, het geheugen en de ronde er iets afhalen; hij zegt dus hoeveel weken het voorschrift niet rond kreeg, niet wat er op het scherm veranderde.

## Eigen keuzes buiten de opdracht

- Het geheugen gebruikt het bestaande logboek en geen nieuw veld. Er is dus geen migratie nodig. Een samengevat voorstel (`engine/proposalTidy.ts`) telt niet mee, ook niet de weghalingen die het bewaart, en een oud voorstel zonder lijst van wijzigingen breekt niets.
- Het geheugen geldt ook na Ongedaan maken. Voorheen zette de volgende opening terug wat je net ongedaan had gemaakt.
- Vier weken is een keuze, geen meting. Zonder grens zou een dag zestien weken vooruit voor altijd dicht blijven: het opruimen vat een voorstel pas samen als alles wat het raakte drie maanden voorbij is, en een ongedaan gemaakt voorstel nooit. Met de grens is het ergste geval één melding per vier weken in plaats van één per opening. In die vier weken is het stil: de week mist dan een training die het voorschrift wil, zonder dat je het hoort. Dat is een bewuste ruil en hoort bij wat nog open staat.
- De bestaande test op de oude gevolgzin (`engine/weeklyPrescriptionEngine.test.ts`) is aangepast aan de nieuwe zin, omdat de opdracht om een zin vroeg die klopt.

## Wat niet is gevonden

De precieze oorzaak in de gegevens van de eigenaar is niet nagespeeld: zonder zijn back-up gaf geen van ruim negentig nagemaakte standen (doel, dagbudget, eigen slot, vakantie, tocht, vrije dagen) een toevoeging die de proefronde liet staan en die daarna verdween. Het gat in het natellen is aangetoond met een eenheidstest, de herhaling met een opslagtest waarin de rij na elke opening weg is. De eerste keer kan er dus nog één melding komen met een training die daarna niet staat; daarna is het vier weken stil. Speel de back-up na voor de squash naar main (skill naspelen): de lus moet weg zijn, en het verschil tussen de proefronde en de echte ronde laat zien wat de rij weghaalt. Dat is de echte oorzaak en die is nog niet hersteld.

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

Haal de aanroep van `withoutRepeatedAttempts` uit `src/storage/weeklyPrescriptionStep.ts`; het natellen en de zin staan los daarvan. Een andere lengte van het geheugen is één getal (`REPEAT_MEMORY_DAYS`).

## Aanvulling na review, 12 november

De oorzaak was de planningsronde die de toevoeging weghaalde (de fase van die week wil geen wandeldag); het voorschrift zette hem bij elke opening terug. Dat is hersteld op 11 november (d687a1f, `keptByPlanningRound`). De twaalf voorstellen in de back-up zijn van 9 november, dus van voor dat herstel; nagespeeld op main geeft de back-up geen nieuw voorstel meer.

Het geheugen van vier weken (`withoutRepeatedAttempts`, `REPEAT_MEMORY_DAYS`) is daarom na review weggelaten: de oorzaak is bekend en hersteld, en het geheugen zou een terechte training tot 28 dagen stil tegenhouden. Wat hierboven over het geheugen staat geldt niet meer. Wat blijft: natellen tot de ronde niets meer weghaalt (`settleWithRound`), het voorstel in het logboek van de proefronde, paren die samen wegvallen (`withoutOrphanedAdds`) en de gevolgzin. Haalt de ronde na acht keer nog iets weg, dan komt er geen rij bij, gaat er geen weg en schuift er geen; wat geen rij raakt wordt gewoon gemeld.

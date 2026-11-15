# Week telt gemist op één manier, ook zonder sportschool

Datum: 2026-11-15
Status: aangenomen

## Besluit

Gemist heeft één afleiding voor de rijen in Week, de kaart "Je hebt n training gemist", de weekterugblik en het inhaaladvies: voorbij (vandaag telt nog niet, ook niet laat op de avond), zonder log, niet overgeslagen, niet in een pauze en niet lopend in Forge (`engine/sessionStatus.ts#isMissedSession`, de stand `missed`; de kaart telt met `engine/weekList.ts#missedInWeek`).

- Zonder sportschool telt alleen wat de sportschool nodig heeft als weg (`engine/leave.ts#isAwayFor`, `engine/templateRoles.ts#isGymStrengthTemplate`). Een loop, een wandeling of Eigen gewicht in die periode telt gewoon: niet gedaan is gemist, en de lange duurloop wordt ingehaald zoals op elke andere dag. Een vakantie en een tocht blijven helemaal weg, nooit gemist. Wat de periode zelf liet vallen telt niet.
- Zonder sportschool is geen pauze: wat ervoor open stond vervalt niet en krijgt gewoon de vraag Niet gedaan? (`engine/missedTraining.ts#pauseSince`). Op een dag zonder sportschool kan het inhalen een loop plannen; alleen een vakantie- of tochtdag sluit dat uit (`engine/leave.ts#isPauseDay`).
- Overgeslagen is overgeslagen, geen gemist. Het telt als gepland en niet gedaan ("2 van 7"), maar niet op de kaart en niet onder gemist in de weekterugblik. In Week krijgt de rij het woord van Vandaag ("overgeslagen") en een gedempt teken in plaats van het rode kruis: rood staat in de app voor iets dat misging.
- Een waarschuwing over belasting in Week hoort bij een training die nog kan gebeuren of gedaan is. Een voorbije training zonder log draagt in Let op geen belasting meer (`engine/weekValidator.ts`, alleen met `reportYours`; de planningsronde leest de controle ongewijzigd).
- Het inhaaladvies leest dezelfde weekcontrole als Let op (`engine/hardRunApart.ts#weekAccepts`, ook over de weekgrens): nooit een voorstel dat Week daarna zelf afkeurt. "Vandaag deed je geen training" alleen als er vandaag niets meer open staat; staat er vandaag een training, dan is morgen geen rustdag om op te vullen. De week van een inhaal heeft een naam: "deze week", "volgende week" of "de week van 23 november".
- In "verplaatst van do 12" wordt de dag nooit afgekapt; is de regel te lang, dan wijkt het woord ervoor.

## Reden

Melding van de eigenaar, zondag 15 november 10:40, met een periode Zonder sportschool van za 14 tot en met wo 18 november. Week toonde rode kruisen op vrijdag (twee, overgeslagen) en op zondag (Eigen gewicht, zelf overgeslagen), maar de kaart zei "Je hebt 1 training gemist": die ene was de lange duurloop van zaterdag, juist de rij zonder kruis. Diezelfde lange loop kreeg amber "1 dag voor Heuvelintervallen" terwijl hij niet gedaan was, en het advies zette hem op maandag direct na de heuvelintervallen ("want vandaag deed je geen training" om 10:40, met Heuvelintervallen nog gepland). Nagespeeld met nagemaakte gegevens op de versie van voor 14 november: precies die kaart en die zin. Op de versie van daarna stond de lange loop grijs als vervallen en zei de kaart niets: een loop zonder sportschool viel helemaal uit beeld.

Naspelen met de echte back-up (de coördinator, gemaakt om 11:50 op versie fe704a3) gaf op die versie 0 gemist en geen advies. Het advies van 10:40 komt dus van de build ervoor: de app werkt pas bij na Bijwerken (`registerType: 'prompt'`), en de enige aanroeper van het advies (`state/adviceAndWeek.ts`) geeft de periodes mee sinds 12 november; het advies wordt nergens bewaard. In de back-up is de lange duurloop een wandelsjabloon (type hiking) en geruild met Heuvelintervallen; dat telt nu ook als gewone loop (toets in `src/engine/weekTelling.test.ts`).

Een periode zonder sportschool meldt dat de sportschool er niet is, niet dat je niet traint. Wie dan een lange loop laat liggen, heeft hem gemist, zoals op elke andere dag; het plan zette hem er juist neer omdat hij kon.

## Botsing met 14 november

Het besluit `2026-11-14-vakantie-en-ziek-niet-gemist.md` (punt L) noemde zonder sportschool bewust een pauze ("Bewust breed (Warden): ook een periode zonder sportschool is een pauze, want je meldde dat je weg bent"). Dat besluit bedoelde dus wel dat een loop zonder sportschool nooit gemist is. Dit besluit draait dat terug voor gemist: zonder sportschool laat alleen de sportschooltrainingen vallen. Het oude besluit blijft staan; de vakantie, de tocht, de ziekte, de racebescherming en de rustiger instap gelden zoals daar beschreven. De rustiger instap (`engine/reentry.ts`), "Deze week nog een keer?" (`engine/repeatWeek.ts`) en de extra training lezen een week zonder sportschool nog als een week weg (`engine/leave.ts#isAwayDay`): dat gaat over de belasting na terugkomst, niet over gemist, en is hier niet veranderd.

## Alternatieven

- Overgeslagen ook "gemist" noemen, zodat de kaart drie zegt bij drie kruisen. Niet gekozen: overgeslagen is een keuze of een afgesloten vraag, en de eigenaar noemt het zelf geen fout; de weekterugblik telde het wel als gemist, de kaart niet, en dat verschil was juist de klacht.
- Alleen het teken rood laten en de telling aanpassen. Niet gekozen: dan blijft rood het teken van een fout voor een eigen keuze, anders dan Vandaag en de rustdag in Week.
- De weekcontrole ook voor de planning zelf een voorbije training zonder log laten negeren. Niet gedaan: de planningsronde en de golden scenario's mogen niet bewegen door Week; het verschil zit alleen in wat Let op toont en wat het inhalen toetst.
- Een instelling "Zonder sportschool telt als pauze". Niet gekozen: dit is geen keuze die ASCEND voor je maakt maar de betekenis van een periode die je zelf meldt; wie niet wil trainen meldt een vakantie.

## Bron

De eigenaar koos dit zelf (15 november, via de coördinator: "Ja advies"): zonder sportschool vervalt alleen wat de sportschool nodig heeft; een duurloop of wandeling die je niet deed telt gewoon als gemist en kan het gewone inhaaladvies krijgen. Melding en twee schermafdrukken van de eigenaar (15 november 10:40), nagespeeld met nagemaakte gegevens op `1861809^` en `claude/nacht`; toetsen in `src/engine/weekTelling.test.ts`.

## Vervangt

`2026-11-14-vakantie-en-ziek-niet-gemist.md` op één punt: zonder sportschool is voor gemist geen pauze meer, alleen sportschooltrainingen in die periode tellen als weg.

## Terugdraaien

`engine/leave.ts#isAwayFor` op een dag zonder sportschool weer `true` laten geven en `pauseSince` de periodes zonder sportschool weer laten meenemen. Het teken: de kleur van `skipped` in `components/WeekIcons.tsx`. De weekcontrole: de regel `happened` in `engine/weekValidator.ts`. Het inhalen: `weekTakes` in `engine/adviceShared.ts`. Er verandert geen opgeslagen vorm.

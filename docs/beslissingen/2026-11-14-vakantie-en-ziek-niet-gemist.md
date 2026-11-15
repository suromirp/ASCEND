# Vakantie en ziek niet gemist, race beschermd, rustiger instap

Datum: 2026-11-14
Status: aangenomen

## Besluit

Drie dingen uit de profielendoorloop (backlog E, K en L), samen gebouwd omdat ze dezelfde vraag stellen: wat is gemist?

- L. Een vakantie, tocht of periode zonder sportschool die je zelf meldde, telt nooit als gemist. Wat daar stond en niet gedaan is, valt uit de telling (`engine/weekLogs.ts#leftOutOfCount`, `engine/leave.ts#isAwayDay`): geen "0 van 5", geen "bleef liggen", geen "Deze week nog een keer?" over die week (`engine/repeatWeek.ts`), geen Niet gedaan? en geen inhaaladvies. Wat je er wel deed, telt als gedaan. Vrije dagen zijn tijd die je hebt, geen pauze: daar telt gemist gewoon. Bij een ziekmelding of vakantie vervalt wat ervoor nog open stond (`engine/missedTraining.ts#pauseSince`): geen vraag en geen inhaaladvies meer, met één regel op Vandaag onder het kopje Vervallen, de eerste drie dagen van de pauze ("Benen A van woensdag 25 november en Bergtocht van zondag 29 november vervallen: je meldde een vakantie. Inhalen hoeft niet."). Er wordt niets overgeslagen of herschreven: in de week ervoor blijven ze gewoon gemist.
- E. Binnen zeven dagen voor een wedstrijd (de afbouw) en op de racedag geen inhaaladvies, geen "doe vandaag in plaats van je rustdag" en geen rustdagruil (`engine/adviceShared.ts#raceWeekGuard`). Op de racedag zelf geen Niet gedaan?. Nog open ouder dan zeven dagen verdwijnt overal vanzelf (`MISSED_MAX_AGE_DAYS` van 14 naar 7). Gemist heeft één woord en één plek: de kaart Niet gedaan? heeft het kopje Gemist (was Nog open), het inhaaladvies heet "... gemist" (was "is blijven liggen"), en staat het inhaaladvies op Vandaag, dan wacht de vraag tot dat beantwoord is.
- K. Na een pauze (ziek en een vakantie, of twee weken met weinig training) stelt ASCEND op de eerste vier dagen terug een rustiger instap voor (`engine/reentry.ts`, regel REENTRY): zeven dagen vanaf de dag terug duren je trainingen driekwart (het advies) of de helft van de gewone tijd. Een voorstel met Akkoord via de planningsronde, met de trainingen die korter worden en Ongedaan maken. Instelling Rustiger instap na een pauze in Lichaam: Driekwart, De helft of Niet voorstellen.

Waar het staat: L en E op Vandaag (de kaart Gemist onder Je dag, het advies, de weekterugblik op maandag) en in Week (de ring bovenaan en het blad Je week); ook Ritme en de reeks op Je stand en de seizoensstrook tellen zo. K op Vandaag als advies, het voorstel als blad, daarna de kortere duur in Week en op de missiekaart.

Bewust breed (Warden): ook een periode zonder sportschool is een pauze, want je meldde dat je weg bent; een vraag die bij een pauze verviel komt na de pauze niet terug, ook niet als de regel dan weg is; binnen zeven dagen voor een wedstrijd haalt ASCEND niets meer in, ook geen sleuteltraining van voor de afbouw. De extra loop (`engine/extraRun.ts`) telt een vakantieweek wel als week zonder training, zodat er na een pauze geen extra loop bij komt; die telling staat nergens als zin over de vakantie.

Geen eigen instelling voor "niet inhalen binnen zeven dagen voor een race" en "vervallen bij een pauze": beide zijn geen keuze die ASCEND voor je maakt, maar het weghalen van een advies dat op dat moment niet klopt. Een inhaal in de afbouw schaadt de wedstrijd, en een pauze meldde je zelf. Wie toch wil inhalen, verplaatst de training in Week (met Akkoord). Wie helemaal niets over gemist wil zien, kiest bij Training die niet doorging voor Niets doen: dan zegt ASCEND ook niets over vervallen. De rustiger instap is wel een keuze en heeft daarom een instelling.

Herstel na Warden (14 november, ronde 2): één id per terugkomst (een Liever niet op vrijdag of zondag komt maandag niet terug), de instap leest dezelfde racebescherming als het inhalen (`raceWeekGuard`, ook een race die alleen een doel is), zonder pauze hoogstens één voorstel per drie weken, een voorbije training op een vakantiedag heeft in Week de neutrale stand `away` (`engine/sessionStatus.ts`, dezelfde afleiding als de weekterugblik), "bleef liggen" heet overal "gemist", en een lopende instap staat op Vandaag in de kaart Rustiger instap en in het logboek van voorstellen.

Na Pathfinder (14 november): een gemelde pauze heet nooit gemist. De regel over wat bij een pauze vervalt heeft het kopje Vervallen en zegt "je meldde een vakantie" of "je meldde ziekte"; "gemist" is alleen voor wat je zelf liet liggen. Het voorstel heet "Rustiger instap de eerste week terug?" en blijft vier dagen staan, voor wie op reis de app niet meteen opent.

## Reden

De profielen ziek-vakantie (1 tot 3) en hardloper (3, 4, 7) en GR5 (9): een vakantie die je zelf meldde kwam terug als verwijt, een gemiste bergtocht van voor de vakantie werd op de eerste vakantiedag als inhaaladvies aangeboden, zes dagen voor de race kwam een lange duurloop als inhaal, oude Nog open bleef weken staan, en na bijna drie weken bijna niets sprong het plan naar een volle week met 165 minuten bergtocht.

Een gemelde pauze is een feit over je kalender, net als ziekte (die telde al niet als gemist). Een week op vakantie is geen tegenvallende week. Voor de terugkomst: terugkeer op 70 tot 80 procent van de gewone omvang, dezelfde factor als Weer opbouwen na ziekte (`engine/illness.ts`, `docs/onderzoek`); de helft voor wie voorzichtiger wil.

## Alternatieven

- De oude vragen bij de ziekmelding of vakantie als rijen in het voorstel opnemen ("vervalt", op overgeslagen). Niet gekozen: de vakantieronde (`engine/leaveProposal.ts`) is gevoelig voor extra rijen en een overgeslagen rij telt na Akkoord anders in de weekterugblik. Afgeleid vervallen raakt geen rij en geen historie.
- Het blok een week verschuiven na een pauze. Niet gekozen: de doeldatum ligt vast, dus dat eet de afbouw of een latere golf op en elke latere sessie schuift mee. "Het doel blijft het doel". De herhaalweek bestaat al voor een tegenvallende week binnen een golf.
- Een rustiger instap ook in een raceweek. Niet gekozen: de afbouw is al licht en de wedstrijd zelf mag niet korter. Ook niet tijdens Weer opbouwen na ziekte: dat schema doet het al.
- De fasekop ("Bergcapaciteit, week 3 van 4") laten meeschuiven. Niet gebouwd: de kop volgt de kalender; de instap kort de duur, niet de fase.

## Bron

`docs/profielen/2026-11-14-ziek-vakantie.md` en `2026-11-14-hardloper.md` (branches `claude/profiel-*`), `docs/profielen/2026-11-14-gr5.md` punt 9, backlog Inbox E, K en L.

## Vervangt

`2026-11-01-niet-doorgegaan.md` op één punt: de vraag Niet gedaan? reikt een week terug, niet twee. En na beter melden komt een vraag van voor de ziekte niet terug (het koppelvoorstel van een horlogelog wel).

## Terugdraaien

L: de parameter `away` van `leftOutOfCount` niet meer meegeven en `pauseSince` uit `planMissed` en `missedAdvice` halen. E: `raceWeekGuard` uit de drie regels halen en `MISSED_MAX_AGE_DAYS` terug naar 14. K: de instelling op Niet voorstellen; `reentryWeeks` is een optionele lijst in de instellingen, een oudere back-up heeft hem niet en importeert gewoon.

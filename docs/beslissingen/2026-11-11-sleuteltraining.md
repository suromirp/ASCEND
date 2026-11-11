# De sleuteltraining past bij je doel

Datum: 2026-11-11
Status: aangenomen

## Besluit

De sleuteltraining heeft één definitie, per soort doel of per richting zonder doel, als pure functie in `src/engine/keySession.ts`. De regel "Volgende sleuteltraining" op Ascend (`nextKeySession`) en het inhalen van een gemiste training (`engine/adviceWeek.ts`, de regels MISSED-CATCH-UP en SKIPPED-KEY-TO-REST, en de korte versie in `adviceShared.ts#keyCatchUpShort`), REST-BACK (`restDayBack.ts`), de weekterugblik, Je stand, de coach en Herhaal de week gebruiken dezelfde functie en dezelfde focus. Dit plant niets: het bepaalt alleen welke geplande training het woord krijgt. Wat het inhalen ermee doet blijft een voorstel met Akkoord.

## Hoe het kiest

De focus is de soort van het hoofddoel, het doel dat de planning volgt (`keyGoalOf`: `mainGoal`, en zonder hoofddoel het actieve doel met het hoogste label en dan de vroegste datum), met de afstand voor een hardloopwedstrijd. Nooit de volgorde van de lijst: slepen op Ascend zonder Akkoord verandert dus niet wat het inhalen voorstelt, en een gepauzeerd doel telt niet (review van Warden). Zonder doel is het de richting (`activeDirection`); een lijst met alleen Fit blijven of Sterker worden is ook een richting. Per focus zijn er treden. Ascend noemt de sleuteltraining van de eerste week (maandag tot zondag) in de komende twee weken waarin er nog een openstaat; binnen die week wint de beste trede, dan de langste, dan de vroegste, en op dezelfde dag een vaste volgorde op id. De lengte is overal dezelfde: wat de rij zegt, anders de volle versie in die week van je programma (`resolveVariantDuration`), voor de regel op Ascend en voor de sleutel van een week. Eigen keuze: "volgende" betekent deze week. De tekstkaart liet zien dat "de langste in twee weken" de lange duurloop van volgende week (60 minuten) noemde terwijl die van morgen (50 minuten) nog openstond. Staat deze week alleen nog een lagere trede open, bijvoorbeeld de lange duurloop bij een 10 km, dan is dat de volgende: elke trede is een sleuteltraining, de trede bepaalt alleen de keuze binnen een week. Vandaag telt mee tot er een log is. Herstel, een test en een wedstrijd zijn nooit de sleuteltraining: die hebben hun eigen naam.

- Hardloopwedstrijd tot en met de halve marathon: de tempoloop of intervallen, dan de heuvelintervallen, dan de lange duurloop. Bij deze afstanden telt snelheid als meter (`data/goalKinds.ts`, meter Snelheid geldt voor 5 km, 10 km en de halve). Het onderzoek zegt dat de kwaliteit richting de wedstrijd specifieker wordt, intervallen en wedstrijdtempo in plaats van heuvels (`docs/onderzoek/Trainingsvormen en varianten.md`, conclusie), en dat de heuvelintervallen in de basis de kwaliteitssessie mogen zijn (`docs/onderzoek/notities/Aanvullend onderzoek GR5 voorbereiding/marathon.md`, deel 3). Expert, geen trial.
- Marathon: de lange duurloop, dan de kwaliteit. "Volume en lange lopen tellen meer dan de precieze verdeling" (zelfde notitie, deel 3, matig bewijs).
- Tocht met hutten of tent, dagtocht, hoogtocht: de bergtocht of de wandeldag (Wandeldag 1 van 2), dan de rugzakwandeling, dan de lange duurloop. De buitentocht met hoogtemeters en rugzak is de wekelijkse sleutel van het programmatype Bergtocht (`docs/onderzoek/Aanvullend onderzoek GR5 voorbereiding.md`, Vier programmatypes).
- Trailrun: de lange duurloop of de bergtocht, dan de heuvelintervallen (`docs/onderzoek/Doelsoorten duur.md`, trail: langste sessie en D+).
- Fietsdoel: de fietstocht, dan de lange duurloop (`Doelsoorten duur.md`, fietsen: de lange rit groeit).
- Triathlon: de langste van fietstocht en lange duurloop, dan de kwaliteit. Eigen keuze: zwemmen wordt niet gepland (het telt alleen mee), dus het kan geen geplande sleutel zijn. De bricks zijn zwak onderbouwd (`Doelsoorten duur.md`, deel 6) en krijgen geen eigen trede.
- Sterker worden (doel of richting): de krachttraining, de langste eerst (`Aanvullend onderzoek GR5 voorbereiding.md`, programmatype Kracht).
- Fit blijven en Fitter worden: de langste duurtraining (lange duurloop, bergtocht of fietstocht). Eigen keuze: deze richtingen vragen minuten per week (`data/directions.ts`), en de lange sessie is waar die minuten het meest samenkomen.
- Rustig aan: geen sleuteltraining. Ascend toont dan geen regel en het inhalen haalt niets in, met één eerlijke zin in de uitleg. Eigen keuze: "liever iets dan niets" verdraagt geen training die je moet inhalen.
- Een doel zonder soort (een oud doel, of een eigen sport zonder soort): de lange duurloop of de bergtocht, precies zoals het inhalen het altijd deed.

Een training in een vakantie zonder training of in een eigen tocht telt niet mee voor de regel op Ascend: die gaat niet door. Vrije dagen halen niets weg. Een week zonder passende training geeft geen regel; liever niets dan een training die het doel niet dient.

## Voorbeeldweken (nagemaakt)

Week van maandag 16 november: ma Benen A 75 min, di rustige duurloop 40, wo Bovenlichaam A 60, do tempoloop 50, za heuvelintervallen 55, zo lange duurloop 70. Voor de tocht staan er ook een rugzakwandeling op woensdag (60) en een bergtocht op zaterdag (180); voor de triathlon een fietstocht op vrijdag (90).

- 10 km: de tempoloop op donderdag. Voorheen: Benen A, omdat die het langst was.
- Marathon: de lange duurloop op zondag.
- GR5 of andere tocht: de bergtocht op zaterdag. Zonder bergtocht de rugzakwandeling, zonder beide de lange duurloop.
- Trailrun: de lange duurloop op zondag.
- Triathlon: de fietstocht op vrijdag (90 tegen 70).
- Fietsdoel: de fietstocht op vrijdag.
- Zonder doel, Fit blijven: de lange duurloop. Sterker worden: Benen A. Rustig aan: geen.
- Doel zonder soort: de lange duurloop.

Deze weken staan als tests in `src/engine/keySession.test.ts`.

## Reden

Ascend noemde bij een 10 km met doeltijd "Benen A (zwaar), 75 minuten" als volgende sleuteltraining, terwijl de kaart erboven zei dat snelheid het meeste te winnen had: `nextKeySession` koos gewoon de langste training. Het inhalen gebruikte hetzelfde woord voor iets anders (de lange duurloop of de bergtocht). Twee betekenissen voor één woord is wat de eigenaar eerder "te vaag" noemde (`docs/visie/Kansen 11 november app.md`, voorstel 3, gekozen op 11 november).

## Overal hetzelfde woord

Ook de weekterugblik, Week, Je stand, de melding van de week, de coach op Ascend, Herhaal de week, de extra training en REST-BACK (`weekReview.ts`, `repeatWeek.ts`, `onCourse.ts`, `extraRun.ts`, `restDayBack.ts`) lezen dezelfde focus, via `components/useKeyFocus.ts` op de schermen en `AdviceInputs.keyFocus` in de voorstellen. De rol `key` op een sjabloon leest geen regel meer.

Eén sleuteltraining per week (keuze van de coördinator na de review van Warden). De sleuteltraining van een week kiest `weekKeySession` uit de trainingen van die week, in dezelfde volgorde als de regel op Ascend. De weekterugblik telt `keyPlanned` en `keyDone` als 0 of 1: had de week een sleutel, en is die gedaan. Herhaal de week (`judgeWeek`: de sleutel niet gedaan), de extra training (driekwart van de weken met de sleutel gedaan) en de coachzin ("sleuteltraining 3 van 4", in weken) lezen die ene. Bij een 10 km is de sleutel van een week dus de tempoloop: die gedaan en de lange duurloop laten liggen telt als een gedane sleutel. De woorden "lange training" in de coach, de extra training en het inhalen zijn "sleuteltraining" of de naam van de training geworden.

Verschuiving bij een tocht: in een week zonder bergtocht of wandeldag is de rugzakwandeling de sleutel van de week. Herhaal de week kan dan voorstellen te herhalen omdat de rugzakwandeling bleef liggen, en de coach telt hem; voorheen telde alleen de lange duurloop of de bergtocht. Zonder doelsoort telt hij wat hij altijd telde, op één verschil na: "Wandeldag 1 van 2" telt nu ook als sleuteltraining, zoals het inhalen hem al behandelde.

Het kostenzinnetje bij Minder in Instellingen (`kindAmount.ts#kindCostLine`) gaat over een soort training, niet over één training, en blijft zoals het is. Het inkorten bij het verplaatsen voor een test (`adviceShared.ts#catchUpMinutes`, TEST-MAKE-ROOM) gaat over een lange training van de week zelf en houdt de oude betekenis.

## Gedragswijziging in de voorstellen

Bij een hardloopwedstrijd tot en met de halve marathon haalt het inhalen nu ook een gemiste tempoloop, intervaltraining of heuvelintervaltraining in. Akkoord van de eigenaar via de coördinator op 11 november. Het blijft een voorstel met Akkoord; de engine verandert de planning niet zelf. Wat erbij hoort, na de review van Warden:

- Hoogstens één inhaal per voorstel: de gemiste sleuteltraining van de beste trede (`weekKeySession`). De rest vervalt, met de zin "ASCEND haalt er hoogstens één in, de belangrijkste". Zo komen er nooit twee inhalen op één dag of twee harde lopen op dagen naast elkaar.
- De 48-uursregel voor zware beendagen kijkt bij het inhalen over de weekgrens (`findCatchUpDate` geeft `respectsHeavySpacing` alle trainingen met belasting; de ruimte op de dag blijft een zaak van de week). Dat geldt ook voor de ochtend- en belastingsregels die dezelfde datums gebruiken; hun tests bleven groen.
- Nooit hard naast hard: een harde loop gaat nooit op de dag voor of na een andere harde loop, en niet op dezelfde dag; een test of wedstrijd houdt de twee dagen ervoor vrij (`engine/hardRunApart.ts`). Alleen voor het inhalen van de sleuteltraining en voor REST-BACK. Een lange duurloop telt niet als hard (lage intensiteit, `scheduler.ts#isHardRun`), dus het inhalen van de lange duurloop verandert hierdoor niet. Zonder deze regel stelde het inhalen in een test een tempoloop op woensdag voor, de dag voor de intervallen.
- Korter in de week erna alleen als die week zelf een sleutel van dezelfde trede heeft (`keyCatchUpShort`), met de naam erbij: "die week heeft al een tempoloop". Een tempoloop in een week met alleen een lange duurloop blijft vol.

Past er geen dag, dan vervalt de training, zoals bij elke gemiste training. Tests: `src/engine/keySessionAdvice.test.ts`, `src/engine/restDayBack.test.ts`.

## Alternatieven

De langste training houden en kracht uitsluiten: lost het geval Benen A op, maar bij een 10 km wint dan nog steeds de lange duurloop terwijl snelheid de zwakste meter is. De zwakste meter volgen (`goalNextStep` uit `docs/visie/Ascend-tab als doelen.md`): beter op termijn, maar dan verandert de sleutel van week tot week en kan het inhalen niet op hetzelfde woord leunen. Een instelling om de sleutel zelf te kiezen: geen vraag van de eigenaar, en elke keuze hier volgt uit de soort doel die hij al koos. Daarom geen nieuwe instelling.

## Bron

`docs/visie/Kansen 11 november app.md` (voorstel 3), de onderzoeksstukken hierboven, en de opdracht van de eigenaar van 11 november via de coördinator.

## Vervangt

Niets. De oude `goalList.ts#nextKeySession` (de langste training) en `adviceShared.ts#isKeySession` (een lijst id's en namen) zijn vervangen door de functie in `keySession.ts`; zonder focus geeft die voor het inhalen hetzelfde als voorheen.

## Terugdraaien

Laat `useGoalViews.ts` en `state/adviceAndWeek.ts` de focus weglaten (dan geldt `DEFAULT_KEY_FOCUS`, het oude inhalen), of zet de commit van dit besluit terug. Er is niets opgeslagen en geen migratie nodig.

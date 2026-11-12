# Missiekaart minimaal: één mint, geen herhaling van de Briefing, Je dag dichter bij de missie

Datum: 2026-11-12
Status: aangenomen

## Besluit

Spoor 10 van `docs/visie/Ontwerp trainingsscherm minimaal.md` voor Vandaag, binnen regel 1, 5 en 6. De keuzes van de bouwer (Sherpa Missiekaart), elk met waar het nu staat:

1. Wat de kaart toont komt uit `engine/missionCard.ts#missionCardView`. Voor een training te voet (lopen, wandelen, rugzak, tocht, testloop) zegt de kaart alleen wat je vandaag doet: het kopje, de weekregel, de naam, de minuten, een duurregel als "4 × 4 min", de schoenen van de reis en Weeg je even (taken voor de start), de knop. Weg van de kaart, want ze staan in de Briefing: zonebalk en zonezin, het tempo en de zin over het tempo, losse feiten als Praten kan en de hoogte, het weer, de kleding, de route, heuvels in de buurt (ook in Waarom deze training) en de stand van je horloge.
2. Een waarschuwing staat nooit achter een tik. Het weer blijft op de kaart als het let op of slecht is (`WeatherLine onlyWarning`); bij gewoon weer blijven regen binnen het uur, slechte lucht en hitte toch staan, want die waarschuwen los van het oordeel en staan niet in de Briefing (herstel na Warden). Alleen de hoofdregel, het beste moment en de maan gaan dan weg. De horlogeregel blijft als versturen mislukte (`WatchStatusRow onlyFailed`).
3. Een training zonder Briefing (kracht, fietsen) houdt wat hij had; alleen de kleur verandert (punt 5).
4. De naam opent de Briefing en heeft daarvoor het pijltje van elke rij die iets opent (`verder`, gedempt), achter de naam, binnen hetzelfde tikdoel van 44 px. Geen onderstreping of kleur: dat zou een tweede mint of een link in een zin zijn.
5. Eén mint per kaart: de hoofdknop. Verplaatsen en Niet fit? zijn gedempte tekstknoppen naast elkaar onder de knop (waren omlijnd mint). "Zone 2." is gewone inkt, halfvet (was mint). De streep voor de coachregel is de kaartrand (was mint). Kleding meer en Weeg je even zijn gedempte tekstknoppen. Het vlammetje van Opwarmen is gedempt (`WarmupRow quiet`, alleen op deze kaart).
6. De coachregel is een tip (regel 6) en staat onder de knoppen; Opwarmen bij kracht ook. Zo staan de missie en de knop boven de vouw op 360 × 740, 390 × 844 en 412 × 915.
7. Op de rest van Vandaag wordt een gevulde knop omlijnd zodra de missie de mint heeft (`missionMint` in `pages/Today.tsx`): Ik ben weer beter en Back-up terugzetten. Een beslissing is op Vandaag altijd omlijnd, zoals regel 6 zegt: Opslaan van je horloge, Akkoord bij Opgevallen in je schema, de MacroFactor-kaart. In een blad blijft de knop gevuld: dat is een eigen laag. De scan `src/pages/todayOneMint.scan.test.ts` eist voor elk onderdeel van Vandaag met een gevulde knop een van die drie redenen.
8. De plek van de kaarten (`engine/todayCards.ts#placeTodayCards`). De rangorde en `arrangeToday` veranderen niet; dit legt regel 6 eroverheen, met deze reden: met de ochtendvraag erboven stond de knop op 412 px op 1211 px, en Je dag twee tot drie keer scrollen omlaag (Lookout, 12 november).
   - Boven de missie hoogstens twee (de instelling, advies één). Veiligheid (ziek, vroeg ziek zien, weerwaarschuwing) staat er altijd en telt mee.
   - De ochtendvraag staat direct onder de missie, nooit erboven: een vraag is een taak van vandaag.
   - Direct onder de missie daarna de beslissingen en waarschuwingen die over vandaag gaan: een test verschuiven, het voorstel na je horlogegetallen, een activiteit van je horloge, het weer van je tocht, MacroFactor, Opgevallen in je schema, het herstelsignaal en de volgorde van twee trainingen.
   - Dan Je dag, de vraag van de week, Stand en morgen en Losse training.
   - Onder Je dag: wat boven geen plek had, een advies, Niet gedaan?, de back-up (een melding die niet over vandaag gaat), de rustige regels, de avond ervoor, de trage test, een stille bron, de volgende tocht, Weekplanning bijgewerkt (`ForecastAdjustmentBanner`: een melding over je week, geen beslissing; de wijziging is al gedaan en je hoeft hem alleen te weten), de tip voor vandaag, benen, de weekterugblik en de lijfvraag, in de oude volgorde.
9. De instelling Kaarten boven de missie houdt Eén (advies) en Twee; Alles vervalt. Een bewaarde Alles blijft in de opslag staan en leest als Twee (`capAboveMission`), zodat een oudere back-up gewoon importeert en er geen migratie nodig is. Uitleg, zoekregel en samenvatting zeggen nu "de rest staat onder Je dag".
10. Beweging: de kaart krijgt geen nieuwe animatie. Het pijltje staat stil; Rustig en Uit veranderen niets.

## Reden

Gemeten op 12 november: de kaart herhaalde zone, praattest en tempo uit de Briefing, had naast de hoofdknop twee mint randen en mint links, en de naam zag er niet tikbaar uit. Boven Je dag stonden de ochtendvraag, Nog open, de back-up en een advies. De vraag van Vandaag is: wat is mijn missie vandaag? Dat antwoord moet binnen twee seconden in beeld staan.

## Alternatieven

De ochtendvraag als rij in Je dag (regel 6 zegt dat een vraag een rij is): de kaart heeft eigen getallen van je horloge en een gevolg; dat is een eigen spoor. De rangorde in `TODAY_CARD_RANK` zelf aanpassen: dan bewegen bestaande tests en het besluit 2026-11-01-vandaag-volgorde mee; een laag erover laat beide staan. De andere kaarten ook hun omlijnde mint en mint woorden laten verliezen: dat is het spoor "mint tellen per scherm", buiten deze kaart.

## Bron

`docs/visie/Ontwerp trainingsscherm minimaal.md` (hoofdstuk 6, regel 1, 5, 6 en 8; spoor 10), besluiten `2026-11-12-trainingsscherm-en-ontwerpregels.md`, `2026-11-12-trainingsscherm-sporen-1-4.md` en `2026-11-12-je-dag.md`, `docs/backlog.md` (Missiekaart op Vandaag, Kaarten boven Je dag, Briefing 5 en 6).

## Vervangt

Niets. `2026-11-01-vandaag-volgorde.md` blijft voor de rangorde; de zin "de rest komt direct onder de missie" geldt nu voor de ochtendvraag, de rest staat onder Je dag.

## Terugdraaien

`missionCardView` alles laten tonen, `placeTodayCards` vervangen door `arrangeToday` en de oude volgorde in `pages/Today.tsx`, de optie Alles terugzetten in `settingsChoices.ts`. Logs, planning en opslag veranderen niet.

## Niet gedaan, voor een volgend spoor

- 360 × 640 (de toets van regel 8): de lucht met de weekstrook is 312 px hoog, dus de knop staat daar op 613 px en de vouw op 573 px. Dat lost alleen een lagere lucht op, buiten deze kaart.
- Met een kaart voor je veiligheid erboven (ziek gemeld, vroeg ziek zien, een weerwaarschuwing) zakt de knop onder de vouw (412 × 915: ziek gemeld met een rustige loop, knop op 942 px). Bewust: veiligheid gaat voor de missie en staat nooit achter een tik.
- Omlijnde mint en mint woorden op andere kaarten van Vandaag (de ochtendvraag, Van je horloge, Toch koorts?) blijven; dat is het spoor "mint tellen per scherm".

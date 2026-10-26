# De planning leest de labels van je doelen

Datum: 2026-10-26
Status: aangenomen

## Besluit

De planning gebruikt het label van een doel (Top, Voortop, Verkenning) en de soort van het doel, uit `data/goalKinds.ts`. Het is ronde 2b: alleen engine en opslag, nog geen scherm. De planningsronde blijft één pure volgorde (`engine/planPass.ts`: wedstrijdblok, vrije periodes, weekcontrole) en alles wat jouw planning inhoudelijk verandert blijft een voorstel met Akkoord via de bestaande weg (`planHorizonChange` en `computeHorizonPlan`).

1. **Afbouw per label.** Een Top houdt de afbouw die hij had: de fasen van het programma (`engine/programLayout.ts`) en, voor een wedstrijd, de wedstrijdweek. Een Voortop krijgt de korte afbouw van zijn soort (`taperDaysFor`, bij een 10 km vier dagen) in plaats van de hele wedstrijdweek; het wedstrijdblok van acht weken blijft. Een Verkenning heeft geen blok en geen afbouw, maar de wedstrijd staat op zijn dag in de planning (`tpl_race`, een anker zoals een testloop: alleen via een voorstel te verplaatsen), met de dag ervoor niets zwaars voor de benen. Daarvoor bestond dit niet: "alleen volgen" zette de wedstrijd niet eens op zijn dag.
2. **Herstel na een doel** volgt de soort en de afstand (`recoveryDaysFor`), nooit het label: zoveel dagen na de doeldag geen harde training en geen zware beenkracht. Nieuwe regel AFTER-GOAL in `engine/weekValidator.ts`. Hij raakt alleen wat het systeem plande: eerst een dag buiten het herstel in dezelfde week, anders de korte versie (een lange training mag kort altijd, beenkracht kort vanaf de derde dag), anders een harde training als rustig loopje. Wat niet lichter kan, blijft gemeld staan; wat jij vastzette of wat al gebeurd is blijft zoals het is. Elke wijziging komt als "Planning bijgewerkt" met ongedaan maken, zoals de andere herstelstappen van de weekcontrole. Rustig meedoen (Verkenning) rekent met de helft van het herstel bij de afstand tussen doelen.
3. **Botsingen tussen doelen** (`engine/goalConflicts.ts`, puur): twee Tops minstens het grootste van 42 dagen en herstel van de eerste + 21 dagen opbouw + afbouw van de tweede; een Voortop niet in de afbouw van een Top en niet binnen 10 dagen ervoor, en minstens herstel + 7 dagen gewoon trainen + afbouw van die Top; een doel niet binnen het herstel van het doel ervoor. Het doel met het laagste label wijkt (bij gelijk label het doel lager in de lijst), in vaste volgorde: eerst de afbouw inkorten (Voortop tot 3 dagen, Top tot 7), dan een label lager, dan eerlijk melden. De bevindingen staan in gewone woorden, met de som, in het voorstel als een doel wordt toegevoegd of verplaatst (`HorizonPlan.conflicts` en `notes`). "Toch allebei" bewaart de datum van het andere doel op het doel dat moest wijken (`TrainingGoal.conflictAccepted`); verschuift dat andere doel, dan komt de melding terug. ASCEND's eigen voorstel (kortere afbouw, label lager) bewaart de kortere afbouw in `TrainingGoal.taperDays`. Veiligheidsgrenzen tussen zware beendagen blijven altijd (`withAcceptedConflicts` en `withResolvedConflicts` in `storage/horizonPlan.ts` bouwen alleen een nieuwe invoer voor hetzelfde voorstel).
4. **De lange loop bij een hardloopdoel** (keuze van de eigenaar op 26 oktober 2026). Bij een Top of Voortop die een hardloopwedstrijd is, groeit de lange loop elke twee weken met 10% in plaats van 10% per blok van vier weken, tot de week van de wedstrijd, met de piek van de afstand (10 km 75 minuten, halve marathon 120, marathon 180; de bestaande 120 blijft het minimum) en de 110%-rem op je eigen langste loop van de laatste 30 dagen als plafond (`engine/runGrowth.ts`, `Program.runBuild`). Na een wedstrijd telt de wedstrijd niet als referentie voor die 110%, en in de eerste week terug is de lange loop hoogstens de helft van de wedstrijd, in minuten gerekend naar het tempo van die wedstrijd en rustiger genomen.

## Reden

Het besluit `2026-10-26-kracht-en-berg-voor-iedereen.md` maakt van belangrijkheid iets dat de planning zichtbaar anders doet, en `docs/onderzoek/Meerdere doelen en prioriteit.md` zegt wat dat is: gebruikers klagen vooral over labels zonder zichtbaar verschil. Het herstel volgt de belasting en niet het label, omdat een marathon die je rustig meeloopt evenveel spierschade geeft als een Top-marathon. De lange loop in `Doelsoorten duur.md` (gedeelde regel 3) groeit te traag voor een hardloopdoel als hij 10% per blok van vier weken krijgt: van 60 naar 120 minuten kost dan ongeveer 29 weken.

## Bewijs

De rem van 110% is matig tot sterk (Frandsen 2025). Het principe van afbouw is sterk, de verdeling per label is coachpraktijk (expert). De afstanden tussen doelen zijn expert voor de uitkomst en afgeleid voor de som; er is geen studie naar twee pieken dicht bij elkaar (Pyne 2009). Het tempo van de groei (elke twee weken), de piek per afstand voor de lange loop en de helft van de afstand in de eerste week zijn afgeleid en staan zo gelabeld.

## Bewust niet gedaan

- Geen scherm: het label zetten, slepen en de bevindingen tonen komt in ronde 2c. Tot dan kiest de lijst de volgorde zoals de doelen zijn opgeslagen.
- Geen instelling voor de snelheid van de lange loop (twee weken of elke week) en voor de dagen herstel en afbouw. De startwaarden staan in `data/goalKinds.ts` en worden instelbaar in een latere ronde, met `src/data/settingsIndex.ts` en de groepspagina erbij.
- Alleen hardloopwedstrijden krijgen een wedstrijd op hun dag en herstel in de weekcontrole. Een tocht heeft zijn eigen vrije periode met lichte dagen (`engine/leave.ts`); het herstel na een tocht of het hoofddoel zelf is nog niet in AFTER-GOAL opgenomen.
- De lange loop groeit niet sneller in een programma dat naar een tocht toewerkt, ook niet met een hardloopwedstrijd als Voortop ernaast: de tocht bepaalt dan de opbouw ("niet voor de tocht"), en de vaste plantoets voor die situatie blijft bijna gelijk.
- Een hardloopwedstrijd als Verkenning krijgt geen "vervangt de zwaarste training van de week"; hij vervangt alleen wat er op zijn dag staat.

## Alternatieven

- Het herstel laten afhangen van het label. Afgewezen: de spierschade hangt van de belasting af.
- Een botsing stil oplossen. Afgewezen: elke automatische verandering van een label, datum of afbouw is een voorstel met Akkoord.
- De lange loop ook sneller laten groeien naast een tocht. Dat veranderde tien lange lopen in de vaste plantoets van de bestaande gebruiker (van 3 tot 15 minuten langer); afgewezen omdat de tocht dan niet meer de maat is.

## Bron

- `docs/onderzoek/Meerdere doelen en prioriteit.md`, deel 4 (regel 1 tot 6)
- `docs/onderzoek/Doelsoorten duur.md`, gedeelde regel 3 en 4, deel 3
- `docs/beslissingen/2026-10-26-doelsoorten-als-gegevens.md`, `2026-10-26-ascend-tab-als-doelen.md`
- Een gesprek met de eigenaar op 26 oktober 2026

## Vervangt

Niets. Het werkt het wedstrijdblok uit `engine/raceBlock.ts` uit met het label, en vervangt het "alleen de dag erna" (AFTER-TEST) voor een wedstrijd door het herstel van de soort.

## Terugdraaien

Revert van de commit van ronde 2b. De velden `TrainingGoal.taperDays`, `TrainingGoal.conflictAccepted` en `Program.runBuild` zijn optioneel en onschadelijk als ze blijven staan; een oud bestand zonder de velden importeert zoals voorheen.

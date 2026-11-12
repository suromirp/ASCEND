# De Briefing volgt de gekozen manier van trainen

Datum: 2026-11-12
Status: aangenomen

## Besluit

De Briefing zegt per manier van trainen wat klopt: feiten, stopregels en stappen. Het totaal bovenaan is het einde van de tijdlijn. De rij met manieren heeft hoogstens drie chips en schuift nooit. Het horloge zegt eerlijk welke workout erop staat. Het tempo staat in de Briefing en niet meer op de missiekaart. De keuzes van de bouwer (Sherpa Briefing):

1. Per manier staat in `data/placeBrief.ts` alleen wat anders is dan de training zelf: het label van het tweede kerngetal, het derde kerngetal, de stopregels, de namen van de stappen en zo nodig de zin uitleg. Heuvel (de standaard) houdt "hard bergop" en "op de heuvel". Loopband op helling: "hard op de helling", "op de loopband", "rustig op de band". StairMaster: "stevig traplopen", "op de trap", "rustig doorstappen", en de kop "WANDELEN · TRAP" in plaats van "· BERGOP". Bij Heuvelsprints en afdalen zegt het derde feit op de band en de StairMaster "Geen afdaling", en de zin uitleg noemt geen afdaling meer. De Lange duurloop op de loopband noemt geen hoogtemeters "als het kan"; de rustige duurloop op de loopband en afwisselen hebben eigen stopregels. Minuten, herhalingen en zwaarte veranderen niet, en welke sport een manier telt ook niet (StairMaster telt als wandelen).
2. Geen zin dubbel: de uitleg van een manier verliest de zin "Telt als ..." als de regel eronder al zegt dat het als een andere sport telt (`engine/briefing.ts#howWithoutSport`). De tekst in `data/modalities.ts` blijft, want het blad Waarom deze training toont hem zonder die regel.
3. Het totaal: de tijdlijn klopt, want dat is wat je loopt en wat je horloge telt. Daarom (a) laat `engine/workoutPlan.ts` de tijdlijn passen in de geplande minuten: lopen de afgeronde herhalingen over de minuten heen, dan geven uitlopen en opwarmen de tijd terug, uitlopen eerst, geen van beide onder 5 minuten (bij 35 minuten en zes herhalingen: 9 opwarmen, 6 x 3, 8 uitlopen). Dat deed de code al de andere kant op (minuten over gingen naar opwarmen en uitlopen). En (b) leest de hartkaart het totaal uit de tijdlijn, zodat het ook klopt als de grens van 5 minuten het passen tegenhoudt. Planning, belasting en de minuten op Vandaag blijven de geplande minuten; die zijn in dat geval gelijk.
4. De rij Waar train je?: hoogstens drie chips met korte namen (Heuvel, Loopband, StairMaster), zonder schuifrij, zoals Start bij. Een lange naam kapt af met "…" (hoogstens 8,5 rem, met Meer 6,5 rem); de volle naam is het aria-label. Bij meer dan drie keuzes (de rustige duurloop met fietsen, Bergconditie): de standaard, de gekozen keuze en Meer, dat een blad opent met alle keuzes en hun oordeel. Korte namen erbij in `engine/trainingPlace.ts#SHORT_NAME`. Die gelden ook in het invulformulier (Waar train je? en de plek in Hoe ging het?), en dat blijft zo: één naam per manier in de hele app, zodat je in de Briefing en bij het invullen dezelfde chip ziet. De volle naam blijft het aria-label, en wat je doet staat in de regel onder de keuze. Voorbeelden: "Hardlopen, buiten op een heuvel" heet Heuvel, "Hardlopen, loopband op helling" en "Wandelen, loopband op helling" heten Loopband, "Wandelen op oneffen paden" heet Onverhard, "Traplopen, buiten" heet Trappen, "Wandelen met hoogteverschil, buiten" en "Buiten met rugzak" heten Buiten, "Wandelen, heuvel op en af herhalen" heet Heuvel. Getoetst: `npx vitest run src/components/logForm` groen.
5. Het horloge: ASCEND stuurt de training, niet de gekozen manier. Is de manier een andere sport dan de workout (StairMaster of fietsen bij een loop), dan zegt de rij Horloge met een amber stip "Er staat een hardloopworkout op. Start Stair Stepper zonder workout." (`engine/briefing.ts#watchPlaceLine`) als ASCEND een workout op je horloge zette of gaat zetten, ook als de instelling Horlogestatus tonen uit staat (anders verzwijgt de regel een workout; na review). Zonder workout van ASCEND (zelf instellen) zegt hij alleen "Start Stair Stepper zonder workout.", want de workout in het blad is die van de training. De loopband is ook hardlopen: geen regel. Het blad Je horloge toont nog de workout van de training.
6. Het tempo: in de hartkaart als kerngetal ("7:15 tot 8:20" per km, in de plaats van het laatste losse feit, zoals eerder op de missiekaart; een eigen feit van de manier zoals "Geen afdaling" blijft staan en het tempo komt erbij, na review), met de zin over je testloop en de afstand eronder. Alleen bij een manier die hardlopen is; op de StairMaster of de fiets niet. Zonder testloop geen tempo, wel de afstandszin uit je laatste rustige lopen als die er zijn. Eén functie (`engine/missionFacts.ts#trainingPace`) voor de Briefing en de missiekaart van een training zonder Briefing. De missiekaart van een training met Briefing toont geen tempo en geen testloopzin meer (`engine/missionCard.ts`, `pace` is uit).
7. Geen nieuwe instelling: er komt geen keuze voor de gebruiker bij.
8. Beweging: niets nieuws. Het blad Meer is een gewoon blad (TodaySheet); de overgang bij een andere manier blijft 200 ms in Vol en staat in Rustig en Uit meteen op de eindstand.

9. De tekstkaart heeft een stand heuvel en vier nieuwe schermen (de Briefing op heuvel, loopband op helling, StairMaster, en de Lange duurloop op de loopband), met twee invarianten: het totaal is het einde van de tijdlijn, en geen zin staat twee keer in één regel. Beide zijn getoetst met een opzettelijk fout voorbeeld (38 min, en de zin twee keer): de kaart schrijft de tijdlijn als één knop, en een eerste regex vond hem niet (Warden).

## Reden

De eigenaar stuurde een afdruk van de Heuvelintervallen met StairMaster gekozen: "Hoezo staat dit hier en klopt dat wel?" Er stond "hard bergop", "RPE 8-9 op de heuvel" en "na 2 minuten terug naar beneden", "Telt als wandelen, niet als hardlopen" twee keer, 35 minuten totaal boven een tijdlijn tot 38 min, en de rij met manieren viel links af ("el"). Pathfinder: het tempo stond alleen op de missiekaart.

## Alternatieven

De workout op het horloge laten volgen (een wandelworkout met trapstappen bij de StairMaster): dan moet het versturen de keuze per training lezen en opnieuw versturen bij elke wissel, en het type van intervals.icu voor een stepper is niet nagekeken. Eerst eerlijk zeggen, het versturen is een eigen spoor. Het totaal uit de geplande minuten en de herhalingen afkappen: de herhalingen zijn de kern van de training. Twee rijen chips: botst met de regel "nooit twee regels hoog" van de Briefing. De stoptekst in `data/sessionStyle.ts` algemener maken ("na de rust"): dan verliest de heuvel zijn concrete tekst.

## Bron

Afdruk en woorden van de eigenaar (12 november), `docs/backlog.md` (Inbox, "Briefing volgt de gekozen manier niet"), Pathfinder over het tempo, besluiten `2026-11-12-trainingsscherm-sporen-1-4.md`, `2026-11-12-missiekaart.md` en `2026-11-12-route-blok.md`.

## Vervangt

Uit `2026-11-12-missiekaart.md` punt 1 het deel "Het tempo blijft ... verhuizen naar de Briefing is een eigen spoor": het tempo staat nu in de Briefing. Uit `2026-11-11-briefing.md` en `2026-11-12-trainingsscherm-sporen-1-4.md` de schuifrij met vervaging bij Waar train je?.

## Terugdraaien

`PLACE_BRIEF` leeg maken, `placeRow` alle keuzes laten geven en `PlaceRow` terugzetten, `pace` in `missionCardView` weer aan, de teruggave in `buildWorkoutPlan` weghalen. Logs, planning en opslag veranderen niet; wel krijgt een workout op het horloge die nu past een andere opwarming en uitloop, en wordt hij bij terugdraaien opnieuw verstuurd.

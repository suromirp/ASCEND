# Eten onderweg

Datum: 2026-11-11
Status: aangenomen

## Besluit

Vanaf 90 minuten lopen of wandelen, en per dag op een tocht of etappe, zegt ASCEND hoeveel koolhydraten je ongeveer meeneemt en wat dat is in gels, bananen, krentenbollen of dadels. Het staat in De avond ervoor, op het trainingsscherm, bij een GR5-etappe en op de kaart Tochten. Het rekenen staat in `engine/fuelOnTheGo.ts`; het is een indicatie, geen registratie, en het plant niets. Instelling Eten onderweg, standaard aan.

## Eigen keuzes

- Grens 90 minuten, voor lopen en wandelen gelijk. Regel B4 in het GR5-onderzoek zegt "langer dan 90 minuten", en De avond ervoor noemt drinken ook pas vanaf 90 minuten (`LONG_MINUTES`). Thomas 2016 noemt voor 45 tot 75 minuten alleen kleine hoeveelheden of mondspoelen; tussen 75 en 90 minuten op rustig tempo dekken je eigen voorraden het. Precies 90 telt mee.
- Bereik per uur. Lopen rustig 30 tot 45 g, lopen hard (belastingprofiel `intensity: 'high'`, zoals tempo en intervallen) 45 tot 60 g: de onder- en bovenhelft van het consensusbereik 30 tot 60. Wandelen 30 tot 40 g, ook zwaar met rugzak (regel B4: lage intensiteit, meer vet). Het bereik voor een training is het bereik per uur maal de hele duur, afgerond op 5 gram.
- Lopen van 3 uur of langer blijft bewust op hoogstens 60 g per uur. Thomas 2016 noemt tot 90 g per uur boven 2,5 uur, maar dat vraagt meerdere suikers en een getrainde darm, en is onderzocht bij snelle duursporters. Voor een recreant op rustig tempo is de bovenkant van 30 tot 60 genoeg, en een hoger getal zou de app aanraden zonder dat je het geoefend hebt. Wie het wel oefent, kan meer nemen; de app zegt "ongeveer".
- Hitte verandert de grammen niet. Wat je in de warmte extra kwijtraakt is water, en dat zegt de drinkregel uit je eigen zweettempo (`sweatRateAt`). Eten en water staan naast elkaar, nooit in één getal.
- Geen gewicht, geen calorieën. Het bereik in gram per uur geldt los van je gewicht; het lichaamsgewicht wordt niet gelezen.
- Fietsen, kracht en sporten die alleen tellen krijgen geen regel: de opdracht noemt lopen en tochten, en fietsen heeft geen lange sessies in de demoprogramma's.
- Grammen per stuk, afgerond (NEVO-online van het RIVM, en gewone verpakkingen voor gels): gel 25 g (de meeste zakjes 20 tot 30), middelgrote banaan zonder schil (120 g, ongeveer 20 g per 100 g) 25 g, krentenbol van 60 g (ongeveer 50 g per 100 g) 30 g, gedroogde dadel van 8 g (ongeveer 65 g per 100 g) 5 g dus vijf dadels 25 g, boterham volkoren van 35 g (ongeveer 40 g per 100 g) 15 g zonder beleg. Het blijven afgeronde waarden; de app zegt "ongeveer".
- Lopen leunt op gels met bananen, krentenbollen en dadels als alternatief. Wandelen en een tocht leunen op echt eten (krentenbollen, bananen, boterhammen, dadels), zonder gels.
- Een tochtdag zonder looptijd (een tocht uit Vrij en vakantie heeft er geen) rekent met 6 uur lopen, en zegt dat overal waar het getal staat: "bij een aanname van 6 uur lopen", in De avond ervoor, op de kaart Tochten en in het blok van een etappe. Gekozen boven geen getal: een tochtdag is altijd lang, de vraag wat je meeneemt geldt dus altijd, en een bereik met de aanname erbij is bruikbaarder dan niets. Bij water ligt dat anders: daar komt het getal uit je zweettempo en de temperatuur, twee onbekenden extra. Een GR5-etappe duurt volgens de officiële site gemiddeld iets meer dan vijf uur zonder pauzes, dus 6 uur met korte pauzes is een redelijke dag. Een etappe zonder looptijd krijgt geen getal, net als het water ("niet rekenen met een gok"), want daar is de looptijd per etappe wel de bron. De regel in De avond ervoor wordt er een regel langer van op 360 px (twee regels tekst); er staan op een tochtdag hoogstens twee regels (rugzak en eten), dus de grens van vier speelt niet.
- Een tocht van meerdere dagen: per dag, met het totaal eronder in het blok ("Voor 3 dagen: ..."), en dat ontbijt en avondeten erbij komen.
- De oefenzin ("Oefen het onderweg op lange trainingen") staat op het trainingsscherm, bij een etappe en op de kaart Tochten. Jeukendrup 2017: je darmen wennen eraan.

## Waar het staat

- De avond ervoor: één regel, "Eten mee: 60 tot 90 g koolhydraten, 2 tot 4 gels of bananen." Bij een tochtdag "Eten voor de dag: 180 tot 240 g koolhydraten, bij een aanname van 6 uur lopen." Een tochtdag zonder rugzakgewicht krijgt nu een kaart met alleen het eten (eerst geen kaart: er valt nu iets klaar te leggen).
- Het trainingsscherm (ExerciseLogger), een korte kaart Eten onderweg onder opwarmen, rekken en de route en route: het bereik met een paar stuks en de oefenzin, ook als je het scherm alleen leest (Hoe je het doet). Niet in de uitleg van de training (TrainingGuideSheet) en niet in het blad Je horloge: volgens `docs/visie/Ontwerp Info-blad.md` wordt de uitleg korter en gaan praktische dingen naar het trainingsscherm, en Je horloge gaat over wat er op het horloge staat. Keuze van de coördinator na de review van Warden. De duur leest hetzelfde als De avond ervoor: de minuten van de geplande sessie (`plannedMinutes`), anders de volle duur van de dag (`resolveEffectiveFullDuration` via `resolveVariantDuration`); kies je op het scherm een kortere versie, dan die.
- Een GR5-etappe: een eigen blok Eten onderweg in het blad van de etappe, direct boven Water en winkel. Niet in de rij van de lijst: die heeft al dag, slaapplek, rustdag, pas en water.
- Een tocht: één regel op de kaart Tochten (Ascend, Doelen), onder de feiten van de tocht.

## De grens van vier in De avond ervoor

De volgorde was weer, lampje, rugzak, horloge, drinken, route. Met eten erbij is hij: weer, lampje, rugzak, horloge als er iets mis is (nog niet, wijziging nog niet, lukte niet), drinken, eten, "Staat op je horloge.", route. Wat niet past valt van onderen af.

- "Staat op je horloge." is alleen geruststelling en staat ook in het blad Je horloge; eten leg je de avond ervoor echt klaar. Dus bij een lange duurloop in het donker (weer, lampje, drinken, eten) valt die regel weg.
- Een probleem met het horloge moet je vanavond nog oplossen; dan valt het eten weg, dat op het trainingsscherm blijft staan.
- Een lampje gaat voor het eten (veiligheid); het eten staat dan op het trainingsscherm. Bij een rugzakwandeling van 4 uur die in het donker eindigt (weer, lampje, rugzak, drinken) valt het eten dus weg.

## Voorbeelden (nagemaakt)

Een lange duurloop van 2 uur, rustig (30 tot 45 g per uur):

- Trainingsscherm: "60 tot 90 g koolhydraten voor 120 min: 2 tot 4 gels, of per gel een banaan, krentenbol of vijf dadels." en "Oefen het onderweg op lange trainingen."
- De avond ervoor: "Eten mee: 60 tot 90 g koolhydraten, 2 tot 4 gels of bananen."

Een rugzakwandeling van 4 uur, start 10:00 (30 tot 40 g per uur):

- Trainingsscherm: "120 tot 160 g koolhydraten voor 240 min: 4 tot 5 krentenbollen, of bananen, boterhammen of dadels." en de oefenzin.
- De avond ervoor: weer, "Rugzak 10 kg.", drinken, "Eten mee: 120 tot 160 g koolhydraten, 4 tot 5 krentenbollen of bananen."

Een GR5-etappe van 6 uur 10 (looptijd van de site):

- Per dag ongeveer 185 tot 245 g koolhydraten, bij 6,2 uur lopen: 30 tot 40 g per uur.
- Dat is 6 tot 8 krentenbollen (30 g), of een mix met bananen, boterhammen of dadels.
- Het water staat eronder apart, uit je zweettempo.

## Reden

De eigenaar op 11 november: geen dagelijkse voedingsregistratie, wel een indicatie van wat je ongeveer meeneemt, bij een tocht anders dan bij hardlopen met gels. Op een tocht van 30 dagen is eten de beperking die je in de training kunt oefenen (Kansen 11 november training, punt 5).

## Alternatieven

- Na afloop één tik "Wat at je onderweg?" (uit Kansen, punt 5): dat is registratie, en de eigenaar wil dat nu niet.
- Een eigen kaart op Vandaag: niets nieuws boven de missie; De avond ervoor is de plek waar je klaarlegt.
- Calorieën per dag op een tocht (3.500 tot 4.500 kcal): vraagt gewicht en is registratie-achtig; koolhydraten per uur is wat je onderweg meeneemt.
- De drinkregel en de etenregel samenvoegen tot één regel: te lang voor een telefoon en water en eten zijn verschillende bronnen.

## Bron

- Thomas, Erdman en Burke 2016, ACSM-verklaring Nutrition and Athletic Performance: 30 tot 60 g per uur bij 1 tot 2,5 uur.
- Jeukendrup 2017, Training the gut for athletes (Sports Medicine): oefenen verbetert verdragen en opname.
- `docs/onderzoek/Aanvullend onderzoek GR5 voorbereiding.md`, regel B4 en de alinea over voeding.
- `docs/onderzoek/Kansen 11 november training.md`, punt 5.
- NEVO-online (RIVM) voor de grammen per stuk, afgerond.
- `docs/beslissingen/2026-11-11-avond-ervoor.md`, `docs/beslissingen/2026-10-25-zweet-en-water.md`.

## Instelling

Eten onderweg (aan), op de pagina Lichaam onder Onderweg (de pagina had 10 rijen, nu 11; Vandaag en Doel zitten op hun plafond van 12). Uit: nergens een regel over eten; drinken blijft. In `settingsIndex`, `settingsLayout`, `settingsSummary`, `settingsDiff`, `settingsHelp` en `LichaamGroup`. Een nieuwe optionele sleutel `fuelOnTheGo`, additief, dus geen migratiestap; een oude back-up zonder de sleutel staat aan, een kapotte waarde valt weg (`storage/backupClean.ts`).

## Vervangt

Twee punten van `docs/beslissingen/2026-11-11-avond-ervoor.md`, als aanvulling; dat besluit zelf blijft ongewijzigd:

- De volgorde en de grens van vier: zie De grens van vier hierboven. "Staat op je horloge." valt als eerste weg (akkoord van de coördinator, 11 november).
- Een tochtdag uit Vrij en vakantie zonder rugzakgewicht kreeg geen kaart. Nu krijgt hij een kaart met alleen het eten, als Eten onderweg aan staat. Met Eten onderweg uit blijft het zoals het was: geen kaart.

## Terugdraaien

Instelling Eten onderweg uit. In de code: `fuelOn` weg uit `useEveningBefore.ts`, `ExerciseLogger.tsx`, `StageSheet`/`Etappes.tsx` en `TrekGoals.tsx`; de horlogeregel terug op zijn oude plek in `eveningBefore.ts`.

## Na de herreview (coördinator, 11 november)

De kaart staat onder de lijst met opwarmen, rekken en de route, zodat de route niet verder zakt (Warden, punt 3). De Briefing (`2026-11-11-briefing.md`) bepaalt later de volgorde; eten wordt daar een van de vier vakken.

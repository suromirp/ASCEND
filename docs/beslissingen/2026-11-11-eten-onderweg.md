# Eten onderweg

Datum: 2026-11-11
Status: aangenomen

## Besluit

Vanaf 90 minuten lopen of wandelen, en per dag op een tocht of etappe, zegt ASCEND hoeveel koolhydraten je ongeveer meeneemt en wat dat is in gels, bananen, krentenbollen of dadels. Het rekenen staat in `engine/fuelOnTheGo.ts`; het is een indicatie, geen registratie, en het plant niets. Instelling Eten onderweg, standaard aan.

## Eigen keuzes

- Grens 90 minuten, voor lopen en wandelen gelijk. Regel B4 in het GR5-onderzoek zegt "langer dan 90 minuten", en De avond ervoor noemt drinken ook pas vanaf 90 minuten (`LONG_MINUTES`). Thomas 2016 noemt voor 45 tot 75 minuten alleen kleine hoeveelheden of mondspoelen; tussen 75 en 90 minuten op rustig tempo dekken je eigen voorraden het. Precies 90 telt mee.
- Bereik per uur. Lopen rustig 30 tot 45 g, lopen hard (belastingprofiel `intensity: 'high'`, zoals tempo en intervallen) 45 tot 60 g: de onder- en bovenhelft van het consensusbereik 30 tot 60. Wandelen 30 tot 40 g, ook zwaar met rugzak (regel B4: lage intensiteit, meer vet). Het bereik voor een training is het bereik per uur maal de hele duur, afgerond op 5 gram.
- Hitte verandert de grammen niet. Wat je in de warmte extra kwijtraakt is water, en dat zegt de drinkregel uit je eigen zweettempo (`sweatRateAt`). Eten en water staan naast elkaar, nooit in één getal.
- Geen gewicht, geen calorieën. Het bereik in gram per uur geldt los van je gewicht; het lichaamsgewicht wordt niet gelezen.
- Fietsen, kracht en sporten die alleen tellen krijgen geen regel: de opdracht noemt lopen en tochten, en fietsen heeft geen lange sessies in de demoprogramma's.
- Grammen per stuk, afgerond (NEVO-online van het RIVM, en gewone verpakkingen voor gels): gel 25 g (de meeste zakjes 20 tot 30), middelgrote banaan zonder schil (120 g, ongeveer 20 g per 100 g) 25 g, krentenbol van 60 g (ongeveer 50 g per 100 g) 30 g, gedroogde dadel van 8 g (ongeveer 65 g per 100 g) 5 g dus vijf dadels 25 g, boterham volkoren van 35 g (ongeveer 40 g per 100 g) 15 g zonder beleg. Het blijven afgeronde waarden; de app zegt "ongeveer".
- Lopen leunt op gels met bananen, krentenbollen en dadels als alternatief. Wandelen en een tocht leunen op echt eten (krentenbollen, bananen, boterhammen, dadels), zonder gels.
- Een tochtdag zonder looptijd (een tocht uit Vrij en vakantie heeft er geen) rekent met 6 uur lopen, op het scherm een aanname genoemd. Een GR5-etappe duurt volgens de officiële site gemiddeld iets meer dan vijf uur zonder pauzes. Een etappe zonder looptijd krijgt geen getal, net als het water ("niet rekenen met een gok").
- Een tocht van meerdere dagen: per dag, met het totaal eronder in de uitleg ("Voor 3 dagen: ..."), en dat ontbijt en avondeten erbij komen.
- De oefenzin ("Oefen het onderweg op lange trainingen") staat bij elke uitleg en op de kaart Tochten. Jeukendrup 2017: je darmen wennen eraan.

## Waar het staat

- De avond ervoor: één regel, "Eten mee: 60 tot 90 g koolhydraten, 2 tot 4 gels of bananen." Bij een tochtdag "Eten voor de dag: 180 tot 240 g koolhydraten, vooral echt eten." Een tochtdag zonder rugzakgewicht krijgt nu een kaart met alleen het eten (eerst geen kaart: er valt nu iets klaar te leggen).
- De uitleg van de training (TrainingGuideSheet), een eigen deel Eten onderweg onder Je tempo. Gekozen boven het blad Je horloge: dat blad gaat over wat er op het horloge staat (stappen, datavelden), eten hoort bij wat je meeneemt, net als kleding en weer die al bovenin de uitleg staan. De duur is die van de dag (`resolveEffectiveFullDuration`); een kortere versie van vandaag (Korter vandaag) ziet de uitleg niet, De avond ervoor wel (`plannedMinutes`).
- Een GR5-etappe: een eigen blok Eten onderweg in het blad van de etappe, direct boven Water en winkel. Niet in de rij van de lijst: die heeft al dag, slaapplek, rustdag, pas en water.
- Een tocht: één regel op de kaart Tochten (Ascend, Doelen), onder de feiten van de tocht.

## De grens van vier in De avond ervoor

De volgorde was weer, lampje, rugzak, horloge, drinken, route. Met eten erbij is hij: weer, lampje, rugzak, horloge als er iets mis is (nog niet, wijziging nog niet, lukte niet), drinken, eten, "Staat op je horloge.", route. Wat niet past valt van onderen af.

- "Staat op je horloge." is alleen geruststelling en staat ook in het blad Je horloge; eten leg je de avond ervoor echt klaar. Dus bij een lange duurloop in het donker (weer, lampje, drinken, eten) valt die regel weg.
- Een probleem met het horloge moet je vanavond nog oplossen; dan valt het eten weg, dat in de uitleg van de training blijft staan.
- Een lampje gaat voor het eten (veiligheid). Bij een rugzakwandeling van 4 uur die in het donker eindigt (weer, lampje, rugzak, drinken) valt het eten dus weg.

## Voorbeelden (nagemaakt)

Een lange duurloop van 2 uur, rustig:

- Ongeveer 60 tot 90 g koolhydraten voor 120 min: 30 tot 45 g per uur.
- Dat is 2 tot 4 gels van 25 g. In plaats van een gel: een banaan (25 g), een krentenbol (30 g) of vijf dadels (25 g).
- De avond ervoor: "Eten mee: 60 tot 90 g koolhydraten, 2 tot 4 gels of bananen."

Een rugzakwandeling van 4 uur, start 10:00:

- Ongeveer 120 tot 160 g koolhydraten voor 240 min: 30 tot 40 g per uur.
- Dat is 4 tot 5 krentenbollen (30 g), of een mix met bananen (25 g), boterhammen (15 g) of dadels.
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

De volgorde van de regels in `docs/beslissingen/2026-11-11-avond-ervoor.md` (punt Volgorde en de grens van vier). De rest van dat besluit blijft.

## Terugdraaien

Instelling Eten onderweg uit. In de code: `fuelOn` weg uit `useEveningBefore.ts`, `TrainingGuideSheet.tsx`, `StageSheet`/`Etappes.tsx` en `TrekGoals.tsx`; de horlogeregel terug op zijn oude plek in `eveningBefore.ts`.

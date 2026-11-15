# Geen "ASCEND doet" in schermtekst

Datum: 2026-11-14
Status: aangenomen

## Besluit

In schermtekst is ASCEND nooit het onderwerp van een zin. Het droge feit staat voorop, zonder onderwerp: "Geen toegang tot je locatie.", "Morgen: rustdag.", "Gerekend met een start om 10:00." De naam blijft alleen bij toestemmingen van de telefoon (waar het systeem de app bij naam noemt), de map ASCEND voor back-ups en het merk zelf.

## Reden

De eigenaar (14 november): "Ik wil ook minder het gebruik van ascend doet dit of dit doet ascend in de app." Een app die over zichzelf in de derde persoon praat leest als een systeemmelding, niet als een kaart. Het past bij de stemgids: het droge feit eerst.

## Alternatieven

Ik-vorm ("Ik plan morgen een rustdag") en we-vorm ("We plannen ...") zijn voorgelegd en niet gekozen: persoonlijker, maar meer assistent dan kaart, en "we" is vaag.

## Bron

Gesprek met de eigenaar, 14 november, met de keuze "Feit zonder onderwerp". Telling op main: ongeveer 670 plekken in 177 bestanden, 51 op de schermen van de tekstkaart.

## Vervangt

Niets. Vult `2026-11-09-stem-van-ascend.md` aan.

## Uitvoering

Drie rondes per gebied (Vandaag en de Briefing, dan Week en Stand, dan Instellingen en de rest), na de planner en de horloge-toets, met Pathfinder per ronde. Een invariant in de tekstkaart telt "ASCEND" gevolgd door een werkwoord in schermtekst en mag alleen dalen. Er verandert niets aan wat de app doet.

## Aanvulling, ronde 1 (15 november)

Vandaag en de Briefing, met de bladen die daar opengaan (de missie, coach, advieskaart, terugblik, start, back-up, sporten, route en race, logformulier, trainingsgids en de onderdelen van de Briefing). Ongeveer honderd zinnen herschreven: het feit voorop, zonder onderwerp, elk feit gelijk. "Hij" of "het" voor de app is in dezelfde zinnen meegenomen. Niet aangeraakt: instellingen (ronde 3), Week en Stand (ronde 2), de kaart Vervallen.

De invariant staat in `scripts/app-kaart/invarianten.mjs` (`PLAFOND_ASCEND_ONDERWERP`, `ascendAlsOnderwerp`). Hij telt per regel "ASCEND" met een persoonsvorm erna of ervoor, of na een voegwoord ("die ASCEND"), en slaat het merk, de map ASCEND, samenstellingen, "door ASCEND" en toestemmingen over. "Het" voor de app telt niet mee: zonder zinsbouw niet betrouwbaar te scheiden van "het regent". De telling loopt over elk scherm in de kaart, dus de instellingenschermen tellen vanzelf mee zodra ze erin staan.

Plafond na ronde 1: 3 op de tekstkaart (Gegevens, Stand lopen, en de kaart Vervallen op Vandaag, die nu door een andere bouwer wordt herschreven). Dezelfde toets over alle tekst in `src/` (niet in de kaart, ter vergelijking): 596 voor, 495 na.

## Aanvulling, ronde 1 na Pathfinder (15 november)

De telling herkent nu ook de verleden tijd op -te en -de ("zette ASCEND", "ASCEND maakte"), behalve bijvoeglijke woorden als "beste" en "volgende". Vaste zinnen in `ZELFTOETS` toetsen de herkenning zelf. Ze draaien bij elke controle, en een zin die niet klopt laat de vergelijking falen. Een training verplaatsen heet nu "komt na Akkoord op een vrije dag". Liever niet zegt overal "krijg je er geen vraag meer over", met de oorspronkelijke grens erbij (deze week, voor deze test, of tot je een nieuwe test logt), want die grens is een feit.

Plafond na de merge van claude/nacht: 3, ongewijzigd. De instellingenschermen staan nog niet als eigen schermen in de kaart. De drie plekken zijn Gegevens (ronde 3), Stand lopen (ronde 2) en de kaart Vervallen op Vandaag ("zet ASCEND hem op overgeslagen"). Die laatste blijft staan tot claude/planner-ziek-vervolg op claude/nacht staat, samen met "zette ASCEND ze op overgeslagen" in `missedTraining.ts`. Over alle tekst in `src/` telt de ruimere toets nu 500. Het verschil met 495 komt van de verleden tijd die nu meetelt.

Aanvulling 15 november (coördinator): na ronde 1 kwamen de instellingenschermen in de tekstkaart (Instellingen op één plek, stap 0). Die tellen negen plekken mee die ronde 3 nog moet herschrijven, plus "zet ASCEND hem op overgeslagen" op Vandaag en de twee bestaande op Gegevens en Stand. Het plafond staat daarom op 12; het mag alleen dalen.

## Aanvulling, ronde 2 (15 november)

Week en Stand, met de bladen en engine-teksten die daar tekst leveren: WeekNotice, de weekcontrole (`weekConcerns`, `weekValidator`, `scheduler`), slepen en ruilen (`weekDrag`, `weekSwap`), een volle week, inhalen (`adviceWeek`), de rustdag terug, vrije periodes en tochten (`LeavePeriods`, `leaveProposal`), de weekbelasting (`weekLoadPlan`), `weekShape`, `horizonChange` en de keuze Toch allebei (`goalConflicts`), GoalCard, Ritme, de afdaalklok, Benen, de indexcheck, Wat speelde er, Tempo bij zone 2, de looptrends en de tempocurve. Ongeveer 75 zinnen herschreven, het feit voorop en zonder onderwerp, elk feit gelijk. Wat de planning verandert zegt nog steeds "voorstel" of "na jouw akkoord". "Hij" voor de app is in dezelfde zinnen meegenomen. Niet aangeraakt: de keuzeteksten van wijzigingen doorvoeren (`changeImpact.ts`, instellingen, ronde 3), het activeren van een doel op de Ascend-tab (`goalActivation.ts`), Run in detail en de kaart Vervallen.

De meeste herschreven zinnen staan in bladen of standen die de tekstkaart niet vastlegt, dus de kaart verandert op één regel na: Stand lopen ("staan je snelste stukken in training naast je test").

Plafond na ronde 2: 11 (was 12). De elf: de kaart Vervallen op Vandaag, Gegevens, en negen op de instellingenschermen (ronde 3). Dezelfde toets over alle bestanden in `src/` buiten tests, opmerkingen meegeteld: 986 voor, 910 na.

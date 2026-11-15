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

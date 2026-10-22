# Instellingen in acht groepen, met één regel voor een rij en een bronzen schakelaar

Datum: 2026-10-22
Status: aangenomen

## Besluit

Meer (`/more`) wordt een overzicht met de stand bovenaan en acht groepen
eronder, elk op een eigen pagina (`/more/:groep`): Planning, Doel en tochten,
Forge, Lichaam, Vandaag en meldingen, Koppelingen, Gegevens en back-up, Gidsen
en kennis. Elke instelling is één rij volgens dezelfde regel. Een schakelaar die
aan staat is donker brons met een bronzen rand, niet goud.

## Reden

De eigenaar vond de oude pagina te lang (ongeveer 1.950 woorden op 11.900 px),
niet overzichtelijk, niet mooi en niet passend bij de app. Dingen kapten af, de
sportschool was niet echt in te stellen en alles zag er hetzelfde uit. Het
nieuwe ontwerp (`Cartographer Instellingen`, versie 2) haalt dat terug naar
ongeveer 410 woorden over negen schermen van één of anderhalf scherm.

Goud is het ene accent per scherm. Met schakelaars in goud stonden er op een
pagina met tien schakelaars tien gouden vlakken. Donker brons zegt "aan" ook, en
laat goud over voor de ene knop of het ene vinkje.

## De regel voor een rij

- Links de titel, rechts de waarde. Rijen met een pijltje en rijen zonder staan
  in dezelfde kolom.
- Daaronder hoogstens één regel: een feit of een bron ("MacroFactor, 22 okt"),
  nooit uitleg. Een rij is 52 px hoog, met een tweede regel 68 px, een groep op
  het overzicht 72 px.
- Uitleg staat achter de InfoButton naast de titel: één zin vooraf en twee of
  drie korte punten met een vetgedrukt begin ("Altijd: ...", "Waarom: ...").
  De teksten staan in één bestand, `src/data/settingsHelp.ts`.
- Een keuze opent een onderblad, aan of uit is een schakelaar in de rij, acties
  staan in het onderblad en nooit op de pagina. De hele rij is het tikdoel.
- Wat jij koos staat in volle inkt. Wat niet is ingesteld of uit staat, staat
  gedimd ("Niet ingevuld", "Uit", "Nog nooit").
- Wat ASCEND zelf bijhoudt of binnenkrijgt krijgt het kleine label "auto" en
  een gewone waarde: Trainingsduur, Lichaamsgewicht uit MacroFactor, Plaats die
  je locatie volgt, wat ASCEND leerde over je kleding. Zelf invullen kan in het
  blad, onder Geavanceerd.
- Het advies heet overal "Advies" (een bronzen label in het keuzeblad), wat
  ingeklapt is heet "Geavanceerd".

## De opzet

- Het overzicht toont drie vakken (fase, doel, back-up). Het back-upvak is goud
  als de back-up ouder is dan 7 dagen of er nog nooit een is; is de back-up
  recent, dan staat er geen goud.
- Zoeken blijft bovenaan staan, toont de groep en de huidige waarde bij elk
  resultaat, opent de groep en laat de rij kort oplichten. Een rij onder
  Geavanceerd klapt eerst open.
- Alle ids uit `data/settingsIndex.ts` blijven gelijk, dus de ankers
  (`instelling-<id>`), `settingAvailability` en de tests kloppen nog. Elk id
  heeft een plek: groep, rij en eventueel een blad dat meteen opent
  (`data/settingsLayout.ts`). Een test bewaakt dat elk item een rij heeft.
- Een andere pagina springt naar een rij met
  `navigate('/more/forge', { state: { jumpTo: 'warmup' } })`. Een oude
  `jumpTo` op `/more` (Forge stuurt `settingsAnchor('forge')`) zoekt de groep
  op in de index en stuurt door.
- De samenvattingen (de waarde en de regel per groep en per rij) en de drie
  vakken zijn pure functies in `engine/settingsSummary.ts`,
  `engine/settingsStatus.ts` en `engine/settingsAttention.ts`, met tests.

## Waar wat staat

- Planning: Trainingstijd per dag, Rustdag (een andere dag is een voorstel met Akkoord,
  `2026-10-22-rustdag-als-voorstel.md`), Op je rustdag, Twee trainingen per dag,
  de drie sporten, Wijzigingen, Ambitie en onder Geavanceerd Benen en een zware loop.
- Doel en tochten: Hoofddoel, Programma (met Opnieuw bij week 1), De lange zondag,
  Na je hoofddoel, Volgende tocht op Vandaag, Rust na een bergtocht, Vrije dagen en
  vakanties, Reisplanner en Paklijst.
- Vandaag en meldingen: de kaarten op Vandaag, het weer (Plaats, Je kleding), na een
  training, en Terugknop op een tab en Na een herstart
  (`2026-10-22-terugknop-en-hervatten.md`).
- Koppelingen: Garmin met alle schakelaars, ook het voorvoegsel, het weghalen van
  gedane trainingen en de status van het versturen, MacroFactor en Health Connect.
- Een groep die niet op een eigen pagina past (Blessures, Doelen, Reisplanner) blijft
  zijn eigen pagina; de rij opent die.

## De schakelaar

`Toggle` in `src/components/ui.tsx` staat aan in `--color-bronze-dark` met een
rand van `--color-bronze` en een bol in inkt. Uit blijft een donkere baan met
een rand, met een gedimde bol. Dit is een zichtbare wijziging van een gedeeld
onderdeel: ook de schakelaars buiten Meer (Garmin, Forge, Vandaag) zijn nu
brons. De tikzone blijft 44 px.

## Opslag

De opgeslagen vorm van `AppSettings` verandert niet, er is geen migratie.
Waar het ontwerp een nieuw optioneel veld voorstelde, is het weggelaten of
gelijkgetrokken met wat er al is:

- "Plaats voor het weer" gebruikt wat er al staat: `homeLocation` (een plaats
  die "Mijn locatie" heet, of een plaats die je zocht) en
  `overviews.weatherFollowsLocation`. "Volgt je locatie" is die twee samen:
  de plaats is "Mijn locatie" en de schakelaar staat aan. "Vaste plaats" is
  de schakelaar uit, of een plaats die je zelf zocht. Wat er naar de
  weerdienst gaat verandert niet (een plek afgerond op een kilometer),
  dus `2026-10-22-weer-volgt-je-locatie.md` en `2026-10-22-weer-open-meteo.md`
  blijven kloppen. Een tweede besluit is daarom niet nodig.
- Mijn week (Rust, Kort, Normaal, Lang) en `AppSettings.dayLengths` volgen in
  een latere ronde, na de planningsreparaties. Tot dan staan Trainingstijd per
  dag, Rustdag en Meerdere trainingen op één dag als rijen die hun huidige
  bewerking in een blad openen.

## Alternatieven

- Schakelaars in goud houden en de pagina's korter maken. Niet gekozen: op
  één scherm staan dan nog steeds meerdere gouden vlakken naast elkaar.
- Een iOS-lijst met pictogrammen in vakjes (de eerste schets). Afgekeurd: het
  paste niet bij steen en contour en elke rij zag er hetzelfde uit.
- Een nieuwe `Sheet` die `TodaySheet` vervangt. Niet gedaan: Vandaag verandert
  niet. `Sheet` deelt wel `Portal` en `useSheetClose`.

## Bron

De klikbare schets en de schermen `v2_*.png` met het bouwplan
(`bouwplan.md`) van Cartographer Instellingen, en het goedkeuren en de twee
correcties van de eigenaar (bij Doel en tochten een concrete waarde in plaats
van "Week 9", bij Planning de rustdag en het aantal trainingsdagen). De
schakelaar in brons is een besluit van de eigenaar.

## Vervangt

Niets. De indeling in zes groepen op één pagina (`src/pages/Settings.tsx`)
vervalt, de ankers en zoekresultaten blijven werken.

## Terugdraaien

Zet `Toggle` in `src/components/ui.tsx` terug op `--color-gold` met `--color-on-gold`
voor de bol. Voor de indeling: de route `/more` weer naar `SettingsPage` in
`src/App.tsx` (het bestand staat in de geschiedenis van git), de rest van de
bestanden onder `src/components/settings/` en `src/pages/settings/` kan blijven
staan.

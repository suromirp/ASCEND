# Zonder doel: Je week op Je stand en kracht die met de richting meegaat

Datum: 2026-11-02
Status: aangenomen

## Besluit

Twee open punten van "Zonder doel" zijn gebouwd.

1. Je stand krijgt zonder doel de kaart Je week (ontwerp 2.8). Hij leest dezelfde functie als de kaart op de Ascend-tab (`engine/yourWeek.ts`), dus de getallen zijn altijd gelijk: de ring met de tel-minuten is het ene accent, kracht is een aparte teller, en de weken van de golf staan eronder. Een tik opent het blad Je week. Met een doel staat de kaart er niet en blijft "Klaar voor je doel" de enige voortgangstaal. De kaart staat bovenaan, op de plek van die doelkaart, los van de volgorde van de blokken, zodat Stand later opnieuw kan worden ingericht zonder dat hij meeverhuist.
2. Een andere richting kiezen past ook het aantal keer kracht in je week aan. Wie al een plan heeft en Sterker worden, Rustig aan, Fit blijven of Fitter worden kiest, krijgt in hetzelfde voorstel met Akkoord twee extra regels: "Kracht gaat van 3 naar 1 keer per week." en wat erbij komt of vervalt ("Vervalt: Bovenlichaam B, Benen A." of "Erbij: Benen A op donderdag."). Ook een ander weekbudget en de keuze na een golf lopen zo.

## Hoe het werkt

- `engine/directionStrength.ts` rekent uit hoe de vorm van de week (`AppSettings.weekShape`) wordt. Het doel is het aantal keer kracht van de richting (of van je eigen weekbudget), hoogstens drie, want zoveel krachtsjablonen heeft het weekpatroon. Kracht gaat eraf in vaste volgorde (Bovenlichaam B eerst, Bovenlichaam A blijft het langst). Er komt kracht bij op een vrije dag waar je kunt trainen, nooit op de rustdag, op de dag met de minste kans op botsende zware dagen. De andere trainingen houden hun dag.
- `strengthPlanItems` maakt de rijen van het voorstel voor de weken die al gepland staan. Kracht die vervalt: alleen vanaf morgen, alleen wat het systeem plande en nog niet gedaan is, nooit wat vastgezet is en nooit de training die in Forge open staat. Kracht die erbij komt: alleen vanaf morgen en alleen als de weekcontrole (`validateWeeks`, met je vakanties en tochten erbij) er niets op aanmerkt, en nooit op een vakantiedag, een lichte dag, een ziekteperiode of de week na een lopende ziekmelding. Dat dekt de 48 uur tussen zware beendagen en de ruimte op de dag. Past het niet, dan blijft die week zoals hij is.
- Het voorstel zegt eerlijk wat niet lukte: "Je richting vraagt 3 keer kracht; op je dagen past er nu geen extra keer bij." als er nergens iets bij kon, en "In 2 weken paste het niet, daar blijft het bij 1 keer." als het in een paar weken niet kon.
- Wat je zelf vastzette en alles wat voorbij of gelogd is, blijft. Een week zonder kracht (dat koos je zelf bij de start) blijft zonder kracht.
- Je krachtblok (`StrengthProgramStrategy`) gaat bij Akkoord alleen mee in `sessionsPerWeek`; de sjablonen en de split blijven zoals jij ze koos, alleen de overgebleven sjablonen komen vooraan. Het voorstel zegt het: "Je krachtblok gaat mee naar 1 keer per week." Ongedaan maken zet weekvorm, planning en krachtblok samen terug (`HorizonRestore.strategies`, `RecentPlanChange.strategiesBefore`, beide optioneel en dus zonder migratiestap). Een herhaald beenconflict stelt bij een blok van 1 keer niet langer 2 voor.
- Met een doel in de lijst (Ascend-tab) doet dit niets: `useDirectionChange` laat dan `reshapeStrength` ongemoeid. Komt er later een doel bij, dan blijft de weekvorm zoals hij op dat moment is. Het doel plant binnen die vorm; wil je daar meer kracht, dan kan dat via het krachtblok of Weekbudget, nooit stil.

## Eigen instelling

De kaart krijgt geen eigen schakelaar. Het ontwerp (sectie 4) zegt het uitdrukkelijk: "Je week tonen" hoort niet in Instellingen, de kaart is er zodra er een richting is en geen doel. Het aantal keer kracht is al instelbaar in Weekbudget (1 tot 4); de richting gebruikt dat en het advies van de richting als standaard. Er is dus niets nieuws voor de vijf plekken (zoeken, indeling, samenvatting, groepspagina, uitleg).

## Golden

`src/storage/planGolden.test.ts` en zijn snapshot bewegen niet: de weekvorm verandert alleen bij een voorstel met Akkoord van een richting, en de scenario's A tot en met E kiezen geen richting na de start. Plan met een doel (A en C) is dus ook ongewijzigd.

## Wat nog niet gebouwd is

- Andere sporten dan kracht en lopen in het weekritme: de ronde "Sporten die meetellen".
- Meer dan drie keer kracht per week. Het weekpatroon kent drie krachtsjablonen; een vierde keer in Weekbudget wordt drie.

## Bron

`docs/visie/Zonder doel.md` (2.8, 3.3 en 3.5), `docs/visie/Ontwerprapport gegevens.md`, `docs/beslissingen/2026-10-31-richting-en-weekbudget.md`.

## Vervangt

Het stuk "Wat nog niet gebouwd is" in `2026-10-31-richting-en-weekbudget.md` voor de eerste twee punten. Dat besluit zelf blijft staan.

## Terugdraaien

Het voorstel van een richting kun je met "Liever niet" afwijzen of na Akkoord ongedaan maken. In de code: haal `strengthChange` uit `useDirectionChange.tsx` weg en de kaart uit `Standing.tsx`.

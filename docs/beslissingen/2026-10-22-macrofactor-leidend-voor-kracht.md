# MacroFactor is leidend voor kracht: een krachtlog neemt de cijfers van MacroFactor over

Datum: 2026-10-22
Status: aangenomen

## Besluit

Zoals Garmin leidend is voor duurtrainingen (`2026-10-22-garmin-is-leidend.md`), is MacroFactor leidend voor kracht. Heeft de gebruiker een krachttraining al vastgelegd (met de hand, als "Gedaan in MacroFactor", of als krachtregel van het horloge) en staat dezelfde training in een MacroFactor-bestand, dan nemen de gemeten cijfers van MacroFactor de eigen waarden over: de duur, de oefeningen met hun sets, herhalingen en gewichten (daarmee ook het aantal sets), en bij een beentraining de herhalingen in reserve. Waar het bestand niets heeft (geen duur, geen RIR), blijft de eigen waarde staan.

Wat de gebruiker zelf invulde wordt nooit vervangen: gevoel, inspanning (RPE), pijn, notities, de koppeling aan de geplande training en de dag.

De eigen cijfers worden bewaard in dezelfde plek als bij Garmin: `SessionLog.manualMeasured`. Dat veld heeft er een deel bij, `strength`, voor wat bij kracht hoort (de oude oefeningen en sets, de oude RIR, het id van de MacroFactor-training en of de log zijn id en bron van MacroFactor kreeg). De oude duur staat in `values.durationMinutes`, net als bij Garmin. Terugzetten gebruikt dezelfde functie als bij Garmin (`restoreManual`): de eigen cijfers komen terug, wat de gebruiker later toevoegde blijft staan, en de training uit MacroFactor wordt daarna niet opnieuw aangeboden.

Dit is een tweede bewuste uitzondering op "een SessionLog is append-only", op uitdrukkelijk verzoek van de eigenaar. Het besluit over Garmin blijft ongewijzigd; dit besluit verwijst ernaar en vult het aan.

## Hoe het gaat

Alles verloopt vanuit de MacroFactor-pagina, in drie stappen:

1. Eén koppelstap per naam, niet per training. Per unieke MacroFactor-naam één regel met de keuze (een krachtsjabloon of "Niet inlezen"). Een keuze geldt meteen voor alle trainingen met die naam en wordt onthouden op de telefoon. ASCEND doet een voorstel (`engine/macrofactorNames.ts`): per training kijkt het welk krachtsjabloon die dag gepland of gelogd stond, en neemt per naam het sjabloon dat het vaakst voorkomt. Bij een gelijke stand of te weinig bewijs (één dag, zonder dat de oefeningen hetzelfde zeggen) komt er geen voorstel. De oefeningen (squat, deadlift, RDL, lunge, leg press tegenover bench, row, pull, press) zijn een tweede signaal: ze sluiten een sjabloon van het andere soort uit. Het voorstel staat voorgevuld met de reden ("voorgesteld omdat op 30 september Benen A gepland stond"). Met "Koppelingen klopt" bevestigt de gebruiker alles, of hij past eerst een regel aan.
2. "Alles verwerken (N)" verwerkt alle trainingen in één keer: nieuw opslaan, of een bestaande log bijwerken. Per training staat een vinkje om er één over te slaan. Trainingen die al verwerkt zijn (op id van de MacroFactor-training) staan er niet meer tussen. Achteraf volgt één moment met een samenvatting (`announceSaved` met een eigen batch).
3. Een schakelaar "MacroFactor is leidend voor kracht" op de MacroFactor-pagina, standaard aan. Uit betekent dat een bestaande log alleen wordt aangevuld waar een veld nog leeg is, zoals voorheen. Terugzetten kan per training of voor alle trainingen via "Bekijken en terugzetten" op dezelfde pagina.

## Wanneer iets "dezelfde training" is

Ongewijzigd ten opzichte van de eerdere regel: een eigen log van dat sjabloon in dezelfde week (dichtstbijzijnde dag eerst), elke log hooguit één keer. Een log die al uit een MacroFactor-bestand komt of al is overgenomen doet niet meer mee.

## Mijlpalen

Via `storage/milestoneClearing.ts`, vers uit de database op het moment van schrijven, en nooit dubbel. Een mijlpaal die met de eigen cijfers al gehaald was blijft gehaald. Een mijlpaal die pas met de cijfers van MacroFactor gehaald wordt, wordt daarna vastgelegd, en de log onthoudt welke regels dat waren, zodat terugzetten precies die weer weghaalt.

## Reden

De gebruiker legt kracht vast in MacroFactor en wilde niet elke training afzonderlijk koppelen en bevestigen. MacroFactor meet de duur, de sets en de gewichten; een schatting met de hand hoort daar niet boven te staan, net zoals bij het horloge.

## Alternatieven

Alleen lege velden aanvullen (de geschatte duur blijft dan boven de gemeten duur staan; dit blijft de werking als de schakelaar uit staat). De eigen cijfers niet bewaren (terugzetten zou dan niet kunnen). Een apart veld naast `manualMeasured` (twee mechanismen voor hetzelfde idee). De koppeling per training blijven vragen (het werk dat de gebruiker juist kwijt wilde).

## Bron

Eigenaar, 22 oktober 2026, na het inlezen van een echte export (tien krachttrainingen, vier namen). Code: `src/engine/macrofactorLead.ts`, `src/engine/macrofactorNames.ts`, `src/engine/macrofactorLink.ts`, `src/engine/watchAlign.ts` (`restoreManual`), `src/storage/macrofactorLead.ts`, `src/components/MacroFactorLinkCard.tsx`, `src/components/MacroFactorCard.tsx`, `src/components/MacroFactorLeadCard.tsx`, `src/storage/migrations.ts` (`migrateManualStrength`).

## Opgeslagen vorm

`ManualMeasured.strength` is optioneel en additief, en `ManualMeasured.block` is nu optioneel (een krachtlog heeft geen meetblok). De log reist hele mee in de back-up, dus het back-upschema (5) blijft hetzelfde. `migrateManualMeasured` kent het nieuwe deel; een beschadigd veld laat alleen dat veld vallen. De schakelaar en de gekozen koppelingen staan, zoals de rest van de MacroFactor-staat, alleen op deze telefoon en niet in de back-up.

## Vervangt

Niets. Vult `2026-10-22-garmin-is-leidend.md` aan voor kracht.

## Terugdraaien

Zet "MacroFactor is leidend voor kracht" uit: er wordt niets meer overgenomen. Zet wat al is overgenomen terug via "Bekijken en terugzetten" op de MacroFactor-pagina; daarna zijn alle logs weer zoals de gebruiker ze invulde.

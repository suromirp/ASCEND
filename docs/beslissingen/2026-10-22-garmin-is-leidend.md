# Garmin is leidend: een log met de hand neemt de cijfers van het horloge over

Datum: 2026-10-22
Status: aangenomen

## Besluit

Een training die je met de hand invulde (bron "manual", zonder externalId) en waarvoor een passende activiteit van je horloge bestaat, neemt de gemeten cijfers van het horloge over: duur, afstand, gemiddelde en hoogste hartslag, stijging, daling en cadans. Waar het horloge niets heeft, blijft jouw waarde staan. Wat je zelf invulde wordt nooit vervangen: gevoel, inspanning, pijn, notities, het gewicht van de rugzak, stokken en de details van een zware training.

Je eigen cijfers worden bewaard in de log zelf, in het optionele veld `manualMeasured` (de vervangen waarden, het moment, en welke mijlpalen het gelijktrekken haalde). De log krijgt de externalId van de activiteit en bron "garmin". Met Terugzetten, per training of voor de hele reeks, komen je eigen cijfers terug en is de training weer helemaal van jou. Wat je terugzet of weigert wordt nooit opnieuw gelijkgetrokken.

Dit is een bewuste uitzondering op "een SessionLog is append-only", op uitdrukkelijk verzoek van de eigenaar. Het is de enige uitzondering naast het verwijderen van een zelf gemaakte afvinking (2026-10-22-vanzelf-afvinken.md) en het aanvullen van lege velden (2026-10-22-lege-velden-aanvullen.md).

## Wanneer iets "dezelfde training" is

Dezelfde dag, een passende soort (hardlopen, wandelen of een rustdagwandeling, fietsen; kracht telt mee voor het verbergen van het kaartje maar wordt nooit gelijkgetrokken), en een duur in de buurt (binnen 15 minuten of 35 procent, dezelfde marge als bij vanzelf afvinken), of de enige van die soort op die dag aan beide kanten. Een log neemt hooguit één activiteit en een activiteit hooguit één log: bij twee loopjes op een dag paren de dichtstbijzijnde lengtes, en wat overblijft is een nieuwe training of een log zonder horloge. Een wandeling naast een geplande of ingevulde loop is een andere soort en blijft een gewoon voorstel.

Een activiteit die bij een training met de hand hoort, wordt niet meer als nieuw voorstel getoond op "Van je horloge".

## Hoe het gaat

Altijd eerst als voorstel: "N trainingen gelijktrekken met je horloge", met per training wat verandert ("Rustige loop 15 okt: 6,9 km wordt 7,1 km, 55 min blijft, hartslag 152 komt erbij") en Akkoord of Liever niet. Het staat op het koppelscherm en eenmalig als kaartje op Vandaag. Een verschil kleiner dan wat je op het scherm ziet (6,9 en 6,93 km) telt niet. Een klim op een loopband is een schatting en geen hoogte: die vult het horloge alleen in als er niets stond.

Voor dit voorstel haalt ASCEND eenmalig (en op verzoek) ook de oudere activiteiten op, vanaf je oudste training met de hand, hooguit 120 dagen terug, naast de gewone 7 dagen. Die oude activiteiten staan apart en worden nooit als nieuwe training voorgesteld.

Daarna, voor nieuwe gevallen: met de schakelaar "Garmin is leidend" (op het koppelscherm, standaard aan) gaat het vanzelf voor een training met de hand van de laatste 7 dagen waarvoor een activiteit binnenkomt, pas nadat het eerste voorstel is beantwoord. Dan komt de melding "Bijgewerkt met je horloge" met Ongedaan maken. Daarna rekenen de planning, de beenindex en de weekbelasting met de nieuwe getallen, via de gewone verversing en een nieuwe weekcontrole.

Een tweede opstart schrijft niets: een log met een externalId doet niet meer mee.

## Mijlpalen

Een mijlpaal die met je eigen cijfers al behaald was, blijft behaald, ook als het horloge minder mat. Een mijlpaal die pas met de cijfers van het horloge gehaald wordt, wordt daarna alsnog vastgelegd, via dezelfde route als bij een nieuwe log (`storage/milestoneClearing.ts`). Wat je eigen cijfers al ruim haalden maar bleef liggen voor een volgende log (er wordt per log één mijlpaal gehaald) telt niet als nieuw. Zet je een training terug, dan gaan precies de mijlpalen weer weg die het gelijktrekken haalde, zoals bij het verwijderen van een log.

## Reden

De eigenaar draagt zijn horloge elke training en zei: Garmin is leidend. Wat hij met de hand invulde was een schatting; het horloge meet. Zonder dit dubbel werk en dubbele kaartjes, en zonder dat een schatting de beenindex en de weekbelasting stuurt.

## Alternatieven

Een tweede log naast de eerste (dubbel geteld). Alleen lege velden aanvullen (de afstand en duur van jouw schatting blijven dan leidend, terwijl het horloge ze precies weet). Gelijktrekken zonder bewaren (er gaat dan iets verloren en terugzetten kan niet). Alles vanzelf zonder eerste voorstel (het verleden is groot en verandert dan stil).

## Bron

Eigenaar, 22 oktober 2026. Code: `src/engine/watchAlign.ts`, `src/engine/activityImport.ts` (`pairWithManualLogs`), `src/storage/watchAlign.ts`, `src/storage/externalActivities.ts` (`syncWatchHistory`), `src/components/WatchAlignCard.tsx`, `src/storage/migrations.ts` (`migrateManualMeasured`).

## Opgeslagen vorm

`SessionLog.manualMeasured` is optioneel en additief; de log reist hele mee in de back-up, dus het back-upschema (5) blijft hetzelfde. `migrateManualMeasured` is een doorgeefstap voor een log zonder het veld en laat bij een beschadigd veld alleen dat veld vallen. Een oudere app die zo'n back-up leest, behoudt het veld in de log, maar kan niet terugzetten.

## Vervangt

Niets. Vult `2026-10-22-lege-velden-aanvullen.md` en `2026-10-22-vanzelf-afvinken.md` aan.

## Terugdraaien

Zet "Garmin is leidend" uit: er gebeurt niets meer vanzelf. Zet alles terug via Bekijken en terugzetten op het koppelscherm; daarna zijn alle logs weer zoals je ze invulde.

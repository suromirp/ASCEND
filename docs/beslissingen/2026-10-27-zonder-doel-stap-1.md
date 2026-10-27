# Zonder doel, stap 1 tot en met 3: meten, rekenen en Je week

Datum: 2026-10-27
Status: aangenomen

## Besluit

De eerste drie bouwstappen van `docs/visie/Zonder doel.md` zijn gebouwd: een meting van wat een plan zonder doel nu doet, de gegevens en pure functies voor richting, weekbudget en golven, en een alleen-lezen kaart "Je week" op de Ascend-tab voor wie geen doel heeft. De planning verandert niet. Wie een doel heeft, ziet niets nieuws.

## Wat de meting liet zien

Golden scenario D (een bestaande gebruiker met het volledige programma en alle doelen gearchiveerd) legt vast wat er nu gebeurt. Een plan zonder doel krijgt nu wel een bergtocht en een rugzak: de 52 weken bevatten de fasen Basisfase, Opbouw, Bergcapaciteit en Expeditieklaar, een bergtocht met rugzak van 11 tot 15 kilo vanaf eind december, en vanaf eind januari ook een eerste wandeldag met rugzak op zaterdag. Scenario B (nieuwe gebruiker, Fit blijven) liet dat al zien voor de bergtocht. D bevestigt het ook voor een bestaande gebruiker zonder doel. Dit is de nulmeting voor stap 4. Er is geen codewijziging aan de planning en de bestaande snapshots zijn gelijk gebleven.

## Wat er gebouwd is

- `data/directions.ts`: vier richtingen (Fit blijven, Fitter worden, Sterker worden, Rustig aan) met minuten, keren kracht, aandeel pittig en golf, elk met bewijslabel en bron. "Naar een doel" is geen richting maar wat er al is.
- `engine/direction.ts`: `activeDirection` is afgeleid. De doelen zoals de Ascend-tab ze toont (`listedGoals`) bepalen of er een doel is, zodat "zonder doel" overal hetzelfde betekent. Een doel van de soort Fit blijven of Sterker worden is zelf de richting. `startMinutes` laat Fitter worden beginnen bij het gemiddelde van de laatste vier weken (naar boven op 5, tussen 100 en 300), zonder geschiedenis bij 120.
- `engine/weekBudget.ts`: wat telt. Een matige minuut telt 1, een pittige 2 (hartslagzones als die er zijn, anders je RPE van 7 of hoger, anders hoe zwaar de training bedoeld was). Kracht telt niet in de minuten maar als aparte teller, een keer per krachttraining, behalve de minimale variant. Herstel telt nergens.
- `engine/waves.ts`: een golf van vier weken afgeleid uit `directionStart`, nooit per week opgeslagen. Drie weken opbouwen met hoogstens 10% erbij (Sterker worden houdt vlak), de vierde week 35% lichter. De terugblik (`waveReview`, `nextWaveLevel`) is pure rekenlogica zonder scherm; een week is gehaald bij minstens 90% van het budget, een golf is goed bij minstens 3 van 4 weken, zwaar bij gemiddeld meer dan 115% van het budget.
- `engine/yourWeek.ts`: zet het alles om in de zinnen van de kaart.
- Op de Ascend-tab, alleen als er geen doel is en wel een plan: de kaart Je week (de ring is het ene mint accent), het blad Je week met wat er telde, en de kaart Je richting met het richtingblad. Zonder plan (een lege installatie) blijft de oude lege kaart staan.
- Instelling Weekbudget in Doel en tochten, alleen zichtbaar zonder doel (`SHOW_WHEN`, blokkade `noGoal`): minuten per week, keren kracht en of pittige minuten dubbel tellen. Met zoekindex, indeling, samenvatting, uitleg, "aangepast"-lijst en groepspagina.
- Opslag: `AppSettings.direction`, `directionStart` (een maandag) en `weekBudget`, optioneel en defensief gelezen. `migrateDirection` in `storage/migrations.ts` houdt alleen bekende waarden over bij een import. Een oude back-up zonder deze velden importeert zoals eerst, dus het schemanummer blijft staan.

## Keuzes

Op advies, na de open vragen van het ontwerp:

- Fit blijven en Sterker worden zijn één taal: de richting is de lichte vorm.
- Kracht telt niet mee in de minuten, er is een aparte teller.
- Een gebruiker zonder doel krijgt alleen de kaart met de knop "Kies je richting". Geen automatisch voorstel, het plan blijft zoals het is.
- Rustig aan is 90 minuten en 1 keer kracht, instelbaar.
- Golven van vier weken bij Fitter worden en Sterker worden.
- De terugblik komt alleen op de Ascend-tab (nog niet gebouwd).

Eerlijk over wat nog niet gebeurt: een richting kiezen bewaart alleen de keuze en de maandag waarop hij begon. De planning volgt er nog niet. Het richtingblad zegt dat: "De planning volgt in een volgende versie, tot dan verandert je plan niet." Dat is eerlijker dan het kiezen weglaten, want de kaart gaat meteen tellen volgens de gekozen richting, en een kaart die iets anders vraagt dan het plan geeft de gebruiker zicht op het verschil. Het weekbudget leest alleen wat je deed.

Niet gebouwd in deze stap: de kaart op Vandaag en op Je stand (Vandaag blijft bij de missie van vandaag), een rij Richting en Golven in Instellingen, de lege-, laad- en foutstand van de kaart (de logs staan al in het geheugen, er is niets om op te wachten) en het voorstel met Akkoord, dat pas nodig is zodra een richting de planning raakt (stap 4).

## Reden

Het onderzoek zei alleen uit de code gelezen dat een plan zonder doel een bergtocht krijgt. De meting maakt het een feit en geeft stap 4 een nulmeting. De rekenlogica en de kaart zonder planning erachter zijn los te controleren en laten niemand met een doel iets anders zien.

## Alternatieven

- Het kiezen van een richting weglaten tot stap 4: de kaart zou dan altijd het advies van Fit blijven tonen. Niet gekozen, omdat een gebruiker nu al kan zeggen wat hij wil laten tellen en de tekst eerlijk zegt dat het plan nog niet volgt.
- Een rij Richting in Instellingen: niet gevraagd, en het kiezen staat al op de Ascend-tab.

## Bron

`docs/visie/Zonder doel.md`, `docs/onderzoek/ASCEND voor iedereen.md` (deel 3 en 4) en de keuzes van de eigenaar op de open vragen.

## Vervangt

Niets.

## Terugdraaien

De nieuwe velden in `AppSettings` zijn optioneel: weghalen van de kaart, het blad en de rij Weekbudget laat de rest zoals het was. De golden snapshot van scenario D mag blijven als nulmeting.

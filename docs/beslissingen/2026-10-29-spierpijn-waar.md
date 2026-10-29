# Spierpijn alleen in je bovenlichaam

Datum: 2026-10-29
Status: aangenomen

## Besluit

In de ochtendcheck gaat "Spierpijn" en "Flinke spierpijn" nog steeds over je benen. Kies je een van die twee, dan verschijnt eronder een rustige, optionele chip "Alleen bovenlichaam". Staat die aan, dan telt de spierpijn niet voor de benen: de planning, de kaart Benen (LEG-EASE), MORNING-CHECK en de beenindex reageren er niet op. Het antwoord staat in `MorningCheckIn.soreWhere` (`'upper'`, afwezig is de benen).

## Reden

Spierpijn na een bovenlichaamtraining is geen reden om een loop of beendag te verplaatsen. Zonder deze keuze kon je alleen "Fris" kiezen en miste de ochtendcheck dan wat je wel voelde.

Wat er met 'upper' gebeurt, het eenvoudigste: niets. `morningSignals` geeft dan geen spierpijn en ook geen negatief signaal voor flinke spierpijn, dus er komt geen voorstel en geen zin, ook niet voor een zware bovenlichaamtraining van vandaag. Een rustige zin daarover is later toe te voegen als blijkt dat je hem mist. Energie en slaap tellen gewoon mee. De regel op Vandaag zegt wel wat je antwoordde: "spierpijn in je bovenlichaam". De tekst van MORNING-CHECK bij een test wijst naar deze chip: "Zit het alleen in je bovenlichaam, tik dat aan in je ochtendcheck; dan vervalt dit advies."

Het veld is optioneel en wordt defensief gelezen (alleen de waarde 'upper' bij spierpijn of flinke spierpijn telt). Het gaat mee in de back-up met de ochtendcheck zelf, zonder schemawijziging en zonder migratie.

Geen aparte instelling: het is een antwoord van jezelf, geen keuze van de app.

## Alternatieven

Een volledige plekkeuze (benen, bovenlichaam, overal): meer tikken voor het gewone geval. Spierpijn in het bovenlichaam toch als negatief signaal laten tellen: dan verschuift een rustige dag zonder reden. Een voorstel voor bovenlichaamtraining: niet gevraagd en geen bewijs dat het helpt.

## Bron

Gesprek met de eigenaar, 2026-10-29. `docs/onderzoek/Pijn spierpijn en vermoeidheid melden.md`.

## Vervangt

Niets. Vult `2026-10-27-spierpijn-en-zware-beendag.md` aan.

## Terugdraaien

Haal de chip uit `MorningCheckInSheet.tsx` en de functie `upperOnly` uit `engine/wellbeing.ts`; opgeslagen waarden worden dan genegeerd en blijven onschadelijk.

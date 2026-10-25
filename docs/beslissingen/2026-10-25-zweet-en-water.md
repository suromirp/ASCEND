# Zweetverlies meten en water per etappe

Datum: 2026-10-25
Status: aangenomen

## Besluit

Je kunt bij een loop, wandeling of tocht je gewicht voor en na invullen, met wat je dronk en plaste. ASCEND rekent daaruit je zweetverlies per uur, leert je tempo per temperatuur en toont op Etappes ongeveer hoeveel je op een etappe zweet. De instelling "Water per etappe tonen" staat standaard aan.

## Reden

Hoeveel iemand zweet verschilt sterk, en op de GR5 lopen zomerdagen van 6 tot 8 uur met rugzak, in het zuiden met bronnen die soms uren uit elkaar liggen. Een horlogeschatting gaf bij de eigenaar ongeveer een liter per uur bij 13 graden. Een eigen meting is beter dan een algemeen getal.

De metingen staan in een eigen lijst in de instellingen (`AppSettings.sweatEntries`, één per training), niet op de SessionLog, zodat een log nooit wordt herschreven. Ze reizen mee in de back-up (defensief gelezen door `migrateSweatEntries`, per id samengevoegd bij herstel, het toestel wint). De berekening staat in `engine/sweat.ts` en `engine/stageWater.ts`, met tests. Een eigen weging gaat altijd voor een schatting van het horloge; die schatting vult de gebruiker zelf in, omdat intervals.icu geen zweetveld voor een activiteit heeft (alleen `hydration` en `hydrationVolume` bij de dagwaarden).

Zonder metingen geldt een voorzichtige standaard uit het GR5-onderzoek (regel B3), altijd met de woorden nog niet gemeten. Het getal is "ongeveer" en feitelijk, nooit medisch advies. De reisplannertaak "Meet je zweetverlies" is af zodra er twee eigen wegingen zijn; dat wordt afgeleid, niet als vlag bewaard.

## Alternatieven

Een veld op de SessionLog: afgewezen, een log wordt nooit herschreven. Een drinkvoorschrift per uur: afgewezen, het doel is minder dan 2% verlies, niet alles terugdrinken, en dat is voor een app te veel medisch advies. Het horloge automatisch uitlezen: kan niet, het veld bestaat niet bij intervals.icu.

## Bron

`docs/onderzoek/Zweetverlies en water.md` en `docs/onderzoek/Aanvullend onderzoek GR5 voorbereiding.md` (regel B3, de sectie over hitte).

## Vervangt

Niets.

## Terugdraaien

Zet "Water per etappe tonen" uit; de wegingen blijven dan bewaard maar onzichtbaar op Etappes. Wegingen verwijderen kan per training in het blad van die training.

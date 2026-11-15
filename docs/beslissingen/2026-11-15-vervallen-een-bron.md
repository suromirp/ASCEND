# Vervallen heeft één bron

Datum: 2026-11-15
Status: aangenomen

## Besluit

Vervallen betekent overal hetzelfde: een voorbije training zonder log op een dag binnen een gemelde ziekte (tot en met de dag van beter melden) of vakantie, tocht of periode zonder sportschool. Week, de weekterugblik, de reeks en de kaart Vervallen op Vandaag lezen dezelfde toets (`engine/sessionStatus.ts#isPausedDay`). De kaart noemt dus alleen dagen binnen de pauze; wat ervoor lag blijft gemist en wordt niet meer genoemd, en krijgt ook geen vraag Niet gedaan? meer.

Een training die je op een zieke dag toch deed, telt mee als gedaan, net als op vakantie: in de ring van Week, de weekterugblik, Ritme en de reeks (`engine/weekLogs.ts#leftOutOfCount`, `engine/streak.ts`).

Een rustiger instap terugzetten is zelf een regel in het logboek van wijzigingen (`storage/reentryUndo.ts`); Ongedaan maken in de melding verwijst naar die regel.

## Reden

Warden en Lookout (15 november): ziek vanaf vrijdag 13 november noemde Week dinsdag tot en met donderdag terecht gemist, terwijl de kaart op Vandaag dezelfde dagen "vervallen: je meldde ziekte" noemde. Een training op een zieke dag stond in de rij als gedaan, maar de ring gaf 0 van 0 en de weekterugblik telde hem als extra.

## Alternatieven

- De kaart blijft de dagen vóór de pauze noemen. Niet gekozen: dan spreken Vandaag en Week elkaar tegen in dezelfde stand.
- Alleen ziekte zo, vakantie zoals eerst. Niet gekozen: één afleiding voor beide, zoals Week al deed.

## Bron

Review van Warden en de doorloop van Lookout op `claude/nacht`, 15 november.

## Vervangt

`2026-11-14-vakantie-en-ziek-niet-gemist.md` op één punt: de regel onder Vervallen noemde wat vóór de pauze open stond; nu noemt hij wat binnen de pauze stond. Dat er geen vraag en geen inhaaladvies meer komt over wat ervoor lag, blijft.

## Terugdraaien

In `engine/missedTraining.ts#planMissed` de kaart weer vullen uit `pauseSince` in plaats van `isPausedDay`; in `leftOutOfCount` en de reeks de toets op een log bij ziekte weghalen.

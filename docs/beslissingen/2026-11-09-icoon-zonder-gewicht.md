# Een eigen icoon voor training zonder gewicht

Datum: 2026-11-09
Status: aangenomen

## Besluit

Kracht zonder gewicht krijgt het pictogram `eigengewicht` (een figuur in een push-up) in plaats van de halter. Het gaat om Eigen gewicht (`tpl_bodyweight`), een training waarvan elke oefening met je eigen lichaam gaat, en de tegel Calisthenics bij een nieuw doel. De sport blijft kracht: dezelfde kleur, dezelfde groep in het Logboek, dezelfde planning.

## Reden

Eigen gewicht en calisthenics hadden dezelfde halter als de sportschool, terwijl ze geen gewicht gebruiken. Alleen het pictogram verschilt, zodat geen scherm, filter of planregel hoeft mee te veranderen.

## Alternatieven

Een zevende soort in `SportKind` en `SportKey`: dat splitst het Logboek en de weekbudgetten voor een verschil dat alleen het oog ziet. Niet gekozen.

## Bron

Wens van de eigenaar, 9 november.

## Vervangt

Niets.

## Terugdraaien

`isBodyweightTemplate` en `isBodyweightLog` (`engine/sportKind.ts`) laten `false` teruggeven; de halter komt overal terug.

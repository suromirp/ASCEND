# Bij een grove stap de missers vergelijken voor het afronden

Datum: 2026-10-26
Status: aangenomen

## Besluit

Bij een grove stap kiest de eerste set het gewicht met de kleinste verwachte misser in herhalingen (`2026-10-26-kracht-vermoeidheid-en-grove-stap.md`). Die missers worden nu vergeleken met de herhalingen zoals Epley ze geeft, voor het afronden naar beneden. Het afgeronde getal blijft wat in de zin en in de set staat.

## Reden

De regel zegt dat de kleinste misser in herhalingen wint. Met naar beneden afgeronde herhalingen telt de lichte kant steeds tot bijna één herhaling te gunstig, zodat de keuze ongeveer een herhaling naar het lichtere gewicht kantelt. Dat is geen onderzoeksresultaat maar rekenkundige consistentie met de eigen regel. In een stille toets op eigen trainingen werden de eerste sets gemiddeld minder te licht en veranderde niets ten nadele in het huidige programma; het verschil is klein en kan toeval zijn.

## Alternatieven

Afronden naar het dichtstbijzijnde gewicht in plaats van naar beneden: hielp bij toestellen en kostte bij stang en dumbbells. Sneller omhoog gladstrijken (k van 0,75 of 1): niet aantoonbaar beter, en bij 1 werden de latere sets slechter. Een andere formule dan Epley: geen enkele paste overal beter.

## Bron

KR-1 en KR-4 in `docs/onderzoek/Kracht loggen en progressie.md`, het besluit van 26 oktober over de grove stap, en een stille toets op eigen trainingen (privé, niet in de repo).

## Vervangt

Niets. Het verduidelijkt hoe de misser in `2026-10-26-kracht-vermoeidheid-en-grove-stap.md` wordt gemeten.

## Terugdraaien

In `prescribe` (`engine/strengthModel.ts`) de vergelijking weer met `expectedReps` doen in plaats van met de onafgeronde waarde.

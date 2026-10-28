# Klaar voor je doel: ook de regel en het voorstel op één rekening

Datum: 2026-10-28
Status: aangenomen

## Besluit

De regel onder het getal, het blad van het doel en het voorstel TARGET-TIME gebruiken dezelfde rekening als de snelheidsmeter: gemiddelde groei van 0,55% per week, geteld vanaf vandaag (`racePaces.ts#raceOutlook`). De band van 0,3 tot 0,8% per week is weg.

## Reden

De regel zei "47 tot 54 minuten" (uit 0,3 tot 0,8%) en daarna "47:45 vraagt ongeveer 28 weken; tot 20 maart zijn het er 21" (uit 0,55%). Twee maten voor hetzelfde gat. Nu zegt de kaart: "Bij gemiddelde groei rond 20 maart: ongeveer 50 minuten. 45:00 vraagt ongeveer 39 weken; tot 20 maart zijn het er 21." en als het past "ongeveer 50 minuten, je doel valt erbinnen."

TARGET-TIME stelt een doeltijd voor als die meer weken vraagt dan er zijn en meer dan 2,5% (de spreiding van de voorspelling) sneller is dan de tijd op de wedstrijddag bij gemiddelde groei. Het voorstel is die tijd in hele minuten. "Te makkelijk" is een doeltijd die langzamer is dan je test nu. De tekst noemt de weken, niet meer "realistisch". Het id (`goaltime:<doel>:<minuten>`) en Liever niet blijven gelijk.

## Alternatieven

De band houden naast de weken. Dat bleef twee uitspraken over één gat.

## Bron

Opdracht van de coördinator, op verzoek van de eigenaar. Geen persoonsgegevens.

## Vervangt

Het deel van `2026-10-28-klaar-voor-je-doel-snelheid-aanvulling.md` dat de band van 0,3 tot 0,8% per week als haalbaarheidsregel noemt.

## Terugdraaien

`raceOutlook` in `racePaces.ts` vervangen door de oude band.

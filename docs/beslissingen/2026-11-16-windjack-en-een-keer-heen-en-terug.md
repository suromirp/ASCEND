# Windjack vanaf 20 km/u, en een stuk heen en terug één keer zeggen

Datum: 2026-11-16
Status: aangenomen

Aanvulling bij `2026-11-13-kleding-en-wind.md`. Daar bleef de windgrens van 25 km/u van het kledingadvies bewust staan tot een bronnencheck; die is gedaan.

## Besluit

- Het kledingadvies noemt een windjack vanaf 20 km/u in plaats van 25 (`CLOTHING_RULES.windKmh` in `src/engine/clothing.ts`). De windstoten (40), de weerzin (15 voor het noemen van wind) en de warmtebonus van de lange duurloop blijven zoals ze zijn.
- Een Avontuurlijk-lus met een stuk heen en terug zegt dat één keer, in amber ("Deze lus heeft twee stukken heen en terug."). De titel wordt dan "Lus" of "Lus langs een helling", en "Een deel loop je twee keer." vervalt zodra de lus een stuk heen en terug heeft. Bij de andere lus noemt de regel de stukken niet als de amberregel eronder ze al noemt. De titel van Simpel blijft zoals hij was. Staat de amberregel er niet (bij een andere waarschuwing die voorgaat in de rij van de andere lus), dan blijft het stuk in de titel staan.
- Geen nieuwe instelling: het is geen nieuwe keuze van de app. De windgrens was al een regel van het kledingadvies, en de zinnen van een voorstel veranderen niets aan de planning.

## Reden

Kleding en wind getoetst (`docs/onderzoek/Kleding en wind getoetst.md`): vanaf ongeveer 20 km/u koelt de wind een loper merkbaar af, 25 was te laat. Bij de lus zei Wandeling plannen hetzelfde drie keer (Lookout, 16 november); de amberregel is de waarschuwing, de rest is herhaling.

## Alternatieven

Titel altijd zonder het stuk: dan mist de andere lus de vorm als een andere waarschuwing de amberregel verdringt. De amberregel weglaten en de titel houden: een waarschuwing hoort in amber.

## Bron

`docs/onderzoek/Kleding en wind getoetst.md`; Inbox van de backlog (I-49, I-81).

## Vervangt

Niets. Vult `2026-11-13-kleding-en-wind.md` aan voor het getal 25.

## Terugdraaien

`windKmh` terug op 25; in `routePlanner.ts#proposalTitle` de parameter `spurWarned` negeren en de voorwaarde bij "Een deel loop je twee keer." weghalen.

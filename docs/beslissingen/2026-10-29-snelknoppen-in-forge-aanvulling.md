# Snelknoppen in Forge, aanvulling na de controle

Datum: 2026-10-29
Status: aangenomen

## Besluit

De rij snelknoppen is Ruilen, Opwarmset en Notitie. "Set erbij" valt weg, want "Set toevoegen" staat al onder de sets van elke oefening en dezelfde keuze heet overal hetzelfde. Voor een set weghalen is er één woord: verwijderen (de knop, de melding, het setmenu en de regel "1 set van je programma verwijderd"). Een rij gaat open voorbij 54 px en verwijdert meteen voorbij 60% van de breedte, of als je vinger tot 24 px van de rand van het scherm komt, wat het eerst komt (nooit onder 96 px, zodat open en weg uit elkaar blijven). Het kaartje in de kop wisselt mee na Ruilen.

## Reden

Lookout zag dat een lange veeg in de praktijk nooit verwijderde: een veeg begint links in de rij, op het nummer of het voorschrift, en de vinger raakte de rand van het scherm voor hij 60% haalde. Met vier knoppen viel Notitie op 390 px al buiten beeld. Na Ruilen bleef het kaartje de tekening van de oude oefening tonen.

## Alternatieven

Beide knoppen "Set toevoegen" noemen: dan staan er twee knoppen voor hetzelfde op één kaart. De veeg op de hele rij laten beginnen: dan botst hij met het typen in kg en herhalingen.

## Bron

De doorloop van Lookout en de review van Warden op 2026-10-29.

## Vervangt

De vier knoppen, het woord "weghalen" en de drempel van 60% in `2026-10-29-snelknoppen-in-forge.md`; de rest van dat besluit blijft.

## Terugdraaien

`QUICK_ACTION_ORDER` in `engine/forgeQuickActions.ts` en de drempels in `components/swipeRow.ts`.

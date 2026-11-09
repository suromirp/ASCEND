# Je gewicht ook buiten Instellingen zien

Datum: 2026-11-09
Status: aangenomen

## Besluit

Op Je stand staat een kleine kaart Gewicht: de trend groot (of de laatste weging als er geen trend is), de laatste weging met datum klein en een rustige lijn van de laatste zes weken, één punt per week. Een tik opent het blad Lichaamsgewicht. In het Logboek is een weging een eigen regel tussen de trainingen: datum, kilo en bron. Eén instelling, Gewicht op Je stand (Instellingen, Lichaam), zet beide aan of uit; afwezig is aan zodra er een weging is.

## Reden

De eigenaar (9 november) wil zijn gewicht zien zonder Instellingen in te gaan. De kaart leest dezelfde `weightShown` als het blad, dus het getal verschilt nooit. De kaart zit niet in de volgorde van de blokken (`cardOrder`) maar staat onder de blokken, zodat een bewaarde volgorde niet verandert en er geen migratie nodig is.

## Alternatieven

Een eigen blok in de volgorde van Je stand: raakt de bewaarde volgorde en vraagt een migratie. Het Logboek per weging tikbaar maken: het blad Lichaamsgewicht staat al op Je stand, en een regel zonder tik is rustiger. Twee schakelaars (kaart en Logboek): één zin uitleg is genoeg voor wat samen hoort.

## Bron

Wens van de eigenaar, 9 november (Inbox, lijn rest).

## Vervangt

Niets.

## Terugdraaien

Zet Gewicht op Je stand uit: de kaart en de regels verdwijnen, de wegingen blijven bewaard. De planning leest hier niets van (`planGolden` beweegt niet).

# Forge: de opwarmsets lopen af in herhalingen

Datum: 2026-10-22
Status: aangenomen

## Besluit

De slimme opwarming van Forge neemt de herhalingen per set nooit toe: elke opwarmset heeft evenveel of minder herhalingen dan de set ervoor, terwijl het gewicht oploopt. Gewoon is het 40% van de geschatte kracht voor 8 herhalingen en 58% voor 4. Bij een zwaar werkgewicht (meer dan drie keer de zwaarste lege stang) komt er een lichte set voor: ongeveer 27% voor 10 herhalingen, dan 40% voor 8 en 58% voor 4. De code dwingt het af: een set krijgt nooit meer herhalingen dan de vorige (`warmupSets` in `src/engine/strengthModel.ts`).

Daarvoor liep het niet netjes af: de lichte voorset had 6 herhalingen, vóór een set van 8, en gaf zo een reeks als 22,5 kg x 6, 35 kg x 8, 50 kg x 4.

## Afwijking van het voorbeeld

Het voorbeeld dat de eigenaar liet zien had ongeveer 40% x 10 en 61% x 6 van het geschatte maximum. Dat is hier niet overgenomen. De 40% x 8 en 58% x 4 komen uit het onderzoek (KR-7: ongeveer 50% voor 6 tot 8 en ongeveer 80% voor 3 tot 5 van het werkgewicht, en de 58% van de schatting ligt daar dicht bij). Meer herhalingen op de zwaarste voorset kosten kracht die je voor de werkset nodig hebt. Het voorbeeld is bovendien één screenshot van een andere app, dus geen reden om de getallen vast te zetten. Wie de percentages van het voorbeeld wil, kiest het vaste schema (40, 60 en 80 procent van het werkgewicht) of zet opwarmen uit; beide staan in de instellingen onder Forge.

## Reden

Een opwarming moet je voorbereiden, niet vermoeien. Meer herhalingen bij een zwaarder gewicht voelt onlogisch en kost energie. De volgorde 10, 8, 4 loopt af zoals je het in de sportschool ook doet.

## Alternatieven

De percentages van het voorbeeld (40% x 10, 61% x 6): afgewezen, zie hierboven. De voorset op 6 herhalingen laten staan: afgewezen, want dat gaf het onlogische verloop.

## Bron

`docs/onderzoek/Kracht loggen en progressie.md` (KR-7) en het besluit `2026-10-22-forge-kracht-meerekenen.md`. Keuze van de eigenaar dat alles instelbaar is.

## Vervangt

Niets. Het besluit `2026-10-22-forge-kracht-meerekenen.md` noemt de opwarming met "40% en 58% voor 8 en 4 herhalingen, met een lichte derde set"; dit besluit preciseert die derde set (nu 10 herhalingen, ervoor) en blijft er naast staan.

## Terugdraaien

In de instellingen onder Forge opwarmen op Schema of Uit zetten, of de herhalingen in `warmupSets` terugzetten.

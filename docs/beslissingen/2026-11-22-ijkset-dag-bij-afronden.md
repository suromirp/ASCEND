# De ijkset telt pas bij Afronden, ook bij Vragen

Datum: 2026-11-22
Status: aangenomen

## Besluit

Na Akkoord op de kaart IJkset staat de set erbij met de vaste id van de ijkset (`:aijk`) en een regel in het verloop. De vier weken (`strengthModel.calibratedAt`) tellen pas als je afrondt met die set afgevinkt, zoals bij Automatisch erbij. Zet je daarna Lichter aan, dan gaat de set weg en de dag staat nog niet; met Terugzetten komt hij terug. Een concept volgt de stand: staat IJkset op Uit, dan gaat een ijkset die nog open staat eruit.

## Reden

Eerder werd de dag bij Akkoord gezet. Met Lichter erna was de set weg en gold de ijkset toch als gedaan (I-71, Warden 16 november).

## Alternatieven

Lichter de set laten houden: past niet bij `2026-11-15-ijkset-automatisch.md`, een set tot bijna falen hoort niet bij een lichtere training.

## Vervangt

Niets. Vult `2026-11-09-ijkset.md` aan: de dag wordt niet meer bij Akkoord onthouden.

## Terugdraaien

In `ForgeWorkout.tsx` bij Akkoord weer `calibratedAt` schrijven.

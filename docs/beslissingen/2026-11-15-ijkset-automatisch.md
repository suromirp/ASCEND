# De ijkset automatisch erbij

Datum: 2026-11-15
Status: aangenomen

## Besluit

De instelling IJkset (Instellingen, Forge, Bij het invullen) heeft drie standen: Vragen (het advies, de kaart met Niet nu en Akkoord uit `2026-11-09-ijkset.md`), Automatisch erbij en Uit.

Met Automatisch erbij staat de ijkset bij het openen van de training al bij de hoofdoefening, als gewone toegevoegde werkset met nog één over, met één regel uitleg boven de sets: "IJkset, eens per vier weken: de laatste set zo ver als netjes gaat, met nog één over. Wil je hem niet, haal hem weg." Wegtikken kan zoals bij elke set. Het openen start de sessie niet. De vier weken tellen pas als je de training afrondt met die set afgevinkt, nooit bij het openen.

Voor alle standen komt er nooit een ijkset als je ziek bent of opbouwt na ziek, op een dag zonder sportschool, op een vakantiedag of tochtdag, en ook niet in een week met een tocht als vrije periode of in de drie dagen ervoor. De eerdere uitzonderingen (tocht, test of wedstrijd in de planning, vier weken na de vorige) blijven.

## Hoe het werkt

`engine/calibration.ts#calibrationBlock` kent nu ook `ill` (`engine/illness.ts`: een open ziekmelding, een ziekdag of de opbouw met `recoveryRamp`), `away` en `nogym` (`engine/leave.ts#leaveDays`). `#withAutoCalibration` zet de set erbij met de vaste id `<plek>:aijk` (een toegevoegde set voor `isOwnRow`, herkend met `#isCalibrationRow`), zodat het concept hem zonder nieuw veld draagt. In het verloop staat hij als toegevoegd, met "Forge zette deze ijkset erbij". Afronden (`ForgeSheets.tsx`) zet `strengthModel.calibratedAt` op de dag van het log als `#calibrationDone`.

De stand staat in `strengthModel.calibrationMode`. Een oude back-up zonder dat veld leest `calibration: true` (of niets) als Vragen en `calibration: false` als Uit; `calibration` blijft meegeschreven voor oudere versies. Geen vormwijziging, dus geen migratiestap.

## Reden

De eigenaar op 15 november in Forge bij de kaart IJkset: "Waarom vraagt die dit, mag van mij automatisch." Vragen blijft het advies, omdat de set moe maakt en een voorstel met Akkoord de afspraak is; wie het automatisch wil, kiest het zelf. Hij was die dag ziek; een ijkset meet dan iets anders dan je gewone kracht, dus daar komt hij in geen enkele stand.

## Alternatieven

Vragen helemaal weghalen: dan verandert het voorschrift ongevraagd voor wie het niet koos. De dag onthouden bij het openen: dan telt een ijkset die je weghaalde of nooit deed als gedaan.

## Bron

`docs/beslissingen/2026-11-09-ijkset.md`, KR-12 in `docs/onderzoek/Kracht loggen en progressie.md`, de melding van de eigenaar (I-65).

## Vervangt

Niets. Vult `2026-11-09-ijkset.md` aan (de instelling had twee standen).

## Terugdraaien

IJkset op Vragen of Uit. In de code: `withAutoCalibration` weglaten in `ForgeWorkout.tsx`; `calibrationMode` mag blijven staan.

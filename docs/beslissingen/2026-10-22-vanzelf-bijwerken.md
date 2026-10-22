# De app werkt zichzelf bij op een rustig moment

Datum: 2026-10-22
Status: aangenomen

## Besluit

De app installeert een nieuwe versie zelf: bij een koude start, of als hij langer dan 30 minuten op de achtergrond was. Nooit met een sheet open, een veld in focus of invoer in de laatste 2 minuten. Daarna de melding "Bijgewerkt". De knop Bijwerken blijft als vangnet.

## Reden

De eigenaar gaf akkoord. Met een handmatige knop bleef de oude versie soms dagen draaien terwijl er tientallen nieuwe live stonden.

## Alternatieven

Altijd zelf tikken (gaf verouderde versies). Direct bijwerken bij elke nieuwe versie (kan midden in het invullen gebeuren).

## Bron

Eigenaar, 21 oktober 2026. docs/visie/Techniek en kwaliteit.md, 3.4. Code: src/utils/updatePolicy.ts, src/utils/appBusy.ts.

## Vervangt

Niets.

## Terugdraaien

Zet in updatePolicy.ts de automatische route uit; de knop Bijwerken werkt dan weer als enige route.

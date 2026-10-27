# Voorbeelden bij naam noemen in Wat speelde er

Datum: 2026-10-27
Status: aangenomen

## Besluit

Nieuwe instelling "Voorbeelden bij naam noemen" (`AppSettings.influenceNames`, groep Lichaam, in het blad Wat speelde er). Standaard aan: de uitleg en de hulpteksten noemen alcohol en wiet bij naam, als geheugensteun. Uit: dezelfde teksten in neutrale woorden, zoals "wat je dronk of gebruikte".

## Reden

Sommige mensen willen de voorbeelden zien, anderen liever niet in de uitleg. Elke keuze die de app voor de gebruiker maakt is instelbaar, met het advies als standaard. De eigenaar wil ze zien, dus aan.

De regel uit CLAUDE.md blijft staan: ASCEND noemt zelf nooit alcohol of wiet als reden in een lijst, een melding of een Strava-tekst. Deze instelling gaat alleen over de uitleg en de hulpteksten, en niet over de keuzes (chips) die je zelf openzet: die blijven werken. Ook de voorstellen die uit jouw eigen notities volgen, blijven zoals ze waren.

Aangepast: `data/settingsHelp.ts#settingsHelp` (de neutrale varianten van "wat-oorzaak" en "wat-test", en de uitleg van de instelling zelf), `settingsIndex`, `settingsLayout`, `settingsSummary`, `settingsDiff`, `LichaamGroup`, de booleancontrole in `storage/backup.ts` en `AppSettings`. Het zoeken op "alcohol" of "wiet" vindt de rijen nog steeds, want dat is een woord dat de gebruiker zelf intypt.

## Alternatieven

De woorden altijd neutraal maken: niet gekozen, de eigenaar wil ze als geheugensteun. De chips ook verbergen: niet gekozen, want die zet de gebruiker zelf open.

## Bron

Gesprek met de eigenaar, `docs/beslissingen/2026-10-25-wat-speelde-er.md`.

## Vervangt

Niets. Het vult het besluit over Wat speelde er aan.

## Terugdraaien

Verwijder de rij en laat `settingsHelp` altijd de gewone tekst geven. Een bewaarde waarde in een back-up kan dan blijven staan, hij wordt niet meer gelezen.

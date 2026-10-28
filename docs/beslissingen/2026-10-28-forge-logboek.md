# Het verloop van een training in Forge

Datum: 2026-10-28
Status: aangenomen

## Besluit

Forge houdt per training een verloop bij, zoals het Event Log van MacroFactor: per moment welke set van wat naar wat ging en waardoor (Forge stuurde bij, doorgevoerd, jij paste het aan, onder het bereik, past niet, zonder spotter). Een rustige knop in de training, met een stip als er iets nieuws is, opent het in een blad. Na afloop staat het ook in het logblad.

## Reden

Je ziet wat de app deed zonder dat het je tegenhoudt. Een melding die niet meer klopt hoort te verdwijnen: een melding "past niet" noemt nu de set en gaat weg zodra je die set aanpast, afvinkt of weghaalt. De stip telt wat Forge deed of zag, niet wat je zelf aanpaste en niet wat al is opgelost.

## Opgeslagen vorm

Het verloop is afgeleid: na elke verandering van de rijen vergelijkt `engine/forgeLog.ts#deriveChanges` voor en na, de handeling zegt alleen waardoor. Het wordt bewaard in het concept (`WorkoutDraft.log`, `seen`, beide optioneel) en bij Opslaan op het nieuwe log als `SessionLog.forgeLog` (`models/forgeLog.ts`, hoogstens 200 gebeurtenissen). Optioneel en additief: een log van voor dit veld heeft het niet. Het wordt alleen toegevoegd bij het maken van het log en nooit op een bestaand log geschreven; geschiedenis blijft append-only. Lezen is defensief (`cleanForgeLog`): wat beschadigd is valt weg, het log blijft heel (`migrateLogForgeLog` in `storage/migrations.ts`, in de keten van `normalizeBackupToCurrentModel`). Het schemanummer van de back-up verandert niet; een oude back-up importeert zoals hij was.

## Alternatieven

- Elke handeling zelf een regel laten schrijven: afgewezen, dat vergeet makkelijk iets en dubbelt de logica. Afleiden uit de rijen geeft één plek.
- Een pop-up of melding bij elke wijziging: afgewezen, de knop met een stip is rustiger.
- Het verloop achteraf in een bestaand log schrijven: afgewezen, logs zijn append-only.

## Bron

Voorbeeldschermen van MacroFactor (alleen ter inspiratie, niet in de repo), ontwerp in `docs/visie/Forge logboek en spotter.md`.

## Vervangt

Niets.

## Terugdraaien

De knop weghalen laat de rest ongemoeid; opgeslagen `forgeLog`-velden blijven geldig en worden genegeerd.

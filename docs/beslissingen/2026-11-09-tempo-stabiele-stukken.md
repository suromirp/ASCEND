# Tempo bij zone 2 uit stabiele stukken

Datum: 2026-11-09
Status: aangenomen

## Besluit

Tempo bij zone 2 rekent niet meer met één gemiddelde per geplande rustige loop, maar met de stabiele, vlakke stukken van elke buitenloop (stap 1 tot 4 van het bouwvoorstel in `docs/onderzoek/Tempo bij zone 2, stabiele stukken.md`). Eén meting per loop; onder 8 lopen of 4 weken alleen een eerste schatting; daarna een verandering met een band van 80 procent, afgerond op 5 seconden. Het plan verandert er nooit door.

Wat er gebouwd is:

- `engine/zone2Pieces.ts#stablePieces` haalt de stukken uit de volledige reeks, `kmPieces` grof uit `runDetail.kms` als er geen reeks is. Zelfde uitkomst, met `from`.
- Alle drempels staan bij elkaar in `engine/zone2Rules.ts`, met het hoofdstuk van het verslag erbij.
- `SessionLog.zone2Pieces` is een nieuw afgeleid veld, append-only zoals `runDetail`: één keer toegevoegd tijdens het ophalen van de reeks en, voor oudere lopen, uit de bewaarde reeks bij het openen (`storage/zone2Pieces.ts#ensureZone2Pieces`). Zonder zones; die komen er pas bij het lezen aan te pas. Een bestaand veld voor dezelfde totalen wordt nooit overschreven.
- Migratie: `migrateLogZone2Pieces` in `storage/migrationsLogDetail.ts`. Het veld is optioneel, dus het schemanummer van de back-up blijft gelijk en een oude back-up importeert zoals hij was. Een beschadigd veld valt als geheel weg; het log houdt de rest.
- `engine/aerobicTrend.ts` leest de stukken, zet ze om naar één hartslag via de hartslagreserve, en maakt per loop één meting. `zone2Statement` geeft de eerste schatting of de lijn met band; `trendVerdict` (de zin op de kaart), de figuren in Je stand (`runTrends.ts`) en `progressMoment` lezen die ene uitkomst.

Dit is geen uitzondering op de regel over historie: er wordt geen gemeten getal en geen bestaand veld omgeschreven, alleen een afgeleid veld toegevoegd.

## Eigen keuzes

- Een steil stukje (200 m boven 4 procent) knipt een stuk, in plaats van het hele stuk weg te gooien. Anders kost één brugje een lange duurloop.
- De helling per 30 seconden voor de stabiliteit komt uit de hoogte zonder dode band, over een venster van een minuut ervoor en erna. De hoogte na de dode band (die Run in detail gebruikt) laat een glooiing van een paar meter pas laat zien, en dan lijkt een rustig glooiend stuk onrustig. Het vlakke tempo van het stuk zelf komt wel uit de hoogte na de dode band, met Minetti over stapjes van 25 m, zoals de kilometers in Run in detail.
- Na een pauze wacht een stuk ook 3 minuten, net als na een tempowissel: de hartslag zakt in een pauze.
- Een stuk dat over minuut 60 heen loopt, wordt daar geknipt; het deel erna telt alleen binnen de 3 procent drift van het eerste stuk.
- Stukken worden voor elke buitenloop bewaard, ook voor een test; bij het lezen tellen een test, een wedstrijd en de loopband niet.
- Het zware stuk boven zone 3 (meer dan 2 minuten) wordt bij het lezen gevonden in de lijn van Run in detail. Zonder die lijn is er geen knip.
- Grof uit de kilometers: een km met een pauze, zonder hartslag, deels, of met meer dan 2 procent op of neer valt weg; de eerste km na een tempowissel of pauze telt niet.
- Een loop met een `runDetail` waarvan de kilometers geen hartslag hebben, en een loop zonder reeks en zonder kilometers, gaan door het oude pad (alleen geplande rustige en lange lopen, met de ruimte van 15 slagen onder zone 2). Het oude pad rekent nu ook via de hartslagreserve en met dezelfde warmtecorrectie.
- Een loop met stukken waarvan er geen in zone 2 ligt, telt als "buiten zone 2" en valt niet terug op de hele loop.
- Warmte: zonder dauwpunt in het log (dat ontbreekt nog) alleen de gevoelstemperatuur. Een warme loop krijgt een meting met `counts: false`, voor de grafiek later als gedimde stip.
- De band gebruikt de normale verdeling (z 1,28), deterministisch, zonder toeval. De lijn loopt door de lopen van de laatste 8 weken; de verandering is per 4 weken. "Nu" en "4 weken eerder" in Je stand zijn punten op die lijn.
- `progressMoment` leest de kant van de band het dichtst bij nul en viert vanaf 5 seconden. Wat bewaard wordt als "laatst gevierd" is voortaan die kant; een eerdere viering (op het midden) maakt de volgende hoogstens iets later.
- De oude zin op de kaart is vervangen door `trendVerdict`, zodat de kaart niet sterker spreekt dan de band. De rest van de kaart (uitleg, grafiek) is stap 6 en 7.

## Reden

De backlog (eigenaar, 7 november: "wat matig"): drie punten en een uitspraak als "17 seconden sneller" die sterker klinkt dan de data draagt. Stukken geven meer en zuiverder metingen; één meting per loop en een band houden de uitspraak eerlijk.

## Alternatieven

- Stukken bij het lezen uit de reeks halen in plaats van bewaren: de reeks staat in een eigen opslag en is er niet altijd (instelling, back-up zonder reeksen); `aerobicTrend` moet puur en snel blijven.
- Stukken van 5 minuten als losse metingen: die delen dag, slaap en warmte, en zouden dubbel tellen.
- Twee vensters (twee weken tegen twee weken een maand eerder) houden: één gat van een week laat de uitkomst vallen, en elke loop tussendoor telt niet mee.

## Wat nog niet gebouwd is

- Stap 5, instelling "Tempo bij zone 2" (bijvoorbeeld warme lopen meetellen, stukken uit intervaltrainingen) in een groepspagina en `settingsIndex.ts`, `settingsLayout.ts`, `settingsSummary.ts`. Tot dan gelden de drempels in `zone2Rules.ts` vast.
- Stap 6, de grafiek met elke loop als stip, de lijn met band en de as met tempo's.
- Stap 7, de tekst achter de i met de bronnen in `data/researchSources.ts`, en de uitleg op de kaart die nog over "rustige en lange duurlopen" spreekt.
- Benen niet uitgerust (hoofdstuk 5): nog niet; de loop telt nu gewoon mee.
- Het dauwpunt in het weer per loop.

## Bron

`docs/onderzoek/Tempo bij zone 2, stabiele stukken.md` (Scout Tempo zone 2, 9 november 2026), `docs/backlog.md` (Tempo bij zone 2 beter maken), `docs/onderzoek/Loopgegevens en vooruitgang.md`.

## Vervangt

Niets. Het oude pad van `aerobicTrend` blijft voor lopen zonder stukken.

## Terugdraaien

`piecesOfLog` in `engine/aerobicTrend.ts` laten teruggeven `undefined` zet alles weer op het oude pad; het veld `zone2Pieces` kan blijven staan (afgeleid, wordt dan niet gelezen). Voor de uitspraak: `zone2Statement` vervangen door de oude vergelijking van twee vensters.

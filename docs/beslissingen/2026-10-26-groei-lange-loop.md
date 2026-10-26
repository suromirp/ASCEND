# Groei van de lange loop: vijf keuzes, geleidelijk

Datum: 2026-10-26
Status: aangenomen

## Besluit

De lange loop naar een hardloopwedstrijd groeit geleidelijk en zo snel als de gekozen stand toelaat. Dit werkt het vierde punt van `2026-10-26-planning-met-labels.md` bij (daar groeide hij om de twee weken en niet naast een tocht). Er is een nieuwe instelling "Groei van de lange loop" (`AppSettings.longRunGrowth`, groep Planning, in het blad van Ambitie) met vijf keuzes:

1. Heel rustig: per blok van vier weken, het gedrag van voor ronde 2b.
2. Rustiger: om de twee weken een stap van hoogstens 10%.
3. Volgens het onderzoek (advies en standaard): elke week een stap van hoogstens 10%, altijd binnen de 110%-rem, met de lichtere week van de golf en de piek om de week.
4. Stevig: als de derde, maar de piek mag elke week staan. Nog binnen de 110%-rem.
5. Sneller dan het onderzoek (onder Geavanceerd in het blad): wekelijks een stap tot 120% van je langste loop van 30 dagen. Wie dit kiest ziet in het voorstel met Akkoord vooraf één zin: "Boven 10% langer dan je langste loop gaf in het grootste onderzoek ongeveer 64% meer kans op een overbelastingsblessure (Frandsen 2025)."

Een verandering van de instelling is altijd een voorstel met Akkoord (`usePlanSettingChange`).

De regels van de geleidelijke groei (`engine/programLayout.ts#gradualLongRunMinutes`):

- Vanaf de eerste week van Opbouw groeit de lange loop vanaf de hoogste week ervoor, zoals die in het plan staat (de hoogste niet-lichte week van de laatste vier weken, dezelfde maat als de 110%-rem), met hoogstens 10% per opbouwweek (bij Rustiger om de twee opbouwweken). Nooit in één keer naar de piek of naar de 110%-grens.
- De lichtere week van de golf blijft. Na die week gaat de opbouw verder vanaf de laatste opbouwweek, niet vanaf de lichte.
- De piek is het grootste van de piek voor de wedstrijd (10 km 75, halve marathon 120, marathon 180) en de bestaande piek van 120 minuten van het programma. Tot de week van de wedstrijd; vanaf die week geldt de gewone opbouw weer.
- Dit geldt ook in een programma naar een tocht: de uitzondering uit het besluit van ronde 2b is vervallen, op verzoek van de eigenaar. Alleen een Top of Voortop telt, een Verkenning niet.
- Afwisselen op de piek (expert, keuze van de eigenaar): zodra de lange loop de piek heeft bereikt, staat hij een week op de piek en is de week erna ongeveer 80% van de piek, naast de lichtere week van de golf. De piek staat dus hoogstens om de week. Dit geldt voor de lange loop (`tpl_long_run`) in elk programma, ook zonder hardloopwedstrijd, en niet voor de bergtochten en wandeldagen van de tochtladder. Bij Heel rustig, Stevig en Sneller geldt het niet.
- De 110%-rem op wat je echt liep (`engine/substitutions.ts`, langste gelogde loop van 30 dagen) blijft op elke stand de bovengrens, behalve bij Sneller (120%, alleen voor de lange loop en alleen via `Program.runBuild.spikeLimit`). Liep je korter of sloeg je een loop over, dan groeit de volgende vanaf wat je echt deed. Een herstart na een pauze (ziekte, `durationAdjustments`) en de rem bij pijn (Ambitie valt terug op Standaard) werken door op elke stand.

## Reden

De eigenaar wil dat de lange loop zo snel groeit als het onderzoek toelaat en niet wekenlang op het hoogste niveau blijft. Het onderzoek geeft een veilige marge van 10% per loop (Frandsen 2025, matig) en vindt tot 30% per twee weken geen hoger risico (Nielsen 2014, matig). Wekelijks 10% blijft daaronder en binnen de rem. De afwisseling op de piek is een expertregel, geen studie, en staat zo gemarkeerd.

## Bewust anders dan het onderzoek

`docs/onderzoek/Opbouw hardlopen.md` zegt: "Er is geen instelling om dat ruimer te maken." Dat onderzoek blijft zoals het is. De eigenaar koos op 26 oktober 2026 toch voor één keuze buiten het onderzoek, Sneller dan het onderzoek, met de waarschuwing hierboven. De 110% blijft de standaard en het advies; wie niets kiest, blijft erbinnen.

## Bewust niet gedaan

- De 120% geldt alleen voor de lange loop naar een hardloopwedstrijd (via `Program.runBuild`), niet voor andere trainingen en niet zonder zo'n wedstrijd.
- Na de week van de wedstrijd houdt het hoge niveau niet vast: de gewone opbouw neemt het over, met de eerste week terug op de helft van de wedstrijd (ronde 2b).

## Alternatieven

- Eén sprong naar de 110%-grens zodra de opbouw begint. Afgewezen: het moet geleidelijk.
- De afwisseling alleen op het hardloopdoel. Afgewezen: de eigenaar wil haar ook op de bestaande piek van het programma.

## Bron

- `docs/onderzoek/Opbouw hardlopen.md` (110% van de langste loop van 30 dagen, Frandsen 2025, matig)
- `docs/onderzoek/Doelsoorten duur.md` (Nielsen 2014, matig: 10 tot 30% per twee weken geen hoger risico, boven 30% wel)
- Een gesprek met de eigenaar op 26 oktober 2026

## Vervangt

Het vierde punt van `2026-10-26-planning-met-labels.md` waar het ervan afwijkt (elke twee weken, niet naast een tocht). Dat besluit zelf blijft staan.

## Terugdraaien

Zet de instelling op Heel rustig voor het oude gedrag: de groei per blok van vier weken en ook geen afwisseling op de piek. De velden `AppSettings.longRunGrowth` en `Program.runBuild.stepPercent`, `.alternatePeak` en `.spikeLimit` zijn optioneel en onschadelijk als ze blijven staan.

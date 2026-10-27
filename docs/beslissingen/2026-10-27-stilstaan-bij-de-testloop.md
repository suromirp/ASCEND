# Stilstaan bij een testloop: een stop is geen gat en geen tijd

Datum: 2026-10-27
Status: aangenomen

## Besluit

De snelste 5 km van een testloop telt bewegende tijd. Een stop voor een stoplicht telt niet als tijd in het stuk, maar ASCEND telt hem wel en zegt het erbij: "zonder 3 keer stilstaan, samen 1:40". Bij veel stilstaan zegt het één droge zin: "Stilstaan geeft wat rust, dus deze test is iets te gunstig." Wie liever de klok laat lopen kiest in Planning "Stilstaan bij een testloop": "Meetellen".

Dit vult `2026-10-27-testloop-lezen.md` aan. Die blijven zoals ze zijn.

## Reden

De eigenaar liep zijn testloop van 5 km in de stad en moest wachten voor stoplichten. `fastestWindow` zocht de snelste 5 km aan één stuk op kloktijd. Liep het horloge door, dan zat de wachttijd in het stuk en leek de test trager. Pauzeerde het horloge vanzelf, dan zat er een gat van meer dan 20 seconden in de reeks en telde elk stuk met zo'n gat niet. Met een paar stoplichten over de route bleef er dan vaak geen heel stuk over en viel de app terug op de hele run, met inlopen.

Wat er nu gebeurt (`engine/bestEffort.ts`):

1. **Wat een stop is.** Twee metingen met meer dan 20 seconden ertussen waarbij de afstand minder dan 15 meter opschuift (auto-pauze), of een aaneengesloten stuk van minstens 3 seconden waarin je gemiddeld onder 1 meter per seconde vooruitkomt (het horloge liep door). Een gat waarbij de afstand wel verspringt blijft een gat: het signaal was weg en zegt niets over het tempo.
2. **Bewegende tijd.** De tijd van een stop telt niet in de tijd van het stuk. De stops binnen het stuk worden geteld (`BestEffort.stops`) met de seconden stilstand (`stoppedSec`). Zonder stops is de uitkomst gelijk aan die van vroeger.
3. **Eerlijk zeggen.** Het logblad ("Beste 5 km uit je run: 27:40, zonder 3 keer stilstaan, samen 1:40"), het aanbod met Akkoord, "Dit betekent je test" en de regel van TARGET-TIME ("snelste 5 km in 27:40, zonder 3 keer stilstaan, samen 1:40") noemen de stops. Bij meer dan 60 seconden of meer dan 3 stops komt er de zin bij dat de test iets te gunstig is.
4. **Nooit vanzelf.** De snelste 5 km telt nog steeds pas als hij geen tempo verandert, of na Akkoord in het logblad. Een snellere uitkomst door het schrappen van stilstand verandert dus nooit stil je tempo's.
5. **Instelling.** "Stilstaan bij een testloop" (`AppSettings.testStops`: `skip` is het advies en de waarde als hij ontbreekt, `count` is de klok zoals het was). Hij wordt gelezen op het moment dat de reeks wordt gelezen; wat al bewaard is verandert niet. Een onbekende waarde in een back-up valt weg bij het importeren.

Opslag: `BestEffort` krijgt drie optionele velden, `v` (de leesversie, nu 2), `stops` en `stoppedSec`. Oude records zonder die velden blijven geldig, het schemanummer van de back-up verandert niet en `migrateLogBestEffort` leest ze defensief (een kapot getal verliest alleen zichzelf).

Opnieuw lezen, de nette weg: de leesversie `v` zit op de afgeleide waarde zelf. Een snelste 5 km zonder `v` die nog niet meetelt (`accepted` niet gezet) wordt één keer opnieuw gelezen als de reeks er is (`wantsBestEffort`); daarna heeft hij `v: 2`. Een die al meetelt blijft precies zoals hij was: zijn tijd staat in je tempo's en ASCEND verandert die niet achteraf. De nieuw gelezen waarde volgt dezelfde weg als altijd: meteen bij een nieuwe test of als er geen tempo verandert, anders met Akkoord. Geeft het opnieuw lezen niets, dan staat de vingerafdruk in `bestEffortTried` en blijft het oude record staan. Er verandert geen gemeten getal van de log.

## Alternatieven

- Alleen de stops in de klok laten. Dan blijft de test te traag op een horloge dat doorloopt.
- Elk gat overbruggen. Een gat waarin de afstand verspringt is geen stilstand en zou een onbetrouwbaar stuk laten tellen.
- Een bestaande, al meetellende snelste 5 km stil opnieuw berekenen. Dat verandert tempo's zonder dat je het ziet.
- De versie in `bestEffortTried` of in de vingerafdruk. Die is voor een reeks die niets gaf en hoort niet bij een bestaand getal.

## Bron

De testloop van de eigenaar op 2026-10-27 met wachten voor stoplichten.

## Vervangt

Niets.

## Terugdraaien

Zet "Stilstaan bij een testloop" op "Meetellen": nieuwe tests worden weer op kloktijd gelezen. De velden `v`, `stops` en `stoppedSec` kunnen blijven staan; zonder ze te lezen telt de tijd van het stuk.

# Stilstaan bij een testloop: aanvulling na de review

Datum: 2026-10-27
Status: aangenomen

## Besluit

Dit vult `2026-10-27-stilstaan-bij-de-testloop.md` aan. Dat besluit blijft zoals het is.

1. **Een stop kost niets en levert niets op.** `fastestWindow` houdt naast de bewegende tijd een lopende som van bewegende afstand bij. Een stoppaar voegt tijd noch afstand toe, en het stuk van 5 km wordt gezocht en geïnterpoleerd op die bewegende afstand. Daardoor kan een uitkomst nooit sneller zijn dan de snelste lezing van de reeks zelf toelaat.
2. **Stops die dicht bij elkaar liggen zijn één stop.** Minder dan 10 seconden of 20 meter beweging ertussen telt als één stop (drift rond een stoplicht gaf eerder "15 keer stilstaan").
3. **Een inhaalsprong is een gat, geen stop.** Leggen de 10 seconden na een stop meer af dan 1,5 keer de mediaansnelheid van de run maal die tijd (een horloge dat bleef hangen en de afstand inhaalde), dan is dat stuk een gat. Een stuk dat het bevat telt niet.
4. **Langzaam lopen is geen stop.** Boven 1 m/s telt het gewoon als tijd.
5. **Opnieuw lezen van een test die al telt.** Een test van de laatste 60 dagen met een snelste 5 km zonder leesversie die al meetelt wordt één keer opnieuw gelezen. De nieuwe lezing gaat naar `SessionLog.bestEffortReread` (versie 2, nooit geaccepteerd), de oude blijft tellen. Verandert er door de nieuwe lezing geen tempo, dan wordt zij meteen de snelste 5 km en verdwijnt het kandidaatveld. Anders komt er een aanbod met Akkoord in het logblad: bij Akkoord vervangt de kandidaat de oude en wordt hij opgeruimd, bij "Niet nu" blijft alles staan. Verandert de tijd door het opnieuw lezen, dan zegt het aanbod: "Opnieuw gelezen zonder stilstaan."
6. **De vingerafdruk krijgt een versie.** `bestEffortTried` is nu de totalen plus `|v2`. Een oude markering (bijvoorbeeld een auto-pauzetest waar elk stuk een gat had) wordt daardoor één keer opnieuw gelezen.
7. **Een nieuwe test met stops telt niet altijd meteen.** Is de snelste 5 km met stops sneller per kilometer dan de hele run en verandert er een tempo, dan telt hij niet meteen mee maar vraagt Akkoord in het logblad. Zonder stops blijft een nieuwe test zoals hij was.
8. **Eén vorm voor de zin.** "Je stond 3 keer stil, samen 1:40; die tijd telt niet mee." in het logblad, het aanbod en "Dit betekent je test". Tussen haakjes bij de doeltijd korter: "snelste 5 km in 27:40, zonder 1:40 stilstaan".

Opslag: `SessionLog.bestEffortReread` en `BestEffort.prevMinutes` (de tijd van de lezing ervoor) zijn optioneel en worden defensief gelezen in `migrateLogBestEffort`. Een kandidaat zonder versie 2 of met een kapot getal valt weg, de log houdt de rest. Het schemanummer van de back-up verandert niet.

## Reden

Warden vond bij de eerste versie dat een stop wel de tijd weghaalde maar de afstand hield. Het venster dat net na een stop eindigde won dan: een drukte van 120 seconden op 0,9 m/s gaf een 5 km die 34 seconden sneller was dan fysiek kan, een GPS-hapering gaf 11 seconden te snel en een stop die er niet was, en drift tijdens één stop gaf 15 stops. Ook bleef de snelste 5 km van de eigenaar op de oude lezing staan, omdat hij al meetelde en dus nooit opnieuw werd gelezen.

## Alternatieven

- Een al meetellende snelste 5 km stil vervangen. Dat verandert tempo's zonder dat je het ziet.
- Het opnieuw lezen voor alle tests, ook oudere dan 60 dagen. Die tellen zelden nog mee in je tempo's en kosten een verzoek per test.
- De versie alleen in de vingerafdruk van de totalen. Die hoort bij de log, niet bij de lezing.

## Bron

Review van Warden op commit 5070c3f, en de testloop van de eigenaar.

## Vervangt

Niets. Punt 5 van het eerste besluit ("een die al meetelt blijft precies zoals hij was") wordt verfijnd: hij blijft tellen tot jij Akkoord geeft op de nieuwe lezing, of tot die niets verandert.

## Terugdraaien

Haal de kandidaat weg door `bestEffortReread` te laten vallen; de oude snelste 5 km telt dan gewoon door. De instelling "Stilstaan bij een testloop" op "Meetellen" leest nieuwe tests weer op kloktijd.

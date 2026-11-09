# De planner deelt de weken rond een vakantie zo goed mogelijk in

Datum: 2026-11-09
Status: aangenomen

## Besluit

Rond een vakantie zonder training zoekt de planner de beste indeling over alle werkbare dagen van de weken eromheen, ook over de weekgrens (`engine/leaveAround.ts`, een stap in `engine/planPass.ts` tussen de vrije-dagenblokken en de weekcontrole). Het is een voorstel met Akkoord: de indeling komt uit dezelfde planningsronde als het voorstel voor een nieuwe vakantie, en na Akkoord verandert een tweede ronde niets.

De indeling kiest in deze volgorde:

1. De vaste regels van de weekcontrole: geen enkele bevinding meer. Daarbij 48 uur tussen beenzware dagen, ook na een lange duurloop die je al logde, en ook voor het weekendblok van heuvels en lange duurloop binnen de weken rond de vakantie. Frisse benen voor intervallen en heuvels, de rustdag die jij zelf instelde en alles wat jij vastzette blijven staan.
2. Zo min mogelijk vervallen trainingen. De lange duurloop, heuvels, harde loopjes en blokken vervallen als laatste.
3. Liever geen dubbele dag zolang er een werkbare dag zonder training is.
4. Dezelfde training niet twee dagen na elkaar, en zo dicht mogelijk bij zijn plek in de week.

Een rustdag die de planner koos (de Herstelwandeling) blokkeert geen dag; een rustdag die jij instelde wel.

Wat vervalt, krijgt één zin: "Rond je vakantie is er geen dag over met 48 uur rust tot de volgende zware beendag." voor een beenzware training, en "Rond je vakantie is er geen dag meer waarop deze erbij past." voor de rest. Die zin staat in het voorstel en in de regel van Planning bijgewerkt. Wat verschuift krijgt "Past hier het best rond je vakantie, met genoeg rust tussen zware beendagen."

Wat het voorstel mag veranderen: bij Akkoord voor een nieuwe vakantie zonder training deelt de planner de hele reeks opnieuw in, ook wat een eerdere vakantie na Akkoord neerzette (die trainingen dragen het merk van die vakantie) en wat die liet vervallen. De dagelijkse ronde zonder voorstel zoekt alleen een andere dag voor wat op een vakantiedag staat, nooit meer; dat is wat de weekcontrole al deed.

Instelling "Rond een vakantie schuiven" (Planning, `AppSettings.leaveAround`): Flink (advies) is de indeling hierboven, Weinig laat het aan de weekcontrole, die een training naar de dichtstbijzijnde dag van zijn eigen week zet of laat vervallen. Een achtergebleven sleutel of onbekende waarde leest als Flink.

De zoektocht is deterministisch: de score hangt alleen af van de indeling, de zoektocht begint zowel vanuit wat er staat als vanuit niets, en wat er staat blijft staan tenzij de nieuwe indeling minstens een heel punt beter is. Zo schuift een plan dat al goed is niet opnieuw.

## Reden

Een nagemaakt voorbeeld (`engine/leavePlanAround.test.ts`, vakantie za 14 en zo 15 november en ma 16 tot en met wo 18 november, een lange duurloop gelogd op zo 8) liet drie fouten zien van de gulzige weekcontrole: twee beenzware dagen naast elkaar, twee dubbele dagen terwijl andere werkbare dagen leeg stonden, en Benen A en B die zonder woord wegvielen. De weekcontrole kijkt per training naar de dichtstbijzijnde dag van de eigen week, en past daarom niet op twee weken met een vakantie. De eigenaar wil dat ASCEND dit soort vakanties zo goed mogelijk omheen plant en daarvoor flink mag verschuiven.

## Alternatieven

- De weekcontrole slimmer maken met meer uitzonderingen: blijft per training en per week kijken, dus de weekgrens blijft buiten beeld.
- Altijd opnieuw indelen in de dagelijkse ronde: dat verandert de planning zonder Akkoord. Afgewezen.
- Alleen de weken met een vakantiedag indelen: een leeg stuk in de week ervoor of erna blijft dan ongebruikt. Daarom mogen de lege dagen van de week ervoor en erna meedoen.
- Het weekendblok van heuvels en lange duurloop in de weken rond een vakantie laten staan als uitzondering: de eigenaar noemt precies dat een fout, dus daar telt de 48 uur wel.

## Bron

De melding van de eigenaar van 9 november, `docs/beslissingen/2026-11-01-vakantie-bijwerken.md`, `docs/beslissingen/2026-11-02-48-uur-lange-duurloop.md`.

## Vervangt

Niets. Het deel van `2026-11-01-vakantie-bijwerken.md` over "Opzij voor een vakantie" blijft gelden voor Weinig.

## Terugdraaien

Zet "Rond een vakantie schuiven" op Weinig. Er is niets opgeslagen dat terug moet; de sleutel `leaveAround` is optioneel.

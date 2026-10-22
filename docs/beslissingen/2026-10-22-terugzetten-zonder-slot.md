# Terugzetten zet niets vast

Datum: 2026-10-22
Status: aangenomen

## Besluit

Eén regel voor terugzetten: een voorstel dat een sessie terugbrengt naar hoe ze vanzelf stond (een tocht die terugverhuist of weggaat, of een tochtmerk dat wordt gewist) zet geen slot en geen vaste minuten. De sessie wordt weer "gepland", het slot en de verplaatsmelding gaan weg, en de lengte bepaalt weer de fase. Zo'n onderdeel van een voorstel heeft het kenmerk `restore`. Een herstelde rij (een vervallen sessie die terugkomt) deed dit al. Alle andere onderdelen van een geaccepteerd voorstel zetten, zoals altijd, wel een slot.

Een beendag die een tocht soepel verkortte (een korte versie 48 uur na een bergtocht) krijgt in zijn tochtmerk `shortened`. Alleen zo'n dag gaat bij het verwijderen of verleggen van de tocht terug naar de volle lengte; een sessie die om een andere reden kort was, blijft kort. De opruiming van oude beenruilen in het racebloc slaat alleen dagen met dat merk over, niet elke sessie die ooit een vakantie of tocht raakte.

Een onderdeel van een voorstel dat een vervallen rij laat terugkomen, maar waarvan de rij al niet meer vervallen is, maakt geen nieuwe rij naast de bestaande. Het wordt als niet uitvoerbaar gemeld. Blijft er na het voorstel een beenregel openstaan, dan staat die als notitie in het voorstel.

## Reden

Bij soepele rust liet terugwijzigen van een tocht een volle beendag 48 uur na een bergtocht staan, vastgezet en zonder melding. Het terugzetten gaf de beendag het slot van een geaccepteerd voorstel, en daarna mocht de weekcontrole hem niet meer aanraken. Terugzetten is geen keuze van de gebruiker maar het ongedaan maken van een eerdere planning, dus het hoort niets vast te leggen.

## Alternatieven

Het slot achteraf weghalen in de weekcontrole. Verworpen: de weekcontrole kan een slot van de gebruiker zelf niet van een slot van een terugzetting onderscheiden.

## Bron

Review van de tochten op 22 oktober 2026. Vult `2026-10-22-zware-beendag-na-tocht.md` aan.

## Vervangt

Niets.

## Terugdraaien

`restore` en `shortened` zijn optionele velden. Zonder `restore` krijgt een terugzetting weer een slot; een tochtmerk zonder `shortened` zet de lengte niet meer terug. Oudere merken van een eerder verkorte beendag hebben het kenmerk niet: die dag blijft na het verwijderen van de tocht kort tot de fase hem opnieuw bepaalt.

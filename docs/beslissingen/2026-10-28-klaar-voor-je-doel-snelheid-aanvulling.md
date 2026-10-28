# Aanvulling: haalbaarheid als droge regel, de gebruiker beslist, en een kaart in één oogopslag

Datum: 2026-10-28

Vult `2026-10-28-klaar-voor-je-doel-snelheid.md` aan. Dat besluit blijft staan, behalve waar het hier anders staat.

## Aanleiding

De eigenaar: "Je mag erbij zetten of het realistisch is, maar als gebruiker oordeel je zelf of je ermee doorgaat" en "in één oogopslag zien wat er aan de hand is". Bij de review bleken ook een paar fouten: een oude Liever niet gold niet meer, een verandering van "+35 in 4 weken" was schijn, en de kaart was te vol.

## Besluit

1. **Haalbaarheid mag, als droog feit.** De kaart zegt bij gemiddelde groei wat de band op wedstrijddag is en waar het doel ligt: "Bij gemiddelde groei rond 20 maart: 47 tot 54 minuten, dus 45:00 vraagt meer dan gemiddelde groei." Binnen de band: "je doel valt erbinnen." Boven de band: "je doel ligt erboven." Het blijft een feit; de gebruiker beslist zelf of hij doorgaat, en het doel verandert alleen als hij Akkoord geeft op een voorstel. Dit vervangt de oude regel "Bij deze groei ...".
2. **Een oude Liever niet blijft gelden.** Een antwoord met het oude id `goaltime:<doel>:JJJJ-MM-DD` laat TARGET-TIME zwijgen zolang het doel sindsdien niet is aangepast (antwoordmoment tegen `updatedAt` van het doel). Past de gebruiker het doel aan, dan mag er één keer opnieuw gevraagd worden, met het nieuwe id.
3. **Geen schijnverandering.** "+N in 4 weken" staat er alleen als beide momenten dezelfde meters hebben. Komt er tussen toen en nu een meter bij (een testloop), dan is er geen verandering te tonen.
4. **Volhouden weegt 0** in `RACE_SPEED_WEIGHTS`, zodat snelheid altijd 60% is van wat meetelt. Volhouden wordt op de Ascend-tab nooit gevuld en wordt bij een wedstrijd met doeltijd niet als ontbrekend genoemd. De weegzin in het blad komt uit dezelfde constante (`raceWeightSentence`).
5. **Rekenen en zeggen.** Tijd per kilometer wordt eerst op hele seconden afgerond en dan gesplitst (nooit "0:60"). Zit je al onder het doel: "Doel 45:00: je zit er nu al onder."
6. **De kaart in één oogopslag** (alleen wedstrijddoelen met doeltijd; de GR5 en tochten blijven zoals ze waren). Op de kaart: ring, titel en label; vet "Verwacht nu 55:40. Doel 45:00: nog 10:40, ongeveer 1:04 per km."; gedimd de haalbaarheid; de meters; en "Hier is nog het meeste te winnen: weekvolume" zonder het getal. In het blad: de basis ("Uit je snelste 5 km van ..."), de weegzin en de zin over het label. Weg van de kaart: de zin "Zo sta je ervoor ..." en de regel over Volhouden.
7. **TARGET-TIME zegt eerlijk wat Liever niet doet:** "Met Liever niet vraagt ASCEND hier niet meer naar, tot je de doeltijd zelf verandert." En "erg ambitieus" wordt "vraagt meer dan gemiddelde groei".

## Wat niet verandert

De planning (`planGolden.test.ts`), de opgeslagen logs en de instellingen.

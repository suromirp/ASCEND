# Bijsturen in Forge en een RIR die gemeten is

Datum: 2026-10-25
Status: aangenomen

## Besluit

Twee wijzigingen in het workoutscherm van Forge.

Eén: haalt een afgevinkte werkset de onderkant van het bereik niet bij het gevraagde RIR, dan stelt Forge een lichter gewicht voor de sets die nog open staan voor, met "Lichter" en "Liever niet". Nooit vanzelf. Instelling "Bijsturen in de training", standaard aan.

Twee: het RIR-veld van een werkset begint leeg, met het doel als gedimde hint. Vink je een set af zonder de RIR aan te raken, dan wordt het doel bewaard met een merkje, `SetLog.rirAssumed`. Instelling "RIR vooraf invullen": "Als hint" (het advies) of "Met het doel" (het oude gedrag: het doel staat er als gewone waarde, en een set die je niet aanraakte krijgt toch het merkje).

## Bijsturen, hoe het werkt

Het voorstel komt bij een set waarvan herhalingen plus RIR onder de onderkant van het bereik plus de gevraagde RIR liggen. Vulde je de RIR niet zelf in, dan is hij het doel en beslissen de herhalingen alleen: onder de onderkant is te zwaar. De herhalingen zijn altijd gemeten, de RIR niet altijd.

De rekening is die van het model. De geschatte kracht komt uit die set zelf (`estimateSet`, herhalingen plus RIR). Voor elke volgende set gaat er 3% af door vermoeidheid (`FATIGUE_PER_SET`, niet bij gelijke werksets). Gekozen wordt het zwaarste gewicht uit je sportschoolprofiel (`candidatesFor`) waarbij de verwachte herhalingen de onderkant nog halen met het gevraagde RIR.

Het gewicht begint bij wat je echt gebruikte in die set, ook als je toestel dat gewicht nog niet kende, en de gewichten die je eerder op het toestel pakte tellen mee (de geleerde stapel). Een gewicht komt alleen in het voorstel als de verwachte herhalingen binnen het bereik blijven, met hooguit dezelfde speling van 1 herhaling die "raak" geeft (`REPS_ROOM`). Past er geen gewicht uit het profiel, dan is er voor die set geen voorstel. Herhalingen worden nooit verhoogd als vervanging van een ander gewicht, en de herhalingen in de open sets blijven binnen het bereik van het doel. Voorbeeld met nagemaakte getallen: doel 10 kg × 9 tot 11 bij 2 over, en je deed 13,5 kg × 8 bij 2 over. Een toestel met alleen 10 en 15 kg geeft geen voorstel (10 kg zou 20 herhalingen geven); een toestel met ook 12,5 kg stelt 12,5 kg voor.

"Lichter" zet het gewicht in de sets die niet gedaan en niet door jou aangepast zijn. "Liever niet" laat alles staan en verbergt de regel tot een volgende set er opnieuw aanleiding voor geeft. De toets "raak" blijft zoals hij was: die kijkt naar de eerste set met een doel, en het voorstel raakt alleen latere sets.

## Reden

Bijsturen volgt KR-8 in `docs/onderzoek/Kracht loggen en progressie.md`: haal je in een set duidelijk minder dan verwacht, stel dan voor de volgende sets iets lichter voor, met "Liever niet". Dat is ook de praktijk die Helms beschrijft. Alleen de kant van lichter, omdat een te zware set de rest van de oefening verpest, terwijl te licht nog bijgesteld kan worden bij de volgende training. De schatting uit herhalingen plus RIR is Epley (KR-1); boven de grens van de instelling "Sets die meetellen" is de omrekening te onzeker en dan is er geen voorstel. RIR is een schatting en loopt vaak mis (Hickmott 2022, Halperin 2022), daarom een voorstel dat jij bevestigt en geen automatische wijziging.

Een vooraf ingevulde RIR maakt achteraf niet meer te zien of hij gemeten is of gewoon bleef staan. KR-1 noemt een aangenomen RIR een zwakke aanname die duidelijk gemarkeerd moet zijn; het merkje is die markering. Het model rekent met de aangenomen RIR zoals voorheen, de rekenregels veranderen niet.

## Opgeslagen vorm

`SetLog.rirAssumed` is optioneel en additief, zoals `kind` destijds. Een log van voor het veld heeft het niet en leest als gemeten. Export en import nemen het veld mee (`migrateSetLog` in `storage/migrations.ts` houdt het alleen als `true` en alleen naast een geldige `rir`); het schemanummer van de back-up verandert niet. De twee instellingen (`adjustLive`, `rirPrefill`) zijn optionele velden in de Forge-instellingen, zonder waarde geldt het advies.

## Alternatieven

- Bijsturen naar zwaarder: nu niet, zie boven.
- Het voorstel meteen toepassen met een melding achteraf: afgewezen, het is de training van de gebruiker.
- Herhalingen in de open sets verhogen als het gewicht niet past: afgewezen, dat geeft sets ver boven het bereik.
- Het merkje op de oefening in plaats van op de set: afgewezen, per set kan het verschillen.

## Bron

`docs/onderzoek/Kracht loggen en progressie.md` (KR-1, KR-8), en `docs/beslissingen/2026-10-24-kracht-stil-toetsen.md` voor raak en de speling.

## Vervangt

Niets. Het oude vooraf invullen van de RIR met het doel blijft beschikbaar als "Met het doel".

## Terugdraaien

Zet "Bijsturen in de training" uit voor geen voorstellen meer, en "RIR vooraf invullen" op "Met het doel" voor het oude invullen. Opgeslagen sets met het merkje blijven geldig en worden door het model gelezen als altijd.
